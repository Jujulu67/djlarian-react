/**
 * Debug Logger for Assistant
 *
 * Centralized logging utility that replaces the scattered fetch() calls
 * to the debug endpoint. Controlled via ASSISTANT_DEBUG environment variable.
 *
 * Usage:
 *   debugLog('location', 'message', { data });
 */

const DEBUG_ENDPOINT = 'http://127.0.0.1:7242/ingest/38d751ea-33eb-440f-a5ab-c54c1d798768';

interface LogData {
  location: string;
  message: string;
  data: Record<string, any>;
  timestamp?: number;
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
}

/**
 * Check if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.ASSISTANT_DEBUG === 'true';
}

/**
 * Log debug information to the debug endpoint
 *
 * @param location - Code location (e.g., 'assistant.ts:73')
 * @param message - Human-readable message
 * @param data - Additional data to log
 * @param options - Optional metadata (hypothesisId, runId, sessionId)
 */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, any>,
  options?: { hypothesisId?: string; runId?: string; sessionId?: string }
): void {
  // Skip if debug is not enabled
  if (!isDebugEnabled()) return;

  const logData: LogData = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: options?.sessionId ?? 'debug-session',
    runId: options?.runId ?? 'initial',
    hypothesisId: options?.hypothesisId ?? 'A',
  };

  // Fire-and-forget: don't await, don't block
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData),
  }).catch(() => {
    // Silently ignore errors - debug logging should never break the app
  });
}

/**
 * Helper to truncate strings for logging (avoid huge payloads)
 */
export function truncate(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

/**
 * Helper to safely extract keys for logging objects
 */
export function safeKeys(obj: Record<string, any> | null | undefined): string[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj);
}
