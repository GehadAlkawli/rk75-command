import { Code2, Crown } from 'lucide-react';

type Lang = 'ar' | 'en';

const developers = ['Aℓρнα|알파', 'SMITHـDIV'];

export default function DevelopersSection({ lang }: { lang: Lang }) {
  const rtl = lang === 'ar';
  const text = rtl
    ? { kicker: 'فريق تطوير RK', title: 'المطورون', subtitle: 'صُنّاع تجربة RK', badge: 'مطور' }
    : { kicker: 'RK DEVELOPMENT TEAM', title: 'DEVELOPERS', subtitle: 'Built with passion for RK', badge: 'Developer' };

  return (
    <section className="developers-section" dir={rtl ? 'rtl' : 'ltr'} aria-labelledby="developers-heading">
      <div className="developers-glow" aria-hidden="true" />
      <div className="developers-heading">
        <div className="developers-icon" aria-hidden="true"><Crown size={23} /></div>
        <div>
          <span className="developers-kicker">{text.kicker}</span>
          <h2 id="developers-heading">{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>
      </div>
      <div className="developers-grid">
        {developers.map((developer) => (
          <article className="developer-card" key={developer}>
            <div className="developer-code-icon" aria-hidden="true"><Code2 size={24} /></div>
            <div className="developer-info">
              <span className="developer-badge">{text.badge}</span>
              <h3 dir="ltr">{developer}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
