import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const STORE = path.join(process.cwd(), 'data', 'schedule.json');

interface ScheduleData {
  bars: any[];
  tasks: any[];
}

export async function GET() {
  try {
    const fileContent = await fs.readFile(STORE, 'utf-8');
    const data: ScheduleData = JSON.parse(fileContent);
    return NextResponse.json(data);
  } catch (error) {
    // File doesn't exist or is empty - return empty state
    return NextResponse.json({ bars: [], tasks: [] });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: ScheduleData = await request.json();
    
    // Light validation
    if (!body || !Array.isArray(body.bars) || !Array.isArray(body.tasks)) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }
    
    // Ensure data directory exists
    const dataDir = path.dirname(STORE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Write pretty JSON
    await fs.writeFile(STORE, JSON.stringify(body, null, 2), 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    );
  }
}