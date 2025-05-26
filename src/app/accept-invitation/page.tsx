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

// Validaciones de contraseña robustas que coinciden con el backend
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password cannot be more than 128 characters')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/\d/, 'Must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]/, 'Must contain at least one special character')
      .refine((password) => {
        const commonPasswords = [
          'password', '123456', 'password123', 'admin', 'qwerty',
          'letmein', 'welcome', 'monkey', 'dragon', 'master',
          'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1'
        ];
        return !commonPasswords.includes(password.toLowerCase());
      }, 'Cannot be a common password'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

// Función para evaluar la fuerza de la contraseña
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]/.test(p) },
];

function PasswordStrengthIndicator({ password }: { 
  password: string;
}) {
  const passedRequirements = passwordRequirements.filter(req => req.test(password));
  const strengthPercentage = (passedRequirements.length / passwordRequirements.length) * 100;
  
  // Determinar el color y texto de la barra según la fuerza
  const getStrengthColor = () => {
    if (strengthPercentage < 40) return 'bg-red-500';
    if (strengthPercentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (strengthPercentage < 40) return 'Weak';
    if (strengthPercentage < 80) return 'Medium';
    return 'Strong';
  };

  if (password.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Password Strength</span>
        <span className={`font-medium ${
          strengthPercentage < 40 ? 'text-red-600' : 
          strengthPercentage < 80 ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {getStrengthText()}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-in-out ${getStrengthColor()}`}
          style={{ width: `${strengthPercentage}%` }}
        />
      </div>
    </div>
  );
}

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const password = watch('password', '');

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
      setError(error.message || 'Error activating account. The link may be invalid or have expired.');
      toast.error(error.message || 'Error activating account.');
    },
  });

  useEffect(() => {
    if (!token) {
      setError('The invitation token is missing or invalid.');
    }
  }, [token]);

  const onSubmit = (data: PasswordFormData) => {
    if (!token) {
      setError('The invitation token is missing.');
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
              {error || 'The invitation token is missing or invalid.'}
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
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Set Your Password</CardTitle>
          <CardDescription className="text-center">
            Welcome! Please set a secure password for your new Enque account.
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
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                placeholder="********"
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
              <PasswordStrengthIndicator password={password} />
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
              {isSubmitting || mutation.isPending
                ? 'Setting Password...'
                : 'Set Password and Activate'}
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
