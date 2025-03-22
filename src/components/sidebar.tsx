"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useApp } from "@/hooks/use-app";
import { ChartArea, LayoutDashboard, Tickets, Users } from "lucide-react";

export function Sidebar() {
	const pathname = usePathname();
	const { currentUser } = useApp();

	const mainItems = [
		{
			title: "Dashboard",
			href: "/",
			icon: <LayoutDashboard />,
		},
		{
			title: "All Tickets",
			href: "/tickets",
			icon: <Tickets />,
		},
		{
			title: "My Tickets",
			href: "/my-tickets",
			icon: <Tickets />,
		},
		{
			title: "Users & Companies",
			href: "/users-companies",
			icon: <Users />,
		},
		{
			title: "Reporting",
			href: "/reports",
			icon: <ChartArea />,
		},
	];

	return (
		<div className="flex h-full w-64 flex-col border-r bg-white overflow-hidden">
			<div className="flex h-16 items-center border-b px-6">
				<Link href="/" className="flex items-center space-x-2">
					Obie
				</Link>
			</div>
			<div className="flex-1 overflow-y-auto py-6">
				<nav className="space-y-1 px-4">
					{mainItems.map((item) => {
						const isActive = pathname === item.href;
						const iconColor = isActive ? "#1D73F4" : "#2B3674";

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									isActive ? "bg-gray-100 font-medium text-[#1D73F4]" : "text-[#2B3674] hover:bg-gray-100"
								)}>
								<div className="relative h-5 w-5">{item.icon}</div>
								<span>{item.title}</span>
							</Link>
						);
					})}
				</nav>
				<div className="mt-8 px-6">
					<h3 className="font-bold text-[#2B3674]">MY TEAMS</h3>
					{/* Teams will be added here */}
				</div>
			</div>
		</div>
	);
}
