import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CategoriesSkeleton() {
  return (
    <>
      <div className="flex items-center justify-end py-4 flex-shrink-0">
        <Skeleton className="h-10 w-32" />
      </div>

      <Card className="shadow-none border-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] px-4">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead className="px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="px-4">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Skeleton className="h-4 w-48" />
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
