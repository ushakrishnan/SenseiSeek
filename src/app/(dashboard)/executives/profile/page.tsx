
"use client";

import { ExecutiveProfileForm } from './executive-profile-form';
import { useAuth } from "@/components/auth-provider";
import { Loader2 } from 'lucide-react';
import type { ExecutiveProfile } from '@/lib/types';
import { getExecutiveProfile } from '@/lib/actions';
import { useEffect, useState } from 'react';

export default function ExecutiveProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [initialData, setInitialData] = useState<Partial<ExecutiveProfile> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setLoading(false);
        return;
    }

    getExecutiveProfile(user.uid).then(result => {
        if (result.status === 'success') {
            setInitialData(result.profile);
        }
        setLoading(false);
    });
  }, [user, authLoading]);
  
  return (
    <div className="mx-auto">
        {loading ? (
            <div className="text-center py-12">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading your profile...</p>
            </div>
        ) : (
            <ExecutiveProfileForm initialData={initialData} />
        )}
    </div>
  );
}
