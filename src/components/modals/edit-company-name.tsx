import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface Props {
	editCompanyNameOpen: boolean;
	setEditCompanyNameOpen: (open: boolean) => void;
	newCompanyName: string;
	setNewCompanyName: (name: string) => void;
	handleUpdateCompanyName: () => void;
}

export function EditCompanyNameModal({ editCompanyNameOpen, setEditCompanyNameOpen, newCompanyName, setNewCompanyName, handleUpdateCompanyName }: Props) {
	return (
		<Dialog open={editCompanyNameOpen} onOpenChange={setEditCompanyNameOpen}>
			<DialogTrigger asChild>
				<button className="ml-2 text-gray-400 hover:text-gray-600">
					<Pencil size={16} />
				</button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Company Name</DialogTitle>
				</DialogHeader>
				<div className="py-4">
					<Label htmlFor="company-name">Company Name</Label>
					<Input id="company-name" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="mt-2" />
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setEditCompanyNameOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleUpdateCompanyName}>Update</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
