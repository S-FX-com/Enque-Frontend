import AppLayout from "@/components/layouts/app-layout";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout title="Settings">
      {children}
    </AppLayout>
  );
} 