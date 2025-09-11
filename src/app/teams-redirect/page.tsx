'use client';

import { useEffect } from 'react';
import { app } from '@microsoft/teams-js';

// Get the base type of the page context from the SDK
type PageContextType = app.Context['page'];

interface CustomPageContext extends PageContextType {
  subEntityId?: string;
  subdomain?: string;
}

const TeamsRedirectPage = () => {
  useEffect(() => {
    const initializeTeams = async () => {
      try {
        await app.initialize();
        const context = await app.getContext();

        // Cast the page object to our custom type to access custom properties safely
        const pageContext = context.page as CustomPageContext;

        if (pageContext.subEntityId && pageContext.subdomain) {
          const ticketId = pageContext.subEntityId;
          const subdomain = pageContext.subdomain;
          
          const finalUrl = `https://${subdomain}.enque.cc/tickets/${ticketId}`;
          
          console.log(`Redirecting to: ${finalUrl}`);
          window.location.href = finalUrl;
        } else {
          // Fallback if no context is found, redirect to a generic page
          console.log('No subEntityId or subdomain in context, redirecting to main app.');
          window.location.href = 'https://app.enque.cc';
        }
      } catch (error) {
        console.error('Error initializing Teams app or getting context:', error);
        // Fallback redirect in case of an error
        window.location.href = 'https://app.enque.cc';
      }
    };

    initializeTeams();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Redirecting...</h1>
      <p>Please wait while we redirect you to the correct ticket.</p>
    </div>
  );
};

export default TeamsRedirectPage;
