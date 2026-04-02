import { HeroSection } from '@/components/landing/HeroSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { DemoTeaser } from '@/components/landing/DemoTeaser';
import { FeatureBlocks } from '@/components/landing/FeatureBlocks';
import { CompetitorTable } from '@/components/landing/CompetitorTable';
import { Testimonials } from '@/components/landing/Testimonials';
import { FooterSection } from '@/components/landing/FooterSection';
import { Navbar } from '@/components/landing/Navbar';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main style={{ background: 'var(--bg-base)', overflowX: 'hidden' }}>
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <DemoTeaser />
      <FeatureBlocks />
      <CompetitorTable />
      <Testimonials />
      <FooterSection />
    </main>
  );
}
