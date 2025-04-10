import { AppConfigs } from "@/configs";
import { TicketPriority, TicketStatus } from "@/typescript/ticket";
import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function formatRelativeTime(dateString: string) {
	try {
		if (!dateString || dateString === "null" || dateString === "undefined") {
			return "Unknown date";
		}

		const date = new Date(dateString);
		if (isNaN(date.getTime())) {
			return dateString;
		}

		return formatDistanceToNow(date, { addSuffix: true });
	} catch (error) {
		console.error("Error formatting date:", error);
		return dateString;
	}
}

export const getPriorityVariant = (priority: TicketPriority) => {
	switch (priority) {
		case "High":
			return "destructive";
		case "Medium":
			return "default";
		case "Low":
			return "secondary";
		default:
			return "secondary";
	}
};

export const getStatusVariant = (status: TicketStatus) => {
	switch (status) {
		case "Unread":
			return "default";
		case "Open":
			return "secondary";
		case "Closed":
			return "outline";
		default:
			return "outline";
	}
};

export function getLocalSubdomainByHost(host: string) {
	return host?.replace(`.${AppConfigs.host}`, "");
}
