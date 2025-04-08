"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { CreateUser, type CreateUserFormState } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApp } from "@/hooks/use-app";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ICompany } from "@/typescript/company";

const initialState: CreateUserFormState = {};

interface Props {
	companies: ICompany[];
	TriggerSize?: "default" | "sm" | "lg";
}

export function CreateUserModal({ companies, TriggerSize = "default" }: Props) {
	const { currentWorkspace } = useApp();
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<CreateUserFormState>(CreateUser, initialState);
	const [selectedCompany, setSelectedCompany] = useState<string>("");
	const [hasSubmitted, setHasSubmitted] = useState(false);

	useEffect(() => {
		if (!hasSubmitted) return;
		setHasSubmitted(false);

		if (state.success) {
			toast.success("Success", {
				description: state.message,
			});
			setSelectedCompany("");
			setOpen(false);
		} else if (!state.success && state.message && !state.errors) {
			toast.error("Error", {
				description: state.message,
			});
		}
	}, [state]);

	const handleSubmit = (formData: FormData) => {
		setHasSubmitted(true);
		return formAction(formData);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size={TriggerSize} variant="default">
					Add User
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
					<DialogDescription>Enter the user details below to add a new user.</DialogDescription>
				</DialogHeader>

				<form action={handleSubmit} className="grid gap-4 py-4">
					<Input type="hidden" name="workspace_id" value={currentWorkspace?.id} />

					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input id="name" name="name" defaultValue={state.values?.name || ""} />
						{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" name="email" type="email" defaultValue={state.values?.email || ""} />
						{state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="phone">Phone</Label>
						<Input id="phone" name="phone" defaultValue={state.values?.phone || ""} />
						{state.errors?.phone && <p className="text-sm text-destructive">{state.errors.phone[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="company_id">Company</Label>
						<Select value={selectedCompany} onValueChange={setSelectedCompany} name="company_id">
							<SelectTrigger id="company_id">
								<SelectValue placeholder="Select a company" />
							</SelectTrigger>
							<SelectContent>
								{companies.map((company) => (
									<SelectItem key={company.id} value={String(company.id)}>
										{company.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{state.errors?.company_id && <p className="text-sm text-destructive">{state.errors.company_id[0]}</p>}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Adding..." : "Add User"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
