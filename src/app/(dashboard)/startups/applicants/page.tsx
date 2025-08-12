

'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';
import { CandidatesClient } from './candidates-client';
import { getStartupNeeds } from '@/lib/actions';
import type { StartupNeeds } from '@/lib/types';

export default function CandidatesPage() {
  const { user, loading: authLoading } = useAuth();
  const [initialNeeds, setInitialNeeds] = useState<StartupNeeds[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setLoading(false);
        return;
    }

    getStartupNeeds(user.uid).then(result => {
        if (result.status === 'success') {
            setInitialNeeds(result.needs);
        }
        setLoading(false);
    });
  }, [user, authLoading]);
  
  if (loading || authLoading) {
    return (
        <div className="text-center py-12">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading applicants...</p>
        </div>
    );
  }


  return (
      <CandidatesClient initialNeeds={initialNeeds} />
  );
}
