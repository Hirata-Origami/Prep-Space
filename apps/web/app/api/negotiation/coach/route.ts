import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getModel, withRetry } from '@/lib/gemini';

export const dynamic = 'force-dynamic';

interface OfferPayload {
  id: string;
  company: string;
  role: string;
  level?: string;
  base_salary: number;
  equity: number;
  bonus: number;
  signing_bonus: number;
  currency: string;
  location?: string;
  notes?: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, gemini_api_key')
    .eq('supabase_uid', user.id)
    .single();
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  let model;
  try {
    model = getModel(dbUser.gemini_api_key, 'FLASH');
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No Gemini key' }, { status: 400 });
  }

  const { offer } = await request.json() as { offer: OfferPayload };
  if (!offer?.company || !offer?.role) return NextResponse.json({ error: 'Save the offer with a company and role first.' }, { status: 400 });

  const totalComp = (offer.base_salary || 0) + (offer.bonus || 0) + (offer.signing_bonus || 0);

  const prompt = `You are a world-class compensation negotiation coach helping a tech candidate counter an offer.

Offer Details:
- Company: ${offer.company}
- Role: ${offer.role}${offer.level ? ` (${offer.level})` : ''}
- Location: ${offer.location || 'Not specified'}
- Base Salary: ${offer.currency} ${offer.base_salary?.toLocaleString() || 0}
- Annual Bonus: ${offer.currency} ${offer.bonus?.toLocaleString() || 0}
- Equity (annualised): ${offer.currency} ${offer.equity?.toLocaleString() || 0}
- Signing Bonus: ${offer.currency} ${offer.signing_bonus?.toLocaleString() || 0}
- Total Cash Comp: ${offer.currency} ${totalComp.toLocaleString()}
- Candidate's Notes / Context: ${offer.notes || 'None provided'}

Write a professional, confident, warm counter-offer email/script. The candidate should:
1. Express genuine excitement for the role.
2. Mention competing offers or other leverage ONLY if the notes state them. Never quote market salary figures, percentiles or statistics: you do not have reliable data, so say the candidate has researched the market instead.
3. Ask for a specific counter: use a base figure the candidate can adjust, roughly 8-15% above the current base, and put the exact figure in square brackets like [$X] so they can change it.
4. Keep tone collaborative, not confrontational.
5. End with a clear ask and timeline.

Keep it to 3-4 short paragraphs. Use first-person. Do NOT include subject lines or headers — just the email body.`;

  try {
    const res = await withRetry(() => model.generateContent([{ text: prompt }]));
    const counter_script = res.response.text().trim();

    // Persist the script back to the offer row
    await supabase
      .from('negotiation_offers')
      .update({ counter_script })
      .eq('id', offer.id)
      .eq('user_id', dbUser.id);

    return NextResponse.json({ counter_script });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Coach generation failed' },
      { status: 500 }
    );
  }
}
