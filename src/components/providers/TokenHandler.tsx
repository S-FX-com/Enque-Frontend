'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { setAuthToken } from '@/lib/auth';

export function TokenHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const authToken = searchParams.get('auth_token');

    if (authToken) {
      // Save the token to local storage
      setAuthToken(authToken);

      // Clean the URL by removing the token parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('auth_token');
      window.history.replaceState({}, '', newUrl);
      
      // Optional: force a reload of the auth state if your auth hook doesn't listen to storage events
      // This might be needed if useAuth doesn't automatically update
      window.dispatchEvent(new Event('storage'));
    }
  }, [searchParams]);

  // This component does not render anything
  return null;
}
