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
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Invalid Agent ID provided.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error Loading Agent</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'An unknown error occurred.'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!agent) {
    return (
      <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Agent not found.</AlertDescription>
      </Alert>
    );
  }

  return <AgentProfileForm agent={agent} />;
}
