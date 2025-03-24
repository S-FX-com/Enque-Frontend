"use client";

import { useState, useEffect } from "react";
import { TasksList } from "./tasks-list";
import { TasksListSkeleton } from "./tasks-list-skeleton";
import { TasksSidebar } from "./tasks-sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ticketService } from "@/services/ticket";
import { ITicket } from "@/typescript/ticket";

export default function TasksClientPage() {
	const [tickets, setTickets] = useState<ITicket[]>([]);
	const [filters, setFilters] = useState<any>({});
	const [isLoading, setIsLoading] = useState<boolean>(false);

	useEffect(() => {
		setIsLoading(true);

		const loadTickets = async () => {
			try {
				const response = await ticketService.getTickets(filters);
				if (response.success) setTickets(response.data as ITicket[]);
			} catch (error: unknown) {
				console.error("Failed to load tickets:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadTickets();
	}, [filters]);

	const handleFiltersChange = () => {};

	return (
		<div className="flex flex-1 h-full overflow-hidden">
			<div className="flex-1 flex flex-col h-full overflow-hidden py-6">
				<div className="px-8 mb-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-tight text-[#2B3674]">All Tickets</h1>
					<Link href="/tickets/new">
						<Button className="gap-2">
							<Plus className="h-4 w-4" />
							New
						</Button>
					</Link>
				</div>

				<div className="flex-1 flex px-8 gap-6 overflow-hidden">
					<div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
						{isLoading ? <TasksListSkeleton /> : <TasksList tickets={tickets} />}
					</div>

					<TasksSidebar onFiltersChange={handleFiltersChange} />
				</div>
			</div>
		</div>
	);
}
