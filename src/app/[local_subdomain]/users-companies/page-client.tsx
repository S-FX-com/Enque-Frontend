"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { IUser } from "@/typescript/user";
import { useEffect, useState } from "react";
import { ICompany } from "@/typescript/company";
import { toast } from "sonner";
import { companyService } from "@/services/company";
import { userService } from "@/services/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CompanyDetails } from "./company-details";

export default function ClientPage() {
	const [companies, setCompanies] = useState<ICompany[]>([]);
	const [companiesIsLoading, setCompaniesIsLoading] = useState<boolean>(true);
	const [users, setUsers] = useState<IUser[]>([]);
	const [usersIsLoading, setUsersIsLoading] = useState<boolean>(true);
	const [selectedCompany, setSelectedCompany] = useState<ICompany | null>(null);

	useEffect(() => {
		const loadCompanies = async () => {
			try {
				const response = await companyService.getCompanies({});
				if (response.success) {
					setCompanies(response.data as ICompany[]);
					console.log(response);
				} else {
					toast.error("Error", {
						description: response.message || "Failed to load companies",
					});
				}
			} catch (error: unknown) {
				console.error("Failed to load companies:", error);
				toast.error("Error", {
					description: "Failed to load companies. Please try again.",
				});
			} finally {
				setCompaniesIsLoading(false);
			}
		};

		const loadUsers = async () => {
			try {
				const response = await userService.getUsers({});
				if (response.success) {
					setUsers(response.data as IUser[]);
				} else {
					toast.error("Error", {
						description: response.message || "Failed to load users",
					});
				}
			} catch (error: unknown) {
				console.error("Failed to load users:", error);
				toast.error("Error", {
					description: "Failed to load users. Please try again.",
				});
			} finally {
				setUsersIsLoading(false);
			}
		};

		loadCompanies();
		loadUsers();
	}, []);

	const handleSelectCompany = (company: ICompany) => {
		if (selectedCompany !== company) setSelectedCompany(company);
		else setSelectedCompany(null);
	};

	const usersByCompany = () => {
		if (!selectedCompany) return [];
		return users.filter((user) => user.company.id === selectedCompany.id);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex gap-2">
				<Button variant="default" size="sm">
					Unassigned Users
				</Button>
				<Button variant="default" size="sm">
					Add a Company
				</Button>
				<Button variant="default" size="sm">
					Add a User
				</Button>
			</div>

			<div className="flex gap-4">
				<Card className="w-full max-w-2xs">
					<CardHeader>
						<CardTitle>
							<h2 className="text-xl">Active Companies</h2>
						</CardTitle>
					</CardHeader>
					<CardContent>
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
										<div className={`w-8 h-8 rounded-full flex items-center justify-center ${company.color}`}>
											<Avatar className="h-8 w-8">
												{company?.logo ? (
													<AvatarImage src={company?.logo} alt={company?.name} />
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
					</CardContent>
				</Card>

				<div className="flex-1 flex flex-col gap-4">
					<CompanyDetails />

					<Card>
						<CardContent>
							{selectedCompany ? (
								<div className="flex flex-col">
									<div className="grid grid-cols-12 px-4 py-2 text-sm font-semibold">
										<div className="col-span-3">Name</div>
										<div className="col-span-3">Email</div>
										<div className="col-span-3">Phone Number</div>
										<div className="col-span-3">Company</div>
									</div>
									{usersByCompany(selectedCompany.id).map((user, indexUser) => (
										<div key={indexUser} className="grid grid-cols-12 px-4 py-1 rounded-xl items-center hover:bg-background">
											<div className="col-span-3 text-sm">{user.name}</div>
											<div className="col-span-3 text-sm truncate">{user.email}</div>
											<div className="col-span-3">{user.phone}</div>
											<div className="col-span-3">{user.company.name}</div>
										</div>
									))}
								</div>
							) : (
								<div className="flex flex-col gap-2 justify-center items-center">
									<p>Select a company on the left</p>
									<span>- or -</span>
									<div className="flex gap-2">
										<Button variant="default" size="sm">
											Add a Company
										</Button>
										<Button variant="default" size="sm">
											Add a User
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
