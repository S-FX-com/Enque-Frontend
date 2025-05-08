import { Metadata } from 'next';
import { AppConfigs } from '@/configs';

export const metadata: Metadata = {
  title: `${AppConfigs.appName} - Help Desk System`,
  description: AppConfigs.appDescription,
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-white">{children}</div>;
}
