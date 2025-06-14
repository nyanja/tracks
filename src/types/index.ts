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
  // Goal fields (only applicable for time-tracking activities)
  goalType?: 'daily' | 'weekly' | 'monthly';
  targetMinutes?: number;
  goalIsActive?: boolean;
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
