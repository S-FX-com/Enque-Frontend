	"use client";

import React, { Suspense } from 'react';
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { AreaChartIcon, LayoutDashboard, Settings, TicketIcon, Users, UsersRound } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getAgentTeams } from "@/services/team";
import { Team } from "@/typescript/team";
import { Badge } from "@/components/ui/badge";
import { IUser } from "@/typescript/user"; 


interface MyTeamsListProps {
  agentTeams: Team[] | undefined;
  isLoadingUser: boolean;
  user: IUser | null; 
}

const MyTeamsList: React.FC<MyTeamsListProps> = ({ agentTeams, isLoadingUser, user }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  console.log("Sidebar MyTeamsList - agentTeams:", agentTeams); 

  if (isLoadingUser || !user || !agentTeams || agentTeams.length === 0) {
    return null; 
  }

  return (
    <nav className="space-y-1 px-4">
      {agentTeams.map((team) => {
        const teamHref = `/tickets?teamId=${team.id}&teamName=${encodeURIComponent(team.name)}`;
        const currentTeamIdParam = searchParams.get('teamId');
        const isActive = pathname === '/tickets' && currentTeamIdParam === team.id.toString();
        const IconComponent = UsersRound;

        return (
          <Link
            key={team.id}
            href={teamHref}
            className={cn(
              "relative flex items-center justify-between space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "font-medium text-primary dark:text-white"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <div className="flex items-center space-x-2">
              <div className="relative h-5 w-5">
                <IconComponent className={cn("h-5 w-5", isActive ? "text-primary dark:text-white" : "text-slate-500 dark:text-slate-400")} />
              </div>
              <span>{team.name}</span>
            </div>
            {typeof team.ticket_count === 'number' && ( 
              <Badge
                variant={team.ticket_count > 0 ? "secondary" : "outline"} 
                className={cn(
                  "h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs",
                  team.ticket_count === 0 && "text-muted-foreground" 
                )}
              >
                {team.ticket_count > 0 ? team.ticket_count : ""} 
              </Badge>
            )}
            {isActive && (
              <div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export function Sidebar() {
	const pathname = usePathname();
	const { user, isLoading: isLoadingUser } = useAuth();

	const { data: agentTeams } = useQuery<Team[], Error>({
		queryKey: ['agentTeams', user?.id],
		queryFn: () => {
			if (!user?.id) {
				return Promise.resolve([]); 
			}
			return getAgentTeams(user.id);
		},
		enabled: !!user?.id && !isLoadingUser,
		staleTime: 1000 * 60 * 5, 
	});

	const mainItems = [
		{
			title: "Dashboard",
			href: "/dashboard",
			icon: LayoutDashboard,
		},
		{
			title: "All Tickets",
			href: "/tickets",
			icon: TicketIcon,
		},
		{
			title: "My Tickets",
			href: "/my-tickets",
			icon: TicketIcon,
		},
		{
			title: "Users & Companies",
			href: "/users-companies", 
			icon: Users,
		},
		{
			title: "Reports",
			href: "/reports",
			icon: AreaChartIcon,
		},
	];

	const bottomItems = [
		{
			title: "Configuration",
			href: "/configuration", 
			icon: Settings,
		},
	];

	return (
		<div className="flex h-screen w-64 flex-col bg-white dark:bg-black py-6">
			<div className="flex items-center px-6 mb-6"> 
				<Link href="/dashboard"> 
					<Image
						src="/enque.png"
						alt="Enque Logo"
						width={100} 
						height={33} 
						priority
					/>
				</Link>
			</div>
			<div className="flex-1 overflow-y-auto"> 
				<nav className="space-y-1 px-4">
					{mainItems.map((item) => {
						const isActive = pathname === item.href;
						const IconComponent = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"relative flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									isActive 
										? "font-medium text-primary dark:text-white" 
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								)}>
								<div className="relative h-5 w-5">
									<IconComponent className={cn("h-5 w-5", isActive ? "text-primary dark:text-white" : "text-slate-500 dark:text-slate-400")} />
								</div>
								<span>{item.title}</span>
								{isActive && (
									<div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
								)}
							</Link>
						);
					})}
				</nav>
				<div className="mt-6">
					<h2
						className="mb-2 px-4 text-base font-semibold tracking-tight"
						style={{ color: '#2b3674' }}
					>
						My Teams
					</h2>
					<Suspense fallback={<div className="px-4 text-sm text-slate-500">Loading teams...</div>}>
						<MyTeamsList agentTeams={agentTeams} isLoadingUser={isLoadingUser} user={user} />
					</Suspense>
				</div>
			</div> 
			<div className="mt-auto flex flex-col px-4 py-4"> 
                <nav className="space-y-1 w-full"> 
					{bottomItems.map((item) => {
						const isActive = pathname === item.href;
						const IconComponent = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"relative flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									isActive 
										? "font-medium text-primary dark:text-white" 
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								)}>
								<div className="relative h-5 w-5">
									<IconComponent className={cn("h-5 w-5", isActive ? "text-primary dark:text-white" : "text-slate-500 dark:text-slate-400")} />
								</div>
								<span>{item.title}</span>
								{isActive && (
									<div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
								)}
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
