'use client';

import Link from 'next/link';
import { ArrowUpRight, Users } from 'lucide-react';
import type { Lang } from '@/components/creator-card';

export default function CreatorsSection({ lang }: { lang: Lang }) {
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
          {rtl ? 'استكشف القنوات' : 'EXPLORE CREATORS'}
          <ArrowUpRight size={17} />
        </Link>
      </div>

      <Link className="creator-channel-view-all" href="/creators">
        <Users size={17} />
        <span>
          {rtl ? 'عرض جميع صنّاع المحتوى' : 'VIEW ALL CONTENT CREATORS'}
        </span>
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
