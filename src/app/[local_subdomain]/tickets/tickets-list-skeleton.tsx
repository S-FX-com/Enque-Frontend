"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

export function TicketsListSkeleton() {
	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="p-4 border-b">
				<div className="grid grid-cols-12 items-center">
					<div className="col-span-1 text-sm flex items-center gap-2">
						<Checkbox id="selectAll" disabled />
						<label htmlFor="selectAll">ID</label>
					</div>
					<div className="col-span-2 text-sm">Subject</div>
					<div className="col-span-1 text-sm">Status</div>
					<div className="col-span-1 text-sm">Priority</div>
					<div className="col-span-2 text-sm">User</div>
					<div className="col-span-2 text-sm">Sent from</div>
					<div className="col-span-2 text-sm">Assigned to</div>
					<div className="col-span-1 text-sm">Created</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
				<style jsx global>{`
					.overflow-y-auto::-webkit-scrollbar {
						display: none;
						width: 0 !important;
					}
					.overflow-y-auto {
						-ms-overflow-style: none;
						scrollbar-width: none;
					}
				`}</style>

				{Array.from({ length: 8 }).map((_, index) => (
					<div key={index} className="grid grid-cols-12 items-center py-4 px-4 border-b">
						<div className="col-span-1 flex items-center gap-2">
							<Checkbox id={`ticket-${index}`} disabled />
							<Skeleton className="h-4 w-8" />
						</div>
						<div className="col-span-2">
							<Skeleton className="h-4 w-[90%]" />
						</div>
						<div className="col-span-1">
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<div className="col-span-1">
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<div className="col-span-2">
							<div className="flex items-center gap-2 text-sm">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-4 w-20" />
							</div>
						</div>
						<div className="col-span-2">
							<div className="flex items-center gap-2 text-sm">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-4 w-20" />
							</div>
						</div>
						<div className="col-span-2">
							<div className="flex items-center gap-2 text-sm">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-4 w-20" />
							</div>
						</div>
						<div className="col-span-1">
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
