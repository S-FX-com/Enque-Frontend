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
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/services/auth'; // Import the whole service
import { setAuthToken } from '@/lib/auth';

const passwordResetSchema = z
  .object({
    new_password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string(),
  })
  .refine(data => data.new_password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: { new_password_str: string; token_str: string }) => {
      const response = await authService.resetPassword(data.token_str, data.new_password_str);
      if (response.success && response.data) {
        return response.data; // This is TokenResponse, matching onSuccess expectation
      }
      throw new Error(response.message || 'Failed to reset password.');
    },
    onSuccess: (data: { access_token: string; token_type: string }) => {
      setAuthToken(data.access_token);
      toast.success('Password reset successfully! You are now logged in.');
      setSuccessMessage('Password reset successfully! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard'; // Force full reload for auth state
      }, 2000);
    },
    onError: (error: Error) => {
      setError(error.message || 'Failed to reset password. The link may be invalid or expired.');
      toast.error(error.message || 'Failed to reset password.');
    },
  });

  useEffect(() => {
    if (!token) {
      setError('Password reset token is missing or invalid.');
      // router.push('/signin?error=invalid_reset_token'); // Optional redirect
    }
  }, [token, router]);

  const onSubmit = (data: PasswordResetFormData) => {
    if (!token) {
      setError('Password reset token is missing.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    mutation.mutate({ new_password_str: data.new_password, token_str: token });
  };

  if (!token && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 p-4">
        <div className="mb-8">
          <Image src="/enque.png" alt="Enque Logo" width={150} height={49} priority />
        </div>
        <Card className="w-full max-w-md p-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-red-500">
              The password reset link is missing or invalid.
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
        <Link href="/signin">
          <Image src="/enque.png" alt="Enque Logo" width={150} height={49} priority />
        </Link>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && (
            <div className="mb-4 p-3 rounded-md text-sm bg-green-100 text-green-700">
              {successMessage}
            </div>
          )}
          {error && !mutation.isError && (
            <p className="text-sm text-red-500 mb-4 text-center">{error}</p>
          )}
          {mutation.isError && (
            <p className="text-sm text-red-500 mb-4 text-center">
              {(mutation.error as Error)?.message || 'An unknown error occurred.'}
            </p>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="new_password" className="mb-1 block">
                  New Password
                </Label>
                <Input
                  id="new_password"
                  type="password"
                  {...register('new_password')}
                  placeholder="********"
                />
                {errors.new_password && (
                  <p className="text-xs text-red-500 mt-1">{errors.new_password.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="mb-1 block">
                  Confirm New Password
                </Label>
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
                {isSubmitting || mutation.isPending ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          )}
          <div className="mt-6 text-center">
            <Link href="/signin" className="text-sm text-primary hover:underline">
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}
