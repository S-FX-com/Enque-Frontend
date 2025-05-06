"use client";

import AppLayout from "@/components/layouts/app-layout";

export default function UsersCompaniesPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbs = [
    { label: "Dashboard", href: "/users & companies" },
    { label: "users & companies", href: "/users & companies" },
  ];

  return (
    <AppLayout title="users & companies" breadcrumbs={breadcrumbs}>
      {children}
    </AppLayout>
  );
}
