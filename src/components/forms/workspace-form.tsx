"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { useActionState, useEffect, useState } from "react";
import { GoToWorkspace, type GoToWorkspaceFormState } from "@/actions/workspace";
import { AppConfigs } from "@/configs";
import { toast } from "sonner";

const initialState: GoToWorkspaceFormState = {};

export function WorkspaceForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
	const [state, formAction, isPending] = useActionState<GoToWorkspaceFormState>(GoToWorkspace, initialState);
	const [hasSubmitted, setHasSubmitted] = useState(false);

	useEffect(() => {
		if (!hasSubmitted) return;
		setHasSubmitted(false);

		if (!state.success && state.message && !state.errors)
			toast.error("Error", {
				description: state.message,
			});
	}, [state]);

	const handleSubmit = (formData: FormData) => {
		setHasSubmitted(true);
		return formAction(formData);
	};

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card>
				<CardHeader>
					<CardTitle className="text-2xl">Go to your workspace</CardTitle>
					<CardDescription>Enter your workspace details to access it</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={handleSubmit} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="local_subdomain">Workspace</Label>
							<div className="flex items-center">
								<Input
									id="local_subdomain"
									name="local_subdomain"
									className="rounded-r-none"
									defaultValue={state.values?.local_subdomain || ""}
								/>
								<div className="bg-muted px-3 h-9 flex items-center border border-l-0 border-input rounded-r-full">
									<span className="text-muted-foreground">{`.${AppConfigs.host}`}</span>
								</div>
							</div>
							{state.errors?.local_subdomain && <p className="text-sm text-destructive">{state.errors.local_subdomain[0]}</p>}
						</div>
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Going..." : "Go to workspace"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
