"use client";

import { useState } from "react";
import { useActionState } from "react";
import { CreateUser, type CreateUserFormState } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const initialState: CreateUserFormState = {};

export function CreateUserModal() {
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<CreateUserFormState>(CreateUser, initialState);

	if (state.success && open) {
		toast("User added successfully", {
			description: "The user has been added to the system.",
		});
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="default">Add User</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add User</DialogTitle>
					<DialogDescription>Enter the user details below to add a new user.</DialogDescription>
				</DialogHeader>

				<form action={formAction} className="grid gap-4 py-4">
					{state.errors?._form && (
						<Alert variant="destructive">
							<AlertDescription>{state.errors._form[0]}</AlertDescription>
						</Alert>
					)}

					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input id="name" name="name" />
						{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" name="email" type="email" />
						{state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="phone">Phone</Label>
						<Input id="phone" name="phone" />
						{state.errors?.phone && <p className="text-sm text-destructive">{state.errors.phone[0]}</p>}
					</div>

					<div className="grid gap-2">
						<Label htmlFor="company_id">Company ID</Label>
						<Input id="company_id" name="company_id" type="number" />
						{state.errors?.company_id && <p className="text-sm text-destructive">{state.errors.company_id[0]}</p>}
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
							{isPending ? "Adding..." : "Add User"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
