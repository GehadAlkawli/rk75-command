'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  LoaderCircle,
  Radio,
  Users,
} from 'lucide-react';
import StreamPlayer from '@/components/stream-player';
import { Creator, Lang } from '@/components/creator-card';
import HamburgerMenu from '@/components/hamburger-menu';

const text = {
  ar: {
    home: 'الرئيسية',
    live: 'البث المباشر',
    loading: 'جارٍ تجهيز البث…',
    missing: 'هذه القناة غير موجودة أو أزيلت.',
    watch: 'المشاهدة على المنصة',
    offline: 'القناة ليست في بث مباشر الآن',
    viewers: 'مشاهد',
    creator: 'صانع المحتوى',
  },
  en: {
    home: 'Home',
    live: 'Live',
    loading: 'Preparing stream…',
    missing: 'This creator was not found or has been removed.',
    watch: 'Watch on platform',
    offline: 'This channel is not live right now',
    viewers: 'viewers',
    creator: 'Content creator',
  },
} as const;

export default function CreatorWatchPage() {
  const [lang, setLang] = useState<Lang>('ar'),
    [creator, setCreator] = useState<Creator | null | undefined>(undefined);
  const t = text[lang];
  const rtl = lang === 'ar';
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const slug = decodeURIComponent(
      window.location.pathname.split('/').filter(Boolean).at(-1) ?? '',
    );
    const findCreator = (creators: Creator[]) =>
      creators.find((item) => item.slug === slug) ?? null;
    const read = async (url: string, signal?: AbortSignal) => {
      const response = await fetch(url, { cache: 'no-store', signal });
      return response.ok ? (response.json() as Promise<Creator[]>) : null;
    };

    const load = async () => {
      const cached = await read(
        '/api/creators?cached=true',
        controller.signal,
      ).catch(() => null);
      if (!active || controller.signal.aborted) return;
      let hasCachedMatch = false;

      // A cached match can show the stream instantly. If it is absent, wait
      // for the refreshed list before deciding that the route is invalid.
      if (cached) {
        const savedCreator = findCreator(cached);
        if (savedCreator) {
          hasCachedMatch = true;
          setCreator(savedCreator);
        }
      }

      const refreshed = await read('/api/creators', controller.signal).catch(
        () => null,
      );
      if (!active || controller.signal.aborted) return;
      if (refreshed) setCreator(findCreator(refreshed));
      else if (!hasCachedMatch) setCreator(null);
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  return (
    <main className="creator-page watch-page" dir={rtl ? 'rtl' : 'ltr'}>
      <header className="media-nav">
        <Link className="neo-brand" href="/">
          <span>RK</span>
          <b>75</b>
          <i>LIVE</i>
        </Link>
        <HamburgerMenu
          label={rtl ? 'القائمة' : 'Menu'}
          locale={rtl ? 'ar' : 'en'}
          direction={rtl ? 'rtl' : 'ltr'}
        >
          <button
            className="lang-switch"
            onClick={() => setLang(rtl ? 'en' : 'ar')}
          >
            {rtl ? 'English' : 'العربية'}
          </button>
          <Link className="stats-back" href="/live">
            <ArrowLeft size={16} />
            {t.live}
          </Link>
        </HamburgerMenu>
      </header>
      {creator === undefined ? (
        <div className="creator-loading">
          <LoaderCircle className="spin" />
          {t.loading}
        </div>
      ) : !creator ? (
        <section className="creator-empty">
          <Radio />
          <h2>{t.missing}</h2>
        </section>
      ) : (
        <section className="watch-shell">
          <StreamPlayer
            platform={creator.platform}
            username={creator.platformUsername}
            videoId={creator.currentVideoId}
            originalUrl={creator.normalizedUrl}
            label={t.watch}
          />
          <div className="watch-details">
            <span
              className={
                creator.isLive
                  ? 'live-pill is-live'
                  : `live-pill is-${creator.liveStatus}`
              }
            >
              {creator.isLive ? (
                <>
                  <i />
                  LIVE
                </>
              ) : (
                t.offline
              )}
            </span>
            <p>
              {t.creator} · {creator.platform.toUpperCase()}
            </p>
            <h1>{creator.displayName || creator.platformUsername}</h1>
            <h2>{creator.streamTitle || t.offline}</h2>
            <div>
              {creator.category && (
                <span>
                  <Users size={16} />
                  {creator.category}
                </span>
              )}
              {creator.viewerCount !== null && (
                <span>
                  <Eye size={16} />
                  {creator.viewerCount.toLocaleString()} {t.viewers}
                </span>
              )}
            </div>
            <a
              className="ember-button"
              href={creator.normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={17} />
              {t.watch}
            </a>
          </div>
        </section>
      )}
    </main>
  );
}
