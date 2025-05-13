'use client';

import {} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export default function ClientPage() {
  const sections = [
    {
      title: 'Manage',
      items: [
        {
          name: 'Agents',
          icon: ({ fill = '#2B3674' }: { fill: string }) => (
            <svg
              width="36"
              height="36"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 4C18.2 4 20 5.8 20 8C20 10.2 18.2 12 16 12C13.8 12 12 10.2 12 8C12 5.8 13.8 4 16 4ZM16 24C21.4 24 27.6 26.58 28 28H4C4.46 26.56 10.62 24 16 24ZM16 0C11.58 0 8 3.58 8 8C8 12.42 11.58 16 16 16C20.42 16 24 12.42 24 8C24 3.58 20.42 0 16 0ZM16 20C10.66 20 0 22.68 0 28V32H32V28C32 22.68 21.34 20 16 20Z"
                fill={fill}
              />
            </svg>
          ),
          href: '/configuration/agents',
        },
        {
          name: 'Teams',
          icon: ({ fill = '#2B3674' }: { fill: string }) => (
            <svg
              width="36"
              height="36"
              viewBox="0 0 44 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M31.34 18.26C34.08 20.12 36 22.64 36 26V32H44V26C44 21.64 36.86 19.06 31.34 18.26Z"
                fill={fill}
              />
              <path
                d="M28 16C32.42 16 36 12.42 36 8C36 3.58 32.42 0 28 0C27.06 0 26.18 0.2 25.34 0.48C27 2.54 28 5.16 28 8C28 10.84 27 13.46 25.34 15.52C26.18 15.8 27.06 16 28 16Z"
                fill={fill}
              />
              <path
                d="M16 16C20.42 16 24 12.42 24 8C24 3.58 20.42 0 16 0C11.58 0 8 3.58 8 8C8 12.42 11.58 16 16 16ZM16 4C18.2 4 20 5.8 20 8C20 10.2 18.2 12 16 12C13.8 12 12 10.2 12 8C12 5.8 13.8 4 16 4Z"
                fill={fill}
              />
              <path
                d="M16 18C10.66 18 0 20.68 0 26V32H32V26C32 20.68 21.34 18 16 18ZM28 28H4V26.02C4.4 24.58 10.6 22 16 22C21.4 22 27.6 24.58 28 26V28Z"
                fill={fill}
              />
            </svg>
          ),
          href: '/configuration/teams',
        },
      ],
    },
    {
      title: 'Tickets',
      items: [
        {
          name: 'Mailbox',
          icon: ({ fill = '#2B3674' }: { fill: string }) => (
            <svg
              width="36"
              height="36"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M32 18H26.9V12H21.1V18H16L24 26L32 18ZM38 6H9.98C7.76 6 6 7.8 6 10V38C6 40.2 7.76 42 9.98 42H38C40.2 42 42 40.2 42 38V10C42 7.8 40.2 6 38 6ZM38 38H10V32H17.12C18.5 34.38 21.06 36 24.02 36C26.98 36 29.52 34.38 30.92 32H38V38ZM38 28H28.02C28.02 30.2 26.22 32 24.02 32C21.82 32 20.02 30.2 20.02 28H10L9.98 10H38V28Z"
                fill={fill}
              />
            </svg>
          ),
          href: '/configuration/mailbox',
        },
        {
          name: 'Categories',
          icon: ({ fill = '#2B3674' }: { fill: string }) => (
            <svg
              width="36"
              height="36"
              viewBox="0 0 38 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 0L7 18H29L18 0ZM18 7.68L21.86 14H14.12L18 7.68ZM29 22C24.02 22 20 26.02 20 31C20 35.98 24.02 40 29 40C33.98 40 38 35.98 38 31C38 26.02 33.98 22 29 22ZM29 36C26.24 36 24 33.76 24 31C24 28.24 26.24 26 29 26C31.76 26 34 28.24 34 31C34 33.76 31.76 36 29 36ZM0 39H16V23H0V39ZM4 27H12V35H4V27Z"
                fill={fill}
              />
            </svg>
          ),
          href: '/configuration/categories',
        },
      ],
    },
  ] as {
    title: string;
    items: Array<{
      name: string;
      icon: LucideIcon;
      highlight?: boolean;
      href?: string;
    }>;
  }[];

  return (
    <div className="space-y-5">
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="bg-card px-8 py-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">{section.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4">
            {section.items.map((item, itemIndex) => {
              const content = (
                <div
                  className={`flex gap-2 flex-col items-center justify-center p-6 rounded-xl h-full ${item.href ? 'cursor-pointer' : 'cursor-default'}
									${item.highlight ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted/50'}`}
                >
                  <item.icon />
                  <span className="text-sm font-semibold text-center">{item.name}</span>
                </div>
              );

              return item.href ? (
                <Link href={item.href} key={itemIndex} className="block">
                  {content}
                </Link>
              ) : (
                <div key={itemIndex}>{content}</div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
