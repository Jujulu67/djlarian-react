/**
 * Server Environment Variables Validation
 *
 * Validates server-side environment variables at startup using Zod.
 * This ensures all required variables are present and correctly typed
 * before the application starts processing requests.
 *
 * Usage:
 *   import { serverEnv } from '@/lib/env/server';
 *   serverEnv.DATABASE_URL // typed and validated
 */

import { z } from 'zod';

/**
 * Schema for server-side environment variables.
 *
 * Variables are categorized by:
 * - Required: Application will fail to start without these
 * - Optional with defaults: Have sensible defaults
 * - Optional: May be undefined (feature flags, integrations)
 */
const serverEnvSchema = z.object({
  // ============================================
  // REQUIRED - Core infrastructure
  // ============================================

  /** Database connection URL (Neon, PostgreSQL, or SQLite) */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /** NextAuth secret for session encryption */
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),

  /** Base URL for NextAuth callbacks */
  NEXTAUTH_URL: z.string().url().optional(), // Optional in Vercel (auto-detected)

  // ============================================
  // OPTIONAL - AI/LLM Configuration
  // ============================================

  /** Groq API key for the AI assistant */
  GROQ_API_KEY: z.string().optional(),

  // ============================================
  // OPTIONAL - External Services
  // ============================================

  /** Spotify OAuth credentials */
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),

  /** YouTube API key */
  YOUTUBE_API_KEY: z.string().optional(),

  /** Last.fm API key */
  LASTFM_API_KEY: z.string().optional(),

  /** Instagram Graph API */
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_USER_ID: z.string().optional(),

  /** Google Custom Search */
  GOOGLE_SEARCH_API_KEY: z.string().optional(),
  GOOGLE_SEARCH_CX: z.string().optional(),

  /** MusicBrainz user agent (for rate limiting identification) */
  MUSICBRAINZ_USER_AGENT: z.string().optional(),

  /** Twitch credentials */
  TWITCH_CLIENT_ID: z.string().optional(),
  TWITCH_CLIENT_SECRET: z.string().optional(),

  // ============================================
  // OPTIONAL - Feature Flags
  // ============================================

  /** Enable debug logging for assistant */
  ASSISTANT_DEBUG: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),

  /** Enable test mode for assistant */
  ASSISTANT_TEST_DEBUG: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),

  /** Allow production database connection (safety guard) */
  ALLOW_PROD_DB: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),

  // ============================================
  // RUNTIME CONTEXT (set by platform)
  // ============================================

  /** Vercel deployment indicator */
  VERCEL: z.string().optional(),

  /** Node.js environment */
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Type for the validated server environment
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validate and parse server environment variables.
 *
 * @throws {Error} If required variables are missing or invalid
 * @returns Validated environment object
 */
function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    // In development, log detailed errors
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Server environment validation failed:\n' + errors);
    }

    throw new Error(`Server environment validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Validated server environment variables.
 *
 * This is a singleton that validates environment variables once at module load.
 * If validation fails, the application will throw during startup.
 *
 * @example
 * ```ts
 * import { serverEnv } from '@/lib/env/server';
 *
 * // Access validated env vars
 * const dbUrl = serverEnv.DATABASE_URL;
 * const isDebug = serverEnv.ASSISTANT_DEBUG;
 * ```
 */
export const serverEnv = validateServerEnv();

/**
 * Check if a specific optional service is configured.
 * Useful for conditional feature enabling.
 */
export const isConfigured = {
  groq: () => !!serverEnv.GROQ_API_KEY,
  spotify: () => !!serverEnv.SPOTIFY_CLIENT_ID && !!serverEnv.SPOTIFY_CLIENT_SECRET,
  youtube: () => !!serverEnv.YOUTUBE_API_KEY,
  lastfm: () => !!serverEnv.LASTFM_API_KEY,
  instagram: () => !!serverEnv.INSTAGRAM_ACCESS_TOKEN && !!serverEnv.INSTAGRAM_USER_ID,
  googleSearch: () => !!serverEnv.GOOGLE_SEARCH_API_KEY && !!serverEnv.GOOGLE_SEARCH_CX,
  twitch: () => !!serverEnv.TWITCH_CLIENT_ID && !!serverEnv.TWITCH_CLIENT_SECRET,
};
