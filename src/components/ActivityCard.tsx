'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, CheckSquare, Clock, Trash2, MoreVertical } from 'lucide-react';
import { Activity } from '@/types';
import { format } from 'date-fns';

interface ActivityCardProps {
  activity: Activity;
  onSessionUpdate: () => void;
  onActivityDeleted?: () => void;
}

export function ActivityCard({ activity, onSessionUpdate, onActivityDeleted }: ActivityCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load checkbox state for checkbox activities
  useEffect(() => {
    const loadCheckboxState = async () => {
      if (activity.type === 'checkbox') {
        try {
          const today = format(new Date(), 'yyyy-MM-dd');
          const response = await fetch(`/api/checkboxes?activityId=${activity.id}&date=${today}`);
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.length > 0) {
              setCheckboxChecked(result.data[0].isChecked);
            }
          }
        } catch (error) {
          console.error('Error loading checkbox state:', error);
        }
      }
    };

    loadCheckboxState();
  }, [activity.id, activity.type]);

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

  const startSession = async () => {
    setIsStarting(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id }),
      });

      if (response.ok) {
        onSessionUpdate();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session');
    } finally {
      setIsStarting(false);
    }
  };

  const toggleCheckbox = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await fetch('/api/checkboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId: activity.id,
          date: today,
          isChecked: !checkboxChecked,
        }),
      });

      if (response.ok) {
        setCheckboxChecked(!checkboxChecked);
      }
    } catch (error) {
      console.error('Error toggling checkbox:', error);
    }
  };

  // Get the appropriate period label for checkbox activities
  const getPeriodLabel = () => {
    if (!activity.resetPeriod) return 'Today';
    switch (activity.resetPeriod) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      default: return 'Today';
    }
  };

  const deleteActivity = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${activity.name}"? This will permanently remove the activity and all its data (sessions, goals, and checkboxes).`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/activities?id=${activity.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onActivityDeleted?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete activity');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert('Failed to delete activity');
    } finally {
      setIsDeleting(false);
      setShowDropdown(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative">
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
            {activity.category}
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
                  onClick={deleteActivity}
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

      {activity.description && (
        <p className="text-gray-600 text-sm mb-4">{activity.description}</p>
      )}

      <div className="flex items-center justify-between">
        {!activity.type || activity.type === 'time-tracking' ? (
          <button
            onClick={startSession}
            disabled={isStarting}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full"
          >
            {isStarting ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </>
            )}
          </button>
        ) : (
          <button
            onClick={toggleCheckbox}
            className={`flex items-center justify-center px-4 py-2 rounded-lg transition-colors w-full ${
              checkboxChecked
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckSquare className={`w-4 h-4 mr-2 ${checkboxChecked ? 'text-white' : 'text-gray-600'}`} />
            {checkboxChecked ? `✓ Completed ${getPeriodLabel()}` : `Mark as Done ${getPeriodLabel()}`}
          </button>
        )}
      </div>
    </div>
  );
}
