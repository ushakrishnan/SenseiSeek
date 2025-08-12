
"use client";

import { StartupNeedsForm } from "@/app/(dashboard)/startups/needs/new/form";
import type { StartupNeeds } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function EditNeedClient({ initialData, errorMessage }: { initialData: StartupNeeds | null, errorMessage?: string | null }) {
    if (errorMessage) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>{errorMessage}</CardDescription>
                </CardHeader>
            </Card>
        )
    }
    
    if (!initialData) {
         return (
             <Card>
                <CardHeader>
                    <CardTitle>Not Found</CardTitle>
                    <CardDescription>The need you are looking for could not be found.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return <StartupNeedsForm initialData={initialData} />;
}
