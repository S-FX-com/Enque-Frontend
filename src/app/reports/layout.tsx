import AppLayout from "@/components/layouts/app-layout";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Reports">
      {children}
    </AppLayout>
  );
} 