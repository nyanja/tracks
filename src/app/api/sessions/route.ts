import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Database } from '@/lib/db';
import { ActivitySession, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<ActivitySession[]>>> {
  try {
    const url = new URL(request.url);
    const activityId = url.searchParams.get('activityId');
    const date = url.searchParams.get('date');
    const isRunning = url.searchParams.get('isRunning');

    let sessions = Database.getSessions();

    // Filter by activityId if provided
    if (activityId) {
      sessions = sessions.filter((s) => s.activityId === activityId);
    }

    // Filter by date if provided
    if (date) {
      sessions = sessions.filter((s) => s.date === date);
    }

    // Filter by running status if provided
    if (isRunning !== null) {
      const running = isRunning === 'true';
      sessions = sessions.filter((s) => s.isRunning === running);
    }

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ActivitySession>>> {
  try {
    const body = await request.json();
    const { activityId, notes } = body;

    if (!activityId) {
      return NextResponse.json(
        { success: false, error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const startTime = now.toISOString();
    const date = format(now, 'yyyy-MM-dd');

    // Check if there's already a running session for this activity
    const sessions = Database.getSessions();
    const runningSession = sessions.find(
      (s) => s.activityId === activityId && s.isRunning
    );

    if (runningSession) {
      return NextResponse.json(
        { success: false, error: 'There is already a running session for this activity' },
        { status: 400 }
      );
    }

    const newSession: ActivitySession = {
      id: uuidv4(),
      activityId,
      startTime,
      date,
      notes,
      isRunning: true,
    };

    sessions.push(newSession);
    Database.saveSessions(sessions);

    return NextResponse.json({ success: true, data: newSession }, { status: 201 });
  } catch (error) {
    console.error('Error starting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start session' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<ActivitySession>>> {
  try {
    const body = await request.json();
    const { id, endTime, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const sessions = Database.getSessions();
    const sessionIndex = sessions.findIndex((s) => s.id === id);

    if (sessionIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const session = sessions[sessionIndex];

    if (!session.isRunning) {
      return NextResponse.json(
        { success: false, error: 'Session is not running' },
        { status: 400 }
      );
    }

    const sessionEndTime = endTime || new Date().toISOString();
    const startTime = new Date(session.startTime);
    const endTimeDate = new Date(sessionEndTime);
    const duration = Math.floor((endTimeDate.getTime() - startTime.getTime()) / 1000);

    const updatedSession: ActivitySession = {
      ...session,
      endTime: sessionEndTime,
      duration,
      isRunning: false,
      ...(notes !== undefined && { notes }),
    };

    sessions[sessionIndex] = updatedSession;
    Database.saveSessions(sessions);

    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('Error stopping session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop session' },
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
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const sessions = Database.getSessions();
    const filteredSessions = sessions.filter((s) => s.id !== id);

    if (filteredSessions.length === sessions.length) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    Database.saveSessions(filteredSessions);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}
