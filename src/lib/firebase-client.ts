import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics, isSupported as isAnalyticsSupported } from "firebase/analytics";
import { getPerformance } from "firebase/performance";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
// Sanity checks: if any client-visible Firebase config values are missing, log a clear
// warning to help diagnose `auth/network-request-failed` and other client auth issues.
if (typeof window !== 'undefined') {
  const missing = Object.entries(firebaseConfig).filter(([k, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn('[firebase-client] Missing NEXT_PUBLIC Firebase config keys:', missing.join(', '));
    console.warn('[firebase-client] Ensure .env has NEXT_PUBLIC_FIREBASE_* variables and restart the dev server.');
  }
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

// Initialize Analytics and (optionally) Performance Monitoring on the client side
// isAnalyticsSupported returns a Promise<boolean> in modern Firebase SDKs, so we initialize
// analytics asynchronously and export a mutable variable that can be set once supported.
let analytics: ReturnType<typeof getAnalytics> | null = null;
let performance: ReturnType<typeof getPerformance> | null = null;

if (typeof window !== 'undefined') {
  // feature-detect analytics support in the browser
  isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        try {
          analytics = getAnalytics(app);
        } catch (e) {
          // ignore any runtime errors initializing analytics
          console.warn('Analytics initialization failed:', e);
        }
      }
    })
    .catch(() => {
      // ignore failures; leave analytics as null
    });

  // Performance monitoring can sometimes attempt to auto-instrument DOM elements and
  // store selectors as custom attributes. In some cases (Tailwind responsive classnames
  // with colons) this can produce attribute values that the Firebase SDK rejects and
  // throws `performance/invalid attribute value`. To avoid runtime crashes, we only
  // initialize Performance when explicitly enabled via env (opt-in), and we guard with
  // a try/catch so failures do not break the app.
  try {
    if (process.env.NEXT_PUBLIC_ENABLE_FIREBASE_PERF === 'true') {
      performance = getPerformance(app);
    }
  } catch (e) {
    // If Firebase Performance initialization fails (e.g., invalid attribute values
    // during automatic instrumentation), log and continue without performance.
    console.warn('Firebase Performance initialization skipped or failed:', e);
    performance = null;
  }
}

export { app, auth, analytics, performance };
