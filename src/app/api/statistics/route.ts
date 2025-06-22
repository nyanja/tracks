import { NextRequest, NextResponse } from 'next/server';
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isAfter, isWithinInterval } from 'date-fns';
import { Database } from '@/lib/db';
import { Statistics, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Statistics>>> {
  try {
    const url = new URL(request.url);
    const activityId = url.searchParams.get('activityId');

    const activities = await Database.getActivities();
    const sessions = await Database.getSessions();

    // Load external Spanish data
    const dreamingSpanishData = await Database.getDreamingSpanishData();
    const spanishActivityId = '3f4f9a6f-fe2f-4b37-9dc6-74739c0c8a74'; // Español activity ID

    const now = new Date();
    const today = startOfDay(now);
    const weekStart = startOfWeek(today);
    const monthStart = startOfMonth(today);

    // Filter sessions by activity if specified
    let filteredSessions = sessions;
    if (activityId) {
      filteredSessions = sessions.filter((s) => s.activityId === activityId);
    }

    // Helper function to get total minutes for sessions within a date range, including external data
    const getTotalMinutes = (fromDate: Date, toDate?: Date) => {
      // Get regular session minutes
      const sessionMinutes = filteredSessions
        .filter((session) => {
          if (!session.duration) return false;
          const sessionDate = new Date(session.startTime);
          if (toDate) {
            return isWithinInterval(sessionDate, { start: fromDate, end: toDate });
          }
          return isAfter(sessionDate, fromDate) || sessionDate.getTime() === fromDate.getTime();
        })
        .reduce((total, session) => total + (session.duration || 0), 0) / 60; // Convert to minutes

      // Add external Spanish data if we're looking at the Spanish activity or all activities
      let externalMinutes = 0;
      if (!activityId || activityId === spanishActivityId) {
        externalMinutes = dreamingSpanishData
          .filter((entry) => {
            const entryDate = new Date(entry.date + 'T00:00:00');
            if (toDate) {
              return isWithinInterval(entryDate, { start: fromDate, end: toDate });
            }
            return isAfter(entryDate, fromDate) || entryDate.getTime() === fromDate.getTime();
          })
          .reduce((total, entry) => total + entry.timeSeconds, 0) / 60; // Convert to minutes
      }

      return sessionMinutes + externalMinutes;
    };

    // Calculate totals
    const totalTimeToday = getTotalMinutes(today, new Date(today.getTime() + 24 * 60 * 60 * 1000));
    const totalTimeWeek = getTotalMinutes(weekStart);
    const totalTimeMonth = getTotalMinutes(monthStart);

    // Calculate streak (consecutive days with activity), including external data
    let streakDays = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = subDays(today, i);
      const dayStart = startOfDay(checkDate);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateStr = format(checkDate, 'yyyy-MM-dd');

      // Check regular sessions
      const hasSessionActivity = filteredSessions.some((session) => {
        if (!session.duration) return false;
        const sessionDate = new Date(session.startTime);
        return isWithinInterval(sessionDate, { start: dayStart, end: dayEnd });
      });

      // Check external Spanish data if applicable
      let hasExternalActivity = false;
      if (!activityId || activityId === spanishActivityId) {
        hasExternalActivity = dreamingSpanishData.some((entry) => entry.date === dateStr);
      }

      if (hasSessionActivity || hasExternalActivity) {
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

      let totalMinutes = goalSessions.reduce((total, session) =>
        total + (session.duration || 0), 0) / 60;

      // Add external Spanish data for today if this is the Spanish activity
      if (activity.id === spanishActivityId) {
        const todayStr = format(today, 'yyyy-MM-dd');
        const externalMinutesToday = dreamingSpanishData
          .filter(entry => entry.date === todayStr)
          .reduce((total, entry) => total + entry.timeSeconds, 0) / 60;
        totalMinutes += externalMinutesToday;
      }

      return totalMinutes >= activity.targetMinutes!;
    }).length;

    // Calculate daily progress for the last 30 days, including external data
    const dailyProgress = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Regular session minutes
      const dayMinutes = filteredSessions
        .filter((session) => session.date === dateStr && session.duration)
        .reduce((total, session) => total + (session.duration || 0), 0) / 60;

      // External Spanish minutes if applicable
      let externalMinutes = 0;
      if (!activityId || activityId === spanishActivityId) {
        externalMinutes = dreamingSpanishData
          .filter((entry) => entry.date === dateStr)
          .reduce((total, entry) => total + entry.timeSeconds, 0) / 60;
      }

      dailyProgress.push({
        date: dateStr,
        totalMinutes: Math.round(dayMinutes + externalMinutes),
      });
    }

    // Calculate activity breakdown, including external data
    const activityStats = new Map<string, { name: string; minutes: number }>();

    // Process regular sessions
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

    // Add external Spanish data if applicable
    if (!activityId || activityId === spanishActivityId) {
      const spanishActivity = activities.find(a => a.id === spanishActivityId);
      if (spanishActivity) {
        const externalTotalMinutes = dreamingSpanishData
          .reduce((total, entry) => total + entry.timeSeconds, 0) / 60;

        const current = activityStats.get(spanishActivityId) || { name: spanishActivity.name, minutes: 0 };
        current.minutes += externalTotalMinutes;
        activityStats.set(spanishActivityId, current);
      }
    }

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
