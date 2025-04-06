"use server";

import { ticketService } from "@/services/ticket";
import { FormState } from "@/typescript";
import { ICreateTicket } from "@/typescript/ticket";
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
	const status = formData.get("status") as string;
	const priority = formData.get("priority") as string;
	const assigneeId = formData.get("assigneeId") as string;
	const dueDate = formData.get("dueDate") as string;

	const values = { title, description, status, priority, assigneeId, dueDate };

	const validation = CreateTicketSchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await ticketService.createTicket(values);
	if (!response.success)
		return {
			success: false,
			errors: {
				_form: [response.message as string],
			},
			values,
		};

	return { success: true };
}
