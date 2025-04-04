import { Skeleton } from "@/components/ui/skeleton";

export default function TicketsListSkeleton() {
	const loadingItems = Array.from({ length: 3 }, (_, i) => i);

	return (
		<div className="space-y-1">
			<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
				<div className="col-span-2">Date</div>
				<div className="col-span-7">Subject</div>
				<div className="col-span-3">Progress</div>
			</div>

			{loadingItems.map((item) => (
				<div key={item} className="grid grid-cols-12 px-4 py-2 items-center">
					<div className="col-span-2">
						<Skeleton className="h-4 w-20" />
					</div>
					<div className="col-span-7">
						<Skeleton className="h-4 w-full" />
					</div>
					<div className="col-span-3">
						<Skeleton className="h-4 w-full rounded-full" />
					</div>
				</div>
			))}
		</div>
	);
}
