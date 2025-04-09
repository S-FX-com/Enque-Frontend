"use client";

import { Logo } from "@/components/brand";
import { WorkspaceForm } from "@/components/forms/workspace-form";

export default function WorkspacePage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Logo />
				<WorkspaceForm />
			</div>
		</div>
	);
}
