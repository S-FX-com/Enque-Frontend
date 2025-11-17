import { Suspense } from 'react';
import { WorkflowsClientContent } from './workflows-client';
import { WorkflowsSkeleton } from './workflows-skeleton';
export default function WorkflowsPage() {
  return (
    <Suspense fallback={<WorkflowsSkeleton />}>
      <WorkflowsClientContent />
    </Suspense>
  );
}
