'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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
      if (!href || href.startsWith('#') || href.startsWith('http') || anchor.target === '_blank') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      pendingNavRef.current = () => { skipRef.current = true; router.push(href); };
      setShowPrompt(true);
    };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [isDirty, router]);

  // Handle browser back button (popstate) — capture phase to beat Next.js router
  useEffect(() => {
    if (!isDirty) return;
    const handler = () => {
      if (skipPopStateRef.current) { skipPopStateRef.current = false; return; }
      history.pushState(history.state, '', window.location.href);
      pendingNavRef.current = () => { skipPopStateRef.current = true; history.go(-1); };
      setShowPrompt(true);
    };
    window.addEventListener('popstate', handler, true);
    return () => window.removeEventListener('popstate', handler, true);
  }, [isDirty]);

  // Guard any programmatic navigation (e.g. router.back() button clicks)
  const guard = useCallback((fn: () => void) => {
    if (!isDirty) { fn(); return; }
    pendingNavRef.current = fn;
    setShowPrompt(true);
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

  return { showPrompt, confirmLeave, stayOnPage, guard };
}
