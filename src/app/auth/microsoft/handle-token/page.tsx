"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { AppConfigs } from '@/configs';
import { toast } from "sonner";

function HandleTokenComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      logger.info("Received auth token from Microsoft callback.");
      try {
         setAuthToken(token);
         logger.info("Token stored successfully. Redirecting to relative dashboard path.");
         window.location.replace('/dashboard'); 
       } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "Unknown error storing token";
         logger.error("Error storing auth token:", errorMessage);
         toast.error("Failed to process login. Please try again.");
         router.replace(AppConfigs.routes.signin);
      }
    } else {
      logger.error("No token found in Microsoft callback URL.");
      toast.error("Login failed: Missing authentication token. Please try again.");
      router.replace(AppConfigs.routes.signin);
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
         <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        <p className="text-slate-600">Processing your login...</p>
      </div>
    </div>
  );
}

export default function HandleTokenPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HandleTokenComponent />
    </Suspense>
  );
}
