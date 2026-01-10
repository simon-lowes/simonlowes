import * as Sentry from "@sentry/browser";

export function initSentry(): void {
  // Only initialize in production and if DSN is configured
  const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

  if (import.meta.env.PROD && dsn) {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      // Performance monitoring sample rate
      tracesSampleRate: 0.1,
      // Session replay sample rates
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}
