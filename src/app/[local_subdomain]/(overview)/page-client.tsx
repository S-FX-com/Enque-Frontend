"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/hooks/use-app";
import { useEffect, useState } from "react";
import { ticketService } from "@/services/ticket";
import { ITicket } from "@/typescript/ticket";
import { toast } from "sonner";
import TicketsListSkeleton from "./tickets-list-skeleton";
import { ITeam } from "@/typescript/team";
import { teamService } from "@/services/team";
import TeamsListSkeleton from "./teams-list-skeleton";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ClientPage() {
	const { currentAgent, currentWorkspace } = useApp();
	const [tickets, setTickets] = useState<ITicket[]>([]);
	const [ticketsIsLoading, setTicketsIsLoading] = useState<boolean>(true);
	const [teams, setTeams] = useState<ITeam[]>([]);
	const [teamsIsLoading, setTeamsIsLoading] = useState<boolean>(true);

	useEffect(() => {
		const loadTickets = async () => {
			const response = await ticketService.getTickets({ workspace_id: currentWorkspace?.id });
			if (response.success) setTickets(response.data as ITicket[]);
			else
				toast.error("Error", {
					description: response.message || "Failed to load tickets",
				});

			setTicketsIsLoading(false);
		};

		const loadTeams = async () => {
			const response = await teamService.getTeams({ workspace_id: currentWorkspace?.id });
			if (response.success) setTeams(response.data as ITeam[]);
			else
				toast.error("Error", {
					description: response.message || "Failed to load teams",
				});

			setTeamsIsLoading(false);
		};

		loadTickets();
		loadTeams();
	}, []);

	const agentTicketsAssigned = (agent_id: number) => tickets.filter((ticket) => ticket.sent_to?.id === agent_id);
	const agentTicketsCompleted = (agent_id: number) => tickets.filter((ticket) => ticket.sent_to?.id === agent_id && ticket.status === "Closed");
	const ticketsAssignedByTeamId = (team_id: number) => tickets.filter((ticket) => ticket.team?.id === team_id && ticket.sent_to);
	const ticketsUnassignedByTeamId = (team_id: number) => tickets.filter((ticket) => ticket.team?.id === team_id && !ticket.sent_to);
	const agentTicketsAssignedByTeamId = (team_id: number, agent_id: number) =>
		tickets.filter((ticket) => ticket.team?.id === team_id && ticket.sent_to?.id === agent_id);

	const getprogressByTicketStatus = (ticket: ITicket) => {
		if (ticket.status === "Open" && !ticket.sent_to) return 25;
		else if (ticket.status === "Open" && ticket.sent_to) return 50;
		else if (ticket.status === "Closed") return 100;
		else return 0;
	};

	return (
		<div className="grid gap-4 grid-cols-3">
			<Card>
				<div className="flex flex-col items-center mb-8">
					<div className="relative mb-2">
						<Avatar className="h-20 w-20">
							{currentAgent?.avatar_url && <AvatarImage src={currentAgent?.avatar_url} alt={currentAgent?.name} />}
							<AvatarFallback>{currentAgent?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
						</Avatar>
						<div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
					</div>
					<h2 className="text-xl font-semibold">{currentAgent?.name}</h2>
					<p className="text-sm text-muted-foreground">FullStack Developer</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div>
						<p className="text-3xl font-bold">{agentTicketsAssigned(currentAgent?.id as number).length}</p>
						<p className="text-xs">Tickets Assigned</p>
					</div>
					<div>
						<p className="text-3xl font-bold">{agentTicketsCompleted(currentAgent?.id as number).length}</p>
						<p className="text-xs">Tickets Completed</p>
					</div>
					<div>
						<p className="text-3xl font-bold">{teams.length}</p>
						<p className="text-xs">Teams</p>
					</div>
				</div>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">My Tickets</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{ticketsIsLoading ? (
						<TicketsListSkeleton />
					) : agentTicketsAssigned(currentAgent?.id as number).length > 0 ? (
						<>
							<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
								<div className="col-span-2">Date</div>
								<div className="col-span-7">Subject</div>
								<div className="col-span-3">Progress</div>
							</div>
							{agentTicketsAssigned(currentAgent?.id as number).map((ticket, index) => (
								<div key={index} className="grid grid-cols-12 px-4 py-2 items-center">
									<div className="col-span-2 text-sm">{format(ticket.created_at, "MMM d")}</div>
									<div className="col-span-7 text-sm truncate">{ticket.title}</div>
									<div className="col-span-3">
										<Progress value={getprogressByTicketStatus(ticket)} />
									</div>
								</div>
							))}
						</>
					) : (
						<h3 className="text-lg font-medium mb-2">no tickets have been assigned yet</h3>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-lg">My Teams</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{teamsIsLoading ? (
						<TeamsListSkeleton />
					) : teams.length > 0 ? (
						<>
							{teams.map((team, index) => (
								<div key={index} className="p-4 text-center flex flex-col gap-3 shadow-lg rounded-xl">
									<h4 className="font-semibold text-lg">{team.name}</h4>
									<div className="grid grid-cols-3 gap-2 text-sm">
										<div className="flex items-center gap-1">
											<span className="font-semibold">{ticketsAssignedByTeamId(team.id).length}</span>
											<span className="text-muted-foreground">Tickets Assigned</span>
										</div>
										<div className="flex items-center gap-1">
											<span className="font-semibold">{ticketsUnassignedByTeamId(team.id).length}</span>
											<span className="text-muted-foreground">Tickets Unassigned </span>
										</div>
										<div className="flex items-center gap-1">
											<span className="font-semibold">{agentTicketsAssignedByTeamId(team.id, currentAgent?.id as number).length}</span>
											<span className="text-muted-foreground">Tickets With You</span>
										</div>
									</div>
								</div>
							))}
						</>
					) : (
						<h3 className="text-lg font-medium mb-2">you have not yet been assigned to a teams</h3>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
