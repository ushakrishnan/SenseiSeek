"use client";

import { useEffect } from 'react';
import { analytics, performance } from '@/lib/firebase-client';
import { logEvent } from 'firebase/analytics';

function FirebaseAnalytics() {
  useEffect(() => {
    if (analytics) {
      // This will be logged on the initial page load.
      logEvent(analytics, 'page_view', {
        page_path: window.location.pathname,
      });
    }

    // The performance object is initialized in firebase-client.ts and starts collecting data automatically.
    // No further action is needed here for basic performance monitoring.

    // Global error handlers to capture resource/load errors or rejected Events
    // Intentionally no global debug handlers to avoid noisy console output in production.
    return () => { };
  }, []);

  return null;
}

export default FirebaseAnalytics;
