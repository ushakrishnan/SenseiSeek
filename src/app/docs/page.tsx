// src/app/docs/page.tsx
"use client";
import { useEffect } from 'react';
export const dynamic = 'force-dynamic';

export default function DocsPage() {
    useEffect(() => {
        if ((globalThis as any).Redoc) {
            (globalThis as any).Redoc.init('/openapi.json', {}, document.getElementById('redoc-container'));
            return;
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js';
        s.onload = () => {
            (globalThis as any).Redoc.init('/openapi.json', {}, document.getElementById('redoc-container'));
        };
        document.body.appendChild(s);
    }, []);

    return <div id="redoc-container" style={{ height: '100vh' }} />;
}

