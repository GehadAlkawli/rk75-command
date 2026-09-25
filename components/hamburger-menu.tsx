'use client';

import {
  Camera,
  LogIn,
  Menu,
  Moon,
  Pencil,
  Plus,
  Shield,
  Sun,
  X,
} from 'lucide-react';
import {
  type ChangeEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

type Locale = 'ar' | 'en';
type Direction = 'rtl' | 'ltr';
type Theme = 'light' | 'dark';

type Profile = {
  role: 'player' | 'admin';
  playerId?: string;
  displayName: string;
  avatarUrl: string | null;
};

type HamburgerMenuProps = {
  /** Navigation links and actions shown under the account area. */
  children: ReactNode;
  /** Visible and accessible name for the menu trigger. */
  label?: string;
  /** Determines the visual copy used inside the drawer. */
  locale?: Locale;
  /** Determines which side the drawer slides in from. */
  direction?: Direction;
};

const copy = {
  ar: {
    menu: 'القائمة',
    close: 'إغلاق القائمة',
    guest: 'زائر RK75',
    guestHint: 'سجّل دخولك لحفظ ملفك وإحصائياتك.',
    signIn: 'تسجيل الدخول',
    register: 'إنشاء حساب',
    member: 'عضو RK75',
    administrator: 'إدارة RK75',
    editProfile: 'تعديل الملف الشخصي',
    profile: 'الملف الشخصي',
    name: 'الاسم الظاهر',
    avatar: 'الصورة الشخصية',
    avatarHint: 'JPG أو PNG أو WEBP حتى 2 MB',
    save: 'حفظ التغييرات',
    cancel: 'إلغاء',
    saving: 'جارٍ الحفظ…',
    profileError: 'تعذر حفظ الملف الشخصي. حاول مرة أخرى.',
    dark: 'الوضع الداكن',
    light: 'الوضع الصباحي',
    appearance: 'المظهر',
    darkHint: 'ألوان داكنة مريحة للعين',
    lightHint: 'ألوان الزجاج الحالية',
    control: 'لوحة التحكم',
  },
  en: {
    menu: 'Menu',
    close: 'Close menu',
    guest: 'RK75 guest',
    guestHint: 'Sign in to save your profile and statistics.',
    signIn: 'Sign in',
    register: 'Create account',
    member: 'RK75 member',
    administrator: 'RK75 administration',
    editProfile: 'Edit profile',
    profile: 'Profile',
    name: 'Display name',
    avatar: 'Profile picture',
    avatarHint: 'JPG, PNG, or WEBP up to 2 MB',
    save: 'Save changes',
    cancel: 'Cancel',
    saving: 'Saving…',
    profileError: 'Your profile could not be saved. Try again.',
    dark: 'Dark mode',
    light: 'Day mode',
    appearance: 'Appearance',
    darkHint: 'A comfortable dark color palette',
    lightHint: 'The current glass colors',
    control: 'Control panel',
  },
} as const;

function initial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || 'R';
}

/**
 * Shared site drawer. It preserves page-specific links while adding a
 * persistent appearance setting and a real signed-in player profile.
 */
export function HamburgerMenu({
  children,
  label,
  locale,
  direction,
}: HamburgerMenuProps) {
  const activeLocale: Locale = locale ?? (label === 'Menu' ? 'en' : 'ar');
  const activeDirection: Direction = direction ?? (activeLocale === 'ar' ? 'rtl' : 'ltr');
  const t = copy[activeLocale];
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('rk75-theme') === 'dark'
      ? 'dark'
      : 'light'
  ));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const profileRequestRef = useRef(false);

  function closeDrawer() {
    setIsOpen(false);
    setEditingProfile(false);
    setProfileError('');
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('hidden'));

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.body.classList.add('rk-drawer-open');
    document.addEventListener('keydown', handleKeyDown);
    window.requestAnimationFrame(() => drawerRef.current?.focus());

    return () => {
      document.body.classList.remove('rk-drawer-open');
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const pageRoots = Array.from(document.body.children).filter(
      (element) => !element.classList.contains('rk-drawer-layer'),
    );

    for (const root of pageRoots) {
      root.setAttribute('inert', '');
      root.setAttribute('aria-hidden', 'true');
    }

    return () => {
      for (const root of pageRoots) {
        root.removeAttribute('inert');
        root.removeAttribute('aria-hidden');
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function closeAfterDrawerNavigation(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest('.rk-side-drawer a, .rk-side-drawer .lang-switch, .rk-side-drawer .admin-trigger, .rk-side-drawer [data-menu-close]')) {
        closeDrawer();
      }
    }

    document.addEventListener('click', closeAfterDrawerNavigation);
    return () => document.removeEventListener('click', closeAfterDrawerNavigation);
  }, [isOpen]);

  async function loadProfile() {
    if (profileLoaded || profileRequestRef.current) return;

    profileRequestRef.current = true;
    setProfileLoading(true);

    try {
      const response = await fetch('/api/profile');
      setProfile(response.ok ? await response.json() as Profile : null);
    } catch {
      setProfile(null);
    } finally {
      profileRequestRef.current = false;
      setProfileLoaded(true);
      setProfileLoading(false);
    }
  }

  function openDrawer() {
    setIsOpen(true);
    void loadProfile();
  }

  function changeTheme() {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('rk75-theme', nextTheme);
  }

  function beginProfileEdit() {
    if (!profile || profile.role !== 'player') return;
    setProfileName(profile.displayName);
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfileError('');
    setEditingProfile(true);
  }

  function cancelProfileEdit() {
    setEditingProfile(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setProfileError('');
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setAvatarFile(nextFile);
    setAvatarPreview(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  async function saveProfile(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || profile.role !== 'player') return;

    setSavingProfile(true);
    setProfileError('');

    const form = new FormData();
    form.set('displayName', profileName.trim());
    if (avatarFile) form.set('avatar', avatarFile);

    try {
      const response = await fetch('/api/profile', { method: 'PATCH', body: form });
      const result = await response.json().catch(() => ({})) as Profile & { error?: string };

      if (!response.ok) {
        setProfileError(result.error || t.profileError);
        return;
      }

      setProfile({
        ...result,
        avatarUrl: result.avatarUrl ? `${result.avatarUrl}?v=${Date.now()}` : null,
      });
      cancelProfileEdit();
    } catch {
      setProfileError(t.profileError);
    } finally {
      setSavingProfile(false);
    }
  }

  const avatarSource = avatarPreview || profile?.avatarUrl;
  const displayName = profile?.displayName || t.guest;
  const profileDetail = profile?.role === 'player'
    ? `${t.member}${profile.playerId ? ` · #${profile.playerId}` : ''}`
    : profile?.role === 'admin'
      ? t.administrator
      : t.guestHint;

  const drawer = isOpen && typeof document !== 'undefined' ? createPortal(
    <div className="rk-drawer-layer" data-state="open" dir={activeDirection}>
      <button type="button" className="rk-drawer-backdrop" aria-label={t.close} onClick={closeDrawer} />

      <dialog
        open
        id={panelId}
        ref={drawerRef}
        className="rk-side-drawer"
        aria-label={label || t.menu}
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="rk-drawer-topline">
          <span>{t.menu}</span>
          <button type="button" className="rk-drawer-close" onClick={closeDrawer} aria-label={t.close}>
            <X aria-hidden="true" />
          </button>
        </div>

        <section className={`rk-drawer-profile${profileLoading ? ' is-loading' : ''}`} aria-label={t.profile}>
          <div className="rk-drawer-avatar" aria-hidden="true">
            {avatarSource ? (
              // oxlint-disable-next-line nextjs/no-img-element -- This private, session-bound endpoint must be requested directly by the member's browser.
              <img src={avatarSource} alt="" />
            ) : profile?.role === 'admin' ? <Shield /> : <span>{initial(displayName)}</span>}
          </div>

          <div className="rk-drawer-profile-copy">
            <strong>{displayName}</strong>
            <span>{profileDetail}</span>
          </div>

          {profile?.role === 'player' && !editingProfile && (
            <button type="button" className="rk-drawer-profile-edit" onClick={beginProfileEdit}>
              <Pencil size={15} />
              {t.editProfile}
            </button>
          )}

          {profile?.role === 'admin' && (
            <Link className="rk-drawer-profile-edit" href="/admin/streams" onClick={closeDrawer}>
              <Shield size={15} />
              {t.control}
            </Link>
          )}

          {!profile && profileLoaded && !profileLoading && (
            <div className="rk-drawer-guest-actions">
              <Link href="/?auth=login" onClick={closeDrawer}><LogIn size={16} />{t.signIn}</Link>
              <Link href="/?auth=register" onClick={closeDrawer}><Plus size={16} />{t.register}</Link>
            </div>
          )}
        </section>

        {editingProfile && profile?.role === 'player' && (
          <form className="rk-drawer-profile-form" onSubmit={saveProfile}>
            <label>
              <span>{t.name}</span>
              <input value={profileName} minLength={2} maxLength={60} required onChange={(event) => setProfileName(event.target.value)} />
            </label>

            <label className="rk-drawer-avatar-picker">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectAvatar} />
              <Camera size={17} />
              <span>{t.avatar}</span>
              <small>{t.avatarHint}</small>
            </label>

            {profileError && <p className="rk-drawer-profile-error" role="alert">{profileError}</p>}

            <div className="rk-drawer-profile-actions">
              <button className="rk-drawer-profile-save" disabled={savingProfile}>{savingProfile ? t.saving : t.save}</button>
              <button type="button" className="rk-drawer-profile-cancel" onClick={cancelProfileEdit}>{t.cancel}</button>
            </div>
          </form>
        )}

        <section className="rk-drawer-theme" aria-label={t.appearance}>
          <div>
            {theme === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            <span>
              <strong>{theme === 'dark' ? t.dark : t.light}</strong>
              <small>{theme === 'dark' ? t.darkHint : t.lightHint}</small>
            </span>
          </div>
          <button
            type="button"
            className="rk-drawer-theme-switch"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={t.dark}
            onClick={changeTheme}
          >
            <span />
          </button>
        </section>

        <nav className="rk-drawer-nav" aria-label={t.menu}>
          {children}
        </nav>
      </dialog>
    </div>,
    document.body,
  ) : null;

  return (
    <div className={`hamburger-menu${isOpen ? ' is-open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="hamburger-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={label || t.menu}
        onClick={() => isOpen ? closeDrawer() : openDrawer()}
      >
        <Menu aria-hidden="true" />
        <span className="hamburger-trigger-label">{label || t.menu}</span>
      </button>
      {drawer}
    </div>
  );
}

export default HamburgerMenu;
