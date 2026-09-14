'use client';

import { Download, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const dismissedKey = 'rk75-pwa-install-dismissed';

export default function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(isStandalone);
    setIsAppleDevice(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsDismissed(window.localStorage.getItem(dismissedKey) === 'true');

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };

    const markInstalled = () => setIsInstalled(true);
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  const dismiss = () => {
    window.localStorage.setItem(dismissedKey, 'true');
    setIsDismissed(true);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') setIsInstalled(true);
    setPrompt(null);
  };

  if (isDismissed || isInstalled || (!prompt && !isAppleDevice)) return null;

  return (
    <aside className="pwa-install" aria-label="تثبيت تطبيق RK75">
      <button className="pwa-dismiss" type="button" onClick={dismiss} aria-label="إغلاق">
        <X size={15} aria-hidden="true" />
      </button>
      <div className="pwa-mark" aria-hidden="true"><b>RK</b><span>75</span></div>
      <div className="pwa-copy">
        <strong>ثبّت RK75 كتطبيق</strong>
        <small>{isAppleDevice ? 'في iPhone: اضغط مشاركة ثم Add to Home Screen.' : 'وصول سريع من شاشة هاتفك الرئيسية.'}</small>
      </div>
      {prompt ? (
        <button className="pwa-install-button" type="button" onClick={() => void install()}>
          <Download size={15} aria-hidden="true" /> تثبيت
        </button>
      ) : (
        <span className="pwa-ios-icon" aria-label="زر المشاركة في iPhone"><Share2 size={17} aria-hidden="true" /></span>
      )}
    </aside>
  );
}
