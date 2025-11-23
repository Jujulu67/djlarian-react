// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined, // Only initialize if DSN is provided

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Replay can be used to capture user interactions and replay them in Sentry
  // This can be useful for debugging issues.
  replaysOnErrorSampleRate: 1.0,

  // If the entire session should be replayed, use the following line:
  // replaysSessionSampleRate: 0.1,

  // Filter out certain errors that we don't want to track
  beforeSend(event, hint) {
    // Ignore certain errors that are not useful
    const error = hint.originalException;
    if (error instanceof Error) {
      // Ignore hydration errors (common in Next.js)
      if (
        error.message.includes('Hydration') ||
        error.message.includes('Text content did not match') ||
        error.message.includes('message port closed') ||
        error.message.includes("Cannot read properties of undefined (reading 'call')")
      ) {
        return null;
      }
    }
    return event;
  },

  // Configure which integrations to enable
  integrations: [
    Sentry.replayIntegration({
      // Mask all text content and user input
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
