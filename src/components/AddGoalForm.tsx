'use client';

import { useState } from 'react';
import { X, Target } from 'lucide-react';
import { Activity, Goal } from '@/types';
import { format } from 'date-fns';

interface AddGoalFormProps {
  activities: Activity[];
  onClose: () => void;
  onGoalAdded: (goal: Goal) => void;
}

export function AddGoalForm({ activities, onClose, onGoalAdded }: AddGoalFormProps) {
  const [activityId, setActivityId] = useState('');
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activityId || !targetMinutes || !startDate) {
      alert('Please fill in all required fields');
      return;
    }

    const minutes = parseInt(targetMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      alert('Please enter a valid target time in minutes');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          type,
          targetMinutes: minutes,
          startDate,
          endDate: endDate || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onGoalAdded(result.data);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create goal');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      alert('Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeLabel = () => {
    switch (type) {
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
    switch (type) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Set New Goal</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="activity" className="block text-sm font-medium text-gray-700 mb-2">
              Activity *
            </label>
            <select
              id="activity"
              value={activityId}
              onChange={(e) => setActivityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select an activity</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Goal Type *
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label htmlFor="targetMinutes" className="block text-sm font-medium text-gray-700 mb-2">
              Target Time ({getTimeLabel()}) *
            </label>
            <input
              type="number"
              id="targetMinutes"
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(e.target.value)}
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
                  onClick={() => setTargetMinutes(minutes.toString())}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date (optional)
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={startDate}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Set Goal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
