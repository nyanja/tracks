import fs from 'fs';
import path from 'path';
import { Activity, ActivitySession, DailyCheckbox } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (filename: string) => path.join(DATA_DIR, filename);

export class Database {
  // Activities
  static getActivities(): Activity[] {
    try {
      const filePath = getFilePath('activities.json');
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading activities:', error);
      return [];
    }
  }

  static saveActivities(activities: Activity[]): void {
    try {
      const filePath = getFilePath('activities.json');
      fs.writeFileSync(filePath, JSON.stringify(activities, null, 2));
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  }

  // Activity Sessions
  static getSessions(): ActivitySession[] {
    try {
      const filePath = getFilePath('sessions.json');
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading sessions:', error);
      return [];
    }
  }

  static saveSessions(sessions: ActivitySession[]): void {
    try {
      const filePath = getFilePath('sessions.json');
      fs.writeFileSync(filePath, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Error saving sessions:', error);
    }
  }



  // Daily Checkboxes
  static getCheckboxes(): DailyCheckbox[] {
    try {
      const filePath = getFilePath('checkboxes.json');
      if (!fs.existsSync(filePath)) {
        return [];
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading checkboxes:', error);
      return [];
    }
  }

  static saveCheckboxes(checkboxes: DailyCheckbox[]): void {
    try {
      const filePath = getFilePath('checkboxes.json');
      fs.writeFileSync(filePath, JSON.stringify(checkboxes, null, 2));
    } catch (error) {
      console.error('Error saving checkboxes:', error);
    }
  }
}
