import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider'; // Import QueryProvider
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Enque',
    template: '%s | Enque',
  },
  description: 'Take control of your tasks with Enque',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="theme-transition">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased theme-transition`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange={false}
        >
          <QueryProvider>
            {' '}
            {/* Wrap children with QueryProvider */}
            {children}
            {/* Customize sonner Toaster appearance */}
            <Toaster
              position="bottom-right" // Change position to bottom-right
              richColors // Enables default rich colors (like red for error)
              toastOptions={{
                classNames: {
                  error:
                    'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-400',
                  success:
                    'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400',
                  warning:
                    'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400',
                  info: 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-400',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
