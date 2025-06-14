'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Activity } from '@/types';

interface AddActivityFormProps {
  onClose: () => void;
  onActivityAdded: (activity: Activity) => void;
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
];

const CATEGORIES = [
  'Learning', 'Exercise', 'Work', 'Reading', 'Creative', 'Music',
  'Language', 'Health', 'Hobby', 'Social', 'Other'
];

export function AddActivityForm({ onClose, onActivityAdded }: AddActivityFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<'time-tracking' | 'checkbox'>('time-tracking');
  const [resetPeriod, setResetPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !category) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          category,
          color,
          description: description.trim() || undefined,
          type: activityType,
          resetPeriod: activityType === 'checkbox' ? resetPeriod : undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        onActivityAdded(result.data);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      alert('Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/10 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Add New Activity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Activity Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Spanish Learning"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type *
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="activityType"
                  value="time-tracking"
                  checked={activityType === 'time-tracking'}
                  onChange={(e) => setActivityType(e.target.value as 'time-tracking' | 'checkbox')}
                  className="mr-3 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Time Tracking Activity</div>
                  <div className="text-sm text-gray-500">
                    Track time spent on prolonged activities (e.g., Spanish learning, reading)
                  </div>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="activityType"
                  value="checkbox"
                  checked={activityType === 'checkbox'}
                  onChange={(e) => setActivityType(e.target.value as 'time-tracking' | 'checkbox')}
                  className="mr-3 text-blue-500 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Checkbox Activity</div>
                  <div className="text-sm text-gray-500">
                    Simple checkboxes for daily habits (e.g., drink water, exercise)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {activityType === 'checkbox' && (
            <div>
              <label htmlFor="resetPeriod" className="block text-sm font-medium text-gray-700 mb-2">
                Reset Period *
              </label>
              <select
                id="resetPeriod"
                value={resetPeriod}
                onChange={(e) => setResetPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily (resets every day)</option>
                <option value="weekly">Weekly (resets every week)</option>
                <option value="monthly">Monthly (resets every month)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                How often the checkbox should reset for checking again
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    color === presetColor ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the activity..."
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
                  <Plus className="w-4 h-4 mr-2" />
                  Add Activity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
