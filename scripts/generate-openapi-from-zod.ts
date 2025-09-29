#!/usr/bin/env ts-node
/**
 * scripts/generate-openapi-from-zod.ts
 *
 * Loads exported Zod schemas from src/lib/schemas.ts and converts them to
 * JSON Schema (via zod-to-json-schema), then injects them into public/openapi.json
 * under components.schemas so the OpenAPI spec stays in sync with Zod.
 */
import fs from 'fs';
import path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Import the project's Zod schemas (require TS compilation via ts-node when running)
const schemasModule = require(path.join(process.cwd(), 'src', 'lib', 'schemas'));

const outPath = path.join(process.cwd(), 'public', 'openapi.json');

function loadExisting() {
    try {
        const raw = fs.readFileSync(outPath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return { openapi: '3.0.1', info: { title: 'SenseiSeek API', version: '1.1.0' }, paths: {} };
    }
}

async function main() {
    const api = loadExisting();
    api.components = api.components || {};
    api.components.schemas = api.components.schemas || {};

    const exports = Object.keys(schemasModule || {});
    for (const name of exports) {
        const val = schemasModule[name];
        // Heuristic: Zod objects have _def and safeParse function
        if (!val || typeof val !== 'object') continue;
        if (typeof val.safeParse !== 'function' && typeof val.parse !== 'function') continue;
        try {
            const jsonSchema = zodToJsonSchema(val, name);
            // zod-to-json-schema returns a draft-07-style JSON Schema object. Place it under components.schemas[name]
            api.components.schemas[name] = jsonSchema as any;
            console.log('Added schema:', name);
        } catch (e) {
            const msg = e && (e as any).message ? (e as any).message : String(e);
            console.warn('Failed to convert schema', name, msg);
        }
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(api, null, 2) + '\n');
    console.log('Wrote', outPath);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
