import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { key } = await req.json();

    if (!key || typeof key !== 'string' || key.trim().length < 10) {
      return NextResponse.json({ valid: false, error: 'Please enter a valid API key string' }, { status: 400 });
    }

    const trimmedKey = key.trim();
    const genAI = new GoogleGenerativeAI(trimmedKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    // Trivial ping to check authentication
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
    });

    const text = result.response.text();
    if (text) {
      return NextResponse.json({ valid: true, message: 'Gemini API key is valid and active!' });
    }

    return NextResponse.json({ valid: false, error: 'Unexpected response from Gemini API' }, { status: 400 });
  } catch (err: unknown) {
    console.error('API key validation error:', err);
    const msg = err instanceof Error ? err.message : 'Invalid key';
    return NextResponse.json({ valid: false, error: msg }, { status: 400 });
  }
}
