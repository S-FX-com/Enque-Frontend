"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TasksList } from "./tasks-list";
import { TasksListSkeleton } from "./tasks-list-skeleton";
import { TasksSidebar } from "./tasks-sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ticketService } from "@/services/ticket";
import { useApp } from "@/hooks/use-app";

export default function TasksClientPage() {
	const [tickets, setTickets] = useState<any[]>([]);
	const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [isFiltering, setIsFiltering] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
	const [currentFilters, setCurrentFilters] = useState<any>({});

	const lastQueryRef = useRef<string>("");
	const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
	const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
	const lastSyncTimeRef = useRef<number>(Date.now());
	const errorCountRef = useRef(0);

	const { currentUser } = useApp();

	// Load tickets from server
	const loadTickets = useCallback(async (filters: any = {}) => {
		setLoading(true);

		try {
			// Convert filters to API format
			const params: Record<string, string> = {};

			if (filters.subject) params.subject = filters.subject;
			if (filters.status && Array.isArray(filters.status)) params.status = filters.status.join(",");
			if (filters.agent && Array.isArray(filters.agent)) params.agent = filters.agent.join(",");
			if (filters.priority && Array.isArray(filters.priority)) params.priority = filters.priority.join(",");
			if (filters.includeDeleted) params.includeDeleted = filters.includeDeleted;

			// Save current query
			lastQueryRef.current = JSON.stringify(params);

			const data = await ticketService.getTickets(params);
			if (data.success) {
				setTickets(data.data);
				setFilteredTickets(data.data);
			}

			// Small delay for smoother UI
			setTimeout(() => {
				setLoading(false);
				setIsFiltering(false);
			}, 200);
		} catch (error) {
			console.error("Error loading tickets:", error);
			setLoading(false);
			setIsFiltering(false);
		}
	}, []);

	// Filter tickets locally
	const filterTickets = useCallback((allTickets: any[], filters: any) => {
		if (!filters || Object.keys(filters).length === 0) {
			return allTickets;
		}

		return allTickets.filter((ticket) => {
			// Filter by subject
			if (filters.subject && !ticket.title.toLowerCase().includes(filters.subject.toLowerCase())) {
				return false;
			}

			// Filter by status
			if (filters.status?.length > 0 && !filters.status.includes(ticket.status)) {
				return false;
			}

			// Filter by agent
			if (filters.agent?.length > 0) {
				const ticketAgentId = String(ticket.assignee?.id || "");
				const selectedAgentIds = filters.agent.map((id: any) => String(id));
				if (!selectedAgentIds.includes(ticketAgentId)) {
					return false;
				}
			}

			// Filter by priority
			if (filters.priority?.length > 0 && !filters.priority.includes(ticket.priority)) {
				return false;
			}

			// Include deleted only if specified
			if (!filters.includeDeleted && ticket.is_deleted) {
				return false;
			}

			return true;
		});
	}, []);

	// Handle filter changes
	const handleFiltersChange = useCallback(
		(filters: any) => {
			setCurrentFilters(filters);
			setIsFiltering(true);

			// Determine if we need server query
			const needsServerQuery = filters.includeDeleted === "true" || JSON.stringify(filters).length - lastQueryRef.current.length > 50;

			if (loading || needsServerQuery) {
				// Query server if needed
				loadTickets(filters);
			} else {
				// Otherwise filter locally
				const filtered = filterTickets(tickets, filters);
				setTimeout(() => {
					setFilteredTickets(filtered);
					setIsFiltering(false);
				}, 100);
			}
		},
		[tickets, loading, loadTickets, filterTickets]
	);

	// Check for new emails
	const checkForNewEmails = useCallback(async () => {
		if (!currentUser) return false;

		try {
			errorCountRef.current = 0;
			const response = await fetch("/api/tickets-check");

			if (!response.ok) {
				console.error(`Server error: ${response.status}`);
				return false;
			}

			const result = await response.json();
			return result.hasNewEmails;
		} catch (error) {
			console.error("Error checking for new emails:", error);
			errorCountRef.current += 1;

			// Stop checking after too many errors
			if (errorCountRef.current > 3 && syncTimerRef.current) {
				clearInterval(syncTimerRef.current);
				syncTimerRef.current = null;
			}

			return false;
		}
	}, [currentUser]);

	// Sync emails to tickets
	const syncEmails = useCallback(async () => {
		if (isSyncing || !currentUser) return;

		setIsSyncing(true);
		lastSyncTimeRef.current = Date.now();

		try {
			const response = await fetch("/api/tickets-check", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});

			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}

			const result = await response.json();

			// Add new tickets if any
			if (result.newTickets?.length > 0) {
				setTickets((prev) => [...result.newTickets, ...prev]);
				setFilteredTickets((prev) => [...result.newTickets, ...prev]);
				console.log(`${result.newTickets.length} new ticket(s) created from emails`);
			}
		} catch (error) {
			console.error("Error syncing emails:", error);
		} finally {
			setIsSyncing(false);
		}
	}, [isSyncing, currentUser]);

	// Setup email sync interval
	useEffect(() => {
		if (currentUser) {
			// Check for new emails every 15 seconds
			syncTimerRef.current = setInterval(async () => {
				const hasNewEmails = await checkForNewEmails();
				if (hasNewEmails && Date.now() - lastSyncTimeRef.current > 5000) {
					await syncEmails();
				}
			}, 15000);

			// Initial check
			checkForNewEmails().then((hasEmails) => {
				if (hasEmails) syncEmails();
			});
		}

		return () => {
			if (syncTimerRef.current) clearInterval(syncTimerRef.current);
		};
	}, [checkForNewEmails, syncEmails, currentUser]);

	// Initial load
	useEffect(() => {
		loadTickets();
	}, [loadTickets]);

	// Auto-refresh
	useEffect(() => {
		refreshTimerRef.current = setInterval(() => {
			loadTickets(currentFilters);
			setLastRefresh(new Date());
		}, 15000);

		return () => {
			if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
		};
	}, [loadTickets, currentFilters]);

	// Animation variants
	const contentVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.3 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};

	return (
		<div className="flex flex-1 h-full overflow-hidden">
			<div className="flex-1 flex flex-col h-full overflow-hidden py-6">
				<div className="px-8 mb-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-tight text-[#2B3674]">All Tickets</h1>
					<Link href="/tickets/new">
						<Button className="gap-2">
							<Plus className="h-4 w-4" />
							New
						</Button>
					</Link>
				</div>

				<div className="flex-1 flex px-8 gap-6 overflow-hidden">
					{/* Main content */}
					<div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
						<AnimatePresence mode="wait">
							{loading || isFiltering ? (
								<motion.div key="loading" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
									<TasksListSkeleton />
								</motion.div>
							) : (
								<motion.div
									key="content"
									variants={contentVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
									className={isFiltering ? "opacity-80 transition-opacity duration-300" : ""}>
									<TasksList tickets={filteredTickets} isFiltering={isFiltering} />
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Sidebar with filters */}
					<TasksSidebar initialAgents={[]} onFiltersChange={handleFiltersChange} />
				</div>

				<div className="text-xs text-gray-400 text-right mt-1 pr-4">Last updated: {lastRefresh.toLocaleTimeString()}</div>
			</div>
		</div>
	);
}
