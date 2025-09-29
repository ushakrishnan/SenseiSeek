#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'src', 'app', 'api');

function walk(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(full));
        } else if (entry.isFile() && entry.name === 'route.ts') {
            files.push(full);
        }
    }
    return files;
}

function fileSafe(content) {
    // If file already awaits context or ctx (common safe patterns), consider it safe
    const safePatterns = [
        /const\s+\{\s*params\s*\}\s*=\s*await\s+context/, // const { params } = await context
        /const\s+c\s*=\s*await\s+ctx/, // const c = await ctx
        /const\s+params\s*=\s*ctx\?\./, // const params = ctx?.params
        /await\s+context/, // any await context
        /await\s+ctx/, // await ctx
        /await\s+context\.params/, // await context.params
        /const\s+\{\s*\w+\s*\}\s*=\s*await\s+context\.params/, // const {id} = await context.params
    ];
    for (const r of safePatterns) if (r.test(content)) return true;
    return false;
}

function hasParamsUsage(content) {
    return /\bparams\s*\./.test(content) || /\bcontext\.params\b/.test(content);
}

function insertAfterTry(content) {
    // Find first "try {" occurrence
    const tryIndex = content.indexOf('try {');
    if (tryIndex === -1) return null;
    // Find line start
    const before = content.slice(0, tryIndex);
    const after = content.slice(tryIndex);
    // Determine indentation of the try block line
    const lines = before.split(/\r?\n/);
    const lastLine = lines[lines.length - 1] || '';
    const indentMatch = lastLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    const insert = '\n' + indent + '    const { params } = await context;\n';
    // Insert after the "try {" token
    // Need to insert after the 'try {' substring end
    const insertionPoint = tryIndex + 'try {'.length;
    const newContent = content.slice(0, insertionPoint) + insert + content.slice(insertionPoint);
    return newContent;
}

function processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!hasParamsUsage(content)) return { modified: false };
    if (fileSafe(content)) return { modified: false };

    // Avoid duplicating if const { params } = await context already exists
    if (/const\s+\{\s*params\s*\}\s*=\s*await\s+context/.test(content)) return { modified: false };

    const newContent = insertAfterTry(content);
    if (!newContent) return { modified: false };

    fs.writeFileSync(filePath, newContent, 'utf8');
    return { modified: true };
}

function main() {
    const files = walk(apiDir);
    const modified = [];
    for (const f of files) {
        try {
            const res = processFile(f);
            if (res.modified) modified.push(f);
        } catch (err) {
            console.error('Error processing', f, err);
        }
    }
    if (modified.length === 0) {
        console.log('No files modified.');
    } else {
        console.log('Modified files:');
        for (const m of modified) console.log(' -', path.relative(root, m));
    }
}

main();
