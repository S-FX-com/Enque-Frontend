"use client";

import { useEffect, useState, Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { useApp } from "@/hooks/use-app";
import { ticketService } from "@/services/ticket";
import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewClientPage() {
	const { currentUser } = useApp();
	const [userTickets, setUserTickets] = useState([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadTickets = async () => {
			try {
				const tickets = await ticketService.getTickets();
				setUserTickets(tickets.data);
			} catch (error) {
				console.error("Failed to load tickets:", error);
			} finally {
				setIsLoading(false);
			}
		};

		loadTickets();
	}, []);

	return (
		<div className="p-8">
			<h1 className="text-3xl font-bold tracking-tight text-[#2B3674] mb-6">Dashboard</h1>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{/* User Profile Card */}
				<Card className="bg-white rounded-xl shadow-sm overflow-hidden border-0">
					<CardContent className="p-0">
						<div className="flex flex-col items-center p-6">
							<Avatar className="h-24 w-24 mb-4">
								<AvatarImage src={""} alt={currentUser.name} />
								<AvatarFallback className="text-lg">{currentUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
							</Avatar>
							<h2 className="text-xl font-bold text-[#2B3674]">{currentUser.name}</h2>

							<div className="flex justify-between w-full mt-8">
								<div className="flex flex-col items-center">
									<span className="text-2xl font-bold text-[#2B3674]">0</span>
									<span className="text-xs text-gray-500">Tickets Assigned</span>
								</div>
								<div className="flex flex-col items-center">
									<span className="text-2xl font-bold text-[#2B3674]">0</span>
									<span className="text-xs text-gray-500">Tickets Completed</span>
								</div>
								<div className="flex flex-col items-center">
									<span className="text-2xl font-bold text-[#2B3674]">0</span>
									<span className="text-xs text-gray-500">Teams</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* My Tickets Card */}
				<Card className="bg-white rounded-xl shadow-sm overflow-hidden border-0">
					<CardHeader className="pb-0">
						<CardTitle className="text-xl font-bold text-[#2B3674]">My Tickets</CardTitle>
					</CardHeader>
					<CardContent>
						<Suspense fallback={<TicketsLoadingSkeleton />}>
							<div className="space-y-4 mt-4">
								{isLoading ? (
									<TicketsLoadingSkeleton />
								) : userTickets.length === 0 ? (
									<p className="text-sm text-gray-500">No tickets assigned to you.</p>
								) : (
									<div>
										<div className="grid grid-cols-3 mb-2">
											<div className="text-sm font-medium text-[#2B3674]">Date</div>
											<div className="text-sm font-medium text-[#2B3674]">Subject</div>
											<div className="text-sm font-medium text-[#2B3674]">Status</div>
										</div>

										{userTickets.map((ticket: any) => (
											<div key={ticket.id} className="grid grid-cols-3 py-3 border-t border-gray-100">
												<div className="text-sm text-gray-600">{formatDate(ticket.created_at)}</div>
												<div className="text-sm text-[#2B3674]">
													<Link href={`/tickets/${ticket.id}`} className="hover:underline">
														{ticket.title}
													</Link>
												</div>
												<div>
													<div className="flex items-center gap-2">
														{ticket.status === "Completed" ? (
															<CheckCircle2 className="h-4 w-4 text-green-500" />
														) : ticket.status === "In progress" ? (
															<Clock className="h-4 w-4 text-blue-500" />
														) : (
															<Circle className="h-4 w-4 text-gray-300" />
														)}
														<span className="text-sm">
															{ticket.status === "Completed"
																? "Completed"
																: ticket.status === "In progress"
																? "In Progress"
																: "Open"}
														</span>
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</Suspense>
					</CardContent>
				</Card>

				{/* My Teams Card */}
				<Card className="bg-white rounded-xl shadow-sm overflow-hidden border-0">
					<CardHeader className="pb-0">
						<CardTitle className="text-xl font-bold text-[#2B3674]">My Teams</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4 mt-4">
							{/* Team 1 */}
							<div className="border-b pb-4">
								<h3 className="font-medium text-[#2B3674] mb-2">Lorem ipsum</h3>
								<div className="grid grid-cols-3 gap-2 text-center">
									<div>
										<div className="text-sm text-gray-500">Tickets Open</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
									<div>
										<div className="text-sm text-gray-500">Tickets With User</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
									<div>
										<div className="text-sm text-gray-500">Tickets Assigned</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
								</div>
							</div>

							{/* Team 2 */}
							<div className="border-b pb-4">
								<h3 className="font-medium text-[#2B3674] mb-2">Lorem ipsum</h3>
								<div className="grid grid-cols-3 gap-2 text-center">
									<div>
										<div className="text-sm text-gray-500">Tickets Open</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
									<div>
										<div className="text-sm text-gray-500">Tickets With User</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
									<div>
										<div className="text-sm text-gray-500">Tickets Assigned</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
								</div>
							</div>

							{/* Team 3 */}
							<div>
								<h3 className="font-medium text-[#2B3674] mb-2">Lorem ipsum</h3>
								<div className="grid grid-cols-3 gap-2 text-center">
									<div>
										<div className="text-sm text-gray-500">Tickets Open</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
									<div>
										<div className="text-sm text-gray-500">Tickets With User</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
									<div>
										<div className="text-sm text-gray-500">Tickets Assigned</div>
										<div className="text-lg font-bold text-[#2B3674]">0</div>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white shadow-sm mt-6">
				<div className="flex items-center justify-between p-6">
					<div>
						<h3 className="text-xl font-semibold text-[#2B3674]">Email Synchronization</h3>
						<p className="text-gray-500">The system automatically checks for emails every 2 minutes.</p>
					</div>
					<a
						href="/api/webhook/email-check?token=obiedesk-webhook-secret-2025"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
						Check Now
					</a>
				</div>
				<div className="border-t border-gray-200 p-3 text-center text-sm text-gray-500">Last email processed: {new Date().toLocaleString()}</div>
			</div>
		</div>
	);
}

function TicketsLoadingSkeleton() {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-3 mb-2">
				<div className="text-sm font-medium text-[#2B3674]">Date</div>
				<div className="text-sm font-medium text-[#2B3674]">Subject</div>
				<div className="text-sm font-medium text-[#2B3674]">Status</div>
			</div>
			{[1, 2, 3].map((i) => (
				<div key={i} className="grid grid-cols-3 py-3 border-t border-gray-100">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
				</div>
			))}
		</div>
	);
}
