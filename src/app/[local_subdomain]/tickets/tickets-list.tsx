"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TicketDetail } from "./ticket-details";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ITicket } from "@/typescript/ticket";

interface TasksListProps {
	tickets: ITicket[];
}

export function TicketsList({ tickets = [] }: TasksListProps) {
	const [selectedTicket, setSelectedTicket] = useState<any>(null);

	// Format relative time (e.g., "2 hours ago")
	const formatRelativeTime = (dateString: string) => {
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
	};

	// Empty state
	if (tickets.length === 0) {
		return (
			<motion.div
				className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}>
				<div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
					<h3 className="mt-4 text-lg font-semibold text-[#2B3674]">No tickets found</h3>
					<p className="mb-4 mt-2 text-sm text-[#2B3674]">No tickets have been created yet or match your current filters.</p>
					<Link href="/tickets/new">
						<Button>Create ticket</Button>
					</Link>
				</div>
			</motion.div>
		);
	}

	// Render status icon based on ticket status
	const renderStatusIcon = (status: string) => {
		switch (status) {
			case "Completed":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />;
			case "In progress":
				return <Clock className="h-4 w-4 text-blue-500" />;
			case "Closed":
				return <CheckCircle2 className="h-4 w-4 text-gray-500" />;
			case "Deleted":
				return <Circle className="h-4 w-4 text-red-500" />;
			default:
				return <Circle className="h-4 w-4 text-gray-300" />;
		}
	};

	// Get badge variant based on priority
	const getPriorityVariant = (priority: string) => {
		switch (priority) {
			case "High":
				return "destructive";
			case "Medium":
				return "default";
			default:
				return "secondary";
		}
	};

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="p-4 border-b">
				<div className="flex items-center">
					<div className="w-[100px] text-sm text-[#2B3674] flex items-center gap-2">
						<Checkbox id="selectAll" />
						<label htmlFor="selectAll">ID</label>
					</div>
					<div className="flex-1 text-sm text-[#2B3674] pl-8">Subject</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Status</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Priority</div>
					<div className="w-[150px] text-sm text-[#2B3674]">Sent from</div>
					<div className="w-[150px] text-sm text-[#2B3674]">Assigned to</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Created</div>
				</div>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
				<style jsx global>{`
					.overflow-y-auto::-webkit-scrollbar {
						display: none;
						width: 0 !important;
					}
					.overflow-y-auto {
						-ms-overflow-style: none;
						scrollbar-width: none;
					}
				`}</style>

				<LayoutGroup>
					<AnimatePresence initial={false} mode="popLayout">
						{tickets.map((ticket) => (
							<motion.div
								key={ticket.id}
								className="flex items-center py-4 px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
								onClick={() => setSelectedTicket(ticket)}
								layout
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95 }}
								transition={{
									type: "spring",
									stiffness: 500,
									damping: 30,
									opacity: { duration: 0.2 },
								}}>
								<div className="w-[100px] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
									<Checkbox id={`ticket-${ticket.id}`} />
									<span className="text-blue-600">#{ticket.id}</span>
								</div>
								<div className="flex-1 pl-8">
									<span className="text-[#2B3674] hover:underline">{ticket.title}</span>
								</div>
								<div className="w-[120px]">
									<div className="flex items-center gap-2">
										{renderStatusIcon(ticket.status)}
										<span className="text-sm">{ticket.status}</span>
									</div>
								</div>
								<div className="w-[120px]">
									<Badge variant={getPriorityVariant(ticket.priority)} className="text-xs">
										{ticket.priority}
									</Badge>
								</div>
								<div className="w-[150px]">
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarFallback>
												{ticket.sent_from?.name ? ticket.sent_from.name.substring(0, 2).toUpperCase() : "UN"}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm">{ticket.sent_from?.name || "Unknown User"}</span>
									</div>
								</div>
								<div className="w-[150px]">
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarFallback>{ticket.sent_to?.name ? ticket.sent_to.name.substring(0, 2).toUpperCase() : "UN"}</AvatarFallback>
										</Avatar>
										<span className="text-sm">{ticket.sent_to?.name || "Unassigned"}</span>
									</div>
								</div>
								<div className="w-[120px] text-sm">{formatRelativeTime(ticket.created_at)}</div>
							</motion.div>
						))}
					</AnimatePresence>
				</LayoutGroup>
			</div>

			{selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
		</div>
	);
}
