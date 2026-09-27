'use client';

import Link from 'next/link';
import { ArrowUpRight, Users } from 'lucide-react';
import HomepageCreatorCard from '@/components/homepage-creator-card';
import type { Lang } from '@/components/creator-card';
import { useCreatorFeed } from '@/hooks/use-creator-feed';

export default function CreatorsSection({ lang }: { lang: Lang }) {
  const { creators } = useCreatorFeed('/api/creators?homepage=true');
  if (!creators.length) return null;
  const rtl = lang === 'ar';
  return (
    <section
      className="home-creators"
      dir={rtl ? 'rtl' : 'ltr'}
      aria-labelledby="home-creators-heading"
    >
      <div className="home-creators-head">
        <div>
          <p>
            <Users size={14} />
            {rtl ? 'مجتمع RK75' : 'OUR COMMUNITY'}
          </p>
          <h2 id="home-creators-heading">
            {rtl ? 'صنّاع المحتوى' : 'CONTENT CREATORS'}
          </h2>
        </div>
        <Link href="/creators">
          {rtl ? 'عرض الجميع' : 'VIEW ALL CREATORS'}
          <ArrowUpRight size={17} />
        </Link>
      </div>
      <div
        className="homepage-creators-grid"
        aria-label={rtl ? 'قائمة صنّاع المحتوى' : 'Content creator list'}
      >
        {creators.slice(0, 8).map((creator) => (
          <HomepageCreatorCard key={creator.id} creator={creator} lang={lang} />
        ))}
      </div>
      <Link className="creator-showcase-view-all" href="/creators">
        {rtl ? 'عرض جميع صناع المحتوى' : 'VIEW ALL CREATORS'}
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
