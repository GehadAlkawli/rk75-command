'use client';

import { useEffect } from 'react';

const routePaths = new Set(['/', '/stats', '/accounts', '/media', '/live', '/creators', '/admin/streams']);

export default function NavigationTransition() {
  useEffect(() => {
    const markCurrentRoute = () => {
      const current = window.location.pathname;
      document.querySelectorAll<HTMLAnchorElement>('.neo-top a[href], .market-nav a[href], .comparison-nav a[href], .media-nav a[href]').forEach((link) => {
        const target = new URL(link.href).pathname;
        link.classList.toggle('rk-nav-active', target === current);
      });
      document.documentElement.classList.remove('rk-route-leave');
    };
    const onNavigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const element = event.target as Element | null;
      const link = element?.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || !routePaths.has(destination.pathname) || destination.pathname === window.location.pathname) return;
      event.preventDefault();
      document.documentElement.classList.add('rk-route-leave');
      window.setTimeout(() => window.location.assign(destination.href), 470);
    };
    markCurrentRoute();
    document.addEventListener('click', onNavigate);
    return () => document.removeEventListener('click', onNavigate);
  }, []);
  return null;
}
