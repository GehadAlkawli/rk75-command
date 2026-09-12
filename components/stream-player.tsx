'use client';

import { useEffect, useState } from 'react';

type Props = { platform: 'kick' | 'twitch' | 'youtube'; username: string; videoId?: string | null; originalUrl: string; label: string };

export default function StreamPlayer({ platform, username, videoId, originalUrl, label }: Props) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (platform === 'twitch') { setEmbedUrl(`https://player.twitch.tv/?channel=${encodeURIComponent(username)}&parent=${encodeURIComponent(window.location.hostname)}&autoplay=false`); return; }
    if (platform === 'kick') { setEmbedUrl(`https://player.kick.com/${encodeURIComponent(username)}?autoplay=false`); return; }
    if (platform === 'youtube' && videoId) { setEmbedUrl(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=0&playsinline=1`); return; }
    setEmbedUrl(null);
  }, [platform, username, videoId]);
  if (!embedUrl) return <div className="stream-fallback"><a href={originalUrl} target="_blank" rel="noopener noreferrer">{label}</a></div>;
  return <div className="stream-player"><iframe src={embedUrl} title="RK75 live stream" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin"/></div>;
}
