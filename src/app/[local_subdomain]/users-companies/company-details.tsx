"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Users, Trash2 } from "lucide-react";
import { ICompany } from "@/typescript/company";
import { IUser } from "@/typescript/user";

interface Props {
	company: ICompany;
	companyUsers: IUser[];
}

export function CompanyDetails({ company, companyUsers }: Props) {
	const [companyName, setCompanyName] = useState(company.name);
	const [description, setDescription] = useState("Ok ok ok ...");
	const [primaryContact, setPrimaryContact] = useState("Alexis Cuevas");
	const [accountManager, setAccountManager] = useState("Alexis Cuevas");
	const [emailDomain, setEmailDomain] = useState(company.email_domain);

	useEffect(() => {
		setCompanyName(company.name);
		setEmailDomain(company.email_domain);
	}, [company]);

	return (
		<Card className="w-full">
			<CardContent className="p-6">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="space-y-6">
						<div className="flex items-center gap-2">
							<div className="bg-purple-100 text-purple-800 h-10 w-10 flex items-center justify-center rounded-md font-bold text-xl">
								{company.name.substring(0, 2).toUpperCase()}
							</div>
							<div className="flex items-center">
								<span className="font-medium">{companyName}</span>
								<button className="ml-2 text-gray-400 hover:text-gray-600">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round">
										<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
									</svg>
								</button>
							</div>
						</div>
					</div>

					<div className="flex gap-2">
						<div className="space-y-2">
							<div className="flex items-center">
								<Label htmlFor="primary-contact">Primary contact</Label>
								<button className="ml-1 text-gray-400 hover:text-gray-600">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round">
										<circle cx="12" cy="12" r="10" />
										<path d="M12 16v-4" />
										<path d="M12 8h.01" />
									</svg>
								</button>
							</div>
							<Select value={primaryContact} onValueChange={setPrimaryContact}>
								<SelectTrigger>
									<SelectValue placeholder="Select contact" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Alexis Cuevas">Alexis Cuevas</SelectItem>
									<SelectItem value="Smith, John">Smith, John</SelectItem>
									<SelectItem value="Johnson, Emily">Johnson, Emily</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<div className="flex items-center">
								<Label htmlFor="account-manager">Account manager</Label>
								<button className="ml-1 text-gray-400 hover:text-gray-600">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round">
										<circle cx="12" cy="12" r="10" />
										<path d="M12 16v-4" />
										<path d="M12 8h.01" />
									</svg>
								</button>
							</div>
							<Select value={accountManager} onValueChange={setAccountManager}>
								<SelectTrigger>
									<SelectValue placeholder="Select manager" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Alexis Cuevas">Alexis Cuevas</SelectItem>
									<SelectItem value="Maria Rodriguez">Maria Rodriguez</SelectItem>
									<SelectItem value="Alex Chen">Alex Chen</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-6">
						<div className="flex justify-between items-start">
							<div className="space-y-2">
								<h3 className="font-medium">Statistics</h3>
								<div className="flex items-center gap-1 text-sm">
									<Ticket className="h-4 w-4" />
									<span>0 Open Tickets</span>
								</div>
								<div className="flex items-center gap-1 text-sm">
									<Users className="h-4 w-4" />
									<span>{companyUsers.length} Users</span>
								</div>
							</div>
							<Button variant="destructive" size="sm">
								<Trash2 className="h-4 w-4 mr-1" />
								Delete
							</Button>
						</div>
					</div>
				</div>

				<div className="mt-6">
					<div className="space-y-2">
						<div className="flex items-center">
							<Label htmlFor="email-domain">Email domain</Label>
							<button className="ml-1 text-gray-400 hover:text-gray-600">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round">
									<circle cx="12" cy="12" r="10" />
									<path d="M12 16v-4" />
									<path d="M12 8h.01" />
								</svg>
							</button>
						</div>
						<Input id="email-domain" value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} />
					</div>
				</div>

				<div className="mt-6">
					<Label htmlFor="description">Description</Label>
					<div className="mt-2">
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="min-h-[100px]"
							placeholder="Add a description..."
						/>
						<div className="text-right text-sm text-muted-foreground mt-1">{description.length}/150</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
