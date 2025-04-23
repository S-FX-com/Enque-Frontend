"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppConfigs } from "@/configs";
import { Loader2, AlertCircle } from "lucide-react"; // Import AlertCircle for error icon

export default function Home() {
  const router = useRouter();
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [hostname, setHostname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subdomain, setSubdomain] = useState("");
  // Remove unused isNavigating state
  const [subdomainError, setSubdomainError] = useState<string | null>(null); // State for error message

  useEffect(() => {
    // Check if we're on a subdomain
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      setHostname(host);
      
      const isSubdomainSite = host !== AppConfigs.baseUrl && host.endsWith(AppConfigs.domain);
      setIsSubdomain(isSubdomainSite);
      
      // If we're on a subdomain, redirect to /signin after a short delay
      if (isSubdomainSite) {
        // setIsNavigating(true); // Remove assignment
        const timer = setTimeout(() => {
          router.push("/signin");
        }, 2000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  // Make handleSubmit async to await fetch
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedSubdomain = subdomain.trim();
    if (!trimmedSubdomain) return;

    setIsSubmitting(true);
    setSubdomainError(null); // Clear previous errors
    // setIsNavigating(false); // Remove assignment

    const workspaceCheckUrl = `${AppConfigs.api}/workspaces/subdomain/${trimmedSubdomain}`;

    try {
      console.log(`Checking workspace existence: ${workspaceCheckUrl}`);
      const response = await fetch(workspaceCheckUrl);
      console.log(`Workspace check response status: ${response.status}`);

      if (response.ok) {
        // Workspace exists, proceed to redirect (using hostname manipulation)
        // setIsNavigating(true); // Remove assignment
        const targetHostname = `${trimmedSubdomain}.${AppConfigs.domain.substring(1)}`; // Construct target hostname
        const targetUrl = `https://${targetHostname}/signin`; // Redirect directly to signin page
        console.log(`Workspace valid. Redirecting to: ${targetUrl}`);
        // Use window.location.href for cross-origin redirection
        window.location.href = targetUrl; 
        // Keep submitting state true during redirection attempt
        return; // Prevent further state changes below

      } else if (response.status === 404) {
        // Workspace not found
        console.log(`Workspace '${trimmedSubdomain}' not found.`);
        setSubdomainError(`Workspace "${trimmedSubdomain}" not found. Please check the subdomain and try again.`);
      } else {
        // Other API error
        console.error(`API error checking workspace: ${response.status} ${response.statusText}`);
        setSubdomainError("An error occurred while checking the workspace. Please try again later.");
      }
    } catch (error) {
      console.error("Network or fetch error checking workspace:", error);
      setSubdomainError("Could not connect to the server to check the workspace. Please check your network connection.");
    }

    // If we reach here, it means validation failed or redirection didn't happen
    setIsSubmitting(false);
    // setIsNavigating(false); // Remove assignment
  };

  // If we're on a subdomain (logic might need adjustment based on middleware changes)
  if (isSubdomain) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
        <div className="flex flex-col items-center max-w-md w-full space-y-10 py-10 text-center">
          <Brand />
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
          <Brand />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-bold tracking-tight">Go to workspace</h1>
          <p className="text-balance text-sm text-muted-foreground">
              Enter your workspace subdomain
            </p>
          </div>
          
        <form onSubmit={handleSubmit} className="space-y-8">
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
            {/* Display error message if it exists */}
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
            disabled={isSubmitting} // Disable button while submitting/redirecting
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {/* Simplified loading text */}
                Processing... 
              </span>
            ) : (
              "Continue"
            )}
            </Button>
          </form>
          
        {/* Removed the separate isNavigating message as feedback is now via button state */}
      </div>
    </div>
  );
}
