'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, Radio } from 'lucide-react';
import { CreatorCard, Lang } from '@/components/creator-card';
import HamburgerMenu from '@/components/hamburger-menu';
import { useCreatorFeed } from '@/hooks/use-creator-feed';

const text = {
  ar: {
    home: 'الرئيسية',
    lang: 'English',
    creators: 'صنّاع المحتوى',
    media: 'RK ميديا',
    tag: 'RK75 / LIVE RADAR',
    title: 'يبث الآن',
    sub: 'تتحدث القائمة تلقائيًا كل دقيقة.',
    empty: 'لا يوجد أحد يبث الآن.',
    loading: 'جارٍ فحص البثوث…',
    streams: 'البثوث المباشرة',
  },
  en: {
    home: 'Home',
    lang: 'العربية',
    creators: 'Creators',
    media: 'RK Media',
    tag: 'RK75 / LIVE RADAR',
    title: 'LIVE NOW',
    sub: 'This list refreshes automatically every minute.',
    empty: 'Nobody is live right now.',
    loading: 'Checking live streams…',
    streams: 'Live streams',
  },
} as const;

export default function LivePage() {
  const [lang, setLang] = useState<Lang>('ar');
  const { creators, loading } = useCreatorFeed('/api/live');
  const t = text[lang];
  const rtl = lang === 'ar';

  return (
    <main className="creator-page" dir={rtl ? 'rtl' : 'ltr'}>
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
          <Link href="/creators">{t.creators}</Link>
          <Link href="/media">{t.media}</Link>
          <button
            className="lang-switch"
            onClick={() => setLang(rtl ? 'en' : 'ar')}
          >
            {t.lang}
          </button>
          <Link className="stats-back" href="/">
            <ArrowLeft size={16} />
            {t.home}
          </Link>
        </HamburgerMenu>
      </header>
      <section className="creator-hero">
        <p>
          <Radio size={15} />
          {t.tag}
        </p>
        <h1>{t.title}</h1>
        <span>{t.sub}</span>
      </section>
      <section className="creator-grid">
        {loading ? (
          <div className="creator-loading">
            <LoaderCircle className="spin" />
            {t.loading}
          </div>
        ) : (
          creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} lang={lang} />
          ))
        )}
      </section>
      {!loading && !creators.length && (
        <section className="creator-empty">
          <Radio />
          <h2>{t.empty}</h2>
        </section>
      )}
    </main>
  );
}
