'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter();
  const [showPrompt, setShowPrompt] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const skipRef = useRef(false);
  const skipPopStateRef = useRef(false);

  // Browser close / refresh
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Intercept <Link> / <a> clicks in capture phase — before Next.js handles them
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      if (skipRef.current) { skipRef.current = false; return; }
      const anchor = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute('href') ?? '';
      // Ignore external links, hash-only, and new-tab links
      if (!href || href.startsWith('#') || href.startsWith('http') || anchor.target === '_blank') return;
      e.preventDefault();
      e.stopPropagation();
      pendingNavRef.current = () => { skipRef.current = true; router.push(href); };
      setShowPrompt(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isDirty, router]);

  // Handle router.back() and browser back button (both fire popstate)
  useEffect(() => {
    if (!isDirty) return;
    const handler = () => {
      if (skipPopStateRef.current) { skipPopStateRef.current = false; return; }
      // Re-push current state to visually cancel the navigation
      history.pushState(history.state, '', window.location.href);
      pendingNavRef.current = () => { skipPopStateRef.current = true; history.go(-1); };
      setShowPrompt(true);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [isDirty]);

  const confirmLeave = () => {
    const nav = pendingNavRef.current;
    pendingNavRef.current = null;
    setShowPrompt(false);
    nav?.();
  };

  const stayOnPage = () => {
    pendingNavRef.current = null;
    setShowPrompt(false);
  };

  return { showPrompt, confirmLeave, stayOnPage };
}
