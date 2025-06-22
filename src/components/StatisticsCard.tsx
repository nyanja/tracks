'use client';

import { Statistics, Activity, DailyCheckbox, ActivitySession } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { useState, useEffect } from 'react';

interface StatisticsCardProps {
  statistics: Statistics;
  activities: Activity[];
  checkboxes: DailyCheckbox[];
  sessions: ActivitySession[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// Component for individual activity bar chart with correct data
function ActivityBarChart({ activity, index }: { activity: Activity; index: number }) {
  const [activityStats, setActivityStats] = useState<Statistics | null>(null);

  useEffect(() => {
    const fetchActivityStats = async () => {
      try {
        const response = await fetch(`/api/statistics?activityId=${activity.id}`);
        const data = await response.json();
        if (data.success) {
          setActivityStats(data.data);
        }
      } catch (error) {
        console.error('Error fetching activity statistics:', error);
      }
    };

    fetchActivityStats();
  }, [activity.id]);

  if (!activityStats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold mb-4" style={{ color: activity.color }}>
          {activity.name}
        </h4>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h4 className="text-lg font-semibold mb-4" style={{ color: activity.color }}>
        {activity.name}
      </h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={activityStats.dailyProgress}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis />
            <Tooltip
              labelFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString();
              }}
              formatter={(value) => [`${value} minutes`, 'Time']}
            />
            <Bar
              dataKey="totalMinutes"
              fill={activity.color || COLORS[index % COLORS.length]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Component for the checkbox activity grid visualization
function CheckboxActivityGrid({ activity, checkboxes }: { activity: Activity; checkboxes: DailyCheckbox[] }) {
  // Generate last 90 days (approximately 3 months)
  const days: {
    date: string;
    dateObj: Date;
    isChecked: boolean;
    dayOfWeek: number;
  }[] = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const checkbox = checkboxes.find(c => c.activityId === activity.id && c.date === dateStr);

    days.push({
      date: dateStr,
      dateObj: date,
      isChecked: checkbox?.isChecked || false,
      dayOfWeek: date.getDay(), // 0 = Sunday, 1 = Monday, etc.
    });
  }

  // Create month headers
  const monthHeaders: { month: string; span: number }[] = [];
  let currentMonth = '';
  let monthSpan = 0;

  days.forEach((day) => {
    const monthKey = format(day.dateObj, 'MMM');

    if (currentMonth !== monthKey) {
      if (monthSpan > 0) {
        monthHeaders.push({ month: currentMonth, span: monthSpan });
      }
      currentMonth = monthKey;
      monthSpan = 0;
    }
    monthSpan++;
  });

  // Add the last month
  if (monthSpan > 0) {
    monthHeaders.push({ month: currentMonth, span: monthSpan });
  }

  // Create grid rows for each day of the week
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const gridRows = dayNames.map((dayName, dayOfWeek) => {
    return {
      dayName,
      dayOfWeek,
      days: days.map(day => day.dayOfWeek === dayOfWeek ? day : null)
    };
  });

  return (
    <div className="p-4">
      <h4 className="text-sm font-bold text-gray-700 mb-3" style={{ color: activity.color }}>
        {activity.name}
      </h4>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month headers */}
          <div className="flex mb-1">
            <div className="w-10"></div> {/* Space for day labels */}
            {monthHeaders.map((header, index) => (
              <div
                key={index}
                className="text-xs text-gray-500 text-center"
                style={{ width: `50px` }}
              >
                {header.month}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {gridRows.map((row) => (
            <div key={row.dayOfWeek} className="flex items-center">
              {/* Day label */}
              <div className="w-10 text-xs text-gray-500 text-right pr-2">
                {row.dayName}
              </div>

              {/* Day squares */}
              <div className="flex">
                {row.days.map((day, index) => (
                  day &&
                  <div
                    key={index}
                    className={`w-3 h-3 border mr-1 ${
                      day?.isChecked
                        ? 'border-gray-800'
                        : day
                        ? 'border-gray-400'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: day?.isChecked
                        ? activity.color
                        : day
                        ? '#f9fafb'
                        : 'transparent',
                      opacity: day?.isChecked ? 0.8 : day ? 0.3 : 0,
                    }}
                    title={day ? `${day.date} - ${day.isChecked ? 'Completed' : 'Not completed'}` : ''}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export function StatisticsCard({ statistics, activities, checkboxes }: StatisticsCardProps) {
  // Filter checkbox activities
  const checkboxActivities = activities.filter(activity => activity.type === 'checkbox' && activity.isActive);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Time</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Today:</span>
              <span className="font-medium">{statistics.totalTimeToday}m</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Streak</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {statistics.streakDays}
          </div>
          <p className="text-sm text-gray-600">consecutive days</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Goals</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {statistics.completedGoalsToday}
          </div>
          <p className="text-sm text-gray-600">completed today</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Average</h3>
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {statistics.dailyProgress.length > 0
              ? Math.round(
                  statistics.dailyProgress.reduce((sum, day) => sum + day.totalMinutes, 0) /
                    statistics.dailyProgress.length
                )
              : 0}m
          </div>
          <p className="text-sm text-gray-600">per day (30 days)</p>
        </div>
      </div>

      {/* Checkbox Activities Grid */}
      {checkboxActivities.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Checkbox Activity Progress</h3>
          <p className="text-sm text-gray-600 mb-6">
            Grid shows the last 90 days. Each square represents a day - filled squares indicate completed activities.
          </p>
          <div className="grid grid-cols-1 gap-6">
            {checkboxActivities.map(activity => (
              <CheckboxActivityGrid
                key={activity.id}
                activity={activity}
                checkboxes={checkboxes}
              />
            ))}
          </div>
        </div>
      )}

      {/* Individual Activity Charts */}
      {activities.filter(activity => activity.type === 'time-tracking' && activity.isActive).length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Progress by Activity (Last 30 Days)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activities
              .filter(activity => activity.type === 'time-tracking' && activity.isActive)
              .map((activity, index) => (
                <ActivityBarChart key={activity.id} activity={activity} index={index} />
              ))}
          </div>
        </div>
      )}

      {/* Activity Breakdown Pie Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Breakdown</h3>
        {statistics.activityBreakdown.length > 0 ? (
          <div className="space-y-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statistics.activityBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalMinutes"
                    label={({ activityName, percentage }) => `${activityName} ${percentage}%`}
                  >
                    {statistics.activityBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} minutes`, 'Time']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {statistics.activityBreakdown.map((activity, index) => (
                <div key={activity.activityId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{activity.activityName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {activity.totalMinutes}m ({activity.percentage}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No activity data available
          </div>
        )}
      </div>
    </div>
  );
}
