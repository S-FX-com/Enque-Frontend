"use client";

import Image from "next/image";
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

export default function ClientPage() {
	const { currentAgent } = useApp();
	const [tickets, setTickets] = useState<ITicket[]>([]);
	const [ticketsIsLoading, setTicketsIsLoading] = useState<boolean>(true);
	const [teams, setTeams] = useState<ITeam[]>([]);
	const [teamsIsLoading, setTeamsIsLoading] = useState<boolean>(true);

	useEffect(() => {
		const loadTickets = async () => {
			try {
				const response = await ticketService.getTickets({});
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
				setTicketsIsLoading(false);
			}
		};

		const loadTeams = async () => {
			try {
				const response = await teamService.getTeams({});
				if (response.success) {
					setTeams(response.data as ITeam[]);
				} else {
					toast.error("Error", {
						description: response.message || "Failed to load teams",
					});
				}
			} catch (error: unknown) {
				console.error("Failed to load teams:", error);
				toast.error("Error", {
					description: "Failed to load teams. Please try again.",
				});
			} finally {
				setTeamsIsLoading(false);
			}
		};

		loadTickets();
		loadTeams();
	}, []);

	return (
		<div className="grid gap-4 grid-cols-3">
			<Card>
				<div className="flex flex-col items-center mb-8">
					<div className="relative mb-2">
						<Image src="/placeholder.svg?height=80&width=80" alt="Profile picture" width={80} height={80} className="rounded-full" />
						<div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
					</div>
					<h2 className="text-xl font-semibold">{currentAgent?.name}</h2>
					<p className="text-sm text-muted-foreground">Chief Technologist</p>
				</div>

				<div className="grid grid-cols-3 gap-4 text-center">
					<div>
						<p className="text-3xl font-bold">0</p>
						<p className="text-xs">Tickets Assigned</p>
					</div>
					<div>
						<p className="text-3xl font-bold">0</p>
						<p className="text-xs">Tickets Completed</p>
					</div>
					<div>
						<p className="text-3xl font-bold">0</p>
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
					) : tickets.length > 0 ? (
						<>
							<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
								<div className="col-span-2">Date</div>
								<div className="col-span-7">Subject</div>
								<div className="col-span-3">Progress</div>
							</div>
							{tickets.map((ticket, index) => (
								<div key={index} className="grid grid-cols-12 px-4 py-2 items-center">
									<div className="col-span-2 text-sm">{ticket.date}</div>
									<div className="col-span-7 text-sm truncate">{ticket.subject}</div>
									<div className="col-span-3">
										<Progress value={ticket.progress} />
									</div>
								</div>
							))}
						</>
					) : (
						<>
							<h3 className="text-lg font-medium text-gray-700 mb-2">no tickets have been assigned yet</h3>
						</>
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
											<span className="font-semibold">{team.ticketsOpen}</span>
											<span className="text-muted-foreground">Tickets Open</span>
										</div>
										<div className="flex items-center gap-1">
											<span className="font-semibold">{team.ticketsWithYou}</span>
											<span className="text-muted-foreground">Tickets With You</span>
										</div>
										<div className="flex items-center gap-1">
											<span className="font-semibold">{team.ticketsAssigned}</span>
											<span className="text-muted-foreground">Tickets Assigned</span>
										</div>
									</div>
								</div>
							))}
						</>
					) : (
						<>
							<h3 className="text-lg font-medium text-gray-700 mb-2">you have not yet been assigned to a teams</h3>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
