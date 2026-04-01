import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: companies, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('is_active', true)
    .order('difficulty_rating', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-seed if empty
  if (!companies || companies.length === 0) {
    const defaultCompanies = [
      {
        name: 'Zepto',
        industry: 'Hyper-local Delivery',
        size: 'hypergrowth',
        logo_emoji: '⚡',
        difficulty_rating: 8.5,
        community_pass_rate: 42,
        interview_culture: 'Extremely fast-paced. High focus on low-latency systems, concurrency, and shipping features under tight deadlines.',
        rounds: ['Machine Coding', 'DSA & Problem Solving', 'System Design (LLD/HLD)', 'Hiring Manager'],
        round_topics: {
          'Machine Coding': ['Concurrency', 'Redis', 'WebSockets', 'Rate Limiting'],
          'DSA & Problem Solving': ['Graphs', 'Dynamic Programming', 'Heaps'],
          'System Design (LLD/HLD)': ['Microservices', 'Database Sharding', 'Message Queues', 'Caching'],
          'Hiring Manager': ['Past Impact', 'Conflict Resolution', 'Ownership', 'Ambiguity']
        },
        known_patterns: ['Heavy focus on Redis and caching strategies', 'Expect live coding of a mini-project in 90 mins', 'HLD usually involves designing a delivery routing system'],
        is_active: true
      },
      {
        name: 'FinTech Startup',
        industry: 'FinTech',
        size: 'startup',
        logo_emoji: '💳',
        difficulty_rating: 8.0,
        community_pass_rate: 55,
        interview_culture: 'Balances speed with extreme reliability. Focuses on ACID compliance, distributed transactions, and security.',
        rounds: ['DSA', 'System Design (Payments)', 'Values & Culture'],
        round_topics: {
          'DSA': ['Arrays', 'Strings', 'Hash Maps'],
          'System Design (Payments)': ['Idempotency', 'Distributed Transactions', 'Event Sourcing'],
          'Values & Culture': ['Integrity', 'Resilience', 'Teamwork']
        },
        known_patterns: ['Always tests idempotency in System Design', 'Heavy focus on edge cases in DSA'],
        is_active: true
      }
    ];
    
    // Insert silently
    const { data: newCompanies } = await supabase.from('company_profiles').insert(defaultCompanies).select();
    return NextResponse.json({ companies: newCompanies || defaultCompanies });
  }

  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, logo_emoji, industry, size, interview_culture, rounds, round_topics, known_patterns, difficulty_rating } = body;

  if (!name || !rounds) {
    return NextResponse.json({ error: 'name and rounds are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('company_profiles')
    .insert({
      name,
      logo_emoji: logo_emoji || '🏢',
      industry: industry || 'Tech',
      size: size || 'large',
      interview_culture,
      rounds,
      round_topics: round_topics || {},
      known_patterns: known_patterns || [],
      difficulty_rating: difficulty_rating || 7.5,
      community_pass_rate: 60,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ company: data }, { status: 201 });
}
