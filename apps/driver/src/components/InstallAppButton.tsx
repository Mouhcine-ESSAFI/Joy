'use client';

import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export function InstallAppButton() {
  const { canInstall, install } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="hidden sm:flex items-center gap-1.5 h-8 text-xs"
      onClick={install}
    >
      <Download className="h-3.5 w-3.5" />
      Install App
    </Button>
  );
}
