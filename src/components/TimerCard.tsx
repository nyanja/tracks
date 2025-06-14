'use client';

import { useState, useEffect } from 'react';
import { Square, Clock } from 'lucide-react';
import { Activity, ActivitySession } from '@/types';

interface TimerCardProps {
  activity: Activity;
  session: ActivitySession;
  onSessionUpdate: () => void;
}

export function TimerCard({ activity, session, onSessionUpdate }: TimerCardProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const startTime = new Date(session.startTime);
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [session.startTime]);

  const stopSession = async () => {
    setIsStopping(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id }),
      });

      if (response.ok) {
        onSessionUpdate();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to stop session');
      }
    } catch (error) {
      console.error('Error stopping session:', error);
      alert('Failed to stop session');
    } finally {
      setIsStopping(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div
            className="w-4 h-4 rounded-full mr-3"
            style={{ backgroundColor: activity.color }}
          />
          <h3 className="font-semibold text-gray-900">{activity.name}</h3>
        </div>
        <div className="flex items-center text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
          <span className="text-sm font-medium">Active</span>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {formatTime(elapsedTime)}
        </div>
        <p className="text-sm text-gray-500">
          Started at {new Date(session.startTime).toLocaleTimeString()}
        </p>
      </div>

      <button
        onClick={stopSession}
        disabled={isStopping}
        className="w-full flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isStopping ? (
          <>
            <Clock className="w-4 h-4 mr-2 animate-spin" />
            Stopping...
          </>
        ) : (
          <>
            <Square className="w-4 h-4 mr-2" />
            Stop
          </>
        )}
      </button>
    </div>
  );
}
