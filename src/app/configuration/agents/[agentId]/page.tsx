'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getAgentById } from '@/services/agent';
import { Agent } from '@/typescript/agent';
import { AgentProfileForm } from '@/components/forms/agent-profile-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function AgentProfilePage() {
  const params = useParams();
  const agentId = params.agentId ? parseInt(params.agentId as string, 10) : null;

  const {
    data: agent,
    isLoading,
    isError,
    error,
  } = useQuery<Agent>({
    queryKey: ['agent', agentId],
    queryFn: () => getAgentById(agentId!),
    enabled: !!agentId && !isNaN(agentId),
    staleTime: 5 * 60 * 1000,
  });

  if (!agentId || isNaN(agentId)) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Invalid Agent ID provided.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Agent</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>Agent not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <AgentProfileForm agent={agent} />
    </div>
  );
}
