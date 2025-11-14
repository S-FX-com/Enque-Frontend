import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function TeamsSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between py-4 px-4 md:px-0 flex-shrink-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] px-3 py-3.5">
                  <Skeleton className="h-5 w-5" />
                </TableHead>
                <TableHead className="w-[180px] max-w-[200px] px-3 py-3.5">
                  <Skeleton className="h-5 w-16" />
                </TableHead>
                <TableHead className="hidden md:table-cell w-[220px] max-w-[250px] px-3 py-3.5">
                  <Skeleton className="h-5 w-24" />
                </TableHead>
                <TableHead className="hidden sm:table-cell px-3 py-3.5">
                  <Skeleton className="h-5 w-16" />
                </TableHead>
                <TableHead className="text-right w-[80px] px-3 py-3.5">
                  <Skeleton className="h-5 w-20" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-3 py-2">
                    <Skeleton className="h-5 w-5" />
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center">
                      <Skeleton className="h-8 w-8 rounded-full mr-2" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-3 py-2">
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-3 py-2">
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell className="text-right px-3 py-2">
                    <Skeleton className="h-8 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
