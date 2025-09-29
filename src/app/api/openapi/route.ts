// src/app/api/openapi/route.ts
import openapi from '../../../../public/openapi.json';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(openapi);
}
