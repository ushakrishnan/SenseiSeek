# Sensei Seek: Feature & Functionality Overview

This document provides a comprehensive overview of the features, user flows, and AI capabilities built into the Sensei Seek platform.

---

## Core Concepts

- **Dual-Sided Marketplace**: The platform serves two primary user types: **Startups** (looking to hire) and **Executives** (looking for roles).
- **Fractional Roles**: The focus is on non-traditional, flexible employment models like fractional, interim, and advisory positions.
- **Admin Oversight**: A super-user role (**Admin**) exists for platform management, user support, and data monitoring.

---

## 1. Executive User Flow & Features

The journey for a fractional executive seeking opportunities.

### 1.1. Onboarding & Profile Management
- **Signup**: Executives sign up via Email/Password or OAuth (Google, GitHub, Microsoft) and select the "Executive" role.
- **AI-Assisted Profile Creation**:
    - **Parse from Resume**: Users can paste their resume text or a LinkedIn URL, and Genkit AI extracts key information (name, expertise, skills, accomplishments) to pre-fill the profile form.
    - **AI Rewrite**: For the "Expertise Summary" and "Key Accomplishments" fields, users can use AI to rewrite their input into more professional and impactful language, following the STAR method for accomplishments.
- **Comprehensive Profile**: The profile includes:
    - Photo, Name, Location
    - Professional "Elevator Pitch" (Expertise Summary)
    - Key Accomplishments (list format)
    - Skills & Industry Experience (tag-based multi-select)
    - Preferences: Availability, desired compensation, work location.
    - Links: LinkedIn, personal website, portfolio.
- **Account Security**: Users can link/manage multiple OAuth providers to their single account for flexible sign-in.

### 1.2. Finding & Managing Opportunities
- **Dashboard**: The central hub for executives, showing key stats:
    - Matched Opportunities
    - Total Applications & Awaiting Response
    - Times Shortlisted by startups
    - A preview of recent messages.
- **Find Opportunities**:
    - **AI Matching**: A list of all active roles, sorted by an AI-generated match score based on the executive's profile and the startup's needs. Pagination is included for easy browsing.
    - **Filtering & Sorting**: Users can filter roles by keyword, engagement type, budget, and sort by match score or newest roles.
- **Opportunity Detail View**:
    - Complete details of the role (summary, deliverables, challenges).
    - A detailed profile card for the hiring startup (mission, funding, contact info).
    - **Actions**: Apply, Save for Later.
- **Saved Opportunities**: A dedicated page to view all roles the executive has bookmarked.
- **My Applications**: A page listing all submitted applications and their current status (Applied, In-Review, Hired, Rejected).

### 1.3. Communication
- **Inbox**: A full-featured messaging interface to communicate directly with startups and platform support.
- **AI-Assisted Follow-Up**: After applying for a role, an executive can initiate contact with the startup. The system uses AI to generate a polite, professional follow-up message that the executive can review and edit before sending.
- **Automated Notifications**: Executives receive system-generated messages in their inbox when a startup updates their application status.

---

## 2. Startup User Flow & Features

The journey for a startup looking to hire executive talent.

### 2.1. Onboarding & Profile Management
- **Signup**: Startups sign up and select the "Startup" role.
- **Comprehensive Profile**: The profile includes:
    - Company Logo & Name
    - Company Website & Industry
    - Funding Details (stage, amount raised, lead investor)
    - Primary Contact Information (name, email, role)
    - **AI Rewrite**: "Mission," "Current Challenge," and "Why Us" fields can be enhanced with AI to be more compelling to candidates.
- **Account Security**: Manage linked OAuth providers.

### 2.2. Creating & Managing Needs
- **Dashboard**: The startup's command center with key stats:
    - Open Roles, Total Applicants
    - How many executives have saved their roles
    - Shortlisted talent count
    - A preview of recent messages and recent applicants.
- **Define a Need**: A detailed form for creating a new role posting.
    - **AI Rewrite**: All major text fields (Role Title, Summary, Deliverables, Challenges) have an "AI Rewrite" button to help founders craft professional, appealing job descriptions.
- **My Needs**: A page displaying all created roles (active and inactive) with options to view, edit, delete, or toggle status. Pagination is included for easy browsing.

### 2.3. Finding & Managing Talent
- **Find Talent**: A gallery of all executive profiles on the platform, with filtering by keyword, availability, location, and skills. Each profile includes an AI-generated match score based on all of the startup's active needs. Pagination is included for easy browsing.
- **Review Applicants**: A dedicated page to view all candidates who have applied to any of the startup's open roles. Each applicant has a match score specific to the role they applied for.
    - **Status Management**: Change an applicant's status (In-Review, Hired, Rejected).
    - **AI-Generated Status Messages**: When changing a status, AI generates a professional, empathetic message to send to the candidate, which the startup can edit.
- **Shortlisted Candidates**: A page to view all candidates the startup has shortlisted. Each candidate shows their best match score against all active roles.
- **Candidate Profile View**: A detailed view of an executive's profile.
    - **Actions**: Shortlist, Contact.
    - **AI-Assisted Initial Contact**: Clicking "Contact" uses AI to generate a personalized, professional outreach message based on both the startup's and executive's profiles.

### 2.4. Communication
- **Inbox**: A messaging interface to communicate directly with candidates and respond to inquiries.

---

## 3. Admin User Flow & Features

The journey for a platform administrator.

### 3.1. Dashboard & Platform Oversight
- **Admin Dashboard**: A central view of platform-wide statistics:
    - Total Users, Startups, and Executives.
    - Growth metrics (new users/opportunities in the last 7 days).
    - A preview of recent support conversations.
- **Promote User to Admin**: A simple form to grant admin privileges to any user by their email address.
- **Broadcast Message**: A tool to send a one-way announcement to all users (both startups and executives) on the platform.

### 3.2. Data Management & User Support
- **User Management**: A table of all users on the platform. Admins can search/filter users and initiate a direct conversation with any non-admin user.
- **Opportunity Management**: A view of all opportunities posted on the platform with links to their detail pages.
- **Application Management**: A comprehensive log of all applications submitted across the platform.
- **Shortlist & Saved Management**: Views to see all executive shortlisting and saved opportunity actions that have occurred.
- **Admin Inbox**: A dedicated inbox to:
    - Manage support conversations initiated by users.
    - View and reply to messages from the public "Contact Us" form.
    - Initiate direct conversations with any user.

---

## 4. Genkit AI Flows & Capabilities

- **`executiveProfileFromResume`**: Parses resume text/URLs to pre-fill the executive profile.
- **`rewriteExecutiveProfileField`**: Rewrites an executive's expertise or accomplishments to be more impactful.
- **`rewriteStartupProfileField`**: Rewrites a startup's mission, challenge, or "why us" sections for clarity and appeal.
- **`rewriteJobDescriptionField`**: Rewrites a startup's role title, summary, deliverables, or challenges to be more professional.
- **`matchExecutiveToStartup`**: (Core Matching Logic) Calculates a match score and provides a rationale for how well an executive fits a startup's need. Used in the "Find Opportunities" list for executives and all talent-facing pages for startups.
- **`createIntroductionMessage`**: (Contact Executive) Generates a personalized outreach message from a startup to an executive, referencing mutual interests and needs.
- **`createFollowUpMessage`**: (Contact Startup after applying) Generates a polite follow-up message from an executive to a startup.
- **`createStatusChangeMessage`**: (Applicant Status Change) Generates a professional, context-aware (hired, rejected, etc.) message to send to an applicant when their status changes.
- **`rewriteMessage`**: A general-purpose flow used in all inboxes to allow users to rewrite any message they are drafting for professionalism and clarity.
- **`startOrGetAdminConversation`**: Handles the logic for creating or retrieving support conversations between a user and the platform admin.
- **`sendContactMessageToAdmin`**: A publicly accessible flow that takes input from the "Contact Us" page and routes it into the admin's inbox as a new support conversation.
