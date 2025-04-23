"use client";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useEffect, useState } from "react";
import { getCurrentUser, redirectToLogin, UserSession } from "@/lib/auth";

interface Breadcrumb {
  label: string;
  href: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[]; 
}

export default function AppLayout({
  children,
  title = "Dashboard",
  breadcrumbs = [], 
}: AppLayoutProps) {
  const [user, setUser] = useState<UserSession | null>(null);
  
  useEffect(() => {
    
    redirectToLogin();
    
   
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    
    fetchUser();
  }, []);
  
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="fixed h-screen">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <div className="px-6 py-2"> 
          <Topbar title={title} user={user} breadcrumbs={breadcrumbs} /> 
        </div>
        <main className="flex-1 overflow-y-auto px-6 pb-6 pt-2"> 
          {children}
        </main>
      </div>
    </div>
  );
}
