# Release Notes

This file contains a running log of changes for the Sensei Seek application.

---

## Version 0.0.1.1 - Admin & Messaging Supercharge

### New Features

- **Comprehensive Admin Panel**: Introduced a full-featured `/admin` dashboard for platform oversight.
  - **Dashboard Stats**: Admins can now view platform-wide metrics, including total user counts, new user registrations, and new opportunity postings.
  - **User Management**: A new `/admin/users` page allows admins to view, search, and filter all registered users.
  - **Contact User**: Admins can initiate a direct, one-on-one conversation with any non-admin user directly from the user management table.
  - **Promote to Admin**: A new tool on the admin dashboard allows an existing admin to promote any other user to an admin role via their email address.
- **Platform-wide Data Views**: The admin panel includes dedicated pages to view and search all data entities on the platform:
  - `/admin/opportunities`: All roles posted by startups.
  - `/admin/applications`: All applications submitted by executives.
  - `/admin/shortlisted`: All executives shortlisted by startups.
  - `/admin/saved`: All opportunities saved by executives.
- **Messaging & Inbox System**:
  - **Direct Messaging**: Startups and executives can now engage in one-on-one conversations, visible in their respective inboxes (`/startups/inbox`, `/executives/inbox`).
  - **Admin Inbox**: A dedicated inbox for administrators to manage user support requests and platform announcements.
  - **Help & Support**: Non-admin users now have a "Help & Support" button in their dashboard sidebar, which creates a dedicated support ticket/conversation with the platform admin.
  - **Contact Us Integration**: Messages submitted through the public "Contact Us" page are now routed directly into the Admin Inbox.
  - **Broadcast Messaging**: Admins can send platform-wide announcements to all users, which appear as a read-only broadcast message in every user's inbox.
- **AI-Powered Communication**:
  - **Initial Contact**: When a startup contacts an executive, AI now generates a personalized, professional outreach message based on both profiles.
  - **Status Change Message**: When a startup updates an applicant's status (e.g., to 'rejected'), AI generates a polite and empathetic notification message.

### Fixes

- **Corrected Firestore Indexes**: Added several missing composite indexes required for new admin and messaging queries, resolving multiple `FAILED_PRECONDITION` errors. Consolidated redundant indexes to optimize database performance.
- **Fixed `cookies()` API Usage**: Refactored `createSessionCookie` and `clearSessionCookie` actions to correctly `await` the `cookies()` function, resolving server errors during login and logout in Next.js 15.
- **Resolved Genkit Flow Name Collision**: Ensured all `rewrite` flows in Genkit have unique names in their definitions, fixing a server startup crash caused by a registry conflict.

---

## Version 0.0.1.0 - Documentation & UX Polish

### Fixes & Enhancements

- **Comprehensive Documentation**: Overhauled the `README.md` to include a mission statement, detailed feature list, tech stack summary, and a complete, step-by-step guide for local setup and Vercel deployment.
- **Improved Git Author Script**: The `fix-git-authors.sh` script is now more robust and user-friendly. It safely cleans up old backups and accepts a parameter to either amend the last commit (default) or rewrite the entire history (`./fix-git-authors.sh all`), preventing accidental history rewrites.
- **Consistent Static Pages**: The Terms of Service (`/tos`) and Privacy Policy (`/privacypolicy`) pages have been restyled to perfectly match the layout, fonts, and spacing of the "About Us" page for a consistent user experience. A missing import that was causing a crash on the `/tos` page has also been fixed.
- **Enhanced Opportunity View**: Executives viewing an opportunity detail page now see a comprehensive profile card for the startup, including their mission, funding details, and primary contact information. This provides crucial context without needing to navigate away from the page.

---

## Version 0.0.0.8 - Credential & AI Configuration Overhaul

### Fixes & Enhancements

- **Secure & Vercel-Compatible Firebase Credentials**: Replaced the insecure, file-based `GOOGLE_APPLICATION_CREDENTIALS` system with a robust, Base64-encoded environment variable (`FIREBASE_ADMIN_SDK_CONFIG_BASE64`). This change aligns with security best practices and ensures compatibility with serverless hosting platforms like Vercel. The `README.md` and `.env` files have been updated to reflect this new, more secure setup.
- **Resolved Gemini API Key Error**: Added the `GEMINI_API_KEY` environment variable and corresponding documentation. This fixes a critical error where Genkit flows were failing because they lacked the necessary API key to communicate with Google's generative AI services.
- **Fixed Genkit Flow Name Collision**: Corrected a server startup error (`/flow/rewriteFieldFlow already has an entry in the registry`) by renaming the duplicate AI flows in `rewrite-job-description-field.ts`, `rewrite-executive-profile-field.ts`, and `rewrite-startup-profile-field.ts` to have unique names.
- **Corrected `use server` Directive**: Removed an incorrectly placed `'use server'` directive from `src/lib/firebase.ts`. This was causing a fatal application error by improperly marking the Firebase admin initialization file as a server actions file.
- **Simplified Environment Configuration**: Cleaned up the `.env` file and `README.md` to remove numerous unnecessary environment variables related to Firebase credentials and OAuth providers, as these are now handled by the Base64-encoded service account and the Firebase console, respectively.

---

## Version 0.0.0.7 - Authentication & Stability Overhaul

### Features & Enhancements

- **Enhanced Security Model**: Migrated from client-side ID token storage to a more secure, server-managed session cookie system. Session cookies are `HttpOnly`, reducing the risk of XSS attacks.
- **Improved Logout**: The logout process now fully revokes the user's session on the server, ensuring a complete and secure sign-out.
- **Graceful Error Handling**: The application now handles AI model overload errors (e.g., "503 Service Unavailable") more gracefully, showing a user-friendly message instead of crashing.

### Fixes

- **Corrected Widespread Authentication Failures**: Resolved a persistent "You must be logged in" error that affected numerous pages (saving profiles, saving opportunities, viewing applicants, etc.).
  - **Problem**: The new session cookie-based authentication introduced race conditions and unreliable server-side verification. Server actions were checking for the session cookie before it was consistently available after a login or redirect.
  - **Solution**: Refactored all protected server actions (`saveExecutiveProfile`, `toggleSaveOpportunity`, `getStartupNeeds`, etc.) to accept the authenticated user's ID directly from the client. The client-side `useAuth()` hook provides a reliable and synchronized user state, which is now passed to server actions. This eliminates the server-side race condition and ensures authentication checks are accurate.
- **Restored "Save Opportunity" and "Save Profile"**: Fixed the functionality for both saving opportunities and saving executive profiles, which were broken by previous attempts to fix the authentication logic.
- **Fixed "Find Opportunities" and "Saved Opportunities" Page Loads**: Corrected the server actions for these pages to load data correctly, resolving the "must be logged in" error that was preventing them from rendering.
- **Stabilized Startup Dashboard**: Proactively applied the same authentication fixes to all startup-facing pages (`My Needs`, `Review Applicants`, `Find Talent`, etc.) to prevent similar errors.

---

## Version 0.0.0.6 - Enhanced Authentication & Account Linking

### Features & Enhancements

- **Multi-Provider Sign-In**: Users can now sign up and log in using their Google, GitHub, or Microsoft accounts, providing more flexible and convenient access to the platform.
- **Account Linking Management**: A new "Account Security" section has been added to both the Startup and Executive profile pages. This allows users to link multiple sign-in methods to a single account after they've registered.

### Fixes

- **Post-Link Login Stability**: Resolved a critical issue where linking a social account (e.g., Google) to an existing email/password account would incorrectly disable the original password login method. All linked sign-in methods now work concurrently.
- **Improved Error Handling**: The error message for `auth/account-exists-with-different-credential` has been clarified to correctly guide users on how to link their accounts if they try to sign up with an email that's already in use with a different provider.
- **Corrected Firebase Initialization**: Fixed an underlying bug in the client-side Firebase configuration that was causing unpredictable authentication behavior.
- **Clearer Guidance**: Provided clear, in-chat instructions on how to resolve the `auth/unauthorized-domain` error and correctly configure the GitHub OAuth callback URL for development environments.

---

## Version 0.0.0.5 - UI Polish & Stability

### Features & Enhancements

- **Profile Name Display**: The user's name in the main dashboard header now updates immediately after being changed on their profile page, ensuring data consistency.
- **UI Consistency**: The applicant cards on the "Review Applicants" page now align with the design on the "Find Talent" page, providing a more cohesive user experience while retaining all key actions like status changes and shortlisting.
- **Dashboard UI Upgrade**: The "Recent Applicants" section on the startup dashboard has been upgraded from a 3-column layout using the detailed applicant card style, allowing for direct status management and shortlisting from the dashboard.

### Fixes

- **Authentication Stability**: Resolved a critical server-side error that incorrectly reported users as logged out, preventing them from accessing their profiles and other authenticated pages.
- **Dashboard Crash**: Fixed a Firestore query error that caused the executive dashboard to crash when calculating the "Times Shortlisted" statistic.
- **Candidate Profile Crash**: Resolved a crash on the candidate detail page caused by a missing component import.

---

## Version 0.0.0.4

### New Features

- **Dashboard Statistics**:
  - Executive Dashboard now displays a "Times Shortlisted" card, showing how many startups are interested in their profile.
  - Startup Dashboard now features "Saved by Executives" and "Shortlisted Talent" cards to provide better insight into their roles' performance and their talent pipeline.
- **Read-Only Need View**: Startups can now view the details of a need they've created in a non-editable page, with a dedicated "View" icon on the need card for easy access.

### UI/UX Improvements

- **Dashboard Applicant Cards**: The "Recent Applicants" section on the Startup Dashboard has been upgraded to a 3-column layout using the detailed applicant card style. This allows startups to manage status and shortlisting directly from the dashboard.
- **Consistent Applicant Card Design**: The cards on the "Review Applicants" page have been redesigned to align with the "Find Talent" page, creating a more consistent look while retaining all key actions (status change, shortlisting).
- **Clearer Terminology**: Renamed dashboard stat cards from "Times Shortlisted" to "Shortlisted Talent" and "Opportunities Saved" to "Saved by Executives" for improved clarity.

### Fixes

- **AI Rewrite Functionality**: Corrected a critical bug where all "Rewrite with AI" buttons on the "Define a New Need" form were incorrectly rewriting the "Role Summary" field. Each button now correctly targets its corresponding field.
- **Dashboard Stability**: Fixed a Firestore query error that caused a crash when calculating the "Times Shortlisted" statistic for the executive dashboard.
- **Candidate Profile Crash**: Resolved a crash on the candidate detail page caused by a missing component import.

---

## Version 0.0.0.3

### Features

- **Startup Needs View Page**: Startups can now view the details of a need they've created in a read-only page, separate from the edit form. An explicit "View" icon has been added to the need cards for easier navigation.
- **Comprehensive Skills List**: The "Required Expertise" and "Skills" selectors now feature a greatly expanded and comprehensive list of skills across various domains, including Business, Marketing, Finance, and IT.
- **Startup Profile Logo Upload**: Startups can now upload their company logo, which will be displayed on their profile page and other areas of the application.

### Fixes

- **AI Rewrite Functionality**: Resolved multiple bugs in the "Rewrite with AI" feature across all forms. The buttons no longer get stuck in a loading state, and they now correctly rewrite the content for their corresponding field.
- **"Parse from Resume" UI**: Replaced the problematic popup dialog for parsing resumes with a more reliable inline form section, eliminating button visibility issues.
- **UI Consistency**: Standardized the main action buttons (e.g., "Save Profile", "Create Need") to be full-width for a more consistent and user-friendly experience across all forms.
- **Duplicate Skills**: Removed a duplicate "Change Management" skill that was causing rendering errors in the multi-select component.
