import { MatchingBackfillClient } from './matching-backfill-client';
import { Suspense } from 'react';

export default function MatchingBackfillPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MatchingBackfillClient />
        </Suspense>
    );
}
