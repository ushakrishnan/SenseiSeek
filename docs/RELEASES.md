# Sensei Seek: Release Notes

---

## Version 1.0.1: Stability and Documentation Update
**Release Date:** August 12, 2025

This release focuses on improving the developer experience, fixing critical build and runtime errors, and enhancing the project's documentation to make it more accessible for contributors and users.

### Enhancements & Fixes
-   **Build & Stability:**
    -   Resolved a critical `npm install` failure by removing incorrect OpenTelemetry package dependencies from `package.json`.
    -   Fixed a recurring server startup loop by correcting the `dev` script and removing a conflicting `genkit:dev` script.
    -   Addressed a Next.js App Router issue by replacing deprecated `params` prop access with the `useParams` hook in client components, preventing runtime errors.
-   **Documentation:**
    -   Enriched the project `README.md` and `FEATURES.md` with animated GIFs to visually showcase the core application flows for marketing, startups, and executives.
    -   Created this `RELEASES.md` file to serve as a running changelog for the project.

---

## Version 1.0.0: Initial Release
**Release Date:** August 11, 2025

The first public release of Sensei Seek, a sophisticated marketplace platform designed to connect high-growth startups with elite, experienced executives for fractional, interim, or advisory roles.

### Core Features
-   **Dual-Sided Marketplace:** Tailored experiences for both Startups and Executives.
-   **AI-Powered Functionality (Genkit & Gemini):**
    -   AI-assisted profile creation (resume parsing, content rewriting).
    -   AI-driven job description generation.
    -   Intelligent matchmaking between startups and executives.
    -   AI-generated messaging for introductions, follow-ups, and status updates.
-   **Comprehensive Profiles:** Detailed profiles for both startups (mission, funding, etc.) and executives (expertise, accomplishments, etc.).
-   **Full Application Workflow:** Complete system for applying, shortlisting, and managing application statuses.
-   **Integrated Messaging System:** Direct, one-on-one communication within the platform.
-   **Secure Authentication:** Firebase-powered sign-in via Email/Password and OAuth (Google, GitHub, Microsoft).
-   **Admin Panel:** A powerful dashboard for platform oversight, user management, and support.