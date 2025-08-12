

"use client";

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { InboxClient } from './inbox-client';

function InboxPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const conversationId = searchParams.get('conversationId');

    // This is a bit of a workaround to update the URL without a full page reload
    // after we land here from the "Contact Support" button.
    useEffect(() => {
        if (conversationId) {
            router.replace('/startups/inbox', { scroll: false });
        }
    }, [conversationId, router]);

    return <InboxClient initialConversationId={conversationId} />;
}

export default function InboxPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InboxPageContent />
        </Suspense>
    )
}
