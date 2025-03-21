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

import { CreateUser, type CreateUserFormState } from "@/actions/user.action";

const initialState: CreateUserFormState = {};

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
	const [state, formAction, isPending] = useActionState<CreateUserFormState>(CreateUser, initialState);

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="">
				<CardHeader>
					<CardTitle className="text-2xl">Regístrese</CardTitle>
					<CardDescription>Introduzca su información a continuación para crear su cuenta</CardDescription>
				</CardHeader>
				<CardContent>
					<form action={formAction} className="grid gap-4">
						{state.errors?._form && (
							<Alert variant="destructive">
								<AlertDescription>{state.errors._form[0]}</AlertDescription>
							</Alert>
						)}
						<div className="grid gap-2">
							<Label htmlFor="name">Nombre completo</Label>
							<Input id="name" name="name" type="text" required />
							{state.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="email">Correo electrónico</Label>
							<Input id="email" name="email" type="email" placeholder="alex@ejemplo.com" required />
							{state.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Contraseña</Label>
							<Input id="password" name="password" type="password" required />
							{state.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
							<Input id="confirmPassword" name="confirmPassword" type="password" required />
							{state.errors?.confirmPassword && <p className="text-sm text-destructive">{state.errors.confirmPassword[0]}</p>}
						</div>
						<Button type="submit" className="w-full" disabled={isPending}>
							{isPending ? "Creando cuenta..." : "Crear cuenta"}
						</Button>
					</form>
					<div className="mt-4 text-center text-sm">
						¿Ya tiene cuenta?{" "}
						<Link href="/signin" className="underline">
							Inicie sesión
						</Link>
					</div>
				</CardContent>
			</Card>
			<div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
				Al hacer clic en Crear cuenta, acepta nuestras <a href="#">Condiciones de Uso</a> y <a href="#">Política de Privacidad</a>.
			</div>
		</div>
	);
}
