
"use client";

import { getStartupNeed } from "@/lib/actions";
import { EditNeedClient } from "./form-client";
import { useEffect, useState } from 'react';
import type { StartupNeeds } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useParams } from "next/navigation";


export default function EditStartupNeedPage() {
    const { user } = useAuth();
    const params = useParams();
    const id = params.id as string;
    const [initialData, setInitialData] = useState<StartupNeeds | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !id) return;
        
        getStartupNeed(id, user.uid).then(result => {
            if (result.status === 'success' && result.need) {
                setInitialData(result.need);
            } else {
                setErrorMessage(result.message);
            }
            setLoading(false);
        });
    }, [id, user]);

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
