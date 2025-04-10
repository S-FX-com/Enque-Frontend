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
import { IUser } from "@/typescript/user";
import { ICompany } from "@/typescript/company";
import { ITeam } from "@/typescript/team";
import { IAgent } from "@/typescript/agent";

const initialState: CreateTicketFormState = {};

interface Props {
	TriggerSize?: "default" | "sm" | "lg";
	users: IUser[];
	companies: ICompany[];
	teams: ITeam[];
	agents: IAgent[];
}

export function CreateTicketModal({ TriggerSize = "default", users, companies, teams, agents }: Props) {
	const { currentAgent, currentWorkspace } = useApp();
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
					<input type="hidden" name="workspace_id" value={String(currentWorkspace?.id || "")} />
					<input type="hidden" name="sent_from_id" value={String(currentAgent?.id || "")} />

					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="title">Title</Label>
							<Input id="title" name="title" placeholder="Ticket title" defaultValue={state.values?.title || ""} />
							{state.errors?.title && <p className="text-sm text-destructive">{state.errors.title[0]}</p>}
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
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="user_id">User</Label>
								<Select name="user_id" defaultValue={String(state.values?.user_id || "")}>
									<SelectTrigger id="user_id">
										<SelectValue placeholder="Select a user" />
									</SelectTrigger>
									<SelectContent>
										{users.map((user) => (
											<SelectItem key={user.id} value={String(user.id || "")}>
												{user.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{state.errors?.user_id && <p className="text-sm text-destructive">{state.errors.user_id[0]}</p>}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="sent_to_id">Assign to</Label>
								<Select name="sent_to_id" defaultValue={String(state.values?.sent_to_id || "")}>
									<SelectTrigger id="sent_to_id">
										<SelectValue placeholder="Select a team member" />
									</SelectTrigger>
									<SelectContent>
										{agents.map((agent) => (
											<SelectItem key={agent.id} value={String(agent.id || "")}>
												{agent.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{state.errors?.sent_to_id && <p className="text-sm text-destructive">{state.errors.sent_to_id[0]}</p>}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="team_id">Team</Label>
								<Select name="team_id" defaultValue={String(state.values?.team_id || "")}>
									<SelectTrigger id="team_id">
										<SelectValue placeholder="Select a team" />
									</SelectTrigger>
									<SelectContent>
										{teams.map((team) => (
											<SelectItem key={team.id} value={String(team.id || "")}>
												{team.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="company_id">Company</Label>
								<Select name="company_id" defaultValue={String(state.values?.company_id || "")}>
									<SelectTrigger id="company_id">
										<SelectValue placeholder="Select a company" />
									</SelectTrigger>
									<SelectContent>
										{companies.map((company) => (
											<SelectItem key={company.id} value={String(company.id || "")}>
												{company.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="status">Status</Label>
								<Select name="status" defaultValue={state.values?.status || "Unread"}>
									<SelectTrigger id="status">
										<SelectValue placeholder="Select a status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="Unread">Unread</SelectItem>
										<SelectItem value="Open">Open</SelectItem>
										<SelectItem value="Closed">Closed</SelectItem>
									</SelectContent>
								</Select>
								{state.errors?.status && <p className="text-sm text-destructive">{state.errors.status[0]}</p>}
							</div>

							<div className="grid gap-2">
								<Label htmlFor="priority">Priority</Label>
								<Select name="priority" defaultValue={state.values?.priority || "Low"}>
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
						</div>

						<div className="grid gap-2">
							<Label htmlFor="due_date">Due date</Label>
							<Input id="due_date" name="due_date" type="date" defaultValue={state.values?.due_date || ""} />
							{state.errors?.due_date && <p className="text-sm text-destructive">{state.errors.due_date[0]}</p>}
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
