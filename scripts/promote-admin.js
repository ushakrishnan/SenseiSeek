
// Load environment variables from the .env file
require('dotenv').config();
const admin = require('firebase-admin');

/**
 * Initializes the Firebase Admin SDK if it hasn't been already.
 * This function is safe to call multiple times.
 */
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return;
    }

    const base64 = process.env.FIREBASE_ADMIN_SDK_CONFIG_BASE64;
    if (!base64) {
        console.error('\x1b[31m%s\x1b[0m', 'CRITICAL ERROR: The FIREBASE_ADMIN_SDK_CONFIG_BASE64 environment variable is not set.');
        console.error('Please ensure your .env file is correctly configured with the Base64 encoded service account key.');
        process.exit(1);
    }

    try {
        const serviceAccountJson = Buffer.from(base64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(serviceAccountJson);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (err) {
        console.error('\x1b[31m%s\x1b[0m', 'Failed to parse or initialize Firebase Admin SDK:');
        console.error(err.message);
        process.exit(1);
    }
}

/**
 * Promotes a user to an admin role based on their email address.
 * @param {string} email The email of the user to promote.
 */
async function promoteUser(email) {
    if (!email) {
        console.error('\x1b[31m%s\x1b[0m', 'Error: No email address provided.');
        console.log('Usage: node scripts/promote-admin.js <user-email@example.com>');
        return;
    }

    try {
        initializeFirebaseAdmin();

        console.log(`Fetching user with email: ${email}...`);
        const user = await admin.auth().getUserByEmail(email);

        if (user.customClaims && user.customClaims.role === 'admin') {
            console.warn('\x1b[33m%s\x1b[0m', `User ${email} is already an admin.`);
            return;
        }

        console.log(`Promoting user ${user.uid} to admin...`);
        await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });

        console.log('\x1b[32m%s\x1b[0m', `Successfully promoted ${email} to admin.`);
        console.log('They will have admin privileges on their next login.');

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error('\x1b[31m%s\x1b[0m', `Error: User with email "${email}" not found.`);
        } else {
            console.error('\x1b[31m%s\x1b[0m', 'An unexpected error occurred:');
            console.error(error.message);
        }
    }
}

// Get the email from the command line arguments
const emailToPromote = process.argv[2];

// Run the promotion function
promoteUser(emailToPromote);
