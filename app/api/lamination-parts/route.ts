import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Data file path
const DATA_FILE = path.join(process.cwd(), 'data', 'lamination-parts.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Read parts data
async function readParts() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty array if file doesn't exist
    return { parts: [] };
  }
}

// Write parts data
async function writeParts(data: any) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET - Retrieve all parts
export async function GET() {
  try {
    const data = await readParts();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read parts data' },
      { status: 500 }
    );
  }
}

// PUT - Update all parts data
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    await writeParts(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save parts data' },
      { status: 500 }
    );
  }
}

// POST - Add or update a single part
export async function POST(request: NextRequest) {
  try {
    const part = await request.json();
    const data = await readParts();
    
    // Find and update existing part or add new one
    const index = data.parts.findIndex((p: any) => p.id === part.id);
    if (index >= 0) {
      data.parts[index] = part;
    } else {
      data.parts.push(part);
    }
    
    await writeParts(data);
    return NextResponse.json({ success: true, part });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save part' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a part
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Part ID required' },
        { status: 400 }
      );
    }
    
    const data = await readParts();
    data.parts = data.parts.filter((p: any) => p.id !== id);
    
    await writeParts(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete part' },
      { status: 500 }
    );
  }
}