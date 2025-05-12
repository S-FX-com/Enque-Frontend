'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'; // Removed CardTitle
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/services/auth'; 

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) => authService.requestPasswordReset(data.email), // Call as method
    onSuccess: () => {
      setMessage('A password reset link has been sent. Please check your inbox.'); // Shortened message
      toast.info('Password reset instructions sent.'); 
      reset(); // Clear the form
    },
    onError: (error: Error) => {
      setMessage('An error occurred. Please try again. If the problem persists, contact support.');
      toast.error(error.message || 'An unexpected error occurred.');
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    setMessage(null); 
    mutation.mutate(data);
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F4F7FE]"> {/* Changed div to main and updated bg */}
      {/* Logo moved inside the Card */}
      <Card className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md"> {/* Matched signin Card style */}
        <div className="flex justify-center mb-6"> {/* Logo container from signin */}
          <Image src="/enque.png" alt="Enque Logo" width={120} height={40} priority />
        </div>
        <CardHeader className="p-0 mb-4"> {/* Adjusted padding and margin for header */}
          <CardDescription className="text-center"> {/* Removed pt-2 as title is gone and logo provides spacing */}
  No problem! Enter your email address below and we&apos;ll send you a link to reset your password.
</CardDescription>





        </CardHeader>
        <CardContent>
          {message && (
            <div className={`mb-4 p-3 rounded-md text-sm ${mutation.isError ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {message}
            </div>
          )}
          {!message && ( // Only show form if no message is being displayed (i.e., before submission or after error if we decide to hide form)
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email" className="mb-1 block">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? 'Sending...' : 'Send Reset Link'}
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
    </main> 
  );
}
