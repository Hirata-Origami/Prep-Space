import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { session_id, transcript_length } = body;

    if (!session_id || typeof transcript_length !== 'number') {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // We don't save the full transcript here repeatedly to ease DB load,
    // we just mark the session with "progress_ticks" in the plan or simply 
    // leave a breadcrumb so the cleanup cron knows it wasn't an empty session.
    // If the transcript_length is substantial, we could even upsert a stub report.

    await supabase
      .from('interview_sessions')
      .update({
        duration_seconds: transcript_length // repurposing duration_seconds slightly to track activity drops
      })
      .eq('id', session_id)
      .eq('state', 'IN_PROGRESS'); // only update if still live

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
