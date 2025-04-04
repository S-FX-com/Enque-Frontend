"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

export function TicketsListSkeleton() {
	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="p-4 border-b">
				<div className="flex items-center">
					<div className="w-[100px] text-sm text-[#2B3674] flex items-center gap-2">
						<Checkbox id="selectAll" disabled />
						<label htmlFor="selectAll">ID</label>
					</div>
					<div className="flex-1 text-sm text-[#2B3674] pl-8">Subject</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Status</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Priority</div>
					<div className="w-[150px] text-sm text-[#2B3674]">Sent from</div>
					<div className="w-[150px] text-sm text-[#2B3674]">Assigned to</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Created</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{Array.from({ length: 8 }).map((_, index) => (
					<div key={index} className="flex items-center py-4 px-4 border-b border-gray-100">
						<div className="w-[100px] flex items-center gap-2">
							<Checkbox id={`ticket-${index}`} disabled />
							<Skeleton className="h-4 w-8" />
						</div>
						<div className="flex-1 pl-8">
							<Skeleton className="h-4 w-3/4" />
						</div>
						<div className="w-[120px]">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-4 rounded-full" />
								<Skeleton className="h-4 w-16" />
							</div>
						</div>
						<div className="w-[120px]">
							<Skeleton className="h-5 w-16 rounded-full" />
						</div>
						<div className="w-[150px]">
							<div className="flex items-center gap-2">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-4 w-20" />
							</div>
						</div>
						<div className="w-[150px]">
							<div className="flex items-center gap-2">
								<Skeleton className="h-6 w-6 rounded-full" />
								<Skeleton className="h-4 w-20" />
							</div>
						</div>
						<div className="w-[120px]">
							<Skeleton className="h-4 w-16" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
