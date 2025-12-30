'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import { getDomainSuffix } from '@/lib/utils';

export default function TeamsRedirectPage() {
  const searchParams = useSearchParams();
  const [finalUrl, setFinalUrl] = useState('');

  useEffect(() => {
    const suffix = getDomainSuffix();

    let subEntityId = searchParams.get('subEntityId');
    const token = getAuthToken();

    // Fallback to reading from URL hash if not in search params
    if (!subEntityId && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      subEntityId = hashParams.get('subEntityId');
    }

    let constructedUrl = `https://sfx${suffix}/tickets`;

    if (subEntityId) {
      try {
        const parts = subEntityId.split('|');
        if (parts.length === 2) {
          const [ticketId, subdomain] = parts;
          constructedUrl = `https://${subdomain}${suffix}/tickets/${ticketId}`;
        }
      } catch (error) {
        console.error('Failed to parse subEntityId:', error);
      }
    }

    // Append the auth token if it exists
    if (token) {
      const url = new URL(constructedUrl);
      url.searchParams.set('auth_token', token);
      setFinalUrl(url.toString());
    } else {
      setFinalUrl(constructedUrl);
    }
  }, [searchParams]);

  // Automatically click the link on load to attempt redirect.
  // If blocked by sandbox, user can click manually.
  useEffect(() => {
    // Only attempt to click if the finalUrl has been processed
    if (finalUrl && searchParams.get('subEntityId')) {
      const link = document.getElementById('redirect-link');
      if (link) {
        link.click();
      }
    }
  }, [finalUrl, searchParams]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh', 
      fontFamily: 'sans-serif', 
      textAlign: 'center',
      backgroundColor: '#f5f5f5'
    }}>
      <a 
        id="redirect-link"
        href={finalUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#fff',
          backgroundColor: '#007bff',
          textDecoration: 'none',
          borderRadius: '5px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Open
      </a>
    </div>
  );
}
