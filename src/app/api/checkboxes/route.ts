import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Database } from '@/lib/db';
import { DailyCheckbox, ApiResponse } from '@/types';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<DailyCheckbox[]>>> {
  try {
    const url = new URL(request.url);
    const activityId = url.searchParams.get('activityId');
    const date = url.searchParams.get('date');

    let checkboxes = await Database.getCheckboxes();

    // Filter by activityId if provided
    if (activityId) {
      checkboxes = checkboxes.filter((c) => c.activityId === activityId);
    }

    // Filter by date if provided
    if (date) {
      checkboxes = checkboxes.filter((c) => c.date === date);
    }

    return NextResponse.json({ success: true, data: checkboxes });
  } catch (error) {
    console.error('Error fetching checkboxes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch checkboxes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<DailyCheckbox>>> {
  try {
    const body = await request.json();
    const { activityId, date, isChecked, notes } = body;

    if (!activityId || !date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: activityId, date' },
        { status: 400 }
      );
    }

    // Check if checkbox already exists for this activity and date
    const checkboxes = await Database.getCheckboxes();
    const existingCheckbox = checkboxes.find(
      (c) => c.activityId === activityId && c.date === date
    );

    if (existingCheckbox) {
      // Update existing checkbox
      existingCheckbox.isChecked = isChecked !== undefined ? isChecked : !existingCheckbox.isChecked;
      if (notes !== undefined) {
        existingCheckbox.notes = notes;
      }

      await Database.saveCheckboxes(checkboxes);
      return NextResponse.json({ success: true, data: existingCheckbox });
    }

    // Create new checkbox
    const newCheckbox: DailyCheckbox = {
      id: uuidv4(),
      activityId,
      date,
      isChecked: isChecked !== undefined ? isChecked : true,
      notes,
    };

    checkboxes.push(newCheckbox);
    await Database.saveCheckboxes(checkboxes);

    return NextResponse.json({ success: true, data: newCheckbox }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating checkbox:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/update checkbox' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse<ApiResponse<DailyCheckbox>>> {
  try {
    const body = await request.json();
    const { id, isChecked, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Checkbox ID is required' },
        { status: 400 }
      );
    }

    const checkboxes = await Database.getCheckboxes();
    const checkboxIndex = checkboxes.findIndex((c) => c.id === id);

    if (checkboxIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Checkbox not found' },
        { status: 404 }
      );
    }

    const updatedCheckbox: DailyCheckbox = {
      ...checkboxes[checkboxIndex],
      ...(isChecked !== undefined && { isChecked }),
      ...(notes !== undefined && { notes }),
    };

    checkboxes[checkboxIndex] = updatedCheckbox;
    await Database.saveCheckboxes(checkboxes);

    return NextResponse.json({ success: true, data: updatedCheckbox });
  } catch (error) {
    console.error('Error updating checkbox:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update checkbox' },
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
        { success: false, error: 'Checkbox ID is required' },
        { status: 400 }
      );
    }

    const checkboxes = await Database.getCheckboxes();
    const filteredCheckboxes = checkboxes.filter((c) => c.id !== id);

    if (filteredCheckboxes.length === checkboxes.length) {
      return NextResponse.json(
        { success: false, error: 'Checkbox not found' },
        { status: 404 }
      );
    }

    await Database.saveCheckboxes(filteredCheckboxes);

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error('Error deleting checkbox:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete checkbox' },
      { status: 500 }
    );
  }
}
