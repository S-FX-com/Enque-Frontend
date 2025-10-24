import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppConfigs } from '@/configs';
import { SubdomainForm } from '@/components/forms/subdomain-form';

export default async function Home() {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  const isSubdomainSite = host !== AppConfigs.baseUrl && host.endsWith(AppConfigs.domain);

  if (isSubdomainSite) {
    // Server-side redirect is much faster and avoids flickering
    redirect('/signin');
  }

  // Render the client component with the form
  return <SubdomainForm />;
}
