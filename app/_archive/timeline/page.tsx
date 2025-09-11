'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TimelinePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/timeline-v2');
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-96">
      <p>Redirecting to Timeline V2...</p>
    </main>
  );
}