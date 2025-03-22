"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { TasksList } from "./tasks-list";
import { TasksListSkeleton } from "./tasks-list-skeleton";
import { TasksSidebar } from "./tasks-sidebar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

// Componente que usa searchParams y necesita Suspense
function TasksContent() {
	const searchParams = useSearchParams();
	const [allTickets, setAllTickets] = useState<any[]>([]);
	const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [initialLoading, setInitialLoading] = useState(true);
	const [currentFilters, setCurrentFilters] = useState<any>({});
	const [isFiltering, setIsFiltering] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
	const initialLoadRef = useRef(true);
	const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastServerQueryRef = useRef<string>("");
	const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const lastSyncTimestampRef = useRef<number>(Date.now());
	const errorCountRef = useRef(0);

	// Función para cargar tickets desde el servidor
	const loadTicketsFromServer = useCallback(async (filters: any = {}) => {
		setLoading(true);

		try {
			// Convertir filtros a un formato adecuado para getTasks
			const paramsObj: Record<string, string> = {};

			if (filters.subject) paramsObj.subject = filters.subject;

			if (filters.status && Array.isArray(filters.status)) {
				paramsObj.status = filters.status.join(",");
			}

			if (filters.agent && Array.isArray(filters.agent)) {
				paramsObj.agent = filters.agent.join(",");
			}

			if (filters.priority && Array.isArray(filters.priority)) {
				paramsObj.priority = filters.priority.join(",");
			}

			if (filters.includeDeleted) {
				paramsObj.includeDeleted = filters.includeDeleted;
			}

			// Guardar la consulta actual para evitar duplicados
			lastServerQueryRef.current = JSON.stringify(paramsObj);

			const data = await getTasks(paramsObj);

			// Actualizar los tickets
			setAllTickets(data);
			setFilteredTickets(data);

			// Desactivar los estados de carga
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
			}

			loadingTimeoutRef.current = setTimeout(() => {
				setLoading(false);
				setIsFiltering(false);
				setInitialLoading(false);
				loadingTimeoutRef.current = null;
			}, 200);
		} catch (error) {
			console.error("Error loading tickets:", error);
			setLoading(false);
			setIsFiltering(false);
			setInitialLoading(false);
		}
	}, []);

	// Función para filtrar tickets en el cliente
	const filterTicketsLocally = useCallback((tickets: any[], filters: any) => {
		if (!filters || Object.keys(filters).length === 0) {
			return tickets;
		}

		console.log("Filtering tickets with filters:", filters);
		console.log("Available tickets:", tickets);

		return tickets.filter((ticket) => {
			// Filtrar por asunto (búsqueda parcial, no sensible a mayúsculas/minúsculas)
			if (filters.subject && !ticket.title.toLowerCase().includes(filters.subject.toLowerCase())) {
				return false;
			}

			// Filtrar por estado
			if (filters.status && filters.status.length > 0 && !filters.status.includes(ticket.status)) {
				return false;
			}

			// Filtrar por agente (corregido para usar el ID del agente)
			if (filters.agent && filters.agent.length > 0) {
				// Verificar si el ID del agente asignado está en la lista de agentes seleccionados
				const ticketAgentId = String(ticket.assignee?.id || "");

				// Depuración para ver los valores
				console.log(`Ticket ${ticket.id} - Agent ID: ${ticketAgentId}, Selected agents:`, filters.agent);

				// Convertir todos los IDs de agentes seleccionados a string para comparación
				const selectedAgentIds = filters.agent.map((id: any) => String(id));

				if (!selectedAgentIds.includes(ticketAgentId)) {
					return false;
				}
			}

			// Filtrar por prioridad
			if (filters.priority && filters.priority.length > 0 && !filters.priority.includes(ticket.priority)) {
				return false;
			}

			// Incluir eliminados solo si se especifica
			if (!filters.includeDeleted && ticket.is_deleted) {
				return false;
			}

			return true;
		});
	}, []);

	// Manejar cambios en los filtros
	const handleFiltersChange = useCallback(
		(filters: any) => {
			console.log("Filter change received:", filters);
			setCurrentFilters(filters);
			setIsFiltering(true);

			// Determinar si necesitamos hacer una consulta al servidor
			const needsServerQuery =
				filters.includeDeleted === "true" &&
				(!lastServerQueryRef.current.includes("includeDeleted") || JSON.stringify(filters).length - lastServerQueryRef.current.length > 50);

			if (initialLoading || needsServerQuery) {
				// Si es la carga inicial o necesitamos datos adicionales, consultar al servidor
				loadTicketsFromServer(filters);
			} else {
				// De lo contrario, filtrar localmente
				const filtered = filterTicketsLocally(allTickets, filters);
				console.log("Filtered tickets:", filtered.length);

				// Usar un pequeño retraso para la animación
				setTimeout(() => {
					setFilteredTickets(filtered);
					setIsFiltering(false);
				}, 100);
			}
		},
		[allTickets, initialLoading, loadTicketsFromServer, filterTicketsLocally]
	);

	// Verificar si hay nuevos correos para convertir en tickets
	const checkForNewEmails = useCallback(async () => {
		// Solo intentamos si hay una sesión activa
		if (!session?.user) {
			console.log("No active session, skipping email check");
			return false;
		}

		try {
			// Reiniciar contador de errores si hay una sesión válida
			errorCountRef.current = 0;

			const response = await fetch("/api/tickets-check", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			// Si recibimos un error, intentamos analizar el mensaje para debugging
			if (!response.ok) {
				const contentType = response.headers.get("content-type");

				// Si es HTML, logueamos el error pero no intentamos parsearlo como JSON
				if (contentType && contentType.includes("text/html")) {
					console.error(`Server returned HTML response with status ${response.status}`);
					return false;
				}

				try {
					// Intentamos obtener el mensaje de error
					const errorData = await response.json();
					console.error("Error checking emails:", errorData);
				} catch (parseError) {
					console.error("Failed to parse error response:", parseError);
				}

				return false;
			}

			const result = await response.json();
			return result.hasNewEmails;
		} catch (error) {
			console.error("Error checking for new emails:", error);

			// Incrementar contador de errores
			errorCountRef.current += 1;

			// Si tenemos demasiados errores consecutivos, detenemos la verificación
			if (errorCountRef.current > 3) {
				console.log("Too many consecutive errors, stopping automatic email checks");
				if (syncIntervalRef.current) {
					clearInterval(syncIntervalRef.current);
					syncIntervalRef.current = null;
				}
			}

			return false;
		}
	}, [session]);

	// Sincronizar correos electrónicos y convertirlos en tickets
	const syncEmailsToTickets = useCallback(async () => {
		if (isSyncing || !session?.user) return;

		setIsSyncing(true);
		lastSyncTimestampRef.current = Date.now();

		try {
			const response = await fetch("/api/tickets-check", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			// Manejar respuestas HTML (error de servidor)
			if (!response.ok) {
				const contentType = response.headers.get("content-type");

				if (contentType && contentType.includes("text/html")) {
					throw new Error(`Server error: ${response.status}`);
				}

				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to sync emails");
			}

			const result = await response.json();

			// Si tenemos nuevos tickets, actualizar la lista
			if (result.newTickets && result.newTickets.length > 0) {
				// Agregar los nuevos tickets al inicio de la lista
				setAllTickets((prevTickets) => [...result.newTickets, ...prevTickets]);
				setFilteredTickets((prevTickets) => [...result.newTickets, ...prevTickets]);

				console.log(`${result.newTickets.length} new ticket(s) created from emails`);
			}
		} catch (error: any) {
			console.error("Error syncing emails:", error);
		} finally {
			setIsSyncing(false);
		}
	}, [isSyncing, session]);

	// Iniciar sincronización automática
	useEffect(() => {
		// Solo configuramos la verificación periódica si hay una sesión activa
		if (session?.user) {
			// Configurar verificación periódica de correos nuevos (cada 15 segundos)
			syncIntervalRef.current = setInterval(async () => {
				const hasNewEmails = await checkForNewEmails();

				// Si hay nuevos correos y han pasado al menos 5 segundos desde la última sincronización
				if (hasNewEmails && Date.now() - lastSyncTimestampRef.current > 5000) {
					await syncEmailsToTickets();
				}
			}, 15000); // 15 segundos

			// Verificar correos nuevos inmediatamente al cargar
			checkForNewEmails().then((hasEmails) => {
				if (hasEmails) syncEmailsToTickets();
			});
		}

		return () => {
			// Limpiar intervalo al desmontar
			if (syncIntervalRef.current) {
				clearInterval(syncIntervalRef.current);
			}
		};
	}, [checkForNewEmails, syncEmailsToTickets, session]);

	// Cargar tickets iniciales solo una vez
	useEffect(() => {
		if (initialLoadRef.current) {
			initialLoadRef.current = false;
			loadTicketsFromServer();
		}

		// Limpiar timeout al desmontar
		return () => {
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
			}
		};
	}, [loadTicketsFromServer]);

	// Nuevo efecto para actualización automática cada 15 segundos
	useEffect(() => {
		// Configurar intervalo de actualización automática
		autoRefreshIntervalRef.current = setInterval(() => {
			console.log("Auto-refreshing ticket list...");
			loadTicketsFromServer(currentFilters);
			setLastRefresh(new Date());
		}, 15000); // 15 segundos

		// Limpiar intervalo al desmontar
		return () => {
			if (autoRefreshIntervalRef.current) {
				clearInterval(autoRefreshIntervalRef.current);
			}
		};
	}, [loadTicketsFromServer, currentFilters]);

	// Variantes de animación para framer-motion
	const contentVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1, transition: { duration: 0.3 } },
		exit: { opacity: 0, transition: { duration: 0.2 } },
	};

	return (
		<div className="flex-1 flex flex-col h-full overflow-hidden py-6">
			<div className="px-8 mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-[#2B3674]">All Tickets</h1>
				</div>
				<div className="flex items-center gap-4">
					<Link href="/tickets/new">
						<Button className="gap-2">
							<Plus className="h-4 w-4" />
							New
						</Button>
					</Link>
				</div>
			</div>

			<div className="flex-1 flex px-8 gap-6 overflow-hidden">
				{/* Sidebar a la derecha */}
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

				{/* Sidebar con filtros */}
				<TasksSidebar initialAgents={[]} onFiltersChange={handleFiltersChange} />
			</div>

			{/* Opcional: Si quieres mostrar cuándo fue la última actualización */}
			<div className="text-xs text-gray-400 text-right mt-1 pr-4">Last updated: {lastRefresh.toLocaleTimeString()}</div>
		</div>
	);
}

// Componente principal que utiliza Suspense
export default function TasksClientPage() {
	return (
		<div className="flex flex-1 h-full overflow-hidden">
			<Suspense fallback={<TasksListSkeleton />}>
				<TasksContent />
			</Suspense>
		</div>
	);
}
