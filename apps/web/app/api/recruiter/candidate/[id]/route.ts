import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the candidate along with pipeline info (no auth required - this is a public invite link)
  const { data: candidate, error } = await supabase
    .from('pipeline_candidates')
    .select(`
      id, name, email, stage, composite_score, round_scores, invited_at, completed_at,
      pipeline_id,
      hiring_pipelines (
        id, role_name, rounds, pass_threshold, status
      )
    `)
    .eq('id', id)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  return NextResponse.json({ candidate });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { stage } = body;

  const { error } = await supabase
    .from('pipeline_candidates')
    .update({ stage })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
