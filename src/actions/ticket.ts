"use server";

import { ticketService } from "@/services/ticket";
import { FormState } from "@/typescript";
import { ICreateTicket } from "@/typescript/ticket";
import { z } from "zod";

export type CreateTicketFormState = FormState<ICreateTicket>;

/** Create ticket - Schema */
const CreateTicketSchema = z.object({
	title: z.string().min(1, { message: "Title is required" }),
	description: z.string().min(1, { message: "Description is required" }),
	status: z.enum(["Unread", "Open", "Closed"], { required_error: "Status is required" }),
	priority: z.enum(["Low", "Medium", "High"], { required_error: "Priority is required" }),
	due_date: z.string().optional(),
	workspace_id: z.number({ required_error: "Workspace ID is required" }),
	team_id: z.number().optional(),
	company_id: z.number().optional(),
	user_id: z.number({ required_error: "User ID is required" }),
	sent_from_id: z.number({ required_error: "Sender ID is required" }),
	sent_to_id: z.number({ required_error: "Recipient ID is required" }),
});

/** Create ticket - Action */
export async function CreateTicket(prevState: CreateTicketFormState, formData: FormData) {
	const title = formData.get("title") as any;
	const description = formData.get("description") as any;
	const status = formData.get("status") as any;
	const priority = formData.get("priority") as any;
	const due_date = (formData.get("due_date") ? formData.get("due_date") : undefined) as any;
	const workspace_id = (formData.get("workspace_id") ? Number(formData.get("workspace_id")) : undefined) as any;
	const team_id = (formData.get("team_id") ? Number(formData.get("team_id")) : undefined) as any;
	const company_id = (formData.get("company_id") ? Number(formData.get("company_id")) : undefined) as any;
	const user_id = (formData.get("user_id") ? Number(formData.get("user_id")) : undefined) as any;
	const sent_from_id = (formData.get("sent_from_id") ? Number(formData.get("sent_from_id")) : undefined) as any;
	const sent_to_id = (formData.get("sent_to_id") ? Number(formData.get("sent_to_id")) : undefined) as any;

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
