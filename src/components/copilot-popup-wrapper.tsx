"use client";

import { CopilotPopup } from '@copilotkit/react-ui';

export function CopilotPopupWrapper() {
    return (
        <CopilotPopup
            instructions="You are an AI documentation assistant for SenseiSeek - a marketplace connecting fractional executives with startups. You have access to all project documentation. Keep your responses SHORT and CONCISE - 2-3 sentences max unless the user explicitly asks for details. Use bullet points for lists. Get straight to the point. If asked 'how does X work', give a brief 1-2 sentence answer, then ask if they want more details."
            labels={{
                title: "SenseiSeek Docs Assistant",
                initial: "Hi! 👋 Try asking:\n\n- Tell me about this project\n- What is the architecture?\n- How is AI used?\n- What are the main features?\n- What's the tech stack?",
            }}
            defaultOpen={false}
            clickOutsideToClose={true}
        />
    );
}
