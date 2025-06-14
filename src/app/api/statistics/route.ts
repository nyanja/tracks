import { NextRequest, NextResponse } from 'next/server';
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isAfter, isWithinInterval } from 'date-fns';
import { Database } from '@/lib/db';
import { Statistics, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Statistics>>> {
  try {
    const url = new URL(request.url);
    const activityId = url.searchParams.get('activityId');

    const activities = Database.getActivities();
    const sessions = Database.getSessions();

    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(today);
    const monthStart = startOfMonth(today);

    // Filter sessions by activity if specified
    let filteredSessions = sessions;
    if (activityId) {
      filteredSessions = sessions.filter((s) => s.activityId === activityId);
    }

    // Helper function to get total minutes for sessions within a date range
    const getTotalMinutes = (fromDate: Date, toDate?: Date) => {
      return filteredSessions
        .filter((session) => {
          if (!session.duration) return false;
          const sessionDate = new Date(session.startTime);
          if (toDate) {
            return isWithinInterval(sessionDate, { start: fromDate, end: toDate });
          }
          return isAfter(sessionDate, fromDate) || sessionDate.getTime() === fromDate.getTime();
        })
        .reduce((total, session) => total + (session.duration || 0), 0) / 60; // Convert to minutes
    };

    // Calculate totals
    const totalTimeToday = getTotalMinutes(today, new Date(today.getTime() + 24 * 60 * 60 * 1000));
    const totalTimeWeek = getTotalMinutes(weekStart);
    const totalTimeMonth = getTotalMinutes(monthStart);

    // Calculate streak (consecutive days with activity)
    let streakDays = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = subDays(today, i);
      const dayStart = startOfDay(checkDate);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const hasActivity = filteredSessions.some((session) => {
        if (!session.duration) return false;
        const sessionDate = new Date(session.startTime);
        return isWithinInterval(sessionDate, { start: dayStart, end: dayEnd });
      });

      if (hasActivity) {
        streakDays++;
      } else if (i > 0) {
        // Stop counting if we hit a day without activity (but not today)
        break;
      }
    }

    // Calculate completed goals today
    const todayGoals = activities.filter((activity) => {
      if (!activity.goalIsActive || !activity.targetMinutes || activity.goalType !== 'daily') return false;
      if (activityId && activity.id !== activityId) return false;

      return true; // All active daily goals are considered
    });

    const completedGoalsToday = todayGoals.filter((activity) => {
      const goalSessions = sessions.filter((s) =>
        s.activityId === activity.id &&
        s.date === format(today, 'yyyy-MM-dd') &&
        s.duration
      );

      const totalMinutes = goalSessions.reduce((total, session) =>
        total + (session.duration || 0), 0) / 60;

      return totalMinutes >= activity.targetMinutes!;
    }).length;

    // Calculate daily progress for the last 30 days
    const dailyProgress = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayMinutes = filteredSessions
        .filter((session) => session.date === dateStr && session.duration)
        .reduce((total, session) => total + (session.duration || 0), 0) / 60;

      dailyProgress.push({
        date: dateStr,
        totalMinutes: Math.round(dayMinutes),
      });
    }

    // Calculate activity breakdown
    const activityStats = new Map<string, { name: string; minutes: number }>();

    filteredSessions
      .filter((session) => session.duration)
      .forEach((session) => {
        const activity = activities.find((a) => a.id === session.activityId);
        if (activity) {
          const current = activityStats.get(activity.id) || { name: activity.name, minutes: 0 };
          current.minutes += (session.duration || 0) / 60;
          activityStats.set(activity.id, current);
        }
      });

    const totalMinutes = Array.from(activityStats.values())
      .reduce((total, stat) => total + stat.minutes, 0);

    const activityBreakdown = Array.from(activityStats.entries()).map(([id, stat]) => ({
      activityId: id,
      activityName: stat.name,
      totalMinutes: Math.round(stat.minutes),
      percentage: totalMinutes > 0 ? Math.round((stat.minutes / totalMinutes) * 100) : 0,
    }));

    const statistics: Statistics = {
      totalTimeToday: Math.round(totalTimeToday),
      totalTimeWeek: Math.round(totalTimeWeek),
      totalTimeMonth: Math.round(totalTimeMonth),
      streakDays,
      completedGoalsToday,
      dailyProgress,
      activityBreakdown,
    };

    return NextResponse.json({ success: true, data: statistics });
  } catch (error) {
    console.error('Error calculating statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate statistics' },
      { status: 500 }
    );
  }
}
