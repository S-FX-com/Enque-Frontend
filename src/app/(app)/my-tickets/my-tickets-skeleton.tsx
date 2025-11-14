import { Skeleton } from '@/components/ui/skeleton';

export function MyTicketsSkeleton() {
  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header with filters */}
        <div className="flex items-center justify-between py-2 px-4 border-b bg-card">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-full">
            {/* Table Header */}
            <div className="sticky top-0 bg-background z-10 border-b">
              <div className="flex items-center h-12 px-4">
                <Skeleton className="h-4 w-4 mr-4" />
                <Skeleton className="h-4 w-8 mr-8" />
                <Skeleton className="h-4 w-32 flex-1 mr-4" />
                <Skeleton className="h-4 w-24 mr-4" />
                <Skeleton className="h-4 w-20 mr-4" />
                <Skeleton className="h-4 w-20 mr-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Table Rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center h-14 px-4 border-b hover:bg-muted/50">
                <Skeleton className="h-4 w-4 mr-4" />
                <Skeleton className="h-4 w-8 mr-8" />
                <Skeleton className="h-4 w-full max-w-md mr-4" />
                <Skeleton className="h-6 w-20 mr-4 rounded-full" />
                <Skeleton className="h-6 w-16 mr-4 rounded-full" />
                <Skeleton className="h-6 w-16 mr-4 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-card">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </div>
  );
}
