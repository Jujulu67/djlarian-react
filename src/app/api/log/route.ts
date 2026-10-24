import { NextRequest, NextResponse } from 'next/server';

import { rateLimit } from '@/lib/api/rateLimiter';

const ALLOWED_LEVELS = ['debug', 'info', 'warn', 'error'];
const MAX_MESSAGE_LENGTH = 2000;
const MAX_ARGS_LENGTH = 4000;

// Route publique (logs distants du client, ex. débogage mobile) : limitée en débit et en taille
export async function POST(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, 30);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const data = await req.json();
    const { level, message, args } = data ?? {};

    if (typeof message !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const safeLevel = ALLOWED_LEVELS.includes(level) ? level : 'info';
    const safeArgs = args === undefined ? '' : JSON.stringify(args).slice(0, MAX_ARGS_LENGTH);

    // Format the log for the console
    const timestamp = new Date().toISOString();
    const prefix = `[REMOTE-${safeLevel.toUpperCase()}]`;

    // Use warn for general logs to avoid lint error on console.log
    console.warn(`${timestamp} ${prefix} ${message.slice(0, MAX_MESSAGE_LENGTH)}`, safeArgs);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
