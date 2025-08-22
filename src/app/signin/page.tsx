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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [authMethods, setAuthMethods] = useState<{
    can_use_password: boolean;
    can_use_microsoft: boolean;
    requires_microsoft: boolean;
    workspace_id?: number;
  } | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);

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
    } else {
      if (isAuthenticated()) {
        toast.success('Welcome back! Redirecting to dashboard...');
        window.location.replace(AppConfigs.routes.dashboard);
        return;
      }
    }

    setupHistoryProtection();
  }, []);

  // Check authentication methods when email is provided
  const checkAuthMethods = async (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setAuthMethods(null);
      setEmailChecked(false);
      return;
    }

    try {
      logger.info(`Checking auth methods for: ${emailValue}`);
      const response = await authService.checkAuthMethods(emailValue);
      console.log(response);
      if (response.success && response.data) {
        setAuthMethods({
          can_use_password: response.data.can_use_password,
          can_use_microsoft: response.data.can_use_microsoft,
          requires_microsoft: response.data.requires_microsoft,
          workspace_id: response.data.workspace_id,
        });
        setEmailChecked(true);
        logger.info(`Auth methods for ${emailValue}:`, JSON.stringify(response.data));
      } else {
        // Default to password-only if check fails
        setAuthMethods({
          can_use_password: true,
          can_use_microsoft: false,
          requires_microsoft: false,
        });
        setEmailChecked(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error checking auth methods:', errorMessage);
      // Default to password-only on error
      setAuthMethods({
        can_use_password: true,
        can_use_microsoft: false,
        requires_microsoft: false,
      });
      setEmailChecked(true);
    }
  };

  // Handle email field blur/enter
  const handleEmailBlur = () => {
    checkAuthMethods(email);
  };

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAuthMethods(email);
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
      logger.error(`Login error for ${email}`, errorMessage);
      toast.error('Error connecting to the server. Please try again later.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!email) {
      toast.error('Please enter your email address first.');
      return;
    }

    setMicrosoftLoading(true);

    try {
      logger.info(`Microsoft login attempt for ${email}`);

      // Get the workspace ID (from authMethods if available, or default to 1)
      const workspaceId = authMethods?.workspace_id || 1;

      // Get the Microsoft auth URL
      const response = await authService.getMicrosoftAuthUrl(workspaceId);

      if (response.success && response.data?.auth_url) {
        logger.info('Redirecting to Microsoft login');
        window.location.href = response.data.auth_url;
      } else {
        throw new Error(response.message || 'Failed to get Microsoft auth URL');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      logger.error(`Microsoft login error for ${email}`, errorMessage);
      toast.error('Error connecting to Microsoft. Please try again later.');
      console.error(error);
    } finally {
      setMicrosoftLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F4F7FE]">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
          <Image src="/enque.png" alt="Enque Logo" width={120} height={40} priority />
        </div>

        <div className="w-full space-y-6">
          {/* Email input - always visible */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailChecked) {
                  setEmailChecked(false);
                  setAuthMethods(null);
                }
              }}
              onBlur={handleEmailBlur}
              onKeyDown={handleEmailKeyDown}
              placeholder="Enter your email address"
              required
            />
          </div>

          {/* Show authentication options after email is checked */}
          {emailChecked && authMethods && (
            <div className="space-y-4">
              {/* Password login section */}
              {authMethods.can_use_password && !authMethods.requires_microsoft && (
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
                        required={!authMethods.requires_microsoft}
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
              )}
              {authMethods.can_use_password &&
                authMethods.can_use_microsoft &&
                !authMethods.requires_microsoft && (
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
                )}
              {authMethods.can_use_microsoft && (
                <div className="space-y-4">
                  {authMethods.requires_microsoft && (
                    <div className="text-center">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-gray-500">
                            Login with Microsoft 365
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Connecting...
                      </span>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <path
                            d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"
                            fill="#00BCF2"
                          />
                        </svg>
                        Sign in with Microsoft 365
                      </>
                    )}
                  </Button>

                  {authMethods.requires_microsoft && (
                    <p className="text-xs text-center text-gray-600">
                      Your account requires Microsoft 365 authentication
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {emailChecked && authMethods?.can_use_password && (
            <div className="text-center pt-4">
              <p className="text-sm text-slate-500">
                {`Forgot password? `}
                <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                  Recover it
                </Link>
              </p>
            </div>
          )}
          {emailChecked && !authMethods && (
            <div className="text-center pt-4">
              <p className="text-sm text-slate-500">
                Enter your email address to see available sign-in options
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
