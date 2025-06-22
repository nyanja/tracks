import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/db';
import { Activity, ApiResponse } from '@/types';

export async function GET(): Promise<NextResponse<ApiResponse<Activity[]>>> {
  try {
    const activities = await Database.getActivities();
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
    const { name, category, color, description, type, resetPeriod, goalType, targetMinutes } = body;

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
      // Goal fields (only for time-tracking activities)
      goalType: type === 'time-tracking' ? goalType : undefined,
      targetMinutes: type === 'time-tracking' && targetMinutes ? parseInt(targetMinutes) : undefined,
      goalIsActive: type === 'time-tracking' && goalType && targetMinutes ? true : undefined,
    };

    const activities = await Database.getActivities();
    activities.push(newActivity);
    await Database.saveActivities(activities);

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
    const { id, name, category, color, description, type, resetPeriod, goalType, targetMinutes, goalIsActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Activity ID is required' },
        { status: 400 }
      );
    }

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

    const activities = await Database.getActivities();
    const activityIndex = activities.findIndex((a) => a.id === id);

    if (activityIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    const updatedActivity: Activity = {
      ...activities[activityIndex],
      name,
      category,
      color,
      description,
      type,
      resetPeriod: type === 'checkbox' ? resetPeriod : undefined,
      // Goal fields (only for time-tracking activities)
      goalType: type === 'time-tracking' ? goalType : undefined,
      targetMinutes: type === 'time-tracking' && targetMinutes ? parseInt(targetMinutes) : undefined,
      goalIsActive: type === 'time-tracking' ? goalIsActive : undefined,
    };

    activities[activityIndex] = updatedActivity;
    await Database.saveActivities(activities);

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

    // Check if activity exists first
    const activities = await Database.getActivities();
    const activityExists = activities.some((a) => a.id === id);

    if (!activityExists) {
      return NextResponse.json(
        { success: false, error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Use the new deleteActivity method which handles cascade delete properly
    await Database.deleteActivity(id);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
