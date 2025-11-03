'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth';
import { AppConfigs } from '@/configs';
import { logger } from '@/lib/logger';
import { removeAuthToken, isAuthenticated, setupHistoryProtection, setAuthToken } from '@/lib/auth';
import { toast } from 'sonner';

export default function SignInPage() {
  const [email, setEmail] = useState(''); // ✅ Campo vacío
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromError = searchParams.get('auth_error');
    const microsoftToken = searchParams.get('microsoft_token');
    const success = searchParams.get('success');

    if (microsoftToken && success === 'true') {
      // Handle Microsoft login callback
      try {
        removeAuthToken(); // Clear any existing token first
        setAuthToken(microsoftToken); // Use the proper auth function
        toast.success('Successfully signed in with Microsoft 365!');
        window.location.replace(AppConfigs.routes.dashboard);
        return;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error processing Microsoft token:', errorMessage);
        toast.error('Error processing Microsoft login. Please try again.');
      }
    }

    if (fromError) {
      toast.error('Your session has expired. Please sign in again.');
      removeAuthToken();
    }

    // Set up history protection to prevent back button after logout
    setupHistoryProtection();

    // Check if already authenticated
    if (isAuthenticated()) {
      window.location.replace(AppConfigs.routes.dashboard);
    }
  }, []);

  const handleMicrosoftSignIn = async () => {
    setMicrosoftLoading(true);
    try {
      // Llamar al endpoint correcto para obtener la URL de Microsoft
      //const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app'}/v1/auth/microsoft/auth/url`, {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/v1/auth/microsoft/auth/url`, {  
      method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Redirigir a la URL de Microsoft
        window.location.href = data.auth_url;
      } else {
        throw new Error('Failed to get Microsoft auth URL');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error initiating Microsoft sign-in:', errorMessage);
      toast.error('Error initiating Microsoft sign-in. Please try again.');
      setMicrosoftLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      logger.info(`Login attempt for ${email}`);

      const response = await authService.login({
        email,
        password,
      });

      if (response.success) {
        logger.info(`Login successful for ${email}`);
        window.location.replace(AppConfigs.routes.dashboard);
      } else {
        let displayMessage = 'Sign in failed. Please check your credentials and try again.';
        if (
          response.message &&
          response.message.toLowerCase().includes('incorrect email or password')
        ) {
          displayMessage = 'Incorrect email or password. Please try again.';
        } else if (
          response.message &&
          response.message.toLowerCase().includes('not authorized for workspace')
        ) {
          displayMessage = 'Access denied. You are not authorized for this workspace.';
        } else if (response.message) {
          displayMessage = 'Sign in failed. Please check your credentials.';
        }
        logger.error(`Login failed for ${email}: ${response.message || 'No specific message'}`);
        toast.error(displayMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      logger.error(`Login error for ${email}:`, errorMessage);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F4F7FE]">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
          <Image src="/enque.png" alt="Enque Logo" width={120} height={40} priority />
        </div>

        <div className="w-full space-y-6">
          {/* Email input */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder=""
              required
            />
          </div>

          {/* Password login section */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">
                    Login with Username & Password
                  </span>
                </div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In with Password'
                )}
              </Button>
            </form>
          </div>

          {/* "or" separator */}
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>
          </div>

          {/* Microsoft signin button */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 hover:bg-blue-50 border-blue-200"
              onClick={handleMicrosoftSignIn}
              disabled={microsoftLoading}
            >
              {microsoftLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                    <path d="M11 11H0V0H11V11Z" fill="#F25022"/>
                    <path d="M23 11H12V0H23V11Z" fill="#7FBA00"/>
                    <path d="M11 23H0V12H11V23Z" fill="#00A4EF"/>
                    <path d="M23 23H12V12H23V23Z" fill="#FFB900"/>
                  </svg>
                  Sign in with Microsoft 365
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm">
            <Link href="/forgot-password" className="text-[#1D73F4] hover:underline">
              Forgot password? Recover it
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
