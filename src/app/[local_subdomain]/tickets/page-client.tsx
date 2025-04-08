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
import { useApp } from "@/hooks/use-app";
import { ITeam } from "@/typescript/team";
import { IUser } from "@/typescript/user";
import { IAgent } from "@/typescript/agent";
import { companyService } from "@/services/company";
import { ICompany } from "@/typescript/company";

export default function ClientPage() {
	const { currentWorkspace } = useApp();
	const [tickets, setTickets] = useState<ITicket[]>([]);
	const [filters, setFilters] = useState<any>({});
	const [initialAgents, setInitialAgents] = useState<IAgent[]>([]);
	const [initialTeams, setInitialTeams] = useState<ITeam[]>([]);
	const [initialCompanies, setInitialCompanies] = useState<ICompany[]>([]);
	const [initialUsers, setInitialUsers] = useState<IUser[]>([]);
	const [isTicketsLoading, setIsTicketsLoading] = useState<boolean>(true);
	const [isTeamsLoading, setIsTeamsLoading] = useState<boolean>(true);
	const [isAgentsLoading, setIsAgentsLoading] = useState<boolean>(true);
	const [isCompaniesLoading, setIsCompaniesLoading] = useState<boolean>(true);
	const [isUsersLoading, setIsUsersLoading] = useState<boolean>(true);

	useEffect(() => {
		const loadTickets = async () => {
			const response = await ticketService.getTickets({ workspace_id: currentWorkspace?.id as number });
			if (response.success) setTickets(response.data as ITicket[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setIsTicketsLoading(false);
		};

		const loadTeams = async () => {
			const response = await teamService.getTeams({ workspace_id: currentWorkspace?.id as number });
			if (response.success) setInitialTeams(response.data as ITeam[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setIsTeamsLoading(false);
		};

		const loadAgents = async () => {
			const response = await agentService.getAgents({ workspace_id: currentWorkspace?.id as number });
			if (response.success) setInitialAgents(response.data as IAgent[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setIsAgentsLoading(false);
		};

		const loadCompanies = async () => {
			const response = await companyService.getCompanies({ workspace_id: currentWorkspace?.id as number });
			if (response.success) setInitialCompanies(response.data as ICompany[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setIsCompaniesLoading(false);
		};

		const loadUsers = async () => {
			const response = await userService.getUsers({ workspace_id: currentWorkspace?.id as number });
			if (response.success) setInitialUsers(response.data as IUser[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setIsUsersLoading(false);
		};

		loadTickets();
		loadTeams();
		loadAgents();
		loadCompanies();
		loadUsers();
	}, []);

	useEffect(() => {
		const loadTickets = async () => {
			const response = await ticketService.getTickets({ ...filters, workspace_id: currentWorkspace?.id as number });
			if (response.success) setTickets(response.data as ITicket[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setIsTicketsLoading(false);
		};

		loadTickets();
	}, [filters]);

	const handleFiltersChange = (newFilters: any) => {
		console.log(newFilters);
		setFilters(newFilters);
	};

	return (
		<div className="flex-1 flex gap-6 overflow-hidden">
			<Card className="flex-1 rounded-xl overflow-hidden">
				{isTicketsLoading ? (
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

			<TicketsSidebar
				initialTeams={initialTeams}
				isTeamsLoading={isTeamsLoading}
				initialAgents={initialAgents}
				isAgentsLoading={isAgentsLoading}
				initialCompanies={initialCompanies}
				isCompaniesLoading={isCompaniesLoading}
				initialUsers={initialUsers}
				isUsersLoading={isUsersLoading}
				onFiltersChange={handleFiltersChange}
			/>
		</div>
	);
}
