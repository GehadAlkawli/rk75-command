'use client';

/* oxlint-disable next/no-img-element -- Platform avatars are remote, user-selected channel images. */
import { BadgeCheck, Eye, ExternalLink, Play, Radio, Tv } from 'lucide-react';
import { useState } from 'react';
import type { Creator, Lang } from '@/components/creator-card';

const compact = (value: number, lang: Lang) => new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function PlatformMark({ platform }: Pick<Creator, 'platform'>) {
  if (platform === 'youtube') return <Play aria-hidden="true" />;
  if (platform === 'twitch') return <Tv aria-hidden="true" />;
  return <Radio aria-hidden="true" />;
}

function Avatar({ creator }: { creator: Creator }) {
  const [failed, setFailed] = useState(false);
  const name = creator.displayName || creator.platformUsername;
  if (!creator.avatarUrl || failed) return <span className="channel-creator-avatar channel-creator-avatar-fallback" aria-label={name}>{name.slice(0, 1).toUpperCase()}</span>;
  return <img className="channel-creator-avatar" src={creator.avatarUrl} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}

export default function CreatorChannelRow({ creator, lang }: { creator: Creator; lang: Lang }) {
  const rtl = lang === 'ar';
  const name = creator.displayName || creator.platformUsername;
  const platformLabel = creator.platform.toUpperCase();
  const count = creator.platform === 'youtube' ? creator.subscriberCount : creator.followerCount;
  const countLabel = creator.platform === 'youtube' ? (rtl ? 'مشترك' : 'subscribers') : (rtl ? 'متابع' : 'followers');
  const viewerLabel = creator.viewerCount && creator.viewerCount > 0 ? `${compact(creator.viewerCount, lang)} ${rtl ? 'مشاهد' : 'watching'}` : null;
  const followLabel = creator.isLive ? (rtl ? 'شاهد' : 'WATCH') : creator.platform === 'youtube' ? (rtl ? 'اشترك' : 'SUBSCRIBE') : (rtl ? 'تابع' : 'FOLLOW');
  const channelLabel = rtl ? 'القناة' : 'CHANNEL';
  const externalProps = { target: '_blank', rel: 'noopener noreferrer' } as const;

  return <article className={`creator-channel-row${creator.isLive ? ' is-live' : ''}`}>
    <a className="channel-creator-profile" href={creator.originalUrl} {...externalProps} aria-label={`${channelLabel}: ${name}`}>
      <span className="channel-creator-avatar-wrap"><Avatar creator={creator} />{creator.isLive && <i className="channel-live-dot" aria-label="Live" />}</span>
      <span className="channel-creator-copy"><strong>{name}</strong><small>{creator.isLive ? <><b><i />LIVE</b>{viewerLabel && <> · {viewerLabel}</>}</> : count ? `${compact(count, lang)} ${countLabel}` : <><PlatformMark platform={creator.platform} />{platformLabel}</>}</small></span>
    </a>
    <div className="creator-channel-actions">
      <a href={creator.originalUrl} {...externalProps} className="channel-secondary-action" aria-label={`${channelLabel}: ${name}`}><ExternalLink size={14} />{channelLabel}</a>
      <a href={creator.originalUrl} {...externalProps} className="channel-primary-action" aria-label={`${followLabel}: ${name}`}><>{creator.isLive ? <Eye size={14} /> : <BadgeCheck size={14} />}{followLabel}</></a>
    </div>
  </article>;
}
