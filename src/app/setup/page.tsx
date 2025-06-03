'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { workspaceService } from '@/services/workspace';
import { IWorkspaceSetup } from '@/typescript/workspace';
import { toast } from 'sonner';

const setupSchema = z.object({
  subdomain: z
    .string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(50, 'Subdomain cannot be more than 50 characters')
    .regex(/^[a-zA-Z0-9\-]+$/, 'Only letters, numbers and hyphens are allowed')
    .toLowerCase(),
  admin_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot be more than 100 characters'),
  admin_email: z
    .string()
    .email('Please enter a valid email'),
  admin_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least: 1 lowercase, 1 uppercase, 1 number and 1 special character'),
  confirmPassword: z.string()
}).refine((data) => data.admin_password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SetupFormData = z.infer<typeof setupSchema>;

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
  });

  const subdomain = watch('subdomain');

  const onSubmit = async (data: SetupFormData) => {
    setIsLoading(true);
    
    try {
      const setupData: IWorkspaceSetup = {
        subdomain: data.subdomain,
        admin_name: data.admin_name,
        admin_email: data.admin_email,
        admin_password: data.admin_password,
      };

      const response = await workspaceService.setupWorkspace(setupData);

      if (response.success && response.data) {
        // Save token to localStorage
        localStorage.setItem('token', response.data.access_token);
        
        setSetupComplete(true);
        toast.success('Workspace created successfully!');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = `https://${data.subdomain}.enque.cc/dashboard`;
        }, 2000);
      } else {
        toast.error(response.message || 'Error creating workspace');
      }
    } catch (error) {
      console.error('Error during setup:', error);
      toast.error('Unexpected error during setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">
              Setup Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your workspace has been created successfully. You will be redirected to the dashboard.
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="animate-spin h-4 w-4 mr-2" />
              <span className="text-sm text-gray-500">Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
            Setup Workspace
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Create your workspace and administrator account to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              This is the initial setup for your workspace. Once created, you can access it at{' '}
              <span className="font-mono font-medium">
                {subdomain ? `${subdomain}.enque.cc` : 'your-subdomain.enque.cc'}
              </span>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Subdomain */}
            <div className="space-y-2">
              <Label htmlFor="subdomain">Workspace Subdomain</Label>
              <div className="flex">
                <Input
                  id="subdomain"
                  placeholder="my-company"
                  className="rounded-r-none"
                  {...register('subdomain')}
                />
                <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-l-0 rounded-r-md px-3 text-sm text-gray-500">
                  .enque.cc
                </div>
              </div>
              {errors.subdomain && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.subdomain.message}
                </p>
              )}
            </div>

            {/* Admin Name */}
            <div className="space-y-2">
              <Label htmlFor="admin_name">Administrator Name</Label>
              <Input
                id="admin_name"
                placeholder="John Doe"
                {...register('admin_name')}
              />
              {errors.admin_name && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.admin_name.message}
                </p>
              )}
            </div>

            {/* Admin Email */}
            <div className="space-y-2">
              <Label htmlFor="admin_email">Administrator Email</Label>
              <Input
                id="admin_email"
                type="email"
                placeholder="john@my-company.com"
                {...register('admin_email')}
              />
              {errors.admin_email && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.admin_email.message}
                </p>
              )}
            </div>

            {/* Admin Password */}
            <div className="space-y-2">
              <Label htmlFor="admin_password">Password</Label>
              <Input
                id="admin_password"
                type="password"
                placeholder="••••••••"
                {...register('admin_password')}
              />
              {errors.admin_password && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.admin_password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Workspace...
                </>
              ) : (
                'Create Workspace'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>
              By creating a workspace, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:underline dark:text-blue-400">
                terms of service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:underline dark:text-blue-400">
                privacy policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 