'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Edit } from 'lucide-react';
import { Activity } from '@/types';

interface AddActivityFormProps {
  onClose: () => void;
  onActivityAdded: (activity: Activity) => void;
  editingActivity?: Activity; // Optional: if provided, form will be in edit mode
  onActivityUpdated?: (activity: Activity) => void; // Required when editing
}

const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4',
  '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
];

const CATEGORIES = [
  'Learning', 'Exercise', 'Work', 'Reading', 'Creative', 'Music',
  'Language', 'Health', 'Hobby', 'Social', 'Other'
];

export function AddActivityForm({ onClose, onActivityAdded, editingActivity, onActivityUpdated }: AddActivityFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [description, setDescription] = useState('');
  const [activityType, setActivityType] = useState<'time-tracking' | 'checkbox'>('time-tracking');
  const [resetPeriod, setResetPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Goal fields (for time-tracking activities)
  const [goalType, setGoalType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [goalIsActive, setGoalIsActive] = useState(false);

  const isEditMode = !!editingActivity;

  // Initialize form with editing activity data
  useEffect(() => {
    if (editingActivity) {
      setName(editingActivity.name);
      setCategory(editingActivity.category);
      setColor(editingActivity.color);
      setDescription(editingActivity.description || '');
      setActivityType(editingActivity.type);
      setResetPeriod(editingActivity.resetPeriod || 'daily');
      setGoalType(editingActivity.goalType || 'daily');
      setTargetMinutes(editingActivity.targetMinutes?.toString() || '');
      setGoalIsActive(editingActivity.goalIsActive || false);
    }
  }, [editingActivity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !category) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEditMode ? '/api/activities' : '/api/activities';
      const method = isEditMode ? 'PUT' : 'POST';

      const body = {
        ...(isEditMode && { id: editingActivity.id }),
        name: name.trim(),
        category,
        color,
        description: description.trim() || undefined,
        type: activityType,
        resetPeriod: activityType === 'checkbox' ? resetPeriod : undefined,
        // Goal fields (only for time-tracking activities)
        goalType: activityType === 'time-tracking' ? goalType : undefined,
        targetMinutes: activityType === 'time-tracking' && targetMinutes ? targetMinutes : undefined,
        goalIsActive: activityType === 'time-tracking' && targetMinutes ? goalIsActive : undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        if (isEditMode) {
          onActivityUpdated?.(result.data);
        } else {
          onActivityAdded(result.data);
        }
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${isEditMode ? 'update' : 'create'} activity`);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} activity:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} activity`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/10 flex items-center justify-center p-4 z-50"
         onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pt-4 px-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit Activity' : 'Add New Activity'}
          </h2>
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
              Name *
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

          <div className="grid grid-cols-2 gap-4">
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
              {!category && <option value="">Select a category</option>}
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            </div>
            <div>

            <label htmlFor="activityType" className="block text-sm font-medium text-gray-700 mb-2">
              Activity Type *
            </label>
            <select
              id="activityType"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as 'time-tracking' | 'checkbox')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="time-tracking">Time Tracking</option>
                <option value="checkbox">Checkbox</option>
              </select>
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

          {activityType === 'time-tracking' && (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="goalType" className="block text-sm font-medium text-gray-700 mb-2">
                      Goal Type
                    </label>
                    <select
                      id="goalType"
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="targetMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                      Target Minutes
                    </label>
                    <input
                      type="number"
                      id="targetMinutes"
                      value={targetMinutes}
                      onChange={(e) => setTargetMinutes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="30"
                      min="1"
                    />
                  </div>
                </div>
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
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditMode ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {isEditMode ? 'Update Activity' : 'Add Activity'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
