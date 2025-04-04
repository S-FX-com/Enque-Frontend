"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, Ticket, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SidebarItemProps {
	href: string;
	icon: React.ReactNode;
	title: string;
	isActive?: boolean;
}

function SidebarItem({ href, icon, title, isActive }: SidebarItemProps) {
	return (
		<Link
			href={href}
			className={cn(
				"flex items-center gap-2 p-1 text-sm font-medium rounded-xl",
				isActive ? "bg-primary-foreground text-primary" : " text-muted-foreground hover:bg-primary-foreground"
			)}>
			<span>{icon}</span>
			{title}
		</Link>
	);
}

export function Sidebar() {
	const pathname = usePathname();

	return (
		<Card className="w-64 overflow-y-auto">
			<CardContent className="flex flex-col gap-1">
				<SidebarItem href="/reports" title="Dashboard" isActive={pathname === "/reports"} icon={<span></span>} />
				<SidebarItem href="/response-times" title="Response Times" isActive={pathname === "/response-times"} icon={<span></span>} />

				<div className="pt-3 pb-1">
					<h3 className="flex gap-2 items-center px-4 font-semibold">
						<Users size={18} />
						Agents
					</h3>
				</div>
				<SidebarItem href="/busiest-team" title="Busiest Team" isActive={pathname === "/busiest-team"} icon={<span></span>} />
				<SidebarItem href="/total-ticket-replies" title="Total Ticket Replies" isActive={pathname === "/total-ticket-replies"} icon={<span></span>} />

				<div className="pt-3 pb-1">
					<h3 className="flex gap-2 items-center px-4 font-semibold">
						<Ticket size={18} />
						Tickets
					</h3>
				</div>
				<SidebarItem href="/tickets-by-category" title="Tickets by Category" isActive={pathname === "/tickets-by-category"} icon={<span></span>} />
				<SidebarItem href="/tickets-by-priority" title="Tickets by Priority" isActive={pathname === "/tickets-by-priority"} icon={<span></span>} />
				<SidebarItem href="/tickets-by-status" title="Tickets by Status" isActive={pathname === "/tickets-by-status"} icon={<span></span>} />
				<SidebarItem href="/tickets-by-source" title="Tickets by Source" isActive={pathname === "/tickets-by-source"} icon={<span></span>} />

				<div className="pt-3 pb-1">
					<h3 className="flex gap-2 items-center px-4 font-semibold">
						<User size={18} />
						Users
					</h3>
				</div>
				<SidebarItem href="/tickets-per-company" title="Tickets per Company" isActive={pathname === "/tickets-per-company"} icon={<span></span>} />
				<SidebarItem href="/tickets-per-user" title="Tickets per User" isActive={pathname === "/tickets-per-user"} icon={<span></span>} />
				<SidebarItem href="/total-users" title="Total Users" isActive={pathname === "/total-users"} icon={<span></span>} />
			</CardContent>
		</Card>
	);
}
