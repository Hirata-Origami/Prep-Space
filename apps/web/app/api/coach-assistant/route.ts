import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel } from '@/lib/gemini';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();

  if (!dbUser?.gemini_api_key) {
    return NextResponse.json({ error: 'Configure your Gemini key in settings.' }, { status: 400 });
  }

  try {
    const { transcript, question } = await req.json();
    const model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');

    const prompt = `
You are an expert AI Co-Pilot sitting silently in a technical Peer Programming Mock meeting.
The user is speaking with a peer candidate. Here is the active conversation transcript captured via their microphone recently:
---
${transcript || '(Silence)'}
---
The user has triggered you for help or requested a hint. They ask:
${question}

Give an extremely concise, professional, and actionable response (1-3 sentences maximum). Provide the technical answer directly without fluff.
    `;

    const result = await model.generateContent([{ text: prompt }]);
    return NextResponse.json({ reply: result.response.text() });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }
}
