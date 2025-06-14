import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/db';
import { Activity, ApiResponse } from '@/types';

export async function GET(): Promise<NextResponse<ApiResponse<Activity[]>>> {
  try {
    const activities = Database.getActivities();
    return NextResponse.json({ success: true, data: activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Activity>>> {
  try {
    const body = await request.json();
    const { name, category, color, description, type, resetPeriod } = body;

    if (!name || !category || !color || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, category, color, type' },
        { status: 400 }
      );
    }

    if (type === 'checkbox' && !resetPeriod) {
      return NextResponse.json(
        { success: false, error: 'Reset period is required for checkbox activities' },
        { status: 400 }
      );
    }

    const newActivity: Activity = {
      id: uuidv4(),
      name,
      category,
      color,
      description,
      type,
      resetPeriod: type === 'checkbox' ? resetPeriod : undefined,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const activities = Database.getActivities();
    activities.push(newActivity);
    Database.saveActivities(activities);

    return NextResponse.json({ success: true, data: newActivity }, { status: 201 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<Activity>>> {
  try {
    const body = await request.json();
    const { id, name, category, color, description, isActive, type, resetPeriod } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const activities = Database.getActivities();
    const activityIndex = activities.findIndex((a) => a.id === id);

    if (activityIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    const updatedActivity: Activity = {
      ...activities[activityIndex],
      ...(name && { name }),
      ...(category && { category }),
      ...(color && { color }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
      ...(type && { type }),
      ...(resetPeriod !== undefined && { resetPeriod }),
    };

    activities[activityIndex] = updatedActivity;
    Database.saveActivities(activities);

    return NextResponse.json({ success: true, data: updatedActivity });
  } catch (error) {
    console.error('Error updating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update activity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<null>>> {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const activities = Database.getActivities();
    const filteredActivities = activities.filter((a) => a.id !== id);

    if (filteredActivities.length === activities.length) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Cascade delete: Remove all related data

    // Delete all sessions for this activity
    const sessions = Database.getSessions();
    const filteredSessions = sessions.filter((s) => s.activityId !== id);
    Database.saveSessions(filteredSessions);

    // Delete all goals for this activity
    const goals = Database.getGoals();
    const filteredGoals = goals.filter((g) => g.activityId !== id);
    Database.saveGoals(filteredGoals);

    // Delete all checkboxes for this activity
    const checkboxes = Database.getCheckboxes();
    const filteredCheckboxes = checkboxes.filter((c) => c.activityId !== id);
    Database.saveCheckboxes(filteredCheckboxes);

    // Finally delete the activity itself
    Database.saveActivities(filteredActivities);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
