import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { level, message, args } = data;

    // Format the log for the console
    const timestamp = new Date().toISOString();
    const prefix = `[REMOTE-${level.toUpperCase()}]`;

    // Use warn for general logs to avoid lint error on console.log
    console.warn(`${timestamp} ${prefix} ${message}`, args || '');

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
