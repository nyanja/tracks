import { PrismaClient, Prisma } from '@/generated/prisma';
import { Activity, ActivitySession, DailyCheckbox } from '@/types';
import { getConfig } from './config';

// Legacy interface for dreaming_spanish.json (kept for reference but not used)
export interface DreamingSpanishEntry {
  date: string;
  userId: string;
  timeSeconds: number;
  goalReached: boolean;
}

// Query interface for raw SQL queries
export interface QueryOptions {
  query: string;
  params?: unknown[];
}

class DatabaseClient {
  private static instance: DatabaseClient;
  private prisma: PrismaClient;

  private constructor() {
    // Get database URL from config
    const config = getConfig();

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.database.url
        }
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  public static getInstance(): DatabaseClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new DatabaseClient();
    }
    return DatabaseClient.instance;
  }

  // Raw query methods
  async one<T = unknown>(options: QueryOptions): Promise<T | null> {
    const result = await this.prisma.$queryRawUnsafe(options.query, ...(options.params || [])) as T[];
    return result.length > 0 ? result[0] : null;
  }

  async many<T = unknown>(options: QueryOptions): Promise<T[]> {
    return await this.prisma.$queryRawUnsafe(options.query, ...(options.params || [])) as T[];
  }

  async execute(options: QueryOptions): Promise<number> {
    const result = await this.prisma.$executeRawUnsafe(options.query, ...(options.params || []));
    return result;
  }

  // Transaction support
  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(fn);
  }

  // Activities
  async getActivities(): Promise<Activity[]> {
    try {
      const activities = await this.prisma.activity.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return activities.map((activity: {
        id: string;
        name: string;
        category: string;
        color: string;
        description: string | null;
        createdAt: Date;
        isActive: boolean;
        type: string;
        resetPeriod: string | null;
        goalType: string | null;
        targetMinutes: number | null;
        goalIsActive: boolean | null;
      }) => ({
        id: activity.id,
        name: activity.name,
        category: activity.category,
        color: activity.color,
        description: activity.description || undefined,
        createdAt: activity.createdAt.toISOString(),
        isActive: activity.isActive,
        type: activity.type as 'time-tracking' | 'checkbox', // Cast to expected type
        resetPeriod: activity.resetPeriod as 'daily' | 'weekly' | 'monthly' | undefined,
        goalType: activity.goalType as 'daily' | 'weekly' | 'monthly' | undefined,
        targetMinutes: activity.targetMinutes || undefined,
        goalIsActive: activity.goalIsActive || undefined
      }));
    } catch (error) {
      console.error('Error reading activities:', error);
      return [];
    }
  }

  async saveActivity(activity: Activity): Promise<void> {
    try {
      // Validate createdAt date
      if (!activity.createdAt) {
        throw new Error(`Activity ${activity.id} has invalid createdAt: ${activity.createdAt}`);
      }

      const createdAt = new Date(activity.createdAt);

      // Check if date is valid
      if (isNaN(createdAt.getTime())) {
        throw new Error(`Activity ${activity.id} has invalid createdAt: ${activity.createdAt}`);
      }

      const data = {
        id: activity.id,
        name: activity.name,
        category: activity.category,
        color: activity.color,
        description: activity.description,
        createdAt,
        isActive: activity.isActive,
        type: activity.type, // Type is stored as string directly
        resetPeriod: activity.resetPeriod,
        goalType: activity.goalType,
        targetMinutes: activity.targetMinutes,
        goalIsActive: activity.goalIsActive
      };

      await this.prisma.activity.upsert({
        where: { id: activity.id },
        update: data,
        create: data
      });
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  }

  async saveActivities(activities: Activity[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const activity of activities) {
          // Validate createdAt date
          if (!activity.createdAt) {
            throw new Error(`Activity ${activity.id} has invalid createdAt: ${activity.createdAt}`);
          }

          const createdAt = new Date(activity.createdAt);

          // Check if date is valid
          if (isNaN(createdAt.getTime())) {
            throw new Error(`Activity ${activity.id} has invalid createdAt: ${activity.createdAt}`);
          }

          const data = {
            id: activity.id,
            name: activity.name,
            category: activity.category,
            color: activity.color,
            description: activity.description,
            createdAt,
            isActive: activity.isActive,
            type: activity.type,
            resetPeriod: activity.resetPeriod,
            goalType: activity.goalType,
            targetMinutes: activity.targetMinutes,
            goalIsActive: activity.goalIsActive
          };

          await tx.activity.upsert({
            where: { id: activity.id },
            update: data,
            create: data
          });
        }
      });
    } catch (error) {
      console.error('Error saving activities:', error);
      throw error;
    }
  }

  async deleteActivity(activityId: string): Promise<void> {
    try {
      // Prisma will handle cascade deletes automatically based on the schema
      await this.prisma.activity.delete({
        where: { id: activityId }
      });
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  // Activity Sessions
  async getSessions(): Promise<ActivitySession[]> {
    try {
      const sessions = await this.prisma.activitySession.findMany({
        orderBy: { startTime: 'desc' }
      });

      return sessions.map(session => ({
        id: session.id,
        activityId: session.activityId,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || undefined,
        duration: session.duration || undefined,
        date: session.date.toISOString().split('T')[0], // Convert DateTime to YYYY-MM-DD string
        notes: session.notes || undefined,
        isRunning: session.isRunning
      }));
    } catch (error) {
      console.error('Error reading sessions:', error);
      return [];
    }
  }

  async saveSession(session: ActivitySession): Promise<void> {
    try {
      // Validate and convert dates
      if (!session.startTime) {
        throw new Error(`Session ${session.id} has invalid startTime: ${session.startTime}`);
      }
      if (!session.date) {
        throw new Error(`Session ${session.id} has invalid date: ${session.date}`);
      }

      const startTime = new Date(session.startTime);
      const endTime = session.endTime ? new Date(session.endTime) : null;

      // Handle different date formats
      let date: Date;
      if (session.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format - append time to make it a valid date
        date = new Date(session.date + 'T00:00:00.000Z');
      } else {
        // Assume it's already a full date string, try to parse it
        date = new Date(session.date);
        // If it parsed successfully, convert it to the expected date-only format
        if (!isNaN(date.getTime())) {
          // Convert to YYYY-MM-DD and then back to Date for consistency
          const dateStr = date.toISOString().split('T')[0];
          date = new Date(dateStr + 'T00:00:00.000Z');
        }
      }

      // Check if dates are valid
      if (isNaN(startTime.getTime())) {
        throw new Error(`Session ${session.id} has invalid startTime: ${session.startTime}`);
      }
      if (session.endTime && endTime && isNaN(endTime.getTime())) {
        throw new Error(`Session ${session.id} has invalid endTime: ${session.endTime}`);
      }
      if (isNaN(date.getTime())) {
        throw new Error(`Session ${session.id} has invalid date: ${session.date}`);
      }

      const data = {
        id: session.id,
        activityId: session.activityId,
        startTime,
        endTime,
        duration: session.duration,
        date,
        notes: session.notes,
        isRunning: session.isRunning
      };

      await this.prisma.activitySession.upsert({
        where: { id: session.id },
        update: data,
        create: data
      });
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  async saveSessions(sessions: ActivitySession[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const session of sessions) {
          // Validate and convert dates
          if (!session.startTime) {
            throw new Error(`Session ${session.id} has invalid startTime: ${session.startTime}`);
          }
          if (!session.date) {
            throw new Error(`Session ${session.id} has invalid date: ${session.date}`);
          }

          const startTime = new Date(session.startTime);
          const endTime = session.endTime ? new Date(session.endTime) : null;

          // Handle different date formats
          let date: Date;
          if (session.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // YYYY-MM-DD format - append time to make it a valid date
            date = new Date(session.date + 'T00:00:00.000Z');
          } else {
            // Assume it's already a full date string, try to parse it
            date = new Date(session.date);
            // If it parsed successfully, convert it to the expected date-only format
            if (!isNaN(date.getTime())) {
              // Convert to YYYY-MM-DD and then back to Date for consistency
              const dateStr = date.toISOString().split('T')[0];
              date = new Date(dateStr + 'T00:00:00.000Z');
            }
          }

          // Check if dates are valid
          if (isNaN(startTime.getTime())) {
            throw new Error(`Session ${session.id} has invalid startTime: ${session.startTime}`);
          }
          if (session.endTime && endTime && isNaN(endTime.getTime())) {
            throw new Error(`Session ${session.id} has invalid endTime: ${session.endTime}`);
          }
          if (isNaN(date.getTime())) {
            throw new Error(`Session ${session.id} has invalid date: ${session.date}`);
          }

          const data = {
            id: session.id,
            activityId: session.activityId,
            startTime,
            endTime,
            duration: session.duration,
            date,
            notes: session.notes,
            isRunning: session.isRunning
          };

          await tx.activitySession.upsert({
            where: { id: session.id },
            update: data,
            create: data
          });
        }
      });
    } catch (error) {
      console.error('Error saving sessions:', error);
      throw error;
    }
  }

  // Daily Checkboxes
  async getCheckboxes(): Promise<DailyCheckbox[]> {
    try {
      const checkboxes = await this.prisma.dailyCheckbox.findMany({
        orderBy: { date: 'desc' }
      });

      return checkboxes.map(checkbox => ({
        id: checkbox.id,
        activityId: checkbox.activityId,
        date: checkbox.date.toISOString().split('T')[0], // Convert DateTime to YYYY-MM-DD string
        isChecked: checkbox.isChecked,
        notes: checkbox.notes || undefined
      }));
    } catch (error) {
      console.error('Error reading checkboxes:', error);
      return [];
    }
  }

  async saveCheckbox(checkbox: DailyCheckbox): Promise<void> {
    try {
      // Validate date
      if (!checkbox.date) {
        throw new Error(`Checkbox ${checkbox.id} has invalid date: ${checkbox.date}`);
      }

      const dateObj = new Date(checkbox.date + 'T00:00:00.000Z'); // Convert YYYY-MM-DD to DateTime

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Checkbox ${checkbox.id} has invalid date: ${checkbox.date}`);
      }

      const data = {
        id: checkbox.id,
        activityId: checkbox.activityId,
        date: dateObj,
        isChecked: checkbox.isChecked,
        notes: checkbox.notes
      };

      await this.prisma.dailyCheckbox.upsert({
        where: {
          activityId_date: {
            activityId: checkbox.activityId,
            date: dateObj
          }
        },
        update: data,
        create: data
      });
    } catch (error) {
      console.error('Error saving checkbox:', error);
      throw error;
    }
  }

  async saveCheckboxes(checkboxes: DailyCheckbox[]): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const checkbox of checkboxes) {
          // Validate date
          if (!checkbox.date) {
            throw new Error(`Checkbox ${checkbox.id} has invalid date: ${checkbox.date}`);
          }

          const dateObj = new Date(checkbox.date + 'T00:00:00.000Z'); // Convert YYYY-MM-DD to DateTime

          // Check if date is valid
          if (isNaN(dateObj.getTime())) {
            throw new Error(`Checkbox ${checkbox.id} has invalid date: ${checkbox.date}`);
          }

          const data = {
            id: checkbox.id,
            activityId: checkbox.activityId,
            date: dateObj,
            isChecked: checkbox.isChecked,
            notes: checkbox.notes
          };

          await tx.dailyCheckbox.upsert({
            where: {
              activityId_date: {
                activityId: checkbox.activityId,
                date: dateObj
              }
            },
            update: data,
            create: data
          });
        }
      });
    } catch (error) {
      console.error('Error saving checkboxes:', error);
      throw error;
    }
  }

  // Legacy goals (kept for migration purposes)
  async saveGoals(goals: Array<{
    id: string;
    activityId: string;
    type: string;
    targetMinutes: number;
    startDate: string;
    isActive: boolean;
    createdAt: string;
  }>): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        let skippedCount = 0;
        for (const goal of goals) {
          // Check if the activity exists before inserting the goal
          const activityExists = await tx.activity.findUnique({
            where: { id: goal.activityId }
          });

          if (!activityExists) {
            console.log(`Skipping goal ${goal.id} - activity ${goal.activityId} not found`);
            skippedCount++;
            continue;
          }

          // Validate dates
          if (!goal.startDate) {
            throw new Error(`Goal ${goal.id} has invalid startDate: ${goal.startDate}`);
          }
          if (!goal.createdAt) {
            throw new Error(`Goal ${goal.id} has invalid createdAt: ${goal.createdAt}`);
          }

          const startDate = new Date(goal.startDate);
          const createdAt = new Date(goal.createdAt);

          // Check if dates are valid
          if (isNaN(startDate.getTime())) {
            throw new Error(`Goal ${goal.id} has invalid startDate: ${goal.startDate}`);
          }
          if (isNaN(createdAt.getTime())) {
            throw new Error(`Goal ${goal.id} has invalid createdAt: ${goal.createdAt}`);
          }

          const data = {
            id: goal.id,
            activityId: goal.activityId,
            type: goal.type as 'daily' | 'weekly' | 'monthly',
            targetMinutes: goal.targetMinutes,
            startDate,
            isActive: goal.isActive,
            createdAt
          };

          await tx.goal.upsert({
            where: { id: goal.id },
            update: data,
            create: data
          });
        }

        if (skippedCount > 0) {
          console.log(`Skipped ${skippedCount} goals due to missing activities`);
        }
      });
    } catch (error) {
      console.error('Error saving goals:', error);
      throw error;
    }
  }

  // External Dreaming Spanish data (not migrated as requested)
  getDreamingSpanishData(): DreamingSpanishEntry[] {
    // This method is kept for compatibility but returns empty array
    // as dreaming_spanish.json should not be migrated to the new DB
    console.log('getDreamingSpanishData called - returning empty array as dreaming_spanish.json is not migrated');
    return [];
  }

  // Close database connection
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  // Get raw Prisma client for advanced usage
  get client(): PrismaClient {
    return this.prisma;
  }
}

// Create singleton instance and export convenience methods
const dbClient = DatabaseClient.getInstance();

// Export the main database interface with both old API and new query methods
export const Database = {
  // Raw query methods (your requested interface)
  one: <T = unknown>(options: QueryOptions) => dbClient.one<T>(options),
  many: <T = unknown>(options: QueryOptions) => dbClient.many<T>(options),
  execute: (options: QueryOptions) => dbClient.execute(options),
  transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => dbClient.transaction(fn),

  // Existing API methods (for backward compatibility)
  getActivities: () => dbClient.getActivities(),
  saveActivity: (activity: Activity) => dbClient.saveActivity(activity),
  saveActivities: (activities: Activity[]) => dbClient.saveActivities(activities),
  deleteActivity: (activityId: string) => dbClient.deleteActivity(activityId),
  getSessions: () => dbClient.getSessions(),
  saveSession: (session: ActivitySession) => dbClient.saveSession(session),
  saveSessions: (sessions: ActivitySession[]) => dbClient.saveSessions(sessions),
  getCheckboxes: () => dbClient.getCheckboxes(),
  saveCheckbox: (checkbox: DailyCheckbox) => dbClient.saveCheckbox(checkbox),
  saveCheckboxes: (checkboxes: DailyCheckbox[]) => dbClient.saveCheckboxes(checkboxes),
  saveGoals: (goals: Array<{
    id: string;
    activityId: string;
    type: string;
    targetMinutes: number;
    startDate: string;
    isActive: boolean;
    createdAt: string;
  }>) => dbClient.saveGoals(goals),
  getDreamingSpanishData: () => dbClient.getDreamingSpanishData(),
  close: () => dbClient.close(),

  // Access to raw Prisma client
  client: dbClient.client
};

// Export shorthand db interface for your routes
export const db = Database;
