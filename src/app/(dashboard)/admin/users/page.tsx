
"use client";

import { UsersClient } from './users-client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

function UsersPageContent() {
    const searchParams = useSearchParams();
    const [initialSearch, setInitialSearch] = useState<string | null>(null);

    useEffect(() => {
        // We need to wait for the component to be mounted on the client
        // before we can safely access searchParams.
        setInitialSearch(searchParams.get('search') || '');
    }, [searchParams]);


    if (initialSearch === null) {
        // Render a loading state or null while waiting for the client to mount
        // and search params to be available. This prevents server-side rendering issues.
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return <UsersClient initialSearch={initialSearch} />;
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UsersPageContent />
    </Suspense>
  );
}
