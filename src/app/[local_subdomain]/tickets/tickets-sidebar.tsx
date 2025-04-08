"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchParams } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Eraser, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ITeam } from "@/typescript/team";
import { Card } from "@/components/ui/card";
import { IAgent } from "@/typescript/agent";
import { ICompany } from "@/typescript/company";
import { IUser } from "@/typescript/user";

interface Props {
	initialTeams?: ITeam[];
	isTeamsLoading?: boolean;
	initialAgents?: IAgent[];
	isAgentsLoading?: boolean;
	initialCompanies?: ICompany[];
	isCompaniesLoading?: boolean;
	initialUsers?: IUser[];
	isUsersLoading?: boolean;
	onFiltersChange?: (filters: any) => void;
}

export function TicketsSidebar({
	initialTeams = [],
	isTeamsLoading = true,
	initialAgents = [],
	isAgentsLoading = true,
	initialCompanies = [],
	isCompaniesLoading = true,
	initialUsers = [],
	isUsersLoading = true,
	onFiltersChange,
}: Props) {
	const searchParams = useSearchParams();
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const prevFiltersRef = useRef<any>({});

	const [subject, setSubject] = useState(searchParams.get("subject") || "");
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(searchParams.get("status")?.split(",").filter(Boolean) || []);
	const [selectedTeams, setSelectedTeams] = useState<string[]>(searchParams.get("team")?.split(",").filter(Boolean) || []);
	const [selectedAgents, setSelectedAgents] = useState<string[]>(searchParams.get("agent")?.split(",").filter(Boolean) || []);
	const [selectedPriorities, setSelectedPriorities] = useState<string[]>(searchParams.get("priority")?.split(",").filter(Boolean) || []);
	const [selectedCompanies, setSelectedCompanies] = useState<string[]>(searchParams.get("company")?.split(",").filter(Boolean) || []);
	const [selectedUsers, setSelectedUsers] = useState<string[]>(searchParams.get("user")?.split(",").filter(Boolean) || []);

	const [statusOpen, setStatusOpen] = useState(false);
	const [teamOpen, setTeamOpen] = useState(false);
	const [agentOpen, setAgentOpen] = useState(false);
	const [priorityOpen, setPriorityOpen] = useState(false);
	const [companyOpen, setCompanyOpen] = useState(false);
	const [userOpen, setUserOpen] = useState(false);

	const statusOptions = [
		{ value: "Unread", label: "Unread" },
		{ value: "Open", label: "Open" },
		{ value: "Closed", label: "Closed" },
	];

	const priorityOptions = [
		{ value: "High", label: "High" },
		{ value: "Medium", label: "Medium" },
		{ value: "Low", label: "Low" },
	];

	const updateFilters = useCallback(() => {
		const filters: Record<string, string | string[]> = {};

		if (subject) filters.subject = subject;
		if (selectedStatuses.length > 0) filters.status = selectedStatuses;
		if (selectedTeams.length > 0) filters.team = selectedTeams;
		if (selectedAgents.length > 0) filters.agent = selectedAgents;
		if (selectedPriorities.length > 0) filters.priority = selectedPriorities;
		if (selectedCompanies.length > 0) filters.company = selectedCompanies;
		if (selectedUsers.length > 0) filters.user = selectedUsers;

		if (selectedStatuses.includes("Deleted")) {
			filters.includeDeleted = "true";
		}

		const currentFiltersStr = JSON.stringify(filters);
		const prevFiltersStr = JSON.stringify(prevFiltersRef.current);

		if (currentFiltersStr !== prevFiltersStr) {
			prevFiltersRef.current = { ...filters };

			if (onFiltersChange) onFiltersChange(filters);
		}
	}, [subject, selectedStatuses, selectedTeams, selectedAgents, selectedPriorities, selectedCompanies, selectedUsers, onFiltersChange]);

	const handleFilterChange = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		debounceTimerRef.current = setTimeout(() => {
			updateFilters();
		}, 300);
	}, [updateFilters]);

	useEffect(() => {
		handleFilterChange();

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [subject, selectedStatuses, selectedTeams, selectedAgents, selectedPriorities, selectedCompanies, selectedUsers, handleFilterChange]);

	const handleClearFilters = () => {
		setSubject("");
		setSelectedStatuses([]);
		setSelectedTeams([]);
		setSelectedAgents([]);
		setSelectedPriorities([]);
		setSelectedCompanies([]);
		setSelectedUsers([]);
	};

	const handleResetFilters = () => {
		setSubject(searchParams.get("subject") || "");
		setSelectedStatuses(searchParams.get("status")?.split(",").filter(Boolean) || []);
		setSelectedTeams(searchParams.get("team")?.split(",").filter(Boolean) || []);
		setSelectedAgents(searchParams.get("agent")?.split(",").filter(Boolean) || []);
		setSelectedPriorities(searchParams.get("priority")?.split(",").filter(Boolean) || []);
		setSelectedUsers(searchParams.get("user")?.split(",").filter(Boolean) || []);
		setSelectedCompanies(searchParams.get("company")?.split(",").filter(Boolean) || []);
	};

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
		<div className="w-[320px] h-full overflow-hidden flex flex-col">
			<Card className="rounded-xl flex flex-col h-full overflow-hidden">
				<div className="flex justify-between items-center px-7 py-5 w-full border-b">
					<div className="text-xl font-medium text-[#2B3674] line-clamp-1 overflow-clip">Filters</div>
					<div className="flex items-center shrink-0 gap-1">
						<Button variant="ghost" size="icon" title="Reset Filters" onClick={handleResetFilters}>
							<RotateCcw />
						</Button>
						<Button variant="ghost" size="icon" title="Clear Filters" onClick={handleClearFilters}>
							<Eraser />
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

					{/* Team filter */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Teams</Label>
						<Popover open={teamOpen} onOpenChange={setTeamOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" role="combobox" aria-expanded={teamOpen} className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedTeams.length === 0
											? "Select..."
											: initialTeams
													.filter((t) => selectedTeams.includes(String(t.id)))
													.map((t) => t.name)
													.join(", ")}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[270px] p-0">
								<Command>
									<CommandInput placeholder="Search team..." />
									<CommandList>
										<CommandEmpty>No team found.</CommandEmpty>
										<CommandGroup>
											{isTeamsLoading ? (
												<div className="flex items-center justify-center py-6 text-sm text-gray-500">Loading teams...</div>
											) : (
												initialTeams.map((team) => (
													<CommandItem
														key={team.id}
														onSelect={() => {
															const teamId = String(team.id);
															const newSelected = selectedTeams.includes(teamId)
																? selectedTeams.filter((t) => t !== teamId)
																: [...selectedTeams, teamId];
															setSelectedTeams(newSelected);
														}}>
														<Checkbox checked={selectedTeams.includes(String(team.id))} className="mr-2" />
														{team.name}
													</CommandItem>
												))
											)}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Agent filter */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Agents</Label>
						<Popover open={agentOpen} onOpenChange={setAgentOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" role="combobox" aria-expanded={agentOpen} className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedAgents.length === 0
											? "Select..."
											: initialAgents
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
											{isAgentsLoading ? (
												<div className="flex items-center justify-center py-6 text-sm text-gray-500">Loading agents...</div>
											) : (
												initialAgents.map((agent) => (
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
												))
											)}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* Priority filter */}
					{renderFilterDropdown("Priorities", priorityOptions, selectedPriorities, setSelectedPriorities, priorityOpen, setPriorityOpen)}

					{/* Company filter */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Companies</Label>
						<Popover open={companyOpen} onOpenChange={setCompanyOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									aria-expanded={companyOpen}
									className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedCompanies.length === 0
											? "Select..."
											: initialCompanies
													.filter((c) => selectedCompanies.includes(String(c.id)))
													.map((c) => c.name)
													.join(", ")}
									</span>
									<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-[270px] p-0">
								<Command>
									<CommandInput placeholder="Search company..." />
									<CommandList>
										<CommandEmpty>No company found.</CommandEmpty>
										<CommandGroup>
											{isCompaniesLoading ? (
												<div className="flex items-center justify-center py-6 text-sm text-gray-500">Loading companies...</div>
											) : (
												initialCompanies.map((company) => (
													<CommandItem
														key={company.id}
														onSelect={() => {
															const companyId = String(company.id);
															const newSelected = selectedCompanies.includes(companyId)
																? selectedCompanies.filter((u) => u !== companyId)
																: [...selectedCompanies, companyId];
															setSelectedCompanies(newSelected);
														}}>
														<Checkbox checked={selectedCompanies.includes(String(company.id))} className="mr-2" />
														{company.name}
													</CommandItem>
												))
											)}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>

					{/* User filter */}
					<div className="mb-5">
						<Label className="text-[#11142D] mb-2 block">Users</Label>
						<Popover open={userOpen} onOpenChange={setUserOpen}>
							<PopoverTrigger asChild>
								<Button variant="outline" role="combobox" aria-expanded={userOpen} className="w-full justify-between bg-[#F6F8FD] border-none">
									<span className="truncate text-gray-400">
										{selectedUsers.length === 0
											? "Select..."
											: initialUsers
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
											{isUsersLoading ? (
												<div className="flex items-center justify-center py-6 text-sm text-gray-500">Loading users...</div>
											) : (
												initialUsers.map((user) => (
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
												))
											)}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			</Card>
		</div>
	);
}
