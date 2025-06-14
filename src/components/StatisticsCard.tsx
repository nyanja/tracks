'use client';

import { Statistics, Activity, DailyCheckbox } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

interface StatisticsCardProps {
  statistics: Statistics;
  activities: Activity[];
  checkboxes: DailyCheckbox[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

// Component for the checkbox activity grid visualization
function CheckboxActivityGrid({ activity, checkboxes }: { activity: Activity; checkboxes: DailyCheckbox[] }) {
  // Generate last 90 days (approximately 3 months)
  const days = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const date = subDays(today, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const checkbox = checkboxes.find(c => c.activityId === activity.id && c.date === dateStr);

    days.push({
      date: dateStr,
      isChecked: checkbox?.isChecked || false,
      dayOfWeek: date.getDay(),
    });
  }

  // Group days into weeks (7 days each)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3" style={{ color: activity.color }}>
        {activity.name}
      </h4>
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex space-x-1">
            {week.map((day) => (
              <div
                key={day.date}
                className={`w-3 h-3 rounded-sm border ${
                  day.isChecked
                    ? 'border-green-300'
                    : 'border-gray-200'
                }`}
                style={{
                  backgroundColor: day.isChecked ? activity.color : '#f9fafb',
                  opacity: day.isChecked ? 0.8 : 0.3,
                }}
                title={`${day.date} - ${day.isChecked ? 'Completed' : 'Not completed'}`}
              />
            ))}
          </div>
        ))}
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
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">This Week:</span>
              <span className="font-medium">{statistics.totalTimeWeek}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">This Month:</span>
              <span className="font-medium">{statistics.totalTimeMonth}m</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Progress Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Progress (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statistics.dailyProgress}>
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
                <Bar dataKey="totalMinutes" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Breakdown */}
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
    </div>
  );
}
