import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import LogoHeader from '../components/LogoHeader';

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED PROGRESS RING FOR CGPA
// ─────────────────────────────────────────────────────────────────────────────
interface RingsProps { cgpa: number; }
function CgpaRings({ cgpa }: RingsProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const size = 180, cx = 90, cy = 90;
  const R = 70;
  const circ = 2 * Math.PI * R;
  const pct = Math.min(cgpa / 10, 1);
  const dash = circ * pct;

  useEffect(() => {
    if (!arcRef.current || !numRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      arcRef.current.style.strokeDashoffset = String(circ - dash);
      numRef.current.textContent = cgpa.toFixed(2);
      return;
    }
    gsap.fromTo(arcRef.current,
      { strokeDashoffset: circ },
      { strokeDashoffset: circ - dash, duration: 1.4, ease: 'power2.out', delay: 0.1 }
    );
    const obj = { val: 0 };
    gsap.to(obj, {
      val: cgpa, duration: 1.4, ease: 'power2.out', delay: 0.1,
      onUpdate: () => { if (numRef.current) numRef.current.textContent = obj.val.toFixed(2); }
    });
  }, [cgpa, circ, dash]);

  return (
    <div className="ds-rings-wrap" style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ds-border)" strokeWidth="8" />
        <circle
          ref={arcRef} cx={cx} cy={cy} r={R} fill="none"
          stroke="var(--ds-jade)" strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ} transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.3))' }}
        />
      </svg>
      <div className="ds-rings-center" style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={numRef} className="ds-cgpa-num" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ds-text1)' }}>0.00</div>
        <div className="ds-cgpa-sub" style={{ fontSize: '10px', color: 'var(--ds-text3)', textTransform: 'uppercase', marginTop: '2px' }}>Student CGPA</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED ATTENDANCE GAUGE (COLOR CHANGING: GREEN OR RED WARNING)
// ─────────────────────────────────────────────────────────────────────────────
interface AttendanceRingsProps { attended: number; total: number; }
function AttendanceRings({ attended, total }: AttendanceRingsProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const size = 180, cx = 90, cy = 90;
  const R = 70;
  const circ = 2 * Math.PI * R;
  const percentage = total > 0 ? (attended / total) * 100 : 0;
  const pct = Math.min(percentage / 100, 1);
  const dash = circ * pct;

  const isHealthy = percentage >= 75;
  const strokeColor = isHealthy ? '#10b981' : '#ef4444'; // Emerald green or Crimson warning
  const strokeGlow = isHealthy ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';

  useEffect(() => {
    if (!arcRef.current || !numRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      arcRef.current.style.strokeDashoffset = String(circ - dash);
      numRef.current.textContent = percentage.toFixed(0) + '%';
      return;
    }
    gsap.fromTo(arcRef.current,
      { strokeDashoffset: circ },
      { strokeDashoffset: circ - dash, duration: 1.4, ease: 'power2.out', delay: 0.15 }
    );
    const obj = { val: 0 };
    gsap.to(obj, {
      val: percentage, duration: 1.4, ease: 'power2.out', delay: 0.15,
      onUpdate: () => { if (numRef.current) numRef.current.textContent = obj.val.toFixed(0) + '%'; }
    });
  }, [percentage, circ, dash]);

  return (
    <div className="ds-rings-wrap" style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ds-border)" strokeWidth="8" />
        <circle
          ref={arcRef} cx={cx} cy={cy} r={R} fill="none"
          stroke={strokeColor} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ} transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: `drop-shadow(0 0 6px ${strokeGlow})` }}
        />
      </svg>
      <div className="ds-rings-center" style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div ref={numRef} className="ds-cgpa-num" style={{ fontSize: '26px', fontWeight: 800, color: isHealthy ? '#10b981' : '#ef4444' }}>0%</div>
        <div className="ds-cgpa-sub" style={{ fontSize: '10px', color: 'var(--ds-text3)', textTransform: 'uppercase', marginTop: '2px' }}>Attendance</div>
      </div>
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

type Tab = 'overview' | 'academics' | 'portfolio' | 'mentor';

export default function ParentDashboard({ userSession, handleLogout }: ParentDashboardProps) {
  // Extract student roll number from email prefix by default
  const defaultRollNo = userSession.email.split('@')[0].toUpperCase();
  const [rollNo, setRollNo] = useState(defaultRollNo);
  const [searchVal, setSearchVal] = useState(defaultRollNo);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const fetchParentData = async (queryRoll: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/parent/dashboard?rollNo=${encodeURIComponent(queryRoll.trim())}`, {
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        throw new Error(errObj.error || 'Failed to fetch student data');
      }
      const json = await res.json();
      setData(json);
      if (json.profile && json.profile.rollNo) {
        setRollNo(json.profile.rollNo);
        setSearchVal(json.profile.rollNo);
      } else {
        setRollNo(queryRoll.trim().toUpperCase());
      }
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData(defaultRollNo);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      fetchParentData(searchVal);
    }
  };

  const studentUser = data?.studentUser;
  const profile = data?.profile;
  const results = data?.results || [];
  const education = data?.education || [];
  const certifications = data?.certifications || [];
  const projects = data?.projects || [];
  const internships = data?.internships || [];
  const research = data?.research || [];
  const events = data?.events || [];
  const courses = data?.courses || [];
  const skills = data?.skills || [];
  const mentor = data?.mentor;

  // Compute stats
  const percentage = profile ? (profile.attendedClasses / profile.totalClasses) * 100 : 0;
  const isHealthy = percentage >= 75;

  return (
    <div className="ds-shell">
      {/* ── HEADER ── */}
      <header className="ds-topbar">
        <div className="ds-topbar-left">
          <LogoHeader imageStyle={{ height: '32px' }} />
          <span className="ds-role-indicator">Parent Mode</span>
        </div>

        {/* Quick Student Switcher / Search bar */}
        <form onSubmit={handleSearchSubmit} className="ds-topbar-center" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '20px', padding: '2px 8px 2px 14px', maxWidth: '340px', width: '100%' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search roll number..."
            style={{ background: 'transparent', border: 'none', color: 'var(--ds-text1)', fontSize: '12px', outline: 'none', flex: 1 }}
          />
          <button type="submit" className="ds-btn ds-btn-primary" style={{ padding: '4px 10px', fontSize: '11px', height: '26px', borderRadius: '14px' }}>Search</button>
        </form>

        <div className="ds-topbar-right">
          <button id="ds-signout-btn" className="ds-btn ds-btn-ghost ds-signout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* ── MAIN BODY ── */}
      <div className="ds-body">
        {/* ── SIDEBAR ── */}
        <aside className="ds-sidebar">
          <nav className="ds-nav">
            <div className="ds-nav-section">Navigation</div>
            
            <button className={`ds-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <span className="ds-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </span>
              <span className="ds-nav-label">Summary Overview</span>
            </button>

            <button className={`ds-nav-item ${activeTab === 'academics' ? 'active' : ''}`} onClick={() => setActiveTab('academics')}>
              <span className="ds-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              </span>
              <span className="ds-nav-label">Academic Grades</span>
            </button>

            <button className={`ds-nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
              <span className="ds-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              </span>
              <span className="ds-nav-label">Portfolio & Skills</span>
            </button>

            <button className={`ds-nav-item ${activeTab === 'mentor' ? 'active' : ''}`} onClick={() => setActiveTab('mentor')}>
              <span className="ds-nav-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </span>
              <span className="ds-nav-label">Assigned Mentor</span>
            </button>
          </nav>

          <div className="ds-sidebar-footer">
            <div className="ds-mini-avatar" style={{ background: 'var(--ds-jade)' }}>P</div>
            <div>
              <div className="ds-mini-name">{userSession.fullName || 'Parent'}</div>
              <div className="ds-mini-roll">Viewing: {rollNo}</div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT PANEL ── */}
        <main className="ds-main" style={{ paddingBottom: '80px' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              <div className="ds-loader-ring" />
              <div className="ds-loader-text" style={{ marginTop: '14px', color: 'var(--ds-text3)' }}>Loading secure student profile data...</div>
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ color: 'var(--ds-text1)', margin: '0 0 8px', fontSize: '18px' }}>Student Profile Not Found</h3>
              <p style={{ color: 'var(--ds-text3)', maxWidth: '400px', margin: '0 0 16px', fontSize: '13px', lineHeight: 1.5 }}>{error}</p>
              <button className="ds-btn ds-btn-primary" onClick={() => fetchParentData(defaultRollNo)}>Reset to default Roll No ({defaultRollNo})</button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* HERO CARD */}
              <motion.div className="ds-card ds-hero-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div className="ds-hero-avatar-wrap">
                  <div className="ds-hero-avatar">
                    {profile?.photoUrl ? (
                      <img src={profile.photoUrl} alt="Student avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      studentUser?.fullName?.slice(0, 1)?.toUpperCase() || 'S'
                    )}
                  </div>
                </div>
                <div className="ds-hero-info">
                  <div className="ds-hero-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`ds-dot ${isHealthy ? 'ds-dot-emerald' : 'ds-dot-crimson'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: isHealthy ? '#10b981' : '#ef4444', display: 'inline-block' }} />
                    Active Scholar · {profile?.departmentId || 'Department'}
                  </div>
                  <h1 className="ds-hero-name">{studentUser?.fullName || 'Student'}</h1>
                  <p className="ds-hero-meta">
                    <span className="ds-mono" style={{ background: 'var(--ds-surface-overlay)', padding: '2px 6px', borderRadius: '4px' }}>{profile?.rollNo}</span> · {profile?.batch || 'Batch'} · Section {profile?.sectionId || 'A'}
                  </p>
                  {profile?.profileSummary && (
                    <p className="ds-hero-bio" style={{ fontSize: '12.5px', color: 'var(--ds-text2)', marginTop: '8px' }}>{profile.profileSummary}</p>
                  )}
                </div>
                <div className="ds-hero-right">
                  <div className="ds-cgpa-mini" style={{ textAlign: 'center', padding: '16px', background: 'var(--ds-surface2)', borderRadius: '10px', minWidth: '120px' }}>
                    <div className="ds-cgpa-mini-val ds-mono" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ds-jade)' }}>{profile?.cgpa ? profile.cgpa.toFixed(2) : '—'}</div>
                    <div className="ds-cgpa-mini-label" style={{ fontSize: '10px', color: 'var(--ds-text3)', textTransform: 'uppercase', marginTop: '4px' }}>Current CGPA</div>
                  </div>
                </div>
              </motion.div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
                  {/* METRIC GAUGES ROW */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    
                    {/* Attendance Card */}
                    <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '15px', color: 'var(--ds-text1)', margin: '0 0 16px', fontWeight: 700 }}>Attendance Health</h3>
                      <AttendanceRings attended={profile?.attendedClasses || 0} total={profile?.totalClasses || 100} />
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text2)', marginTop: '16px', lineHeight: 1.4 }}>
                        {isHealthy 
                          ? '✓ Student attendance meets the minimum college requirements of 75%.'
                          : '⚠️ Warning: Attendance is below 75%. Student may face issues in examinations.'}
                      </p>
                    </div>

                    {/* Academic Performance Card */}
                    <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '15px', color: 'var(--ds-text1)', margin: '0 0 16px', fontWeight: 700 }}>Cumulative CGPA</h3>
                      <CgpaRings cgpa={profile?.cgpa || 0} />
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text2)', marginTop: '16px', lineHeight: 1.4 }}>
                        {profile?.cgpa && profile.cgpa >= 8.0 
                          ? '★ Outstanding Performance! Eligible for premium placements.' 
                          : profile?.cgpa && profile.cgpa >= 6.5 
                            ? 'Good standing. Keep working to qualify for premium roles.' 
                            : 'Average performance. Needs focus to qualify for campus recruitment.'}
                      </p>
                    </div>

                    {/* Placement Preparedness Card */}
                    <div className="ds-card" style={{ display: 'flex', padding: '24px 20px', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '15px', color: 'var(--ds-text1)', margin: '0 0 12px', fontWeight: 700 }}>Recruitment Readiness</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px', background: 'var(--ds-surface2)', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                          <span style={{ fontSize: '24px' }}>🛡️</span>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>
                              {profile?.isPublic ? 'Public Profile Enabled' : 'Profile Private'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>
                              {profile?.isPublic ? 'Recruiters can view portfolio' : 'Not visible to campus recruiters'}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--ds-text3)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>Key Milestones Done</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                            <span>Projects Built:</span>
                            <strong style={{ color: 'var(--ds-text1)' }}>{projects.length}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                            <span>Certifications:</span>
                            <strong style={{ color: 'var(--ds-text1)' }}>{certifications.length}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                            <span>Skills Verified:</span>
                            <strong style={{ color: 'var(--ds-text1)' }}>{skills.length}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* QUICK INFO CARDS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                    {/* Coding Profile Stats */}
                    <div className="ds-card" style={{ padding: '20px' }}>
                      <h3 style={{ fontSize: '14px', color: 'var(--ds-text1)', margin: '0 0 14px', fontWeight: 700, borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>Coding & Problem Solving Profile</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div style={{ padding: '12px', background: 'var(--ds-surface2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--ds-text3)', textTransform: 'uppercase' }}>LeetCode Solved</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ds-text1)', marginTop: '4px' }}>
                            {profile ? profile.leetcodeEasySolved + profile.leetcodeMediumSolved + profile.leetcodeHardSolved : 0}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--ds-text3)', marginTop: '2px' }}>
                            {profile ? `${profile.leetcodeMediumSolved} Med · ${profile.leetcodeHardSolved} Hard` : ''}
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--ds-surface2)', borderRadius: '8px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--ds-text3)', textTransform: 'uppercase' }}>GitHub Commits</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ds-text1)', marginTop: '4px' }}>{profile?.githubCommitsCount || 0}</div>
                          <div style={{ fontSize: '10px', color: 'var(--ds-text3)', marginTop: '2px' }}>across {profile?.githubReposCount || 0} repositories</div>
                        </div>
                      </div>
                    </div>

                    {/* Mentor Card */}
                    {mentor ? (
                      <div className="ds-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h3 style={{ fontSize: '14px', color: 'var(--ds-text1)', margin: '0 0 12px', fontWeight: 700, borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>Assigned Counseling Mentor</h3>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                              {mentor.fullName.slice(0,1).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ds-text1)' }}>{mentor.fullName}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)', marginTop: '2px' }}>Academic Advisor & Mentor</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                          {mentor.phone && (
                            <a href={`tel:${mentor.phone}`} className="ds-btn ds-btn-secondary" style={{ flex: 1, fontSize: '11.5px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              📞 Call Mentor
                            </a>
                          )}
                          <a href={`mailto:${mentor.email}`} className="ds-btn ds-btn-secondary" style={{ flex: 1, fontSize: '11.5px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            ✉ Email Mentor
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="ds-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text3)', fontSize: '13px' }}>
                        No mentor has been assigned to this student profile yet.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 2: ACADEMIC GRADES */}
              {activeTab === 'academics' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} style={{ marginTop: '24px' }}>
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <div className="ds-section-header" style={{ marginBottom: '20px' }}>
                      <h2 className="ds-section-title" style={{ fontSize: '16px' }}>Semester Results</h2>
                      <p className="ds-section-sub">Verified grading and CGPA details per semester.</p>
                    </div>

                    {results.length === 0 ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ds-text3)', fontSize: '13px' }}>
                        No grading records found for this student.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {results.map((sem: any) => (
                          <div key={sem.id} style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '10px', padding: '16px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ds-border)', paddingBottom: '10px', marginBottom: '12px' }}>
                              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>Semester {sem.semester}</h3>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--ds-jade)' }}>SGPA: {sem.sgpa.toFixed(2)}</div>
                            </div>
                            
                            {/* Subject Grades breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {sem.subjects && Object.entries(sem.subjects).map(([subject, grade]: any) => (
                                <div key={subject} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', borderBottom: '1px dashed var(--ds-border)', paddingBottom: '6px' }}>
                                  <span style={{ color: 'var(--ds-text2)' }}>{subject}</span>
                                  <span className="ds-mono" style={{ fontWeight: 700, color: grade === 'F' ? '#ef4444' : 'var(--ds-text1)' }}>{grade}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 3: PORTFOLIO & SKILLS */}
              {activeTab === 'portfolio' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                  
                  {/* Education History */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Academic History</h3>
                    {education.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No education records added yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {education.map((edu: any) => (
                          <div key={edu.id} style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{edu.institution}</h4>
                              <span style={{ fontSize: '11px', color: 'var(--ds-jade)', fontWeight: 700 }}>{edu.score || '—'}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ds-text2)', marginTop: '4px' }}>{edu.degree} · Year {edu.year || '—'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Skill Badge Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Verified Skills</h3>
                    {skills.length === 0 ? (
                      <span style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No skills listed yet.</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {skills.map((s: any) => (
                          <span key={s.id} style={{ fontSize: '11.5px', padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', fontWeight: 600 }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Projects Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Student Projects ({projects.length})</h3>
                    {projects.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No projects added yet.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                        {projects.map((proj: any) => (
                          <div key={proj.id} style={{ border: '1px solid var(--ds-border)', background: 'var(--ds-surface2)', borderRadius: '8px', padding: '14px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)', margin: '0 0 6px' }}>{proj.title}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '0 0 10px', lineHeight: 1.4 }}>{proj.description}</p>
                            {proj.technologies && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {proj.technologies.split(',').map((tech: string) => (
                                  <span key={tech} style={{ fontSize: '9.5px', padding: '2px 6px', background: 'var(--ds-surface-overlay)', color: 'var(--ds-text3)', borderRadius: '4px' }}>{tech.trim()}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Internships Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Internships ({internships.length})</h3>
                    {internships.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No internships listed yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {internships.map((intern: any) => (
                          <div key={intern.id} style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{intern.role}</h4>
                              <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{intern.duration || '—'}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ds-text2)', fontWeight: 600, marginTop: '2px' }}>{intern.company}</div>
                            {intern.description && <p style={{ fontSize: '12px', color: 'var(--ds-text2)', marginTop: '8px', margin: '8px 0 0', lineHeight: 1.4 }}>{intern.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Certifications Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Certifications ({certifications.length})</h3>
                    {certifications.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No credentials added yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {certifications.map((cert: any) => (
                          <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '12px' }}>
                            <div>
                              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{cert.name}</h4>
                              <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>Issuer: {cert.issuer} · Issued on {cert.issueDate || '—'}</div>
                            </div>
                            {cert.verificationUrl && (
                              <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-ghost" style={{ padding: '4px 10px', fontSize: '11px', height: '26px' }}>Verify ↗</a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Research & Publications Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Research & Publications ({research.length})</h3>
                    {research.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No research publications listed yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {research.map((resItem: any) => (
                          <div key={resItem.id} style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)', margin: '0 12px 0 0', flex: 1 }}>{resItem.title}</h4>
                              {resItem.link && (
                                <a href={resItem.link} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-ghost" style={{ padding: '2px 8px', fontSize: '10px', height: '22px' }}>Link ↗</a>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ds-text2)', marginTop: '4px' }}>Journal/Conference: {resItem.journal} · Co-authors: {resItem.authors || '—'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Events & Competitions Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>Co-curricular Events & Achievements ({events.length})</h3>
                    {events.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No events listed yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {events.map((evt: any) => (
                          <div key={evt.id} style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{evt.title}</h4>
                              <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{evt.date || '—'}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--ds-text2)', marginTop: '2px' }}>Organized by: {evt.organizer}</div>
                            {evt.description && <p style={{ fontSize: '12px', color: 'var(--ds-text2)', marginTop: '6px', margin: '6px 0 0', lineHeight: 1.4 }}>{evt.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Courses Panel */}
                  <div className="ds-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ds-text1)', marginBottom: '12px' }}>External Courses completed ({courses.length})</h3>
                    {courses.length === 0 ? (
                      <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)' }}>No external courses listed yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {courses.map((crs: any) => (
                          <div key={crs.id} style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{crs.name}</h4>
                              <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>Platform: {crs.platform}</div>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--ds-jade)', fontWeight: 700 }}>{crs.duration || 'Completed'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </motion.div>
              )}

              {/* TAB 4: MENTOR SUPPORT */}
              {activeTab === 'mentor' && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} style={{ marginTop: '24px' }}>
                  <div className="ds-card" style={{ padding: '24px' }}>
                    <div className="ds-section-header" style={{ marginBottom: '20px' }}>
                      <h2 className="ds-section-title" style={{ fontSize: '16px' }}>Mentorship & Counseling Details</h2>
                      <p className="ds-section-sub">Quick contact channels with department administrators.</p>
                    </div>

                    {mentor ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ padding: '20px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '10px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '24px' }}>
                            {mentor.fullName.slice(0,1).toUpperCase()}
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ds-text1)', margin: 0 }}>{mentor.fullName}</h3>
                            <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)', marginTop: '2px', margin: 0 }}>Your student's assigned counselor and mentor.</p>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                          <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '8px', background: 'var(--ds-surface2)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text3)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address</div>
                            <div style={{ fontSize: '13.5px', color: 'var(--ds-text1)', fontWeight: 600, marginTop: '4px', wordBreak: 'break-all' }}>{mentor.email}</div>
                            <a href={`mailto:${mentor.email}`} className="ds-btn ds-btn-ghost" style={{ marginTop: '12px', fontSize: '11px', height: '28px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Send Email</a>
                          </div>

                          {mentor.phone && (
                            <div style={{ padding: '16px', border: '1px solid var(--ds-border)', borderRadius: '8px', background: 'var(--ds-surface2)' }}>
                              <div style={{ fontSize: '11px', color: 'var(--ds-text3)', textTransform: 'uppercase', fontWeight: 700 }}>Mobile Number</div>
                              <div style={{ fontSize: '13.5px', color: 'var(--ds-text1)', fontWeight: 600, marginTop: '4px' }}>{mentor.phone}</div>
                              <a href={`tel:${mentor.phone}`} className="ds-btn ds-btn-ghost" style={{ marginTop: '12px', fontSize: '11px', height: '28px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Place Call</a>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ds-text3)', fontSize: '13px' }}>
                        No mentor information available for this student.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}
