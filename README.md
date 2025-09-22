# Sensei Seek: Fractional Executive Marketplace (Proprietary)

Sensei Seek is a commercial, proprietary marketplace platform that connects high-growth startups with experienced executives for fractional, interim, or advisory roles. This repository contains proprietary source code and is not open source.
+
Notice: This code is proprietary. You may not copy, distribute, publish, or use this software except as permitted by a separate written license from the owner. For licensing and commercial inquiries, contact: `ushapriya.krishnan@gmail.com`.

---

## Features

- Dual-Sided Marketplace: Separate, tailored experiences for both Startups and Executives.
- AI-Powered Matching: Intelligently matches executives to startup needs based on skills, experience, and company fit.
- AI-Assisted Content Generation: Leverages generative AI to help users craft compelling profiles, job descriptions, and initial outreach messages.
- Comprehensive Profiles: Startups can showcase their mission and funding, while executives can detail their expertise and accomplishments.
+
---

## Internal Setup (for authorized users)

This section is intended for internal developers or licensed users who have been granted access. If you don't have an authorized license or written permission, do not use or distribute this code.
+

### Step 1: Obtain Access

Contact `ushakrishnan@example.com` to request access and licensing information. Once approved, you will receive instructions for secure access and required environment variables.
+

### Step 2: Install Dependencies
+

Install the necessary npm packages (run in project root):
+

```powershell
npm install
```

### Step 3: Set Up Your Firebase Project

This application relies on Firebase for backend services. Authorized users will receive Firebase project details as part of their onboarding.
+

3.  **Enable Authentication Methods:**
    - In the Firebase Console, go to **Authentication** -> **Sign-in method**.
    - Enable the following providers:
        - Email/Password
        - Google
        - GitHub
        - Microsoft
    - For GitHub and other OAuth providers, you will need to add the callback URL provided by Firebase to your OAuth App settings.

4.  **Set up Firestore Database:**
    - Go to **Firestore Database** and click **"Create database"**.
    - Start in **production mode**. This ensures your data is secure by default.
    - Choose a location for your database.

5.  **Deploy Firestore Rules and Indexes:**
    The application requires specific composite indexes for querying data and security rules to protect it. Instead of creating these manually, you can deploy them using the Firebase CLI.

    -   **Install the Firebase CLI:** If you don't have it, install it globally.
        ```bash
        npm install -g firebase-tools
        ```

    -   **Login to Firebase:**
        ```bash
        firebase login
        ```

    -   **Associate the project:** Tell the CLI which Firebase project this directory is for. Replace `senseiseek-ushak` with your actual project ID.
        ```bash
        firebase use senseiseek-ushak
        ```

    -   **Deploy rules and indexes:** This command reads the `firestore.rules` and `firestore.indexes.json` files and deploys them to your project.
        ```bash
        firebase deploy --only firestore
        ```

    *Note: It will take a few minutes for Firebase to build the indexes.*

### Step 4: Set Up Environment Variables

Create a file named `.env` in the root of your project. This file will hold your secret keys and client-side configuration.

```
touch .env
```

Now, open the `.env` file and add the following variables.

#### 4.1 Firebase Client Configuration (Client-Side)

These keys are for the client-side Firebase SDK and are safe to expose. They identify your Firebase project to the user's browser.

-   **Get Your Client Config:**
    1.  In your Firebase project settings (click the gear icon), go to the **"General"** tab.
    2.  Scroll down to the **"Your apps"** section and find your web app.
    3.  Select the **"Config"** option for the SDK setup and authentication.
    4.  Firebase will show you a `firebaseConfig` object. Copy the values from it.

-   **Set the Environment Variables:**
    In your `.env` file, add the following lines, replacing the placeholder values with the ones from your `firebaseConfig` object.

    ```env
    # Firebase Client SDK Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="senseiseek-ushak.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="senseiseek-ushak"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="senseiseek-ushak.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
    NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="your-measurement-id"
    ```

#### 4.2 Firebase Admin SDK (Server-Side)

This secret key is for server-side actions like setting user roles. **It must be kept private.**

-   **Get Your Service Account Key:**
    1.  In your Firebase project settings, go to the **"Service accounts"** tab.
    2.  Click **"Generate new private key"** and download the JSON file.

-   **Base64 Encode the Key:**
    Open a terminal and run the correct command for your OS to encode the entire content of the JSON file.

    -   **macOS:** `base64 -i /path/to/your/serviceAccountKey.json | tr -d '\n'`
    -   **Linux / Windows (WSL):** `base64 -w 0 /path/to/your/serviceAccountKey.json`
    -   **Windows (PowerShell):** `[Convert]::ToBase64String([System.IO.File]::ReadAllBytes("C:\path\to\your\serviceAccountKey.json"))`

    This outputs a single, long string. Copy it.

-   **Set the Environment Variable:**
    In your `.env` file, add the following line, pasting the Base64 string as the value:
    ```env
    # Firebase Admin SDK
    FIREBASE_ADMIN_SDK_CONFIG_BASE64="<PASTE_YOUR_BASE64_ENCODED_KEY_HERE>"
    ```

#### 4.3 Gemini API Key (For Generative AI)

The AI features are powered by the Google Gemini API.

-   **Get Your API Key:**
    1.  Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
    2.  Click **"Create API key"** and copy it.

-   **Set the Environment Variable:**
    In your `.env` file, add the following line:
    ```env
    # Gemini API Key
    GEMINI_API_KEY="<PASTE_YOUR_GEMINI_API_KEY_HERE>"
    ```

### Step 5: Run the Application Locally

You're all set! Run the development server.

```bash
npm run dev
```

The application should now be running at `http://localhost:9002`.

### Step 6: Create Your First Admin User

The admin panel is protected, and there are no admins by default. Follow these steps to create your first admin user using a secure, one-time script.

1.  **Sign Up Normally**:
    -   Navigate to `http://localhost:9002/signup`.
    -   Create a new user account with your email. You can choose either the "Startup" or "Executive" role; this will be overridden by the script.

2.  **Run the Promotion Script**:
    -   Make sure your development server is still running.
    -   Open a **new terminal window** in the same project directory.
    -   Run the following command, replacing `your-email@example.com` with the email address of the user you just created:
        ```bash
        node scripts/promote-admin.js your-email@example.com
        ```
    -   You should see a success message in the terminal, like: `Successfully promoted your-email@example.com to admin.`

3.  **Verify Admin Access**:
    -   Log into the application with the user account you just promoted.
    -   Navigate to the admin dashboard at `http://localhost:9002/admin/dashboard`.
    -   You should now have full access to the admin panel.

Your user now has admin privileges. This script is safe to use and does not require any code modifications. You can use it to promote other admins in the future as needed, both locally and in production.

### A Note on Changing Your Firebase Project

If you need to switch to a different Firebase project after the initial setup, you must update the following places:

1.  **`.env` File**: This is the most important step. You must regenerate your client-side `firebaseConfig` object from the new Firebase project and update all the `NEXT_PUBLIC_FIREBASE_*` variables in your `.env` file accordingly.
2.  **Firebase CLI Context**: In your terminal, run `firebase use <your-new-project-id>` to point the Firebase CLI to your new project. This ensures that commands like `firebase deploy` target the correct backend.
3.  **OAuth Providers**: If you have configured OAuth providers (Google, GitHub, etc.), you must update the callback URLs in the Firebase Authentication console and in your app's settings on each provider's developer console to reflect the new project's `authDomain`.

---

## Deployment to Vercel

Deploying the application is straightforward with Vercel.

### Step 1: Push to GitHub

Initialize a Git repository, commit your code, and push it to a new repository on GitHub.

### Step 2: Connect Vercel

1.  Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Click **"Add New... -> Project"**.
3.  Import the GitHub repository you just created.
4.  Vercel will automatically detect that this is a Next.js project.

### Step 3: Configure Environment Variables

This is the most critical step for deployment.

1.  In your Vercel project settings, go to the **"Settings" -> "Environment Variables"** section.
2.  Add all the same variables you created in your local `.env` file, including all `NEXT_PUBLIC_` variables, `FIREBASE_ADMIN_SDK_CONFIG_BASE64`, and `GEMINI_API_KEY`.
3.  Paste the corresponding values for each.

### Step 4: Deploy

Click the **"Deploy"** button. Vercel will build and deploy your application. Once finished, it will provide you with a URL to your live site.

Congratulations, your Sensei Seek marketplace is now live! Remember to follow **Step 6** from the local setup guide on your live application to create your production admin user. This can be done by connecting your Vercel project to a terminal and running the promotion script.
