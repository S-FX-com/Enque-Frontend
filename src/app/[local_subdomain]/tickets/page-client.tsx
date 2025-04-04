"use client";

import { useState, useEffect } from "react";
import { TicketsList } from "./tickets-list";
import { TicketsListSkeleton } from "./tickets-list-skeleton";
import { TicketsSidebar } from "./tickets-sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ticketService } from "@/services/ticket";
import { agentService } from "@/services/agent";
import { teamService } from "@/services/team";
import { userService } from "@/services/user";
import type { ITicket } from "@/typescript/ticket";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

export default function ClientPage() {
	const [tickets, setTickets] = useState<ITicket[]>([]);
	const [filters, setFilters] = useState<any>({});
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [initialAgents, setInitialAgents] = useState<any[]>([]);
	const [initialTeams, setInitialTeams] = useState<any[]>([]);
	const [initialUsers, setInitialUsers] = useState<any[]>([]);
	const [isInitialDataLoading, setIsInitialDataLoading] = useState<boolean>(true);

	// Load initial data for filters (agents, teams, users)
	useEffect(() => {
		const loadInitialData = async () => {
			setIsInitialDataLoading(true);
			try {
				// Load agents, teams, and users in parallel
				const [agentsResponse, teamsResponse, usersResponse] = await Promise.all([
					agentService.getAgents({}),
					teamService.getTeams({}),
					userService.getUsers({}),
				]);

				if (agentsResponse.success) {
					setInitialAgents(agentsResponse.data || []);
				}

				if (teamsResponse.success) {
					setInitialTeams(teamsResponse.data || []);
				}

				if (usersResponse.success) {
					setInitialUsers(usersResponse.data || []);
				}
			} catch (error) {
				console.error("Failed to load initial filter data:", error);
				toast("Error", {
					description: "Failed to load filter data. Please try refreshing the page.",
				});
			} finally {
				setIsInitialDataLoading(false);
			}
		};

		loadInitialData();
	}, [toast]);

	// Load tickets when filters change
	useEffect(() => {
		const loadTickets = async () => {
			setIsLoading(true);
			try {
				const response = await ticketService.getTickets(filters);
				if (response.success) {
					setTickets(response.data as ITicket[]);
				} else {
					toast.error("Error", {
						description: response.message || "Failed to load tickets",
					});
				}
			} catch (error: unknown) {
				console.error("Failed to load tickets:", error);
				toast.error("Error", {
					description: "Failed to load tickets. Please try again.",
				});
			} finally {
				setIsLoading(false);
			}
		};

		// Only load tickets if initial data is loaded or if there are no filters
		if (!isInitialDataLoading || Object.keys(filters).length === 0) {
			loadTickets();
		}
	}, [filters, isInitialDataLoading]);

	// Handle filter changes from the sidebar
	const handleFiltersChange = (newFilters: any) => {
		// Update the filters state with the new filters
		setFilters(newFilters);
	};

	return (
		<div className="flex-1 flex gap-6 overflow-hidden">
			<Card className="flex-1 rounded-xl overflow-hidden">
				{isLoading ? (
					<TicketsListSkeleton />
				) : tickets.length > 0 ? (
					<TicketsList tickets={tickets} />
				) : (
					<div className="flex flex-col items-center justify-center h-full p-8 text-center">
						<h3 className="text-lg font-medium mb-2">No tickets found</h3>
						<p className="text-muted-foreground mb-6">
							{Object.keys(filters).length > 0 ? "Try adjusting your filters to see more results." : "Create your first ticket to get started."}
						</p>
						{Object.keys(filters).length === 0 && (
							<Link href="/tickets/new">
								<Button className="gap-2">
									<Plus className="h-4 w-4" />
									Create Ticket
								</Button>
							</Link>
						)}
					</div>
				)}
			</Card>

			<TicketsSidebar initialAgents={initialAgents} initialTeams={initialTeams} initialUsers={initialUsers} onFiltersChange={handleFiltersChange} />
		</div>
	);
}
