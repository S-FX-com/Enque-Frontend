'use client';

import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { useEffect, useState } from 'react';
import { getCurrentUser, redirectToLogin, UserSession } from '@/lib/auth';
import { NewTicketModal } from '@/components/modals/new-ticket-modal'; // Import the modal
import { usePathname } from 'next/navigation'; // Import usePathname

interface Breadcrumb {
  label: string;
  href: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Breadcrumb[];
}

// Define interfaces for the global window functions
interface CustomWindow extends Window {
  openNewAgentModal?: () => void;
  openNewTeamModal?: () => void;
  openNewCategoryModal?: () => void;
  openNewAutomationModal?: () => void;
}

export default function AppLayout({
  children,
  title = 'Dashboard',
  breadcrumbs = [],
}: AppLayoutProps) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false); // State for modal
  const pathname = usePathname(); // Get current path

  // Function to open the modal
  const handleNewTicketClick = () => {
    if (pathname === '/tickets') {
      setIsNewTicketModalOpen(true);
    } else if (pathname === '/configuration/agents') {
      const customWindow = window as Window & typeof globalThis & CustomWindow;
      if (customWindow.openNewAgentModal) {
        customWindow.openNewAgentModal();
      }
    } else if (pathname === '/configuration/teams') {
      const customWindow = window as Window & typeof globalThis & CustomWindow;
      if (customWindow.openNewTeamModal) {
        customWindow.openNewTeamModal();
      }
    } else if (pathname === '/configuration/categories') {
      const customWindow = window as Window & typeof globalThis & CustomWindow;
      if (customWindow.openNewCategoryModal) {
        customWindow.openNewCategoryModal();
      }
    } else if (pathname === '/configuration/workflows') {
      const customWindow = window as Window & typeof globalThis & CustomWindow;
      if (customWindow.openNewAutomationModal) {
        customWindow.openNewAutomationModal();
      }
    }
  };

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
    <div className="flex h-screen overflow-hidden" style={{}}>
      <aside className="fixed h-screen">
        <Sidebar />
      </aside>
      <div className="flex-1 flex flex-col ml-64 overflow-hidden">
        <div className="px-6 py-2">
          {/* Pass handler to tickets page and specific configuration pages */}
          <Topbar
            title={title}
            user={user}
            breadcrumbs={breadcrumbs}
            onNewTicketClick={
              pathname === '/tickets' ||
              pathname === '/configuration/agents' ||
              pathname === '/configuration/teams' ||
              pathname === '/configuration/categories' ||
              pathname === '/configuration/workflows'
                ? handleNewTicketClick
                : undefined
            }
          />
        </div>
        <main className="flex-1 overflow-y-auto px-6 pb-6 pt-2">{children}</main>
      </div>
      {/* Render the modal outside the main content flow */}
      <NewTicketModal open={isNewTicketModalOpen} onOpenChange={setIsNewTicketModalOpen} />
    </div>
  );
}
