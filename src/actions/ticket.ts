"use server";

import { PlatformConfigs } from "@/configs";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { ticketService } from "@/services/ticket";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type CreateTicketFormState = {
	success?: boolean;
	errors?: {
		title?: string[];
		description?: string[];
		status?: string[];
		priority?: string[];
		assigneeId?: string[];
		dueDate?: string[];
		_form?: string[];
	};
	message?: string;
	values?: {
		title?: string;
		description?: string;
		status?: string;
		priority?: string;
		assigneeId?: string;
		dueDate?: string;
	};
};

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

export async function CreateTicket(prevState: CreateTicketFormState, formData: FormData) {
	const title = formData.get("title") as string;
	const description = formData.get("description") as string;
	const status = formData.get("status") as string;
	const priority = formData.get("priority") as string;
	const assigneeId = formData.get("assigneeId") as string;
	const dueDate = formData.get("dueDate") as string;

	const values = {
		title,
		description,
		status,
		priority,
		assigneeId,
		dueDate,
	};

	const validation = CreateTicketSchema.safeParse(values);
	if (!validation.success)
		return {
			success: false,
			errors: validation.error.flatten().fieldErrors,
			values,
		};

	try {
		const response = await ticketService.createTicket(values);
		if (!response.success)
			return {
				success: false,
				errors: {
					_form: [response.message || "Failed to create ticket"],
				},
				values,
			};

		const headersList = await headers();
		const host = headersList.get("host");
		redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/tickets");
	} catch (error) {
		return {
			success: false,
			errors: {
				_form: ["An unexpected error occurred. Please try again."],
			},
			values,
		};
	}
}
