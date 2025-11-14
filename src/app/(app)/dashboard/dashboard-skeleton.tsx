import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* User Card Skeleton */}
      <Card className="bg-white dark:bg-black rounded-lg p-6 flex flex-col items-center">
        <div className="relative mb-4">
          <Skeleton className="w-20 h-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-24 mb-6" />
        <div className="flex justify-between w-full gap-4">
          <div className="text-center flex-1">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
          <div className="text-center flex-1">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
          <div className="text-center flex-1">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        </div>
      </Card>

      {/* My Tickets Skeleton */}
      <Card className="bg-white dark:bg-black rounded-lg p-6 flex flex-col">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </Card>

      {/* My Teams Skeleton */}
      <Card className="bg-white dark:bg-black rounded-lg p-6 flex flex-col">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
              <Skeleton className="h-5 w-24 mb-2" />
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
