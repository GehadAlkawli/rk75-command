'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Users } from 'lucide-react';
import { Creator, CreatorCard, Lang } from '@/components/creator-card';

export default function CreatorsSection({ lang }: { lang: Lang }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/creators');
      if (response.ok) setCreators(await response.json());
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const orderedCreators = [...creators].sort((a, b) => Number(b.isLive) - Number(a.isLive) || Number(b.featured) - Number(a.featured) || (b.viewerCount ?? 0) - (a.viewerCount ?? 0)).slice(0, 8);
  if (!orderedCreators.length) return null;
  const rtl = lang === 'ar';
  return <section className="home-creators" dir={rtl ? 'rtl' : 'ltr'} aria-labelledby="home-creators-heading"><div className="home-creators-head"><div><p><Users size={14} />{rtl ? 'مجتمع RK75' : 'OUR COMMUNITY'}</p><h2 id="home-creators-heading">{rtl ? 'صنّاع المحتوى' : 'CONTENT CREATORS'}</h2></div><Link href="/creators">{rtl ? 'كل صناع المحتوى' : 'VIEW ALL CREATORS'}<ArrowUpRight size={17} /></Link></div><div className="home-creators-grid">{orderedCreators.map((creator) => <CreatorCard key={creator.id} creator={creator} lang={lang} mode="channel" />)}</div></section>;
}
