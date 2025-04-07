"use client";

import { Button } from "@/components/ui/button";
import type { IUser } from "@/typescript/user";
import type { ICompany } from "@/typescript/company";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { companyService } from "@/services/company";
import { userService } from "@/services/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CompanyDetails } from "./company-details";
import { CreateUserModal } from "@/components/modals/create-user-modal";
import { CreateCompanyModal } from "@/components/modals/create-company-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ITicket } from "@/typescript/ticket";
import { ticketService } from "@/services/ticket";
import { useApp } from "@/hooks/use-app";

export default function ClientPage() {
	const { currentWorkspace } = useApp();
	const [companies, setCompanies] = useState<ICompany[]>([]);
	const [companiesIsLoading, setCompaniesIsLoading] = useState<boolean>(true);
	const [users, setUsers] = useState<IUser[]>([]);
	const [usersIsLoading, setUsersIsLoading] = useState<boolean>(true);
	const [selectedCompany, setSelectedCompany] = useState<ICompany | null>(null);
	const [showUnassignedUsers, setShowUnassignedUsers] = useState<boolean>(false);
	const [tickets, setTickets] = useState<any[]>([]);
	const [ticketsIsLoading, setTicketsIsLoading] = useState<boolean>(true);

	useEffect(() => {
		const loadCompanies = async () => {
			const response = await companyService.getCompanies({ workspace_id: currentWorkspace?.id as number });
			if (response.success) setCompanies(response.data as ICompany[]);
			else
				toast.error("Error", {
					description: response.message || "Failed to load companies",
				});

			setCompaniesIsLoading(false);
		};

		loadCompanies();
	}, []);

	useEffect(() => {
		const loadUsers = async () => {
			if (selectedCompany || showUnassignedUsers) {
				setUsersIsLoading(true);

				const response = await userService.getUsers({ company_id: selectedCompany ? selectedCompany.id : null });
				if (response.success) setUsers(response.data as IUser[]);
				else
					toast.error("Error", {
						description: response.message || "Failed to load users",
					});

				setUsersIsLoading(false);
			}
		};

		const loadTickets = async () => {
			if (selectedCompany || showUnassignedUsers) {
				setTicketsIsLoading(true);

				const response = await ticketService.getTickets({});
				if (response.success) setTickets(response.data as ITicket[]);
				else
					toast.error("Error", {
						description: response.message || "Failed to load tickets",
					});

				setTicketsIsLoading(false);
			}
		};

		loadUsers();
		loadTickets();
	}, [selectedCompany, showUnassignedUsers]);

	const handleSelectCompany = (company: ICompany) => {
		if (selectedCompany !== company) {
			setShowUnassignedUsers(false);
			setSelectedCompany(company);
		} else {
			setSelectedCompany(null);
		}
	};

	const handleShowUnassignedUsers = () => {
		if (showUnassignedUsers) {
			setShowUnassignedUsers(false);
		} else {
			setSelectedCompany(null);
			setShowUnassignedUsers(true);
		}
	};

	const CompanySkeleton = () => (
		<div className="flex flex-col gap-2">
			{[1, 2, 3, 4, 5].map((i) => (
				<div key={i} className="flex items-center gap-3 px-3 py-1">
					<Skeleton className="h-8 w-8 rounded-full" />
					<Skeleton className="h-5 w-24" />
				</div>
			))}
		</div>
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2">
				<Button onClick={() => handleShowUnassignedUsers()} variant={showUnassignedUsers ? "secondary" : "default"}>
					Unassigned Users
				</Button>
				<CreateCompanyModal />
				<CreateUserModal />
			</div>

			<div className="flex gap-4">
				<Card className="w-full max-w-2xs">
					<CardHeader>
						<CardTitle>
							<h2 className="text-xl">Active Companies</h2>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{companiesIsLoading ? (
							<CompanySkeleton />
						) : (
							<div className="flex flex-col gap-1">
								{companies.map((company, index) => {
									const isActive = selectedCompany && company.id === selectedCompany.id;
									return (
										<button
											key={index}
											onClick={() => handleSelectCompany(company)}
											className={cn(
												"flex w-full items-center gap-3 px-3 py-1 rounded-xl cursor-pointer",
												isActive ? "bg-background" : "hover:bg-background"
											)}>
											<div className={`w-8 h-8 rounded-full flex items-center justify-center`}>
												<Avatar className="h-8 w-8">
													{company?.logo_url ? (
														<AvatarImage src={company?.logo_url} alt={company?.name} />
													) : (
														<AvatarFallback>{company?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
													)}
												</Avatar>
											</div>
											<span className={cn("text-sm", isActive && "text-primary")}>{company.name}</span>
										</button>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>

				<div className="flex-1 flex flex-col gap-4">
					{selectedCompany && <CompanyDetails company={selectedCompany} companyUsers={users} />}

					{showUnassignedUsers && (
						<Card>
							<CardContent className="pt-6">
								<Tabs defaultValue="users">
									<TabsList className="mb-4">
										<TabsTrigger value="users">Unassigned Users</TabsTrigger>
										<TabsTrigger value="tickets">Tickets</TabsTrigger>
									</TabsList>

									<TabsContent value="users">
										{usersIsLoading ? (
											<div className="space-y-2">
												<Skeleton className="h-6 w-full" />
												<Skeleton className="h-10 w-full" />
												<Skeleton className="h-10 w-full" />
												<Skeleton className="h-10 w-full" />
											</div>
										) : users.length > 0 ? (
											<div className="flex flex-col">
												<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
													<div className="col-span-3">Name</div>
													<div className="col-span-3">Email</div>
													<div className="col-span-3">Phone Number</div>
												</div>
												{users.map((user, indexUser) => (
													<div key={indexUser} className="grid grid-cols-12 px-4 py-1 rounded-xl items-center hover:bg-background">
														<div className="col-span-3 text-sm">{user.name}</div>
														<div className="col-span-3 text-sm truncate">{user.email}</div>
														<div className="col-span-3">{user.phone}</div>
													</div>
												))}
											</div>
										) : (
											<div className="flex flex-col gap-2 justify-center items-center">
												<p>No unassigned users found</p>
												<CreateUserModal />
											</div>
										)}
									</TabsContent>

									<TabsContent value="tickets">
										{ticketsIsLoading ? (
											<div className="space-y-2">
												<Skeleton className="h-6 w-full" />
												<Skeleton className="h-10 w-full" />
												<Skeleton className="h-10 w-full" />
												<Skeleton className="h-10 w-full" />
											</div>
										) : tickets.length > 0 ? (
											<div className="flex flex-col">
												<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
													<div className="col-span-3">ID</div>
													<div className="col-span-6">Title</div>
													<div className="col-span-3">Status</div>
												</div>
												{tickets.map((ticket, indexTicket) => (
													<div key={indexTicket} className="grid grid-cols-12 px-4 py-1 rounded-xl items-center hover:bg-background">
														<div className="col-span-3 text-sm">{ticket.id}</div>
														<div className="col-span-6 text-sm">{ticket.title}</div>
														<div className="col-span-3">
															<span
																className={`px-2 py-1 rounded-full text-xs ${
																	ticket.status === "open"
																		? "bg-red-100 text-red-800"
																		: ticket.status === "in-progress"
																		? "bg-yellow-100 text-yellow-800"
																		: "bg-green-100 text-green-800"
																}`}>
																{ticket.status}
															</span>
														</div>
													</div>
												))}
											</div>
										) : (
											<div className="flex flex-col gap-2 justify-center items-center">
												<p>No tickets found for this company</p>
												<Button variant="outline">Create Ticket</Button>
											</div>
										)}
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>
					)}

					{!selectedCompany && !showUnassignedUsers ? (
						<Card>
							<CardContent className="py-6">
								<div className="flex flex-col gap-2 justify-center items-center">
									<p>Select a company on the left</p>
									<span>- or -</span>
									<div className="flex gap-2">
										<CreateCompanyModal />
										<CreateUserModal />
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						selectedCompany && (
							<Card>
								<CardContent className="pt-6">
									<Tabs defaultValue="users">
										<TabsList className="mb-4">
											<TabsTrigger value="users">Users</TabsTrigger>
											<TabsTrigger value="tickets">Tickets</TabsTrigger>
										</TabsList>

										<TabsContent value="users">
											{usersIsLoading ? (
												<div className="space-y-2">
													<Skeleton className="h-6 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
												</div>
											) : users.length > 0 ? (
												<div className="flex flex-col">
													<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
														<div className="col-span-3">Name</div>
														<div className="col-span-3">Email</div>
														<div className="col-span-3">Phone Number</div>
														<div className="col-span-3">Company</div>
													</div>
													{users.map((user, indexUser) => (
														<div
															key={indexUser}
															className="grid grid-cols-12 px-4 py-1 rounded-xl items-center hover:bg-background">
															<div className="col-span-3 text-sm">{user.name}</div>
															<div className="col-span-3 text-sm truncate">{user.email}</div>
															<div className="col-span-3">{user.phone}</div>
															<div className="col-span-3">{user.company?.name}</div>
														</div>
													))}
												</div>
											) : (
												<div className="flex flex-col gap-2 justify-center items-center">
													<p>No users found for this company</p>
													<CreateUserModal />
												</div>
											)}
										</TabsContent>

										<TabsContent value="tickets">
											{ticketsIsLoading ? (
												<div className="space-y-2">
													<Skeleton className="h-6 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
													<Skeleton className="h-10 w-full" />
												</div>
											) : tickets.length > 0 ? (
												<div className="flex flex-col">
													<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
														<div className="col-span-3">ID</div>
														<div className="col-span-6">Title</div>
														<div className="col-span-3">Status</div>
													</div>
													{tickets.map((ticket, indexTicket) => (
														<div
															key={indexTicket}
															className="grid grid-cols-12 px-4 py-1 rounded-xl items-center hover:bg-background">
															<div className="col-span-3 text-sm">{ticket.id}</div>
															<div className="col-span-6 text-sm">{ticket.title}</div>
															<div className="col-span-3">
																<span
																	className={`px-2 py-1 rounded-full text-xs ${
																		ticket.status === "open"
																			? "bg-red-100 text-red-800"
																			: ticket.status === "in-progress"
																			? "bg-yellow-100 text-yellow-800"
																			: "bg-green-100 text-green-800"
																	}`}>
																	{ticket.status}
																</span>
															</div>
														</div>
													))}
												</div>
											) : (
												<div className="flex flex-col gap-2 justify-center items-center">
													<p>No tickets found for this company</p>
													<Button variant="outline">Create Ticket</Button>
												</div>
											)}
										</TabsContent>
									</Tabs>
								</CardContent>
							</Card>
						)
					)}
				</div>
			</div>
		</div>
	);
}
