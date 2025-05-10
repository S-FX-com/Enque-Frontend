'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth';
import { AppConfigs } from '@/configs';
import { logger } from '@/lib/logger';
import { removeAuthToken, isAuthenticated, setupHistoryProtection } from '@/lib/auth';
import { toast } from 'sonner';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromError = new URLSearchParams(window.location.search).get('auth_error');

    if (fromError) {
      toast.error('Your session has expired. Please sign in again.');
      removeAuthToken();
    } else {
      if (isAuthenticated()) {
        logger.info('User already authenticated, redirecting to dashboard');
        window.location.replace(AppConfigs.routes.dashboard);
      }
    }

    setupHistoryProtection();
  }, []);

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

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F4F7FE]">
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md">
        <div className="flex justify-center mb-6">
          <Image src="/enque.png" alt="Enque Logo" width={120} height={40} priority />
        </div>

        <div className="w-full space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
                'Sign In'
              )}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              {`Don't have an account? `}
              <Link href="/register" className="text-blue-600 hover:underline font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
