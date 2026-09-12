'use client';

/* oxlint-disable next/no-img-element -- Live thumbnails and avatars are remote platform URLs. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Eye, Play, Radio, Tv } from 'lucide-react';
import { Creator, Lang } from '@/components/creator-card';

function PlatformIcon({ platform }: Pick<Creator, 'platform'>) {
  if (platform === 'youtube') return <Play aria-hidden="true" />;
  if (platform === 'twitch') return <Tv aria-hidden="true" />;
  return <Radio aria-hidden="true" />;
}

function LiveAvatar({ creator }: { creator: Creator }) {
  const [failed, setFailed] = useState(false);
  const name = creator.displayName || creator.platformUsername;
  if (!creator.avatarUrl || failed) return <span className="live-stream-avatar live-stream-avatar-fallback" aria-label={name}>{name.slice(0, 1).toUpperCase()}</span>;
  return <img className="live-stream-avatar" src={creator.avatarUrl} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

function LiveStreamCard({ creator, lang }: { creator: Creator; lang: Lang }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const rtl = lang === 'ar';
  const name = creator.displayName || creator.platformUsername;
  const title = creator.streamTitle?.trim();
  const category = creator.category?.trim();
  const viewerCount = creator.viewerCount && creator.viewerCount > 0 ? creator.viewerCount : null;
  const watch = rtl ? 'شاهد البث' : 'WATCH LIVE';
  return <Link className="live-stream-card" href={`/live/${encodeURIComponent(creator.slug)}`} aria-label={`${watch}: ${name}`}>
    <div className="live-stream-cover">
      {creator.thumbnailUrl && !thumbnailFailed ? <img src={creator.thumbnailUrl} alt="" loading="lazy" onError={() => setThumbnailFailed(true)} /> : <div className="live-stream-placeholder"><Radio aria-hidden="true" /></div>}
      <span className="live-stream-badge"><i />LIVE</span>
      <span className="live-platform-badge"><PlatformIcon platform={creator.platform} />{creator.platform}</span>
    </div>
    <div className="live-stream-body">
      <div className="live-stream-name"><div className="live-stream-identity"><LiveAvatar creator={creator} /><div><h3>{name}</h3><span><PlatformIcon platform={creator.platform} />{creator.platform}</span></div></div></div>
      {title && <p className="live-stream-title">{title}</p>}
      {(category || viewerCount) && <div className="live-stream-meta">{category && <span>{category}</span>}{viewerCount && <span><Eye size={14} />{viewerCount.toLocaleString()}</span>}</div>}
      <span className="watch-live-button">{watch}<ArrowUpRight size={16} /></span>
    </div>
  </Link>;
}

export default function LiveNow({ lang }: { lang: Lang }) {
  const [creators, setCreators] = useState<Creator[]>([]);
  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/live');
      if (response.ok) setCreators(await response.json());
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const liveCreators = creators.filter((creator) => creator.isLive).sort((a, b) => Number(b.featured) - Number(a.featured) || (b.viewerCount ?? 0) - (a.viewerCount ?? 0)).slice(0, 4);
  if (!liveCreators.length) return null;
  const rtl = lang === 'ar';
  return <section className="home-live-now" dir={rtl ? 'rtl' : 'ltr'} aria-labelledby="home-live-heading"><div className="home-live-head"><div><p><span className="home-live-dot" />RK75 / LIVE NOW</p><h2 id="home-live-heading">{rtl ? 'يبث الآن' : 'LIVE NOW'}</h2></div><Link href="/live">{rtl ? 'كل البثوث المباشرة' : 'VIEW ALL LIVE STREAMS'}<ArrowUpRight size={17} /></Link></div><div className="home-live-grid">{liveCreators.map((creator) => <LiveStreamCard key={creator.id} creator={creator} lang={lang} />)}</div></section>;
}
