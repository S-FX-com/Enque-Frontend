"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AreaChartIcon, LayoutDashboard, Settings, TicketIcon, Users } from "lucide-react";
import { Brand } from "./brand";

export function Sidebar() {
	const pathname = usePathname();

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
			href: "/users", // Keeping href as /users for now, might need adjustment later
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
			href: "/configuration", // Corrected href, route groups don't affect URL path
			icon: Settings,
		},
	];

	return (
		/* Remove border-r and shadow-sm */
		<div className="flex h-screen w-64 flex-col bg-white dark:bg-black py-6">
			<div className="flex items-center px-6">
				<Brand linkToHome={false} reloadOnClick={true} />
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
								// Add 'relative' for positioning the indicator
								// Remove background color, change text color logic, keep font-medium for active
								className={cn(
									"relative flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									// Ensure active text is white in dark mode
									isActive 
										? "font-medium text-primary dark:text-white" 
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								)}>
								<div className="relative h-5 w-5">
									{/* Ensure active icon is white in dark mode */}
									<IconComponent className={cn("h-5 w-5", isActive ? "text-primary dark:text-white" : "text-slate-500 dark:text-slate-400")} />
								</div>
								<span>{item.title}</span>
								{/* Adjust indicator: taller (h-6), thinner (w-1), keep at right edge (right-0) */}
								{isActive && (
									// Ensure indicator uses primary color (which might differ in dark mode)
									<div className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 transform rounded-full bg-primary"></div>
								)}
							</Link>
						);
					})}
				</nav>
				
				<div className="my-8 px-4">
					<h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Teams</h3>
					<div className="space-y-1">
						<div className="px-3 py-2 text-sm text-slate-500">No teams found</div>
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
								// Apply same style changes to bottom items
								className={cn(
									"relative flex items-center space-x-2 rounded-lg px-3 py-2 text-sm transition-colors",
									// Ensure active text is white in dark mode
									isActive 
										? "font-medium text-primary dark:text-white" 
										: "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
								)}>
								<div className="relative h-5 w-5">
									{/* Ensure active icon is white in dark mode */}
									<IconComponent className={cn("h-5 w-5", isActive ? "text-primary dark:text-white" : "text-slate-500 dark:text-slate-400")} />
								</div>
								<span>{item.title}</span>
								{/* Adjust indicator: taller (h-6), thinner (w-1), keep at right edge (right-0) */}
								{isActive && (
									// Ensure indicator uses primary color (which might differ in dark mode)
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
