"use client";

import { useState } from "react";
import { useActionState } from "react";
import { CreateCompany, type CreateCompanyFormState } from "@/actions/company";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const initialState: CreateCompanyFormState = {};

export function CreateCompanyModal() {
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<CreateCompanyFormState>(CreateCompany, initialState);

	if (state.success && open) {
		toast("Company added successfully", {
			description: "The company has been added to the system.",
		});
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="default">Add Company</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Company</DialogTitle>
					<DialogDescription>Enter the company details below to add a new company.</DialogDescription>
				</DialogHeader>

				<form action={formAction} className="grid gap-4 py-4">
					{state.errors?._form && (
						<Alert variant="destructive">
							<AlertDescription>{state.errors._form[0]}</AlertDescription>
						</Alert>
					)}

					<div className="grid gap-2">
						<Label htmlFor="name">Company Name</Label>
						<Input id="name" name="name" />
						{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="logo_url">Logo URL</Label>
						<Input id="logo_url" name="logo_url" />
						{state.errors?.logo_url && <p className="text-sm text-destructive">{state.errors.logo_url[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="email_domain">Email Domain</Label>
						<Input id="email_domain" name="email_domain" />
						{state.errors?.email_domain && <p className="text-sm text-destructive">{state.errors.email_domain[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="workspace_id">Workspace ID</Label>
						<Input id="workspace_id" name="workspace_id" type="number" />
						{state.errors?.workspace_id && <p className="text-sm text-destructive">{state.errors.workspace_id[0]}</p>}
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Adding..." : "Add Company"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
