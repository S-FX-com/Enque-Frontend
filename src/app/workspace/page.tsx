"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppConfigs } from "@/configs";
import { Loader2 } from "lucide-react";

// Componente interno que utiliza useSearchParams
function WorkspaceRedirector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    // Obtener el subdominio de los parámetros de búsqueda
    const subdomainParam = searchParams.get("subdomain");
    
    if (subdomainParam) {
      // Construir la URL del subdominio apuntando directamente a signin
      const subdomainUrl = `https://${subdomainParam}${AppConfigs.domain}/signin`;
      
      // Redirigir inmediatamente sin mostrar UI intermedia
      window.location.href = subdomainUrl;
    } else {
      // Si no hay subdominio, redirigir a la página principal
      router.push("/");
    }
  }, [searchParams, router]);
  
  // Retornar null (sin UI) porque la redirección ocurre inmediatamente
  return null;
}

// Componente principal con Suspense para manejar la carga
export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    }>
      <WorkspaceRedirector />
    </Suspense>
  );
} 