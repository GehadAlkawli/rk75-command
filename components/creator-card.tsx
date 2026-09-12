'use client';

/* oxlint-disable next/no-img-element -- Creator avatars and thumbnails are remote platform URLs. */
import Link from 'next/link';
import { Eye, ExternalLink, Play, Radio, Tv, Users } from 'lucide-react';
import { useState } from 'react';

export type Creator = {
  id: number;
  slug: string;

  platform: 'kick' | 'twitch' | 'youtube';
  platformUsername: string;
  originalUrl: string;
  normalizedUrl: string;

  // Profile
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  description: string | null;

  // Statistics
  subscriberCount: number | null;
  followerCount: number | null;
  videoCount: number | null;
  totalViewCount: number | null;

  // Visibility & ordering
  featured: boolean;
  active: boolean;
  homepageVisible: boolean;
  sortOrder: number;

  // Live status
  isLive: boolean;
  liveStatus: 'live' | 'offline' | 'unknown';
  currentVideoId: string | null;
  streamTitle: string | null;
  thumbnailUrl: string | null;
  viewerCount: number | null;
  category: string | null;
};
export type Lang = 'ar' | 'en';

type CreatorCardProps = {
  creator: Creator;
  lang: Lang;
  mode?: 'watch' | 'hub';
};

function PlatformIcon({ platform }: Pick<Creator, 'platform'>) {
  if (platform === 'youtube') return <Play aria-hidden="true" />;
  if (platform === 'twitch') return <Tv aria-hidden="true" />;
  return <Radio aria-hidden="true" />;
}

function CreatorAvatar({
  creator,
  className,
}: {
  creator: Creator;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  const name = creator.displayName || creator.platformUsername;

  if (!creator.avatarUrl || failed) {
    return (
      <span
        className={`${className} creator-avatar-fallback`}
        aria-label={name}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className={className}
      src={creator.avatarUrl}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function CreatorCard({
  creator,
  lang,
  mode = 'watch',
}: CreatorCardProps) {
  const live = creator.isLive;
  const name = creator.displayName || creator.platformUsername;
  const rtl = lang === 'ar';

  const viewerCount =
    creator.viewerCount && creator.viewerCount > 0
      ? creator.viewerCount
      : null;

  const audienceCount =
    creator.platform === 'youtube'
      ? creator.subscriberCount
      : creator.followerCount;

  const audienceLabel =
    creator.platform === 'youtube'
      ? rtl
        ? 'مشترك'
        : 'subscribers'
      : rtl
        ? 'متابع'
        : 'followers';

  const compact = (value: number) =>
    new Intl.NumberFormat(rtl ? 'ar' : 'en', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  /*
   * Full Creator Hub card.
   * Used only on /creators.
   */
  if (mode === 'hub') {
    return (
      <article
        className={`creator-hub-card${live ? ' creator-hub-card-live' : ''}`}
      >
        {creator.bannerUrl ? (
          <div className="creator-hub-banner">
            <img
              src={creator.bannerUrl}
              alt=""
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
            <div className="creator-hub-banner-overlay" />
          </div>
        ) : (
          <div className="creator-hub-banner creator-hub-banner-empty" />
        )}

        <div className="creator-hub-main">
          <div className="creator-hub-top">
            <div className="creator-hub-avatar-wrap">
              <CreatorAvatar
                creator={creator}
                className="creator-hub-avatar"
              />

              {live && (
                <span className="creator-hub-live">
                  <i />
                  LIVE
                </span>
              )}
            </div>

            <div className="creator-hub-identity">
              <div className="creator-hub-name-row">
                <h3>{name}</h3>

                <span className="creator-hub-platform">
                  <PlatformIcon platform={creator.platform} />
                  {creator.platform}
                </span>
              </div>

              <small>@{creator.platformUsername}</small>
            </div>
          </div>

          <div className="creator-hub-status">
            <span className={`creator-hub-status-dot ${live ? 'live' : creator.liveStatus}`}>
              <i />
              {live
                ? rtl
                  ? 'مباشر الآن'
                  : 'LIVE NOW'
                : creator.liveStatus === 'unknown'
                  ? rtl
                    ? 'الحالة غير معروفة'
                    : 'STATUS UNKNOWN'
                  : rtl
                    ? 'غير متصل'
                    : 'OFFLINE'}
            </span>

            {creator.category && (
              <span className="creator-hub-category">
                {creator.category}
              </span>
            )}

            {live && viewerCount !== null && (
              <span className="creator-hub-viewers">
                <Eye size={13} />
                {compact(viewerCount)} {rtl ? 'مشاهد' : 'watching'}
              </span>
            )}
          </div>

          {creator.streamTitle && live && (
            <p className="creator-hub-stream-title">
              {creator.streamTitle}
            </p>
          )}

          {creator.description && (
            <p className="creator-hub-description">
              {creator.description}
            </p>
          )}

          <div className="creator-hub-stats">
            {audienceCount !== null && (
              <span>
                <Users size={14} />
                <b>{compact(audienceCount)}</b>
                {audienceLabel}
              </span>
            )}

            {creator.videoCount !== null && (
              <span>
                <Play size={14} />
                <b>{compact(creator.videoCount)}</b>
                {rtl ? 'فيديو' : 'videos'}
              </span>
            )}

            {creator.totalViewCount !== null && (
              <span>
                <Eye size={14} />
                <b>{compact(creator.totalViewCount)}</b>
                {rtl ? 'مشاهدة' : 'views'}
              </span>
            )}
          </div>

          <div className="creator-hub-actions">
            {live && (
              <Link
                href={`/live/${encodeURIComponent(creator.slug)}`}
                className="creator-hub-watch"
              >
                <Eye size={15} />
                {rtl ? 'مشاهدة البث' : 'WATCH LIVE'}
              </Link>
            )}

            <a
              href={creator.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="creator-hub-channel"
            >
              <ExternalLink size={14} />
              {rtl ? 'زيارة القناة' : 'VISIT CHANNEL'}
            </a>
          </div>
        </div>
      </article>
    );
  }

  /*
   * Existing live/watch card.
   * Kept unchanged for /live and other watch surfaces.
   */
  return (
    <Link
      className={`creator-card ${live ? 'creator-card-live' : ''}`}
      href={`/live/${encodeURIComponent(creator.slug)}`}
      aria-label={`${rtl ? 'مشاهدة' : 'Watch'} ${name}`}
    >
      <div className="creator-cover">
        {creator.thumbnailUrl ? (
          <img
            src={creator.thumbnailUrl}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="creator-cover-empty">
            <Radio />
          </div>
        )}

        <span
          className={`live-pill ${
            live ? 'is-live' : `is-${creator.liveStatus}`
          }`}
        >
          {live ? (
            <>
              <i />
              LIVE
            </>
          ) : creator.liveStatus === 'unknown' ? (
            rtl ? (
              'غير متاح'
            ) : (
              'UNKNOWN'
            )
          ) : rtl ? (
            'غير متصل'
          ) : (
            'OFFLINE'
          )}
        </span>

        <b className="platform-pill">
          <PlatformIcon platform={creator.platform} />
          {creator.platform}
        </b>
      </div>

      <div className="creator-card-body">
        <div className="creator-name">
          <CreatorAvatar
            creator={creator}
            className="creator-name-avatar"
          />

          <div>
            <h3>{name}</h3>
            <small>@{creator.platformUsername}</small>
          </div>
        </div>

        <p>
          {creator.streamTitle ||
            (rtl
              ? 'القناة محفوظة وجاهزة للبث'
              : 'Channel saved and ready to go live')}
        </p>

        <div className="creator-meta">
          {creator.category && (
            <span>
              <Users size={14} />
              {creator.category}
            </span>
          )}

          {live && viewerCount && (
            <span>
              <Eye size={14} />
              {viewerCount.toLocaleString()}
            </span>
          )}

          {audienceCount !== null && (
            <span>
              <Users size={14} />
              {compact(audienceCount)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
