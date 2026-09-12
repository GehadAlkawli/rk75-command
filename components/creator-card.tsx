'use client';

import { Eye, Radio, Users } from 'lucide-react';

export type Creator = { id: number; slug: string; platform: 'kick' | 'twitch' | 'youtube'; platformUsername: string; originalUrl: string; normalizedUrl: string; displayName: string | null; avatarUrl: string | null; featured: boolean; active: boolean; isLive: boolean; liveStatus: 'live' | 'offline' | 'unknown'; currentVideoId: string | null; streamTitle: string | null; thumbnailUrl: string | null; viewerCount: number | null; category: string | null };
export type Lang = 'ar' | 'en';

export function CreatorCard({ creator, lang }: { creator: Creator; lang: Lang }) {
  const live = creator.isLive; const name = creator.displayName || creator.platformUsername;
  return <a className={`creator-card ${live ? 'creator-card-live' : ''}`} href={`/live/${encodeURIComponent(creator.slug)}`}><div className="creator-cover">{creator.thumbnailUrl ? <img src={creator.thumbnailUrl} alt=""/> : <div className="creator-cover-empty"><Radio/></div>}<span className={`live-pill ${live ? 'is-live' : `is-${creator.liveStatus}`}`}>{live ? <><i/>LIVE</> : creator.liveStatus === 'unknown' ? (lang === 'ar' ? 'غير متاح' : 'UNKNOWN') : (lang === 'ar' ? 'غير متصل' : 'OFFLINE')}</span><b className="platform-pill">{creator.platform}</b></div><div className="creator-card-body"><div className="creator-name">{creator.avatarUrl ? <img src={creator.avatarUrl} alt=""/> : <span>{name.slice(0, 1).toUpperCase()}</span>}<div><h3>{name}</h3><small>@{creator.platformUsername}</small></div></div><p>{creator.streamTitle || (lang === 'ar' ? 'القناة محفوظة وجاهزة للبث' : 'Channel saved and ready to go live')}</p><div className="creator-meta">{creator.category && <span><Users size={14}/>{creator.category}</span>}{live && creator.viewerCount !== null && <span><Eye size={14}/>{creator.viewerCount.toLocaleString()}</span>}</div></div></a>;
}
