import { AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { useActionState, useEffect, useState } from "react";
import { DeleteCompany, DeleteCompanyFormState } from "@/actions/company";
import { toast } from "sonner";
import { ICompany } from "@/typescript/company";

const initialState: DeleteCompanyFormState = {};

interface Props {
	company: ICompany;
}

export function DeleteCompanyModal({ company }: Props) {
	const [open, setOpen] = useState(false);
	const [state, formAction, isPending] = useActionState<DeleteCompanyFormState>(DeleteCompany, initialState);

	useEffect(() => {
		if (state.success) {
			toast.success("Success", {
				description: state.message,
			});
			setOpen(false);
		}
	}, [state.success, state.message]);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
					<Trash2 className="h-4 w-4 mr-1" />
					Delete
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Company</DialogTitle>
					<DialogDescription>Are you sure you want to delete {company.name}? This action cannot be undone.</DialogDescription>
				</DialogHeader>

				<form action={formAction} className="py-4">
					{state.errors?._form && (
						<Alert variant="destructive" className="mb-4">
							<AlertDescription>{state.errors._form[0]}</AlertDescription>
						</Alert>
					)}

					<input type="hidden" name="id" value={company.id} />

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
