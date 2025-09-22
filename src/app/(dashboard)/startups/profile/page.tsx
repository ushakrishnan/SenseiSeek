
"use client";

import { StartupProfileForm } from './startup-profile-form';
import { useAuth } from "@/components/auth-provider";
import { Loader2 } from 'lucide-react';
import type { StartupProfile } from '@/lib/types';

export default function StartupProfilePage() {
  const { userDetails, loading } = useAuth();

  return (
    <div className="mx-auto">
        {loading ? (
            <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your profile...</p>
            </div>
        ) : (
            <StartupProfileForm initialData={userDetails?.profile as Partial<StartupProfile> | null} />
        )}
    </div>
  );
}
