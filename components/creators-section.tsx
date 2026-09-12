'use client';

import Link from 'next/link';
import { ArrowUpRight, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import CreatorChannelRow from '@/components/creator-channel-row';
import type { Creator, Lang } from '@/components/creator-card';

export default function CreatorsSection({ lang }: { lang: Lang }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const response = await fetch('/api/creators?homepage=true');
      if (response.ok && mounted) setCreators(await response.json() as Creator[]);
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);
  if (!creators.length) return null;
  const rtl = lang === 'ar';
  return <section className="home-creators" dir={rtl ? 'rtl' : 'ltr'} aria-labelledby="home-creators-heading">
    <div className="home-creators-head">
      <div><p><Users size={14} />{rtl ? 'مجتمع RK75' : 'OUR COMMUNITY'}</p><h2 id="home-creators-heading">{rtl ? 'صنّاع المحتوى' : 'CONTENT CREATORS'}</h2></div>
      <Link href="/creators">{rtl ? 'عرض الجميع' : 'VIEW ALL CREATORS'}<ArrowUpRight size={17} /></Link>
    </div>
    <div className="creator-channel-list" aria-label={rtl ? 'قائمة صنّاع المحتوى' : 'Content creator list'}>
      {creators.slice(0, 8).map((creator) => <CreatorChannelRow key={creator.id} creator={creator} lang={lang} />)}
    </div>
    <Link className="creator-channel-view-all" href="/creators">{rtl ? 'عرض الجميع' : 'VIEW ALL CREATORS'}<ArrowUpRight size={16} /></Link>
  </section>;
}
