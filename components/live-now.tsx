'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Radio } from 'lucide-react';
import { Creator, CreatorCard, Lang } from '@/components/creator-card';

export default function LiveNow({ lang }: { lang: Lang }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  useEffect(() => { const load = async () => { const response = await fetch('/api/live'); if (response.ok) setCreators(await response.json()); }; void load(); const timer = window.setInterval(() => void load(), 60_000); return () => window.clearInterval(timer); }, []);
  if (!creators.length) return null;
  const rtl = lang === 'ar';
  return <section className="home-live-now" dir={rtl ? 'rtl' : 'ltr'}><div className="home-live-head"><div><p><Radio size={14}/>RK75 / LIVE NOW</p><h2>{rtl ? 'يبث الآن' : 'Live now'}</h2></div><a href="/live">{rtl ? 'كل البثوث' : 'View all streams'}<ArrowUpRight size={17}/></a></div><div className="home-live-grid">{creators.slice(0, 4).map((creator) => <CreatorCard key={creator.id} creator={creator} lang={lang}/>)}</div></section>;
}
