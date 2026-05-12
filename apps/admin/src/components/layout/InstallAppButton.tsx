'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppButtonProps {
  menuItem?: boolean;
}

export function InstallAppButton({ menuItem = false }: InstallAppButtonProps) {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (installed) return null;

  const handleInstall = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
        setPrompt(null);
      }
    } else {
      toast({
        title: 'Install App',
        description: 'On iOS: tap the Share button then "Add to Home Screen". On Android: tap the browser menu then "Add to Home Screen".',
        duration: 6000,
      });
    }
  };

  if (menuItem) {
    return (
      <DropdownMenuItem onClick={handleInstall}>
        <Download className="mr-2 h-4 w-4" />
        Install App
      </DropdownMenuItem>
    );
  }

  if (!prompt) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="hidden sm:flex items-center gap-1.5 h-8 text-xs"
      onClick={handleInstall}
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </Button>
  );
}
