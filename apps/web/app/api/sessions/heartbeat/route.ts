import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { session_id, transcript_length, transcript, duration_seconds } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof duration_seconds === 'number') {
      updatePayload.duration_seconds = duration_seconds;
    } else if (typeof transcript_length === 'number') {
      updatePayload.duration_seconds = transcript_length;
    }

    if (Array.isArray(transcript) && transcript.length > 0) {
      updatePayload.question_log = transcript;
    }

    await supabase
      .from('interview_sessions')
      .update(updatePayload)
      .eq('id', session_id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
