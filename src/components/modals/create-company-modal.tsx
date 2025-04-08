"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { CreateCompany, type CreateCompanyFormState } from "@/actions/company";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApp } from "@/hooks/use-app";

const initialState: CreateCompanyFormState = {};

interface Props {
	TriggerSize?: "default" | "sm" | "lg";
}

export function CreateCompanyModal({ TriggerSize = "default" }: Props) {
	const { currentWorkspace } = useApp();
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<CreateCompanyFormState>(CreateCompany, initialState);
	const [hasSubmitted, setHasSubmitted] = useState(false);

	useEffect(() => {
		if (!hasSubmitted) return;
		setHasSubmitted(false);

		if (state.success) {
			toast.success("Success", {
				description: state.message,
			});
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
					Add Company
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Company</DialogTitle>
					<DialogDescription>Enter the company details below to add a new company.</DialogDescription>
				</DialogHeader>

				<form action={handleSubmit} className="grid gap-4 py-4">
					<Input type="hidden" name="workspace_id" value={currentWorkspace?.id} />

					<div className="grid gap-2">
						<Label htmlFor="name">Company Name</Label>
						<Input id="name" name="name" defaultValue={state.values?.name || ""} />
						{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="description">Description (Optional)</Label>
						<Input id="description" name="description" defaultValue={state.values?.description || ""} />
						{state.errors?.description && <p className="text-sm text-destructive">{state.errors.description[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="logo_url">Logo URL (Optional)</Label>
						<Input id="logo_url" name="logo_url" defaultValue={state.values?.logo_url || ""} />
						{state.errors?.logo_url && <p className="text-sm text-destructive">{state.errors.logo_url[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="email_domain">Email Domain</Label>
						<Input id="email_domain" name="email_domain" defaultValue={state.values?.email_domain || ""} />
						{state.errors?.email_domain && <p className="text-sm text-destructive">{state.errors.email_domain[0]}</p>}
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
