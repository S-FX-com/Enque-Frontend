"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppConfigs } from "@/configs";
import { Loader2 } from "lucide-react";

function WorkspaceRedirector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  useEffect(() => {
    const subdomainParam = searchParams.get("subdomain");
    
    if (subdomainParam) {
      const subdomainUrl = `https://${subdomainParam}${AppConfigs.domain}/signin`;
      window.location.href = subdomainUrl;
    } else {
      router.push("/");
    }
  }, [searchParams, router]);
  
  return null;
}

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
