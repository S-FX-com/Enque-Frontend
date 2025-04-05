"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Users, Trash2, Save, Pencil, Info } from "lucide-react";
import type { ICompany } from "@/typescript/company";
import type { IUser } from "@/typescript/user";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UpdateCompany, type CompanyFormState } from "@/actions/company";
import { toast } from "sonner";

interface Props {
	company: ICompany;
	companyUsers: IUser[];
}

const initialState: CompanyFormState = {};

export function CompanyDetails({ company, companyUsers }: Props) {
	// State for edit name modal
	const [editNameOpen, setEditNameOpen] = useState(false);
	const [newCompanyName, setNewCompanyName] = useState(company.name);

	// Form state using useActionState
	const [state, formAction, isPending] = useActionState<CompanyFormState>(UpdateCompany, initialState);

	// Track if there are unsaved changes
	const [hasChanges, setHasChanges] = useState(false);

	// Current form values
	const [formValues, setFormValues] = useState({
		name: company.name,
		description: "Ok ok ok ...",
		primaryContact: "Alexis Cuevas",
		accountManager: "Alexis Cuevas",
		emailDomain: company.email_domain || "",
	});

	// Update values when company changes
	useEffect(() => {
		setFormValues({
			name: company.name,
			description: "Ok ok ok ...",
			primaryContact: "Alexis Cuevas",
			accountManager: "Alexis Cuevas",
			emailDomain: company.email_domain || "",
		});
		setNewCompanyName(company.name);
	}, [company]);

	// Show success toast when action completes successfully
	useEffect(() => {
		if (state.success) {
			toast.success("Success", {
				description: state.message,
			});
			setHasChanges(false);
		}
	}, [state.success, state.message]);

	// Handle form value changes
	const handleChange = (field: string, value: string) => {
		setFormValues((prev) => {
			const newValues = { ...prev, [field]: value };

			// Check if values are different from original
			const originalValues = {
				name: company.name,
				description: "Ok ok ok ...",
				primaryContact: "Alexis Cuevas",
				accountManager: "Alexis Cuevas",
				emailDomain: company.email_domain || "",
			};

			setHasChanges(JSON.stringify(newValues) !== JSON.stringify(originalValues));

			return newValues;
		});
	};

	// Handle company name update from modal
	const handleUpdateCompanyName = () => {
		handleChange("name", newCompanyName);
		setEditNameOpen(false);
	};

	return (
		<>
			<Card className="w-full">
				<CardContent className="p-6">
					<form action={formAction}>
						{state.errors?._form && (
							<Alert variant="destructive" className="mb-6">
								<AlertDescription>{state.errors._form[0]}</AlertDescription>
							</Alert>
						)}

						{/* Hidden input for company ID */}
						<input type="hidden" name="id" value={company.id} />

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="space-y-6">
								<div className="flex items-center gap-2">
									<div className="bg-purple-100 text-purple-800 h-10 w-10 flex items-center justify-center rounded-md font-bold text-xl">
										{formValues.name.substring(0, 2).toUpperCase()}
									</div>
									<div className="flex items-center">
										<span className="font-medium">{formValues.name}</span>
										<button type="button" className="ml-2 text-gray-400 hover:text-gray-600" onClick={() => setEditNameOpen(true)}>
											<Pencil size={16} />
										</button>
									</div>
									<input type="hidden" name="name" value={formValues.name} />
									{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
								</div>
							</div>

							<div className="flex gap-2">
								<div className="space-y-2">
									<div className="flex items-center">
										<Label htmlFor="primaryContact">Primary contact</Label>
										<button type="button" className="ml-1 text-gray-400 hover:text-gray-600">
											<Info size={14} />
										</button>
									</div>
									<Select
										name="primaryContact"
										value={formValues.primaryContact}
										onValueChange={(value) => handleChange("primaryContact", value)}>
										<SelectTrigger id="primaryContact">
											<SelectValue placeholder="Select contact" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Alexis Cuevas">Alexis Cuevas</SelectItem>
											<SelectItem value="Smith, John">Smith, John</SelectItem>
											<SelectItem value="Johnson, Emily">Johnson, Emily</SelectItem>
										</SelectContent>
									</Select>
									{state.errors?.primaryContact && <p className="text-sm text-destructive">{state.errors.primaryContact[0]}</p>}
								</div>

								<div className="space-y-2">
									<div className="flex items-center">
										<Label htmlFor="accountManager">Account manager</Label>
										<button type="button" className="ml-1 text-gray-400 hover:text-gray-600">
											<Info size={14} />
										</button>
									</div>
									<Select
										name="accountManager"
										value={formValues.accountManager}
										onValueChange={(value) => handleChange("accountManager", value)}>
										<SelectTrigger id="accountManager">
											<SelectValue placeholder="Select manager" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="Alexis Cuevas">Alexis Cuevas</SelectItem>
											<SelectItem value="Maria Rodriguez">Maria Rodriguez</SelectItem>
											<SelectItem value="Alex Chen">Alex Chen</SelectItem>
										</SelectContent>
									</Select>
									{state.errors?.accountManager && <p className="text-sm text-destructive">{state.errors.accountManager[0]}</p>}
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
									<Button type="button" variant="destructive" size="sm">
										<Trash2 className="h-4 w-4 mr-1" />
										Delete
									</Button>
								</div>
							</div>
						</div>

						<div className="mt-6">
							<div className="space-y-2">
								<div className="flex items-center">
									<Label htmlFor="emailDomain">Email domain</Label>
									<button type="button" className="ml-1 text-gray-400 hover:text-gray-600">
										<Info size={14} />
									</button>
								</div>
								<Input
									id="emailDomain"
									name="emailDomain"
									value={formValues.emailDomain}
									onChange={(e) => handleChange("emailDomain", e.target.value)}
								/>
								{state.errors?.emailDomain && <p className="text-sm text-destructive">{state.errors.emailDomain[0]}</p>}
							</div>
						</div>

						<div className="mt-6">
							<Label htmlFor="description">Description</Label>
							<div className="mt-2">
								<Textarea
									id="description"
									name="description"
									value={formValues.description}
									onChange={(e) => handleChange("description", e.target.value)}
									className="min-h-[100px]"
									placeholder="Add a description..."
								/>
								<div className="text-right text-sm text-muted-foreground mt-1">{formValues.description.length}/150</div>
								{state.errors?.description && <p className="text-sm text-destructive">{state.errors.description[0]}</p>}
							</div>
						</div>

						{/* Save changes button - only appears when changes are detected */}
						{hasChanges && (
							<div className="mt-6 flex justify-end">
								<Button type="submit" disabled={isPending}>
									<Save className="h-4 w-4 mr-2" />
									{isPending ? "Saving..." : "Save Changes"}
								</Button>
							</div>
						)}
					</form>
				</CardContent>
			</Card>

			{/* Edit Company Name Modal */}
			<Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Company Name</DialogTitle>
					</DialogHeader>
					<div className="py-4">
						<Label htmlFor="company-name">Company Name</Label>
						<Input id="company-name" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="mt-2" />
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditNameOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleUpdateCompanyName}>Update</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
