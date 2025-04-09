"use client";

import { Logo } from "@/components/brand";
import { SignInForm } from "@/components/forms/signin-form";

export default function ClientPage() {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Logo />
				<SignInForm />
			</div>
		</div>
	);
}
