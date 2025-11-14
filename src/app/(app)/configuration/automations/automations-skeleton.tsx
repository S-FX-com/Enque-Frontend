import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from 'lucide-react';

export function AutomationsSkeleton() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Settings
              </CardTitle>
              <CardDescription>
                Manage automated actions and notifications for your workspace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full mb-6" />
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border">
                <CardHeader>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Skeleton className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 ml-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
