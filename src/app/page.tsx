'use client';

import { useState, useEffect } from 'react';
import { Activity, ActivitySession, Goal, Statistics, DailyCheckbox } from '@/types';
import { ActivityCard } from '@/components/ActivityCard';
import { TimerCard } from '@/components/TimerCard';
import { StatisticsCard } from '@/components/StatisticsCard';
import { GoalCard } from '@/components/GoalCard';
import { AddActivityForm } from '@/components/AddActivityForm';
import { AddGoalForm } from '@/components/AddGoalForm';
import { Plus, BarChart3, Target, Clock } from 'lucide-react';

export default function Dashboard() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessions, setSessions] = useState<ActivitySession[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [checkboxes, setCheckboxes] = useState<DailyCheckbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [activeTab, setActiveTab] = useState<'activities' | 'goals' | 'statistics'>('activities');

  // Fetch data
  const fetchData = async () => {
    try {
      const [activitiesRes, sessionsRes, goalsRes, statisticsRes, checkboxesRes] = await Promise.all([
        fetch('/api/activities'),
        fetch('/api/sessions'),
        fetch('/api/goals'),
        fetch('/api/statistics'),
        fetch('/api/checkboxes'),
      ]);

      const activitiesData = await activitiesRes.json();
      const sessionsData = await sessionsRes.json();
      const goalsData = await goalsRes.json();
      const statisticsData = await statisticsRes.json();
      const checkboxesData = await checkboxesRes.json();

      if (activitiesData.success) setActivities(activitiesData.data);
      if (sessionsData.success) setSessions(sessionsData.data);
      if (goalsData.success) setGoals(goalsData.data);
      if (statisticsData.success) setStatistics(statisticsData.data);
      if (checkboxesData.success) setCheckboxes(checkboxesData.data);
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

  const handleGoalAdded = (goal: Goal) => {
    setGoals([...goals, goal]);
    setShowAddGoal(false);
    fetchData(); // Refresh statistics
  };

  const handleSessionUpdate = () => {
    fetchData(); // Refresh all data when sessions are updated
  };

  const handleActivityDeleted = () => {
    fetchData(); // Refresh all data when an activity is deleted
  };

  const runningSessions = sessions.filter((s) => s.isRunning);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity Tracker</h1>
          <p className="text-gray-600 mt-2">
            Track your activities, set goals, and monitor your progress
          </p>
        </div>

        {/* Quick Stats */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.totalTimeToday}m
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.totalTimeWeek}m
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Streak</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.streakDays} days
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Goals Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {statistics.completedGoalsToday}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Running Sessions */}
        {runningSessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Active Sessions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runningSessions.map((session) => {
                const activity = activities.find((a) => a.id === session.activityId);
                return (
                  <TimerCard
                    key={session.id}
                    activity={activity!}
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
            onClick={() => setActiveTab('goals')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'goals'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Goals
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'goals' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Goals</h2>
              <button
                onClick={() => setShowAddGoal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No goals yet</p>
                <button
                  onClick={() => setShowAddGoal(true)}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Set Your First Goal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((goal) => {
                  const activity = activities.find((a) => a.id === goal.activityId);
                  return (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      activity={activity!}
                      sessions={sessions}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'statistics' && statistics && (
          <StatisticsCard statistics={statistics} activities={activities} checkboxes={checkboxes} />
        )}
      </div>

      {/* Modals */}
      {showAddActivity && (
        <AddActivityForm
          onClose={() => setShowAddActivity(false)}
          onActivityAdded={handleActivityAdded}
        />
      )}

      {showAddGoal && (
        <AddGoalForm
          activities={activities}
          onClose={() => setShowAddGoal(false)}
          onGoalAdded={handleGoalAdded}
        />
      )}
    </div>
  );
}
