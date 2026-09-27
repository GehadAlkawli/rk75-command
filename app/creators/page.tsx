'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LoaderCircle, Users } from 'lucide-react';
import { CreatorCard, Lang } from '@/components/creator-card';
import HamburgerMenu from '@/components/hamburger-menu';
import { useCreatorFeed } from '@/hooks/use-creator-feed';

const text = {
  ar: {
    home: 'الرئيسية',
    lang: 'English',
    live: 'البث المباشر',
    media: 'RK ميديا',
    tag: 'RK75 / CREATOR ROSTER',
    title: 'صنّاع المحتوى',
    sub: 'القنوات المحفوظة في مجتمع RK75.',
    empty: 'لا توجد قنوات مضافة بعد.',
    loading: 'جارٍ تحميل القنوات…',
  },
  en: {
    home: 'Home',
    lang: 'العربية',
    live: 'Live',
    media: 'RK Media',
    tag: 'RK75 / CREATOR ROSTER',
    title: 'Content creators',
    sub: 'Saved channels from the RK75 community.',
    empty: 'No creator channels have been added yet.',
    loading: 'Loading channels…',
  },
} as const;

export default function CreatorsPage() {
  const [lang, setLang] = useState<Lang>('ar');
  const { creators, loading } = useCreatorFeed('/api/creators');

  const t = text[lang];
  const rtl = lang === 'ar';

  return (
    <main className="creator-page" dir={rtl ? 'rtl' : 'ltr'}>
      <header className="media-nav">
        <Link className="neo-brand" href="/">
          <span>RK</span>
          <b>75</b>
          <i>CREATORS</i>
        </Link>

        <HamburgerMenu
          label={rtl ? 'القائمة' : 'Menu'}
          locale={rtl ? 'ar' : 'en'}
          direction={rtl ? 'rtl' : 'ltr'}
        >
          <Link href="/live">{t.live}</Link>

          <Link href="/media">{t.media}</Link>

          <button
            type="button"
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
          <Users size={15} />
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
        ) : creators.length > 0 ? (
          creators.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              lang={lang}
              mode="hub"
            />
          ))
        ) : null}
      </section>

      {!loading && creators.length === 0 && (
        <section className="creator-empty">
          <Users />

          <h2>{t.empty}</h2>
        </section>
      )}
    </main>
  );
}
