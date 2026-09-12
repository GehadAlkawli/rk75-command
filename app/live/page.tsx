'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle, Radio } from 'lucide-react';
import { Creator, CreatorCard, Lang } from '@/components/creator-card';

const text = { ar: { home: 'الرئيسية', lang: 'English', creators: 'صنّاع المحتوى', media: 'RK ميديا', tag: 'RK75 / LIVE RADAR', title: 'يبث الآن', sub: 'تتحدث القائمة تلقائيًا كل دقيقة.', empty: 'لا يوجد أحد يبث الآن.', loading: 'جارٍ فحص البثوث…', streams: 'البثوث المباشرة' }, en: { home: 'Home', lang: 'العربية', creators: 'Creators', media: 'RK Media', tag: 'RK75 / LIVE RADAR', title: 'LIVE NOW', sub: 'This list refreshes automatically every minute.', empty: 'Nobody is live right now.', loading: 'Checking live streams…', streams: 'Live streams' } } as const;

export default function LivePage() {
  const [lang, setLang] = useState<Lang>('ar'), [creators, setCreators] = useState<Creator[]>([]), [loading, setLoading] = useState(true); const t = text[lang]; const rtl = lang === 'ar';
  const load = async () => { const response = await fetch('/api/live'); if (response.ok) setCreators(await response.json()); setLoading(false); };
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 60_000); return () => window.clearInterval(timer); }, []);
  return <main className="creator-page" dir={rtl ? 'rtl' : 'ltr'}><header className="media-nav"><a className="neo-brand" href="/"><span>RK</span><b>75</b><i>LIVE</i></a><nav><a href="/creators">{t.creators}</a><a href="/media">{t.media}</a><button className="lang-switch" onClick={() => setLang(rtl ? 'en' : 'ar')}>{t.lang}</button><a className="stats-back" href="/"><ArrowLeft size={16}/>{t.home}</a></nav></header><section className="creator-hero"><p><Radio size={15}/>{t.tag}</p><h1>{t.title}</h1><span>{t.sub}</span></section><section className="creator-grid">{loading ? <div className="creator-loading"><LoaderCircle className="spin"/>{t.loading}</div> : creators.map((creator) => <CreatorCard key={creator.id} creator={creator} lang={lang}/>)}</section>{!loading && !creators.length && <section className="creator-empty"><Radio/><h2>{t.empty}</h2></section>}</main>;
}
