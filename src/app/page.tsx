'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivitySession, Statistics, DailyCheckbox } from '@/types';
import { ActivityCard } from '@/components/ActivityCard';
import { TimerCard } from '@/components/TimerCard';
import { StatisticsCard } from '@/components/StatisticsCard';
import { AddActivityForm } from '@/components/AddActivityForm';
import { Plus, Clock, CheckSquare, Square, Play, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [checkboxes, setCheckboxes] = useState<DailyCheckbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activeTab, setActiveTab] = useState<'activities' | 'statistics'>('activities');

  // Add states for compact buttons functionality
  const [startingSession, setStartingSession] = useState<string | null>(null);
  const [stoppingSession, setStoppingSession] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState<string | null>(null);
  const [manualMinutes, setManualMinutes] = useState('');
  const [isAddingTime, setIsAddingTime] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [activitiesRes, todaySessionsRes, runningSessionsRes, statisticsRes, checkboxesRes] = await Promise.all([
        fetch('/api/activities'),
        fetch(`/api/sessions?date=${today}`),
        fetch('/api/sessions?isRunning=true'),
        fetch('/api/statistics'),
        fetch('/api/checkboxes'),
      ]);

      const activitiesData = await activitiesRes.json();
      const todaySessionsData = await todaySessionsRes.json();
      const runningSessionsData = await runningSessionsRes.json();
      const statisticsData = await statisticsRes.json();
      const checkboxesData = await checkboxesRes.json();

      if (activitiesData.success) setActivities(Array.isArray(activitiesData.data) ? activitiesData.data : []);

      // Combine today's sessions and running sessions, avoiding duplicates
      const allSessions: ActivitySession[] = [];
      if (todaySessionsData.success) {
        allSessions.push(...(Array.isArray(todaySessionsData.data) ? todaySessionsData.data : []));
      }
      if (runningSessionsData.success) {
        const runningSessions = Array.isArray(runningSessionsData.data) ? runningSessionsData.data : [];
        // Add running sessions that aren't already in today's sessions
        runningSessions.forEach((runningSession: ActivitySession) => {
          if (!allSessions.some(session => session.id === runningSession.id)) {
            allSessions.push(runningSession);
          }
        });
      }
      setSessions(allSessions);

      if (statisticsData.success) setStatistics(statisticsData.data);
      if (checkboxesData.success) setCheckboxes(Array.isArray(checkboxesData.data) ? checkboxesData.data : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActivityAdded = (activity: Activity) => {
    setActivities([...activities, activity]);
    setShowAddActivity(false);
    fetchData(); // Refresh statistics
  };

  const handleSessionUpdate = () => {
    fetchData(); // Refresh all data when sessions are updated
  };

  const handleActivityDeleted = () => {
    fetchData(); // Refresh all data when an activity is deleted
  };

  const handleActivityUpdated = () => {
    fetchData(); // Refresh all data when an activity is updated
  };

  const handleCheckboxToggle = async (activityId: string) => {
    try {
      const response = await fetch('/api/checkboxes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityId,
          date: today,
          isChecked: true,
        }),
      });

      if (response.ok) {
        await fetchData(); // Refresh data after toggling
      } else {
        console.error('Failed to toggle checkbox');
      }
    } catch (error) {
      console.error('Error toggling checkbox:', error);
    }
  };

  // Add compact button functionality
  const startCompactSession = async (activityId: string) => {
    setStartingSession(activityId);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId }),
      });

      if (response.ok) {
        handleSessionUpdate();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session');
    } finally {
      setStartingSession(null);
    }
  };

  const stopCompactSession = async (sessionId: string) => {
    setStoppingSession(sessionId);
    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sessionId }),
      });

      if (response.ok) {
        handleSessionUpdate();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to stop session');
      }
    } catch (error) {
      console.error('Error stopping session:', error);
      alert('Failed to stop session');
    } finally {
      setStoppingSession(null);
    }
  };

  const addCompactManualTime = async (activityId: string) => {
    const minutes = parseInt(manualMinutes);
    if (!minutes || minutes <= 0) {
      alert('Please enter a valid number of minutes');
      return;
    }

    setIsAddingTime(true);
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - minutes * 60 * 1000);

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          duration: minutes * 60, // Convert to seconds
          date: format(now, 'yyyy-MM-dd'),
          isRunning: false,
        }),
      });

      if (response.ok) {
        handleSessionUpdate();
        setShowManualEntry(null);
        setManualMinutes('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add time');
      }
    } catch (error) {
      console.error('Error adding manual time:', error);
      alert('Failed to add time');
    } finally {
      setIsAddingTime(false);
    }
  };

  const runningSessions = Array.isArray(sessions) ? sessions.filter((s) => s.isRunning) : [];

  // Get today's data
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaySessions = Array.isArray(sessions) ? sessions.filter(s => s.date === today && s.duration) : [];
  const todayCheckboxes = Array.isArray(checkboxes) ? checkboxes.filter(c => c.date === today) : [];

  // Calculate activity progress for today
  const getActivityProgress = (activityId: string) => {
    const activityMinutes = todaySessions
      .filter(s => s.activityId === activityId)
      .reduce((total, session) => total + (session.duration || 0), 0) / 60;

    const activity = Array.isArray(activities) ? activities.find(a => a.id === activityId) : null;
    const hasValidGoal = activity && activity.goalIsActive && activity.goalType === 'daily' && activity.targetMinutes;

    return {
      current: Math.round(activityMinutes),
      target: hasValidGoal ? activity.targetMinutes! : 0
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading your activities...</p>
        </div>
      </div>
    );
  }

  // Filter activities for quick stats
  const timeTrackingActivities = Array.isArray(activities) ? activities.filter(a => a.type === 'time-tracking' && a.isActive) : [];
  const checkboxActivities = Array.isArray(activities) ? activities.filter(a => a.type === 'checkbox' && a.isActive) : [];
  const checkedToday = checkboxActivities.filter(a =>
    todayCheckboxes.some(c => c.activityId === a.id && c.isChecked)
  );
  const uncheckedToday = checkboxActivities.filter(a =>
    !todayCheckboxes.some(c => c.activityId === a.id && c.isChecked)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">

          {/* Time Tracking Activities */}
          {timeTrackingActivities.length > 0 && (
            <div className="mb-6">
              <div className="space-y-3">
                {timeTrackingActivities.map(activity => {
                  const progress = getActivityProgress(activity.id);

                  const percentage = progress.target > 0 ? (progress.current / progress.target) * 100 : 0;
                  const runningSession = runningSessions.find(s => s.activityId === activity.id);

                  return (
                    <div key={activity.id} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{activity.name}</span>
                          <span className="text-sm text-gray-600">
                             {progress.current}{progress.target > 0 ? `/${progress.target} min` : ''}
                           </span>
                        </div>
                        {progress.target > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                                backgroundColor: activity.color
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Compact Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {runningSession ? (
                          <button
                            onClick={() => stopCompactSession(runningSession.id)}
                            disabled={stoppingSession === runningSession.id}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Stop Timer"
                          >
                            {stoppingSession === runningSession.id ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => startCompactSession(activity.id)}
                            disabled={startingSession === activity.id}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Start Timer"
                          >
                            {startingSession === activity.id ? (
                              <Clock className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setShowManualEntry(activity.id)}
                          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          title="Add Time"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Checkbox Activities */}
          {checkboxActivities.length > 0 && (
            <div className="space-y-4">
              {/* Checked Checkboxes */}
              {checkedToday.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-green-700 mb-2">Completed Today</h3>
                  <div className="flex flex-wrap gap-2">
                    {checkedToday.map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: `${activity.color}20`, color: activity.color }}
                      >
                        <CheckSquare className="w-4 h-4" />
                        <span>{activity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unchecked Checkboxes - Vertical List */}
              {uncheckedToday.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Not Completed</h3>
                  <div className="space-y-2">
                    {uncheckedToday.map(activity => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleCheckboxToggle(activity.id)}
                      >
                        <div className="flex-shrink-0">
                          <Square
                            className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors"
                            style={{ color: activity.color }}
                          />
                        </div>
                        <span className="text-sm text-gray-700 hover:text-gray-900 transition-colors">
                          {activity.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {timeTrackingActivities.length === 0 && checkboxActivities.length === 0 && (
             <p className="text-gray-500 text-center py-4">
               No activities to track today. Create some activities to get started!
             </p>
           )}
        </div>

        {/* Running Sessions */}
        {runningSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Active Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runningSessions.map((session) => {
                const activity = Array.isArray(activities) ? activities.find((a) => a.id === session.activityId) : null;
                if (!activity) return null;
                return (
                  <TimerCard
                    key={session.id}
                    activity={activity}
                    session={session}
                    onSessionUpdate={handleSessionUpdate}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'activities'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Activities
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'activities' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Activities</h2>
              <button
                onClick={() => setShowAddActivity(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Activity
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No activities yet</p>
                <button
                  onClick={() => setShowAddActivity(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Your First Activity
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onSessionUpdate={handleSessionUpdate}
                    onActivityDeleted={handleActivityDeleted}
                    onActivityUpdated={handleActivityUpdated}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && statistics && (
          <StatisticsCard statistics={statistics} activities={activities} checkboxes={checkboxes} sessions={sessions} />
        )}
      </div>

      {/* Modals */}
      {showAddActivity && (
        <AddActivityForm
          onClose={() => setShowAddActivity(false)}
          onActivityAdded={handleActivityAdded}
        />
      )}

      {/* Compact Manual Time Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-white/10 flex items-center justify-center p-4 z-50" style={{ backdropFilter: 'blur(20px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Time</h3>
              <button
                onClick={() => {
                  setShowManualEntry(null);
                  setManualMinutes('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity: {activities.find(a => a.id === showManualEntry)?.name}
                </label>
                <div className="flex items-center mb-4">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: activities.find(a => a.id === showManualEntry)?.color }}
                  />
                  <span className="text-sm text-gray-600">{activities.find(a => a.id === showManualEntry)?.category}</span>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="compact-minutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Minutes *
                </label>
                <input
                  type="number"
                  id="compact-minutes"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 30"
                  min="1"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the number of minutes you spent on this activity
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowManualEntry(null);
                    setManualMinutes('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addCompactManualTime(showManualEntry)}
                  disabled={isAddingTime || !manualMinutes}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isAddingTime ? 'Adding...' : 'Add Time'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
