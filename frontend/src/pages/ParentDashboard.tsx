import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import LogoHeader from '../components/LogoHeader';

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED CGPA RING
// ─────────────────────────────────────────────────────────────────────────────
function CgpaRing({ cgpa }: { cgpa: number }) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const R = 38, circ = 2 * Math.PI * R;
  const pct = Math.min((cgpa || 0) / 10, 1);

  useEffect(() => {
    if (!arcRef.current || !numRef.current) return;
    gsap.fromTo(arcRef.current,
      { strokeDashoffset: circ },
      { strokeDashoffset: circ - circ * pct, duration: 1.4, ease: 'power2.out' }
    );
    const obj = { val: 0 };
    gsap.to(obj, { val: cgpa, duration: 1.4, ease: 'power2.out',
      onUpdate: () => { if (numRef.current) numRef.current.textContent = obj.val.toFixed(2); }
    });
  }, [cgpa, circ, pct]);

  return (
    <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={R} fill="none" stroke="var(--ds-border)" strokeWidth="6" />
        <circle ref={arcRef} cx="45" cy="45" r={R} fill="none" stroke="var(--ds-jade)"
          strokeWidth="6" strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ} transform="rotate(-90 45 45)"
          style={{ filter: 'drop-shadow(0 0 5px rgba(16,185,129,0.4))' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span ref={numRef} style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-jade)', fontFamily: 'var(--ds-font-mono)' }}>0.00</span>
        <span style={{ fontSize: '8px', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED BAR — inline progress bar
// ─────────────────────────────────────────────────────────────────────────────
function AnimBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, background: 'var(--ds-surface3)', borderRadius: 4, overflow: 'hidden' }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', background: color, borderRadius: 4 }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARENT DASHBOARD MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface ParentDashboardProps {
  userSession: { role: string; email: string; fullName?: string; accessToken: string; };
  handleLogout: () => void;
}

export default function ParentDashboard({ userSession, handleLogout }: ParentDashboardProps) {
  const defaultRollNo = userSession.email.split('@')[0].toUpperCase();
  const [searchVal, setSearchVal] = useState(defaultRollNo);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('ds-theme') as any) || 'dark'
  );

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const APP_ORIGIN = window.location.origin;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ds-theme', theme);
  }, [theme]);

  const fetchData = async (roll: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(
        `${API_BASE_URL}/api/v1/portal/parent/dashboard?rollNo=${encodeURIComponent(roll.trim())}`,
        { credentials: 'include', headers: { 'Authorization': `Bearer ${userSession.accessToken}` } }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to load student data');
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(defaultRollNo); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) fetchData(searchVal);
  };

  const copyPortfolioLink = (slugOrRoll: string) => {
    const url = `${APP_ORIGIN}/portfolio/${slugOrRoll}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  // Destructure student data
  const profile       = data?.profile;
  const studentUser   = data?.studentUser;
  const education     = data?.education     || [];
  const certifications= data?.certifications|| [];
  const projects      = data?.projects      || [];
  const internships   = data?.internships   || [];
  const research      = data?.research      || [];
  const events        = data?.events        || [];
  const courses       = data?.courses       || [];
  const skills        = data?.skills        || [];
  const mentor        = data?.mentor;

  // Placement readiness weightage calculation
  const cgpaVal        = profile?.cgpa || 0;
  const cgpaScore      = (cgpaVal / 10) * 40;
  const projectScore   = projects.length >= 3 ? 25 : projects.length * 8.33;
  const internScore    = internships.length >= 1 ? 15 : 0;
  const certsScore     = certifications.length >= 2 ? 20 : certifications.length * 10;
  const weightageTotal = Math.min(Math.round(cgpaScore + projectScore + internScore + certsScore), 100);

  let eligLabel = 'LOW'; let eligColor = '#ef4444';
  if (weightageTotal >= 80) { eligLabel = 'HIGH'; eligColor = '#10b981'; }
  else if (weightageTotal >= 60) { eligLabel = 'MEDIUM'; eligColor = '#f59e0b'; }

  const collegeProjects  = projects.filter((p: any) => p.projectType === 'college').length;
  const personalProjects = projects.length - collegeProjects;

  // Skill category grouping
  const allCats = ['Languages', 'Web Frameworks', 'Tools', 'Others'];
  const skillGroups: Record<string, string[]> = skills.reduce((acc: any, s: any) => {
    const cat = s.category || 'Others';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s.name);
    return acc;
  }, {});
  const activeCats = allCats.filter(c => (skillGroups[c] || []).length > 0);

  return (
    <div className="ds-shell">
      {/* ════════════════════ HEADER ════════════════════ */}
      <header className="ds-topbar">
        <div className="ds-topbar-left">
          <LogoHeader imageStyle={{ height: '32px' }} />
          <span className="ds-role-indicator">Parent View</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="ds-topbar-center" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)',
          borderRadius: '20px', padding: '2px 8px 2px 14px', maxWidth: '340px', width: '100%'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text3)" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
            placeholder="Enter student roll no..." style={{
              background: 'transparent', border: 'none', color: 'var(--ds-text1)',
              fontSize: '12px', outline: 'none', flex: 1
            }} />
          <button type="submit" className="ds-btn ds-btn-primary"
            style={{ padding: '4px 10px', fontSize: '11px', height: '26px', borderRadius: '14px' }}>
            Search
          </button>
        </form>

        <div className="ds-topbar-right">
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="ds-btn ds-btn-ghost" style={{ padding: '6px 8px' }} title="Toggle theme">
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <button id="parent-signout-btn" className="ds-btn ds-btn-ghost ds-signout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* ════════════════════ BODY ════════════════════ */}
      <div className="ds-body">
        {/* ── SIDEBAR (Clean navigation without student info box) ── */}
        <aside className="ds-sidebar">
          <nav className="ds-nav">
            <div className="ds-nav-section">Navigation</div>
            <button className="ds-nav-item active">
              <span className="ds-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              <span className="ds-nav-label">Child Overview</span>
            </button>
          </nav>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="ds-main">
          {/* Loading state */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--ds-border)', borderTop: '3px solid var(--ds-jade)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'var(--ds-text3)', fontSize: '13px' }}>Loading child profile…</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ margin: '40px auto', maxWidth: 480, textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '8px' }}>
                Student Not Found
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--ds-text3)', marginBottom: '20px' }}>{error}</p>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', maxWidth: '320px', margin: '0 auto' }}>
                <input type="text" value={searchVal} onChange={e => setSearchVal(e.target.value)}
                  placeholder="Enter Roll No (e.g. 22B01A0501)"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--ds-border)', background: 'var(--ds-surface2)', color: 'var(--ds-text1)', fontSize: '13px', outline: 'none' }} />
                <button type="submit" className="ds-btn ds-btn-primary">Search</button>
              </form>
            </motion.div>
          )}

          {/* ════════════════════ OVERVIEW CONTENT ════════════════════ */}
          {!loading && !error && data && (
            <div className="ds-overview" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* 1. HERO PROFILE CARD */}
              <motion.div className="ds-card ds-hero-card"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                <div className="ds-hero-avatar-wrap">
                  <div className="ds-hero-avatar">
                    {profile?.photoUrl
                      ? <img src={profile.photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : (studentUser?.fullName?.slice(0, 1)?.toUpperCase() || 'S')}
                  </div>
                </div>

                <div className="ds-hero-info">
                  <div className="ds-hero-tag">Your Child · {profile?.departmentId || 'Department'}</div>
                  <h1 className="ds-hero-name">{studentUser?.fullName || 'Student Name'}</h1>
                  <p className="ds-hero-meta">
                    <span className="ds-mono">{profile?.rollNo}</span>
                    {profile?.batch && ` · ${profile.batch}`}
                    {profile?.sectionId && ` · Section ${profile.sectionId}`}
                  </p>
                  {profile?.profileSummary && (
                    <p className="ds-hero-bio">{profile.profileSummary}</p>
                  )}
                  <div className="ds-hero-links">
                    {profile?.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">LinkedIn</a>}
                    {profile?.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">GitHub</a>}
                    {profile?.resumeUrl && <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">Resume</a>}
                  </div>
                </div>

                <div className="ds-hero-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                  {/* Share / View Public Portfolio Link */}
                  {(profile?.slug || profile?.rollNo) && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <a
                        href={`${APP_ORIGIN}/portfolio/${profile.slug || profile.rollNo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ds-resume-btn"
                        style={{ background: 'var(--ds-jade)', color: '#fff', textDecoration: 'none', border: 'none' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        View Public Portfolio
                      </a>
                      <button
                        type="button"
                        onClick={() => copyPortfolioLink(profile.slug || profile.rollNo)}
                        className="ds-resume-btn"
                        style={{ cursor: 'pointer', border: '1px solid var(--ds-border)', background: linkCopied ? 'var(--ds-surface3)' : 'var(--ds-surface2)', color: 'var(--ds-text1)' }}
                      >
                        {linkCopied ? '✓ Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  )}

                  {/* CGPA Ring */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--ds-surface2)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--ds-border)' }}>
                    <CgpaRing cgpa={profile?.cgpa || 0} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ds-text1)' }}>{profile?.cgpa ? profile.cgpa.toFixed(2) : '—'}</span>
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)', textTransform: 'uppercase' }}>Academic CGPA</span>
                      <span style={{ fontSize: '9px', color: 'var(--ds-jade)', fontWeight: 600 }}>10.0 Scale</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 2. DEVELOPER PROFILES (POSITIONED RIGHT AFTER PROFILE CARD) */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 className="ds-section-title" style={{ margin: 0 }}>Developer Profiles</h2>
                  <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>Technical Coding & Professional Accounts</span>
                </div>
                <div className="ds-platforms">
                  {[
                    { key: 'leetcodeUrl', label: 'LeetCode', desc: 'Solved problems & coding skills',
                      stat: profile ? `Solved: ${(profile.leetcodeEasySolved || 0) + (profile.leetcodeMediumSolved || 0) + (profile.leetcodeHardSolved || 0)} (${profile.leetcodeEasySolved || 0}E · ${profile.leetcodeMediumSolved || 0}M · ${profile.leetcodeHardSolved || 0}H)` : '' },
                    { key: 'githubUrl', label: 'GitHub', desc: 'Repositories & open-source contributions',
                      stat: profile ? `Repos: ${profile.githubReposCount || 0} · Commits: ${profile.githubCommitsCount || 0}` : '' },
                    { key: 'hackerrankUrl', label: 'HackerRank', desc: 'Verified badges & certifications',
                      stat: profile ? `Badges: ${profile.hackerrankBadges || 0} verified` : '' },
                    { key: 'linkedinUrl', label: 'LinkedIn', desc: 'Professional network & profile',
                      stat: 'Professional Connection Verified' },
                    { key: 'codechefUrl', label: 'CodeChef', desc: 'Competitive programming & ratings',
                      stat: profile ? `Rating: ${profile.codechefRating || 0} · Stars: ${profile.codechefStars || '1★'}` : '' },
                    { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', desc: 'IIT Bombay spoken tutorial certifications',
                      stat: 'IIT Bombay Tutorial Synced' },
                    { key: 'prepinstaUrl', label: 'PrepInsta', desc: 'Placement preparation & resources',
                      stat: 'PrepInsta Prime Profile Synced' },
                  ].map(plat => {
                    const connected = !!(profile?.[plat.key]);
                    return (
                      <div key={plat.key} className={`ds-platform-card ${connected ? 'connected' : ''}`}>
                        <div className="ds-platform-top">
                          <span className="ds-platform-name" style={{ marginLeft: 0 }}>{plat.label}</span>
                          <span className={`ds-badge ${connected ? 'ds-badge-success' : 'ds-badge-pending'}`}>
                            {connected ? 'Connected' : 'Not Linked'}
                          </span>
                        </div>
                        <p className="ds-platform-desc">{plat.desc}</p>
                        {connected && (
                          <div style={{ fontSize: '11px', color: 'var(--ds-text1)', fontWeight: 600, margin: '4px 0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px' }}>⚡</span>{plat.stat}
                          </div>
                        )}
                        {connected
                          ? <a href={profile[plat.key]} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>View Profile →</a>
                          : <span style={{ fontSize: '11px', color: 'var(--ds-text3)', fontStyle: 'italic' }}>Not yet linked</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* 3. METRICS ROW & PLACEMENT READINESS INDEX */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'stretch' }}>
                {/* 4 Summary Metric Chips */}
                <div className="ds-metrics" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', margin: 0 }}>
                  {[
                    {
                      label: 'Projects',
                      value: projects.length,
                      sub: projects.length === 0 ? 'No projects yet' : `${collegeProjects} College · ${personalProjects} Personal`
                    },
                    {
                      label: 'Certificates',
                      value: certifications.length,
                      sub: certifications.length === 0 ? 'No certificates yet' : `${certifications.filter((c: any) => c.isFeatured).length} Featured · ${certifications.length - certifications.filter((c: any) => c.isFeatured).length} General`
                    },
                    {
                      label: 'Internships',
                      value: internships.length,
                      sub: internships.length === 0 ? 'No internships yet' : `${internships.filter((i: any) => i.internshipType === 'Online').length} Remote · ${internships.filter((i: any) => i.internshipType !== 'Online').length} Office`
                    },
                    {
                      label: 'Activities',
                      value: courses.length + events.length,
                      sub: (courses.length + events.length) === 0 ? 'No activities yet' : `${courses.length} Courses · ${events.length} Events`
                    },
                  ].map((m, i) => (
                    <motion.div key={m.label} className="ds-metric-chip"
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05, duration: 0.3 }}
                      style={{ padding: '16px 20px' }}>
                      <div className="ds-metric-val ds-mono" style={{ fontSize: '28px' }}>{m.value}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                        <div className="ds-metric-label" style={{ fontSize: '13px' }}>{m.label}</div>
                        <div className="ds-metric-sub" style={{ fontSize: '11px' }}>{m.sub}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Placement Readiness Breakdown */}
                <motion.div className="ds-card ds-weightage-card"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  style={{ margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>PLACEMENT READINESS</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: eligColor, background: `${eligColor}18`, padding: '2px 8px', borderRadius: '8px' }}>
                      {eligLabel}
                    </span>
                  </div>

                  <div className="ds-weightage-score-row" style={{ marginBottom: '12px' }}>
                    <div className="ds-weightage-ring-wrap">
                      <svg width="56" height="56" viewBox="0 0 60 60" style={{ position: 'absolute' }}>
                        <circle cx="30" cy="30" r="24" fill="none" stroke="var(--ds-border)" strokeWidth="4" />
                        <circle cx="30" cy="30" r="24" fill="none" stroke={eligColor} strokeWidth="4"
                          strokeDasharray="150.79" strokeDashoffset={150.79 * (1 - weightageTotal / 100)}
                          transform="rotate(-90 30 30)" strokeLinecap="round" />
                      </svg>
                      <span className="ds-weightage-ring-score" style={{ fontSize: '14px' }}>{weightageTotal}%</span>
                    </div>
                    <div className="ds-weightage-status-info">
                      <div className="ds-weightage-status-title" style={{ fontSize: '12px' }}>Eligibility Index</div>
                      <div className="ds-weightage-status-desc" style={{ fontSize: '10px', lineHeight: 1.3 }}>
                        {weightageTotal >= 80 ? 'Excellent readiness for campus placements.' : weightageTotal >= 60 ? 'Good readiness. Keep building projects.' : 'Build portfolio to boost score.'}
                      </div>
                    </div>
                  </div>

                  <div className="ds-weightage-items" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { name: 'CGPA (40%)', val: cgpaScore, max: 40, color: '#10b981' },
                      { name: 'Projects (25%)', val: projectScore, max: 25, color: '#6366f1' },
                      { name: 'Internships (15%)', val: internScore, max: 15, color: '#f59e0b' },
                      { name: 'Certificates (20%)', val: certsScore, max: 20, color: '#ec4899' },
                    ].map(item => (
                      <div key={item.name} className="ds-weightage-item">
                        <div className="ds-weightage-item-header" style={{ marginBottom: '2px' }}>
                          <div className="ds-weightage-item-name" style={{ fontSize: '10.5px' }}>{item.name}</div>
                          <div className="ds-weightage-item-val" style={{ fontSize: '10.5px' }}>{Math.round(item.val)}%</div>
                        </div>
                        <AnimBar pct={(item.val / item.max) * 100} color={item.color} />
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* 4. PROJECTS SECTION (PORTFOLIO STYLE CARDS) */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 className="ds-section-title" style={{ margin: 0 }}>Projects & Works ({projects.length})</h2>
                  <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{collegeProjects} College · {personalProjects} Personal</span>
                </div>

                {projects.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {projects.map((proj: any, idx: number) => (
                      <div key={proj._id || idx} className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{proj.title}</h3>
                              {proj.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '14px' }} title="Featured Project">★</span>}
                            </div>
                            <span className="ds-badge ds-badge-success" style={{ fontSize: '9px', padding: '2px 8px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'inline-block' }}>
                              {proj.projectType === 'college' ? 'College Project' : 'Personal Project'}
                            </span>
                          </div>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--ds-text2)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                          {proj.description || 'No description provided.'}
                        </p>

                        {proj.techStack && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {proj.techStack.split(',').map((t: string, i: number) => (
                              <span key={i} style={{ fontSize: '10px', padding: '3px 8px', background: 'var(--ds-surface3)', borderRadius: '4px', color: 'var(--ds-text2)', border: '1px solid var(--ds-border)', fontWeight: 500 }}>
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {proj.repoUrl && (
                          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--ds-border)', marginTop: 'auto' }}>
                            <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                              View Code Repository →
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ds-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text3)', fontSize: '13px' }}>
                    No technical projects added yet.
                  </div>
                )}
              </motion.div>

              {/* 5. INTERNSHIPS & EXPERIENCE SECTION */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 className="ds-section-title" style={{ margin: 0 }}>Internships & Experience ({internships.length})</h2>
                  <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>Industry Exposure</span>
                </div>

                {internships.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {internships.map((intern: any, idx: number) => (
                      <div key={intern._id || idx} className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{intern.role}</h3>
                              {intern.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '14px' }}>★</span>}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-jade)', marginTop: '2px' }}>
                              {intern.organization}
                            </div>
                          </div>
                          <span className="ds-badge ds-badge-success" style={{ fontSize: '9px', padding: '2px 8px', textTransform: 'uppercase' }}>
                            {intern.internshipType || 'Online'}
                          </span>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--ds-text2)', lineHeight: 1.5, margin: 0, flex: 1 }}>
                          {intern.description || 'No description provided.'}
                        </p>

                        <div style={{ fontSize: '11px', color: 'var(--ds-text3)', fontFamily: 'var(--ds-font-mono)' }}>
                          🗓️ {intern.startDate || ''} {intern.endDate ? `→ ${intern.endDate}` : '→ Present'}
                        </div>

                        {intern.certificateUrl && (
                          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--ds-border)', marginTop: 'auto' }}>
                            <a href={intern.certificateUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px', fontWeight: 600 }}>
                              View Internship Certificate →
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ds-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text3)', fontSize: '13px' }}>
                    No internship experience records added yet.
                  </div>
                )}
              </motion.div>

              {/* 6. CERTIFICATIONS SECTION */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 className="ds-section-title" style={{ margin: 0 }}>Certifications ({certifications.length})</h2>
                  <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>Verified Credentials</span>
                </div>

                {certifications.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {certifications.map((cert: any, idx: number) => (
                      <div key={cert._id || idx} className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{cert.title}</h3>
                              {cert.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '13px' }}>★</span>}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text2)', marginTop: '2px' }}>
                              {cert.issuingOrganization}
                            </div>
                          </div>
                          <span className="ds-badge ds-badge-success" style={{ fontSize: '9px', padding: '2px 8px', textTransform: 'uppercase' }}>
                            {cert.certType || 'Certificate'}
                          </span>
                        </div>

                        {cert.description && (
                          <p style={{ fontSize: '12px', color: 'var(--ds-text3)', margin: 0, flex: 1 }}>
                            {cert.description}
                          </p>
                        )}

                        <div style={{ fontSize: '10.5px', color: 'var(--ds-text3)' }}>
                          Issued: {cert.issueDate || 'N/A'} {cert.expiryDate ? `· Expires: ${cert.expiryDate}` : ''}
                        </div>

                        {cert.certUrl && (
                          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--ds-border)', marginTop: 'auto' }}>
                            <a href={cert.certUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>
                              View Credential →
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ds-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text3)', fontSize: '13px' }}>
                    No certifications uploaded yet.
                  </div>
                )}
              </motion.div>

              {/* 7. SKILLS & EXPERTISE SECTION */}
              {skills.length > 0 && (
                <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="ds-section-title" style={{ margin: 0 }}>Skills & Tech Stack ({skills.length})</h2>
                    <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>Categorized Expertise</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(activeCats.length, 1)}, 1fr)`, gap: '20px' }}>
                    {activeCats.map(cat => (
                      <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-jade)', textTransform: 'uppercase', letterSpacing: '0.8px', paddingBottom: '6px', borderBottom: '1px solid var(--ds-border)' }}>
                          {cat}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {skillGroups[cat].map((name, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--ds-text1)' }}>
                              <span style={{ color: 'var(--ds-jade)', fontSize: '10px' }}>●</span>
                              {name}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 8. COURSES, RESEARCH & EVENTS GRID */}
              {(courses.length > 0 || research.length > 0 || events.length > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {/* Courses */}
                  {courses.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
                      <div className="ds-card-label" style={{ marginBottom: '14px' }}>ONLINE COURSES ({courses.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {courses.map((c: any, i: number) => (
                          <div key={i} style={{ padding: '10px 12px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>{c.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text2)', marginTop: '2px' }}>{c.provider}</div>
                            {c.link && (
                              <a href={c.link} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '11px', marginTop: '6px', display: 'inline-block' }}>
                                Course Link →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Research */}
                  {research.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                      <div className="ds-card-label" style={{ marginBottom: '14px' }}>RESEARCH PAPERS ({research.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {research.map((r: any, i: number) => (
                          <div key={i} style={{ padding: '10px 12px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>{r.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text2)', marginTop: '2px' }}>{r.journalConference} ({r.publicationYear})</div>
                            {r.doi && (
                              <a href={r.doi} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '11px', marginTop: '6px', display: 'inline-block' }}>
                                View DOI Publication →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Events */}
                  {events.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }}>
                      <div className="ds-card-label" style={{ marginBottom: '14px' }}>CAMPUS EVENTS ({events.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {events.map((ev: any, i: number) => (
                          <div key={i} style={{ padding: '10px 12px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>{ev.eventName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>Role: {ev.role}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* 9. EDUCATION TIMELINE & ASSIGNED MENTOR */}
              <div className="ds-overview-bottom-grid">
                {/* Education Timeline */}
                {education.length > 0 && (
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
                    <div className="ds-card-label" style={{ marginBottom: '16px' }}>Education History</div>
                    <div className="ds-timeline">
                      {education.map((edu: any, idx: number) => (
                        <div key={idx} className="ds-timeline-item">
                          <div className="ds-timeline-dot" />
                          <div className="ds-timeline-content">
                            <div className="ds-timeline-type">{edu.eduType}</div>
                            <div className="ds-timeline-inst">{edu.institution || edu.boardUniversity}</div>
                            <div className="ds-timeline-meta ds-mono">{edu.score} {edu.scoreType} · Class of {edu.yearOfPassing}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Mentor Card */}
                <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
                  <div className="ds-card-label" style={{ marginBottom: '16px' }}>Assigned Faculty Mentor</div>
                  {mentor ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--ds-jade), #6366f1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 800, color: '#fff', flexShrink: 0
                        }}>
                          {mentor.fullName?.charAt(0) || 'M'}
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ds-text1)' }}>{mentor.fullName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--ds-text3)' }}>{mentor.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                        {mentor.phone && (
                          <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--ds-text3)' }}>📞</span>
                            <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{mentor.phone}</span>
                          </div>
                        )}
                        {mentor.department && (
                          <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                            <span style={{ color: 'var(--ds-text3)' }}>🏛️</span>
                            <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{mentor.department}</span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--ds-text3)', fontStyle: 'italic', margin: 0 }}>
                        Contact your child's assigned mentor for academic guidance or attendance concerns.
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                      <div style={{ fontSize: '36px', marginBottom: '8px' }}>👤</div>
                      <p style={{ fontSize: '13px', color: 'var(--ds-text3)', margin: 0 }}>No faculty mentor assigned yet.</p>
                    </div>
                  )}
                </motion.div>
              </div>

            </div>
          )}

          {/* Empty initial state */}
          {!loading && !error && !data && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '8px' }}>Search Your Child's Profile</h2>
              <p style={{ fontSize: '13px', color: 'var(--ds-text3)' }}>Enter the student roll number above to view their complete portfolio and academic overview.</p>
            </div>
          )}
        </main>
      </div>

      {/* ════════════════════ FOOTER ════════════════════ */}
      <footer className="ds-footer">
        <div className="ds-footer-inner">
          <LogoHeader imageStyle={{ height: '22px', opacity: 0.6 }} />
          <span className="ds-footer-copy">© 2025 CIET ERP — Parent Portal</span>
          <span className="ds-footer-version">v2.0</span>
        </div>
      </footer>

      {/* ════════════════════ MOBILE BOTTOM NAV ════════════════════ */}
      <nav className="ds-bottom-nav">
        <div className="ds-bottom-nav-inner">
          <button className="ds-bottom-nav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Child Overview</span>
          </button>
          <button className="ds-bottom-nav-item" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
