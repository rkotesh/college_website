import { useState, useEffect, useRef } from 'react';
import heroImg from '../assets/ciet_campus.png';

// ── Real CIET Logo (official SVG from chalapathiengg.ac.in) ──
const CIET_LOGO_URL = 'https://chalapathiengg.ac.in/wp-content/themes/ciet/assets/images/ciet-logo.svg';

// ── Real data from chalapathiengg.ac.in ──
const CIET_STATS = [
  { label: 'Engineers Produced', value: '2800+', icon: '🎓', color: 'hsl(0,75%,50%)' },
  { label: 'Faculty with PhD', value: '20+',    icon: '👨‍🏫', color: 'hsl(0,0%,20%)' },
  { label: 'Recruiters',        value: '38+',   icon: '🏢', color: 'hsl(0,75%,50%)' },
  { label: 'Placements',        value: '440+',  icon: '🚀', color: 'hsl(0,0%,20%)' },
  { label: 'NBA Programs',      value: '4',     icon: '✅', color: 'hsl(0,75%,50%)' },
  { label: 'Years of Excellence', value: '18+', icon: '⭐', color: 'hsl(0,0%,20%)' },
];

// ── Real news from chalapathiengg.ac.in ──
const NEWS = [
  {
    date: 'Jun 2026',
    tag: 'Training',
    title: 'Students Gain Industry Exposure Through SAP Functional Training',
    desc: 'CIET is conducting a SAP Functional Training Program providing students with practical knowledge of ERP systems, real-time business processes, and hands-on sessions in SAP consulting and enterprise applications.',
    icon: '🖥️',
    color: 'hsl(0,75%,50%)',
  },
  {
    date: 'Mar 2026',
    tag: 'Event',
    title: 'CIET NOVUM 2026 — Annual Tech & Cultural Fest',
    desc: 'CIET NOVUM 2026 was celebrated on March 13th & 14th with Technical Events, Cultural Events, and Sports Fiesta. Students from across departments showcased their talent and creativity.',
    icon: '🎉',
    color: 'hsl(0,0%,20%)',
  },
  {
    date: 'Aug 2025',
    tag: 'Achievement',
    title: '6 CIET Students Achieve ISC² Certified in Cybersecurity Credential',
    desc: '6 students from CIET earned the prestigious ISC² Certified in Cybersecurity credential, demonstrating the college\'s strong focus on cybersecurity education and industry-ready skill development.',
    icon: '🏅',
    color: 'hsl(0,75%,50%)',
  },
  {
    date: 'Jun 2025',
    tag: 'Certification',
    title: '34 CIET Students Earn Salesforce Certified AI Specialist Credentials',
    desc: '34 CIET students earned prestigious Salesforce Certified AI Specialist credentials. Additionally, students achieved CEH, ServiceNow, and Microsoft Azure Administrator Associate certifications.',
    icon: '📄',
    color: 'hsl(0,0%,20%)',
  },
];

// ── Real departments from chalapathiengg.ac.in ──
const DEPARTMENTS = [
  { name: 'Computer Science & Engineering',             short: 'CSE',    icon: '💻', nba: true,  link: 'https://chalapathiengg.ac.in/departments/computer-science-and-engineering/' },
  { name: 'Electronics & Communications Engg.',         short: 'ECE',    icon: '📡', nba: true,  link: 'https://chalapathiengg.ac.in/departments/electronics-and-communications-engineering/' },
  { name: 'CSE (Artificial Intelligence)',              short: 'CSE-AI', icon: '🤖', nba: false, link: 'https://chalapathiengg.ac.in/departments/computer-science-and-engineering-artificial-intelligence/' },
  { name: 'CSE (Data Science)',                         short: 'CSE-DS', icon: '📊', nba: false, link: 'https://chalapathiengg.ac.in/departments/computer-science-and-engineering-data-science/' },
  { name: 'CSE (Cyber Security)',                       short: 'CSE-CS', icon: '🔒', nba: false, link: 'https://chalapathiengg.ac.in/departments/csit-2/' },
  { name: 'CSE (AI & Machine Learning)',                short: 'CSE-ML', icon: '🧠', nba: false, link: 'https://chalapathiengg.ac.in/departments/computer-science-and-engineering-artificial-intelligence-machine-learning/' },
  { name: 'Computer Science & Information Technology',  short: 'CSIT',   icon: '🌐', nba: false, link: 'https://chalapathiengg.ac.in/departments/csit/' },
  { name: 'Civil Engineering',                          short: 'CIVIL',  icon: '🏗️', nba: true,  link: 'https://chalapathiengg.ac.in/departments/civil-engineering/' },
  { name: 'Electrical & Electronics Engineering',       short: 'EEE',    icon: '⚡', nba: true,  link: 'https://chalapathiengg.ac.in/departments/electrical-and-electronics-engineering/' },
  { name: 'Basic Science & Humanities',                 short: 'BS&H',   icon: '📚', nba: false, link: 'https://chalapathiengg.ac.in/departments/basic-science-and-humanities-department/' },
];

// ── Placement companies from official site ──
const RECRUITERS = ['IBM', 'HCL Tech', 'Wipro', 'TCS', 'Syntel'];

function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCard({ stat, index, visible }: { stat: typeof CIET_STATS[0]; index: number; visible: boolean }) {
  const numericValue = parseInt(stat.value.replace(/[^0-9]/g, '')) || 0;
  const suffix = stat.value.replace(/[0-9]/g, '');
  const count = useCountUp(numericValue, 2000, visible);
  return (
    <div
      className="lp-stat-card"
      style={{
        '--stat-color': stat.color,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`,
      } as React.CSSProperties}
    >
      <div className="lp-stat-icon" style={{ background: `${stat.color}22`, color: stat.color }}>{stat.icon}</div>
      <div className="lp-stat-value" style={{ color: stat.color }}>{visible ? count : 0}{suffix}</div>
      <div className="lp-stat-label">{stat.label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [newsIndex, setNewsIndex] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // auto-rotate news
  useEffect(() => {
    const t = setInterval(() => setNewsIndex(i => (i + 1) % NEWS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // nav blur on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // stats count-up on enter
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.2 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const news = NEWS[newsIndex];

  return (
    <div className="lp-root">
      {/* background orbs */}
      <div className="lp-orb lp-orb-1" />
      <div className="lp-orb lp-orb-2" />
      <div className="lp-orb lp-orb-3" />
      <div className="lp-grid-overlay" />

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" style={{
        background: scrolled || mobileMenuOpen ? 'rgba(255, 255, 255, 0.96)' : 'transparent',
        backdropFilter: scrolled || mobileMenuOpen ? 'blur(20px)' : 'none',
        borderBottom: scrolled || mobileMenuOpen ? '1px solid var(--lp-border)' : '1px solid transparent',
      }}>
        <div className="lp-nav-inner">
          {/* CIET Official Logo */}
          <div className="lp-brand">
            <img
              src={CIET_LOGO_URL}
              alt="CIET Logo"
              className="lp-ciet-logo-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (next) next.style.display = 'flex';
              }}
            />
            <div className="lp-brand-badge" style={{ display: 'none' }}>CIET</div>
          </div>

          <div className="lp-nav-links">
            <a href="https://chalapathiengg.ac.in/about-us" target="_blank" rel="noreferrer" className="lp-nav-link">About</a>
            <a href="https://chalapathiengg.ac.in/departments/computer-science-and-engineering/" target="_blank" rel="noreferrer" className="lp-nav-link">Departments</a>
            <a href="https://chalapathiengg.ac.in/placements-cell" target="_blank" rel="noreferrer" className="lp-nav-link">Placements</a>
            <a href="https://chalapathiengg.ac.in/contact-us" target="_blank" rel="noreferrer" className="lp-btn-outline">Contact</a>
            <a href="/login" className="lp-btn-primary">Portal Login →</a>
          </div>

          <button
            className="lp-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        <div className={`lp-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
          <a href="https://chalapathiengg.ac.in/about-us" target="_blank" rel="noreferrer" className="lp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>About Us</a>
          <a href="https://chalapathiengg.ac.in/departments/computer-science-and-engineering/" target="_blank" rel="noreferrer" className="lp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Departments</a>
          <a href="https://chalapathiengg.ac.in/placements-cell" target="_blank" rel="noreferrer" className="lp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Placements</a>
          <a href="https://chalapathiengg.ac.in/contact-us" target="_blank" rel="noreferrer" className="lp-mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact Us</a>
          <a href="/login" className="lp-btn-primary" style={{ textAlign: 'center', marginTop: '8px' }} onClick={() => setMobileMenuOpen(false)}>Portal Login →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            Admissions Open for 2026 · EAMCET Code: CIET
          </div>
          <h1 className="lp-hero-title">
            Shaping Engineers,<br />
            <span className="lp-hero-accent">Inspiring Futures</span>
          </h1>
          <p className="lp-hero-subtitle">
            CHALAPATHI INSTITUTE OF ENGINEERING AND TECHNOLOGY plays a pivotal role in the welfare of engineering aspirants with a cutting-edge vision. NAAC 'A' Graded · NBA Accredited · JNTUK Affiliated.
          </p>
          <div className="lp-hero-actions">
            <a href="https://chalapathiengg.ac.in/admission-intake" target="_blank" rel="noreferrer" className="lp-cta-primary">
              Apply for Admission →
            </a>
            <a href="/login" className="lp-cta-secondary">
              Student Portal →
            </a>
          </div>
          <div className="lp-hero-pills">
            <span className="lp-pill">🏅 NAAC 'A' Grade</span>
            <span className="lp-pill">✅ NBA Accredited</span>
            <span className="lp-pill">🎓 JNTUK Affiliated</span>
            <span className="lp-pill">🏛️ Est. 2007</span>
            <span className="lp-pill">📍 Lam, Guntur</span>
          </div>
        </div>

        {/* Hero Image Card */}
        <div className="lp-hero-img-card">
          <img
            src={heroImg}
            alt="CIET Campus"
            className="lp-hero-img"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://chalapathiengg.ac.in/wp-content/themes/ciet/assets/images/hero-banner/hero-banner-1.png';
            }}
          />
          <div className="lp-hero-img-overlay">
            <span className="lp-campus-chip">🏛️ CIET Campus — Lam, Guntur</span>
          </div>
        </div>

        <div className="lp-hero-scroll-hint">
          <div className="lp-scroll-dot" />
          scroll to explore
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="lp-stats-section" ref={statsRef}>
        <div className="lp-section-header">
          <div className="lp-section-tag">By The Numbers</div>
          <h2 className="lp-section-title">CIET At A Glance</h2>
          <p className="lp-section-desc">Two decades of excellence in engineering education, research, and industry-ready placements.</p>
        </div>
        <div className="lp-stats-grid">
          {CIET_STATS.map((s, i) => <StatCard key={s.label} stat={s} index={i} visible={statsVisible} />)}
        </div>
      </section>

      {/* ── DEPARTMENTS ── */}
      <section className="lp-dept-section">
        <div className="lp-section-header">
          <div className="lp-section-tag">Programs Offered</div>
          <h2 className="lp-section-title">Our Departments</h2>
          <p className="lp-section-desc">10 specialized engineering and technology programs, with 4 NBA accredited branches.</p>
        </div>
        <div className="lp-dept-grid">
          {DEPARTMENTS.map((d) => (
            <a
              key={d.short}
              href={d.link}
              target="_blank"
              rel="noreferrer"
              className="lp-dept-card"
              style={{ textDecoration: 'none' }}
            >
              <span className="lp-dept-icon">{d.icon}</span>
              <div className="lp-dept-name">{d.name}</div>
              <div className="lp-dept-short">{d.short}</div>
              {d.nba && <span className="lp-dept-nba-badge">NBA ✓</span>}
            </a>
          ))}
        </div>
      </section>

      {/* ── NEWS & UPDATES ── */}
      <section className="lp-news-section">
        <div className="lp-section-header">
          <div className="lp-section-tag">Latest</div>
          <h2 className="lp-section-title">News & Updates</h2>
          <p className="lp-section-desc">Stay updated with the latest happenings, achievements, and events at CIET.</p>
        </div>
        <div className="lp-news-carousel">
          <div className="lp-news-card" key={newsIndex}>
            <div className="lp-news-card-header">
              <div className="lp-news-icon" style={{ background: `${news.color}22`, color: news.color }}>{news.icon}</div>
              <div>
                <div className="lp-news-tag" style={{ color: news.color }}>{news.tag}</div>
                <div className="lp-news-date">{news.date}</div>
              </div>
            </div>
            <div className="lp-news-title">{news.title}</div>
            <div className="lp-news-desc">{news.desc}</div>
          </div>
          <div className="lp-news-sidebar">
            {NEWS.map((n, i) => (
              <button key={i} className={`lp-news-thumb${i === newsIndex ? ' active' : ''}`}
                onClick={() => setNewsIndex(i)}
                style={{ borderLeftColor: i === newsIndex ? n.color : 'transparent' }}>
                <span className="lp-thumb-icon">{n.icon}</span>
                <div>
                  <div className="lp-thumb-tag" style={{ color: i === newsIndex ? n.color : undefined }}>{n.tag}</div>
                  <div className="lp-thumb-title">{n.title}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="lp-news-dots">
          {NEWS.map((_, i) => (
            <button key={i} className={`lp-dot${i === newsIndex ? ' active' : ''}`} onClick={() => setNewsIndex(i)} />
          ))}
        </div>
      </section>

      {/* ── RECRUITERS MARQUEE ── */}
      <section className="lp-recruiters-section">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="lp-section-tag">Our Students Work At</div>
        </div>
        <div className="lp-recruiters-grid">
          {RECRUITERS.map(r => (
            <div key={r} className="lp-recruiter-card">{r}</div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="lp-cta-banner">
        <div className="lp-cta-orb" />
        <div className="lp-cta-content">
          <div className="lp-section-tag">Join CIET</div>
          <h2 className="lp-cta-title">Ready to Begin Your Engineering Journey?</h2>
          <p className="lp-cta-subtitle">
            Admissions open for 2026. Join 2,800+ engineers who shaped their future at CIET, Lam, Guntur.
            EAMCET Code: <strong style={{ color: 'var(--lp-accent)' }}>CIET</strong>
          </p>
          <div className="lp-cta-actions">
            <a href="https://chalapathiengg.ac.in/admission-intake" target="_blank" rel="noreferrer" className="lp-cta-primary">
              Apply Now →
            </a>
            <a href="https://chalapathiengg.ac.in/contact-us" target="_blank" rel="noreferrer" className="lp-cta-secondary">
              Contact Admissions
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          {/* CIET Logo + Info */}
          <div className="lp-footer-brand">
            <img
              src={CIET_LOGO_URL}
              alt="CIET Logo"
              className="lp-ciet-logo-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const next = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (next) next.style.display = 'flex';
              }}
            />
            <div className="lp-brand-badge" style={{ display: 'none', fontSize: '14px' }}>CIET</div>
            
          </div>

          <div className="lp-footer-links">
            <a href="https://chalapathiengg.ac.in/about-us" target="_blank" rel="noreferrer" className="lp-footer-link">About Us</a>
            <a href="https://chalapathiengg.ac.in/admission-procedure" target="_blank" rel="noreferrer" className="lp-footer-link">Admissions</a>
            <a href="https://chalapathiengg.ac.in/placements-cell" target="_blank" rel="noreferrer" className="lp-footer-link">Placements</a>
            <a href="https://chalapathiengg.ac.in/campus-life" target="_blank" rel="noreferrer" className="lp-footer-link">Campus Life</a>
            <a href="https://chalapathiengg.ac.in/contact-us" target="_blank" rel="noreferrer" className="lp-footer-link">Contact</a>
            <a href="https://chalapathiengg.ac.in" target="_blank" rel="noreferrer" className="lp-footer-link">Official Website ↗</a>
          </div>

          {/* Contact Info */}
          <div style={{ fontSize: '13px', color: 'var(--lp-text-sec)', lineHeight: 1.8 }}>
            <div>📞 8333800596 · 8333800597</div>
            <div>📞 0863-2524112, 2524113</div>
            <div>✉️ <a href="mailto:chalapathiengtech@yahoo.com" style={{ color: 'var(--lp-accent)', textDecoration: 'none' }}>chalapathiengtech@yahoo.com</a></div>
          </div>

          {/* Social Links */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a href="https://www.instagram.com/_ciet_offical/" target="_blank" rel="noreferrer"
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lp-bg-overlay)', border: '1px solid var(--lp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>📸</a>
            <a href="https://www.linkedin.com/in/chalapathi-institute-of-engineering-and-technology-091519257/" target="_blank" rel="noreferrer"
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lp-bg-overlay)', border: '1px solid var(--lp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>💼</a>
            <a href="https://twitter.com/CIET_LAM" target="_blank" rel="noreferrer"
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lp-bg-overlay)', border: '1px solid var(--lp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>🐦</a>
            <a href="https://youtube.com/@cietlam" target="_blank" rel="noreferrer"
              style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lp-bg-overlay)', border: '1px solid var(--lp-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, textDecoration: 'none' }}>▶️</a>
          </div>
        </div>

        <div className="lp-footer-copy">
          Copyright © 2026 Chalapathi Institute of Engineering and Technology, LAM Guntur. All rights reserved. &nbsp;·&nbsp;
          <a href="https://chalapathiengg.ac.in/privacy-policy" target="_blank" rel="noreferrer" style={{ color: 'var(--lp-accent)', textDecoration: 'none' }}>Privacy Policy</a> &nbsp;·&nbsp;
          <a href="https://chalapathiengg.ac.in/terms-conditions" target="_blank" rel="noreferrer" style={{ color: 'var(--lp-accent)', textDecoration: 'none' }}>Terms & Conditions</a>
        </div>
      </footer>
    </div>
  );
}
