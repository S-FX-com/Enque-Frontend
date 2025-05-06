"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppConfigs } from "@/configs";
import { Loader2, AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [hostname, setHostname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setHostname(host);
      
      const isSubdomainSite = host !== AppConfigs.baseUrl && host.endsWith(AppConfigs.domain);
      setIsSubdomain(isSubdomainSite);
      
      if (isSubdomainSite) {
        const timer = setTimeout(() => {
          router.push("/signin");
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedSubdomain = subdomain.trim();
    if (!trimmedSubdomain) return;

    setIsSubmitting(true);
    setSubdomainError(null);

    const workspaceCheckUrl = `${AppConfigs.api}/workspaces/subdomain/${trimmedSubdomain}`;

    try {
      console.log(`Checking workspace existence: ${workspaceCheckUrl}`);
      const response = await fetch(workspaceCheckUrl);
      console.log(`Workspace check response status: ${response.status}`);

      if (response.ok) {
        const targetHostname = `${trimmedSubdomain}.${AppConfigs.domain.substring(1)}`;
        const targetUrl = `https://${targetHostname}/signin`;
        console.log(`Workspace valid. Redirecting to: ${targetUrl}`);
        window.location.href = targetUrl; 
        return;

      } else if (response.status === 404) {
        console.log(`Workspace '${trimmedSubdomain}' not found.`);
        setSubdomainError(`Workspace "${trimmedSubdomain}" not found. Please check the subdomain and try again.`);
      } else {
        console.error(`API error checking workspace: ${response.status} ${response.statusText}`);
        setSubdomainError("An error occurred while checking the workspace. Please try again later.");
      }
    } catch (error) {
      console.error("Network or fetch error checking workspace:", error);
      setSubdomainError("Could not connect to the server to check the workspace. Please check your network connection.");
    }

    setIsSubmitting(false);
  };

  if (isSubdomain) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
        <div className="flex flex-col items-center max-w-md w-full space-y-10 py-10 text-center">
          <div className="space-y-4">
            <h1 className="text-xl font-semibold">Redirecting to login...</h1>
            <p className="text-sm text-slate-500">
            We detected you&apos;re accessing from the subdomain <strong>{hostname}</strong>
            </p>
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-[#F4F7FE]"> 
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md"> 
        <div className="flex flex-col gap-6"> 
          <div className="flex justify-center">
            <Image 
              src="/enque.png"
              alt="Enque Logo" 
              width={120}
              height={40}
              priority
            />
          </div>
          <div className="flex flex-col gap-1.5 text-center"> 
            <p className="text-balance text-sm text-muted-foreground">
              Enter your workspace subdomain
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative w-full">
            <div className="flex">
              <Input
                placeholder="subdomain"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="pr-[90px]"
                required
                disabled={isSubmitting}
              />
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-sm text-slate-500 bg-slate-50 border-l border-slate-200 rounded-r-md">
                .enque.cc
              </div>
            </div>
            {subdomainError && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                {subdomainError}
              </div>
            )}
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing... 
              </span>
            ) : (
              "Continue"
            )}
            </Button>
          </form>
        </div> 
      </div> 
    </div>
  );
}
