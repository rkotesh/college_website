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
      {/* ════════════════════ HEADER (SIGN OUT ALWAYS VISIBLE ON TOP BAR) ════════════════════ */}
      <header className="ds-topbar">
        <div className="ds-topbar-left">
          <LogoHeader imageStyle={{ height: '32px' }} />
          <span className="ds-role-indicator">Parent View</span>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="ds-topbar-center" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)',
          borderRadius: '20px', padding: '2px 8px 2px 14px', maxWidth: '300px', width: '100%'
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

        <div className="ds-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="ds-btn ds-btn-ghost" style={{ padding: '6px 8px' }} title="Toggle theme">
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          
          {/* Sign Out Button in Top Navigation Bar */}
          <button
            id="parent-signout-btn"
            className="ds-btn ds-btn-ghost ds-signout"
            onClick={handleLogout}
            style={{ display: 'inline-flex', padding: '6px 12px', fontSize: '12px', fontWeight: 600 }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ════════════════════ BODY ════════════════════ */}
      <div className="ds-body">
        {/* ── SIDEBAR ── */}
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

        {/* ── MAIN CONTENT AREA WITH PAGE PADDING ── */}
        <main className="ds-main">
          <div className="ds-page">
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
              <div className="ds-overview" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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

                {/* 2. DEVELOPER PROFILES */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2 className="ds-section-title" style={{ margin: 0, fontSize: '14px' }}>Developer Profiles</h2>
                    <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>Technical Accounts</span>
                  </div>
                  <div className="ds-platforms">
                    {[
                      { key: 'leetcodeUrl', label: 'LeetCode', desc: 'Coding skills',
                        stat: profile ? `Solved: ${(profile.leetcodeEasySolved || 0) + (profile.leetcodeMediumSolved || 0) + (profile.leetcodeHardSolved || 0)}` : '' },
                      { key: 'githubUrl', label: 'GitHub', desc: 'Repos & code',
                        stat: profile ? `Repos: ${profile.githubReposCount || 0} · Commits: ${profile.githubCommitsCount || 0}` : '' },
                      { key: 'hackerrankUrl', label: 'HackerRank', desc: 'Badges & certs',
                        stat: profile ? `Badges: ${profile.hackerrankBadges || 0}` : '' },
                      { key: 'linkedinUrl', label: 'LinkedIn', desc: 'Network profile',
                        stat: 'Verified' },
                      { key: 'codechefUrl', label: 'CodeChef', desc: 'Competitive',
                        stat: profile ? `Rating: ${profile.codechefRating || 0}` : '' },
                      { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', desc: 'IIT Bombay',
                        stat: 'Synced' },
                      { key: 'prepinstaUrl', label: 'PrepInsta', desc: 'Placement prep',
                        stat: 'Synced' },
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
                            <div style={{ fontSize: '10.5px', color: 'var(--ds-text1)', fontWeight: 600, margin: '2px 0 4px' }}>
                              ⚡ {plat.stat}
                            </div>
                          )}
                          {connected
                            ? <a href={profile[plat.key]} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '11px' }}>View Profile →</a>
                            : <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontStyle: 'italic' }}>Not linked</span>}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 3. UPPER BENTO ROW: EDUCATION (FIT) + SKILLS (FIT) + PLACEMENT READINESS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>

                  {/* EDUCATION HISTORY */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>EDUCATION HISTORY</div>
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>Academic Path</span>
                    </div>
                    {education.length > 0 ? (
                      <div className="ds-timeline" style={{ flex: 1 }}>
                        {education.map((edu: any, idx: number) => (
                          <div key={idx} className="ds-timeline-item" style={{ paddingBottom: idx === education.length - 1 ? 0 : '12px' }}>
                            <div className="ds-timeline-dot" />
                            <div className="ds-timeline-content">
                              <div className="ds-timeline-type" style={{ fontSize: '10px' }}>{edu.eduType}</div>
                              <div className="ds-timeline-inst" style={{ fontSize: '12px', fontWeight: 700 }}>{edu.institution || edu.boardUniversity}</div>
                              <div className="ds-timeline-meta ds-mono" style={{ fontSize: '10.5px' }}>{edu.score} {edu.scoreType} · Class of {edu.yearOfPassing}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ds-text3)', fontStyle: 'italic', padding: '12px 0' }}>No education records added.</div>
                    )}
                  </motion.div>

                  {/* SKILLS & TECH STACK */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>SKILLS & TECH STACK ({skills.length})</div>
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>Categorized</span>
                    </div>

                    {skills.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
                        {activeCats.map(cat => (
                          <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--ds-jade)', textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid var(--ds-border)', paddingBottom: '3px', marginBottom: '2px' }}>
                              {cat}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {skillGroups[cat].map((name, i) => (
                                <span key={i} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 6px', background: 'var(--ds-surface3)', borderRadius: '4px', border: '1px solid var(--ds-border)', color: 'var(--ds-text1)' }}>
                                  {name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ds-text3)', fontStyle: 'italic', padding: '12px 0' }}>No skills added yet.</div>
                    )}
                  </motion.div>

                  {/* PLACEMENT READINESS INDEX */}
                  <motion.div className="ds-card ds-weightage-card"
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                    style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>PLACEMENT READINESS</div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: eligColor, background: `${eligColor}18`, padding: '2px 8px', borderRadius: '8px' }}>
                        {eligLabel}
                      </span>
                    </div>

                    <div className="ds-weightage-score-row" style={{ marginBottom: '10px' }}>
                      <div className="ds-weightage-ring-wrap">
                        <svg width="50" height="50" viewBox="0 0 60 60" style={{ position: 'absolute' }}>
                          <circle cx="30" cy="30" r="24" fill="none" stroke="var(--ds-border)" strokeWidth="4" />
                          <circle cx="30" cy="30" r="24" fill="none" stroke={eligColor} strokeWidth="4"
                            strokeDasharray="150.79" strokeDashoffset={150.79 * (1 - weightageTotal / 100)}
                            transform="rotate(-90 30 30)" strokeLinecap="round" />
                        </svg>
                        <span className="ds-weightage-ring-score" style={{ fontSize: '13px' }}>{weightageTotal}%</span>
                      </div>
                      <div className="ds-weightage-status-info">
                        <div className="ds-weightage-status-title" style={{ fontSize: '11.5px' }}>Eligibility Index</div>
                        <div className="ds-weightage-status-desc" style={{ fontSize: '9.5px', lineHeight: 1.3 }}>
                          {weightageTotal >= 80 ? 'Excellent readiness for campus drives.' : weightageTotal >= 60 ? 'Good readiness. Add projects.' : 'Build portfolio to boost score.'}
                        </div>
                      </div>
                    </div>

                    <div className="ds-weightage-items" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'center' }}>
                      {[
                        { name: 'CGPA (40%)', val: cgpaScore, max: 40, color: '#10b981' },
                        { name: 'Projects (25%)', val: projectScore, max: 25, color: '#6366f1' },
                        { name: 'Internships (15%)', val: internScore, max: 15, color: '#f59e0b' },
                        { name: 'Certificates (20%)', val: certsScore, max: 20, color: '#ec4899' },
                      ].map(item => (
                        <div key={item.name} className="ds-weightage-item">
                          <div className="ds-weightage-item-header" style={{ marginBottom: '1px' }}>
                            <div className="ds-weightage-item-name" style={{ fontSize: '10px' }}>{item.name}</div>
                            <div className="ds-weightage-item-val" style={{ fontSize: '10px' }}>{Math.round(item.val)}%</div>
                          </div>
                          <AnimBar pct={(item.val / item.max) * 100} color={item.color} />
                        </div>
                      ))}
                    </div>
                  </motion.div>

                </div>

                {/* 4. SUMMARY METRIC CHIPS */}
                <div className="ds-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', margin: 0 }}>
                  {[
                    {
                      label: 'Projects',
                      value: projects.length,
                      sub: projects.length === 0 ? 'No projects yet' : `${collegeProjects} College · ${personalProjects} Personal`
                    },
                    {
                      label: 'Certificates',
                      value: certifications.length,
                      sub: certifications.length === 0 ? 'No certificates yet' : `${certifications.filter((c: any) => c.isFeatured).length} Featured`
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
                      transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
                      style={{ padding: '14px 16px' }}>
                      <div className="ds-metric-val ds-mono" style={{ fontSize: '24px' }}>{m.value}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        <div className="ds-metric-label" style={{ fontSize: '11px' }}>{m.label}</div>
                        <div className="ds-metric-sub" style={{ fontSize: '10px' }}>{m.sub}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* 5. SIDE-BY-SIDE GRID: PROJECTS (LEFT) & INTERNSHIPS (RIGHT) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
                  {/* Projects */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h2 className="ds-section-title" style={{ margin: 0, fontSize: '14px' }}>Projects & Works ({projects.length})</h2>
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>{collegeProjects} College · {personalProjects} Personal</span>
                    </div>

                    {projects.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {projects.map((proj: any, idx: number) => (
                          <div key={proj._id || idx} style={{ padding: '12px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>{proj.title}</span>
                                {proj.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '12px' }}>★</span>}
                              </div>
                              <span className="ds-badge ds-badge-success" style={{ fontSize: '8.5px', padding: '1px 6px' }}>
                                {proj.projectType === 'college' ? 'College' : 'Personal'}
                              </span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'var(--ds-text2)', margin: 0, lineHeight: 1.3 }}>
                              {proj.description || 'No description provided.'}
                            </p>
                            {proj.techStack && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                                {proj.techStack.split(',').map((t: string, i: number) => (
                                  <span key={i} style={{ fontSize: '9px', padding: '1px 5px', background: 'var(--ds-surface2)', borderRadius: '4px', color: 'var(--ds-text3)' }}>
                                    {t.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                            {proj.repoUrl && (
                              <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '11px', marginTop: '2px' }}>
                                View Code Repository →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ds-text3)', fontStyle: 'italic', padding: '12px 0' }}>No projects added yet.</div>
                    )}
                  </motion.div>

                  {/* Internships */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h2 className="ds-section-title" style={{ margin: 0, fontSize: '14px' }}>Internships & Experience ({internships.length})</h2>
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>Industry Exposure</span>
                    </div>

                    {internships.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {internships.map((intern: any, idx: number) => (
                          <div key={intern._id || idx} style={{ padding: '12px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>{intern.role}</span>
                                <span style={{ fontSize: '11px', color: 'var(--ds-jade)', fontWeight: 600, marginLeft: '6px' }}>({intern.organization})</span>
                              </div>
                              <span className="ds-badge ds-badge-success" style={{ fontSize: '8.5px', padding: '1px 6px' }}>
                                {intern.internshipType || 'Online'}
                              </span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'var(--ds-text2)', margin: 0, lineHeight: 1.3 }}>
                              {intern.description || 'No description provided.'}
                            </p>
                            <div style={{ fontSize: '10px', color: 'var(--ds-text3)', fontFamily: 'var(--ds-font-mono)' }}>
                              🗓️ {intern.startDate || ''} {intern.endDate ? `→ ${intern.endDate}` : '→ Present'}
                            </div>
                            {intern.certificateUrl && (
                              <a href={intern.certificateUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '11px' }}>
                                View Certificate →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ds-text3)', fontStyle: 'italic', padding: '12px 0' }}>No internship records added yet.</div>
                    )}
                  </motion.div>
                </div>

                {/* 6. SIDE-BY-SIDE GRID: CERTIFICATIONS (LEFT), COURSES/RESEARCH (CENTER), MENTOR (RIGHT) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'stretch' }}>
                  {/* Certifications */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h2 className="ds-section-title" style={{ margin: 0, fontSize: '14px' }}>Certifications ({certifications.length})</h2>
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>Credentials</span>
                    </div>

                    {certifications.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {certifications.map((cert: any, idx: number) => (
                          <div key={cert._id || idx} style={{ padding: '10px 12px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ds-text1)' }}>{cert.title}</span>
                              <span className="ds-badge ds-badge-success" style={{ fontSize: '8.5px', padding: '1px 6px' }}>{cert.certType || 'Cert'}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text2)', fontWeight: 600 }}>{cert.issuingOrganization}</div>
                            {cert.description && <p style={{ fontSize: '10.5px', color: 'var(--ds-text3)', margin: 0 }}>{cert.description}</p>}
                            {cert.certUrl && (
                              <a href={cert.certUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '11px', marginTop: '2px' }}>
                                View Credential →
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ds-text3)', fontStyle: 'italic', padding: '12px 0' }}>No certifications uploaded.</div>
                    )}
                  </motion.div>

                  {/* Online Courses & Research Papers */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Courses */}
                    <div>
                      <div className="ds-card-label" style={{ marginBottom: '8px', fontSize: '11px' }}>ONLINE COURSES ({courses.length})</div>
                      {courses.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {courses.map((c: any, i: number) => (
                            <div key={i} style={{ padding: '8px 10px', background: 'var(--ds-surface3)', borderRadius: '6px', border: '1px solid var(--ds-border)' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)' }}>{c.title}</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--ds-text2)' }}>{c.provider}</div>
                              {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '10.5px' }}>Course Link →</a>}
                            </div>
                          ))}
                        </div>
                      ) : <div style={{ fontSize: '11px', color: 'var(--ds-text3)', fontStyle: 'italic' }}>No online courses.</div>}
                    </div>

                    {/* Research */}
                    <div>
                      <div className="ds-card-label" style={{ marginBottom: '8px', fontSize: '11px' }}>RESEARCH PAPERS ({research.length})</div>
                      {research.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {research.map((r: any, i: number) => (
                            <div key={i} style={{ padding: '8px 10px', background: 'var(--ds-surface3)', borderRadius: '6px', border: '1px solid var(--ds-border)' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)' }}>{r.title}</div>
                              <div style={{ fontSize: '10.5px', color: 'var(--ds-text2)' }}>{r.journalConference} ({r.publicationYear})</div>
                              {r.doi && <a href={r.doi} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '10.5px' }}>DOI Publication →</a>}
                            </div>
                          ))}
                        </div>
                      ) : <div style={{ fontSize: '11px', color: 'var(--ds-text3)', fontStyle: 'italic' }}>No research papers.</div>}
                    </div>
                  </motion.div>

                  {/* Faculty Mentor */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
                    style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="ds-card-label" style={{ marginBottom: '12px', fontSize: '11px' }}>ASSIGNED FACULTY MENTOR</div>
                    {mentor ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--ds-jade), #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '15px', fontWeight: 800, color: '#fff', flexShrink: 0
                          }}>
                            {mentor.fullName?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>{mentor.fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{mentor.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--ds-surface3)', borderRadius: '8px', border: '1px solid var(--ds-border)', marginTop: 'auto' }}>
                          {mentor.phone && (
                            <div style={{ display: 'flex', gap: '6px', fontSize: '11.5px' }}>
                              <span style={{ color: 'var(--ds-text3)' }}>📞</span>
                              <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{mentor.phone}</span>
                            </div>
                          )}
                          {mentor.department && (
                            <div style={{ display: 'flex', gap: '6px', fontSize: '11.5px' }}>
                              <span style={{ color: 'var(--ds-text3)' }}>🏛️</span>
                              <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{mentor.department}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--ds-text3)', fontStyle: 'italic', padding: '12px 0' }}>No mentor assigned yet.</div>
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
          </div>
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

      {/* ════════════════════ CLEAN MOBILE BOTTOM NAV (SINGLE TAB) ════════════════════ */}
      <nav className="ds-bottom-nav">
        <div className="ds-bottom-nav-inner" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button className="ds-bottom-nav-item active" style={{ maxWidth: '200px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Child Overview</span>
          </button>
        </div>
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
