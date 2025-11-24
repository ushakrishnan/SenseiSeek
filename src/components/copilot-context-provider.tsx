"use client";

import { useCopilotReadable } from "@copilotkit/react-core";
import { useEffect, useState } from "react";

export function CopilotContextProvider({ children }: { children: React.ReactNode }) {
    const [docsContent, setDocsContent] = useState<Record<string, string>>({});
    const [readmeContent, setReadmeContent] = useState<string>("");

    useEffect(() => {
        // Fetch README
        fetch('/README.md')
            .then(res => res.text())
            .then(content => setReadmeContent(content))
            .catch(err => console.error('Failed to load README:', err));

        // Fetch all documentation files
        const docFiles = [
            'API_SPEC.md',
            'ARCHITECTURE.md',
            'FEATURES.md',
            'MATCHING_IMPLEMENTATION.md',
            'HELP.md',
            'APP_ROUTER_MIGRATION.md',
            'MIGRATION.md',
            'SWAGGER_AUTH.md'
        ];

        Promise.all(
            docFiles.map(file =>
                fetch(`/docs/${file}`)
                    .then(res => res.text())
                    .then(content => ({ file, content }))
                    .catch(err => {
                        console.error(`Failed to load ${file}:`, err);
                        return { file, content: '' };
                    })
            )
        ).then(results => {
            const docs = results.reduce((acc, { file, content }) => {
                acc[file] = content;
                return acc;
            }, {} as Record<string, string>);
            setDocsContent(docs);
        });
    }, []);

    // Provide README context
    useCopilotReadable({
        description: "The main README.md file that provides an overview of SenseiSeek, tech stack, features, matching implementation, and setup instructions",
        value: readmeContent,
    });

    // Provide Architecture documentation
    useCopilotReadable({
        description: "Architecture documentation explaining the system design, components, data models, and technical architecture of SenseiSeek",
        value: docsContent['ARCHITECTURE.md'] || '',
    });

    // Provide Features documentation
    useCopilotReadable({
        description: "Features documentation detailing all platform features, user flows, and functionality available to startups and executives",
        value: docsContent['FEATURES.md'] || '',
    });

    // Provide Matching Implementation documentation
    useCopilotReadable({
        description: "Matching implementation documentation explaining the AI-powered matching algorithm, vector search, LLM reranking, caching strategy, and matching pipeline details",
        value: docsContent['MATCHING_IMPLEMENTATION.md'] || '',
    });

    // Provide API Specification
    useCopilotReadable({
        description: "API specification and endpoint documentation for all REST APIs, authentication, and integration details",
        value: docsContent['API_SPEC.md'] || '',
    });

    // Provide Help documentation
    useCopilotReadable({
        description: "Help and troubleshooting guide for common issues, setup problems, and operational questions",
        value: docsContent['HELP.md'] || '',
    });

    // Provide Migration guides
    useCopilotReadable({
        description: "Migration and upgrade guides including App Router migration details and breaking changes",
        value: `${docsContent['MIGRATION.md'] || ''}\n\n${docsContent['APP_ROUTER_MIGRATION.md'] || ''}`,
    });

    // Provide Swagger/Auth documentation
    useCopilotReadable({
        description: "Authentication and Swagger API documentation setup and usage",
        value: docsContent['SWAGGER_AUTH.md'] || '',
    });

    return <>{children}</>;
}
