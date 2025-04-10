"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { TicketDetail } from "./ticket-details";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { ITicket } from "@/typescript/ticket";
import { formatRelativeTime, getPriorityVariant, getStatusVariant } from "@/lib/utils";

interface TasksListProps {
	tickets: ITicket[];
}

export function TicketsList({ tickets = [] }: TasksListProps) {
	const [selectedTicket, setSelectedTicket] = useState<any>(null);

	if (tickets.length === 0) {
		return (
			<motion.div
				className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.3 }}>
				<div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
					<h3 className="mt-4 text-lg font-semibold">No tickets found</h3>
					<p className="mb-4 mt-2 text-sm">No tickets have been created yet or match your current filters.</p>
					<Link href="/tickets/new">
						<Button>Create ticket</Button>
					</Link>
				</div>
			</motion.div>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="p-4 border-b">
				<div className="grid grid-cols-12 items-center">
					<div className="col-span-1 text-sm flex items-center gap-2">
						<Checkbox id="selectAll" />
						<label htmlFor="selectAll">ID</label>
					</div>
					<div className="col-span-2 text-sm">Subject</div>
					<div className="col-span-1 text-sm">Status</div>
					<div className="col-span-1 text-sm">Priority</div>
					<div className="col-span-2 text-sm">User</div>
					<div className="col-span-2 text-sm">Sent from</div>
					<div className="col-span-2 text-sm">Assigned to</div>
					<div className="col-span-1 text-sm">Created</div>
				</div>
			</div>

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
								className="grid grid-cols-12 items-center py-4 px-4 border-b hover:bg-background cursor-pointer"
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
								<div className="col-span-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
									<Checkbox id={`ticket-${ticket.id}`} />
									<span>#{ticket.id}</span>
								</div>
								<div className="col-span-2">
									<span>{ticket.title}</span>
								</div>
								<div className="col-span-1">
									<Badge variant={getStatusVariant(ticket.status)} className="text-xs">
										{ticket.status}
									</Badge>
								</div>
								<div className="col-span-1">
									<Badge variant={getPriorityVariant(ticket.priority)} className="text-xs">
										{ticket.priority}
									</Badge>
								</div>
								<div className="col-span-2">
									<div className="flex items-center gap-2 text-sm">
										<Avatar className="h-6 w-6">
											<AvatarFallback>{ticket.user?.name ? ticket.user.name.substring(0, 2).toUpperCase() : "UN"}</AvatarFallback>
										</Avatar>
										<span>{ticket.user?.name || "Unknown User"}</span>
									</div>
								</div>
								<div className="col-span-2">
									<div className="flex items-center gap-2 text-sm">
										<Avatar className="h-6 w-6">
											<AvatarFallback>
												{ticket.sent_from?.name ? ticket.sent_from.name.substring(0, 2).toUpperCase() : "UN"}
											</AvatarFallback>
										</Avatar>
										<span>{ticket.sent_from?.name || "Unknown User"}</span>
									</div>
								</div>
								<div className="col-span-2">
									<div className="flex items-center gap-2 text-sm">
										<Avatar className="h-6 w-6">
											<AvatarFallback>{ticket.sent_to?.name ? ticket.sent_to.name.substring(0, 2).toUpperCase() : "UN"}</AvatarFallback>
										</Avatar>
										<span>{ticket.sent_to?.name || "Unassigned"}</span>
									</div>
								</div>
								<div className="col-span-1 text-sm">{formatRelativeTime(ticket.created_at)}</div>
							</motion.div>
						))}
					</AnimatePresence>
				</LayoutGroup>
			</div>

			{selectedTicket && <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
		</div>
	);
}
