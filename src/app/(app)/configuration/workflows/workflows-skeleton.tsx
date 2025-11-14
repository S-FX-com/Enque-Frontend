import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function WorkflowsSkeleton() {
  return (
    <>
      <div className="flex items-center justify-end py-4 flex-shrink-0">
        <Skeleton className="h-10 w-32" />
      </div>

      <Card className="shadow-none border-0 flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white dark:bg-black z-10">
                <TableRow className="border-b border-slate-200 dark:border-slate-700 hover:bg-transparent">
                  <TableHead className="w-[50px] px-4">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <Skeleton className="h-4 w-32" />
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </TableHead>
                  <TableHead className="px-6 py-4">
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead className="w-[50px] text-right px-6 py-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Skeleton className="h-6 w-16" />
                    </TableCell>
                    <TableCell className="text-right px-6 py-4"></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
