
import { config } from 'dotenv';
config();

import '@/ai/flows/executive-profile-from-resume.ts';
import '@/ai/flows/match-executive-to-startup.ts';
import '@/ai/flows/rewrite-job-description-field.ts';
import '@/ai/flows/rewrite-executive-profile-field.ts';
import '@/ai/flows/rewrite-startup-profile-field.ts';
import '@/ai/flows/create-message-flow.ts';
import '@/ai/flows/rewrite-message-flow.ts';
import '@/ai/flows/create-status-change-message-flow.ts';
import '@/ai/flows/create-follow-up-message-flow.ts';
