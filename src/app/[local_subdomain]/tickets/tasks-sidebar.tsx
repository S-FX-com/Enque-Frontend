"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface TasksSidebarProps {
	initialAgents?: any[];
	onFiltersChange?: (filters: any) => void;
}

export function TasksSidebar({ initialAgents = [], onFiltersChange }: TasksSidebarProps) {
	const searchParams = useSearchParams();
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const prevFiltersRef = useRef<any>({});

	// Filter states
	const [subject, setSubject] = useState(searchParams.get("subject") || "");
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(searchParams.get("status")?.split(",").filter(Boolean) || []);
	const [selectedAgents, setSelectedAgents] = useState<string[]>(searchParams.get("agent")?.split(",").filter(Boolean) || []);
	const [selectedPriorities, setSelectedPriorities] = useState<string[]>(searchParams.get("priority")?.split(",").filter(Boolean) || []);
	const [selectedUsers, setSelectedUsers] = useState<string[]>(searchParams.get("user")?.split(",").filter(Boolean) || []);

	// UI states
	const [agents, setAgents] = useState<any[]>(initialAgents);
	const [users, setUsers] = useState<any[]>([]);
	const [statusOpen, setStatusOpen] = useState(false);
	const [agentOpen, setAgentOpen] = useState(false);
	const [priorityOpen, setPriorityOpen] = useState(false);
	const [userOpen, setUserOpen] = useState(false);

	// Options
	const statusOptions = [
		{ value: "Pending", label: "Pending" },
		{ value: "In progress", label: "In Progress" },
		{ value: "Completed", label: "Completed" },
		{ value: "Closed", label: "Closed" },
		{ value: "Deleted", label: "Deleted" },
	];

	const priorityOptions = [
		{ value: "High", label: "High" },
		{ value: "Medium", label: "Medium" },
		{ value: "Low", label: "Low" },
	];

	// Load agents and users
	useEffect(() => {
		const loadData = async () => {
			try {
				// Load users
				try {
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
						// Fallback users
						setUsers([
							{ id: "1", name: "Richard Castro" },
							{ id: "2", name: "Support User" },
							{ id: "3", name: "Customer" },
						]);
					}
				} catch (error) {
					console.warn("Error loading users:", error);
					// Fallback users
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

	// Update filters
	const updateFilters = useCallback(() => {
		const filters: Record<string, string | string[]> = {};

		if (subject) filters.subject = subject;
		if (selectedStatuses.length > 0) filters.status = selectedStatuses;
		if (selectedAgents.length > 0) filters.agent = selectedAgents;
		if (selectedPriorities.length > 0) filters.priority = selectedPriorities;
		if (selectedUsers.length > 0) filters.user = selectedUsers;

		// Include deleted only if explicitly selected
		if (selectedStatuses.includes("Deleted")) {
			filters.includeDeleted = "true";
		}

		// Check if filters have changed
		const currentFiltersStr = JSON.stringify(filters);
		const prevFiltersStr = JSON.stringify(prevFiltersRef.current);

		if (currentFiltersStr !== prevFiltersStr) {
			prevFiltersRef.current = { ...filters };

			// Notify parent component
			if (onFiltersChange) {
				onFiltersChange(filters);
			}
		}
	}, [subject, selectedStatuses, selectedAgents, selectedPriorities, selectedUsers, onFiltersChange]);

	// Handle filter changes with debounce
	const handleFilterChange = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			updateFilters();
		}, 300);
	}, [updateFilters]);

	// Update filters when values change
	useEffect(() => {
		handleFilterChange();

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [subject, selectedStatuses, selectedAgents, selectedPriorities, selectedUsers, handleFilterChange]);

	// Clear all filters
	const handleClearFilters = () => {
		setSubject("");
		setSelectedStatuses([]);
		setSelectedAgents([]);
		setSelectedPriorities([]);
		setSelectedUsers([]);
	};

	// Reset filters to URL values
	const handleResetFilters = () => {
		setSubject(searchParams.get("subject") || "");
		setSelectedStatuses(searchParams.get("status")?.split(",").filter(Boolean) || []);
		setSelectedAgents(searchParams.get("agent")?.split(",").filter(Boolean) || []);
		setSelectedPriorities(searchParams.get("priority")?.split(",").filter(Boolean) || []);
		setSelectedUsers(searchParams.get("user")?.split(",").filter(Boolean) || []);
	};

	// Render a filter dropdown
	const renderFilterDropdown = (
		label: string,
		options: { value: string; label: string }[],
		selected: string[],
		setSelected: (value: string[]) => void,
		isOpen: boolean,
		setIsOpen: (value: boolean) => void
	) => (
		<div className="mb-5">
			<Label className="text-[#11142D] mb-2 block">{label}</Label>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" role="combobox" aria-expanded={isOpen} className="w-full justify-between bg-[#F6F8FD] border-none">
						<span className="truncate text-gray-400">{selected.length === 0 ? "Select..." : selected.join(", ")}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[270px] p-0">
					<Command>
						<CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
						<CommandList>
							<CommandEmpty>No {label.toLowerCase()} found.</CommandEmpty>
							<CommandGroup>
								{options.map((option) => (
									<CommandItem
										key={option.value}
										onSelect={() => {
											const newSelected = selected.includes(option.value)
												? selected.filter((s) => s !== option.value)
												: [...selected, option.value];
											setSelected(newSelected);
										}}>
										<Checkbox checked={selected.includes(option.value)} className="mr-2" />
										{option.label}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);

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
					{/* Subject filter */}
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

					{/* Status filter */}
					{renderFilterDropdown("Statuses", statusOptions, selectedStatuses, setSelectedStatuses, statusOpen, setStatusOpen)}

					{/* Agent filter */}
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
														const newSelected = selectedAgents.includes(agentId)
															? selectedAgents.filter((a) => a !== agentId)
															: [...selectedAgents, agentId];
														setSelectedAgents(newSelected);
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

					{/* Priority filter */}
					{renderFilterDropdown("Priorities", priorityOptions, selectedPriorities, setSelectedPriorities, priorityOpen, setPriorityOpen)}

					{/* User filter */}
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
														const newSelected = selectedUsers.includes(userId)
															? selectedUsers.filter((u) => u !== userId)
															: [...selectedUsers, userId];
														setSelectedUsers(newSelected);
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
