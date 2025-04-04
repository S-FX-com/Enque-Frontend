import { Skeleton } from "@/components/ui/skeleton";

export default function TeamsListSkeleton() {
	const skeletonItems = Array.from({ length: 1 }, (_, i) => i);

	return (
		<>
			{skeletonItems.map((item) => (
				<div key={item} className="p-4 text-center flex flex-col gap-3 shadow-lg rounded-xl">
					<Skeleton className="h-6 w-32 mx-auto" />
					<div className="grid grid-cols-3 gap-2 text-sm">
						<div className="flex items-center gap-1">
							<Skeleton className="h-4 w-6" />
							<span className="text-muted-foreground">Tickets Open</span>
						</div>
						<div className="flex items-center gap-1">
							<Skeleton className="h-4 w-6" />
							<span className="text-muted-foreground">Tickets With You</span>
						</div>
						<div className="flex items-center gap-1">
							<Skeleton className="h-4 w-6" />
							<span className="text-muted-foreground">Tickets Assigned</span>
						</div>
					</div>
				</div>
			))}
		</>
	);
}
