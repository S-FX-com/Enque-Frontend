"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useApp } from "@/hooks/use-app";
import { useRouter } from "next/navigation";
import { BellIcon, HelpCircleIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "./mode-toggle";
import React, { JSX } from "react";

interface Breadcrumb {
	label: string;
	href: string;
}

interface Props {
	title: string;
	breadcrumbs?: Breadcrumb[];
	extra?: JSX.Element;
}

export function Topbar({ title = "Tickets", breadcrumbs = [], extra = undefined }: Props) {
	const router = useRouter();
	const { currentAgent } = useApp();

	return (
		<div className="flex items-center justify-between w-full py-6">
			<div className="flex flex-col gap-1">
				<div className="flex items-center text-muted-foreground">
					{breadcrumbs.map((item, index) => (
						<React.Fragment key={item.href}>
							{index > 0 && <span className="mx-2">/</span>}
							<Link href={item.href} className="hover:underline">
								{item.label}
							</Link>
						</React.Fragment>
					))}
				</div>
				<div className="flex items-center gap-2">
					<h1 className="text-3xl font-semibold">{title}</h1>
					{extra && extra}
				</div>
			</div>

			<div className="flex items-center gap-2 px-2 py-2 bg-white dark:bg-black rounded-full">
				<div className="relative">
					<SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input type="search" placeholder="Search" className="w-64 pl-8 h-9" />
				</div>

				<Button variant="ghost" size="icon" className="text-muted-foreground">
					<BellIcon className="h-5 w-5" />
				</Button>

				<ModeToggle />

				<Button variant="ghost" size="icon" className="text-muted-foreground">
					<HelpCircleIcon className="h-5 w-5" />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="relative h-8 w-8 rounded-full">
							<Avatar className="h-8 w-8">
								{currentAgent?.avatar ? (
									<AvatarImage src={currentAgent?.avatar} alt={currentAgent?.name} />
								) : (
									<AvatarFallback>{currentAgent?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
								)}
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-56" align="end" forceMount>
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col space-y-1">
								<p className="text-sm font-medium leading-none">{currentAgent?.name}</p>
								<p className="text-xs leading-none text-muted-foreground">{currentAgent?.email}</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => router.push("/profile")}>Profile</DropdownMenuItem>
							<DropdownMenuItem onClick={() => router.push("/settings")}>Settings</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem>Log out</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
