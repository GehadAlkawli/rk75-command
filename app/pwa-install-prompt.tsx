'use client';

import { Download, Home, Share2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const dismissedKey = 'rk75-pwa-install-dismissed';

function isAppleMobileDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export default function PwaInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppleDevice, setIsAppleDevice] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showAppleSteps, setShowAppleSteps] = useState(false);

  useEffect(() => {
    const appleDevice = isAppleMobileDevice();
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    setIsInstalled(isStandalone);
    setIsAppleDevice(appleDevice);
    // iPhone has no browser install popup, so its help path stays available.
    setIsDismissed(!appleDevice && window.localStorage.getItem(dismissedKey) === 'true');

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
    if (!isAppleDevice) window.localStorage.setItem(dismissedKey, 'true');
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
    <>
      <aside className="pwa-install" aria-label="تثبيت تطبيق RK75">
        <button className="pwa-dismiss" type="button" onClick={dismiss} aria-label="إغلاق">
          <X size={15} aria-hidden="true" />
        </button>
        <div className="pwa-mark" aria-hidden="true"><b>RK</b><span>75</span></div>
        <div className="pwa-copy">
          <strong>ثبّت RK75 كتطبيق</strong>
          <small>{isAppleDevice ? 'خطوتان فقط لإضافته إلى شاشة iPhone الرئيسية.' : 'وصول سريع من شاشة هاتفك الرئيسية.'}</small>
        </div>
        {isAppleDevice ? (
          <button className="pwa-install-button pwa-ios-install-button" type="button" onClick={() => setShowAppleSteps(true)}>
            <Share2 size={15} aria-hidden="true" /> طريقة التثبيت
          </button>
        ) : prompt ? (
          <button className="pwa-install-button" type="button" onClick={() => void install()}>
            <Download size={15} aria-hidden="true" /> تثبيت
          </button>
        ) : null}
      </aside>

      {showAppleSteps && (
        <div className="pwa-ios-steps" role="dialog" aria-modal="true" aria-labelledby="pwa-ios-title">
          <section className="pwa-ios-card">
            <button className="pwa-ios-close" type="button" onClick={() => setShowAppleSteps(false)} aria-label="إغلاق التعليمات">
              <X size={18} aria-hidden="true" />
            </button>
            <span className="pwa-ios-kicker">RK75 FOR IPHONE</span>
            <h2 id="pwa-ios-title">ثبّت RK75 على iPhone</h2>
            <p>يعمل كتطبيق مستقل بدون تنزيل APK.</p>
            <ol>
              <li><Share2 aria-hidden="true" /><span>افتح هذا الموقع في <b>Safari</b> ثم اضغط زر <b>المشاركة</b>.</span></li>
              <li><Home aria-hidden="true" /><span>اختر <b>Add to Home Screen</b> / <b>إضافة إلى الشاشة الرئيسية</b> ثم اضغط <b>Add</b>.</span></li>
            </ol>
            <button className="pwa-ios-done" type="button" onClick={() => setShowAppleSteps(false)}>فهمت</button>
          </section>
        </div>
      )}
    </>
  );
}
