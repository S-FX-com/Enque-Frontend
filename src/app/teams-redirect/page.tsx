'use client';

import { useEffect, useState } from 'react';
import { app } from '@microsoft/teams-js';

const TeamsRedirectPage = () => {
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const processRedirect = async () => {
      try {
        console.log('Starting Teams redirect process');
        setDebugInfo('Initializing Teams app...');

        await app.initialize();
        setDebugInfo('Teams app initialized');

        const context = await app.getContext();
        console.log('Teams context:', context);
        
        // Debug: Log the current URL and all its parts
        console.log('Current window.location.href:', window.location.href);
        console.log('Current window.location.search:', window.location.search);
        console.log('Current window.location.hash:', window.location.hash);

        let ticketId = '';
        let subdomain = '';

        // Method 1: Check URL parameters from Teams deep link
        const pageSearchParams = new URLSearchParams(window.location.search);
        console.log('All URL search params:', Object.fromEntries(pageSearchParams.entries()));
        
        const urlTicketId = pageSearchParams.get('ticketId');
        const urlSubdomain = pageSearchParams.get('subdomain');
        const contextParam = pageSearchParams.get('context');
        const subEntityIdParam = pageSearchParams.get('subEntityId');
        
        console.log('URL ticketId:', urlTicketId);
        console.log('URL subdomain:', urlSubdomain);
        console.log('URL context param:', contextParam);
        console.log('URL subEntityId param:', subEntityIdParam);
        
        if (urlTicketId && urlSubdomain) {
          ticketId = urlTicketId;
          subdomain = urlSubdomain;
          console.log('✅ Got from direct URL params - Ticket:', ticketId, 'Subdomain:', subdomain);
        } else if (subEntityIdParam) {
          // Parse the subEntityId parameter from manifest contentUrl
          console.log('Trying to parse subEntityId parameter:', subEntityIdParam);
          try {
            const decodedSubEntityId = decodeURIComponent(subEntityIdParam);
            console.log('Decoded subEntityId:', decodedSubEntityId);
            
            const contextData = JSON.parse(decodedSubEntityId);
            ticketId = contextData.ticketId;
            subdomain = contextData.subdomain;
            console.log('✅ Got from subEntityId param - Ticket:', ticketId, 'Subdomain:', subdomain);
          } catch (parseError) {
            console.log('❌ Error parsing subEntityId parameter:', parseError);
          }
        } else if (contextParam) {
          // Parse the context parameter that contains our encoded data
          console.log('Trying to parse context parameter:', contextParam);
          try {
            const contextData = new URLSearchParams(contextParam);
            const contextTicketId = contextData.get('ticketId');
            const contextSubdomain = contextData.get('subdomain');
            
            if (contextTicketId && contextSubdomain) {
              ticketId = contextTicketId;
              subdomain = contextSubdomain;
              console.log('✅ Got from context param - Ticket:', ticketId, 'Subdomain:', subdomain);
            }
          } catch (parseError) {
            console.log('❌ Error parsing context parameter:', parseError);
          }
        }

        // Method 2: Check Teams context page properties (Primary method for Teams deep links)
        if (!ticketId || !subdomain) {
          console.log('Trying Teams context page properties...');
          console.log('page.id:', context?.page?.id);
          console.log('page.subPageId:', context?.page?.subPageId);
          console.log('page.frameContext:', context?.page?.frameContext);
          
          // For Teams deep links, the subEntityId is passed as subPageId
          if (context?.page?.subPageId) {
            console.log('✅ Found subPageId, trying to parse:', context.page.subPageId);
            try {
              // Try to decode URL-encoded subPageId first
              const decodedSubPageId = decodeURIComponent(context.page.subPageId);
              console.log('Decoded subPageId:', decodedSubPageId);
              
              const contextData = JSON.parse(decodedSubPageId);
              ticketId = contextData.ticketId || contextData.subEntityId;
              subdomain = contextData.subdomain;
              console.log('✅ Parsed from Teams context - Ticket:', ticketId, 'Subdomain:', subdomain);
            } catch (parseError) {
              console.log('⚠️ Failed to parse as JSON, trying direct parse:', parseError);
              try {
                // Try direct JSON parse without URL decoding
                const contextData = JSON.parse(context.page.subPageId);
                ticketId = contextData.ticketId || contextData.subEntityId;
                subdomain = contextData.subdomain;
                console.log('✅ Parsed directly from Teams context - Ticket:', ticketId, 'Subdomain:', subdomain);
              } catch (secondParseError) {
                console.log('⚠️ subPageId is not JSON, treating as ticket ID:', secondParseError);
                // Maybe it's just the ticket ID
                ticketId = context.page.subPageId;
                subdomain = 'users'; // default fallback
                console.log('🔄 Using subPageId as ticket ID:', ticketId, 'with default subdomain:', subdomain);
              }
            }
          } else {
            console.log('❌ No subPageId found in Teams context');
          }
        }

        console.log('Final Ticket ID:', ticketId);
        console.log('Final Subdomain:', subdomain);

        if (ticketId && subdomain) {
          const webUrl = 'https://' + subdomain + '.enque.cc/tickets/' + ticketId;
          console.log('Opening URL:', webUrl);
          setDebugInfo('Redirecting to: ' + webUrl);
          
          await app.openLink(webUrl);
          return;
        } else {
          console.error('Missing ticket ID or subdomain');
          setDebugInfo('Error: Could not extract ticket ID or subdomain');
        }
        
        // Fallback
        const fallbackUrl = 'https://app.enque.cc/tickets?error=invalid_context';
        console.log('Fallback redirect to:', fallbackUrl);
        setDebugInfo('Fallback redirect to: ' + fallbackUrl);
        await app.openLink(fallbackUrl);

      } catch (error) {
        console.error('Teams SDK Error:', error);
        setDebugInfo('SDK Error: ' + error);
        
        const finalFallbackUrl = 'https://app.enque.cc?error=sdk_error';
        console.log('Final fallback redirect');
        
        try {
          await app.openLink(finalFallbackUrl);
        } catch (finalError) {
          console.error('Final fallback failed:', finalError);
          window.open(finalFallbackUrl, '_blank');
        }
      }
    };

    processRedirect();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Enque Teams Redirect</h2>
      <p>Please wait, redirecting you to the ticket...</p>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#f0f0f0', 
        borderRadius: '5px',
        fontSize: '12px',
        whiteSpace: 'pre-wrap'
      }}>
        <strong>Debug Info:</strong><br />
        {debugInfo}
        <br /><br />
        <strong>Current URL:</strong><br />
        {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
      </div>
    </div>
  );
};

export default TeamsRedirectPage;
