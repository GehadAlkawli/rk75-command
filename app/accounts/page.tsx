'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, MessageCircle, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

type Lang = 'ar' | 'en';
type Session = { role: 'player' | 'admin'; playerId?: string } | null;
type Listing = {
  id: number; playerId: string; title: string; mainSpec: string; kingdom: string; totalPower: string; killPoints: string;
  vipLevel: string; totalTroops: string; price: string; paymentMethods: string[]; ownerDiscord: string; intermediaryDiscord: string | null;
  images: { id: number; position: number; url: string }[];
};

const methods = ['PayPal', 'Wise', 'Revolut', 'Swish', 'Bank transfer', 'Crypto', 'Other'];
const initialDraft = { title: '', mainSpec: '', kingdom: '', totalPower: '', killPoints: '', vipLevel: '', totalTroops: '', price: '', ownerDiscord: '', intermediaryDiscord: '' };
const copy = {
  ar: {
    home: 'الرئيسية', lang: 'English', tag: 'RK75 ACCOUNT EXCHANGE', title: 'سوق حسابات RK75', sub: 'اعرض حسابك، أضف مواصفاته وصوره، واتفق مباشرةً مع المشتري عبر Discord.', publish: 'عرض حساب للبيع', signed: 'انشر حسابك الآن', login: 'سجّل دخول اللاعب للنشر', empty: 'لا توجد حسابات معروضة بعد.', specs: 'المواصفات الأساسية', photos: 'صور الحساب', contact: 'التواصل والدفع', owner: 'Discord صاحب الحساب', intermediary: 'Discord الوسيط', price: 'السعر', methods: 'طرق الدفع المتاحة', noPhotos: 'لا توجد صور مضافة', remove: 'حذف العرض', deleteAsk: 'هل تريد حذف هذا العرض وصوره؟', close: 'إغلاق', publishTitle: 'انشر حسابك', publishSub: 'يمكنك إضافة حتى 9 صور. ستظهر بيانات التواصل وطرق الدفع التي تختارها للمشترين.', listingTitle: 'عنوان العرض', mainSpec: 'Main Spec', kingdom: 'Kingdom', power: 'Total Power', kp: 'Kill Points (KP)', vip: 'VIP Level', troops: 'Total Troops', choosePhotos: 'أضف صور الحساب', photoHint: 'حتى 9 صور، بحد أقصى 5 MB للصورة', cancel: 'إلغاء', publishNow: 'نشر العرض', publishing: 'جارٍ النشر…', success: 'تم نشر الحساب بنجاح.', error: 'تحقق من كل الخانات والصور ثم حاول مجدداً.', playerOnly: 'يجب تسجيل الدخول بحساب لاعب لنشر حساب للبيع.', myListing: 'عرضي', contactOwner: 'تواصل مع صاحب الحساب', contactIntermediary: 'تواصل مع الوسيط', required: 'مطلوب', marketplace: 'الحسابات', paymentInfo: 'اتفق على الدفع خارج الموقع وتحقق من الطرف الآخر قبل إتمام أي عملية.'
  },
  en: {
    home: 'Home', lang: 'العربية', tag: 'RK75 ACCOUNT EXCHANGE', title: 'RK75 Account Market', sub: 'List your account with its specs and photos, then agree directly with buyers on Discord.', publish: 'List an account', signed: 'Publish your account', login: 'Player sign in to publish', empty: 'No accounts are listed yet.', specs: 'Main specifications', photos: 'Account photos', contact: 'Contact & payment', owner: "Account owner's Discord", intermediary: "Intermediary's Discord", price: 'Price', methods: 'Available payment methods', noPhotos: 'No photos added', remove: 'Remove listing', deleteAsk: 'Delete this listing and all its photos?', close: 'Close', publishTitle: 'List your account', publishSub: 'Add up to 9 images. Your selected contact and payment details will be shown to buyers.', listingTitle: 'Listing title', mainSpec: 'Main Spec', kingdom: 'Kingdom', power: 'Total Power', kp: 'Kill Points (KP)', vip: 'VIP Level', troops: 'Total Troops', choosePhotos: 'Add account photos', photoHint: 'Up to 9 images, 5 MB maximum each', cancel: 'Cancel', publishNow: 'Publish listing', publishing: 'Publishing…', success: 'Your account is now listed.', error: 'Check every field and image, then try again.', playerOnly: 'Sign in with a player account to list an account for sale.', myListing: 'My listing', contactOwner: 'Contact owner', contactIntermediary: 'Contact intermediary', required: 'Required', marketplace: 'Accounts', paymentInfo: 'Agree on payment outside this site and verify the other party before completing any transaction.'
  },
} as const;

export default function AccountsPage() {
  const [lang, setLang] = useState<Lang>('ar');
  const [listings, setListings] = useState<Listing[]>([]);
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState(initialDraft);
  const [chosenMethods, setChosenMethods] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [activePhoto, setActivePhoto] = useState<Record<number, number>>({});
  const ar = lang === 'ar';
  const t = copy[lang];
  const load = async () => {
    setLoading(true);
    const [accountsResponse, sessionResponse] = await Promise.all([fetch('/api/accounts'), fetch('/api/session')]);
    if (accountsResponse.ok) setListings(await accountsResponse.json());
    setSession(sessionResponse.ok ? await sessionResponse.json() : null);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const photoPreviews = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);
  useEffect(() => () => photoPreviews.forEach(URL.revokeObjectURL), [photoPreviews]);
  const toggleMethod = (method: string) => setChosenMethods((current) => current.includes(method) ? current.filter((item) => item !== method) : [...current, method]);
  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    if (photos.length + incoming.length > 9) { setNotice(ar ? 'الحد الأقصى هو 9 صور.' : 'The maximum is 9 images.'); return; }
    setPhotos((current) => [...current, ...incoming]);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session || session.role !== 'player') { setNotice(t.playerOnly); return; }
    setPublishing(true); setNotice('');
    const form = new FormData();
    Object.entries(draft).forEach(([key, value]) => form.append(key, value));
    chosenMethods.forEach((method) => form.append('paymentMethods', method));
    photos.forEach((photo) => form.append('images', photo));
    const response = await fetch('/api/accounts', { method: 'POST', body: form });
    const result = await response.json().catch(() => ({}));
    setPublishing(false);
    if (!response.ok) { setNotice(result.error || t.error); return; }
    setDraft(initialDraft); setPhotos([]); setChosenMethods([]); setShowForm(false); setNotice(t.success); void load();
  };
  const remove = async (id: number) => {
    if (!window.confirm(t.deleteAsk)) return;
    const response = await fetch('/api/accounts', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
    if (response.ok) void load();
  };
  const field = (key: keyof typeof initialDraft, label: string, type = 'text') => <label className="market-field">{label}<input required type={type} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}/></label>;
  return <main className="market-page" dir={ar ? 'rtl' : 'ltr'}>
    <header className="market-nav"><a className="neo-brand" href="/"><span>RK</span><b>75</b><i>COMMAND</i></a><nav><a href="/stats">{ar ? 'قائمة الأعضاء' : 'Members'}</a><button className="lang-switch" onClick={() => setLang(ar ? 'en' : 'ar')}>{t.lang}</button><a className="stats-back" href="/"><ArrowLeft size={16}/>{t.home}</a></nav></header>
    <section className="market-hero"><div><p>{t.tag}</p><h1>{t.title}</h1><span>{t.sub}</span></div><div className="market-hero-actions">{session?.role === 'player' ? <button className="ember-button" onClick={() => { setShowForm(true); setNotice(''); }}><Plus size={18}/>{t.publish}</button> : <a className="outline-button" href="/"><ShieldCheck size={17}/>{t.login}</a>}<a className="market-home-link" href="/stats">{ar ? 'إحصائيات التحالف' : 'Alliance stats'}<ChevronRight size={16}/></a></div></section>
    {notice && <p className="market-notice">{notice}</p>}
    <section className="market-grid">{loading ? <div className="market-loading"><LoaderCircle className="spin"/>{ar ? 'جارٍ تحميل الحسابات…' : 'Loading accounts…'}</div> : listings.map((listing) => <ListingCard key={listing.id} listing={listing} t={t} isOwner={session?.role === 'admin' || session?.playerId === listing.playerId} active={activePhoto[listing.id] ?? 0} setActive={(index) => setActivePhoto({ ...activePhoto, [listing.id]: index })} onRemove={() => void remove(listing.id)}/>)}</section>
    {!loading && !listings.length && <section className="market-empty"><ImagePlus/><h2>{t.empty}</h2><span>{session?.role === 'player' ? t.signed : t.playerOnly}</span></section>}
    <p className="market-safety">{t.paymentInfo}</p>
    {showForm && <div className="market-overlay"><form className="listing-form" onSubmit={submit}><button className="close" type="button" onClick={() => setShowForm(false)}><X/></button><p>RK75 / ACCOUNT LISTING</p><h2>{t.publishTitle}</h2><span>{t.publishSub}</span><div className="listing-fields">{field('title', t.listingTitle)}<label className="market-field market-wide">{t.mainSpec}<textarea required value={draft.mainSpec} onChange={(event) => setDraft({ ...draft, mainSpec: event.target.value })}/></label>{field('kingdom', t.kingdom)}{field('totalPower', t.power)}{field('killPoints', t.kp)}{field('vipLevel', t.vip)}{field('totalTroops', t.troops)}{field('price', t.price)}{field('ownerDiscord', t.owner)}{field('intermediaryDiscord', t.intermediary)}</div><section className="payment-picker"><b>{t.methods}</b><div>{methods.map((method) => <label key={method}><input type="checkbox" checked={chosenMethods.includes(method)} onChange={() => toggleMethod(method)}/><span>{method}</span></label>)}</div></section><section className="photo-picker"><div><b>{t.choosePhotos}</b><small>{t.photoHint}</small></div><label><ImagePlus size={18}/><span>{photos.length}/9</span><input type="file" accept="image/*" multiple onChange={(event) => addPhotos(event.target.files)}/></label></section>{photos.length > 0 && <div className="photo-preview-strip">{photoPreviews.map((url, index) => <figure key={url}><img src={url} alt=""/><button type="button" onClick={() => setPhotos(photos.filter((_, photoIndex) => photoIndex !== index))}><X size={13}/></button></figure>)}</div>}<div className="listing-form-actions"><button className="plain-link" type="button" onClick={() => setShowForm(false)}>{t.cancel}</button><button className="ember-button" disabled={publishing}>{publishing ? t.publishing : t.publishNow}<ChevronRight size={17}/></button></div></form></div>}
  </main>;
}

function ListingCard({ listing, t, isOwner, active, setActive, onRemove }: { listing: Listing; t: typeof copy.ar | typeof copy.en; isOwner: boolean; active: number; setActive: (index: number) => void; onRemove: () => void }) {
  const image = listing.images[active] ?? listing.images[0];
  return <article className="listing-card"><div className="listing-image">{image ? <img src={image.url} alt={listing.title}/> : <div className="listing-image-empty"><ImagePlus/><span>{t.noPhotos}</span></div>}{listing.images.length > 1 && <><button className="gallery-arrow gallery-prev" type="button" onClick={() => setActive((active - 1 + listing.images.length) % listing.images.length)}><ChevronLeft/></button><button className="gallery-arrow gallery-next" type="button" onClick={() => setActive((active + 1) % listing.images.length)}><ChevronRight/></button><div className="gallery-dots">{listing.images.map((photo, index) => <button type="button" key={photo.id} className={index === active ? 'active' : ''} onClick={() => setActive(index)}/>)}</div></>}</div><div className="listing-body"><div className="listing-heading"><div><p>RK75 ACCOUNT</p><h2>{listing.title}</h2></div><b>{listing.price}</b></div><p className="listing-spec">{listing.mainSpec}</p><dl className="listing-stats"><div><dt>{t.kingdom}</dt><dd>{listing.kingdom}</dd></div><div><dt>{t.power}</dt><dd>{listing.totalPower}</dd></div><div><dt>{t.kp}</dt><dd>{listing.killPoints}</dd></div><div><dt>{t.vip}</dt><dd>{listing.vipLevel}</dd></div><div><dt>{t.troops}</dt><dd>{listing.totalTroops}</dd></div></dl><div className="listing-methods"><span>{t.methods}</span><div>{listing.paymentMethods.map((method) => <b key={method}>{method}</b>)}</div></div><div className="listing-contacts"><div><MessageCircle size={16}/><span>{t.owner}</span><b>{listing.ownerDiscord}</b></div><div><ShieldCheck size={16}/><span>{t.intermediary}</span><b>{listing.intermediaryDiscord}</b></div></div>{isOwner && <button type="button" className="listing-delete" onClick={onRemove}><Trash2 size={15}/>{t.remove}</button>}</div></article>;
}
