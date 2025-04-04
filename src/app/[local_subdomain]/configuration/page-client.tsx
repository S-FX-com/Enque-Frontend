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

export default function ClientPage() {
	const sections = [
		{
			title: "Manage",
			items: [
				{ name: "Agents", icon: Users },
				{ name: "SLAs", icon: Clock },
				{ name: "Teams", icon: UserPlus },
				{ name: "Notifications", icon: Bell },
				{ name: "Clients", icon: Users2 },
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
			items: [{ name: "Assistant", icon: Bot, highlight: true }],
		},
	];

	return (
		<div className="space-y-5">
			{sections.map((section, sectionIndex) => (
				<div key={sectionIndex} className="bg-white dark:bg-black px-8 py-6 rounded-xl">
					<h2 className="text-lg font-semibold mb-4">{section.title}</h2>
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
						{section.items.map((item, itemIndex) => (
							<div
								key={itemIndex}
								className={`flex gap-2 flex-col items-center justify-center p-6 rounded-xl cursor-pointer
					  ${item.highlight ? "bg-primary text-white dark:text-black" : "bg-background"}`}>
								<item.icon size={32} />
								<span className="text-sm font-semibold">{item.name}</span>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
