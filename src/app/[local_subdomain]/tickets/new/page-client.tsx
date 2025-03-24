import { CreateTicketForm } from "@/components/forms/create-ticket-form";
import { Suspense } from "react";

export default function CreateTicketClientPage() {
	return (
		<div className="px-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight text-[#2B3674]">Create Ticket</h1>
				<p className="text-[#2B3674]">Add a new ticket to your workspace.</p>
			</div>
			<div className="bg-white rounded-xl shadow-sm p-6">
				<Suspense>
					<CreateTicketForm />
				</Suspense>
			</div>
		</div>
	);
}
