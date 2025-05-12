'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { acceptAgentInvitation } from '@/services/agent'; // We'll create this
import { setAuthToken } from '@/lib/auth';
import Image from 'next/image';

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'], // path to error
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: { password_str: string; token_str: string }) =>
      acceptAgentInvitation(data.token_str, data.password_str),
    onSuccess: (data: { access_token: string; token_type: string }) => {
      setAuthToken(data.access_token);
      toast.success('Account activated successfully! You will be redirected.');
      // Force a full page reload to ensure auth state is correctly initialized everywhere
      window.location.href = '/dashboard';
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to activate account. The link may be invalid or expired.');
      toast.error(error.message || 'Failed to activate account.');
    },
  });

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing or invalid.');
    }
  }, [token]);

  const onSubmit = (data: PasswordFormData) => {
    if (!token) {
      setError('Invitation token is missing.');
      return;
    }
    setError(null);
    mutation.mutate({ password_str: data.password, token_str: token });
  };

  if (!token) {
    // Check for token before rendering form
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
        <div className="mb-8">
          <Image src="/enque.png" alt="Enque Logo" width={150} height={49} priority />
        </div>
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-red-500">
              {error || 'Invitation token is missing or invalid.'}
            </p>
            <Button onClick={() => router.push('/signin')} className="w-full mt-4">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
      <div className="mb-8">
        <Image src="/enque.png" alt="Enque Logo" width={150} height={49} priority />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          {/* <CardTitle className="text-2xl font-bold text-center">Set Your Password</CardTitle> REMOVED */}
          <CardDescription className="text-center pt-4">
            {' '}
            {/* Added pt-4 for spacing if title is removed */}
            Welcome! Please set a password for your new Enque account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Display general error from useEffect or initial state if mutation hasn't run */}
          {error && !mutation.isError && (
            <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
          )}
          {/* Display error from mutation if it occurred */}
          {mutation.isError && (
            <p className="text-sm text-red-500 mb-4 text-center">
              {(mutation.error as Error)?.message || 'An unknown error occurred.'}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="password" className="mb-1 block">
                New Password
              </Label>{' '}
              {/* Added mb-1 and block */}
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="********"
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="mb-1 block">
                Confirm New Password
              </Label>{' '}
              {/* Added mb-1 and block */}
              <Input
                id="confirmPassword"
                type="password"
                {...register('confirmPassword')}
                placeholder="********"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || mutation.isPending || !token}
            >
              {isSubmitting || mutation.isPending
                ? 'Setting Password...'
                : 'Set Password & Activate'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <React.Suspense
      fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}
    >
      <AcceptInvitationForm />
    </React.Suspense>
  );
}
