'use client';
import { useEffect, useRef, useState } from 'react';

export function useUnsavedChanges(isDirty: boolean) {
  const [showPrompt, setShowPrompt] = useState(false);
  const pendingArgsRef = useRef<Parameters<typeof history.pushState> | null>(null);
  const originalPushRef = useRef<typeof history.pushState | null>(null);

  // Browser close / refresh / hard back
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Next.js App Router client-side navigation via history.pushState
  useEffect(() => {
    if (!isDirty) return;

    const original = history.pushState.bind(history);
    originalPushRef.current = original;

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      pendingArgsRef.current = args;
      setShowPrompt(true);
    };

    return () => {
      if (originalPushRef.current) {
        history.pushState = originalPushRef.current;
        originalPushRef.current = null;
      }
    };
  }, [isDirty]);

  const confirmLeave = () => {
    setShowPrompt(false);
    if (pendingArgsRef.current && originalPushRef.current) {
      originalPushRef.current(...pendingArgsRef.current);
      pendingArgsRef.current = null;
    }
  };

  const stayOnPage = () => {
    setShowPrompt(false);
    pendingArgsRef.current = null;
  };

  return { showPrompt, confirmLeave, stayOnPage };
}
