
"use client";

import { useEffect, useState } from 'react';
import { getStartupNeed } from "@/lib/actions";
import { ViewNeedClient } from "./view-need-client";
import { StartupNeeds } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function ViewStartupNeedPage({ params }: { params: { id: string } }) {
    const [initialData, setInitialData] = useState<StartupNeeds | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getStartupNeed(params.id).then(result => {
            if (result.status === 'success' && result.need) {
                setInitialData(result.need);
            } else {
                setErrorMessage(result.message);
            }
            setLoading(false);
        });
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="mx-auto">
            <ViewNeedClient initialData={initialData} errorMessage={errorMessage} />
        </div>
    );
}
