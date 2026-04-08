import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET single candidate
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

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

// PATCH: update stage
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

// DELETE: remove candidate from pipeline (recruiter only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the candidate belongs to a pipeline owned by this recruiter
  const { data: candidate } = await supabase
    .from('pipeline_candidates')
    .select('id, pipeline_id, hiring_pipelines(created_by)')
    .eq('id', id)
    .single();

  if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { error } = await supabase
    .from('pipeline_candidates')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
