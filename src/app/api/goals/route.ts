import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/db';
import { Goal, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<Goal[]>>> {
  try {
    const url = new URL(request.url);
    const activityId = url.searchParams.get('activityId');
    const isActive = url.searchParams.get('isActive');

    let goals = Database.getGoals();

    // Filter by activityId if provided
    if (activityId) {
      goals = goals.filter((g) => g.activityId === activityId);
    }

    // Filter by active status if provided
    if (isActive !== null) {
      const active = isActive === 'true';
      goals = goals.filter((g) => g.isActive === active);
    }

    return NextResponse.json({ success: true, data: goals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<Goal>>> {
  try {
    const body = await request.json();
    const { activityId, type, targetMinutes, startDate, endDate } = body;

    if (!activityId || !type || !targetMinutes || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: activityId, type, targetMinutes, startDate' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal type. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    const newGoal: Goal = {
      id: uuidv4(),
      activityId,
      type,
      targetMinutes: parseInt(targetMinutes),
      startDate,
      endDate,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const goals = Database.getGoals();
    goals.push(newGoal);
    Database.saveGoals(goals);

    return NextResponse.json({ success: true, data: newGoal }, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<Goal>>> {
  try {
    const body = await request.json();
    const { id, activityId, type, targetMinutes, startDate, endDate } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    if (!activityId || !type || !targetMinutes || !startDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: activityId, type, targetMinutes, startDate' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid goal type. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    const goals = Database.getGoals();
    const goalIndex = goals.findIndex((g) => g.id === id);

    if (goalIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    const updatedGoal: Goal = {
      ...goals[goalIndex],
      activityId,
      type,
      targetMinutes: parseInt(targetMinutes),
      startDate,
      endDate,
    };

    goals[goalIndex] = updatedGoal;
    Database.saveGoals(goals);

    return NextResponse.json({ success: true, data: updatedGoal });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update goal' },
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
        { success: false, error: 'Goal ID is required' },
        { status: 400 }
      );
    }

    const goals = Database.getGoals();
    const filteredGoals = goals.filter((g) => g.id !== id);

    if (filteredGoals.length === goals.length) {
      return NextResponse.json(
        { success: false, error: 'Goal not found' },
        { status: 404 }
      );
    }

    Database.saveGoals(filteredGoals);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}
