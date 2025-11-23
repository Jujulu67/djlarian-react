// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined, // Only initialize if DSN is provided

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out certain errors that we don't want to track
  beforeSend(event, hint) {
    // Ignore certain errors that are not useful
    const error = hint.originalException;
    if (error instanceof Error) {
      // Ignore validation errors (handled by our error handler)
      if (error.message.includes('Validation') || error.message.includes('ZodError')) {
        return null;
      }
    }
    return event;
  },
});
