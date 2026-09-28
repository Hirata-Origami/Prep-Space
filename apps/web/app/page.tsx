import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureBlocks } from '@/components/landing/FeatureBlocks';
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
    <>
      <Navbar />
      <main className="overflow-x-hidden bg-canvas">
        <HeroSection />
        <HowItWorks />
        <FeatureBlocks />
        <SubscribeSection />
      </main>
      <FooterSection />
    </>
  );
}
