
"use client";

import { getStartupNeed } from "@/lib/actions";
import { EditNeedClient } from "./form-client";
import { useEffect, useState } from 'react';
import type { StartupNeeds } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";


export default function EditStartupNeedPage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const [initialData, setInitialData] = useState<StartupNeeds | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        getStartupNeed(params.id, user.uid).then(result => {
            if (result.status === 'success' && result.need) {
                setInitialData(result.need);
            } else {
                setErrorMessage(result.message);
            }
            setLoading(false);
        });
    }, [params.id, user]);

  if (loading) {
    return (
        <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="mx-auto">
      <EditNeedClient initialData={initialData} errorMessage={initialData ? null : errorMessage} />
    </div>
  );
}
