'use client';

import { useState, useEffect, useRef } from 'react';
import { Goal, Activity, ActivitySession } from '@/types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Target, Calendar, Clock, MoreVertical, Edit, Trash2, X } from 'lucide-react';

interface GoalCardProps {
  goal: Goal;
  activity: Activity;
  sessions: ActivitySession[];
  activities: Activity[];
  onGoalUpdated?: () => void;
  onGoalDeleted?: () => void;
}

export function GoalCard({ goal, activity, sessions, activities, onGoalUpdated, onGoalDeleted }: GoalCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form states
  const [editActivityId, setEditActivityId] = useState(goal.activityId);
  const [editType, setEditType] = useState<'daily' | 'weekly' | 'monthly'>(goal.type);
  const [editTargetMinutes, setEditTargetMinutes] = useState(goal.targetMinutes.toString());
  const [editStartDate, setEditStartDate] = useState(goal.startDate);
  const [editEndDate, setEditEndDate] = useState(goal.endDate || '');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reset edit form when goal changes
  useEffect(() => {
    setEditActivityId(goal.activityId);
    setEditType(goal.type);
    setEditTargetMinutes(goal.targetMinutes.toString());
    setEditStartDate(goal.startDate);
    setEditEndDate(goal.endDate || '');
  }, [goal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

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

  const getTimeLabel = () => {
    switch (editType) {
      case 'daily':
        return 'minutes per day';
      case 'weekly':
        return 'minutes per week';
      case 'monthly':
        return 'minutes per month';
      default:
        return 'minutes';
    }
  };

  const getSuggestedMinutes = () => {
    switch (editType) {
      case 'daily':
        return [15, 30, 45, 60, 90, 120];
      case 'weekly':
        return [180, 300, 450, 600, 900, 1200]; // 3h, 5h, 7.5h, 10h, 15h, 20h
      case 'monthly':
        return [720, 1200, 1800, 2400, 3600, 4800]; // 12h, 20h, 30h, 40h, 60h, 80h
      default:
        return [];
    }
  };

  const updateGoal = async () => {
    if (!editActivityId || !editTargetMinutes || !editStartDate) {
      alert('Please fill in all required fields');
      return;
    }

    const minutes = parseInt(editTargetMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      alert('Please enter a valid target time in minutes');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goal.id,
          activityId: editActivityId,
          type: editType,
          targetMinutes: minutes,
          startDate: editStartDate,
          endDate: editEndDate || undefined,
        }),
      });

      if (response.ok) {
        onGoalUpdated?.();
        setShowEditForm(false);
        setShowDropdown(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteGoal = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${goal.type} goal for "${activity.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/goals?id=${goal.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onGoalDeleted?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete goal');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      alert('Failed to delete goal');
    } finally {
      setIsDeleting(false);
      setShowDropdown(false);
    }
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-md p-6 ${isCompleted ? 'border-l-4 border-green-500' : ''} relative`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3"
              style={{ backgroundColor: activity.color }}
            />
            <h3 className="font-semibold text-gray-900">{activity.name}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {getGoalTypeLabel()}
            </span>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                  <button
                    onClick={() => {
                      setShowEditForm(true);
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={deleteGoal}
                    disabled={isDeleting}
                    className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
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

      {/* Edit Goal Modal */}
      {showEditForm && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/10 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Edit Goal</h2>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); updateGoal(); }} className="p-6 space-y-4">
              <div>
                <label htmlFor="edit-activity" className="block text-sm font-medium text-gray-700 mb-2">
                  Activity *
                </label>
                <select
                  id="edit-activity"
                  value={editActivityId}
                  onChange={(e) => setEditActivityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Type *
                </label>
                <select
                  id="edit-type"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label htmlFor="edit-targetMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Time ({getTimeLabel()}) *
                </label>
                <input
                  type="number"
                  id="edit-targetMinutes"
                  value={editTargetMinutes}
                  onChange={(e) => setEditTargetMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  placeholder="Enter minutes"
                  min="1"
                  required
                />
                <div className="flex flex-wrap gap-2">
                  {getSuggestedMinutes().map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setEditTargetMinutes(minutes.toString())}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="edit-startDate"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  id="edit-endDate"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={editStartDate}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Update Goal
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
