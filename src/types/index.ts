export interface Activity {
  id: string;
  name: string;
  category: string;
  color: string;
  description?: string;
  createdAt: string;
  isActive: boolean;
  type: 'time-tracking' | 'checkbox';
  resetPeriod?: 'daily' | 'weekly' | 'monthly'; // Only for checkbox activities
}

export interface ActivitySession {
  id: string;
  activityId: string;
  startTime: string;
  endTime?: string;
  duration?: number; // in seconds
  date: string; // YYYY-MM-DD format
  notes?: string;
  isRunning: boolean;
}

export interface Goal {
  id: string;
  activityId: string;
  type: 'daily' | 'weekly' | 'monthly';
  targetMinutes: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface GoalProgress {
  goalId: string;
  date: string;
  minutesCompleted: number;
  isCompleted: boolean;
}

export interface DailyCheckbox {
  id: string;
  activityId: string;
  date: string;
  isChecked: boolean;
  notes?: string;
}

export interface Statistics {
  totalTimeToday: number;
  totalTimeWeek: number;
  totalTimeMonth: number;
  streakDays: number;
  completedGoalsToday: number;
  dailyProgress: {
    date: string;
    totalMinutes: number;
  }[];
  activityBreakdown: {
    activityId: string;
    activityName: string;
    totalMinutes: number;
    percentage: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
