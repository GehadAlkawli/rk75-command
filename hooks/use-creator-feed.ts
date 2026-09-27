'use client';

import { useEffect, useState } from 'react';
import type { Creator } from '@/components/creator-card';

const refreshIntervalMs = 60_000;
const activeRefreshes = new Map<string, Promise<Creator[] | null>>();

function cachedUrl(endpoint: string) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}cached=true`;
}

async function readCreatorFeed(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) return null;
  return response.json() as Promise<Creator[]>;
}

function refreshCreatorFeed(endpoint: string) {
  const active = activeRefreshes.get(endpoint);
  if (active) return active;

  const request = readCreatorFeed(endpoint).finally(() => {
    activeRefreshes.delete(endpoint);
  });
  activeRefreshes.set(endpoint, request);
  return request;
}

/**
 * Shows the saved creator data immediately, then refreshes platform data in
 * the background. Polling pauses while the tab is hidden, which keeps the
 * channel pages responsive without creating needless network or D1 traffic.
 */
export function useCreatorFeed(endpoint: string) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let syncing = false;
    const controller = new AbortController();

    const load = async () => {
      if (syncing || document.visibilityState !== 'visible') return;

      syncing = true;
      try {
        const saved = await readCreatorFeed(
          cachedUrl(endpoint),
          controller.signal,
        ).catch(() => null);
        if (controller.signal.aborted) return;
        if (active && saved) setCreators(saved);
        if (active) setLoading(false);

        // This request may contact a streaming provider, so it must never
        // delay the first visible render of a channel list.
        const refreshed = await refreshCreatorFeed(endpoint).catch(() => null);
        if (active && refreshed) setCreators(refreshed);
      } finally {
        syncing = false;
        if (active) setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };

    void load();
    const timer = window.setInterval(refreshWhenVisible, refreshIntervalMs);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [endpoint]);

  return { creators, loading };
}
