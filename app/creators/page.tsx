'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, Users } from 'lucide-react';
import { Creator, CreatorCard, Lang } from '@/components/creator-card';

const text = { ar: { home: 'الرئيسية', lang: 'English', live: 'البث المباشر', media: 'RK ميديا', tag: 'RK75 / CREATOR ROSTER', title: 'صنّاع المحتوى', sub: 'القنوات المحفوظة في مجتمع RK75.', empty: 'لا توجد قنوات مضافة بعد.', loading: 'جارٍ تحميل القنوات…' }, en: { home: 'Home', lang: 'العربية', live: 'Live', media: 'RK Media', tag: 'RK75 / CREATOR ROSTER', title: 'Content creators', sub: 'Saved channels from the RK75 community.', empty: 'No creator channels have been added yet.', loading: 'Loading channels…' } } as const;

export default function CreatorsPage() {
  const [lang, setLang] = useState<Lang>('ar'), [creators, setCreators] = useState<Creator[]>([]), [loading, setLoading] = useState(true); const t = text[lang]; const rtl = lang === 'ar';
  const load = async () => { const response = await fetch('/api/creators'); if (response.ok) setCreators(await response.json()); setLoading(false); };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 60_000); return () => window.clearInterval(timer); }, []);
  return <main className="creator-page" dir={rtl ? 'rtl' : 'ltr'}><header className="media-nav"><a className="neo-brand" href="/"><span>RK</span><b>75</b><i>CREATORS</i></a><nav><a href="/live">{t.live}</a><a href="/media">{t.media}</a><button className="lang-switch" onClick={() => setLang(rtl ? 'en' : 'ar')}>{t.lang}</button><a className="stats-back" href="/"><ArrowLeft size={16}/>{t.home}</a></nav></header><section className="creator-hero"><p><Users size={15}/>{t.tag}</p><h1>{t.title}</h1><span>{t.sub}</span></section><section className="creator-grid">{loading ? <div className="creator-loading"><LoaderCircle className="spin"/>{t.loading}</div> : creators.map((creator) => <CreatorCard key={creator.id} creator={creator} lang={lang}/>)}</section>{!loading && !creators.length && <section className="creator-empty"><Users/><h2>{t.empty}</h2></section>}</main>;
}
