"use client";

import AppLayout from "@/components/layouts/app-layout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Dashboard">
      {children}
    </AppLayout>
  );
} 