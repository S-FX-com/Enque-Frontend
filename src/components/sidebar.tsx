"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AreaChartIcon as ChartArea, LayoutDashboard, Loader2, Settings, TicketIcon as Tickets, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { teamService } from "@/services/team";
import type { ITeam } from "@/typescript/team";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ticketService } from "@/services/ticket";
import { ITicket } from "@/typescript/ticket";
import { toast } from "sonner";
import { Logo } from "./brand";

export function Sidebar() {
	const pathname = usePathname();
	const [teams, setTeams] = useState<ITeam[]>([]);
	const [teamsIsLoading, setTeamsIsLoading] = useState(true);
	const [tickets, setTickets] = useState<ITicket[]>([]);
	const [ticketsIsLoading, setTicketsIsLoading] = useState(true);

	const mainItems = [
		{
			title: "Overview",
			href: "/",
			icon: LayoutDashboard,
		},
		{
			title: "All Tickets",
			href: "/tickets",
			icon: Tickets,
		},
		{
			title: "My Tickets",
			href: "/my-tickets",
			icon: Tickets,
		},
		{
			title: "Users & Companies",
			href: "/users-companies",
			icon: Users,
		},
		{
			title: "Reporting",
			href: "/reports",
			icon: ChartArea,
		},
	];

	const bottomItems = [
		{
			title: "Configuration",
			href: "/configuration",
			icon: Settings,
		},
	];

	useEffect(() => {
		const loadTeams = async () => {
			const response = await teamService.getTeams({});
			if (response.success) setTeams(response.data as ITeam[]);
			else
				toast.error("Error", {
					description: response.message,
				});

			setTeamsIsLoading(false);
		};

		const loadTickets = async () => {
			teams.forEach(async (team) => {
				const response = await ticketService.getTickets({ team_id: team.id });
				if (response.success) setTickets({ ...tickets, ...(response.data as ITicket[]) });
				else
					toast.error("Error", {
						description: response.message,
					});
			});

			setTicketsIsLoading(false);
		};

		loadTeams();
		loadTickets();
	}, []);

	const openTicketsByTeamId = (team_id: number) => tickets.map((ticket) => ticket.team?.id === team_id && ticket.status !== "Closed");

	return (
		<div className="flex h-full w-[calc(var(--spacing)*72)] flex-col bg-white dark:bg-black py-6">
			<div className="flex items-center px-6">
				<Logo />
			</div>
			<div className="flex-1 overflow-y-auto py-6">
				<nav className="space-y-1 px-4">
					{mainItems.map((item) => {
						const isActive = pathname === item.href;
						const IconComponent = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									isActive ? "bg-primary-foreground font-medium text-primary" : "hover:bg-background"
								)}>
								<div className="relative h-5 w-5">
									<IconComponent className={cn("h-5 w-5", isActive && "text-primary")} />
								</div>
								<span>{item.title}</span>
							</Link>
						);
					})}
				</nav>
				<div className="my-8 px-4">
					<h3 className="mb-3 px-3 text-sm font-bold tracking-wider">My Teams</h3>
					<div className="space-y-1">
						{teamsIsLoading ? (
							<div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Loading teams...
							</div>
						) : teams.length > 0 ? (
							teams.map((team) => {
								const isActive = pathname === `/teams/${team.id}`;
								return (
									<Link
										key={team.id}
										href={`/teams/${team.id}`}
										className={cn(
											"flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
											isActive ? "bg-primary-foreground font-medium text-primary" : "hover:bg-background"
										)}>
										<div className="flex items-center space-x-2">
											<Avatar className="h-8 w-8">
												{team.logo_url && <AvatarImage src={team.logo_url} alt={team.name} />}
												<AvatarFallback>{team.name.substring(0, 2).toUpperCase()}</AvatarFallback>
											</Avatar>
											<span>{team.name}</span>
										</div>
										{openTicketsByTeamId(team.id).length > 0 && (
											<span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
												{openTicketsByTeamId(team.id).length}
											</span>
										)}
									</Link>
								);
							})
						) : (
							<div className="px-3 py-2 text-sm text-gray-500">No teams found</div>
						)}
					</div>
				</div>
				<nav className="space-y-1 px-4">
					{bottomItems.map((item) => {
						const isActive = pathname === item.href;
						const IconComponent = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									isActive ? "bg-primary-foreground font-medium text-primary" : "hover:bg-background"
								)}>
								<div className="relative h-5 w-5">
									<IconComponent className={cn("h-5 w-5", isActive && "text-primary")} />
								</div>
								<span>{item.title}</span>
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
