"use server";

import { ticketService } from "@/services/ticket";
import { FormState } from "@/typescript";
import { ICreateTicket, TicketPriority, TicketStatus } from "@/typescript/ticket";
import { z } from "zod";

export type CreateTicketFormState = FormState<ICreateTicket>;

/** Create ticket - Schema */
const CreateTicketSchema = z.object({
	title: z.string().min(1, { message: "Title is required" }),
	description: z.string().optional(),
	status: z.enum(["Pending", "In progress", "Completed"], {
		required_error: "Please select a status",
	}),
	priority: z.enum(["Low", "Medium", "High"], {
		required_error: "Please select a priority",
	}),
	assigneeId: z.string().min(1, { message: "Assignee is required" }),
	dueDate: z.string().min(1, { message: "Due date is required" }),
});

/** Create ticket - Action */
export async function CreateTicket(prevState: CreateTicketFormState, formData: FormData) {
	const title = formData.get("title") as string;
	const description = formData.get("description") as string;
	const status = formData.get("status") as TicketStatus;
	const priority = formData.get("priority") as TicketPriority;
	const due_date = formData.get("due_date") as string;
	const workspace_id = Number(formData.get("workspace_id"));
	const team_id = Number(formData.get("team_id"));
	const company_id = Number(formData.get("company_id"));
	const user_id = Number(formData.get("user_id"));
	const sent_from_id = Number(formData.get("sent_from_id"));
	const sent_to_id = Number(formData.get("sent_to_id"));

	const values = { title, description, status, priority, due_date, workspace_id, team_id, company_id, user_id, sent_from_id, sent_to_id };

	const validation = CreateTicketSchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await ticketService.createTicket(values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
		};

	return { success: true, message: "Ticket successfully created" };
}
