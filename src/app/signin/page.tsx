'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth';
import { microsoftAuthService } from '@/services/microsoftAuth';
import { AppConfigs } from '@/configs';
import { logger } from '@/lib/logger';
import { removeAuthToken, isAuthenticated, setupHistoryProtection } from '@/lib/auth';
import { toast } from 'sonner';
import { MicrosoftAuthData } from '@/services/microsoftAuth';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<string | undefined>('');
  const [microsoftAuth, setMicrosoftAuth] = useState<MicrosoftAuthData | undefined>({
    auth_method: '',
    microsoft_id: '',
    microsoft_email: '',
    microsoft_tenant_id: '',
    microsoft_profile_data: undefined,
    access_token: '',
    expires_in: 0,
    workspace_id: undefined,
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const fromError = searchParams.get('auth_error');

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

  const handleEnter = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      //if (process.env.NODE_ENV === 'development') {
      const ms365Regex = /^[a-zA-Z0-9._%+-]+@s-fx\.com$/;
      if (ms365Regex.test(email) === true) {
        //console.log(email);
        const responseM365 = await microsoftAuthService.checkM365Email(email);
        if (responseM365.success) {
          const responseAuthUrl = await microsoftAuthService.getAuthUrl(
            responseM365.data?.workspace_id
          );
          console.log(responseAuthUrl.data);
          setAuthMethod('both');
          setMicrosoftAuth(responseM365.data);
          //setMicrosoftAuth((['auth_method'] = 'both'));
        }
      } else {
        setAuthMethod('password');
      }
      //}
    }
  };

  const handleSubmitMS365 = async (e: React.FormEvent) => {
    console.log(e.target);
    try {
      const response = await microsoftAuthService.loginWithMicrosoft({
        microsoft_id: microsoftAuth!.microsoft_id,
        microsoft_email: microsoftAuth!.microsoft_email,
        microsoft_tenant_id: microsoftAuth!.microsoft_tenant_id,
        microsoft_profile_data: microsoftAuth!.microsoft_profile_data,
        access_token: microsoftAuth!.access_token,
        expires_in: microsoftAuth!.expires_in,
        workspace_id: microsoftAuth!.workspace_id,
      });
      //console.log(response);
      if (response.success) {
        logger.info(`Login successful for ${email}`);
        window.location.replace(AppConfigs.routes.dashboard);
      } else {
        let displayMessage = 'Sign in failed. Please check your credentials and try again.';
        if (
          response.message &&
          response.message.toLowerCase().includes('not authorized for workspace')
        ) {
          displayMessage = 'Access denied. You are not authorized for this workspace.';
        }
        logger.error(`Login failed for ${email}: ${response.message || 'No specific message'}`);
        toast.error(displayMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      logger.error(`Login error for ${email}`, errorMessage);
      toast.error('Error connecting to the server. Please try again later.');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
                onKeyDown={e => handleEnter(e)}
                required
              />
              <p hidden={authMethod === '' ? false : true}>
                type your e-mail and press &apos;Enter&apos; to verify your authentication method
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              {/*{(process.env.NODE_ENV === 'development' && (}*/}
              <Input
                id="password"
                type="password"
                // {disabled={authMethod === 'password' || authMethod === 'both' ? false : true}}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {/*)*/}
              {/*{process.env.NODE_ENV === 'development' && (}*/}
              <p hidden={authMethod === '' || authMethod !== 'both' ? true : false}>
                Type your password to log in
              </p>
              {/* )*/}
              {/*process.env.NODE_ENV === 'production' && (
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              )*/}
            </div>
            {/*{{process.env.NODE_ENV === 'development' && (}*/}
            <Button
              type="submit"
              className="w-full"
              // {/*disabled={authMethod === 'password' ? false : true}*/}
            >
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
                'Sign In With password'
              )}
            </Button>
          </form>
          {/*{{process.env.NODE_ENV === 'development' && (}*/}
          <form className="space-y-4" onSubmit={e => handleSubmitMS365(e)}>
            <Button
              className="w-full"
              type="submit"
              //disabled={authMethod !== 'both' ? true : false}
            >
              Login with MS365
            </Button>
            <p hidden={authMethod !== 'both' ? true : false}>
              Your account is linked to MS365, please click here to log in
            </p>
          </form>
          {/*{)}}*/}

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              {`Forgot password? `}
              <Link href="/forgot-password" className="text-blue-600 hover:underline font-medium">
                Recover it
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
