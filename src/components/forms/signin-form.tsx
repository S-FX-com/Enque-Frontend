"use client";

import type React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useActionState } from "react";
import { Auth, type AuthFormState } from "@/actions/auth.action";

const initialState: AuthFormState = {};

export function SignInForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
	const [state, formAction, isPending] = useActionState<AuthFormState>(Auth, initialState);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="">
				<CardHeader>
					<CardTitle className="text-2xl">Iniciar sesión</CardTitle>
					<CardDescription>Introduzca su dirección de correo electrónico para acceder a su cuenta</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction} className="grid gap-4">
						{state.errors?._form && (
							<Alert variant="destructive">
								<AlertDescription>{state.errors._form[0]}</AlertDescription>
							</Alert>
						)}
						<div className="grid gap-2">
							<Label htmlFor="email">Correo electrónico</Label>
							<Input id="email" name="email" type="email" placeholder="alex@ejemplo.com" required />
							{state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
						</div>
						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="password">Contraseña</Label>
								<Link href="/forgot" className="ml-auto inline-block underline-offset-4 text-sm hover:underline">
									¿Ha olvidado su contraseña?
								</Link>
							</div>
							<Input id="password" name="password" type="password" required />
							{state.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
						</div>
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Iniciando sesión..." : "Iniciar sesión"}
						</Button>
						<Button variant="outline" className="w-full" disabled={isPending}>
							Continuar con Google
						</Button>
					</form>
					<div className="mt-4 text-center text-sm">
						¿No tiene cuenta?{" "}
						<Link href="/signup" className="underline-offset-4 underline">
							Regístrese
						</Link>
					</div>
				</CardContent>
			</Card>
			<div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
				Al hacer clic en Continuar, acepta nuestras <a href="#">Condiciones de Uso</a> y <a href="#">Política de Privacidad</a>.
			</div>
		</div>
	);
}
