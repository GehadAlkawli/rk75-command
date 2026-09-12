'use client';

/* oxlint-disable next/no-img-element -- Platform APIs return dynamic remote image URLs. */
import { ArrowUpRight, Clapperboard, Eye, Radio, Users } from 'lucide-react';
import { useState } from 'react';
import type { Creator, Lang } from '@/components/creator-card';

export function formatCompactNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function platformLabel(platform: Creator['platform']) {
  return platform === 'youtube' ? 'YouTube' : platform === 'twitch' ? 'Twitch' : 'Kick';
}

export default function HomepageCreatorCard({ creator, lang }: { creator: Creator; lang: Lang }) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const rtl = lang === 'ar';
  const name = creator.displayName || creator.platformUsername;
  const handle = creator.platformUsername ? `@${creator.platformUsername}` : null;
  const audience = creator.platform === 'youtube' ? creator.subscriberCount : creator.followerCount ?? creator.subscriberCount;
  const audienceCount = formatCompactNumber(audience);
  const videoCount = formatCompactNumber(creator.videoCount);
  const viewerCount = creator.isLive && creator.viewerCount && creator.viewerCount > 0 ? formatCompactNumber(creator.viewerCount) : null;
  const initial = name.slice(0, 1).toUpperCase();

  return <a className={`homepage-creator-card${creator.isLive ? ' is-live' : ''}`} href={creator.originalUrl} target="_blank" rel="noopener noreferrer" aria-label={`${rtl ? 'فتح قناة' : 'Open channel'} ${name}`}>
    <div className="homepage-creator-media">
      {creator.bannerUrl && !bannerFailed ? <img className="homepage-creator-banner" src={creator.bannerUrl} alt="" loading="lazy" onError={() => setBannerFailed(true)} />
        : creator.avatarUrl && !avatarFailed ? <div className="homepage-creator-banner-fallback"><img src={creator.avatarUrl} alt="" loading="lazy" onError={() => setAvatarFailed(true)} /></div>
          : <div className="homepage-creator-banner-empty" aria-hidden="true" />}
      {creator.isLive && <span className="homepage-creator-live"><i />LIVE</span>}
    </div>
    <div className="homepage-creator-content">
      <div className="homepage-creator-profile">
        {creator.avatarUrl && !avatarFailed ? <img className="homepage-creator-avatar" src={creator.avatarUrl} alt={name} loading="lazy" onError={() => setAvatarFailed(true)} /> : <span className="homepage-creator-avatar homepage-creator-avatar-fallback" aria-label={name}>{initial}</span>}
        <div><h3>{name}</h3>{handle && <p dir="ltr">{handle}</p>}</div>
      </div>
      {(audienceCount || videoCount) && <div className="homepage-creator-stats">
        {audienceCount && <span title={creator.platform === 'youtube' ? (rtl ? 'المشتركون' : 'Subscribers') : (rtl ? 'المتابعون' : 'Followers')}><Users aria-hidden="true" /> <b>{audienceCount}</b></span>}
        {videoCount && <span title={rtl ? 'الفيديوهات' : 'Videos'}><Clapperboard aria-hidden="true" /> <b>{videoCount}</b><small>{rtl ? 'فيديو' : 'videos'}</small></span>}
      </div>}
      {viewerCount && <div className="homepage-creator-viewers"><Eye aria-hidden="true" /><b>{viewerCount}</b><span>{rtl ? 'يشاهدون الآن' : 'watching now'}</span></div>}
      <div className="homepage-creator-platform"><span><Radio aria-hidden="true" />{platformLabel(creator.platform)}</span><ArrowUpRight aria-hidden="true" /></div>
    </div>
  </a>;
}
