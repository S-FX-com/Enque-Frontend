"use client";

import {
	Users,
	Clock,
	UserPlus,
	Bell,
	Users2,
	Settings,
	Inbox,
	Mail,
	FileText,
	FolderTree,
	Headphones,
	User,
	Paintbrush,
	Building2,
	Code,
	Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export default function ClientPage() {
	const sections = [
		{
			title: "Manage",
			items: [
				{ name: "Agents", icon: Users, href: "/configuration/agents" },
				{ name: "SLAs", icon: Clock, href: "/configuration/slas" },
				{ name: "Teams", icon: UserPlus, href: "/configuration/teams" },
				{ name: "Notifications", icon: Bell, href: "/configuration/notifications" },
				{ name: "Clients", icon: Users2, href: "/configuration/clients" },
				{ name: "Automations", icon: Settings },
			],
		},
		{
			title: "Tickets",
			items: [
				{ name: "Mailbox", icon: Inbox },
				{ name: "Automated Emails", icon: Mail },
				{ name: "Canned Replies", icon: FileText },
				{ name: "Categories", icon: FolderTree },
			],
		},
		{
			title: "Settings",
			items: [
				{ name: "Help Desk", icon: Headphones },
				{ name: "Account", icon: User },
				{ name: "Branding", icon: Paintbrush },
				{ name: "CRM/ME", icon: Building2 },
				{ name: "Api Docs", icon: Code },
			],
		},
		{
			title: "AI Tools",
			items: [{ name: "Assistant", icon: Bot, highlight: true, href: "/configuration/ai/assistant" }],
		},
	] as {
		title: string;
		items: Array<{
			name: string;
			icon: LucideIcon;
			highlight?: boolean;
			href?: string;
		}>;
	}[];

	return (
		<div className="space-y-5">
			{sections.map((section, sectionIndex) => (
				<div key={sectionIndex} className="bg-card px-8 py-6 rounded-xl">
					<h2 className="text-lg font-semibold mb-4">{section.title}</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
						{section.items.map((item, itemIndex) => {
							const content = (
								<div
									className={`flex gap-2 flex-col items-center justify-center p-6 rounded-xl h-full ${item.href ? 'cursor-pointer' : 'cursor-default'}
									${item.highlight ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}>
									<item.icon size={32} />
									<span className="text-sm font-semibold text-center">{item.name}</span>
								</div>
							);

							return item.href ? (
								<Link href={item.href} key={itemIndex} className="block">
									{content}
								</Link>
							) : (
								<div key={itemIndex}>{content}</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
