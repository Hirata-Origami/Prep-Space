import { HeroSection } from '@/components/landing/HeroSection';
import { DemoTeaser } from '@/components/landing/DemoTeaser';
import { FeatureBlocks } from '@/components/landing/FeatureBlocks';
import { Testimonials } from '@/components/landing/Testimonials';
import { SubscribeSection } from '@/components/landing/SubscribeSection';
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
      <DemoTeaser />
      <FeatureBlocks />
      <Testimonials />
      <SubscribeSection />
      <FooterSection />
    </main>
  );
}
