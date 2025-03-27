"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useActionState } from "react";
import { GoToWorkspace, type GoToWorkspaceFormState } from "@/actions/workspace";
import { AppConfigs } from "@/configs";

const initialState: GoToWorkspaceFormState = {};

export function WorkspaceForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
	const [state, formAction, isPending] = useActionState<GoToWorkspaceFormState>(GoToWorkspace, initialState);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="">
				<CardHeader>
					<CardTitle className="text-2xl">Go to your workspace</CardTitle>
					<CardDescription>Enter your workspace details to access it</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction} className="grid gap-4">
						{state.errors?._form && (
							<Alert variant="destructive">
								<AlertDescription>{state.errors._form[0]}</AlertDescription>
							</Alert>
						)}
						<div className="grid gap-2">
							<Label htmlFor="local_subdomain">Workspace</Label>
							<div className="flex items-center">
								<Input id="local_subdomain" name="local_subdomain" className="rounded-r-none" required />
								<div className="bg-muted px-3 py-2 h-10 flex items-center border border-l-0 border-input rounded-r-md">
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
