# Sensei Seek: Future Enhancements & Roadmap

This document outlines planned improvements and future features for the Sensei Seek platform. It serves as a strategic roadmap for evolving the application into a more robust, secure, and feature-rich service.

---

## ⚠️ Immediate Security Fixes Required

**THIS SECTION OUTLINES A CRITICAL VULNERABILITY THAT MUST BE ADDRESSED BEFORE THE APPLICATION IS CONSIDERED PRODUCTION-READY OR SAFELY OPEN-SOURCED.**

### The Vulnerability: Insufficient Server-Side Authorization

*   **Problem**: Currently, many server actions in `src/lib/actions.ts` trust the `userId` or `creatorId` sent from the client (e.g., `saveExecutiveProfile(userId, data)`). A malicious user could modify the client-side code to send a different user's ID, allowing them to perform actions on behalf of that user.
*   **Impact**: This would allow any logged-in user to **read, edit, or delete data belonging to any other user** on the platform simply by crafting a custom request. This includes viewing and modifying profiles, needs, applications, and more. This is a severe vulnerability.

### The Solution: Server-Side Validation & Firestore Rules

A two-part fix is required to properly secure the application:

1.  **Refactor Server Actions**:
    *   All server actions that perform authenticated operations must be modified to **stop accepting a user ID from the client**.
    *   Instead, they must securely get the authenticated user's ID directly from the server-side session cookie. This ensures that a user can only ever act on their own behalf.

2.  **Implement Granular Firestore Security Rules**:
    *   The `firestore.rules` file must be rewritten to enforce strict, role-based access control at the database level.
    *   **Ownership**: Rules must ensure users can only write to their own profile documents (e.g., `/startup-profiles/{userId}`).
    *   **Role-Based Access**: Create, read, and update operations must be restricted based on the user's role (`startup`, `executive`, `admin`) as defined in their Firebase Auth custom claims.
    *   **Data Integrity**: Rules must prevent a user from creating data on behalf of another user (e.g., a startup can only create needs where `creatorId` matches their own `request.auth.uid`).
    *   **Admin Privileges**: Only users with an `admin` role in their token should be able to access platform-wide data collections.

This moves authorization from a trust-based client-side model to a secure, server-enforced model, which is the industry best practice.

---

## 1. Platform & Core Features

These features are aimed at enhancing the core user experience and expanding the platform's value proposition.

-   **Contracting & Payments Integration:**
    -   **Description:** Integrate a payment provider like Stripe Connect to facilitate secure, on-platform payments, contract signing, and invoicing between startups and executives.
    -   **Tasks:**
        -   Set up Stripe Connect accounts for both startups (customers) and executives (connected accounts).
        -   Create a workflow for generating simple service agreements or statements of work (SOWs).
        -   Implement automated invoicing and scheduled payouts.

-   **Advanced Filtering & Search:**
    -   **Description:** The current filtering is basic. Enhance the "Find Talent" and "Find Opportunities" pages with more granular filters.
    -   **Tasks:**
        -   Add filters for compensation range, company stage, and specific engagement types.
        -   Implement a more advanced keyword search that weighs different profile sections (e.g., expertise vs. accomplishments).
        -   Consider saving user filter preferences for future visits.

-   **Review & Rating System:**
    -   **Description:** Implement a two-way review system for startups and executives to provide feedback after an engagement is completed.
    -   **Tasks:**
        -   Create a new `reviews` collection in Firestore.
        -   Build a UI for submitting and viewing star ratings and written feedback.
        -   Display average ratings on user profiles to build trust and credibility.

-   **Enhanced Notifications:**
    -   **Description:** The current in-app messaging is good, but users need to be notified of key events when they are not on the platform.
    -   **Tasks:**
        -   Integrate an email service (e.g., SendGrid, Resend) to send transactional emails.
        -   Trigger email notifications for: new messages in the inbox, application status changes, and new recommended opportunities.
        -   Add a notification settings page for users to manage their email preferences.

---

## 2. Security & Compliance

Strengthening the security posture of the platform is critical for building user trust.

-   **Granular Role-Based Access Control (RBAC):**
    -   **Description:** The current security relies on a simple `admin` flag. The Firestore Security Rules should be significantly enhanced to be more granular.
    -   **Tasks:**
        -   Refactor `firestore.rules` to use `request.auth.token.role` to enforce strict access policies.
        -   Ensure users can only write to their own profiles and related documents (e.g., a startup can only edit its own needs).
        -   Add rules to prevent unauthorized reads of sensitive collections.

-   **API & Server Action Hardening:**
    -   **Description:** Protect server actions from abuse and unauthorized access.
    -   **Tasks:**
        -   Implement rate limiting on all server actions, especially those that trigger expensive AI flows.
        -   Add comprehensive server-side input validation on all actions to prevent malicious data injection, even for authenticated users.

-   **Two-Factor Authentication (2FA):**
    -   **Description:** Enhance account security by allowing users to enable 2FA.
    -   **Tasks:**
        -   Leverage Firebase Authentication's built-in support for multi-factor authentication (e.g., TOTP or SMS).
        -   Add a section in the "Account Security" settings for users to enable and manage 2FA.

---

## 3. AI & Genkit Optimization

Improve the cost-effectiveness, performance, and capabilities of the AI features.

-   **AI Cost & Usage Monitoring:**
    -   **Description:** Genkit flows can become expensive. Implement detailed logging to monitor AI usage and associate costs with specific features or users.
    -   **Tasks:**
        -   Create a custom Genkit middleware or use `onFlow()` hooks to log input/output token counts for every AI call.
        -   Store this data in a separate Firestore collection or export it to BigQuery for analysis.
        -   Build an admin dashboard panel to visualize AI costs over time.

-   **Implement AI Caching Strategies:**
    -   **Description:** Reduce redundant AI calls by caching results for deterministic requests.
    -   **Tasks:**
        -   For `matchExecutiveToStartup`, cache the result for a given (executiveId, needId) pair for a few hours. Invalidate the cache if either the executive's profile or the startup's need is updated.
        -   Use Firestore or a dedicated caching service like Redis for storing cached AI responses.

-   **Refine Matching Algorithm:**
    -   **Description:** The current matching is good but can be improved by adding more context and using more advanced Genkit features.
    -   **Tasks:**
        -   Introduce Genkit "tools" to the matching flow. For example, a tool that can look up specific company details or industry trends to provide a richer context for the LLM.
        -   Experiment with different models or fine-tuning (if available) to improve the nuance of match scoring.

---

## 4. Performance & Scalability

Ensure the application remains fast and responsive as the user base grows.

-   **Optimize Firestore Queries:**
    -   **Description:** Review all Firestore queries, especially in server actions that are called frequently on dashboard loads.
    -   **Tasks:**
        -   Ensure all queries are fully supported by the indexes in `firestore.indexes.json`.
        -   Denormalize data where appropriate to reduce the need for complex, multi-collection queries (e.g., store `companyName` directly on application documents).
        -   Implement server-side pagination for all list views (`getAdminAllUsers`, etc.) instead of fetching all documents and paginating on the client.

-   **Image Optimization:**
    -   **Description:** User-uploaded images (logos, profile photos) are stored as Base64 data URIs, which is inefficient.
    -   **Tasks:**
        -   Integrate Firebase Storage.
        -   When a user uploads an image, upload it to a Firebase Storage bucket instead of storing it in Firestore.
        -   Store the public URL of the image in the user's profile document.
        -   Leverage the Next.js Image component with the Firebase Storage URL for automatic optimization.

---

## 5. Monitoring & Observability

Gain better insight into the application's health and user behavior.

-   **Structured Logging:**
    -   **Description:** Implement structured logging for all server actions and API routes.
    -   **Tasks:**
        -   Create a logging utility that outputs JSON-formatted logs.
        -   Include important context in logs, such as `userId`, `role`, and `traceId`.
        -   Integrate with a log management service like Google Cloud Logging for easier searching and alerting.

-   **Client-Side Error Tracking:**
    -   **Description:** Set up a dedicated service to capture and report client-side errors.
    -   **Tasks:**
        -   Integrate a service like Sentry or Bugsnag.
        -   Configure it to capture unhandled exceptions and provide detailed stack traces and session information to accelerate debugging.

-   **Custom Analytics Events:**
    -   **Description:** Go beyond the basic `page_view` events to track key user actions.
    -   **Tasks:**
        -   Log events in Firebase Analytics for: profile completion, need creation, application submission, shortlisting, and sending a message.
        -   Use this data to build funnels and understand user engagement patterns.

---

## 6. Development & Operations (DevOps)

Improve the development workflow and deployment pipeline.

-   **Set Up Staging/Testing Environment:**
    -   **Description:** Create a separate Vercel project and Firebase project to serve as a dedicated staging environment.
    -   **Tasks:**
        -   Configure the deployment pipeline (e.g., using GitHub Actions) to automatically deploy the `main` branch to production and a `develop` branch to staging.
        -   This allows for thorough testing of new features before they are released to users.

-   **End-to-End Testing Framework:**
    -   **Description:** Implement an automated end-to-end testing suite to catch regressions.
    -   **Tasks:**
        -   Set up a testing framework like Playwright or Cypress.
        -   Write test scripts for critical user flows (e.g., signup, profile creation, applying for a role).
        -   Integrate the tests into the CI/CD pipeline to run automatically on every pull request.
