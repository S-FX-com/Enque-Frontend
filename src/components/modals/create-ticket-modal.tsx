"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApp } from "@/hooks/use-app";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CreateTicket, CreateTicketFormState } from "@/actions/ticket";
import { Textarea } from "../ui/textarea";

const initialState: CreateTicketFormState = {};

interface Props {
	TriggerSize?: "default" | "sm" | "lg";
}

export function CreateTicketModal({ TriggerSize = "default" }: Props) {
	const { currentWorkspace } = useApp();
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<CreateTicketFormState>(CreateTicket, initialState);
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
					Add Ticket
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Ticket</DialogTitle>
					<DialogDescription>Enter the ticket details below to add a new ticket.</DialogDescription>
				</DialogHeader>

				<form action={handleSubmit} className="space-y-8">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="title">Title</Label>
							<Input id="title" name="title" placeholder="Ticket title" defaultValue={state.values?.title || ""} />
							{state.errors?.title && <p className="text-sm text-destructive">{state.errors.title[0]}</p>}
							<p className="text-sm text-muted-foreground">A clear and concise title for your ticket.</p>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								name="description"
								placeholder="Describe the ticket"
								className="resize-none"
								defaultValue={state.values?.description || ""}
							/>
							{state.errors?.description && <p className="text-sm text-destructive">{state.errors.description[0]}</p>}
							<p className="text-sm text-muted-foreground">A detailed description of what needs to be done.</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="assigneeId">Assigned to</Label>
								<Select name="assigneeId" defaultValue={state.values?.assigneeId || ""}>
									<SelectTrigger id="assigneeId">
										<SelectValue placeholder="Select a team member" />
									</SelectTrigger>
									<SelectContent>
										{[].map((member) => (
											<SelectItem key={member.id} value={member.id}>
												{member.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{state.errors?.assigneeId && <p className="text-sm text-destructive">{state.errors.assigneeId[0]}</p>}
								<p className="text-sm text-muted-foreground">The person responsible for this ticket.</p>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="status">Status</Label>
								<Select name="status" defaultValue={state.values?.status || ""}>
									<SelectTrigger id="status">
										<SelectValue placeholder="Select a status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Pending">Pending</SelectItem>
										<SelectItem value="In progress">In progress</SelectItem>
										<SelectItem value="Completed">Completed</SelectItem>
									</SelectContent>
								</Select>
								{state.errors?.status && <p className="text-sm text-destructive">{state.errors.status[0]}</p>}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="priority">Priority</Label>
								<Select name="priority" defaultValue={state.values?.priority || ""}>
									<SelectTrigger id="priority">
										<SelectValue placeholder="Select a priority" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Low">Low</SelectItem>
										<SelectItem value="Medium">Medium</SelectItem>
										<SelectItem value="High">High</SelectItem>
									</SelectContent>
								</Select>
								{state.errors?.priority && <p className="text-sm text-destructive">{state.errors.priority[0]}</p>}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="dueDate">Due date</Label>
								<Input id="dueDate" name="dueDate" type="date" defaultValue={state.values?.dueDate || ""} />
								{state.errors?.dueDate && <p className="text-sm text-destructive">{state.errors.dueDate[0]}</p>}
							</div>
						</div>
					</div>

					<Button type="submit" disabled={isPending}>
						{isPending ? "Creating..." : "Create ticket"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
