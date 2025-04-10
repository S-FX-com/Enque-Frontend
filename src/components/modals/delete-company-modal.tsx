import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useActionState, useEffect, useState } from "react";
import { DeleteCompany, DeleteCompanyFormState } from "@/actions/company";
import { toast } from "sonner";
import { ICompany } from "@/typescript/company";

const initialState: DeleteCompanyFormState = {};

interface Props {
	company: ICompany;
	TriggerSize?: "default" | "sm" | "lg";
}

export function DeleteCompanyModal({ company, TriggerSize = "default" }: Props) {
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<DeleteCompanyFormState>(DeleteCompany, initialState);
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
				<Button size={TriggerSize} variant="destructive">
					<Trash2 className="h-4 w-4 mr-1" />
					Delete
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Company</DialogTitle>
					<DialogDescription>Are you sure you want to delete {company.name}? This action cannot be undone.</DialogDescription>
				</DialogHeader>

				<form action={handleSubmit} className="py-4">
					<input type="hidden" name="company_id" value={String(company.id || "")} />

					<div className="flex items-center gap-2 text-amber-600 mb-4">
						<AlertTriangle className="h-5 w-5" />
						<p>This will delete all associated data including users and tickets.</p>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button type="submit" variant="destructive" disabled={isPending}>
							{isPending ? "Deleting..." : "Delete Company"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
