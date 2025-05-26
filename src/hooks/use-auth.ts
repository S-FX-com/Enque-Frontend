// frontend/src/hooks/use-auth.ts
import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { getAuthToken, removeAuthToken } from '@/lib/auth';
// Import Agent from the correct path
import type { Agent } from '@/typescript/agent';

// Define the structure of the decoded JWT payload, extending the correct Agent type
interface DecodedToken extends Omit<Agent, 'workspace_id'> {
  workspace_id: string | number; // JWT might send as string
  exp: number;
  iat: number;
  sub: string; // Subject should be the agent ID as a string
}

export function useAuth() {
  // State now holds Agent or null
  const [user, setUser] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromToken = useCallback(() => {
    setIsLoading(true);
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          console.log('Auth token expired, removing.');
          removeAuthToken();
          setUser(null);
        } else {
          // Convert workspace_id to number if it's a string
          let workspaceId: number;
          if (typeof decoded.workspace_id === 'number') {
            workspaceId = decoded.workspace_id;
          } else if (typeof decoded.workspace_id === 'string') {
            workspaceId = parseInt(decoded.workspace_id, 10);
            if (isNaN(workspaceId)) {
              console.error('Invalid workspace_id in token:', decoded.workspace_id);
              removeAuthToken();
              setUser(null);
              setIsLoading(false);
              return;
            }
          } else {
            console.error('workspace_id is missing or invalid in token:', decoded.workspace_id);
            removeAuthToken();
            setUser(null);
            setIsLoading(false);
            return;
          }

          // Map decoded payload to Agent structure
          const agentData: Agent = {
            id: parseInt(decoded.sub, 10),
            name: decoded.name,
            email: decoded.email,
            role: decoded.role,
            is_active: decoded.is_active !== undefined ? decoded.is_active : true,
            workspace_id: workspaceId, // Use converted workspace_id
            // Include new fields from token if available, else null/undefined
            job_title: decoded.job_title || null,
            phone_number: decoded.phone_number || null,
            email_signature: decoded.email_signature || null, // Add email_signature
            created_at: decoded.created_at || new Date().toISOString(),
            updated_at: decoded.updated_at || new Date().toISOString(),
          };
          setUser(agentData);
        }
      } catch (error) {
        console.error('Error decoding auth token:', error);
        removeAuthToken();
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  const reloadAuth = useCallback(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  // Function to manually update the user state in the hook
  const updateUserSessionData = useCallback((updatedUserData: Partial<Agent>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      // Merge existing user data with updated fields
      return { ...prevUser, ...updatedUserData };
    });
    // Note: This only updates the local state.
    // The JWT token itself is NOT updated here.
    // If the updated fields (like name) are needed in the token for future requests
    // within the same session *before* a page refresh/re-login,
    // the backend might need to issue a new token upon profile update.
    // However, reloadAuth() on next page load will get the fresh token if login persists.
  }, []);

  return {
    user, // Now typed as Agent | null
    isLoading,
    isAuthenticated: !!user && !isLoading,
    reloadAuth,
    updateUserSessionData, // Expose the new function
  };
}
