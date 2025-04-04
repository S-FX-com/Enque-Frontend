"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateTicket, type CreateTicketFormState } from "@/actions/ticket";

const initialState: CreateTicketFormState = {};

export function CreateTicketForm() {
	const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
	const [state, formAction, isPending] = useActionState<CreateTicketFormState>(CreateTicket, initialState);

	useEffect(() => {
		const fetchData = async () => {
			const teamMembersData = [];
			setTeamMembers(teamMembersData);
		};
		fetchData();
	}, []);

	return (
		<form action={formAction} className="space-y-8">
			{state.errors?._form && (
				<Alert variant="destructive">
					<AlertDescription>{state.errors._form[0]}</AlertDescription>
				</Alert>
			)}

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
								{teamMembers.map((member) => (
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
	);
}
