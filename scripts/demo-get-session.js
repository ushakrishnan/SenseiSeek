#!/usr/bin/env node
/*
  scripts/demo-get-session.js

  Usage:
    - Provide FIREBASE_ID_TOKEN in env to skip sign-in step.
    - Or provide FIREBASE_API_KEY, TEST_EMAIL, TEST_PASSWORD to sign in via Firebase REST API.

  Output: prints the ss-session cookie value that you can paste into curl or Swagger.
*/
const https = require('https');
const http = require('http');
const url = require('url');
const { execSync } = require('child_process');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const ID_TOKEN = process.env.FIREBASE_ID_TOKEN;
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';

function signInWithEmail(email, password, apiKey) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            email,
            password,
            returnSecureToken: true,
        });
        const opts = {
            hostname: 'identitytoolkit.googleapis.com',
            path: `/v1/accounts:signInWithPassword?key=${apiKey}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        };
        const req = https.request(opts, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.error) return reject(new Error(JSON.stringify(parsed.error)));
                    return resolve(parsed.idToken);
                } catch (e) {
                    return reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

function exchangeIdTokenForSession(idToken) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ idToken });
        const parsed = url.parse(`${APP_ORIGIN}/api/auth/session`);
        const isHttps = parsed.protocol === 'https:';
        const opts = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) },
        };
        const req = (isHttps ? https : http).request(opts, (res) => {
            const setCookie = res.headers['set-cookie'];
            if (!setCookie) return reject(new Error('No Set-Cookie header returned'));
            // Find ss-session cookie
            const ss = setCookie.find((c) => c.startsWith('ss-session='));
            if (!ss) return reject(new Error('ss-session cookie not found in Set-Cookie'));
            // Parse cookie value
            const val = ss.split(';')[0].split('=')[1];
            resolve(val);
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

(async () => {
    try {
        let idToken = ID_TOKEN;
        if (!idToken) {
            if (!FIREBASE_API_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
                console.error('Provide FIREBASE_ID_TOKEN env or FIREBASE_API_KEY + TEST_EMAIL + TEST_PASSWORD');
                process.exit(1);
            }
            console.log('Signing in via Firebase REST API...');
            idToken = await signInWithEmail(TEST_EMAIL, TEST_PASSWORD, FIREBASE_API_KEY);
        }

        console.log('Exchanging idToken for session cookie at', APP_ORIGIN + '/api/auth/session');
        const cookieVal = await exchangeIdTokenForSession(idToken);
        console.log('\nss-session cookie value (paste into Cookie header):\n');
        console.log(cookieVal);
        console.log('\nExample curl:');
        console.log(`curl -H "Cookie: ss-session=${cookieVal}" -X GET "${APP_ORIGIN}/api/users/me"`);
    } catch (err) {
        console.error('Failed:', err && err.message ? err.message : err);
        process.exit(1);
    }
})();
