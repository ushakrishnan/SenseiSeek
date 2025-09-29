
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// verify that changes are here upriya
if (!getApps().length) {
    const base64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64;
    // When running tests, prefer a default initializeApp() so the Firestore emulator
    // (if configured via env FIRESTORE_EMULATOR_HOST) can be used without a real
    // service account. In non-test modes, require the base64 service account.
    if (!base64 && process.env.NODE_ENV === 'test') {
        // Ensure Firestore client libraries can detect a project id in test env
        process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'test';
        admin.initializeApp();
    } else {
        if (!base64) {
            throw new Error(
                'CRITICAL: The FIREBASE_ADMIN_SDK_CONFIG_BASE64 environment variable is not set. The application cannot start.'
            );
        }
        let serviceAccount;
        try {
            const serviceAccountJson = Buffer.from(base64, 'base64').toString('utf8');
            serviceAccount = JSON.parse(serviceAccountJson);
        } catch (err: unknown) {
            const e = err as { message?: string } | undefined;
            throw new Error(`Failed to parse Firebase service account JSON from Base64. Error: ${e?.message || String(err)}`);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
}

export default admin;
