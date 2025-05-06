"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Import Image
// Removed Brand import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppConfigs } from "@/configs";
import { authService } from "@/services/auth";
import { workspaceService } from "@/services/workspace";
import { useDebounce } from "@/hooks/use-debounce";
import { RegisterData } from "@/services/auth";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<"available" | "unavailable" | "loading" | "empty" | "invalid">("empty");
  const [isSubdomain, setIsSubdomain] = useState(false);
  const [currentSubdomain, setCurrentSubdomain] = useState("");

  const debouncedSubdomain = useDebounce(subdomain, 500);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isSubdomainSite = host !== AppConfigs.baseUrl && host.endsWith(AppConfigs.domain);
      setIsSubdomain(isSubdomainSite);
      if (isSubdomainSite) {
        const subdomain = host.replace(AppConfigs.domain, "");
        setCurrentSubdomain(subdomain);
      }
    }
  }, []);

  const isSubdomainValid = (value: string) => {
    const regex = /^[a-z][a-z0-9-]*$/;
    return regex.test(value);
  };

  useEffect(() => {
    if (isSubdomain) return;

    const checkSubdomain = async () => {
      if (!debouncedSubdomain.trim()) {
        setSubdomainStatus("empty");
        return;
      }
      if (!isSubdomainValid(debouncedSubdomain)) {
        setSubdomainStatus("invalid");
        return;
      }
      setSubdomainStatus("loading");
      try {
        const response = await workspaceService.checkSubdomainAvailability(debouncedSubdomain);
        if (response.success && response.data) {
          setSubdomainStatus(response.data.available ? "available" : "unavailable");
        } else {
          setSubdomainStatus("unavailable");
        }
      } catch (error) {
        console.error("Error checking subdomain:", error);
        setSubdomainStatus("unavailable");
      }
    };
    checkSubdomain();
  }, [debouncedSubdomain, isSubdomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!isSubdomain) {
      if (subdomain.trim() === "") {
        toast.error("Subdomain is required");
        return;
      }
      if (subdomainStatus !== "available") {
        toast.error("Please choose an available and valid subdomain");
        return;
      }
    }

    setLoading(true);

    try {
      const registerData: RegisterData = {
        name,
        email,
        password,
      };

      if (!isSubdomain) {
        registerData.subdomain = subdomain;
      } else {
        registerData.subdomain = currentSubdomain;
      }

      const registerResponse = await authService.register(registerData);

      if (registerResponse.success) {
        toast.success("Registration successful! Redirecting to sign in...");
        setTimeout(() => {
            const signinUrl = isSubdomain
                ? `/signin`
                : `https://${subdomain}.${AppConfigs.domain.substring(1)}/signin`;
            window.location.href = signinUrl;
        }, 1500);
        return;
      } else {
        toast.error(registerResponse.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      toast.error("Error connecting to the server. Please try again later.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSubdomainStatusInfo = () => {
    switch (subdomainStatus) {
      case "available":
        return { color: "text-green-600", message: "Available" };
      case "unavailable":
        return { color: "text-red-600", message: "Unavailable" };
      case "loading":
        return { color: "text-blue-600", message: "Checking..." };
      case "invalid":
        return { color: "text-red-600", message: "Invalid format. Use only lowercase letters, numbers, and hyphens." };
      default:
        return { color: "", message: "" };
    }
  };

  const statusInfo = getSubdomainStatusInfo();

  return (
    // 1. Change background color
    <main className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F4F7FE]">
      {/* 2. Wrap content in white box */}
      <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md">
        {/* 3. Replace Brand and description with centered Image */}
        <div className="flex justify-center mb-6"> {/* Added margin-bottom */}
          <Image
            src="/enque.png"
            alt="Enque Logo"
            width={120}
            height={40}
            priority
          />
        </div>

        {/* Removed outer space-y-10 div */}
        <div className="w-full space-y-4"> {/* Adjusted spacing */}
          {/* Header div already removed */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {!isSubdomain && (
              <div className="space-y-2">
                <label htmlFor="subdomain" className="text-sm font-medium">
                  Workspace Subdomain
                </label>
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <Input
                      id="subdomain"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                      className="flex-1"
                      required
                    />
                    <span className="text-slate-500">{AppConfigs.domain}</span>
                  </div>
                  {statusInfo.message && (
                    <span className={`text-xs ${statusInfo.color}`}>
                      {statusInfo.message}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Your workspace will be available at {subdomain || "mycompany"}{AppConfigs.domain}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || (!isSubdomain && subdomainStatus !== "available")}
            >
              {loading ? "Creating account..." : "Register"}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/signin" className="text-blue-600 hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div> {/* Close inner space-y-4 div */}
      </div> {/* Close white box container */}
    </main>
  );
}
