'use client';

/* oxlint-disable next/no-img-element -- Creator avatars and thumbnails are remote platform URLs. */
import Link from 'next/link';
import { Eye, Play, Radio, Tv, Users } from 'lucide-react';
import { useState } from 'react';

export type Creator = { id: number; slug: string; platform: 'kick' | 'twitch' | 'youtube'; platformUsername: string; originalUrl: string; normalizedUrl: string; displayName: string | null; avatarUrl: string | null; subscriberCount: number | null; followerCount: number | null; featured: boolean; active: boolean; homepageVisible: boolean; sortOrder: number; isLive: boolean; liveStatus: 'live' | 'offline' | 'unknown'; currentVideoId: string | null; streamTitle: string | null; thumbnailUrl: string | null; viewerCount: number | null; category: string | null };
export type Lang = 'ar' | 'en';

type CreatorCardProps = { creator: Creator; lang: Lang; mode?: 'watch' | 'channel' };

function PlatformIcon({ platform }: Pick<Creator, 'platform'>) {
  if (platform === 'youtube') return <Play aria-hidden="true" />;
  if (platform === 'twitch') return <Tv aria-hidden="true" />;
  return <Radio aria-hidden="true" />;
}

function CreatorAvatar({ creator, className }: { creator: Creator; className: string }) {
  const [failed, setFailed] = useState(false);
  const name = creator.displayName || creator.platformUsername;
  if (!creator.avatarUrl || failed) return <span className={`${className} creator-avatar-fallback`} aria-label={name}>{name.slice(0, 1).toUpperCase()}</span>;
  return <img className={className} src={creator.avatarUrl} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

export function CreatorCard({ creator, lang, mode = 'watch' }: CreatorCardProps) {
  const live = creator.isLive;
  const name = creator.displayName || creator.platformUsername;
  const rtl = lang === 'ar';
  const viewerCount = creator.viewerCount && creator.viewerCount > 0 ? creator.viewerCount : null;
  const actionLabel = creator.platform === 'youtube' ? (rtl ? 'اشترك' : 'SUBSCRIBE') : creator.platform === 'kick' || creator.platform === 'twitch' ? (rtl ? 'تابع' : 'FOLLOW') : (rtl ? 'زيارة القناة' : 'VISIT CHANNEL');

  if (mode === 'channel') {
    return <article className="home-creator-card">
      <a className="creator-card-hitarea" href={creator.originalUrl} target="_blank" rel="noopener noreferrer" aria-label={`${name} — ${creator.platform}`} />
      <div className="home-creator-avatar-wrap">
        <CreatorAvatar creator={creator} className="home-creator-avatar" />
        {live && <span className="home-creator-live"><i />LIVE</span>}
      </div>
      <div className="home-creator-info">
        <h3>{name}</h3>
        <span className="home-platform"><PlatformIcon platform={creator.platform} />{creator.platform}</span>
      </div>
      <a href={creator.originalUrl} target="_blank" rel="noopener noreferrer" className="creator-action-button" onClick={(event) => event.stopPropagation()} aria-label={`${actionLabel}: ${name}`}>{actionLabel}</a>
    </article>;
  }

  return <Link className={`creator-card ${live ? 'creator-card-live' : ''}`} href={`/live/${encodeURIComponent(creator.slug)}`} aria-label={`${rtl ? 'مشاهدة' : 'Watch'} ${name}`}>
    <div className="creator-cover">
      {creator.thumbnailUrl ? <img src={creator.thumbnailUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : <div className="creator-cover-empty"><Radio /></div>}
      <span className={`live-pill ${live ? 'is-live' : `is-${creator.liveStatus}`}`}>{live ? <><i />LIVE</> : creator.liveStatus === 'unknown' ? (rtl ? 'غير متاح' : 'UNKNOWN') : (rtl ? 'غير متصل' : 'OFFLINE')}</span>
      <b className="platform-pill"><PlatformIcon platform={creator.platform} />{creator.platform}</b>
    </div>
    <div className="creator-card-body">
      <div className="creator-name"><CreatorAvatar creator={creator} className="creator-name-avatar" /><div><h3>{name}</h3><small>@{creator.platformUsername}</small></div></div>
      <p>{creator.streamTitle || (rtl ? 'القناة محفوظة وجاهزة للبث' : 'Channel saved and ready to go live')}</p>
      <div className="creator-meta">{creator.category && <span><Users size={14} />{creator.category}</span>}{live && viewerCount && <span><Eye size={14} />{viewerCount.toLocaleString()}</span>}</div>
    </div>
  </Link>;
}
