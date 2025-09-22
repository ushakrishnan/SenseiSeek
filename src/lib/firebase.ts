
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

// verify that changes are here upriya
if (!getApps().length) {
    const base64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64;
    if (!base64) {
        throw new Error(
        'CRITICAL: The FIREBASE_ADMIN_SDK_CONFIG_BASE64 environment variable is not set. The application cannot start.'
        );
    }

    let serviceAccount;
    try {
        const serviceAccountJson = Buffer.from(base64, 'base64').toString('utf8');
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch (err: any) {
        throw new Error(`Failed to parse Firebase service account JSON from Base64. Error: ${err.message}`);
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export default admin;
