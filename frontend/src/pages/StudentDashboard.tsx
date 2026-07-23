import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import LogoHeader from '../components/LogoHeader';

// Use VITE_APP_URL (set in production .env) so shared links use the real deployed domain
export const APP_ORIGIN = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin;

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED PARTICLE BACKGROUND (UNUSED)
// ─────────────────────────────────────────────────────────────────────────────
/*
function _DashboardParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let W = (canvas.width = canvas.offsetWidth);
    let H = (canvas.height = canvas.offsetHeight);

    const LARGE  = 18;
    const MEDIUM = 62;
    const SMALL  = 70;
    const NUM = LARGE + MEDIUM + SMALL;

    const mouse = { x: W / 2, y: H / 2 };

    interface Pt {
      x: number; y: number;
      vx: number; vy: number;
      r: number; baseR: number;
      hue: number; sat: number; lit: number;
      alpha: number; baseAlpha: number;
      phase: number; phaseSpeed: number;
      tier: 0 | 1 | 2;
      attractMouse: boolean;
    }

    const pts: Pt[] = Array.from({ length: NUM }, (_, i) => {
      const tier: 0 | 1 | 2 = i < LARGE ? 0 : i < LARGE + MEDIUM ? 1 : 2;
      const baseR  = tier === 0 ? Math.random() * 4 + 3
                   : tier === 1 ? Math.random() * 2 + 1
                   :              Math.random() * 1.2 + 0.4;
      const speed  = tier === 0 ? 0.18 : tier === 1 ? 0.32 : 0.55;
      const isRed  = Math.random() > 0.5;
      const hue    = 0;
      const sat    = isRed ? 85 : 0;
      const lit    = isRed ? 52 : (tier === 0 ? 15 : (tier === 1 ? 20 : 30));
      const alpha  = tier === 0 ? 0.55 + Math.random() * 0.3
                   : tier === 1 ? 0.28 + Math.random() * 0.2
                   :              0.15 + Math.random() * 0.25;
      return {
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: baseR, baseR,
        hue, sat, lit,
        alpha, baseAlpha: alpha,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.012 + Math.random() * 0.018,
        tier, attractMouse: tier !== 0,
      };
    });

    const onMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener('mousemove', onMove);

    let frame = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      raf = requestAnimationFrame(tick);
    };

    const onResize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', onResize);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0, opacity: 0.85,
      }}
    />
  );
}
*/



// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS TAB (preserved from original, styled with new tokens)
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsTabProps {
  profile: any;
  user: any;
  userSession: any;
  fetchDashboardData: () => void;
  API_BASE_URL: string;
}

function SettingsTab({ profile, user, userSession, fetchDashboardData, API_BASE_URL }: SettingsTabProps) {
  const [formData, setFormData] = useState({ ...profile, slug: user?.fullName || '' });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyPortfolioLink = (slug: string) => {
    const url = `${APP_ORIGIN}/portfolio/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  


  useEffect(() => {
    setFormData({ ...profile, slug: user?.fullName || '' });
  }, [profile, user]);

  const handleTogglePublic = async () => {
    const newPublicValue = !formData.isPublic;
    setFormData((prev: any) => ({ ...prev, isPublic: newPublicValue }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/profile`, { credentials: 'include', 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userSession.accessToken}` },
        body: JSON.stringify({ ...formData, isPublic: newPublicValue })
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      fetchDashboardData();
    } catch (err: any) {
      setFormData((prev: any) => ({ ...prev, isPublic: !newPublicValue }));
      alert(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev: any) => ({ ...prev, [name]: val }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` },
        body: uploadFormData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload photo');
      }
      const data = await res.json();
      setFormData((prev: any) => ({ ...prev, photoUrl: data.url }));
      alert('Photo uploaded successfully! Save settings to apply.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Resume PDF must be under 10MB'); return; }
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` },
        body: uploadFormData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload resume');
      }
      const data = await res.json();
      setFormData((prev: any) => ({ ...prev, resumeUrl: data.url }));
      alert('Resume uploaded successfully! Save settings to apply.');
    } catch (err: any) {
      alert(err.message);
    }
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/profile`, { credentials: 'include', 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userSession.accessToken}` },
        body: JSON.stringify(formData)
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to update profile'); }
      alert('Profile updated!'); fetchDashboardData();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleSyncPlatforms = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/sync-platforms`, { credentials: 'include', 
        method: 'POST', headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to sync'); }
      alert('Synced!'); fetchDashboardData();
    } catch (err: any) { alert(err.message); } finally { setSyncing(false); }
  };

  const requestEmailVerification = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/verify-email/request`, { credentials: 'include', 
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userSession.accessToken}` },
        body: JSON.stringify({ email: formData.personalEmail })
      });
      if (!res.ok) throw new Error('Failed to request OTP');
      setOtpSent(true); alert('OTP sent to your email.');
    } catch (err: any) { alert(err.message); }
  };

  const confirmEmailVerification = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/verify-email/confirm`, { credentials: 'include', 
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userSession.accessToken}` },
        body: JSON.stringify({ email: formData.personalEmail, code: otp })
      });
      if (!res.ok) throw new Error('Invalid OTP');
      alert('Email verified!'); setOtpSent(false); setOtp(''); fetchDashboardData();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="ds-settings-grid">
      <form onSubmit={handleSave} className="ds-card ds-settings-main">
        <div className="ds-section-header">
          <h2 className="ds-section-title">Profile Settings</h2>
          <p className="ds-section-sub">Manage personal info, links, and verifications.</p>
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Full Name</label>
          <input type="text" className="ds-input" name="slug" value={formData.slug || ''} onChange={handleChange} />
        </div>
        <div className="ds-form-group">
          <label className="ds-label">Biography</label>
          <textarea className="ds-input" rows={3} name="profileSummary" value={formData.profileSummary || ''} onChange={handleChange} placeholder="A short bio..." />
        </div>
        <div className="ds-form-row">
          <div className="ds-form-group">
            <label className="ds-label">Profile Photo</label>
            <input type="file" accept="image/*" style={{ display: 'none' }} id="photo-upload-input" onChange={handlePhotoUpload} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="photo-upload-input" className="ds-btn ds-btn-secondary" style={{ cursor: 'pointer' }}>Upload Image</label>
              {formData.photoUrl ? <span style={{ fontSize: '11px', color: 'var(--ds-emerald)' }}>✓ Uploaded</span> : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No image</span>}
            </div>
          </div>
          <div className="ds-form-group">
            <label className="ds-label">Resume URL or PDF Upload</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="url" className="ds-input" name="resumeUrl" value={formData.resumeUrl || ''} onChange={handleChange} placeholder="https://drive.google.com/..." style={{ flex: 1 }} />
              <input type="file" accept=".pdf" style={{ display: 'none' }} id="resume-upload-input" onChange={handleResumeUpload} />
              <label htmlFor="resume-upload-input" className="ds-btn ds-btn-secondary" style={{ cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '11px', padding: '0 12px', height: '40px', display: 'flex', alignItems: 'center' }}>Upload PDF</label>
            </div>
            {formData.resumeUrl && <span style={{ fontSize: '10px', color: 'var(--ds-emerald)', display: 'block', marginTop: '4px' }}>✓ Linked: {formData.resumeUrl.substring(formData.resumeUrl.lastIndexOf('/') + 1)}</span>}
          </div>
        </div>
        <div className="ds-settings-divider">Social & Platform Links</div>
        <div className="ds-form-row">
          <div className="ds-form-group"><label className="ds-label">LinkedIn</label><input type="url" className="ds-input" name="linkedinUrl" value={formData.linkedinUrl || ''} onChange={handleChange} /></div>
          <div className="ds-form-group"><label className="ds-label">GitHub</label><input type="url" className="ds-input" name="githubUrl" value={formData.githubUrl || ''} onChange={handleChange} /></div>
          <div className="ds-form-group"><label className="ds-label">LeetCode</label><input type="url" className="ds-input" name="leetcodeUrl" value={formData.leetcodeUrl || ''} onChange={handleChange} /></div>
          <div className="ds-form-group"><label className="ds-label">HackerRank</label><input type="url" className="ds-input" name="hackerrankUrl" value={formData.hackerrankUrl || ''} onChange={handleChange} /></div>
        </div>
        <div className="ds-form-row" style={{ marginTop: '12px' }}>
          <div className="ds-form-group"><label className="ds-label">CodeChef</label><input type="url" className="ds-input" name="codechefUrl" value={formData.codechefUrl || ''} onChange={handleChange} /></div>
          <div className="ds-form-group"><label className="ds-label">Spoken Tutorial</label><input type="url" className="ds-input" name="spokenTutorialUrl" value={formData.spokenTutorialUrl || ''} onChange={handleChange} /></div>
          <div className="ds-form-group"><label className="ds-label">PrepInsta</label><input type="url" className="ds-input" name="prepinstaUrl" value={formData.prepinstaUrl || ''} onChange={handleChange} /></div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="ds-btn ds-btn-secondary" onClick={handleSyncPlatforms} disabled={syncing}>{syncing ? 'Syncing...' : 'Sync Platform Data'}</button>
          <button type="submit" className="ds-btn ds-btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="ds-card">
          <div className="ds-settings-divider" style={{ margin: '0 0 16px' }}>Contact & Verification</div>
          <div className="ds-form-group">
            <label className="ds-label">Personal Email</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="email" className="ds-input" name="personalEmail" value={formData.personalEmail || ''} onChange={handleChange} style={{ flex: 1 }} />
              {profile?.personalEmailVerified
                ? <span className="ds-badge ds-badge-success">Verified</span>
                : <button type="button" onClick={requestEmailVerification} className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '0 10px' }}>Verify</button>
              }
            </div>
          </div>
          {otpSent && !profile?.personalEmailVerified && (
            <div className="ds-form-group" style={{ background: 'var(--ds-surface2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
              <label className="ds-label">Enter OTP</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input type="text" className="ds-input" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit code" style={{ flex: 1 }} />
                <button type="button" onClick={confirmEmailVerification} className="ds-btn ds-btn-primary" style={{ padding: '0 12px' }}>Confirm</button>
              </div>
            </div>
          )}
          <div className="ds-form-group" style={{ marginTop: '10px' }}>
            <label className="ds-label">Mobile Number</label>
            <input type="tel" className="ds-input" name="personalPhone" value={formData.personalPhone || ''} onChange={handleChange} />
          </div>
        </div>
        <div className="ds-card">
          <div className="ds-settings-divider" style={{ margin: '0 0 12px' }}>Public Portfolio</div>
          <p style={{ fontSize: '12.5px', color: 'var(--ds-text2)', lineHeight: 1.6, margin: '0 0 16px' }}>Enable so recruiters can view your verified portfolio without logging in.</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--ds-surface2)', borderRadius: '8px', border: '1px solid var(--ds-border)', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text1)' }}>Public Portfolio</div>
              <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>{formData.isPublic ? 'Visible to recruiters' : 'Private'}</div>
            </div>
            <button type="button" onClick={handleTogglePublic} className={`ds-toggle ${formData.isPublic ? 'on' : ''}`}>
              <span className="ds-toggle-thumb" />
            </button>
          </div>
          {formData.isPublic && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input readOnly value={`${APP_ORIGIN}/portfolio/${profile.slug || profile.rollNo}`} className="ds-input" style={{ flex: 1, fontSize: '11px', color: 'var(--ds-text3)' }} />
              <button type="button" className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                onClick={() => copyPortfolioLink(profile.slug || profile.rollNo)}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CGPA TRIPLE RINGS — Signature Element (GSAP animated)
// ─────────────────────────────────────────────────────────────────────────────

interface RingsProps { cgpa: number; }
function CgpaRings({ cgpa }: RingsProps) {
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLDivElement>(null);
  const size = 200, cx = 100, cy = 100;
  const R = 78;
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
      { strokeDashoffset: circ - dash, duration: 1.6, ease: 'power2.out', delay: 0.2 }
    );
    const obj = { val: 0 };
    gsap.to(obj, {
      val: cgpa, duration: 1.6, ease: 'power2.out', delay: 0.2,
      onUpdate: () => { if (numRef.current) numRef.current.textContent = obj.val.toFixed(2); }
    });
  }, [cgpa]);

  return (
    <div className="ds-rings-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--ds-border)" strokeWidth="10" />
        {/* Animated fill */}
        <circle
          ref={arcRef} cx={cx} cy={cy} r={R} fill="none"
          stroke="var(--ds-jade)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ} transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: 'drop-shadow(0 0 8px var(--ds-jade-glow))' }}
        />
      </svg>
      <div className="ds-rings-center">
        <div ref={numRef} className="ds-cgpa-num">0.00</div>
        <div className="ds-cgpa-sub">/ 10.00 CGPA</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO CARD — reusable across tabs
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioCardProps {
  children: React.ReactNode;
  delay?: number;
}
function PortfolioCard({ children, delay = 0 }: PortfolioCardProps) {
  return (
    <motion.div
      className="ds-card ds-port-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ verified, rejected }: { verified?: boolean; rejected?: boolean }) {
  if (verified) return <span className="ds-badge ds-badge-success">Verified ✓</span>;
  if (rejected) return <span className="ds-badge ds-badge-danger">Rejected</span>;
  return <span className="ds-badge ds-badge-pending">Pending</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ icon, text, action, onAction }: { icon: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="ds-empty">
      <div className="ds-empty-icon">{icon}</div>
      <p className="ds-empty-text">{text}</p>
      <button className="ds-btn ds-btn-primary" onClick={onAction}>{action}</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'academics' | 'education' | 'projects' | 'certifications' | 'internships' | 'skills' | 'research' | 'events' | 'courses' | 'notifications' | 'messages' | 'settings' | 'escalation' | 'broadcasts';

interface StudentDashboardProps {
  userSession: { role: string; email: string; fullName?: string; accessToken: string; };
  handleLogout: () => void;
}

const NAV_ITEMS: { key: Tab; label: string; icon: React.ReactNode; section?: string }[] = [
  {
    key: 'overview', label: 'Dashboard', section: 'Overview',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  },
  {
    key: 'broadcasts', label: 'Announcements & Trainings',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  },
  {
    key: 'academics', label: 'Grades',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
  },
  {
    key: 'education', label: 'Education', section: 'Portfolio',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  },
  {
    key: 'projects', label: 'Projects',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  },
  {
    key: 'skills', label: 'Skills',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/></svg>
  },
  {
    key: 'certifications', label: 'Certificates',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>
  },
  {
    key: 'internships', label: 'Internships',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  },
  {
    key: 'research', label: 'Research',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  },
  {
    key: 'events', label: 'Events',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  },
  {
    key: 'courses', label: 'Courses',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
  },
  {
    key: 'notifications', label: 'Notifications', section: 'Account',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  },
  {
    key: 'messages', label: 'Messages',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  },
  {
    key: 'escalation', label: 'Intervention Room',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><path d="M12 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-8M2 14V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z"/></svg>
  },
  {
    key: 'settings', label: 'Settings',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  },
];

// Page animation variants
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 }
};
const pageTransition = { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const };

export default function StudentDashboard({ userSession, handleLogout }: StudentDashboardProps) {
  const getInitialTab = (): Tab => {
    const parts = window.location.pathname.split('/');
    const tabFromUrl = parts[parts.length - 1];
    const validTabs: Tab[] = [
      'overview', 'academics', 'education', 'projects', 'certifications', 
      'internships', 'skills', 'research', 'events', 'courses', 
      'notifications', 'messages', 'settings', 'escalation', 'broadcasts'
    ];
    if (validTabs.includes(tabFromUrl as Tab)) {
      return tabFromUrl as Tab;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());

  // Whenever activeTab changes, update history URL and title
  useEffect(() => {
    let tabLabel = '';
    switch (activeTab) {
      case 'overview': tabLabel = 'Dashboard'; break;
      case 'academics': tabLabel = 'Grades'; break;
      case 'projects': tabLabel = 'Portfolio'; break;
      case 'education': tabLabel = 'Education'; break;
      case 'skills': tabLabel = 'Skills'; break;
      case 'certifications': tabLabel = 'Certifications'; break;
      case 'internships': tabLabel = 'Internships'; break;
      case 'research': tabLabel = 'Research'; break;
      case 'events': tabLabel = 'Events'; break;
      case 'courses': tabLabel = 'Courses'; break;
      case 'notifications': tabLabel = 'Alerts'; break;
      case 'messages': tabLabel = 'Messages'; break;
      case 'settings': tabLabel = 'Settings'; break;
      case 'escalation': tabLabel = 'Intervention Room'; break;
      case 'broadcasts': tabLabel = 'Broadcasts'; break;
      default: {
        const tabStr = activeTab as string;
        tabLabel = tabStr.charAt(0).toUpperCase() + tabStr.slice(1);
      }
    }
    
    document.title = `${tabLabel} | Student Dashboard | CIET ERP`;
    
    const newPath = activeTab === 'overview' ? '/student-dashboard' : `/student-dashboard/${activeTab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [activeTab]);

  // Sync activeTab when the back/forward button is clicked
  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split('/');
      const tabFromUrl = parts[parts.length - 1];
      const validTabs: Tab[] = [
        'overview', 'academics', 'education', 'projects', 'certifications', 
        'internships', 'skills', 'research', 'events', 'courses', 
        'notifications', 'messages', 'settings', 'escalation', 'broadcasts'
      ];
      if (validTabs.includes(tabFromUrl as Tab)) {
        setActiveTab(tabFromUrl as Tab);
      } else {
        setActiveTab('overview');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCrudModal, setActiveCrudModal] = useState<string | null>(null);
  const [crudMode, setCrudMode] = useState<'create' | 'edit'>('create');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const escalationChatContainerRef = useRef<HTMLDivElement | null>(null);

  // Intervention / Escalation states
  const [studentEscalations, setStudentEscalations] = useState<any[]>([]);
  const [escalationInput, setEscalationInput] = useState('');
  const [sendingEscalationMsg, setSendingEscalationMsg] = useState(false);

  useEffect(() => {
    const mainEl = document.querySelector('.ds-main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (escalationChatContainerRef.current) {
      escalationChatContainerRef.current.scrollTop = escalationChatContainerRef.current.scrollHeight;
    }
  }, [studentEscalations]);


  const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || (import.meta.env.DEV ? '' : 'https://ciet-erp.onrender.com');

  const [linkCopied, setLinkCopied] = useState(false);
  const copyPortfolioLink = (slug: string) => {
    const url = `${APP_ORIGIN}/portfolio/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };

      const [dashRes, annRes, trRes, escRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/portal/student/dashboard`, { credentials: 'include', headers }),
        fetch(`${API_BASE_URL}/api/v1/portal/student/announcements`, { credentials: 'include', headers }),
        fetch(`${API_BASE_URL}/api/v1/portal/student/trainings`, { credentials: 'include', headers }),
        fetch(`${API_BASE_URL}/api/v1/portal/student/escalations`, { credentials: 'include', headers })
      ]);


      if (!dashRes.ok) throw new Error('Failed to load dashboard.');
      setDashboardData(await dashRes.json());

      if (annRes.ok) setAnnouncements(await annRes.json());
      if (trRes.ok) setTrainings(await trRes.json());
      if (escRes.ok) setStudentEscalations(await escRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendStudentEscalationMessage = async (e: React.FormEvent, threadId: string) => {
    e.preventDefault();
    if (!escalationInput.trim()) return;
    try {
      setSendingEscalationMsg(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/escalations/${threadId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({ content: escalationInput })
      });
      if (!res.ok) throw new Error('Failed to send message.');
      setEscalationInput('');
      
      // Refresh escalations list
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };
      const escRes = await fetch(`${API_BASE_URL}/api/v1/portal/student/escalations`, { headers });
      if (escRes.ok) setStudentEscalations(await escRes.json());
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingEscalationMsg(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent, tabType: string) => {
    e.preventDefault();
    const url = crudMode === 'create' ? `${API_BASE_URL}/api/v1/portal/student/${tabType}` : `${API_BASE_URL}/api/v1/portal/student/${tabType}/${selectedItemId}`;
    try {
      const res = await fetch(url, { credentials: 'include',  method: crudMode === 'create' ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userSession.accessToken}` }, body: JSON.stringify(formData) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      setActiveCrudModal(null); setFormData({}); fetchDashboardData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteItem = async (tabType: string, id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/${tabType}/${id}`, { credentials: 'include',  method: 'DELETE', headers: { 'Authorization': `Bearer ${userSession.accessToken}` } });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      fetchDashboardData();
    } catch (err: any) { alert(err.message); }
  };

  const openCreateModal = (tabType: string) => {
    setCrudMode('create');
    setSelectedItemId(null);
    if (tabType === 'education') {
      setFormData({ scoreType: 'Percentage', eduType: '' });
    } else if (tabType === 'skills') {
      setFormData({ category: '' });
    } else if (tabType === 'projects') {
      setFormData({ projectType: 'personal', isGroup: false });
    } else if (tabType === 'certifications') {
      setFormData({ certType: 'Technical' });
    } else if (tabType === 'internships') {
      setFormData({ internshipType: 'Online' });
    } else if (tabType === 'research') {
      setFormData({ outcome: 'Paper' });
    } else if (tabType === 'events') {
      setFormData({ role: 'Participant', scope: 'College' });
    } else if (tabType === 'courses') {
      setFormData({ source: 'NPTEL' });
    } else {
      setFormData({});
    }
    setActiveCrudModal(tabType);
  };

  const openEditModal = (tabType: string, item: any) => {
    setCrudMode('edit');
    setSelectedItemId(item.id);
    const data = { ...item };
    if (tabType === 'education' && !data.scoreType) {
      data.scoreType = 'Percentage';
    }
    setFormData(data);
    setActiveCrudModal(tabType);
  };

  const fetchNotifications = async () => {
    try { setNotifLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/notifications`, { credentials: 'include',  headers: { 'Authorization': `Bearer ${userSession.accessToken}` } });
      if (res.ok) setNotifications(await res.json());
    } catch {} finally { setNotifLoading(false); }
  };

  const markNotificationsAsRead = async () => {
    try { await fetch(`${API_BASE_URL}/api/v1/portal/student/notifications/read`, { credentials: 'include',  method: 'POST', headers: { 'Authorization': `Bearer ${userSession.accessToken}` } }); setNotifications(p => p.map(n => ({ ...n, read: true }))); } catch {}
  };
  const fetchMessages = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };
      
      const contactsRes = await fetch(`${API_BASE_URL}/api/v1/portal/student/messaging-contacts`, { headers });
      let loadedContacts: any[] = [];
      if (contactsRes.ok) {
        loadedContacts = await contactsRes.json();
        setContacts(loadedContacts);
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/messages`, { headers });
      if (res.ok) {
        const msgs = await res.json();
        setMessages(msgs);
        
        // Auto-select first contact if none is selected
        if (loadedContacts.length > 0) {
          setSelectedContact((prev: any) => {
            if (prev) {
              const stillExists = loadedContacts.find(c => c.userId === prev.userId);
              return stillExists || loadedContacts[0];
            }
            return loadedContacts[0];
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages or contacts", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim() || !selectedContact) return;
    const text = msgInput;
    setMsgInput('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({
          messageText: text,
          recipientId: selectedContact.userId
        })
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch {
      setMsgInput(text);
    }
  };
  useEffect(() => { fetchDashboardData(); fetchNotifications(); const iv = setInterval(fetchNotifications, 60000); return () => clearInterval(iv); }, []);
  useEffect(() => { if (activeTab === 'notifications') markNotificationsAsRead(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'messages') fetchMessages(); }, [activeTab]);

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  // ─── Loading ───
  if (loading) {
    return (
      <div className="ds-loader">
        <div className="ds-loader-ring" />
        <p className="ds-loader-text">Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ds-loader">
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
        <p style={{ color: 'var(--ds-red)', fontWeight: 600, marginBottom: '16px' }}>{error}</p>
        <button className="ds-btn ds-btn-primary" onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  const profile = dashboardData?.profile;
  const user = dashboardData?.user;

  // ─── Render ───
  return (
    <div className="ds-root">

      {/* ── BACKGROUND LAYER ── */}
      <div className="ds-bg-layer" aria-hidden="true">
        <div className="ds-grid-texture" />
      </div>

      {/* ── TOPBAR ── */}
      <header className="ds-topbar">
        <div className="ds-topbar-left">
          <LogoHeader imageStyle={{ height: '32px' }} />
          <span className="ds-logo-sep" />
          <span className="ds-logo-sub">Student Dashboard</span>
        </div>
        <div className="ds-topbar-right">
          <div className="ds-session-pill">
            <span className="ds-led" />
            Active
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button id="ds-notif-btn" className="ds-icon-btn" onClick={() => { setShowNotifDropdown(v => !v); if (!showNotifDropdown) fetchNotifications(); }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount > 0 && <span className="ds-notif-dot" />}
            </button>
            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div className="ds-notif-dropdown" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.15 }}>
                  <div className="ds-notif-head">
                    <span>Notifications</span>
                    <button onClick={() => { setActiveTab('notifications'); setShowNotifDropdown(false); }}>View All</button>
                  </div>
                  {notifLoading ? <div className="ds-notif-empty">Loading…</div>
                    : notifications.length === 0 ? <div className="ds-notif-empty">No notifications yet.</div>
                    : <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {notifications.slice(0, 6).map((n: any, i: number) => (
                          <div key={i} className={`ds-notif-item ${!n.read ? 'unread' : ''}`}>
                            <div className="ds-notif-item-title">{n.title || 'Notification'}</div>
                            <div className="ds-notif-item-msg">{n.message}</div>
                            <div className="ds-notif-item-time">{n.createdAt}</div>
                          </div>
                        ))}
                      </div>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <div className="ds-avatar-chip">
            <div className="ds-avatar">
              {profile?.photoUrl
                ? <img src={profile.photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : (userSession.fullName?.slice(0, 1)?.toUpperCase() || userSession.email.slice(0, 1).toUpperCase())}
            </div>
            <div className="ds-avatar-info">
              <div className="ds-avatar-name">{userSession.fullName || 'Student'}</div>
              <div className="ds-avatar-sub">{profile?.rollNo || 'Student'}</div>
            </div>
          </div>

          <button id="ds-signout-btn" className="ds-btn ds-btn-ghost ds-signout" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* ── LAYOUT BODY ── */}
      <div className="ds-body">

        {/* ── SIDEBAR (desktop) ── */}
        <aside className="ds-sidebar">
          <nav className="ds-nav">
            {NAV_ITEMS.map((item) => (
              <React.Fragment key={item.key}>
                {item.section && <div className="ds-nav-section">{item.section}</div>}
                <button
                  className={`ds-nav-item ${activeTab === item.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.key)}
                >
                  <span className="ds-nav-icon">{item.icon}</span>
                  <span className="ds-nav-label">{item.label}</span>
                  {item.key === 'notifications' && unreadCount > 0 && (
                    <span className="ds-nav-badge">{unreadCount}</span>
                  )}
                </button>
              </React.Fragment>
            ))}
          </nav>

          <div className="ds-sidebar-footer">
            <div className="ds-mini-avatar">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                userSession.fullName?.slice(0, 1)?.toUpperCase() || 'S'
              )}
            </div>
            <div>
              <div className="ds-mini-name">{userSession.fullName || 'Student'}</div>
              <div className="ds-mini-roll">{profile?.rollNo || 'Roll No'}</div>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="ds-main">
          {/* Mobile sub-tab bar for Portfolio */}
          {['projects', 'education', 'certifications', 'internships', 'skills', 'research', 'events', 'courses'].includes(activeTab) && (
            <div className="ds-mobile-subnav">
              {[
                { key: 'projects' as Tab, label: 'Projects' },
                { key: 'education' as Tab, label: 'Education' },
                { key: 'skills' as Tab, label: 'Skills' },
                { key: 'certifications' as Tab, label: 'Certificates' },
                { key: 'internships' as Tab, label: 'Internships' },
                { key: 'research' as Tab, label: 'Research' },
                { key: 'events' as Tab, label: 'Events' },
                { key: 'courses' as Tab, label: 'Courses' },
              ].map(sub => (
                <button
                  key={sub.key}
                  className={`ds-mobile-subnav-item ${activeTab === sub.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(sub.key)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Mobile sub-tab bar for Profile/Settings */}
          {['settings', 'messages'].includes(activeTab) && (
            <div className="ds-mobile-subnav">
              {[
                { key: 'settings' as Tab, label: 'Settings' },
                { key: 'messages' as Tab, label: 'Messages' },
              ].map(sub => (
                <button
                  key={sub.key}
                  className={`ds-mobile-subnav-item ${activeTab === sub.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(sub.key)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="ds-page"
            >

              {/* ══════════════════════════════════════════
                  OVERVIEW TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'overview' && (() => {
                const education = dashboardData?.education || [];
                const certifications = dashboardData?.certifications || [];
                const projects = dashboardData?.projects || [];
                const internships = dashboardData?.internships || [];
                const events = dashboardData?.events || [];
                const courses = dashboardData?.courses || [];
                const research = dashboardData?.research || [];

                return (
                  <div className="ds-overview">

                    {/* HERO CARD */}
                    <motion.div className="ds-card ds-hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                      <div className="ds-hero-avatar-wrap">
                        <div className="ds-hero-avatar">
                          {profile?.photoUrl
                            ? <img src={profile.photoUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                            : (user?.fullName?.slice(0, 1)?.toUpperCase() || 'S')}
                        </div>
                      </div>
                      <div className="ds-hero-info">
                        <div className="ds-hero-tag">Active Scholar · {profile?.departmentId || 'Department'}</div>
                        <div className="ds-hero-name-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <h1 className="ds-hero-name" style={{ margin: 0 }}>{user?.fullName || 'Student'}</h1>
                          {profile?.isPublic && (profile?.slug || profile?.rollNo) && (
                            <button
                              type="button"
                              onClick={() => copyPortfolioLink(profile.slug || profile.rollNo)}
                              className="ds-portfolio-chip"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '99px',
                                background: linkCopied ? 'hsl(0, 75%, 45%)' : 'var(--ds-jade)',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11.5px',
                                fontStyle: 'normal',
                                fontWeight: 700,
                                transition: 'all 0.15s ease',
                                boxShadow: '0 2px 8px var(--ds-jade-glow)'
                              }}
                              title={`${APP_ORIGIN}/portfolio/${profile.slug || profile.rollNo}`}
                            >
                              {linkCopied ? (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
                              ) : (
                                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Portfolio</>
                              )}
                            </button>
                          )}
                        </div>
                        <p className="ds-hero-meta">
                          <span className="ds-mono">{profile?.rollNo}</span> · {profile?.batch || 'Batch'} · {profile?.sectionId || ''}
                        </p>
                        {profile?.profileSummary && (
                          <p className="ds-hero-bio">{profile.profileSummary}</p>
                        )}
                        <div className="ds-hero-links">
                          {profile?.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">LinkedIn</a>}
                          {profile?.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">GitHub</a>}
                          {profile?.leetcodeUrl && <a href={profile.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">LeetCode</a>}
                          {profile?.hackerrankUrl && <a href={profile.hackerrankUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">HackerRank</a>}
                          {profile?.codechefUrl && <a href={profile.codechefUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">CodeChef</a>}
                          {profile?.spokenTutorialUrl && <a href={profile.spokenTutorialUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">Spoken Tutorial</a>}
                          {profile?.prepinstaUrl && <a href={profile.prepinstaUrl} target="_blank" rel="noopener noreferrer" className="ds-social-link">PrepInsta</a>}
                        </div>
                      </div>
                      <div className="ds-hero-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', flexShrink: 0, marginLeft: 'auto', minWidth: '126px' }}>
                        {profile?.resumeUrl && (
                          <a
                            href={profile.resumeUrl.startsWith('http') || profile.resumeUrl.startsWith('data:') ? profile.resumeUrl : `https://${profile.resumeUrl}`}
                            target="_blank" rel="noopener noreferrer"
                            className="ds-resume-btn"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '8px 14px',
                              borderRadius: '10px',
                              background: 'var(--ds-surface2)',
                              color: 'var(--ds-text1)',
                              border: '1px solid var(--ds-border)',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                            View Resume
                          </a>
                        )}
                        {/* Ring Form CGPA Indicator */}
                        <div className="ds-cgpa-ring-card" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '14px 18px',
                          background: 'var(--ds-surface2)',
                          border: '1px solid var(--ds-border)',
                          borderRadius: '16px',
                          minWidth: '120px'
                        }}>
                          <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx="32" cy="32" r="25" stroke="var(--ds-border)" strokeWidth="4.5" fill="none" />
                              <circle
                                cx="32" cy="32" r="25"
                                stroke="var(--ds-jade)"
                                strokeWidth="4.5"
                                fill="none"
                                strokeDasharray={157.08}
                                strokeDashoffset={157.08 * (1 - Math.min(Math.max((profile?.cgpa || 0) / 10, 0), 1))}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                              />
                            </svg>
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              textAlign: 'center'
                            }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'var(--ds-font-mono)', color: 'var(--ds-text1)', lineHeight: 1 }}>
                                {profile?.cgpa ? profile.cgpa.toFixed(2) : '—'}
                              </span>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--ds-text3)', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' }}>CGPA</span>
                            </div>
                          </div>
                          <button
                            className="ds-btn ds-btn-ghost"
                            style={{ fontSize: '10.5px', padding: '4px 10px', marginTop: '10px', width: '100%', borderRadius: '6px', whiteSpace: 'nowrap' }}
                            onClick={() => setActiveTab('academics')}
                          >
                            Transcript →
                          </button>
                        </div>
                      </div>
                    </motion.div>

                    {/* METRICS ROW */}
                    <div className="ds-metrics">
                      {[
                        { 
                          label: 'Projects', 
                          value: projects.length, 
                          sub: projects.length === 0 
                            ? 'Build projects to showcase skills.' 
                            : `${projects.filter((p: any) => p.projectType === 'college').length} College · ${projects.filter((p: any) => p.projectType !== 'college').length} Personal` 
                        },
                        { 
                          label: 'Certificates', 
                          value: certifications.length, 
                          sub: certifications.length === 0 
                            ? 'Earn credentials to stand out.' 
                            : `${certifications.filter((c: any) => c.isFeatured).length} Featured · ${certifications.length - certifications.filter((c: any) => c.isFeatured).length} General` 
                        },
                        { 
                          label: 'Internships', 
                          value: internships.length, 
                          sub: internships.length === 0 
                            ? 'Gain industry exposure.' 
                            : `${internships.filter((i: any) => i.internshipType === 'Online').length} Remote · ${internships.filter((i: any) => i.internshipType !== 'Online').length} Office` 
                        },
                        { 
                          label: 'Activities', 
                          value: courses.length + events.length, 
                          sub: (courses.length + events.length) === 0 
                            ? 'Join extra-curricular courses.' 
                            : `${courses.length} Courses · ${events.length} Events` 
                        },
                      ].map((m, i) => (
                        <motion.div
                          key={m.label}
                          className="ds-metric-chip"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="ds-metric-val ds-mono">
                            {m.value}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
                            <div className="ds-metric-label">
                              {m.label}
                            </div>
                            <div className="ds-metric-sub" title={m.sub}>
                              {m.sub}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* BENTO ROW (Only shows cards with active student data) */}
                    <div className="ds-bento-row">
                      {/* Projects Card */}
                      {projects.length > 0 && (
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.3 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                            <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>
                              PROJECTS
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({projects.length} Total)</span>
                          </div>
                          {(() => {
                            const proj = projects.find((p: any) => p.isFeatured) || projects[0];
                            return (
                              <div className="ds-platform-card connected" style={{ padding: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                <div className="ds-platform-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="ds-platform-name" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{proj.title}</span>
                                    {proj.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '12px' }}>★</span>}
                                  </div>
                                  <span className="ds-badge ds-badge-success" style={{ fontSize: '9px', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    {proj.projectType === 'college' ? 'College' : 'Personal'}
                                  </span>
                                </div>
                                <p className="ds-platform-desc" style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '4px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '34px' }}>
                                  {proj.description || 'No description provided.'}
                                </p>
                                {proj.techStack && (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                    {proj.techStack.split(',').slice(0, 3).map((t: string, i: number) => (
                                      <span key={i} style={{ fontSize: '9.5px', padding: '2px 6px', background: 'var(--ds-surface3)', borderRadius: '4px', color: 'var(--ds-text2)', border: '1px solid var(--ds-border)' }}>{t.trim()}</span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                                  {proj.repoUrl ? (
                                    <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>Repository →</a>
                                  ) : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No link</span>}
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('projects')}>Manage</button>
                                    <button className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 'unset' }} onClick={() => openEditModal('projects', proj)}>Edit</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Skills Card */}
                      {dashboardData?.skills && dashboardData.skills.length > 0 && (() => {
                        const allCats = ['Languages', 'Web Frameworks', 'Tools', 'Others'];
                        const groups: Record<string, string[]> = dashboardData.skills.reduce((acc: any, s: any) => {
                          const cat = s.category || 'Others';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(s.name);
                          return acc;
                        }, {});
                        const activeCats = allCats.filter(c => (groups[c] || []).length > 0);
                        return (
                          <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20, duration: 0.3 }}
                            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                              <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>PROFESSIONAL SKILLS</div>
                              <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({dashboardData.skills.length} Total)</span>
                            </div>
                            {/* Column layout — no colors */}
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${activeCats.length}, 1fr)`, gap: '12px', flex: 1, alignItems: 'start' }}>
                              {activeCats.map(cat => {
                                const names = groups[cat] || [];
                                return (
                                  <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '5px', borderBottom: '1px solid var(--ds-border)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat}</div>
                                    {names.map((name: string, i: number) => (
                                      <span key={i} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text1)', lineHeight: 1.5 }}>{name}</span>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                            {/* Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                              <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('skills')}>Manage</button>
                            </div>
                          </motion.div>
                        );
                      })()}






                      {/* Internships Card */}
                      {internships.length > 0 && (
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.3 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                            <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>
                              INTERNSHIPS
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({internships.length} Total)</span>
                          </div>
                          {(() => {
                            const intern = internships.find((i: any) => i.isFeatured) || internships[0];
                            return (
                              <div className="ds-platform-card connected" style={{ padding: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                <div className="ds-platform-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="ds-platform-name" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{intern.role}</span>
                                    {intern.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '12px' }}>★</span>}
                                  </div>
                                  <span className="ds-badge ds-badge-success" style={{ fontSize: '9px', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    {intern.internshipType || 'Online'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text1)', margin: '2px 0 0' }}>{intern.organization}</div>
                                <p className="ds-platform-desc" style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '2px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '34px' }}>
                                  {intern.description || 'No description provided.'}
                                </p>
                                <div style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontFamily: 'var(--ds-font-mono)', marginBottom: '4px' }}>
                                  {intern.startDate || ''}{intern.endDate ? ` → ${intern.endDate}` : ' → Present'}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                                  {intern.certificateUrl ? (
                                    <a href={intern.certificateUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>Certificate →</a>
                                  ) : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No certificate</span>}
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('internships')}>Manage</button>
                                    <button className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 'unset' }} onClick={() => openEditModal('internships', intern)}>Edit</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Certifications Card */}
                      {certifications.length > 0 && (
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.30, duration: 0.3 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                            <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>
                              CERTIFICATIONS
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({certifications.length} Total)</span>
                          </div>
                          {(() => {
                            const cert = certifications.find((c: any) => c.isFeatured) || certifications[0];
                            return (
                              <div className="ds-platform-card connected" style={{ padding: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                <div className="ds-platform-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="ds-platform-name" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{cert.title}</span>
                                    {cert.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '12px' }}>★</span>}
                                  </div>
                                  <span className="ds-badge ds-badge-success" style={{ fontSize: '9px', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                    {cert.certType || 'Cert'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text1)', margin: '2px 0 0' }}>{cert.issuingOrganization}</div>
                                <p className="ds-platform-desc" style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '2px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '34px' }}>
                                  {cert.description || 'No description provided.'}
                                </p>
                                <div style={{ fontSize: '10.5px', color: 'var(--ds-text3)', marginBottom: '4px' }}>
                                  Issued: {cert.issueDate}{cert.expiryDate ? ` · Expires: ${cert.expiryDate}` : ''}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                                  {cert.certUrl ? (
                                    <a href={cert.certUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>Credential →</a>
                                  ) : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No credential link</span>}
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('certifications')}>Manage</button>
                                    <button className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 'unset' }} onClick={() => openEditModal('certifications', cert)}>Edit</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Research Card */}
                      {research.length > 0 && (
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.3 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                            <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>
                              RESEARCH & PAPERS
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({research.length} Total)</span>
                          </div>
                          {(() => {
                            const resPaper = research.find((r: any) => r.isFeatured) || research[0];
                            return (
                              <div className="ds-platform-card connected" style={{ padding: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                <div className="ds-platform-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="ds-platform-name" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{resPaper.title}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text1)', margin: '2px 0 0' }}>{resPaper.journalConference}</div>
                                <p className="ds-platform-desc" style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '2px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '34px' }}>
                                  {resPaper.description || 'No abstract provided.'}
                                </p>
                                <div style={{ fontSize: '10.5px', color: 'var(--ds-text3)', marginBottom: '4px' }}>
                                  Published: {resPaper.publicationYear}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                                  {resPaper.doi ? (
                                    <a href={resPaper.doi} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>Paper Link →</a>
                                  ) : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No DOI link</span>}
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('research')}>Manage</button>
                                    <button className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 'unset' }} onClick={() => openEditModal('research', resPaper)}>Edit</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Courses Card */}
                      {courses.length > 0 && (
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.3 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                            <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>
                              COURSES
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({courses.length} Total)</span>
                          </div>
                          {(() => {
                            const courseItem = courses[0];
                            return (
                              <div className="ds-platform-card connected" style={{ padding: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                <div className="ds-platform-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="ds-platform-name" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{courseItem.title}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text1)', margin: '2px 0 0' }}>{courseItem.provider}</div>
                                <p className="ds-platform-desc" style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '2px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '34px' }}>
                                  {courseItem.description || 'No description provided.'}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                                  {courseItem.link ? (
                                    <a href={courseItem.link} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>Course Link →</a>
                                  ) : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No course link</span>}
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('courses')}>Manage</button>
                                    <button className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 'unset' }} onClick={() => openEditModal('courses', courseItem)}>Edit</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}

                      {/* Events Card */}
                      {events.length > 0 && (
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.3 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
                            <div className="ds-card-label" style={{ margin: 0, color: 'var(--ds-jade)', fontWeight: 800, letterSpacing: '0.8px', fontSize: '11px' }}>
                              CAMPUS EVENTS
                            </div>
                            <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>({events.length} Total)</span>
                          </div>
                          {(() => {
                            const eventItem = events[0];
                            return (
                              <div className="ds-platform-card connected" style={{ padding: 0, background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                <div className="ds-platform-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span className="ds-platform-name" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ds-text1)' }}>{eventItem.eventName}</span>
                                  </div>
                                </div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text1)', margin: '2px 0 0' }}>Role: {eventItem.role}</div>
                                <p className="ds-platform-desc" style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '2px 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', minHeight: '34px' }}>
                                  {eventItem.description || 'No description provided.'}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--ds-border)', paddingTop: '10px' }}>
                                  {eventItem.certificateUrl ? (
                                    <a href={eventItem.certificateUrl} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>Certificate →</a>
                                  ) : <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>No certificate</span>}
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px', padding: '4px 8px', height: 'auto', minHeight: 'unset' }} onClick={() => setActiveTab('events')}>Manage</button>
                                    <button className="ds-btn ds-btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', height: 'auto', minHeight: 'unset' }} onClick={() => openEditModal('events', eventItem)}>Edit</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}
                    </div>{/* DEVELOPER PLATFORMS */}
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.3 }}>
                      <h2 className="ds-section-title" style={{ marginBottom: '16px' }}>Developer Profiles</h2>
                      <div className="ds-platforms">
                        {[
                          { key: 'leetcodeUrl', label: 'LeetCode', desc: 'Solved problems & coding skills' },
                          { key: 'githubUrl', label: 'GitHub', desc: 'Repositories & open-source contributions' },
                          { key: 'hackerrankUrl', label: 'HackerRank', desc: 'Verified badges & certifications' },
                          { key: 'linkedinUrl', label: 'LinkedIn', desc: 'Professional network & profile' },
                          { key: 'codechefUrl', label: 'CodeChef', desc: 'Competitive programming & ratings' },
                          { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', desc: 'IIT Bombay spoken tutorial certifications' },
                          { key: 'prepinstaUrl', label: 'PrepInsta', desc: 'Placement preparation & coding resources' },
                        ].map((plat) => (
                          <div key={plat.key} className={`ds-platform-card ${profile?.[plat.key] ? 'connected' : ''}`}>
                            <div className="ds-platform-top">
                              <span className="ds-platform-name" style={{ marginLeft: 0 }}>{plat.label}</span>
                              <span className={`ds-badge ${profile?.[plat.key] ? 'ds-badge-success' : 'ds-badge-pending'}`}>
                                {profile?.[plat.key] ? 'Connected' : 'Not Linked'}
                              </span>
                            </div>
                            <p className="ds-platform-desc">{plat.desc}</p>
                            {profile?.[plat.key] && (
                              <div style={{ fontSize: '11px', color: 'var(--ds-text1)', fontWeight: 600, margin: '6px 0 2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '10px' }}>⚡</span>
                                {(() => {
                                  switch (plat.key) {
                                    case 'leetcodeUrl':
                                      const totalLeet = (profile.leetcodeEasySolved || 0) + (profile.leetcodeMediumSolved || 0) + (profile.leetcodeHardSolved || 0);
                                      return `Solved: ${totalLeet} (${profile.leetcodeEasySolved || 0}E · ${profile.leetcodeMediumSolved || 0}M · ${profile.leetcodeHardSolved || 0}H)`;
                                    case 'githubUrl':
                                      return `Repos: ${profile.githubReposCount || 0} · Commits: ${profile.githubCommitsCount || 0}`;
                                    case 'codechefUrl':
                                      return `Rating: ${profile.codechefRating || 0} · Stars: ${profile.codechefStars || '1★'}`;
                                    case 'hackerrankUrl':
                                      return `Badges: ${profile.hackerrankBadges || 0} verified`;
                                    case 'spokenTutorialUrl':
                                      return 'IIT Bombay Spoken Tutorial Synced';
                                    case 'prepinstaUrl':
                                      return 'PrepInsta Prime Profile Synced';
                                    case 'linkedinUrl':
                                      return 'Professional Connection Verified';
                                    default:
                                      return 'Platform Connected';
                                  }
                                })()}
                              </div>
                            )}
                            {profile?.[plat.key]
                              ? <a href={profile[plat.key]} target="_blank" rel="noopener noreferrer" className="ds-link" style={{ fontSize: '12px' }}>View Profile →</a>
                              : <button className="ds-btn ds-btn-ghost" style={{ fontSize: '11px' }} onClick={() => setActiveTab('settings')}>Link Account →</button>}
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Bottom Bento Layout: Education Timeline + Profile Weightage Score */}
                    {education.length > 0 && (
                      <div className="ds-overview-bottom-grid">
                        {/* Left: Timeline */}
                        <motion.div className="ds-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.3 }}>
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

                        {/* Right: Profile Weightage Index */}
                        <motion.div className="ds-card ds-weightage-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48, duration: 0.3 }}>
                          <div className="ds-card-label">Profile Weightage & Strength Index</div>
                          
                          {(() => {
                            const cgpaVal = profile?.cgpa || 0;
                            const cgpaScore = (cgpaVal / 10) * 40;
                            
                            const projectsCount = projects.length;
                            const projectScore = projectsCount >= 3 ? 25 : projectsCount * 8.33;
                            
                            const internshipsCount = internships.length;
                            const internshipScore = internshipsCount >= 1 ? 15 : 0;
                            
                            const certsCount = certifications.length;
                            const certsScore = certsCount >= 2 ? 20 : certsCount * 10;
                            
                            const totalScoreRaw = cgpaScore + projectScore + internshipScore + certsScore;
                            const totalScore = Math.min(Math.round(totalScoreRaw), 100);
                            
                            let eligibilityLabel = "Placement Eligibility: LOW";
                            let eligibilityDesc = "Build your portfolio to qualify for premium placements.";
                            if (totalScore >= 80) {
                              eligibilityLabel = "Placement Eligibility: HIGH";
                              eligibilityDesc = "Your profile has excellent weightage for engineering campus drives.";
                            } else if (totalScore >= 60) {
                              eligibilityLabel = "Placement Eligibility: MEDIUM";
                              eligibilityDesc = "Good readiness. Add more projects or internships to boost weightage.";
                            }
                            
                            return (
                              <>
                                {/* Readiness Score Card */}
                                <div className="ds-weightage-score-row">
                                  <div className="ds-weightage-ring-wrap">
                                    <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute' }}>
                                      <circle cx="30" cy="30" r="24" fill="none" stroke="var(--ds-border)" strokeWidth="4" />
                                      <circle cx="30" cy="30" r="24" fill="none" stroke="var(--ds-jade)" strokeWidth="4" 
                                        strokeDasharray="150.79" 
                                        strokeDashoffset={150.79 * (1 - totalScore / 100)} 
                                        transform="rotate(-90 30 30)" 
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                    <span className="ds-weightage-ring-score">{totalScore}%</span>
                                  </div>
                                  <div className="ds-weightage-status-info">
                                    <div className="ds-weightage-status-title">{eligibilityLabel}</div>
                                    <div className="ds-weightage-status-desc">{eligibilityDesc}</div>
                                  </div>
                                </div>

                                {/* Breakdown Items */}
                                <div className="ds-weightage-items">
                                  {/* Academics */}
                                  <div className="ds-weightage-item">
                                    <div className="ds-weightage-item-header">
                                      <div className="ds-weightage-item-name">Academic Performance (CGPA)</div>
                                      <div className="ds-weightage-item-val">{cgpaVal > 0 ? `${cgpaVal.toFixed(2)} CGPA (${Math.round(cgpaScore)}% / 40%)` : '—'}</div>
                                    </div>
                                    <div className="ds-weightage-bar-track">
                                      <div className="ds-weightage-bar-fill academics" style={{ width: `${(cgpaVal / 10) * 100}%` }} />
                                    </div>
                                  </div>

                                  {/* Projects */}
                                  <div className="ds-weightage-item">
                                    <div className="ds-weightage-item-header">
                                      <div className="ds-weightage-item-name">Technical Portfolio (Projects)</div>
                                      <div className="ds-weightage-item-val">{projectsCount} Projects ({Math.round(projectScore)}% / 25%)</div>
                                    </div>
                                    <div className="ds-weightage-bar-track">
                                      <div className="ds-weightage-bar-fill projects" style={{ width: `${(projectScore / 25) * 100}%` }} />
                                    </div>
                                  </div>

                                  {/* Internships */}
                                  <div className="ds-weightage-item">
                                    <div className="ds-weightage-item-header">
                                      <div className="ds-weightage-item-name">Industry Exposure (Internships)</div>
                                      <div className="ds-weightage-item-val">{internshipsCount > 0 ? `Verified Experience (${internshipScore}% / 15%)` : '0% / 15%'}</div>
                                    </div>
                                    <div className="ds-weightage-bar-track">
                                      <div className="ds-weightage-bar-fill internships" style={{ width: `${(internshipScore / 15) * 100}%` }} />
                                    </div>
                                  </div>

                                  {/* Certifications */}
                                  <div className="ds-weightage-item">
                                    <div className="ds-weightage-item-header">
                                      <div className="ds-weightage-item-name">Professional Credentials</div>
                                      <div className="ds-weightage-item-val">{certsCount} Certificates ({Math.round(certsScore)}% / 20%)</div>
                                    </div>
                                    <div className="ds-weightage-bar-track">
                                      <div className="ds-weightage-bar-fill credentials" style={{ width: `${(certsScore / 20) * 100}%` }} />
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}         </motion.div>
                      </div>
                    )}

                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  ACADEMICS TAB — SIGNATURE ELEMENT
              ══════════════════════════════════════════ */}
              {activeTab === 'academics' && (() => {
                const results = dashboardData?.results || [];
                const semGroups: { [key: string]: any[] } = {};
                results.forEach((res: any) => { const sem = res.semester || '1'; if (!semGroups[sem]) semGroups[sem] = []; semGroups[sem].push(res); });
                const semKeys = Object.keys(semGroups).sort();
                const semAverages = semKeys.map(sem => ({ semester: sem, avg: Math.round(semGroups[sem].reduce((s, i) => s + (i.score || 0), 0) / semGroups[sem].length) }));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <div>
                      <h2 className="ds-section-title">Transcript & Progress</h2>
                      <p className="ds-section-sub">Official examination scores verified by the Academic Office.</p>
                    </div>

                    {/* SIGNATURE: CGPA RING */}
                    <motion.div className="ds-card ds-academics-hero" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                      <div className="ds-academics-ring-col">
                        <CgpaRings cgpa={profile?.cgpa || 0} />
                        <div className="ds-academics-ring-label">Cumulative Grade Point Average</div>
                      </div>
                      <div className="ds-academics-stats">
                        <div className="ds-stat-block">
                          <div className="ds-stat-val ds-mono">{results.length}</div>
                          <div className="ds-stat-label">Total Subjects</div>
                        </div>
                        <div className="ds-stat-block">
                          <div className="ds-stat-val ds-mono">{semKeys.length}</div>
                          <div className="ds-stat-label">Semesters</div>
                        </div>
                        <div className="ds-stat-block">
                          <div className="ds-stat-val ds-mono">{semAverages.length > 0 ? Math.round(semAverages.reduce((s, i) => s + i.avg, 0) / semAverages.length) : '—'}%</div>
                          <div className="ds-stat-label">Avg Score</div>
                        </div>
                        {/* Semester bar chart */}
                        {semAverages.length > 0 && (
                          <div className="ds-sem-bars">
                            {semAverages.map((s, i) => (
                              <div key={i} className="ds-sem-bar-col">
                                <div className="ds-sem-bar-val">{s.avg}%</div>
                                <div className="ds-sem-bar-track"><motion.div className="ds-sem-bar-fill" initial={{ height: 0 }} animate={{ height: `${s.avg}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} /></div>
                                <div className="ds-sem-bar-label">S{s.semester}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* GRADE TABLES */}
                    {semKeys.length > 0 ? semKeys.map((sem) => (
                      <motion.div key={sem} className="ds-card ds-table-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div className="ds-table-header">
                          <h3 className="ds-table-title">Semester {sem}</h3>
                          <span className="ds-badge ds-badge-success">Verified</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="ds-table">
                            <thead>
                              <tr>
                                <th>Course</th>
                                <th>Internals (40)</th>
                                <th>Externals (60)</th>
                                <th>Total (100)</th>
                                <th>Grade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semGroups[sem].map((res: any, idx: number) => {
                                const internal = Math.round((res.score || 0) * 0.35);
                                const external = Math.round((res.score || 0) * 0.65);
                                return (
                                  <tr key={idx}>
                                    <td>
                                      <div style={{ fontWeight: 700, color: 'var(--ds-text1)' }}>{res.subjectName}</div>
                                      <div className="ds-mono" style={{ fontSize: '10px', color: 'var(--ds-text3)', marginTop: '2px' }}>{res.subjectCode}</div>
                                    </td>
                                    <td className="ds-mono" style={{ textAlign: 'center' }}>{internal}</td>
                                    <td className="ds-mono" style={{ textAlign: 'center' }}>{external}</td>
                                    <td className="ds-mono" style={{ textAlign: 'center', fontWeight: 800, color: 'var(--ds-jade)', fontSize: '14px' }}>{res.score}</td>
                                    <td style={{ textAlign: 'center' }}>
                                      <span className="ds-grade-pill">{res.grade || '—'}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="ds-card" style={{ padding: '48px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--ds-text3)', fontSize: '14px' }}>No marks published by the Academic Office yet.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  EDUCATION TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'education' && (() => {
                const education = dashboardData?.education || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Education History</h2><p className="ds-section-sub">Your academic qualifications and exam history.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('education')}>+ Add Qualification</button>
                    </div>
                    <div className="ds-card ds-table-wrap">
                      <div style={{ overflowX: 'auto' }}>
                        <table className="ds-table">
                          <thead><tr><th>Type</th><th>Institution / Board</th><th>Year</th><th>Score</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                          <tbody>
                            {education.length > 0 ? education.map((edu: any, idx: number) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 800 }}>{edu.eduType}</td>
                                <td><div style={{ fontWeight: 600 }}>{edu.institution || '—'}</div><div style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{edu.boardUniversity}</div></td>
                                <td className="ds-mono" style={{ textAlign: 'center' }}>{edu.yearOfPassing || '—'}</td>
                                <td className="ds-mono" style={{ textAlign: 'center', color: 'var(--ds-jade)' }}>{edu.score} {edu.scoreType}</td>
                                <td style={{ textAlign: 'center' }}><StatusBadge verified={edu.isVerified} rejected={!!edu.rejectionReason} /></td>
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => openEditModal('education', edu)} className="ds-btn ds-btn-ghost" disabled={edu.isVerified} style={{ marginRight: '6px', opacity: edu.isVerified ? 0.4 : 1 }}>Edit</button>
                                  <button onClick={() => handleDeleteItem('education', edu.id)} className="ds-btn ds-btn-ghost" disabled={edu.isVerified} style={{ opacity: edu.isVerified ? 0.4 : 1, color: 'var(--ds-red)' }}>Delete</button>
                                </td>
                              </tr>
                            )) : <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--ds-text3)' }}>No qualifications added yet.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  PROJECTS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'projects' && (() => {
                const projects = dashboardData?.projects || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Projects Portfolio</h2><p className="ds-section-sub">Your engineering achievements and code repositories.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('projects')}>+ Add Project</button>
                    </div>
                    <div className="ds-cards-grid">
                      {projects.length > 0 ? projects.map((proj: any, idx: number) => (
                        <PortfolioCard key={idx} delay={idx * 0.05}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <h3 className="ds-port-title">
                              {proj.title}
                              {proj.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '11px', marginLeft: '6px', verticalAlign: 'middle', fontWeight: 700 }}>★ Featured</span>}
                            </h3>
                            <StatusBadge verified={proj.isVerified} rejected={!!proj.rejectionReason} />
                          </div>
                          <span className="ds-port-org">{proj.projectType === 'college' ? 'College Supervised' : 'External'} · {proj.isGroup ? `${proj.teamSize} Members` : 'Solo'}</span>
                          <p className="ds-port-desc">{proj.description}</p>
                          {proj.techStack && <div className="ds-tags">{proj.techStack.split(',').map((t: string, i: number) => <span key={i} className="ds-tag">{t.trim()}</span>)}</div>}
                          {proj.rejectionReason && <div className="ds-rejection">Feedback: {proj.rejectionReason}</div>}
                          <div className="ds-port-footer">
                            {proj.repoUrl ? <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer" className="ds-link">Repository →</a> : <span />}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('projects', proj)} className="ds-btn ds-btn-ghost" disabled={proj.isVerified} style={{ opacity: proj.isVerified ? 0.4 : 1 }}>Edit</button>
                              <button onClick={() => handleDeleteItem('projects', proj.id)} className="ds-btn ds-btn-ghost" disabled={proj.isVerified} style={{ opacity: proj.isVerified ? 0.4 : 1, color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="📁" text="No projects logged yet." action="+ Deploy Project" onAction={() => openCreateModal('projects')} />}
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  SKILLS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'skills' && (() => {
                const skills = dashboardData?.skills || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div>
                        <h2 className="ds-section-title">Skills &amp; Technologies</h2>
                        <p className="ds-section-sub">Manage your programming languages, frameworks, tools, and technical competencies.</p>
                      </div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('skills')}>+ Add Skill</button>
                    </div>
                    <div className="ds-cards-grid">
                      {skills.length > 0 ? skills.map((s: any, idx: number) => (
                        <PortfolioCard key={s.id || idx} delay={idx * 0.04}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <div className="ds-port-org">{s.category || 'Others'}</div>
                              <h3 className="ds-port-title">{s.name}</h3>
                            </div>
                          </div>
                          <div className="ds-port-footer">
                            <span />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('skills', s)} className="ds-btn ds-btn-ghost">Edit</button>
                              <button onClick={() => handleDeleteItem('skills', s.id)} className="ds-btn ds-btn-ghost" style={{ color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="🧠" text="No skills added yet. Showcase your expertise on your profile!" action="+ Add Skill" onAction={() => openCreateModal('skills')} />}
                    </div>
                  </div>
                );
              })()}


              {/* ══════════════════════════════════════════
                  CERTIFICATIONS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'certifications' && (() => {
                const certifications = dashboardData?.certifications || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Certification Hub</h2><p className="ds-section-sub">Professional credentials, cloud badges, and exam certifications.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('certifications')}>+ Add Certificate</button>
                    </div>
                    <div className="ds-cards-grid">
                      {certifications.length > 0 ? certifications.map((cert: any, idx: number) => (
                        <PortfolioCard key={idx} delay={idx * 0.05}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <div className="ds-port-org">{cert.issuer}</div>
                              <h3 className="ds-port-title">
                                {cert.title}
                                {cert.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '11px', marginLeft: '6px', verticalAlign: 'middle', fontWeight: 700 }}>★ Featured</span>}
                              </h3>
                            </div>
                            <StatusBadge verified={cert.isVerified} rejected={!!cert.rejectionReason} />
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                            <div className="ds-port-date">Issued: {cert.issuedDate}</div>
                            {cert.certType && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: 'rgba(229, 57, 53, 0.14)', color: '#e53935', border: '1px solid rgba(229, 57, 53, 0.28)', letterSpacing: '0.5px' }}>
                                {cert.certType}
                              </span>
                            )}
                          </div>
                          {cert.description && <p className="ds-port-desc">{cert.description}</p>}
                          {cert.rejectionReason && <div className="ds-rejection">Feedback: {cert.rejectionReason}</div>}
                          <div className="ds-port-footer">
                            {cert.certUrl ? <a href={cert.certUrl} target="_blank" rel="noopener noreferrer" className="ds-link">Verification →</a> : <span />}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('certifications', cert)} className="ds-btn ds-btn-ghost" disabled={cert.isVerified} style={{ opacity: cert.isVerified ? 0.4 : 1 }}>Edit</button>
                              <button onClick={() => handleDeleteItem('certifications', cert.id)} className="ds-btn ds-btn-ghost" disabled={cert.isVerified} style={{ opacity: cert.isVerified ? 0.4 : 1, color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="🏅" text="No certificates added yet." action="+ Add Certificate" onAction={() => openCreateModal('certifications')} />}
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  INTERNSHIPS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'internships' && (() => {
                const internships = dashboardData?.internships || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Internships & Experience</h2><p className="ds-section-sub">Industrial training, internships, and work terms.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('internships')}>+ Add Internship</button>
                    </div>
                    <div className="ds-cards-grid">
                      {internships.length > 0 ? internships.map((intern: any, idx: number) => (
                        <PortfolioCard key={idx} delay={idx * 0.05}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <div className="ds-port-org">{intern.organization}</div>
                              <h3 className="ds-port-title">
                                {intern.role}
                                {intern.isFeatured && <span style={{ color: 'var(--ds-amber)', fontSize: '11px', marginLeft: '6px', verticalAlign: 'middle', fontWeight: 700 }}>★ Featured</span>}
                              </h3>
                            </div>
                            <StatusBadge verified={intern.isVerified} rejected={!!intern.rejectionReason} />
                          </div>
                          {intern.internshipType && <span className="ds-badge ds-badge-accent" style={{ marginBottom: '10px', display: 'inline-block' }}>{intern.internshipType}</span>}
                          <div className="ds-port-date ds-mono">{intern.startDate || ''}{intern.endDate ? ` → ${intern.endDate}` : ' → Present'}</div>
                          {intern.description && <p className="ds-port-desc">{intern.description}</p>}
                          {intern.supervisorName && <div className="ds-port-date">Supervisor: {intern.supervisorName}</div>}
                          {intern.rejectionReason && <div className="ds-rejection">Feedback: {intern.rejectionReason}</div>}
                          <div className="ds-port-footer">
                            <span />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('internships', intern)} className="ds-btn ds-btn-ghost" disabled={intern.isVerified} style={{ opacity: intern.isVerified ? 0.4 : 1 }}>Edit</button>
                              <button onClick={() => handleDeleteItem('internships', intern.id)} className="ds-btn ds-btn-ghost" disabled={intern.isVerified} style={{ opacity: intern.isVerified ? 0.4 : 1, color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="💼" text="No internships logged yet." action="+ Add Internship" onAction={() => openCreateModal('internships')} />}
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  RESEARCH TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'research' && (() => {
                const research = dashboardData?.research || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Research Publications</h2><p className="ds-section-sub">Papers, publications, and book chapters.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('research')}>+ Add Publication</button>
                    </div>
                    <div className="ds-cards-grid">
                      {research.length > 0 ? research.map((res: any, idx: number) => (
                        <PortfolioCard key={idx} delay={idx * 0.05}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <div className="ds-port-org">{res.publisher}</div>
                              <h3 className="ds-port-title">{res.title}</h3>
                            </div>
                            <StatusBadge verified={res.isVerified} rejected={!!res.rejectionReason} />
                          </div>
                          <div className="ds-port-date">{res.outcome} · {res.publishedDate}</div>
                          {res.advisorName && <div className="ds-port-date">Advisor: {res.advisorName}</div>}
                          {res.rejectionReason && <div className="ds-rejection">Feedback: {res.rejectionReason}</div>}
                          <div className="ds-port-footer">
                            {res.publicationUrl ? <a href={res.publicationUrl} target="_blank" rel="noopener noreferrer" className="ds-link">Publication →</a> : <span />}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('research', res)} className="ds-btn ds-btn-ghost" disabled={res.isVerified} style={{ opacity: res.isVerified ? 0.4 : 1 }}>Edit</button>
                              <button onClick={() => handleDeleteItem('research', res.id)} className="ds-btn ds-btn-ghost" disabled={res.isVerified} style={{ opacity: res.isVerified ? 0.4 : 1, color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="📄" text="No publications yet." action="+ Add Publication" onAction={() => openCreateModal('research')} />}
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  EVENTS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'events' && (() => {
                const events = dashboardData?.events || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Events & Extracurriculars</h2><p className="ds-section-sub">Competitions, hackathons, and participation records.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('events')}>+ Add Event</button>
                    </div>
                    <div className="ds-cards-grid">
                      {events.length > 0 ? events.map((ev: any, idx: number) => (
                        <PortfolioCard key={idx} delay={idx * 0.05}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <div className="ds-port-org">{ev.organizer}</div>
                              <h3 className="ds-port-title">{ev.name}</h3>
                            </div>
                            <span className="ds-badge ds-badge-accent">{ev.scope} Scope</span>
                          </div>
                          <div className="ds-port-date">Role: {ev.role}{ev.position ? ` (${ev.position})` : ''} · {ev.eventDate}</div>
                          {ev.location && <div className="ds-port-date">{ev.location}</div>}
                          <div className="ds-port-footer">
                            <span />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('events', ev)} className="ds-btn ds-btn-ghost">Edit</button>
                              <button onClick={() => handleDeleteItem('events', ev.id)} className="ds-btn ds-btn-ghost" style={{ color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="🌟" text="No events logged yet." action="+ Add Event" onAction={() => openCreateModal('events')} />}
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  COURSES TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'courses' && (() => {
                const courses = dashboardData?.courses || [];
                return (
                  <div className="ds-tab-section">
                    <div className="ds-tab-header">
                      <div><h2 className="ds-section-title">Additional Courses</h2><p className="ds-section-sub">NPTEL, online courses, and extra academic training.</p></div>
                      <button className="ds-btn ds-btn-primary" onClick={() => openCreateModal('courses')}>+ Log Course</button>
                    </div>
                    <div className="ds-cards-grid">
                      {courses.length > 0 ? courses.map((crs: any, idx: number) => (
                        <PortfolioCard key={idx} delay={idx * 0.05}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <div>
                              <div className="ds-port-org">{crs.platform || 'Platform'}</div>
                              <h3 className="ds-port-title">{crs.title}</h3>
                            </div>
                            <StatusBadge verified={crs.isVerified} rejected={!!crs.rejectionReason} />
                          </div>
                          <div className="ds-port-date">Source: {crs.source}</div>
                          <div style={{ margin: '10px 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ds-text3)', marginBottom: '4px' }}>
                              <span>Completion</span><span className="ds-mono">{crs.completionPercentage}%</span>
                            </div>
                            <div style={{ height: '4px', background: 'var(--ds-border)', borderRadius: '2px', overflow: 'hidden' }}>
                              <motion.div initial={{ width: 0 }} animate={{ width: `${crs.completionPercentage}%` }} transition={{ delay: 0.2 + idx * 0.04, duration: 0.8, ease: [0.16, 1, 0.3, 1] }} style={{ height: '100%', background: 'var(--ds-jade)', borderRadius: '2px' }} />
                            </div>
                          </div>
                          {crs.rejectionReason && <div className="ds-rejection">Feedback: {crs.rejectionReason}</div>}
                          <div className="ds-port-footer">
                            {crs.certificateUrl ? <a href={crs.certificateUrl} target="_blank" rel="noopener noreferrer" className="ds-link">Certificate →</a> : <span />}
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => openEditModal('courses', crs)} className="ds-btn ds-btn-ghost" disabled={crs.isVerified} style={{ opacity: crs.isVerified ? 0.4 : 1 }}>Edit</button>
                              <button onClick={() => handleDeleteItem('courses', crs.id)} className="ds-btn ds-btn-ghost" disabled={crs.isVerified} style={{ opacity: crs.isVerified ? 0.4 : 1, color: 'var(--ds-red)' }}>Delete</button>
                            </div>
                          </div>
                        </PortfolioCard>
                      )) : <EmptyState icon="📚" text="No courses logged yet." action="+ Log Course" onAction={() => openCreateModal('courses')} />}
                    </div>
                  </div>
                );
              })()}

              {/* ══════════════════════════════════════════
                  NOTIFICATIONS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'notifications' && (
                <div className="ds-tab-section" style={{ maxWidth: '800px' }}>
                  <div className="ds-tab-header">
                    <div><h2 className="ds-section-title">Notifications</h2></div>
                    <button className="ds-btn ds-btn-secondary" onClick={fetchNotifications}>Refresh</button>
                  </div>
                  {notifLoading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ds-text3)' }}>Loading…</div>
                    : notifications.length === 0 ? (
                      <div className="ds-card" style={{ padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
                        <h3 style={{ color: 'var(--ds-text1)', fontWeight: 800, marginBottom: '8px' }}>All caught up!</h3>
                        <p style={{ color: 'var(--ds-text3)', fontSize: '13px' }}>No new notifications.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {notifications.map((n: any, i: number) => (
                          <motion.div key={i} className={`ds-card ds-notif-card ${n.read ? '' : 'unread'}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                            <div className="ds-notif-icon">{n.type === 'VERIFICATION' ? '✓' : n.type === 'PLACEMENT' ? '💼' : n.type === 'ACADEMIC' ? '📚' : '🔔'}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <h4 style={{ fontWeight: 800, color: 'var(--ds-text1)', fontSize: '14px', margin: 0 }}>{n.title || 'Notification'}</h4>
                                {!n.read && <span className="ds-badge ds-badge-jade">New</span>}
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: '0 0 4px', lineHeight: 1.5 }}>{n.message}</p>
                              <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>{n.createdAt}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* ══════════════════════════════════════════
                  MESSAGES TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'messages' && (
                <div className="ds-tab-section" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
                  <div className="ds-tab-header" style={{ flexShrink: 0 }}>
                    <div>
                      <h2 className="ds-section-title">Direct Messages</h2>
                      <p className="ds-section-sub">Connect directly with your HOD, Faculty, and Mentors.</p>
                    </div>
                    <button className="ds-btn ds-btn-secondary" onClick={fetchMessages}>Refresh</button>
                  </div>

                  <div style={{
                    display: 'flex',
                    flex: 1,
                    background: 'var(--ds-surface)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    height: '100%'
                  }}>
                    {/* Left: Contacts Sidebar */}
                    <div style={{
                      width: '260px',
                      borderRight: '1px solid var(--ds-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--ds-surface2)',
                      flexShrink: 0
                    }}>
                      <div style={{ padding: '16px', borderBottom: '1px solid var(--ds-border)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          Messaging Contacts
                        </span>
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {contacts.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ds-text3)' }}>
                            No contacts available
                          </div>
                        ) : (
                          contacts.map((c) => {
                            const isSelected = selectedContact?.userId === c.userId;
                            return (
                              <button
                                key={c.userId}
                                onClick={() => setSelectedContact(c)}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px',
                                  padding: '12px',
                                  border: 'none',
                                  borderRadius: '10px',
                                  background: isSelected ? 'var(--ds-jade-sub)' : 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  width: '100%',
                                  transition: 'all 0.2s ease',
                                  borderLeft: isSelected ? '3px solid var(--ds-jade)' : '3px solid transparent'
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: '13.5px', color: isSelected ? 'var(--ds-jade)' : 'var(--ds-text1)' }}>
                                  {c.fullName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: c.role === 'HOD' ? 'rgba(219, 39, 119, 0.1)' : c.role === 'Mentor' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: c.role === 'HOD' ? '#db2777' : c.role === 'Mentor' ? '#3b82f6' : '#d97706',
                                    textTransform: 'uppercase'
                                  }}>
                                    {c.role}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>
                                    {c.email?.split('@')[0]}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Right: Active Chat View */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--ds-surface)' }}>
                      {selectedContact ? (
                        <>
                          {/* Chat Header */}
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ds-text1)' }}>{selectedContact.fullName}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)' }}>{selectedContact.role} &nbsp;|&nbsp; {selectedContact.email}</div>
                            </div>
                          </div>

                          {/* Chat Messages Feed */}
                          <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {messages.filter((msg: any) =>
                              (msg.senderId === selectedContact.userId || msg.recipientId === selectedContact.userId)
                            ).length === 0 ? (
                              <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--ds-text3)' }}>
                                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✉</div>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>No messages in this chat. Start the conversation!</div>
                              </div>
                            ) : (
                              messages.filter((msg: any) =>
                                (msg.senderId === selectedContact.userId || msg.recipientId === selectedContact.userId)
                              ).map((msg: any, idx: number) => {
                                const isOutgoing = msg.senderId !== selectedContact.userId; // outgoing means sent by student
                                return (
                                  <div key={idx} style={{ display: 'flex', justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: isOutgoing ? 'flex-end' : 'flex-start',
                                      maxWidth: '70%',
                                      gap: '3px'
                                    }}>
                                      <div style={{
                                        background: isOutgoing ? 'var(--ds-jade)' : 'var(--ds-surface3)',
                                        color: isOutgoing ? '#fff' : 'var(--ds-text1)',
                                        borderRadius: isOutgoing ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                        padding: '10px 14px',
                                        fontSize: '13px',
                                        lineHeight: '1.45',
                                        border: isOutgoing ? 'none' : '1px solid var(--ds-border)'
                                      }}>
                                        {msg.messageText}
                                      </div>
                                      <span style={{ fontSize: '9.5px', color: 'var(--ds-text3)' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Message Input Form */}
                          <form onSubmit={handleSendMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', gap: '12px', background: 'var(--ds-surface2)' }}>
                            <input
                              type="text"
                              className="ds-input"
                              placeholder={`Message ${selectedContact.fullName}...`}
                              value={msgInput}
                              onChange={e => setMsgInput(e.target.value)}
                              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                            />
                            <button
                              type="submit"
                              className="ds-btn ds-btn-primary"
                              disabled={!msgInput.trim()}
                              style={{ padding: '10px 20px', background: 'var(--ds-jade)', border: 'none', color: '#fff', fontWeight: 700 }}
                            >
                              Send
                            </button>
                          </form>
                        </>
                      ) : (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--ds-text3)' }}>
                          <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
                          <div style={{ fontWeight: 700 }}>Select a contact to start chatting</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  INTERVENTION ROOM TAB (Student View)
              ══════════════════════════════════════════ */}
              {activeTab === 'escalation' && (
                <div className="ds-tab-section">
                  <div className="ds-tab-header">
                    <div>
                      <h2 className="ds-section-title">Intervention Room</h2>
                      <p className="ds-section-sub">Your confidential study-plan review thread with your Mentor, Faculty &amp; HOD.</p>
                    </div>
                  </div>

                  {studentEscalations.length === 0 ? (
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text3)" strokeWidth="1.5" style={{ marginBottom: '16px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <p style={{ color: 'var(--ds-text3)', fontSize: '14px', margin: 0 }}>No active intervention thread for you. If your attendance or grades require review, your Mentor will open a thread here.</p>
                    </div>
                  ) : (
                    studentEscalations.map((item: any) => {
                      const thread = item.thread;
                      const messages: any[] = item.messages || [];
                      const mentor = item.mentor;
                      const faculty = item.faculty;
                      return (
                        <div key={thread?.id} style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 220px)' }}>
                          {/* Thread Header */}
                          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface2)', flexShrink: 0 }}>
                            <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--ds-text1)' }}>Study Plan Review Thread</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text3)' }}>
                              {item.mentors && item.mentors.length > 0 ? (
                                <span>Mentors: {item.mentors.map((m: any) => m.fullName).join(', ')}</span>
                              ) : mentor ? (
                                <span>Mentor: {mentor.fullName}</span>
                              ) : null}
                              &nbsp;|&nbsp;
                              {item.facultyMembers && item.facultyMembers.length > 0 ? (
                                <span>Faculty: {item.facultyMembers.map((f: any) => f.fullName).join(', ')}</span>
                              ) : faculty ? (
                                <span>Faculty: {faculty.fullName}</span>
                              ) : null}
                            </p>
                          </div>

                          {/* Messages */}
                          <div ref={escalationChatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.map((msg: any) => {
                              const isStudent = msg.senderRole === 'Student';
                              const isSystem = msg.senderRole === 'SYSTEM';
                              return (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isSystem ? 'center' : isStudent ? 'flex-end' : 'flex-start', gap: '4px' }}>
                                  {isSystem ? (
                                    <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px dashed rgba(59,130,246,0.3)', borderRadius: '8px', padding: '10px 16px', fontSize: '12px', color: 'var(--ds-text3)', textAlign: 'center', maxWidth: '70%' }}>
                                      {msg.content}
                                    </div>
                                  ) : (
                                    <>
                                      <span style={{ fontSize: '10.5px', color: 'var(--ds-text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {isStudent ? 'You (Student)' : `${msg.senderName} (${msg.senderRole})`}
                                      </span>
                                      <div style={{
                                        background: isStudent ? 'var(--accent)' : 'var(--ds-surface3)',
                                        color: isStudent ? '#fff' : 'var(--ds-text1)',
                                        borderRadius: isStudent ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                        padding: '10px 16px',
                                        fontSize: '13.5px',
                                        lineHeight: '1.5',
                                        maxWidth: '70%',
                                        border: isStudent ? 'none' : '1px solid var(--ds-border)'
                                      }}>
                                        {msg.content}
                                      </div>
                                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ''}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Student Reply Input */}
                          <form onSubmit={e => handleSendStudentEscalationMessage(e, thread?.id)} style={{ padding: '16px 24px', borderTop: '1px solid var(--ds-border)', display: 'flex', gap: '12px', flexShrink: 0, background: 'var(--ds-surface2)' }}>
                            <input
                              type="text"
                              className="ds-input"
                              placeholder="Type your response to your Mentor / Faculty / HOD..."
                              value={escalationInput}
                              onChange={e => setEscalationInput(e.target.value)}
                              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                            />
                            <button type="submit" className="ds-btn ds-btn-primary" style={{ padding: '10px 20px', flexShrink: 0 }} disabled={sendingEscalationMsg || !escalationInput.trim()}>
                              {sendingEscalationMsg ? '...' : 'Send'}
                            </button>
                          </form>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════
                  ANNOUNCEMENTS & TRAININGS TAB (Red Theme)
              ══════════════════════════════════════════ */}
              {activeTab === 'broadcasts' && (
                <div className="ds-tab-section">
                  <div className="ds-tab-header">
                    <div>
                      <h2 className="ds-section-title">Department Broadcast Center</h2>
                      <p className="ds-section-sub">Stay updated with the latest circulars, announcements, and active skill trainings published by your HOD.</p>
                    </div>
                  </div>

                  {announcements.length === 0 && trainings.length === 0 ? (
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ds-text3)" strokeWidth="1.5" style={{ marginBottom: '16px' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      <p style={{ color: 'var(--ds-text3)', fontSize: '14px', margin: 0 }}>No active announcements or training programs in your department currently.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {/* Announcements Panel */}
                      {announcements.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ds-jade)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ds-jade)' }}></span>
                            Recent Published Announcements
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {announcements.map((ann) => (
                              <div key={ann.id} style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-jade-glow)', borderLeft: '4px solid var(--ds-jade)', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ds-text1)' }}>{ann.title}</div>
                                <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: '8px 0 0', lineHeight: '1.5' }}>{ann.content}</p>
                                {ann.resourceUrl && (
                                  <a href={ann.resourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--ds-jade-hi)', textDecoration: 'none', fontWeight: 700, display: 'inline-block', marginTop: '10px' }}>
                                    View Reference Link →
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trainings Panel */}
                      {trainings.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                          <h3 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ds-jade)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--ds-jade)' }}></span>
                            Active Skill Trainings
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {trainings.map((tr) => (
                              <div key={tr.id} style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-jade-glow)', borderLeft: '4px solid var(--ds-jade)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ds-text1)' }}>{tr.title}</div>
                                  <div style={{ fontSize: '12.5px', color: 'var(--ds-text2)' }}>
                                    Venue: <span style={{ fontWeight: 600 }}>{tr.venue || 'TBD'}</span>
                                    {tr.registrationUrl && (
                                      <>
                                        <span style={{ margin: '0 8px', color: 'var(--ds-text3)' }}>|</span>
                                        <a href={tr.registrationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ds-jade)', textDecoration: 'none', fontWeight: 800 }}>
                                          Portal Register ↗
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span style={{ background: 'var(--ds-jade-sub)', color: 'var(--ds-jade)', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {tr.category || 'Technical'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ══════════════════════════════════════════
                  SETTINGS TAB
              ══════════════════════════════════════════ */}
              {activeTab === 'settings' && (
                <SettingsTab profile={dashboardData?.profile || {}} user={dashboardData?.user || {}} userSession={userSession} fetchDashboardData={fetchDashboardData} API_BASE_URL={API_BASE_URL} />
              )}


            </motion.div>
          </AnimatePresence>

          {/* FOOTER */}
          <footer className="ds-footer">
            <div className="ds-footer-brand">
              <LogoHeader imageStyle={{ height: '32px' }} />
              
            </div>
            <div className="ds-footer-links">
              <div>
                <h5 className="ds-footer-col-title">Quick Contacts</h5>
                <ul className="ds-footer-list">
                  <li>📞 0863 - 2524112 / 113</li>
                  <li><a href="mailto:principal@chalapathiengg.ac.in">principal@chalapathiengg.ac.in</a></li>
                </ul>
              </div>
              <div>
                <h5 className="ds-footer-col-title">Address</h5>
                <p className="ds-footer-addr">Chalapathi Nagar, Lam,<br />Guntur District, A.P. – 522 034</p>
              </div>
            </div>
            <div className="ds-footer-bottom">
              <span>© {new Date().getFullYear()} CIET. All Rights Reserved.</span>
              <a href="http://chalapathiengg.ac.in" target="_blank" rel="noopener noreferrer">Official Portal →</a>
            </div>
          </footer>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="ds-bottom-nav">
        {[
          { key: 'overview' as Tab, label: 'Home', active: activeTab === 'overview', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { key: 'academics' as Tab, label: 'Grades', active: activeTab === 'academics', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
          { key: 'projects' as Tab, label: 'Portfolio', active: ['projects', 'education', 'certifications', 'internships', 'research', 'events', 'courses'].includes(activeTab), icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
          { key: 'notifications' as Tab, label: 'Alerts', active: activeTab === 'notifications', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'settings' as Tab, label: 'Profile', active: ['settings', 'messages'].includes(activeTab), icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg> },
        ].map(item => (
          <button key={item.key} className={`ds-bottom-nav-item ${item.active ? 'active' : ''}`} onClick={() => setActiveTab(item.key)}>
            {item.icon}
            <span>{item.label}</span>
            {item.key === 'notifications' && unreadCount > 0 && <span className="ds-bottom-badge">{unreadCount}</span>}
          </button>
        ))}
      </nav>

      {/* CRUD MODAL */}
      <AnimatePresence>
        {activeCrudModal && (
          <motion.div className="ds-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setActiveCrudModal(null); }}>
            <motion.div className="ds-modal" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
              <div className="ds-modal-header">
                <h2 className="ds-modal-title">{crudMode === 'create' ? 'Add' : 'Edit'} {activeCrudModal.charAt(0).toUpperCase() + activeCrudModal.slice(1)}</h2>
                <button className="ds-modal-close" onClick={() => setActiveCrudModal(null)}>×</button>
              </div>
              <form onSubmit={e => handleSaveItem(e, activeCrudModal)} className="ds-modal-body">

                {activeCrudModal === 'education' && (<>
                  <div className="ds-form-group"><label className="ds-label">Education Type</label>
                    <select className="ds-input" required disabled={crudMode === 'edit'} value={formData.eduType || ''} onChange={e => setFormData({ ...formData, eduType: e.target.value })}>
                      <option value="">Select type...</option>
                      <option value="High School">High School (10th)</option>
                      <option value="Higher Secondary">Higher Secondary (12th)</option>
                      <option value="Diploma">Diploma</option>
                      <option value="Undergraduate">Undergraduate (UG)</option>
                      <option value="Postgraduate">Postgraduate (PG)</option>
                    </select>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Institution Name</label><input type="text" className="ds-input" required value={formData.institution || ''} onChange={e => setFormData({ ...formData, institution: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Board / University</label><input type="text" className="ds-input" required value={formData.boardUniversity || ''} onChange={e => setFormData({ ...formData, boardUniversity: e.target.value })} /></div>
                  <div className="ds-form-row">
                    <div className="ds-form-group"><label className="ds-label">Year of Passing</label><input type="number" className="ds-input" required value={formData.yearOfPassing || ''} onChange={e => setFormData({ ...formData, yearOfPassing: e.target.value ? parseInt(e.target.value) : '' })} /></div>
                    <div className="ds-form-group"><label className="ds-label">Score & Type</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input type="text" className="ds-input" required value={formData.score || ''} onChange={e => setFormData({ ...formData, score: e.target.value })} placeholder="e.g. 9.8 or 90%" style={{ flex: 1 }} />
                        <select className="ds-input" required value={formData.scoreType || 'Percentage'} onChange={e => setFormData({ ...formData, scoreType: e.target.value })} style={{ width: '110px' }}>
                          <option value="Percentage">%</option><option value="CGPA">CGPA</option><option value="GPA">GPA</option><option value="Rank">Rank</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>)}

                {activeCrudModal === 'projects' && (<>
                  <div className="ds-form-group"><label className="ds-label">Project Title</label><input type="text" className="ds-input" required value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Description</label><textarea className="ds-input" required rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Tech Stack (comma separated)</label><input type="text" className="ds-input" value={formData.techStack || ''} onChange={e => setFormData({ ...formData, techStack: e.target.value })} placeholder="React, Node.js, MongoDB" /></div>
                  <div className="ds-form-group"><label className="ds-label">Repository URL</label><input type="url" className="ds-input" value={formData.repoUrl || ''} onChange={e => setFormData({ ...formData, repoUrl: e.target.value })} /></div>
                  <div className="ds-form-row">
                    <div className="ds-form-group"><label className="ds-label">Type</label>
                      <select className="ds-input" value={formData.projectType || 'personal'} onChange={e => setFormData({ ...formData, projectType: e.target.value })}>
                        <option value="personal">Personal / External</option><option value="college">College Supervised</option>
                      </select>
                    </div>
                    <div className="ds-form-group"><label className="ds-label">Team</label>
                      <select className="ds-input" value={formData.isGroup ? 'true' : 'false'} onChange={e => setFormData({ ...formData, isGroup: e.target.value === 'true' })}>
                        <option value="false">Solo</option><option value="true">Group</option>
                      </select>
                    </div>
                    {formData.isGroup && <div className="ds-form-group"><label className="ds-label">Team Size</label><input type="number" className="ds-input" value={formData.teamSize || ''} onChange={e => setFormData({ ...formData, teamSize: parseInt(e.target.value) })} /></div>}
                  </div>
                  <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input type="checkbox" id="proj-featured" checked={formData.isFeatured || false} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
                    <label htmlFor="proj-featured" className="ds-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Feature this project on main dashboard</label>
                  </div>
                </>)}

                {activeCrudModal === 'certifications' && (<>
                  <div className="ds-form-group"><label className="ds-label">Certification Title</label><input type="text" className="ds-input" required value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Certificate Type</label>
                    <select className="ds-input" value={formData.certType || 'Technical'} onChange={e => setFormData({ ...formData, certType: e.target.value })}>
                      <option value="Technical">Technical</option>
                      <option value="Soft Skills">Soft Skills</option>
                      <option value="Workshop / Seminar">Workshop / Seminar</option>
                      <option value="Award / Achievement">Award / Achievement</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Issuing Organization</label><input type="text" className="ds-input" required value={formData.issuer || ''} onChange={e => setFormData({ ...formData, issuer: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Issued Date (YYYY-MM-DD)</label><input type="text" className="ds-input" required value={formData.issuedDate || ''} onChange={e => setFormData({ ...formData, issuedDate: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Description</label><textarea className="ds-input" rows={2} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Certificate URL or Upload PDF</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="url" className="ds-input" value={formData.certUrl || ''} onChange={e => setFormData({ ...formData, certUrl: e.target.value })} placeholder="https://..." style={{ flex: 1 }} />
                      <input type="file" accept=".pdf,image/*" className="ds-input" style={{ flex: 1, padding: '4px' }} onChange={async e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          try {
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', file);
                            const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/upload`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${userSession.accessToken}` },
                              body: uploadFormData,
                              credentials: 'include'
                            });
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json();
                            setFormData({ ...formData, certUrl: data.url });
                            alert('Certificate uploaded successfully!');
                          } catch (err) {
                            alert('File upload failed.');
                          }
                        }
                      }} />
                    </div>
                  </div>
                  <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input type="checkbox" id="cert-featured" checked={formData.isFeatured || false} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
                    <label htmlFor="cert-featured" className="ds-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Feature this certificate on main dashboard</label>
                  </div>
                </>)}

                {activeCrudModal === 'internships' && (<>
                  <div className="ds-form-group"><label className="ds-label">Role / Position</label><input type="text" className="ds-input" required value={formData.role || ''} onChange={e => setFormData({ ...formData, role: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Organization</label><input type="text" className="ds-input" required value={formData.organization || ''} onChange={e => setFormData({ ...formData, organization: e.target.value })} /></div>
                  <div className="ds-form-row">
                    <div className="ds-form-group"><label className="ds-label">Start Date</label><input type="date" className="ds-input" value={formData.startDate || ''} onChange={e => setFormData({ ...formData, startDate: e.target.value })} /></div>
                    <div className="ds-form-group"><label className="ds-label">End Date</label><input type="date" className="ds-input" value={formData.endDate || ''} onChange={e => setFormData({ ...formData, endDate: e.target.value })} /></div>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Type</label>
                    <select className="ds-input" value={formData.internshipType || 'Online'} onChange={e => setFormData({ ...formData, internshipType: e.target.value })}>
                      <option value="Online">Online</option><option value="Offline">Offline</option><option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Description</label><textarea className="ds-input" rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Supervisor Name</label><input type="text" className="ds-input" value={formData.supervisorName || ''} onChange={e => setFormData({ ...formData, supervisorName: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Certificate URL</label><input type="url" className="ds-input" value={formData.certificateUrl || ''} onChange={e => setFormData({ ...formData, certificateUrl: e.target.value })} /></div>
                  <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input type="checkbox" id="intern-featured" checked={formData.isFeatured || false} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
                    <label htmlFor="intern-featured" className="ds-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Feature this internship on main dashboard</label>
                  </div>
                </>)}

                {activeCrudModal === 'research' && (<>
                  <div className="ds-form-group"><label className="ds-label">Title</label><input type="text" className="ds-input" required value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Publisher</label><input type="text" className="ds-input" required value={formData.publisher || ''} onChange={e => setFormData({ ...formData, publisher: e.target.value })} /></div>
                  <div className="ds-form-row">
                    <div className="ds-form-group"><label className="ds-label">Outcome</label>
                      <select className="ds-input" value={formData.outcome || 'Paper'} onChange={e => setFormData({ ...formData, outcome: e.target.value })}>
                        <option value="Paper">Research Paper</option><option value="Book Chapter">Book Chapter</option><option value="Patent">Patent</option><option value="Conference">Conference</option>
                      </select>
                    </div>
                    <div className="ds-form-group"><label className="ds-label">Published Date</label><input type="date" className="ds-input" value={formData.publishedDate || ''} onChange={e => setFormData({ ...formData, publishedDate: e.target.value })} /></div>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Advisor Name</label><input type="text" className="ds-input" value={formData.advisorName || ''} onChange={e => setFormData({ ...formData, advisorName: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Description / Abstract</label><textarea className="ds-input" rows={2} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Publication URL or Upload PDF</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="url" className="ds-input" value={formData.publicationUrl || ''} onChange={e => setFormData({ ...formData, publicationUrl: e.target.value })} placeholder="https://..." style={{ flex: 1 }} />
                      <input type="file" accept=".pdf,image/*" className="ds-input" style={{ flex: 1, padding: '4px' }} onChange={async e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          try {
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', file);
                            const res = await fetch(`${API_BASE_URL}/api/v1/portal/student/upload`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${userSession.accessToken}` },
                              body: uploadFormData,
                              credentials: 'include'
                            });
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json();
                            setFormData({ ...formData, publicationUrl: data.url });
                            alert('Publication PDF uploaded successfully!');
                          } catch (err) {
                            alert('File upload failed.');
                          }
                        }
                      }} />
                    </div>
                  </div>
                </>)}

                {activeCrudModal === 'events' && (<>
                  <div className="ds-form-group"><label className="ds-label">Event Name</label><input type="text" className="ds-input" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Organizer</label><input type="text" className="ds-input" required value={formData.organizer || ''} onChange={e => setFormData({ ...formData, organizer: e.target.value })} /></div>
                  <div className="ds-form-row">
                    <div className="ds-form-group"><label className="ds-label">Role</label>
                      <select className="ds-input" value={formData.role || 'Participant'} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                        <option value="Participant">Participant</option><option value="Winner">Winner</option><option value="Runner-up">Runner-up</option><option value="Organizer">Organizer</option><option value="Volunteer">Volunteer</option>
                      </select>
                    </div>
                    <div className="ds-form-group"><label className="ds-label">Scope</label>
                      <select className="ds-input" value={formData.scope || 'College'} onChange={e => setFormData({ ...formData, scope: e.target.value })}>
                        <option value="College">College</option><option value="State">State</option><option value="National">National</option><option value="International">International</option>
                      </select>
                    </div>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Event Date</label><input type="date" className="ds-input" value={formData.eventDate || ''} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Position (if won)</label><input type="text" className="ds-input" value={formData.position || ''} onChange={e => setFormData({ ...formData, position: e.target.value })} placeholder="1st / 2nd / 3rd" /></div>
                  <div className="ds-form-group"><label className="ds-label">Location</label><input type="text" className="ds-input" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} /></div>
                </>)}

                {activeCrudModal === 'courses' && (<>
                  <div className="ds-form-group"><label className="ds-label">Course Title</label><input type="text" className="ds-input" required value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Platform</label><input type="text" className="ds-input" required value={formData.platform || ''} onChange={e => setFormData({ ...formData, platform: e.target.value })} placeholder="e.g. NPTEL, Coursera, Udemy" /></div>
                  <div className="ds-form-group"><label className="ds-label">Source</label>
                    <select className="ds-input" value={formData.source || 'NPTEL'} onChange={e => setFormData({ ...formData, source: e.target.value })}>
                      <option value="NPTEL">NPTEL</option><option value="Coursera">Coursera</option><option value="Udemy">Udemy</option><option value="LinkedIn Learning">LinkedIn Learning</option><option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="ds-form-group"><label className="ds-label">Completion %</label><input type="number" min="0" max="100" className="ds-input" value={formData.completionPercentage || ''} onChange={e => setFormData({ ...formData, completionPercentage: parseInt(e.target.value) })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Course Description</label><textarea className="ds-input" rows={2} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                  <div className="ds-form-group"><label className="ds-label">Certificate URL or Upload PDF</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="url" className="ds-input" value={formData.certificateUrl || ''} onChange={e => setFormData({ ...formData, certificateUrl: e.target.value })} placeholder="https://..." style={{ flex: 1 }} />
                      <input type="file" accept=".pdf,image/*" className="ds-input" style={{ flex: 1, padding: '4px' }} onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData({ ...formData, certificateUrl: URL.createObjectURL(e.target.files[0]) });
                        }
                      }} />
                    </div>
                  </div>
                  <div className="ds-form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input type="checkbox" id="course-featured" checked={formData.isFeatured || false} onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })} style={{ width: 'auto', margin: 0 }} />
                    <label htmlFor="course-featured" className="ds-label" style={{ margin: 0, cursor: 'pointer', fontWeight: 600 }}>Feature this course on main dashboard</label>
                  </div>
                </>)}

                {activeCrudModal === 'skills' && (<>
                  <div className="ds-form-group"><label className="ds-label">Skill Name</label><input type="text" className="ds-input" required value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. React.js, Python, Figma" /></div>
                  <div className="ds-form-group"><label className="ds-label">Category</label>
                    <select className="ds-input" required value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">Select category...</option>
                      <option value="Languages">Languages</option>
                      <option value="Web Frameworks">Web Frameworks</option>
                      <option value="Tools">Tools</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </>)}

                <div className="ds-modal-footer">
                  <button type="button" className="ds-btn ds-btn-ghost" onClick={() => setActiveCrudModal(null)}>Cancel</button>
                  <button type="submit" className="ds-btn ds-btn-primary">{crudMode === 'create' ? 'Save' : 'Update'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}


