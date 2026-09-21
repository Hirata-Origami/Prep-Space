'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/interview${q ? `?${q}` : ''}`);
  }, [router, searchParams]);

  return (
    <div className="page-container" style={{ color: 'var(--text-muted)' }}>
      Redirecting to AI Interview Studio...
    </div>
  );
}

export default function InterviewNewPage() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}
