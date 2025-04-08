"use client";

import type React from "react";
import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { CreateAgent, type CreateAgentFormState } from "@/actions/agent";
import { useApp } from "@/hooks/use-app";

const initialState: CreateAgentFormState = {};

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
	const { currentWorkspace } = useApp();
	const [state, formAction, isPending] = useActionState<CreateAgentFormState>(CreateAgent, initialState);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="">
				<CardHeader>
					<CardTitle className="text-2xl">Create your account</CardTitle>
					<CardDescription>Enter your information below to create your account</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction} className="grid gap-4">
						<input type="hidden" name="workspace_id" value={currentWorkspace?.id} />

						{state.errors?._form && (
							<Alert variant="destructive">
								<AlertDescription>{state.errors._form[0]}</AlertDescription>
							</Alert>
						)}
						<div className="grid gap-2">
							<Label htmlFor="name">Full name</Label>
							<Input id="name" name="name" type="text" required />
							{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input id="email" name="email" type="email" required />
							{state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input id="password" name="password" type="password" required />
							{state.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
						</div>
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Signing..." : "Sign Up"}
						</Button>
					</form>
					<div className="mt-4 text-center text-sm">
						Already have an account?{" "}
						<Link href="/signin" className="underline">
							Sign In
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
