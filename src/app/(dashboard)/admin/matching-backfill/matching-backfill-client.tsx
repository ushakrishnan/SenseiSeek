"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth-provider';
import { fetchMatchingBackfillMissing, fillMatchingBackfill } from '@/lib/client-actions';
import { useToast } from '@/hooks/use-toast';

export function MatchingBackfillClient() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [kind, setKind] = useState<'job' | 'user'>('job');
    const [limit, setLimit] = useState<number>(100);
    const [isLoading, setIsLoading] = useState(false);
    const [missing, setMissing] = useState<string[]>([]);

    const fetchMissing = async () => {
        if (!user) return toast({ title: 'Not signed in', variant: 'destructive' });
        setIsLoading(true);
        try {
            const body = await fetchMatchingBackfillMissing(kind, limit);
            setMissing(body?.ids || []);
            toast({ title: 'Fetched', description: `Found ${body?.ids?.length || 0} missing embeddings` });
        } catch (err: unknown) {
            const e = err as { message?: string } | undefined;
            toast({ title: 'Error', description: e?.message || String(err), variant: 'destructive' });
        } finally { setIsLoading(false); }
    };

    const fillSelected = async () => {
        if (!user) return toast({ title: 'Not signed in', variant: 'destructive' });
        if (!missing.length) return toast({ title: 'No ids selected' });
        setIsLoading(true);
        try {
            const body = await fillMatchingBackfill(kind, missing);
            const results = Array.isArray(body?.results) ? body.results : (body?.data?.results || []);
            const successCount = results.filter((r: any) => (r && (r.ok === true || r.status === 'success' || r.success === true))).length;
            toast({ title: 'Backfill', description: `Upserted ${successCount}/${results.length}` });
            const remaining = results.filter((r: any) => !(r && (r.ok === true || r.status === 'success' || r.success === true))).map((r: any) => r.id);
            setMissing(remaining || []);
        } catch (err: unknown) {
            const e = err as { message?: string } | undefined;
            toast({ title: 'Error', description: e?.message || String(err), variant: 'destructive' });
        } finally { setIsLoading(false); }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Matching Vector Backfill</CardTitle>
                <CardDescription>Find missing embeddings and write them to the vector store.</CardDescription>
            </CardHeader>
            <div className="p-4 space-y-3">
                <div className="flex items-center space-x-2">
                    <label className="mr-2">Kind</label>
                    <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="border rounded p-1">
                        <option value="job">job (startup needs)</option>
                        <option value="user">user (executive profiles)</option>
                    </select>
                    <label className="ml-4">Limit</label>
                    <input type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="w-24 border rounded p-1 ml-2" />
                </div>
                <div className="flex space-x-2">
                    <Button onClick={fetchMissing} disabled={isLoading}>Fetch Missing</Button>
                    <Button onClick={fillSelected} disabled={isLoading || !missing.length}>Fill Selected</Button>
                </div>

                <div>
                    <h4 className="font-semibold">Missing IDs ({missing.length})</h4>
                    <div className="mt-2 max-h-64 overflow-auto bg-muted p-2 rounded">
                        {missing.length === 0 ? <div className="text-muted-foreground">None</div> : missing.map(id => <div key={id} className="text-sm font-mono py-1">{id}</div>)}
                    </div>
                </div>
            </div>
        </Card>
    );
}
