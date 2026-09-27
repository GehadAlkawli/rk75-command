'use client';

import { useEffect, useState } from 'react';

type Presence = {
  members: number;
  online: number;
};

const refreshIntervalMs = 60_000;
const visitorStorageKey = 'rk75-presence';

export function usePresence() {
  const [presence, setPresence] = useState<Presence>({ members: 0, online: 0 });

  useEffect(() => {
    let active = true;
    let syncing = false;
    const controller = new AbortController();
    let visitorKey = window.localStorage.getItem(visitorStorageKey);

    if (!visitorKey) {
      visitorKey = crypto.randomUUID();
      window.localStorage.setItem(visitorStorageKey, visitorKey);
    }

    const ping = async () => {
      if (syncing || document.visibilityState !== 'visible') return;

      syncing = true;
      try {
        const response = await fetch('/api/presence', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ visitorKey }),
          signal: controller.signal,
        });

        if (active && response.ok) {
          setPresence((await response.json()) as Presence);
        }
      } catch {
        // Presence is optional UI data. Keep the last known values on a
        // temporary network failure instead of interrupting the page.
      } finally {
        syncing = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void ping();
    };

    void ping();
    const timer = window.setInterval(refreshWhenVisible, refreshIntervalMs);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  return presence;
}
