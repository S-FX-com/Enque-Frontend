"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface TasksSidebarProps {
	initialAgents?: any[];
	onFiltersChange?: (filters: any) => void;
}

// Componente interno que usa searchParams
function TasksSidebarContent({ initialAgents = [], onFiltersChange }: TasksSidebarProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const isInitialRender = useRef(true);
	const prevFiltersRef = useRef<any>({});

	// Inicializar estados con valores de searchParams
	const [subject, setSubject] = useState(searchParams.get("subject") || "");
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(searchParams.get("status")?.split(",").filter(Boolean) || []);
	const [selectedAgents, setSelectedAgents] = useState<string[]>(searchParams.get("agent")?.split(",").filter(Boolean) || []);
	const [selectedPriorities, setSelectedPriorities] = useState<string[]>(searchParams.get("priority")?.split(",").filter(Boolean) || []);
	const [selectedUsers, setSelectedUsers] = useState<string[]>(searchParams.get("user")?.split(",").filter(Boolean) || []);
	const [agents, setAgents] = useState<any[]>(initialAgents);
	const [users, setUsers] = useState<any[]>([]);
	const [statusOpen, setStatusOpen] = useState(false);
	const [agentOpen, setAgentOpen] = useState(false);
	const [priorityOpen, setPriorityOpen] = useState(false);
	const [userOpen, setUserOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Opciones de estado - Cambiado "Open" a "Pending"
	const statusOptions = [
		{ value: "Pending", label: "Pending" },
		{ value: "In progress", label: "In Progress" },
		{ value: "Completed", label: "Completed" },
		{ value: "Closed", label: "Closed" },
		{ value: "Deleted", label: "Deleted" },
	];

	// Opciones de prioridad
	const priorityOptions = [
		{ value: "High", label: "High" },
		{ value: "Medium", label: "Medium" },
		{ value: "Low", label: "Low" },
	];

	// Cargar agentes y usuarios
	useEffect(() => {
		const loadData = async () => {
			try {
				// Cargar agentes
				const agentsData = await getTeamMembers();
				setAgents(agentsData);

				// Cargar usuarios reales de los tickets
				try {
					// Intentar cargar los usuarios de la API
					const response = await fetch("/api/users");
					if (response.ok) {
						const userData = await response.json();
						if (Array.isArray(userData)) {
							setUsers(
								userData.map((user) => ({
									id: user.id,
									name: user.name,
								}))
							);
						}
					} else {
						console.warn("Could not load users from API, using default users");
						setUsers([
							{ id: "1", name: "Richard Castro" },
							{ id: "2", name: "Support User" },
							{ id: "3", name: "Customer" },
						]);
					}
				} catch (error) {
					console.warn("Error loading users:", error);
					// Usuarios de reserva en caso de error
					setUsers([
						{ id: "1", name: "Richard Castro" },
						{ id: "2", name: "Support User" },
						{ id: "3", name: "Customer" },
					]);
				}
			} catch (error) {
				console.error("Error loading data:", error);
			}
		};

		if (initialAgents.length === 0) {
			loadData();
		}
	}, [initialAgents]);

	// Actualizar filtros sin cambiar la URL
	const updateFilters = useCallback(() => {
		// Crear objeto de filtros
		const filters: Record<string, string | string[]> = {};

		if (subject) filters.subject = subject;
		if (selectedStatuses.length > 0) filters.status = selectedStatuses;
		if (selectedAgents.length > 0) filters.agent = selectedAgents;
		if (selectedPriorities.length > 0) filters.priority = selectedPriorities;
		if (selectedUsers.length > 0) filters.user = selectedUsers;

		// Incluir deleted solo si está seleccionado explícitamente
		if (selectedStatuses.includes("Deleted")) {
			filters.includeDeleted = "true";
		}

		// Verificar si los filtros han cambiado realmente
		const currentFiltersStr = JSON.stringify(filters);
		const prevFiltersStr = JSON.stringify(prevFiltersRef.current);

		if (currentFiltersStr !== prevFiltersStr) {
			setIsLoading(true);

			// Actualizar la referencia de filtros previos
			prevFiltersRef.current = { ...filters };

			// Notificar al componente padre sobre el cambio de filtros
			if (onFiltersChange) {
				onFiltersChange(filters);
			}

			// Desactivar el estado de carga después de un breve retraso
			setTimeout(() => {
				setIsLoading(false);
			}, 200);
		}
	}, [subject, selectedStatuses, selectedAgents, selectedPriorities, selectedUsers, onFiltersChange]);

	// Función para manejar cambios en los filtros con debounce
	const handleFilterChange = useCallback(() => {
		// Limpiar el timer anterior si existe
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		// Establecer un nuevo timer
		debounceTimerRef.current = setTimeout(() => {
			updateFilters();
		}, 300);
	}, [updateFilters]);

	// Actualizar filtros cuando cambian los valores
	useEffect(() => {
		// Evitar la actualización en el primer renderizado
		if (isInitialRender.current) {
			isInitialRender.current = false;
			return;
		}

		handleFilterChange();

		// Limpiar el timer cuando el componente se desmonte
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [subject, selectedStatuses, selectedAgents, selectedPriorities, selectedUsers, handleFilterChange]);

	// Limpiar todos los filtros
	const handleClearFilters = () => {
		setSubject("");
		setSelectedStatuses([]);
		setSelectedAgents([]);
		setSelectedPriorities([]);
		setSelectedUsers([]);
	};

	// Restablecer filtros a los valores de la URL
	const handleResetFilters = () => {
		setSubject(searchParams.get("subject") || "");
		setSelectedStatuses(searchParams.get("status")?.split(",").filter(Boolean) || []);
		setSelectedAgents(searchParams.get("agent")?.split(",").filter(Boolean) || []);
		setSelectedPriorities(searchParams.get("priority")?.split(",").filter(Boolean) || []);
		setSelectedUsers(searchParams.get("user")?.split(",").filter(Boolean) || []);
	};

	// Eliminar un filtro específico
	const handleRemoveFilter = (type: string, value: string) => {
		switch (type) {
			case "status":
				setSelectedStatuses((prev) => prev.filter((s) => s !== value));
				break;
			case "agent":
				setSelectedAgents((prev) => prev.filter((a) => a !== value));
				break;
			case "priority":
				setSelectedPriorities((prev) => prev.filter((p) => p !== value));
				break;
			case "user":
				setSelectedUsers((prev) => prev.filter((u) => u !== value));
				break;
		}
	};

	return (
		<div className="w-[320px] p-6 h-full overflow-hidden flex flex-col">
			<div className="bg-white rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
				<div className="flex justify-between items-center px-7 py-5 w-full border-b">
					<div className="text-xl font-medium text-[#2B3674] line-clamp-1 overflow-clip">Filters</div>
					<div className="flex items-center shrink-0 gap-1">
						<Button variant="ghost" size="icon" title="Reset Filters" onClick={handleResetFilters}>
							<Image src="/icons/reset-filter.svg" alt="Reset Filters" width={20} height={20} className="h-5 w-5" />
						</Button>
						<Button variant="ghost" size="icon" title="Clear Filters" onClick={handleClearFilters}>
							<Image src="/icons/clear-filter.svg" alt="Clear Filters" width={20} height={20} className="h-5 w-5" />
						</Button>
					</div>
				</div>

				<div className="p-6 flex-1 overflow-y-auto">
					{/* Filter by subject */}
					<div className="mb-5">
						<Label htmlFor="filter-subject" className="text-[#11142D] mb-2 block">
							Subject
						</Label>
						<Input
							id="filter-subject"
							placeholder="Search tickets..."
							className="bg-[#F6F8FD] border-none"
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
						/>
					</div>

					{/* Filter by status */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Statuses</Label>
						<Popover open={statusOpen} onOpenChange={setStatusOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={statusOpen}
									className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">{selectedStatuses.length === 0 ? "Select..." : selectedStatuses.join(", ")}</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[270px] p-0">
								<Command>
									<CommandInput placeholder="Search status..." />
									<CommandList>
										<CommandEmpty>No status found.</CommandEmpty>
										<CommandGroup>
											{statusOptions.map((status) => (
												<CommandItem
													key={status.value}
													onSelect={() => {
														const newSelectedStatuses = selectedStatuses.includes(status.value)
															? selectedStatuses.filter((s) => s !== status.value)
															: [...selectedStatuses, status.value];
														setSelectedStatuses(newSelectedStatuses);
													}}>
													<Checkbox checked={selectedStatuses.includes(status.value)} className="mr-2" />
													{status.label}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Filter by agent */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Agents</Label>
						<Popover open={agentOpen} onOpenChange={setAgentOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" role="combobox" aria-expanded={agentOpen} className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedAgents.length === 0
											? "Select..."
											: agents
													.filter((a) => selectedAgents.includes(String(a.id)))
													.map((a) => a.name)
													.join(", ")}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[270px] p-0">
								<Command>
									<CommandInput placeholder="Search agent..." />
									<CommandList>
										<CommandEmpty>No agent found.</CommandEmpty>
										<CommandGroup>
											{agents.map((agent) => (
												<CommandItem
													key={agent.id}
													onSelect={() => {
														const agentId = String(agent.id);
														const newSelectedAgents = selectedAgents.includes(agentId)
															? selectedAgents.filter((a) => a !== agentId)
															: [...selectedAgents, agentId];
														setSelectedAgents(newSelectedAgents);
													}}>
													<Checkbox checked={selectedAgents.includes(String(agent.id))} className="mr-2" />
													{agent.name}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Filter by priority */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Priorities</Label>
						<Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={priorityOpen}
									className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedPriorities.length === 0 ? "Select..." : selectedPriorities.join(", ")}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[270px] p-0">
								<Command>
									<CommandInput placeholder="Search priority..." />
									<CommandList>
										<CommandEmpty>No priority found.</CommandEmpty>
										<CommandGroup>
											{priorityOptions.map((priority) => (
												<CommandItem
													key={priority.value}
													onSelect={() => {
														const newSelectedPriorities = selectedPriorities.includes(priority.value)
															? selectedPriorities.filter((p) => p !== priority.value)
															: [...selectedPriorities, priority.value];
														setSelectedPriorities(newSelectedPriorities);
													}}>
													<Checkbox checked={selectedPriorities.includes(priority.value)} className="mr-2" />
													{priority.label}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Filter by users */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Users</Label>
						<Popover open={userOpen} onOpenChange={setUserOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" role="combobox" aria-expanded={userOpen} className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedUsers.length === 0
											? "Select..."
											: users
													.filter((u) => selectedUsers.includes(String(u.id)))
													.map((u) => u.name)
													.join(", ")}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[270px] p-0">
								<Command>
									<CommandInput placeholder="Search user..." />
									<CommandList>
										<CommandEmpty>No user found.</CommandEmpty>
										<CommandGroup>
											{users.map((user) => (
												<CommandItem
													key={user.id}
													onSelect={() => {
														const userId = String(user.id);
														const newSelectedUsers = selectedUsers.includes(userId)
															? selectedUsers.filter((u) => u !== userId)
															: [...selectedUsers, userId];
														setSelectedUsers(newSelectedUsers);
													}}>
													<Checkbox checked={selectedUsers.includes(String(user.id))} className="mr-2" />
													{user.name}
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			</div>
		</div>
	);
}

// Componente principal que utiliza Suspense
export function TasksSidebar(props: TasksSidebarProps) {
	return (
		<Suspense fallback={<div className="w-[320px] p-6 bg-gray-100 animate-pulse"></div>}>
			<TasksSidebarContent {...props} />
		</Suspense>
	);
}
