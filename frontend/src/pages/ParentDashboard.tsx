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
  }, [cgpa]);

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
// ANIMATED BAR — simple inline progress
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
// SIMPLE DONUT CHART (SVG, no lib)
// ─────────────────────────────────────────────────────────────────────────────
function Donut({ segments, size = 80, stroke = 10 }: {
  segments: { value: number; color: string; label: string }[];
  size?: number;
  stroke?: number;
}) {
  const R = (size - stroke) / 2;
  const circ = 2 * Math.PI * R;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const arcs = segments.map(seg => {
    const dash = (seg.value / total) * circ;
    const arc = { dash, offset: circ - offset, color: seg.color };
    offset += dash;
    return arc;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="var(--ds-surface3)" strokeWidth={stroke} />
      {arcs.map((a, i) => (
        <circle key={i} cx={size/2} cy={size/2} r={R} fill="none" stroke={a.color}
          strokeWidth={stroke} strokeDasharray={`${a.dash} ${circ - a.dash}`}
          strokeDashoffset={a.offset} strokeLinecap="butt" />
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARENT DASHBOARD
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('ds-theme') as any) || 'dark'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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

  // ── Destructure all student data ──
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

  const attendedClasses = profile?.attendedClasses || 0;
  const totalClasses    = profile?.totalClasses    || 0;
  const attendancePct   = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
  const attendanceOk    = attendancePct >= 75;

  // Placement weightage (same formula as student)
  const cgpaVal        = profile?.cgpa || 0;
  const cgpaScore      = (cgpaVal / 10) * 40;
  const projectScore   = projects.length >= 3 ? 25 : projects.length * 8.33;
  const internScore    = internships.length >= 1 ? 15 : 0;
  const certsScore     = certifications.length >= 2 ? 20 : certifications.length * 10;
  const weightageTotal = Math.min(Math.round(cgpaScore + projectScore + internScore + certsScore), 100);

  let eligLabel = 'LOW'; let eligColor = '#ef4444';
  if (weightageTotal >= 80) { eligLabel = 'HIGH'; eligColor = '#10b981'; }
  else if (weightageTotal >= 60) { eligLabel = 'MEDIUM'; eligColor = '#f59e0b'; }

  // Skill categories for donut
  const skillGroups: Record<string, number> = skills.reduce((acc: any, s: any) => {
    acc[s.category || 'Others'] = (acc[s.category || 'Others'] || 0) + 1;
    return acc;
  }, {});
  const skillColors = ['#10b981','#6366f1','#f59e0b','#ec4899','#3b82f6'];
  const skillSegs = Object.entries(skillGroups).map(([label, value], i) => ({
    label, value, color: skillColors[i % skillColors.length]
  }));

  // Certifications by type for donut
  const certGroups: Record<string, number> = certifications.reduce((acc: any, c: any) => {
    acc[c.certType || 'Other'] = (acc[c.certType || 'Other'] || 0) + 1;
    return acc;
  }, {});
  const certColors = ['#10b981','#6366f1','#f59e0b','#ec4899','#3b82f6'];
  const certSegs = Object.entries(certGroups).map(([label, value], i) => ({
    label, value, color: certColors[i % certColors.length]
  }));

  // Project type split
  const collegeProjects  = projects.filter((p: any) => p.projectType === 'college').length;
  const personalProjects = projects.length - collegeProjects;

  return (
    <div className="ds-shell">
      {/* ══════════════════════════════════════════ HEADER ══════════════════════════════════════════ */}
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
          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            className="ds-btn ds-btn-ghost" style={{ padding: '6px 8px' }} title="Toggle theme">
            {theme === 'dark'
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <button id="parent-signout-btn" className="ds-btn ds-btn-ghost ds-signout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* ══════════════════════════════════════════ BODY ══════════════════════════════════════════ */}
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

          {/* Sidebar Student Card */}
          {profile && (
            <div style={{
              margin: '16px 12px 0', padding: '14px',
              background: 'var(--ds-surface2)', borderRadius: '10px',
              border: '1px solid var(--ds-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--ds-jade), #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 800, color: '#fff', flexShrink: 0
                }}>
                  {profile.photoUrl
                    ? <img src={profile.photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : (studentUser?.fullName?.charAt(0) || 'S')}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {studentUser?.fullName || 'Student'}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--ds-text3)', fontFamily: 'var(--ds-font-mono)' }}>
                    {profile.rollNo}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--ds-text3)' }}>Department</span>
                  <span style={{ color: 'var(--ds-text1)', fontWeight: 600, fontSize: '10px' }}>{profile.departmentId || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--ds-text3)' }}>Batch</span>
                  <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{profile.batch || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--ds-text3)' }}>Section</span>
                  <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{profile.sectionId || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: 'var(--ds-text3)' }}>Semester</span>
                  <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{profile.currentSemester || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="ds-main">
          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--ds-border)', borderTop: '3px solid var(--ds-jade)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: 'var(--ds-text3)', fontSize: '13px' }}>Loading child profile…</span>
            </div>
          )}

          {/* Error */}
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
          {!loading && !error && data && (() => {
            return (
              <div className="ds-overview">

                {/* ── HERO CARD ── */}
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
                      {profile?.sectionId && ` · ${profile.sectionId}`}
                    </p>
                    {profile?.profileSummary && (
                      <p className="ds-hero-bio">{profile.profileSummary}</p>
                    )}
                    {/* Social links (read-only for parent) */}
                    <div className="ds-hero-links">
                      {profile?.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">LinkedIn</a>}
                      {profile?.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">GitHub</a>}
                      {profile?.resumeUrl && <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">Resume</a>}
                    </div>
                  </div>
                  <div className="ds-hero-right">
                    {/* CGPA Ring */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <CgpaRing cgpa={profile?.cgpa || 0} />
                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>/ 10.0 Scale</span>
                    </div>
                  </div>
                </motion.div>

                {/* ── METRICS ROW ── (same 4 chips as student overview) */}
                <div className="ds-metrics">
                  {[
                    {
                      label: 'Projects',
                      value: projects.length,
                      sub: projects.length === 0
                        ? 'No projects yet'
                        : `${collegeProjects} College · ${personalProjects} Personal`
                    },
                    {
                      label: 'Certificates',
                      value: certifications.length,
                      sub: certifications.length === 0
                        ? 'No certificates yet'
                        : `${certifications.filter((c: any) => c.isFeatured).length} Featured`
                    },
                    {
                      label: 'Internships',
                      value: internships.length,
                      sub: internships.length === 0
                        ? 'No internships yet'
                        : `${internships.filter((i: any) => i.internshipType === 'Online').length} Remote · ${internships.filter((i: any) => i.internshipType !== 'Online').length} Office`
                    },
                    {
                      label: 'Activities',
                      value: courses.length + events.length,
                      sub: (courses.length + events.length) === 0
                        ? 'No activities yet'
                        : `${courses.length} Courses · ${events.length} Events`
                    },
                  ].map((m, i) => (
                    <motion.div key={m.label} className="ds-metric-chip"
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                      <div className="ds-metric-val ds-mono">{m.value}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                        <div className="ds-metric-label">{m.label}</div>
                        <div className="ds-metric-sub" title={m.sub}>{m.sub}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ── ATTENDANCE + PLACEMENT WEIGHTAGE (side by side) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                  {/* Attendance Card */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>ATTENDANCE</div>
                      <span className="ds-badge" style={{ background: attendanceOk ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: attendanceOk ? '#10b981' : '#ef4444', fontSize: '10px' }}>
                        {attendanceOk ? '✓ Healthy' : '⚠ Low'}
                      </span>
                    </div>

                    {/* Big percentage display */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div style={{ fontSize: '48px', fontWeight: 900, color: attendanceOk ? '#10b981' : '#ef4444', fontFamily: 'var(--ds-font-mono)', lineHeight: 1 }}>
                        {attendancePct.toFixed(0)}%
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '4px' }}>
                        {attendedClasses} attended / {totalClasses} total classes
                      </div>
                    </div>

                    {/* Progress bar */}
                    <AnimBar pct={attendancePct} color={attendanceOk ? '#10b981' : '#ef4444'} />

                    {/* 75% marker label */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--ds-text3)', marginTop: '6px' }}>
                      <span>0%</span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>Min: 75%</span>
                      <span>100%</span>
                    </div>

                    {!attendanceOk && (
                      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', fontSize: '11px', color: '#ef4444' }}>
                        ⚠️ Below 75% minimum — contact college for medical leave or late attendance approval.
                      </div>
                    )}
                  </motion.div>

                  {/* Placement Weightage Card */}
                  <motion.div className="ds-card ds-weightage-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>PLACEMENT READINESS</div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: eligColor, background: `${eligColor}18`, padding: '2px 8px', borderRadius: '8px' }}>
                        {eligLabel}
                      </span>
                    </div>

                    <div className="ds-weightage-score-row">
                      <div className="ds-weightage-ring-wrap">
                        <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute' }}>
                          <circle cx="30" cy="30" r="24" fill="none" stroke="var(--ds-border)" strokeWidth="4" />
                          <circle cx="30" cy="30" r="24" fill="none" stroke={eligColor} strokeWidth="4"
                            strokeDasharray="150.79" strokeDashoffset={150.79 * (1 - weightageTotal / 100)}
                            transform="rotate(-90 30 30)" strokeLinecap="round" />
                        </svg>
                        <span className="ds-weightage-ring-score">{weightageTotal}%</span>
                      </div>
                      <div className="ds-weightage-status-info">
                        <div className="ds-weightage-status-title">Eligibility: {eligLabel}</div>
                        <div className="ds-weightage-status-desc" style={{ fontSize: '10px', lineHeight: 1.4 }}>
                          {weightageTotal >= 80
                            ? 'Excellent profile for campus placements.'
                            : weightageTotal >= 60
                            ? 'Good progress. More projects or internships will help.'
                            : 'Build portfolio to qualify for premium placements.'}
                        </div>
                      </div>
                    </div>

                    <div className="ds-weightage-items" style={{ marginTop: '12px' }}>
                      {[
                        { name: 'CGPA (40%)', val: cgpaScore, max: 40, color: '#10b981' },
                        { name: 'Projects (25%)', val: projectScore, max: 25, color: '#6366f1' },
                        { name: 'Internships (15%)', val: internScore, max: 15, color: '#f59e0b' },
                        { name: 'Certificates (20%)', val: certsScore, max: 20, color: '#ec4899' },
                      ].map(item => (
                        <div key={item.name} className="ds-weightage-item">
                          <div className="ds-weightage-item-header">
                            <div className="ds-weightage-item-name">{item.name}</div>
                            <div className="ds-weightage-item-val">{Math.round(item.val)}%</div>
                          </div>
                          <AnimBar pct={(item.val / item.max) * 100} color={item.color} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* ── BENTO ROW: Charts + recent items ── */}
                <div className="ds-bento-row">

                  {/* Projects */}
                  {projects.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>PROJECTS</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({projects.length} Total)</span>
                      </div>
                      {/* Mini chart: college vs personal */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                        <Donut size={70} stroke={9}
                          segments={[
                            { value: collegeProjects, color: '#10b981', label: 'College' },
                            { value: personalProjects, color: '#6366f1', label: 'Personal' },
                          ]} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                            <span style={{ color: 'var(--ds-text2)' }}>College: <strong style={{ color: 'var(--ds-text1)' }}>{collegeProjects}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', display: 'inline-block' }} />
                            <span style={{ color: 'var(--ds-text2)' }}>Personal: <strong style={{ color: 'var(--ds-text1)' }}>{personalProjects}</strong></span>
                          </div>
                        </div>
                      </div>
                      {/* Latest project */}
                      {(() => {
                        const proj = projects.find((p: any) => p.isFeatured) || projects[0];
                        return (
                          <div style={{ padding: '10px', background: 'var(--ds-surface3)', borderRadius: '8px', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '3px' }}>{proj.title}</div>
                            <p style={{ fontSize: '11px', color: 'var(--ds-text2)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {proj.description || 'No description.'}
                            </p>
                            {proj.techStack && <div style={{ fontSize: '10px', color: 'var(--ds-text3)', marginTop: '4px' }}>{proj.techStack.split(',').slice(0, 3).join(' · ')}</div>}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* Certifications with donut */}
                  {certifications.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>CERTIFICATIONS</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({certifications.length} Total)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                        <Donut size={70} stroke={9} segments={certSegs.length ? certSegs : [{ value: 1, color: '#10b981', label: 'Certs' }]} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {certSegs.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                              <span style={{ color: 'var(--ds-text2)' }}>{s.label}: <strong style={{ color: 'var(--ds-text1)' }}>{s.value}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Latest cert */}
                      {(() => {
                        const cert = certifications.find((c: any) => c.isFeatured) || certifications[0];
                        return (
                          <div style={{ padding: '10px', background: 'var(--ds-surface3)', borderRadius: '8px', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '3px' }}>{cert.title}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text2)' }}>{cert.issuingOrganization}</div>
                            <div style={{ fontSize: '10px', color: 'var(--ds-text3)', marginTop: '3px' }}>Issued: {cert.issueDate}</div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* Skills Donut */}
                  {skills.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>SKILLS</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({skills.length} Total)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
                        <Donut size={70} stroke={9} segments={skillSegs.length ? skillSegs : [{ value: 1, color: '#10b981', label: 'Skills' }]} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {skillSegs.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                              <span style={{ color: 'var(--ds-text2)' }}>{s.label}: <strong style={{ color: 'var(--ds-text1)' }}>{s.value}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Skill tags */}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: 'auto' }}>
                        {skills.slice(0, 8).map((s: any, i: number) => (
                          <span key={i} style={{ fontSize: '10px', padding: '3px 8px', background: 'var(--ds-surface3)', borderRadius: '6px', color: 'var(--ds-text2)', border: '1px solid var(--ds-border)' }}>
                            {s.name}
                          </span>
                        ))}
                        {skills.length > 8 && <span style={{ fontSize: '10px', color: 'var(--ds-text3)', padding: '3px' }}>+{skills.length - 8} more</span>}
                      </div>
                    </motion.div>
                  )}

                  {/* Internships */}
                  {internships.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>INTERNSHIPS</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({internships.length} Total)</span>
                      </div>
                      {/* Bar chart: online vs offline */}
                      {(() => {
                        const online = internships.filter((i: any) => i.internshipType === 'Online').length;
                        const offline = internships.length - online;
                        return (
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--ds-text2)' }}>🌐 Remote</span>
                                <span style={{ color: 'var(--ds-text1)', fontWeight: 700 }}>{online}</span>
                              </div>
                              <AnimBar pct={internships.length > 0 ? (online / internships.length) * 100 : 0} color="#10b981" />
                            </div>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--ds-text2)' }}>🏢 On-site</span>
                                <span style={{ color: 'var(--ds-text1)', fontWeight: 700 }}>{offline}</span>
                              </div>
                              <AnimBar pct={internships.length > 0 ? (offline / internships.length) * 100 : 0} color="#6366f1" />
                            </div>
                          </div>
                        );
                      })()}
                      {/* Latest internship */}
                      {(() => {
                        const intern = internships.find((i: any) => i.isFeatured) || internships[0];
                        return (
                          <div style={{ padding: '10px', background: 'var(--ds-surface3)', borderRadius: '8px', marginTop: 'auto' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '2px' }}>{intern.role}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text2)' }}>{intern.organization}</div>
                            <div style={{ fontSize: '10px', color: 'var(--ds-text3)', marginTop: '3px', fontFamily: 'var(--ds-font-mono)' }}>
                              {intern.startDate}{intern.endDate ? ` → ${intern.endDate}` : ' → Present'}
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}

                  {/* Events */}
                  {events.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>CAMPUS EVENTS</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({events.length} Total)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {events.slice(0, 3).map((ev: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px', background: 'var(--ds-surface3)', borderRadius: '8px' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--ds-jade), #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>🎯</div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)' }}>{ev.eventName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>Role: {ev.role}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Courses */}
                  {courses.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.40 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>ONLINE COURSES</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({courses.length} Total)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {courses.slice(0, 3).map((c: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px', background: 'var(--ds-surface3)', borderRadius: '8px' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>📚</div>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)' }}>{c.title}</div>
                              <div style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>{c.provider}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Research */}
                  {research.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
                      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                        <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, fontSize: '11px' }}>RESEARCH & PAPERS</div>
                        <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({research.length} Total)</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {research.slice(0, 2).map((r: any, i: number) => (
                          <div key={i} style={{ padding: '10px', background: 'var(--ds-surface3)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '2px' }}>{r.title}</div>
                            <div style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>{r.journalConference} · {r.publicationYear}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* ── DEVELOPER PLATFORMS (read-only) ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}>
                  <h2 className="ds-section-title" style={{ marginBottom: '16px' }}>Developer Profiles</h2>
                  <div className="ds-platforms">
                    {[
                      { key: 'leetcodeUrl', label: 'LeetCode', desc: 'Solved problems & coding skills',
                        stat: profile ? `Solved: ${(profile.leetcodeEasySolved || 0) + (profile.leetcodeMediumSolved || 0) + (profile.leetcodeHardSolved || 0)} (${profile.leetcodeEasySolved || 0}E · ${profile.leetcodeMediumSolved || 0}M · ${profile.leetcodeHardSolved || 0}H)` : '' },
                      { key: 'githubUrl', label: 'GitHub', desc: 'Repositories & open-source',
                        stat: profile ? `Repos: ${profile.githubReposCount || 0} · Commits: ${profile.githubCommitsCount || 0}` : '' },
                      { key: 'hackerrankUrl', label: 'HackerRank', desc: 'Verified badges & certifications',
                        stat: profile ? `Badges: ${profile.hackerrankBadges || 0} verified` : '' },
                      { key: 'linkedinUrl', label: 'LinkedIn', desc: 'Professional network',
                        stat: 'Professional Connection Verified' },
                      { key: 'codechefUrl', label: 'CodeChef', desc: 'Competitive programming',
                        stat: profile ? `Rating: ${profile.codechefRating || 0} · Stars: ${profile.codechefStars || '1★'}` : '' },
                      { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', desc: 'IIT Bombay tutorials',
                        stat: 'Spoken Tutorial Synced' },
                      { key: 'prepinstaUrl', label: 'PrepInsta', desc: 'Placement preparation',
                        stat: 'PrepInsta Profile Synced' },
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
                            <div style={{ fontSize: '11px', color: 'var(--ds-text1)', fontWeight: 600, margin: '4px 0 4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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

                {/* ── BOTTOM: Education Timeline + Mentor ── */}
                <div className="ds-overview-bottom-grid">
                  {/* Education Timeline */}
                  {education.length > 0 && (
                    <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
                      <div className="ds-card-label" style={{ marginBottom: '16px' }}>Education Timeline</div>
                      <div className="ds-timeline">
                        {education.slice(0, 4).map((edu: any, idx: number) => (
                          <div key={idx} className="ds-timeline-item">
                            <div className="ds-timeline-dot" />
                            <div className="ds-timeline-content">
                              <div className="ds-timeline-type">{edu.eduType}</div>
                              <div className="ds-timeline-inst">{edu.institution || edu.boardUniversity}</div>
                              <div className="ds-timeline-meta ds-mono">{edu.score} {edu.scoreType} · {edu.yearOfPassing}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Mentor Info */}
                  <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 }}>
                    <div className="ds-card-label" style={{ marginBottom: '16px' }}>Assigned Mentor</div>
                    {mentor ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--ds-jade), #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', fontWeight: 800, color: '#fff', flexShrink: 0
                          }}>
                            {mentor.fullName?.charAt(0) || 'M'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{mentor.fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{mentor.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--ds-surface3)', borderRadius: '8px' }}>
                          {mentor.phone && (
                            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                              <span style={{ color: 'var(--ds-text3)' }}>📞</span>
                              <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{mentor.phone}</span>
                            </div>
                          )}
                          {mentor.department && (
                            <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                              <span style={{ color: 'var(--ds-text3)' }}>🏛️</span>
                              <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{mentor.department}</span>
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--ds-text3)', fontStyle: 'italic', margin: 0 }}>
                          Reach out to the mentor for academic guidance or concerns.
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                        <p style={{ fontSize: '12px', color: 'var(--ds-text3)', margin: 0 }}>No mentor assigned yet.</p>
                      </div>
                    )}
                  </motion.div>
                </div>

              </div>
            );
          })()}

          {/* Empty state */}
          {!loading && !error && !data && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎓</div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '8px' }}>Search Your Child's Profile</h2>
              <p style={{ fontSize: '13px', color: 'var(--ds-text3)' }}>Enter the student roll number above to view their complete academic overview.</p>
            </div>
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════ FOOTER ══════════════════════════════════════════ */}
      <footer className="ds-footer">
        <div className="ds-footer-inner">
          <LogoHeader imageStyle={{ height: '22px', opacity: 0.6 }} />
          <span className="ds-footer-copy">© 2025 CIET ERP — Parent Portal</span>
          <span className="ds-footer-version">v2.0</span>
        </div>
      </footer>

      {/* ══════════════════════════════════════════ MOBILE BOTTOM NAV ══════════════════════════════════════════ */}
      <nav className="ds-bottom-nav">
        <div className="ds-bottom-nav-inner">
          <button className="ds-bottom-nav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Overview</span>
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
