"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const formSchema = z.object({
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

export function CreateTicketForm() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: "",
			description: "",
			status: "Pending",
			priority: "Medium",
			assigneeId: "",
			dueDate: new Date().toISOString().split("T")[0],
		},
	});

	useEffect(() => {
		const fetchData = async () => {
			const teamMembersData = await getTeamMembers();
			setTeamMembers(teamMembersData);
		};
		fetchData();
	}, []);

	async function onSubmit(values: z.infer<typeof formSchema>) {
		setIsLoading(true);

		const formData = new FormData();
		formData.append("title", values.title);
		formData.append("description", values.description || "");
		formData.append("status", values.status);
		formData.append("priority", values.priority);
		formData.append("assigneeId", values.assigneeId);
		formData.append("dueDate", values.dueDate);

		const result = await createTask(formData);

		setIsLoading(false);

		if (result?.errors) {
			const fieldErrors = result.errors;
			Object.keys(fieldErrors).forEach((key) => {
				form.setError(key as keyof TaskFormValues, {
					// @ts-ignore
					message: fieldErrors[key]?.[0],
				});
			});
			return;
		}

		toast("Ticket created", {
			description: "Your ticket has been created successfully.",
		});

		router.push("/tickets");
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
				<FormField
					control={form.control}
					name="title"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Title</FormLabel>
							<FormControl>
								<Input placeholder="Ticket title" {...field} />
							</FormControl>
							<FormDescription>A clear and concise title for your ticket.</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea placeholder="Describe the ticket" className="resize-none" {...field} />
							</FormControl>
							<FormDescription>A detailed description of what needs to be done.</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<div className="grid gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="assigneeId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Assigned to</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select a team member" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{teamMembers.map((member) => (
											<SelectItem key={member.id} value={member.id}>
												{member.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormDescription>The person responsible for this ticket.</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Status</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select a status" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="Pending">Pending</SelectItem>
										<SelectItem value="In progress">In progress</SelectItem>
										<SelectItem value="Completed">Completed</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="priority"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Priority</FormLabel>
								<Select onValueChange={field.onChange} defaultValue={field.value}>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select a priority" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="Low">Low</SelectItem>
										<SelectItem value="Medium">Medium</SelectItem>
										<SelectItem value="High">High</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="dueDate"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Due date</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "Creating..." : "Create ticket"}
				</Button>
			</form>
		</Form>
	);
}
