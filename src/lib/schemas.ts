

import { z } from 'zod';

export const executiveProfileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  photoUrl: z.string().optional(),
  expertise: z.string().min(50, { message: 'Expertise summary must be at least 50 characters.' }),
  industryExperience: z.array(z.string()).min(1, { message: "Please specify at least one industry." }).max(12, {message: "Please select a maximum of 12 skills."}),
  availability: z.string().min(1, { message: 'Please select an availability option.' }),
  desiredCompensation: z.string().min(1, { message: 'Please select a compensation range.' }),
  locationPreference: z.string().min(1, { message: 'Please select a location preference.' }),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  keyAccomplishments: z.array(z.object({
    value: z.string().min(25, { message: 'Please provide a detailed accomplishment (at least 25 characters).' }),
  })).min(1, { message: 'Please list at least one key accomplishment.' }),
  links: z.object({
    linkedinProfile: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
    personalWebsite: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
    portfolio: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  }).optional(),
  resumeText: z.string().optional(),
});

export const startupProfileSchema = z.object({
  // Contact Info
  userName: z.string().min(2, { message: "Your name must be at least 2 characters." }),
  userEmail: z.string().email(),
  yourRole: z.string().min(2, { message: 'Your role must be at least 2 characters.' }),
  // Company Info
  companyName: z.string().min(2, { message: 'Company name must be at least 2 characters.' }),
  companyWebsite: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  companyLogoUrl: z.string().optional(),
  industry: z.array(z.string()).min(1, { message: "Please specify at least one industry." }),
  // Funding
  investmentStage: z.string().optional(),
  investmentRaised: z.string().optional(),
  largestInvestor: z.string().optional(),
  // Company Story
  shortDescription: z.string().min(50, { message: 'Description must be at least 50 characters.' }),
  currentChallenge: z.string().min(50, { message: 'Challenge description must be at least 50 characters.' }),
  whyUs: z.string().min(50, { message: 'Value proposition must be at least 50 characters.' }),
  
});


export const startupNeedsSchema = z.object({
  companyName: z.string().min(2, { message: "Company name is required." }),
  companyStage: z.string().min(1, { message: "Please select a company stage." }),
  roleTitle: z.string().min(2, {message: "Role title is required."}).max(50, { message: "Role title must be 50 characters or less."}),
  roleSummary: z.string().min(50, { message: "Role summary must be at least 50 characters." }),
  keyDeliverables: z.string().min(50, { message: "Please list key deliverables (at least 50 characters)." }),
  keyChallenges: z.string().optional(),
  requiredExpertise: z.array(z.string()).min(1, { message: "Please specify at least one required expertise." }),
  engagementLength: z.string().min(1, { message: "Please select an engagement length." }),
  budget: z.string().min(1, { message: "Please select a budget." }),
  locationPreference: z.string().min(1, { message: "Please select a location preference." }),
  links: z.object({
    companyWebsite: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
    jobPosting: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
    linkedinProfile: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  }).optional(),
  status: z.enum(['active', 'inactive']).default('active'),
  creatorId: z.string().optional(),
  // These are for backward compatibility / data conversion
  projectScope: z.string().optional(),
});

export const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  role: z.enum(['startup', 'executive'], { errorMap: () => ({ message: "Please select a role." }) }),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

export const contactFormSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
    message: z.string().min(20, { message: "Message must be at least 20 characters." }),
});
    

    
