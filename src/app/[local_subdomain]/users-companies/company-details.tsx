"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ticket, Users, Save, Info } from "lucide-react";
import type { ICompany } from "@/typescript/company";
import type { IUser } from "@/typescript/user";
import { UpdateCompany, type UpdateCompanyFormState } from "@/actions/company";
import { toast } from "sonner";
import { DeleteCompanyModal } from "@/components/modals/delete-company-modal";
import { EditCompanyNameModal } from "@/components/modals/edit-company-name";

interface Props {
	company: ICompany;
	companyUsers: IUser[];
}

const initialUpdateState: UpdateCompanyFormState = {};

export function CompanyDetails({ company, companyUsers }: Props) {
	const [editCompanyNameOpen, setEditCompanyNameOpen] = useState(false);
	const [updateState, updateAction, isUpdatePending] = useActionState<UpdateCompanyFormState>(UpdateCompany, initialUpdateState);

	const initialFormValues = {
		name: company.name,
		description: "Ok ok ok ...",
		primaryContact: "Alexis Cuevas",
		accountManager: "Alexis Cuevas",
		email_domain: company.email_domain || "",
	};

	const [formValues, setFormValues] = useState(initialFormValues);
	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		setFormValues({
			...initialFormValues,
			name: company.name,
			email_domain: company.email_domain || "",
		});
	}, [company]);

	useEffect(() => {
		if (updateState.success) {
			toast.success("Success", {
				description: updateState.message,
			});
			setHasChanges(false);
		}
	}, [updateState.success, updateState.message]);

	const handleChange = (field: string, value: string) => {
		setFormValues((prev) => {
			const newValues = { ...prev, [field]: value };
			const hasChanged = JSON.stringify(newValues) !== JSON.stringify(initialFormValues);
			setHasChanges(hasChanged);

			return newValues;
		});
	};

	return (
		<Card className="w-full">
			<CardContent className="p-6">
				<form action={updateAction}>
					<input type="hidden" name="company_id" value={company.id} />
					<input type="hidden" name="name" value={formValues.name} />
					<input type="hidden" name="description" value={formValues.description} />
					<input type="hidden" name="logo_url" value={company.logo_url || ""} />

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-6">
							<div className="flex items-center gap-2">
								<div className="bg-purple-100 text-purple-800 h-10 w-10 flex items-center justify-center rounded-md font-bold text-xl">
									{formValues.name.substring(0, 2).toUpperCase()}
								</div>
								<div className="flex items-center">
									<span className="font-medium">{formValues.name}</span>
									<EditCompanyNameModal
										editCompanyNameOpen={editCompanyNameOpen}
										setEditCompanyNameOpen={setEditCompanyNameOpen}
										newCompanyName={formValues.name}
										setNewCompanyName={(name) => handleChange("name", name)}
										handleUpdateCompanyName={() => setEditCompanyNameOpen(false)}
									/>
								</div>
								{updateState.errors?.name && <p className="text-sm text-destructive">{updateState.errors.name[0]}</p>}
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
								<DeleteCompanyModal company={company} />
							</div>
						</div>
					</div>

					<div className="mt-6">
						<div className="space-y-2">
							<div className="flex items-center">
								<Label htmlFor="email_domain">Email domain</Label>
								<button type="button" className="ml-1 text-gray-400 hover:text-gray-600">
									<Info size={14} />
								</button>
							</div>
							<Input
								id="email_domain"
								name="email_domain"
								value={formValues.email_domain}
								onChange={(e) => handleChange("email_domain", e.target.value)}
							/>
							{updateState.errors?.email_domain && <p className="text-sm text-destructive">{updateState.errors.email_domain[0]}</p>}
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
							{updateState.errors?.description && <p className="text-sm text-destructive">{updateState.errors.description[0]}</p>}
						</div>
					</div>

					{hasChanges && (
						<div className="mt-6 flex justify-end">
							<Button type="submit" disabled={isUpdatePending}>
								<Save className="h-4 w-4 mr-2" />
								{isUpdatePending ? "Saving..." : "Save Changes"}
							</Button>
						</div>
					)}
				</form>
			</CardContent>
		</Card>
	);
}
