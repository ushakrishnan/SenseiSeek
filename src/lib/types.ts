

import type { z } from 'zod';
import type { executiveProfileSchema, startupNeedsSchema, startupProfileSchema } from './schemas';

export type ExecutiveProfile = z.infer<typeof executiveProfileSchema> & {
    id: string;
    avatarUrl?: string;
    dataAiHint?: string;
    updatedAt?: string;
    createdAt?: string;
    isShortlisted?: boolean;
    city?: string;
    state?: string;
    country?: string;
    email?: string;
    matchScore?: number;
    appliedToRoleTitle?: string | null;
    shortlistedAt?: string;
    // Ensure these are not optional when mapped from the DB
    keyAccomplishments: { value: string }[];
    industryExperience: string[];
};

export type StartupProfile = z.infer<typeof startupProfileSchema> & {
    id: string;
    updatedAt?: string;
    createdAt?: string;
    industry: string[];
};

// Merging optional fields for backward compatibility
export type StartupNeeds = Omit<z.infer<typeof startupNeedsSchema>, 'projectScope'> & {
    id: string;
    logoUrl?: string;
    dataAiHint?: string;
    // For old data structure
    projectScope: string; 
    requiredExpertise: string[] | string;
    status: 'active' | 'inactive';
    createdAt: string; 
    updatedAt?: string;
    isSaved?: boolean;
    isApplied?: boolean;
    applicationStatus?: ApplicationStatus;
    creatorId?: string;
    startupProfile?: StartupProfile | null;
};


export type MatchResult = (ExecutiveProfile | StartupNeeds) & {
    matchScore: number;
    rationale: string;
    recommendation: string;
};

export type ApplicationStatus = 'applied' | 'in-review' | 'rejected' | 'hired';

export type Application = {
    id: string;
    status: ApplicationStatus;
    appliedAt: string;
    startupNeed: StartupNeeds;
};

export type ApplicationWithExecutive = {
    id: string;
    status: ApplicationStatus;
    appliedAt: string;
    startupNeed: StartupNeeds;
    executive: ExecutiveProfile;
    matchScore?: number;
}

export type StartupDashboardStats = {
    openNeedsCount: number;
    totalApplicants: number;
    recentApplicants: ApplicationWithExecutive[];
    opportunitiesSavedCount: number;
    timesShortlisted: number;
    recentConversations: ConversationWithRecipient[];
};

export type ExecutiveDashboardStats = {
    matchedOpportunities: number;
    totalApplications: number;
    awaitingResponse: number;
    isProfileStale: boolean;
    profileUpdatedAt: string | null;
    recentOpportunities: MatchResult[];
    timesShortlisted: number;
    recentConversations: ConversationWithRecipient[];
};

export type AdminDashboardStats = {
    totalUsers: number;
    totalStartups: number;
    totalExecutives: number;
    newStartups: number;
    newExecutives: number;
    newOpportunities: number;
    recentConversations: ConversationWithRecipient[];
};

export type UserRole = 'startup' | 'executive' | 'admin';

export type UserListItem = {
    uid: string;
    email: string;
    name: string;
    role: UserRole | null;
    createdAt: string;
}

export type ApplicationWithDetails = {
    id: string;
    executiveId: string;
    executiveName: string;
    startupId: string;
    startupName: string;
    needId: string;
    roleTitle: string;
    status: ApplicationStatus;
    appliedAt: string;
}

export type ShortlistedItem = {
    id: string; // combination of startupId and executiveId
    executiveId: string;
    executiveName: string;
    startupId: string;
    startupName: string;
    shortlistedAt: string;
}

export type SavedItem = {
    id: string; // combination of execId and needId
    executiveId: string;
    executiveName: string;
    needId: string;
    roleTitle: string;
    savedAt: string;
}

export type Conversation = {
    id: string;
    participants: string[];
    startupId?: string;
    executiveId?: string;
    guestName?: string;
    guestEmail?: string;
    createdAt: string;
    lastMessageAt: string;
    lastMessageText?: string;
    lastMessageSenderId?: string;
    needId?: string;
    unreadCounts: { [key: string]: number };
}

export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    text: string;
    createdAt: string;
    status: 'sent' | 'delivered' | 'read';
    isReadByRecipient: boolean;
    isBroadcast: boolean;
}

export type ConversationWithRecipient = Conversation & {
    recipientName: string;
    recipientAvatarUrl?: string;
};
