import fs from 'fs';
import path from 'path';
import { Database } from '../src/lib/db';
import { MigrationRunner } from '../src/lib/migrations';
import { Activity, ActivitySession, DailyCheckbox } from '../src/types';

const DATA_DIR = path.join(process.cwd(), 'data');

async function migrateData() {
  console.log('Starting data migration...');

  try {
    // First, run database migrations to ensure tables exist
    console.log('Running database migrations...');
    const migrationRunner = new MigrationRunner();
    await migrationRunner.runMigrations();
    await migrationRunner.close();
    console.log('Database migrations completed.');

    // Migrate activities
    console.log('Migrating activities...');
    const activitiesPath = path.join(DATA_DIR, 'activities.json');
    if (fs.existsSync(activitiesPath)) {
      const activitiesData = fs.readFileSync(activitiesPath, 'utf-8');
      const activities: Activity[] = JSON.parse(activitiesData);
      await Database.saveActivities(activities);
      console.log(`Migrated ${activities.length} activities.`);
    } else {
      console.log('No activities.json found, skipping...');
    }

    // Migrate sessions
    console.log('Migrating sessions...');
    const sessionsPath = path.join(DATA_DIR, 'sessions.json');
    if (fs.existsSync(sessionsPath)) {
      const sessionsData = fs.readFileSync(sessionsPath, 'utf-8');
      const sessions: ActivitySession[] = JSON.parse(sessionsData);
      await Database.saveSessions(sessions);
      console.log(`Migrated ${sessions.length} sessions.`);
    } else {
      console.log('No sessions.json found, skipping...');
    }

    // Migrate checkboxes
    console.log('Migrating checkboxes...');
    const checkboxesPath = path.join(DATA_DIR, 'checkboxes.json');
    if (fs.existsSync(checkboxesPath)) {
      const checkboxesData = fs.readFileSync(checkboxesPath, 'utf-8');
      const checkboxes: DailyCheckbox[] = JSON.parse(checkboxesData);
      await Database.saveCheckboxes(checkboxes);
      console.log(`Migrated ${checkboxes.length} checkboxes.`);
    } else {
      console.log('No checkboxes.json found, skipping...');
    }

    // Migrate goals (legacy)
    console.log('Migrating goals...');
    const goalsPath = path.join(DATA_DIR, 'goals.json');
    if (fs.existsSync(goalsPath)) {
      const goalsData = fs.readFileSync(goalsPath, 'utf-8');
      const goals = JSON.parse(goalsData);
      await Database.saveGoals(goals);
      console.log(`Migrated ${goals.length} goals.`);
    } else {
      console.log('No goals.json found, skipping...');
    }

    // Note: dreaming_spanish.json is intentionally NOT migrated as requested
    console.log('Note: dreaming_spanish.json is NOT being migrated as requested.');

    console.log('Data migration completed successfully!');
  } catch (error) {
    console.error('Data migration failed:', error);
    process.exit(1);
  } finally {
    await Database.close();
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateData();
}
