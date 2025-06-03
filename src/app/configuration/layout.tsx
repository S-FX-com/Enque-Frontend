'use client';

import AppLayout from '@/components/layouts/app-layout';
import { usePathname } from 'next/navigation'; // Import usePathname

// Helper function to capitalize first letter
const capitalizeFirstLetter = (string: string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export default function ConfigurationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(segment => segment); // Remove empty segments

    const breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }];

    if (pathSegments.includes('configuration')) {
      breadcrumbs.push({ label: 'Configuration', href: '/configuration' });

      // Check for sub-segments after 'configuration'
      const configIndex = pathSegments.indexOf('configuration');
      if (configIndex !== -1 && configIndex < pathSegments.length - 1) {
        // Get the segment after 'configuration' (e.g., 'agents', 'teams')
        const currentSection = pathSegments[configIndex + 1];
        // Avoid adding dynamic IDs like '[agentId]' to breadcrumbs for now
        if (currentSection && !currentSection.startsWith('[')) {
          breadcrumbs.push({
            label: capitalizeFirstLetter(currentSection),
            href: `/configuration/${currentSection}`,
          });
        }
      }
    }
    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Determine the title based on the last breadcrumb
  let title = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].label : 'Configuration';
  
  // Special case: change "Automations" to "Workflows"
  if (title === 'Automations') {
    title = 'Workflows';
  }

  return (
    <AppLayout title={title} breadcrumbs={breadcrumbs}>
      {children}
    </AppLayout>
  );
}
