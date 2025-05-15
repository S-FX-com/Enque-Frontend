'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RedirectToGlobalSignaturePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/configuration/signatures');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to new location...</p>
      </div>
    </div>
  );
} 