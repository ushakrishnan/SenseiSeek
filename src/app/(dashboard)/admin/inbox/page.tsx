
"use client";

import { Suspense } from 'react';
import { InboxClient } from './inbox-client';

function InboxPageContent() {
    return <InboxClient />;
}

export default function InboxPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InboxPageContent />
        </Suspense>
    )
}
