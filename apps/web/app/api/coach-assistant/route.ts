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
    const { transcript, question, role, topic, autoAnalysis } = await req.json();
    const model = getModel(dbUser.gemini_api_key, 'FLASH_LITE');

    let prompt: string;

    if (autoAnalysis && role === 'interviewer') {
      // Auto-triggered after interviewer speaks: analyze the question, provide ideal answer & followups
      prompt = `You are an expert interview coach silently assisting an interviewer during a ${topic || 'technical'} interview.

Here is the recent conversation transcript:
---
${transcript || '(No transcript yet)'}
---

The interviewer just asked a question. Provide a structured response with these 3 sections:

**💡 Ideal Answer** (what a strong candidate should say — 2-3 sentences)
**🔍 Follow-up Questions** (2-3 probing questions to go deeper)
**⚡ Improve the Question** (one sentence on how to make the question sharper/clearer)

Be extremely concise. Use the topic context: ${topic || 'general technical interview'}.`;

    } else if (autoAnalysis && role === 'interviewee') {
      // Auto-triggered after interviewee speaks: compare their answer to expected
      prompt = `You are an expert interview coach silently assisting a candidate during a ${topic || 'technical'} interview.

Here is the recent conversation transcript:
---
${transcript || '(No transcript yet)'}
---

The candidate just answered a question. Provide a structured response with these 3 sections:

**✅ Expected Answer** (what a complete, strong answer looks like — 2-3 sentences)
**📊 What You Covered** (1-2 things the candidate did mention correctly)
**⚠️ Key Gaps** (1-2 important points they missed or should strengthen)

Be specific, actionable, and concise. Topic: ${topic || 'general technical interview'}.`;

    } else {
      // Manual question from user via chat input
      prompt = `You are an expert AI Co-Pilot in a peer ${topic || 'technical'} interview session.
Role: ${role === 'interviewer' ? 'You are helping the INTERVIEWER ask better questions and probe candidates.' : 'You are helping the INTERVIEWEE (candidate) give better answers.'}

Recent conversation transcript:
---
${transcript || '(No transcript yet)'}
---

User asked: ${question}

Give an extremely concise, professional, actionable response (max 3 sentences). Be direct.`;
    }

    const result = await model.generateContent([{ text: prompt }]);
    return NextResponse.json({ reply: result.response.text() });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Unknown error") }, { status: 500 });
  }
}
