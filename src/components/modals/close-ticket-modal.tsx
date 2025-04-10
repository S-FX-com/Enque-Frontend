import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { ITicket } from "@/typescript/ticket";
import { ticketService } from "@/services/ticket";

interface Props {
	ticket: ITicket;
	onSuccess?: (updatedTicket: ITicket) => void;
	TriggerSize?: "default" | "sm" | "lg";
}

export function CloseTicketModal({ ticket, onSuccess, TriggerSize = "default" }: Props) {
	const [open, setOpen] = useState(false);
	const [isPending, setIsPending] = useState(false);

	const handleCloseTicket = async () => {
		setIsPending(true);

		const response = await ticketService.updateTicketById(ticket.id, { status: "Closed" });

		if (response.success) {
			toast.success("Success", {
				description: "Ticket has been closed.",
			});
			onSuccess?.({ ...ticket, status: "Closed" });
			setOpen(false);
		} else
			toast.error("Error", {
				description: "Failed to close the ticket.",
			});

		setIsPending(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size={TriggerSize} disabled={ticket.status === "Closed"}>
					<Check className="h-4 w-4" />
					Close Ticket
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Close Ticket</DialogTitle>
					<DialogDescription>Are you sure you want to close this ticket? This action cannot be undone.</DialogDescription>
				</DialogHeader>

				<div className="py-4 text-amber-600 flex items-center gap-2 mb-4">
					<AlertTriangle className="h-5 w-5" />
					<p>Once closed, the ticket will no longer be editable.</p>
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleCloseTicket} variant="destructive" disabled={isPending}>
						{isPending ? "Closing..." : "Close Ticket"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
