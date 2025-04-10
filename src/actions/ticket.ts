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
	workspace_id: z
		.string()
		.transform(Number)
		.pipe(z.number().min(1, { message: "Workspace is required" })),
	user_id: z
		.string()
		.transform(Number)
		.pipe(z.number().min(1, { message: "User is required" })),
	sent_from_id: z
		.string()
		.transform(Number)
		.pipe(z.number().min(1, { message: "Sender is required" })),
	sent_to_id: z
		.string()
		.transform(Number)
		.pipe(z.number().min(1, { message: "Recipient is required" })),
	team_id: z
		.string()
		.optional()
		.transform((val) => (val ? Number(val) : undefined)),
	company_id: z
		.string()
		.optional()
		.transform((val) => (val ? Number(val) : undefined)),
});

/** Create ticket - Action */
export async function CreateTicket(prevState: CreateTicketFormState, formData: FormData) {
	const title = formData.get("title") as any;
	const description = formData.get("description") as any;
	const status = formData.get("status") as any;
	const priority = formData.get("priority") as any;
	const due_date = formData.get("due_date") as any;
	const workspace_id = formData.get("workspace_id") as any;
	const team_id = formData.get("team_id") as any;
	const company_id = formData.get("company_id") as any;
	const user_id = formData.get("user_id") as any;
	const sent_from_id = formData.get("sent_from_id") as any;
	const sent_to_id = formData.get("sent_to_id") as any;

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
