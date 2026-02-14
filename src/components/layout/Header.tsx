'use client';

import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

type User = {
  name: string;
  email: string;
  role: string;
};

type HeaderProps = {
  user: User;
  onMenuToggle?: () => void;
};

export function Header({ user, onMenuToggle }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-caribbean-gold/20">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side: Mobile menu + Title */}
        <div className="flex items-center space-x-4">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 hover:bg-caribbean-green/10 rounded-md transition-colors"
            >
              <Menu className="w-5 h-5 text-caribbean-gold" />
            </button>
          )}
          <h2 className="text-xl font-semibold text-foreground">
            Command Center
          </h2>
        </div>

        {/* Right side: User info + Dark mode toggle */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="border-caribbean-gold/20 hover:bg-caribbean-green/10"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
