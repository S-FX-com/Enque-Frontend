"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TicketDetail } from "./ticket-detail";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

interface TasksListProps {
	tickets: any[]; // Para permitir pasar tickets directamente
	isFiltering?: boolean;
}

export function TasksList({ tickets = [], isFiltering = false }: TasksListProps) {
	const [selectedTicket, setSelectedTicket] = useState<any>(null);
	const pathname = usePathname();
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const prevTicketsLength = useRef(tickets.length);

	// Determinar si estamos en la página "My Tickets"
	const isMyTicketsPage = pathname === "/my-tickets";

	// Escuchar eventos de actualización de tickets
	useEffect(() => {
		const handleTicketUpdated = (event: CustomEvent) => {
			// Actualizar el estado del ticket en la lista si está presente
			const { id, status } = event.detail;
			// No hacemos nada aquí porque los tickets se actualizan desde el componente padre
		};

		window.addEventListener("ticket-updated", handleTicketUpdated as EventListener);

		return () => {
			window.removeEventListener("ticket-updated", handleTicketUpdated as EventListener);
		};
	}, []);

	// Preservar la posición de scroll cuando cambian los tickets
	useEffect(() => {
		if (scrollContainerRef.current && prevTicketsLength.current !== tickets.length) {
			// Solo guardamos la posición si estamos reduciendo la cantidad de tickets (filtrando)
			if (tickets.length < prevTicketsLength.current) {
				// No hacemos nada, dejamos que el scroll se mantenga en su posición
			} else {
				// Si estamos añadiendo tickets, podemos resetear el scroll
				scrollContainerRef.current.scrollTop = 0;
			}
		}
		prevTicketsLength.current = tickets.length;
	}, [tickets]);

	const handleTicketClick = (ticket: any) => {
		setSelectedTicket(ticket);
	};

	const handleCloseDetail = () => {
		setSelectedTicket(null);
	};

	// Función para formatear la fecha como tiempo relativo (ej: "2 hours ago")
	const formatRelativeTime = (dateString: string) => {
		try {
			// Si la fecha es inválida o indefinida, devolver un texto por defecto
			if (!dateString || dateString === "null" || dateString === "undefined") {
				return "Unknown date";
			}

			// Intentar parsear la fecha
			const date = new Date(dateString);

			// Verificar si la fecha es válida
			if (isNaN(date.getTime())) {
				return dateString; // Si no es válida, devolver el string original
			}

			return formatDistanceToNow(date, { addSuffix: true });
		} catch (error) {
			console.error("Error formatting date:", error, "for dateString:", dateString);
			return dateString;
		}
	};

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

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Encabezado fijo */}
			<div className="p-4 border-b">
				<div className="flex items-center">
					<div className="w-[100px] text-sm text-[#2B3674] flex items-center gap-2">
						<Checkbox id="selectAll" />
						<label htmlFor="selectAll">ID</label>
					</div>
					<div className="flex-1 text-sm text-[#2B3674] pl-8">Subject</div>
					<div className="w-[120px] text-sm text-[#2B3674]">Status</div>
					{!isMyTicketsPage && (
						<>
							<div className="w-[120px] text-sm text-[#2B3674]">Priority</div>
							<div className="w-[150px] text-sm text-[#2B3674]">User</div>
							<div className="w-[150px] text-sm text-[#2B3674]">Agent</div>
							<div className="w-[120px] text-sm text-[#2B3674]">Created</div>
						</>
					)}
				</div>
			</div>

			{/* Contenido con scroll */}
			<div
				className={`flex-1 overflow-hidden`}
				ref={scrollContainerRef}
				style={{
					scrollbarWidth: "none",
					msOverflowStyle: "none",
					WebkitOverflowScrolling: "touch",
				}}>
				<style jsx global>{`
					/* Ocultar scrollbar para Chrome, Safari y Opera */
					.overflow-y-auto::-webkit-scrollbar {
						display: none;
						width: 0 !important;
					}

					/* Ocultar scrollbar para IE, Edge y Firefox */
					.overflow-y-auto {
						-ms-overflow-style: none; /* IE y Edge */
						scrollbar-width: none; /* Firefox */
					}
				`}</style>

				<div className={`h-full ${isFiltering ? "overflow-hidden" : "overflow-y-auto"}`}>
					<LayoutGroup>
						<AnimatePresence initial={false} mode="popLayout">
							{tickets.map((ticket) => (
								<motion.div
									key={ticket.id}
									className="flex items-center py-4 px-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
									onClick={() => handleTicketClick(ticket)}
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
											{ticket.status === "Completed" ? (
												<CheckCircle2 className="h-4 w-4 text-green-500" />
											) : ticket.status === "In progress" ? (
												<Clock className="h-4 w-4 text-blue-500" />
											) : ticket.status === "Closed" ? (
												<CheckCircle2 className="h-4 w-4 text-gray-500" />
											) : ticket.status === "Deleted" ? (
												<Circle className="h-4 w-4 text-red-500" />
											) : (
												<Circle className="h-4 w-4 text-gray-300" />
											)}
											<span className="text-sm">{ticket.status}</span>
										</div>
									</div>
									{!isMyTicketsPage && (
										<>
											<div className="w-[120px]">
												<Badge
													variant={
														ticket.priority === "High" ? "destructive" : ticket.priority === "Medium" ? "default" : "secondary"
													}
													className="text-xs">
													{ticket.priority}
												</Badge>
											</div>
											<div className="w-[150px]">
												<div className="flex items-center gap-2">
													<Avatar className="h-6 w-6">
														<AvatarFallback>
															{ticket.user?.name ? ticket.user.name.substring(0, 2).toUpperCase() : "UN"}
														</AvatarFallback>
													</Avatar>
													<span className="text-sm">{ticket.user?.name || "Unknown User"}</span>
												</div>
											</div>
											<div className="w-[150px]">
												<div className="flex items-center gap-2">
													<Avatar className="h-6 w-6">
														<AvatarFallback>{ticket.assignee.name.substring(0, 2).toUpperCase()}</AvatarFallback>
													</Avatar>
													<span className="text-sm">{ticket.assignee.name}</span>
												</div>
											</div>
											<div className="w-[120px] text-sm">{formatRelativeTime(ticket.createdAt)}</div>
										</>
									)}
								</motion.div>
							))}
						</AnimatePresence>
					</LayoutGroup>
				</div>
			</div>

			{selectedTicket && <TicketDetail ticket={selectedTicket} onClose={handleCloseDetail} />}
		</div>
	);
}
