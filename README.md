# Sensei Seek: Fractional Executive Marketplace

Sensei Seek is a sophisticated marketplace platform designed to connect high-growth startups with elite, experienced executives for fractional, interim, or advisory roles. It bridges the gap between innovative companies needing strategic guidance and seasoned leaders seeking flexible, high-impact work.

## The Mission

In today's landscape, startups need world-class strategic leadership to navigate critical growth phases, but the traditional C-suite hiring model is often too slow and costly. Simultaneously, many successful executives are looking for ways to apply their wisdom without the constraints of a full-time role.

Sensei Seek was built to solve this problem. Our platform uses AI-powered matchmaking to connect the right talent with the right opportunity, creating strategic alliances that drive real, measurable results.

---

## Features

- **Dual-Sided Marketplace:** Separate, tailored experiences for both Startups and Executives.
- **AI-Powered Matching:** Intelligently matches executives to startup needs based on skills, experience, and company fit.
- **AI-Assisted Content Generation:** Leverages generative AI to help users craft compelling profiles, job descriptions, and initial outreach messages.
- **Comprehensive Profiles:** Startups can showcase their mission and funding, while executives can detail their expertise and accomplishments.
- **Secure Authentication:** Supports sign-in via Email/Password, Google, GitHub, and Microsoft, with secure, server-side session cookie management.
- **Full Application Workflow:** Functionality for applying, shortlisting, and managing application statuses with AI-assisted notifications.
- **Integrated Messaging System:** Direct, one-on-one communication between startups, executives, and platform support, all within the application's inbox.
- **Admin Panel:** A powerful dashboard for platform oversight, user management, data monitoring, and user support.

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS & ShadCN UI Components
- **Deployment:** Vercel

### Google Cloud & Firebase Services

-   **Generative AI:** All AI-powered features are built using **Google Gemini** models, orchestrated through **Genkit**, the open-source GenAI framework. This powers resume parsing, content rewriting, and intelligent matchmaking.
-   **Authentication:** Secure user sign-up, sign-in, and account management are handled by **Firebase Authentication**, supporting providers like Email/Password, Google, GitHub, and Microsoft.
-   **Database:** **Cloud Firestore** serves as the primary NoSQL database for storing all application data, including user profiles, job needs, and messages, with real-time capabilities.
-   **Analytics:** User behavior and application events are tracked with **Google Analytics**, providing insights into feature usage and user engagement patterns.
-   **Performance Monitoring:** The web application's performance, including load times and network requests, is monitored using **Firebase Performance Monitoring** to ensure a fast and reliable user experience.

---

## A Note on Open Source & Learning

Sensei Seek is an open-source project created with the dual purpose of solving a real-world business problem and serving as a comprehensive learning resource for the developer community. We believe in the power of sharing knowledge and providing practical, well-documented examples.

### Commitment to Open Source

This project is distributed under the MIT License. We encourage you to fork it, explore it, and adapt it for your own needs. Whether you're building a similar marketplace, learning Next.js and Genkit, or just curious about modern web architecture, we hope you find this repository valuable.

### Built with Firebase Studio

A significant portion of this application was built using **Firebase Studio**, an AI-assisted development environment. The goal was to explore how conversational AI can accelerate the development process, from generating boilerplate code for components and server actions to refactoring complex logic and debugging issues. By following the commit history, you can see how prompts and iterative feedback were used to shape the application, offering a unique look into the capabilities and workflow of AI-driven development.

---

## Project Setup: Step-by-Step Guide

Follow these instructions to get a local copy of the project up and running for development and testing.

### Step 1: Clone the Repository

First, clone the project from GitHub to your local machine.

```bash
git clone https://github.com/your-username/sensei-seek.git
cd sensei-seek
```

### Step 2: Install Dependencies

Install the necessary npm packages.

```bash
npm install
```

### Step 3: Set Up Your Firebase Project

This application relies heavily on Firebase for its backend services.

1.  **Create a Firebase Project:**
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Click **"Add project"** and follow the on-screen instructions.

2.  **Create a Web App:**
    - In your new project's dashboard, click the Web icon (`</>`) to create a new web application.
    - Register the app. You don't need to add the SDK scripts to your code, as we will use environment variables.
    - After registering, Firebase will provide you with a `firebaseConfig` object. Keep this handy for **Step 4**.

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
