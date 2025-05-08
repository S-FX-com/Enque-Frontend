'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Necesario para evitar problemas de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="text-slate-400">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-slate-400 relative overflow-hidden transition-all duration-300 ease-in-out"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <Sun
        className={`h-5 w-5 absolute transition-all duration-300 ease-in-out ${
          theme === 'dark' ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      />
      <Moon
        className={`h-5 w-5 absolute transition-all duration-300 ease-in-out ${
          theme === 'dark' ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
        }`}
      />
    </Button>
  );
}
