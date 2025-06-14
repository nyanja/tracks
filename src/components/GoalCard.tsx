'use client';

import { Goal, Activity, ActivitySession } from '@/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Target, Calendar, Clock } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  activity: Activity;
  sessions: ActivitySession[];
}

export function GoalCard({ goal, activity, sessions }: GoalCardProps) {
  const getGoalProgress = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (goal.type) {
      case 'daily':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'weekly':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        return { minutes: 0, percentage: 0 };
    }

    const relevantSessions = sessions.filter((session) => {
      if (session.activityId !== goal.activityId || !session.duration) return false;
      const sessionDate = new Date(session.startTime);
      return sessionDate >= startDate && sessionDate <= endDate;
    });

    const totalMinutes = relevantSessions.reduce(
      (total, session) => total + (session.duration || 0),
      0
    ) / 60;

    const percentage = Math.min((totalMinutes / goal.targetMinutes) * 100, 100);

    return { minutes: Math.round(totalMinutes), percentage: Math.round(percentage) };
  };

  const { minutes, percentage } = getGoalProgress();
  const isCompleted = percentage >= 100;

  const getGoalTypeLabel = () => {
    switch (goal.type) {
      case 'daily':
        return 'Daily Goal';
      case 'weekly':
        return 'Weekly Goal';
      case 'monthly':
        return 'Monthly Goal';
      default:
        return 'Goal';
    }
  };

  const getRemainingTime = () => {
    const remaining = goal.targetMinutes - minutes;
    return remaining > 0 ? remaining : 0;
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${isCompleted ? 'border-l-4 border-green-500' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div
            className="w-4 h-4 rounded-full mr-3"
            style={{ backgroundColor: activity.color }}
          />
          <h3 className="font-semibold text-gray-900">{activity.name}</h3>
        </div>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {getGoalTypeLabel()}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-900">
            {minutes}/{goal.targetMinutes} min
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-600">{percentage}% complete</span>
          {isCompleted && (
            <div className="flex items-center text-green-600">
              <Target className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Completed!</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {!isCompleted && (
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span className="text-sm">
              {getRemainingTime()} minutes remaining
            </span>
          </div>
        )}
        <div className="flex items-center text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span className="text-sm">
            Target: {goal.targetMinutes} min per {goal.type.replace('ly', '')}
          </span>
        </div>
      </div>

      {isCompleted && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            🎉 Congratulations! You&apos;ve reached your {goal.type} goal for {activity.name}!
          </p>
        </div>
      )}
    </div>
  );
}
