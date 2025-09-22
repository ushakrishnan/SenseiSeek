
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'HELP.md');
    const fileContents = await fs.readFile(filePath, 'utf8');
    return new Response(fileContents, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('API Error reading help file:', error);
    return new Response('Error reading help content.', { status: 500 });
  }
}
