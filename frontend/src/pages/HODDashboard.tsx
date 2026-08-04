import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LogoHeader from '../components/LogoHeader';
import { EscalationsGroupChat } from '../components/EscalationsGroupChat';

// ── Helpers ──────────────────────────────────────────────────────────────────
// Use relative path — Vite proxy forwards /api → http://localhost:8080
const API = '/api/v1';

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserSession {
  role: string;
  email: string;
  fullName?: string;
  accessToken: string;
}

interface HODDashboardProps {
  userSession: UserSession;
  handleLogout: () => void;
}

interface User { id: string; fullName?: string; email: string; role: string; }


interface TrainingProgram {
  id: string; title: string; description: string; startDate: string;
  endDate: string; venue: string; registrationUrl: string;
  isActive: boolean; category: string; targetYears: string[];
}

const asArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.records)) return value.records;
  return [];
};

const TABS = [
  { id: 'directory',    label: 'Directory' },
  { id: 'mentorship',   label: 'Mentorship' },
  { id: 'documents',   label: 'Documents' },
  { id: 'broadcasts',  label: 'Broadcasts' },
  { id: 'escalations', label: 'Escalations' },
  { id: 'analytics',   label: 'Analytics' },
  { id: 'at-risk',     label: 'At-Risk' },
  { id: 'attainment',  label: 'Attainment' },
  { id: 'trainings',   label: 'Trainings' },
];

// ── Sections Configuration (Dynamic Loader/Saver) ─────────────────────────────
const DEFAULT_SECTIONS = ['A', 'B', 'C', 'D'];
const getSavedSections = (): string[] => {
  try {
    const saved = localStorage.getItem('ciet_erp_sections');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : DEFAULT_SECTIONS;
    }
  } catch (e) {
    console.error('Failed to parse sections', e);
  }
  return DEFAULT_SECTIONS;
};

const saveSectionsList = (sections: string[]) => {
  localStorage.setItem('ciet_erp_sections', JSON.stringify(sections));
  // Dispatch custom event to notify other components to refresh
  window.dispatchEvent(new Event('sections_updated'));
};

// ── Small reusable label chip ─────────────────────────────────────────────────
const Chip: React.FC<{ label: string; color?: string }> = ({ label, color = 'var(--accent)' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    color: color, whiteSpace: 'nowrap', letterSpacing: '.3px'
  }}>{label}</span>
);

// ═══════════════════════════════════════════════════════════
// Directory Tab
// ═══════════════════════════════════════════════════════════
const DirectoryTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 };
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState<string[]>(getSavedSections());

  useEffect(() => {
    const handleUpdate = () => setSections(getSavedSections());
    window.addEventListener('sections_updated', handleUpdate);
    return () => window.removeEventListener('sections_updated', handleUpdate);
  }, []);

  useEffect(() => { fetchDirectory(); }, [yearFilter, sectionFilter]);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (yearFilter !== 'ALL') params.append('year', yearFilter);
      if (sectionFilter !== 'ALL') params.append('sectionId', sectionFilter);
      const res = await axios.get(`${API}/portal/directory?${params}`, h);
      const payload = asArray(res.data);
      setUsers(payload);
    } catch (e: any) {
      console.error('[Directory] fetch error:', e?.response?.status, e?.message);
      setError(e?.response?.status === 500 ? 'Server error. Please restart the backend.' : 'Could not load directory. Is the backend running?');
      setUsers([]);
    }
    finally { setLoading(false); }
  };

  const filtered = users.filter((u: any) => {
    const roleOk = roleFilter === 'ALL' || u.role === roleFilter;
    const searchOk = !search ||
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.rollNo || '').toLowerCase().includes(search.toLowerCase());
    return roleOk && searchOk;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="toolbar-row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <input
          className="search-input"
          style={{ flex: '1 1 180px', paddingLeft: 14 }}
          placeholder="Search name, email, roll no…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="ALL">All Roles</option>
          <option value="Faculty">Faculty</option>
          <option value="Student">Student</option>
          <option value="Mentor">Mentor</option>
        </select>
        {(roleFilter === 'ALL' || roleFilter === 'Student') && (<>
          <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="ALL">All Years</option>
            {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
          <select className="filter-select" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
            <option value="ALL">All Sections</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </>)}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', alignSelf: 'center' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Year · Sec · Dept</th>
              <th style={{ minWidth: 110 }}>Portfolio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#e53e3e' }}>
                ⚠️ {error} <button onClick={fetchDirectory} style={{ marginLeft: 12, padding: '4px 12px', borderRadius: 6, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No users found.</td></tr>
            ) : filtered.map((u: any) => (

              <tr key={u.id}>
                {/* Name + roll no */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.fullName || '—'}</span>
                    {u.rollNo && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{u.rollNo}</span>
                    )}
                  </div>
                </td>
                {/* Email */}
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
                {/* Role */}
                <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
                {/* Year · Sec · Dept chips */}
                <td>
                  {u.role === 'Student' ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {u.year        && <Chip label={`Y${u.year}`}                    color="hsl(217,91%,60%)" />}
                      {u.sectionId   && <Chip label={`Sec ${u.sectionId}`}            color="hsl(270,60%,65%)" />}
                      {u.departmentId && <Chip label={u.departmentId.toUpperCase()}  color="hsl(160,60%,45%)" />}
                      {u.batch       && <Chip label={u.batch}                        color="hsl(30,80%,55%)"  />}
                      {u.cgpa != null && (
                        <Chip
                          label={`CGPA ${Number(u.cgpa).toFixed(1)}`}
                          color={Number(u.cgpa) < 6 ? 'hsl(0,80%,60%)' : 'hsl(140,60%,45%)'}
                        />
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                  )}
                </td>
                {/* Portfolio */}
                <td>
                  {u.role === 'Student' && (u.slug || u.rollNo) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      <a
                        href={`/portfolio/${u.slug || u.rollNo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-row-action"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontSize: 12, padding: '4px 8px' }}
                      >
                        Portfolio
                      </a>
                      {u.isPublic === false && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          🔒 Private
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Mentorship Tab
// ═══════════════════════════════════════════════════════════
const MentorshipTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 };
  const [mentors, setMentors] = useState<User[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [totalStudentCount, setTotalStudentCount] = useState(0);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<string[]>(getSavedSections());

  // Modal state for editing/changing mentor
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  useEffect(() => {
    const handleUpdate = () => setSections(getSavedSections());
    window.addEventListener('sections_updated', handleUpdate);
    return () => window.removeEventListener('sections_updated', handleUpdate);
  }, []);
  const [editMentorId, setEditMentorId] = useState('');
  const [editStudentRollNo, setEditStudentRollNo] = useState('');
  const [expandedMentors, setExpandedMentors] = useState<Set<string>>(new Set());

  useEffect(() => { fetchData(); }, [yearFilter, sectionFilter]);

  const fetchData = async () => {
    setLoading(true);

    // 1. Fetch mentors/faculty — independent block
    try {
      const facRes = await axios.get(`${API}/hod/all-faculty`, h);
      console.log('[HOD] Faculty/Mentors:', facRes.data?.length);
      setMentors(facRes.data || []);
    } catch (e: any) {
      console.error('[HOD] faculty error:', e?.response?.status, e?.message);
    }

    // 2. Fetch assignments — independent block, 500 won't crash students
    let activeAssignments: any[] = [];
    try {
      const assignRes = await axios.get(`${API}/hod/mentor/assignments`, h);
      activeAssignments = assignRes.data || [];
      console.log('[HOD] Assignments:', activeAssignments.length);
      setAssignments(activeAssignments);
    } catch (e: any) {
      console.error('[HOD] assignments error:', e?.response?.status, e?.message);
      setAssignments([]);
    }

    // 3. Fetch students — independent block
    try {
      const params = new URLSearchParams();
      if (yearFilter !== 'ALL') params.append('year', yearFilter);
      if (sectionFilter !== 'ALL') params.append('sectionId', sectionFilter);
      const stuRes = await axios.get(`${API}/hod/all-students?${params}`, h);
      console.log('[HOD] Students:', stuRes.data?.length);

      const allStudents: any[] = stuRes.data || [];
      setTotalStudentCount(allStudents.length);

      const assignedRolls = new Set(activeAssignments.map((a: any) => (a.rollNo || '').toLowerCase()));
      const assignedIds   = new Set(activeAssignments.map((a: any) => a.studentUserId).filter(Boolean));
      const unassigned = allStudents.filter((s: any) =>
        !assignedRolls.has((s.rollNo || '').toLowerCase()) && !assignedIds.has(s.id)
      );
      console.log('[HOD] Unassigned students:', unassigned.length);
      setStudents(unassigned);
    } catch (e: any) {
      console.error('[HOD] students error:', e?.response?.status, e?.message);
    }

    setLoading(false);
  };


  const toggleId = (id: string) =>
    setSelectedIds(p => p.includes(id) ? p.filter(r => r !== id) : [...p, id]);

  const handleAssign = async () => {
    if (!selectedMentor || selectedIds.length === 0) return;
    try {
      await axios.post(`${API}/hod/mentor/manual`,
        { mentorUserId: selectedMentor, studentRollNos: selectedIds },
        h);
      alert('Assigned successfully!');
      setSelectedIds([]);
      fetchData();
    } catch (e) { alert('Failed to assign mentor'); }
  };

  const handleUnassign = async (id: string) => {
    if (!confirm('Are you sure you want to unassign this student from their mentor?')) return;
    try {
      await axios.delete(`${API}/hod/mentor/${id}`, h);
      fetchData();
    } catch (e) { alert('Failed to unassign student'); }
  };

  const handleUpdateMentor = async () => {
    if (!editingAssignment) return;
    const payload: Record<string, string> = {};
    if (editMentorId) payload.mentorUserId = editMentorId;
    if (editStudentRollNo && editStudentRollNo !== editingAssignment.rollNo) payload.rollNo = editStudentRollNo;
    if (Object.keys(payload).length === 0) return;
    try {
      await axios.put(`${API}/hod/mentor/assignment/${editingAssignment.id}`, payload, h);
      setEditingAssignment(null);
      fetchData();
    } catch (e) { alert('Failed to update assignment'); }
  };

  const filteredAssignments = assignments.filter((a: any) => {
    if (!assignmentSearch) return true;
    const q = assignmentSearch.toLowerCase();
    return (
      (a.mentorName || '').toLowerCase().includes(q) ||
      (a.studentName || '').toLowerCase().includes(q) ||
      (a.rollNo || '').toLowerCase().includes(q) ||
      (a.studentEmail || '').toLowerCase().includes(q)
    );
  });

  // Group assignments by mentorUserId for the grouped card view
  const mentorGroups = filteredAssignments.reduce((acc: Record<string, any>, a: any) => {
    const key = a.mentorUserId || 'unassigned';
    if (!acc[key]) {
      acc[key] = {
        mentorUserId: a.mentorUserId,
        mentorName: a.mentorName || 'Unknown Mentor',
        mentorEmail: a.mentorEmail || '',
        students: [],
      };
    }
    acc[key].students.push(a);
    return acc;
  }, {});

  const toggleMentorExpand = (key: string) => {
    setExpandedMentors(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <>
      {/* Top Section: New Assignment Form + Unassigned Students */}
      <div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Assign New Mentees</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Select unassigned students and assign them to a mentor.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {/* Assignment Form Card */}
          <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>Assignment Setup</h4>
            <div>
              <label className="modal-label">Select Mentor</label>
              <select className="filter-select" style={{ width: '100%' }} value={selectedMentor} onChange={e => setSelectedMentor(e.target.value)}>
                <option value="">— choose mentor —</option>
                {mentors.map(m => <option key={m.id} value={m.id}>{m.fullName || m.email}</option>)}
              </select>
            </div>
            <div>
              <label className="modal-label">Year Filter</label>
              <select className="filter-select" style={{ width: '100%' }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                <option value="ALL">All Years</option>
                {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="modal-label">Section Filter</label>
              <select className="filter-select" style={{ width: '100%' }} value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
                <option value="ALL">All Sections</option>
                {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
              </select>
            </div>
            <button className="btn-action primary"
              disabled={!selectedMentor || selectedIds.length === 0}
              onClick={handleAssign}>
              Assign Selected {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
          </div>

          {/* Unassigned Students Panel — grouped by Year → Section */}
          <div className="data-table-wrapper" style={{ height: 420, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-raised)' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>
                Unassigned Students ({students.length})
              </span>
              {students.length > 0 && (
                <button className="btn-row-action" onClick={() => setSelectedIds(students.map((s: any) => s.rollNo || s.id))}>Select All</button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading students…</div>
            ) : students.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {totalStudentCount > 0 ? '✅ All students in this filter are already assigned!' : '📭 No students found in your department for this filter.'}
              </div>
            ) : (() => {
              // Group students by Year → Section
              const byYear: Record<string, Record<string, any[]>> = {};
              students.forEach((s: any) => {
                const yr  = s.year      || 'Unknown Year';
                const sec = s.sectionId || 'Unknown Sec';
                if (!byYear[yr]) byYear[yr] = {};
                if (!byYear[yr][sec]) byYear[yr][sec] = [];
                byYear[yr][sec].push(s);
              });
              return (
                <div>
                  {Object.entries(byYear).sort().map(([yr, sections]) => (
                    <div key={yr}>
                      {/* Year header */}
                      <div style={{
                        padding: '8px 18px', fontWeight: 800, fontSize: 12,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        background: 'hsl(217,91%,95%)', color: 'hsl(217,80%,35%)',
                        borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)',
                      }}>
                        Year {yr}
                      </div>
                      {Object.entries(sections).sort().map(([sec, studs]) => (
                        <div key={sec}>
                          {/* Section sub-header */}
                          <div style={{
                            padding: '5px 18px 5px 28px', fontSize: 11, fontWeight: 700,
                            color: 'hsl(270,60%,50%)', background: 'hsl(270,60%,97%)',
                            borderBottom: '1px solid var(--border)',
                          }}>
                            Section {sec} — {studs.length} student{studs.length !== 1 ? 's' : ''}
                          </div>
                          {/* Student rows */}
                          {(studs as any[]).map((s: any) => {
                            const sId = s.rollNo || s.id;
                            return (
                              <div
                                key={s.id}
                                onClick={() => toggleId(sId)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 10,
                                  padding: '10px 18px 10px 36px', cursor: 'pointer',
                                  borderBottom: '1px solid var(--border)',
                                  background: selectedIds.includes(sId) ? 'var(--accent-subtle)' : 'transparent',
                                  transition: 'background 0.15s',
                                }}
                              >
                                <input type="checkbox" readOnly checked={selectedIds.includes(sId)} style={{ flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{s.fullName || '—'}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                    {s.rollNo}{s.departmentId ? ` · ${s.departmentId}` : ''}
                                  </div>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                                  <div>{s.email}</div>
                                  {s.batch && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.batch}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Assigned Mentors & Mentees (grouped by mentor) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Assigned Mentors &amp; Mentees</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Each mentor group shows their assigned students. Click to expand/collapse.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              className="search-input"
              style={{ paddingLeft: 14, width: 220 }}
              placeholder="Search mentor or student…"
              value={assignmentSearch}
              onChange={e => setAssignmentSearch(e.target.value)}
            />
            <span style={{ padding: '6px 14px', borderRadius: 99, background: 'var(--accent-subtle)', color: 'var(--accent)', fontWeight: 800, fontSize: 12 }}>
              {assignments.length} Active
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading assignments…</div>
        ) : Object.keys(mentorGroups).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No mentorship assignments logged yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(mentorGroups).map(([key, group]: [string, any]) => {
              const isOpen = expandedMentors.has(key);
              return (
                <div key={key} className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Mentor Header */}
                  <div
                    onClick={() => toggleMentorExpand(key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', cursor: 'pointer',
                      background: isOpen ? 'var(--accent-subtle)' : 'transparent',
                      borderBottom: isOpen ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: 'linear-gradient(135deg,hsl(217,91%,60%),hsl(270,60%,65%))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0,
                      }}>
                        {(group.mentorName || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{group.mentorName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{group.mentorEmail || 'No email'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ padding: '4px 12px', borderRadius: 99, background: 'hsl(217,91%,60%)', color: '#fff', fontWeight: 800, fontSize: 12 }}>
                        {group.students.length} student{group.students.length !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: 18, color: 'var(--text-secondary)', display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
                    </div>
                  </div>

                  {/* Student rows — expanded */}
                  {isOpen && (
                    <div>
                      {group.students.map((a: any, idx: number) => (
                        <div key={a.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          flexWrap: 'wrap', gap: 12,
                          padding: '12px 20px 12px 76px',
                          borderBottom: idx < group.students.length - 1 ? '1px solid var(--border)' : 'none',
                          background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 180 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: 'hsl(145,60%,45%)', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 800, fontSize: 13, flexShrink: 0,
                            }}>
                              {(a.studentName || a.rollNo || 'S')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{a.studentName || a.rollNo}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {a.rollNo}{a.studentEmail ? ` · ${a.studentEmail}` : ''}
                              </div>
                              {a.departmentId && <div style={{ fontSize: 11, color: 'hsl(217,60%,50%)' }}>Dept: {a.departmentId}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, minWidth: 140 }}>
                            {a.year && <Chip label={`Y${a.year}`} color="hsl(217,91%,60%)" />}
                            {a.sectionId && <Chip label={`Sec ${a.sectionId}`} color="hsl(270,60%,65%)" />}
                            {a.batch && <Chip label={a.batch} color="hsl(30,80%,55%)" />}
                            {a.cgpa > 0 && <Chip label={`CGPA ${a.cgpa}`} color="hsl(145,60%,45%)" />}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-row-action"
                              onClick={() => { setEditingAssignment(a); setEditMentorId(a.mentorUserId || ''); setEditStudentRollNo(''); }}
                              title="Edit this assignment">
                              ✏️ Edit
                            </button>
                            <button
                              className="btn-row-action"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleUnassign(a.id)}
                              title="Unassign student"
                            >
                              🗑️ Unassign
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Mentor Assignment Modal */}
      {editingAssignment && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setEditingAssignment(null); }}>
          <div className="modal-box" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Edit Mentor Assignment</span>
              <button className="modal-close" onClick={() => setEditingAssignment(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Change Student */}
              <div>
                <label className="modal-label">Change Student</label>
                <select className="modal-form-input" value={editStudentRollNo || editingAssignment.rollNo}
                  onChange={e => setEditStudentRollNo(e.target.value)}>
                  {/* Current student always shown */}
                  <option value={editingAssignment.rollNo}>
                    {editingAssignment.studentName || editingAssignment.rollNo} — {editingAssignment.rollNo} (current)
                  </option>
                  {/* All other unassigned students */}
                  {students
                    .filter((s: any) => (s.rollNo || s.id) !== editingAssignment.rollNo)
                    .map((s: any) => {
                      const roll = s.rollNo || s.id;
                      return (
                        <option key={roll} value={roll}>
                          {s.fullName || s.email} — {roll}
                        </option>
                      );
                    })}
                </select>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Only unassigned students are listed. Select to swap the student in this assignment.
                </p>
              </div>

              {/* Current Mentor info */}
              <div>
                <label className="modal-label">Current Mentor</label>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {editingAssignment.mentorName || 'Unassigned'}
                </div>
              </div>

              {/* Change Mentor */}
              <div>
                <label className="modal-label">Change Mentor</label>
                <select className="modal-form-input" value={editMentorId} onChange={e => setEditMentorId(e.target.value)}>
                  <option value="">— keep current mentor —</option>
                  {mentors.map(m => (
                    <option key={m.id} value={m.id}>{m.fullName || m.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action secondary" onClick={() => setEditingAssignment(null)}>Cancel</button>
              <button className="btn-action primary"
                disabled={!editMentorId && (!editStudentRollNo || editStudentRollNo === editingAssignment.rollNo)}
                onClick={handleUpdateMentor}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


// ═══════════════════════════════════════════════════════════
// Shared Document View Modal
// ═══════════════════════════════════════════════════════════
interface DocViewModalProps {
  doc: { title: string; fileUrl: string; docType?: string; createdAt?: string } | null;
  onClose: () => void;
  token?: string;
}

const DocViewModal: React.FC<DocViewModalProps> = ({ doc, onClose, token }) => {
  if (!doc) return null;

  const ext = (doc.fileUrl || '').split('?')[0].split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  const isPdf   = ext === 'pdf';
  const isWord  = ['doc', 'docx'].includes(ext);
  const isExcel = ['xls', 'xlsx'].includes(ext);

  const handleDownload = async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(doc.fileUrl, { headers });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title + (ext ? '.' + ext : '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch {
      // Fallback: direct link
      const a = document.createElement('a');
      a.href = doc.fileUrl;
      a.download = doc.title;
      a.target = '_blank';
      a.rel = 'noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn .18s ease'
      }}
    >
      <div style={{
        background: 'var(--surface-raised, #1e1e2e)',
        border: '1px solid var(--surface-border, rgba(255,255,255,.1))',
        borderRadius: '16px',
        width: '100%', maxWidth: '880px',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.55)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--surface-border, rgba(255,255,255,.1))',
          background: 'var(--surface-overlay, rgba(255,255,255,.04))',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{doc.title}</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {doc.docType && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: 'var(--accent-subtle, rgba(99,102,241,.15))',
                  color: 'var(--accent, #6366f1)', textTransform: 'uppercase', letterSpacing: '.5px'
                }}>{doc.docType.replace(/_/g, ' ')}</span>
              )}
              {doc.createdAt && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(doc.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleDownload}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                background: 'var(--accent, #6366f1)', color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'transparent',
                border: '1px solid var(--surface-border, rgba(255,255,255,.1))',
                cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 300
              }}
              aria-label="Close"
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', minHeight: '300px' }}>
          {isPdf && (
            <iframe
              src={doc.fileUrl}
              title={doc.title}
              style={{ width: '100%', height: '68vh', border: 'none', display: 'block' }}
            />
          )}
          {isImage && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, minHeight: 300, background: 'rgba(0,0,0,.25)' }}>
              <img
                src={doc.fileUrl}
                alt={doc.title}
                style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,.4)', objectFit: 'contain' }}
              />
            </div>
          )}
          {(isWord || isExcel) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 30px', gap: 18 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #6366f1)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {isWord ? 'Word Document' : 'Excel Spreadsheet'}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                  This file type cannot be previewed in the browser.<br />
                  Click <strong>Download</strong> above to open it in the original format.
                </p>
              </div>
            </div>
          )}
          {!isPdf && !isImage && !isWord && !isExcel && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 30px', gap: 18 }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #6366f1)" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>
                  File Preview
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                  Preview not available for this file type.<br />
                  Use <strong>Download</strong> to open the file.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Documents Tab
// ═══════════════════════════════════════════════════════════
const DocumentsTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('CURRICULUM');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  useEffect(() => { fetchDocs(); }, []);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const r = await axios.get(`${API}/hod/documents`, h);
      setDocs(asArray(r.data));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      
      // 1. Upload file to backend storage
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Note: DO NOT set Content-Type manually — axios sets it automatically with the correct multipart boundary
      const uploadRes = await axios.post(`${API}/portal/student/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const uploadedFileUrl = uploadRes.data.url;

      // 2. Save document record
      await axios.post(`${API}/hod/document`, { 
        title, 
        docType: docType, // Align with backend entity naming (docType)
        fileUrl: uploadedFileUrl 
      }, h);

      setTitle(''); 
      setSelectedFile(null);
      // Reset input element
      const fileInput = document.getElementById('doc-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchDocs();
      alert('Document uploaded successfully!');
    } catch (e) { 
      console.error(e);
      alert('Upload failed'); 
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`${API}/hod/document/${id}`, h);
      fetchDocs();
    } catch (e) {
      alert('Failed to delete document');
    }
  };

  return (
    <>
      {previewDoc && (
        <DocViewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} token={token} />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div className="chart-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Upload Document</h3>
          <form onSubmit={upload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="modal-label">Title</label>
              <input className="modal-form-input" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CSE 3rd Year Timetable" />
            </div>
            <div>
              <label className="modal-label">Type</label>
              <select className="modal-form-input" value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="CURRICULUM">Curriculum</option>
                <option value="POLICY">Policy</option>
                <option value="GUIDELINE">Guideline</option>
                <option value="CLASS_TIMETABLE">Class Timetable</option>
                <option value="ACADEMIC_CALENDAR">Academic Calendar</option>
              </select>
            </div>
            <div>
              <label className="modal-label">File (PDF, Word, Excel, etc.)</label>
              <input 
                id="doc-file-input"
                className="modal-form-input" 
                required 
                type="file" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" 
                onChange={handleFileChange} 
              />
            </div>
            <button type="submit" className="btn-action primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </form>
        </div>

        <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Uploaded Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                : docs.length === 0
                  ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No documents yet.</td></tr>
                  : docs.map((d: any) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.title}</td>
                      <td>
                        <span className="status-badge active" style={{ fontSize: '10px' }}>
                          {d.docType || d.type || 'DOCUMENT'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setPreviewDoc(d)}
                            className="btn-row-action"
                          >
                            View
                          </button>
                          <button onClick={() => handleDelete(d.id)} className="btn-row-action" style={{ color: 'var(--danger)' }}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};



// ═══════════════════════════════════════════════════════════
// Broadcasts Tab
// ═══════════════════════════════════════════════════════════
const BroadcastsTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const [bType, setBType] = useState('Student');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [year, setYear] = useState('ALL');
  const [section, setSection] = useState('ALL');
  const [adminMsg, setAdminMsg] = useState('');
  const [sections, setSections] = useState<string[]>(getSavedSections());
  const [sentNotifs, setSentNotifs] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    const handleUpdate = () => setSections(getSavedSections());
    window.addEventListener('sections_updated', handleUpdate);
    return () => window.removeEventListener('sections_updated', handleUpdate);
  }, []);

  useEffect(() => { fetchSentNotifs(); }, []);

  const fetchSentNotifs = async () => {
    try {
      setLoadingNotifs(true);
      const r = await axios.get(`${API}/hod/notifications/sent`, h);
      // Deduplicate by title+message+hour (since one broadcast creates one notif per recipient, and timestamps vary by ms)
      const seen = new Set<string>();
      const unique: any[] = [];
      for (const n of r.data) {
        let timeBucket = '';
        try { timeBucket = n.createdAt ? new Date(n.createdAt).toISOString().substring(0, 13) : ''; } catch (err) {}
        const key = `${n.title}||${n.message}||${timeBucket}`;
        if (!seen.has(key)) { seen.add(key); unique.push(n); }
      }
      setSentNotifs(unique);
    } catch (e) { console.error(e); }
    finally { setLoadingNotifs(false); }
  };

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/hod/notification`, {
        title, message, type: 'ACADEMIC',
        targetRoles: [bType], year, sectionId: section
      }, h);
      alert(`Sent to ${res.data.recipientCount ?? '?'} recipients`);
      setTitle(''); setMessage('');
      fetchSentNotifs();
    } catch (e) { alert('Failed to send broadcast'); }
  };

  const sendAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/hod/messages/admin`, { messageText: adminMsg }, h);
      alert('Message sent to Director/Admin');
      setAdminMsg('');
    } catch (e) { alert('Failed to send message'); }
  };

  const typeColors: Record<string, string> = {
    ACADEMIC: '#6366f1', SYSTEM: '#10b981', ALERT: '#ef4444', GENERAL: '#f59e0b'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Forms row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        <div className="chart-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Targeted Broadcast</h3>
          <form onSubmit={sendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="modal-label">Target</label>
              <select className="modal-form-input" value={bType} onChange={e => setBType(e.target.value)}>
                <option value="Student">Students</option>
                <option value="Faculty">Faculty</option>
                <option value="Mentor">Mentors</option>
              </select>
            </div>
            {bType === 'Student' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="modal-label">Year</label>
                  <select className="modal-form-input" value={year} onChange={e => setYear(e.target.value)}>
                    <option value="ALL">All</option>
                    {['1','2','3','4'].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="modal-label">Section</label>
                  <select className="modal-form-input" value={section} onChange={e => setSection(e.target.value)}>
                    <option value="ALL">All</option>
                    {sections.map(s => <option key={s} value={s}>Sec {s}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div>
              <label className="modal-label">Subject</label>
              <input className="modal-form-input" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Broadcast subject" />
            </div>
            <div>
              <label className="modal-label">Message</label>
              <textarea className="modal-form-input" required rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message…" style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-action primary">Send Broadcast</button>
          </form>
        </div>

        <div className="chart-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Message Admin / Director</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Send a direct message to the system administrator.</p>
          <form onSubmit={sendAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="modal-label">Message</label>
              <textarea className="modal-form-input" required rows={5} value={adminMsg} onChange={e => setAdminMsg(e.target.value)} placeholder="Describe your request…" style={{ resize: 'vertical' }} />
            </div>
            <button type="submit" className="btn-action primary">Send to Admin</button>
          </form>
        </div>
      </div>

      {/* Sent Broadcasts History */}
      <div className="chart-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, margin: 0 }}>
            Sent Broadcasts History
          </h3>
          <button
            onClick={fetchSentNotifs}
            style={{
              background: 'transparent', border: '1px solid var(--surface-border)',
              borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {loadingNotifs ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading history…</div>
        ) : sentNotifs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No broadcasts sent yet. Use the form above to send your first broadcast.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sentNotifs.map((n: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 16,
                  padding: '14px 16px',
                  background: 'var(--surface-base, rgba(255,255,255,.03))',
                  border: '1px solid var(--surface-border)',
                  borderRadius: 10,
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{n.title}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                      background: `color-mix(in srgb, ${typeColors[n.type] || '#6366f1'} 15%, transparent)`,
                      color: typeColors[n.type] || '#6366f1',
                      textTransform: 'uppercase', letterSpacing: '.4px'
                    }}>{n.type || 'ACADEMIC'}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.message}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};



const EscalationsTab: React.FC<{ token: string; userEmail: string }> = ({ token, userEmail }) => {
  return <EscalationsGroupChat token={token} userEmail={userEmail} userRole="HOD" canCreateGroup={true} />;
};



// ═══════════════════════════════════════════════════════════
// Analytics Tab
// ═══════════════════════════════════════════════════════════
const AnalyticsTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/hod/analytics`, h)
      .then(r => setData(r.data || {}))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading analytics…</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Failed to load data.</div>;

  const coverage = data.totalStudents > 0 ? Math.round((data.assignedCount / data.totalStudents) * 100) : 0;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{data.totalStudents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Mentorship Coverage</div>
          <div className="stat-value">{coverage}%</div>
          <div className="stat-sub">{data.assignedCount} assigned · {data.unassignedCount} pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Syllabus Completion</div>
          <div className="stat-value">{data.syllabusPct}%</div>
          <div className="stat-sub">{data.coveredTopics} / {data.totalTopics} topics</div>
        </div>
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div className="chart-card">
          <div className="chart-title">Batch Average CGPA</div>
          {Object.entries(data.batchAverages || {}).map(([batch, avg]: [string, any]) => (
            <div key={batch} className="bar-row">
              <div className="bar-label">{batch}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(avg / 10) * 100}%` }}></div>
              </div>
              <div className="bar-count">{Number(avg).toFixed(2)}</div>
            </div>
          ))}
          {Object.keys(data.batchAverages || {}).length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No batch data available.</div>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">Syllabus Coverage by Subject</div>
          {(data.subjects || []).map((s: any) => {
            const pct = s.totalTopics > 0 ? Math.round((s.coveredTopics / s.totalTopics) * 100) : 0;
            return (
              <div key={s.id || s.subjectCode} className="bar-row">
                <div className="bar-label" style={{ width: 80, fontSize: 11 }}>{s.subjectCode}</div>
                <div className="bar-track">
                  <div className="bar-fill tier-b" style={{ width: `${pct}%` }}></div>
                </div>
                <div className="bar-count">{pct}%</div>
              </div>
            );
          })}
          {(data.subjects || []).length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No subject data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// At-Risk Tab
// ═══════════════════════════════════════════════════════════
const AtRiskTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/hod/at-risk`, h)
      .then(r => setAtRisk(asArray(r.data)))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading at-risk data…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>At-Risk Students</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Flagged by CGPA, attendance, backlog, or missing mentor criteria.</p>
        </div>
        <span style={{ padding: '6px 16px', borderRadius: 99, background: 'hsla(0,80%,55%,.12)', color: 'hsl(0,80%,60%)', fontWeight: 800, fontSize: 13 }}>
          🚨 {atRisk.length} Flagged
        </span>
      </div>

      {atRisk.length === 0 ? (
        <div className="chart-card" style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>Check</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)' }}>No at-risk students!</div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8 }}>All students are currently on track.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {atRisk.map((item: any, idx: number) => {
            const attPct = item.profile?.totalClasses > 0
              ? Math.round((item.profile.attendedClasses / item.profile.totalClasses) * 100) : 100;
            return (
              <div key={idx} className="stat-card" style={{ borderLeft: '3px solid var(--danger)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                      {item.user?.fullName || item.profile?.rollNo || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.profile?.rollNo} · Batch {item.profile?.batch}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>CGPA: {item.profile?.cgpa}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Att: {attPct}%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {item.riskFactors?.map((f: string, i: number) => (
                    <span key={i} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: 'hsla(0,80%,55%,.12)', color: 'hsl(0,80%,60%)' }}>{f}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-row-action" style={{ flex: 1 }}>View Profile</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Attainment Tab
// ═══════════════════════════════════════════════════════════
const AttainmentTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/hod/accreditation`, h)
      .then(r => setData(asArray(r.data)))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Course Outcome Attainment</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>NBA / NAAC accreditation checklist and evidence tracking.</p>
        </div>
        <span style={{ padding: '6px 16px', borderRadius: 99, background: 'hsla(217,91%,50%,.12)', color: 'hsl(217,91%,65%)', fontWeight: 800, fontSize: 13 }}>
          Accreditation
        </span>
      </div>
      <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>Criteria</th><th>Evidence</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Loading…</td></tr>
              : data.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No criteria logged yet.</td></tr>
                : data.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.criteriaTitle}</td>
                    <td>
                      {item.evidenceUrl
                        ? <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="btn-row-action">View</a>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td>
                      <span className={`status-pill ${item.isMet ? 'active' : 'inactive'}`}>
                        <span className="status-dot"></span>
                        {item.isMet ? 'Met' : 'Not Met'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(item.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Trainings Tab
// ═══════════════════════════════════════════════════════════
const TrainingsTab: React.FC<{ token: string }> = ({ token }) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<Partial<TrainingProgram>>({ targetYears: [] });

  useEffect(() => { fetchTrainings(); }, []);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const r = await axios.get(`${API}/hod/trainings`, h);
      setTrainings(asArray(r.data));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    try {
      if (edit.id) {
        await axios.put(`${API}/hod/training/${edit.id}`, edit, h);
      } else {
        await axios.post(`${API}/hod/training`, edit, h);
      }
      setModal(false); fetchTrainings();
    } catch (e) { alert('Save failed'); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this training?')) return;
    await axios.delete(`${API}/hod/training/${id}`, h);
    fetchTrainings();
  };

  const toggleYear = (y: string) => {
    const curr = edit.targetYears || [];
    setEdit({ ...edit, targetYears: curr.includes(y) ? curr.filter(x => x !== y) : [...curr, y] });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Skill Development & Training</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Manage department training programs</p>
        </div>
        <button className="btn-action primary" onClick={() => { setEdit({ targetYears: [] }); setModal(true); }}>+ New Training</button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {trainings.map(t => (
            <div key={t.id} className="stat-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{t.title}</div>
                <span className={`status-pill ${t.isActive ? 'active' : 'inactive'}`}>
                  <span className="status-dot"></span>
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{t.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, marginBottom: 14 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <strong>{t.category}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Venue:</span> <strong>{t.venue}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Start:</span> <strong>{t.startDate}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>End:</span> <strong>{t.endDate}</strong></div>
                <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Years:</span> <strong>{t.targetYears?.join(', ') || 'All'}</strong></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-row-action" style={{ flex: 1 }} onClick={() => { setEdit(t); setModal(true); }}>Edit</button>
                <button className="btn-row-action" style={{ flex: 1, color: 'var(--danger)' }} onClick={() => del(t.id)}>Delete</button>
              </div>
            </div>
          ))}
          {trainings.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No training programs yet. Create one!</div>
          )}
        </div>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <span className="modal-title">{edit.id ? 'Edit' : 'Create'} Training Program</span>
              <button className="modal-close" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="modal-label">Title</label>
                <input className="modal-form-input" value={edit.title || ''} onChange={e => setEdit({ ...edit, title: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="modal-label">Description</label>
                <textarea className="modal-form-input" rows={3} value={edit.description || ''} onChange={e => setEdit({ ...edit, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label className="modal-label">Category</label>
                <input className="modal-form-input" value={edit.category || ''} onChange={e => setEdit({ ...edit, category: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">Venue</label>
                <input className="modal-form-input" value={edit.venue || ''} onChange={e => setEdit({ ...edit, venue: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">Start Date</label>
                <input type="date" className="modal-form-input" value={edit.startDate || ''} onChange={e => setEdit({ ...edit, startDate: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">End Date</label>
                <input type="date" className="modal-form-input" value={edit.endDate || ''} onChange={e => setEdit({ ...edit, endDate: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="modal-label">Registration URL</label>
                <input type="url" className="modal-form-input" value={edit.registrationUrl || ''} onChange={e => setEdit({ ...edit, registrationUrl: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label className="modal-label">Target Years</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                  {['1','2','3','4'].map(y => (
                    <label key={y} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={(edit.targetYears || []).includes(y)} onChange={() => toggleYear(y)} />
                      Year {y}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={edit.isActive || false} onChange={e => setEdit({ ...edit, isActive: e.target.checked })} />
                  <span style={{ fontWeight: 600 }}>Mark as Active</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn-action primary" onClick={save}>Save Program</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Root HOD Dashboard
// ═══════════════════════════════════════════════════════════
const HODDashboard: React.FC<HODDashboardProps> = ({ userSession, handleLogout }) => {
  const [activeTab, setActiveTab] = useState('directory');
  const token = userSession.accessToken;

  const renderTab = () => {
    switch (activeTab) {
      case 'directory':    return <DirectoryTab token={token} />;
      case 'mentorship':   return <MentorshipTab token={token} />;
      case 'documents':   return <DocumentsTab token={token} />;
      case 'broadcasts':  return <BroadcastsTab token={token} />;
      case 'escalations': return <EscalationsTab token={token} userEmail={userSession.email} />;
      case 'analytics':   return <AnalyticsTab token={token} />;
      case 'at-risk':     return <AtRiskTab token={token} />;
      case 'attainment':  return <AttainmentTab token={token} />;
      case 'trainings':   return <TrainingsTab token={token} />;
      default:            return null;
    }
  };

  const current = TABS.find(t => t.id === activeTab);

  return (
    <div className="admin-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--surface-base)' }}>
      {/* Responsive Layout Styles */}
      <style>{`
        .hod-desktop-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--surface-raised);
          border-right: 1px solid var(--surface-border);
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .hod-mobile-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: var(--surface-raised);
          border-top: 1px solid var(--surface-border);
          box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
          align-items: center;
          padding: 0 16px;
          gap: 8px;
          overflow-x: auto;
          z-index: 1000;
          scrollbar-width: none;
        }
        .hod-mobile-bottom-nav::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 768px) {
          .hod-desktop-sidebar {
            display: none !important;
          }
          .hod-mobile-bottom-nav {
            display: flex !important;
          }
          .hod-main-area {
            padding-bottom: 90px !important;
          }
        }
      `}</style>

      {/* Topbar with Official CIET LogoHeader */}
      <header className="admin-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--surface-raised)', borderBottom: '1px solid var(--surface-border)', flexWrap: 'wrap', gap: '12px' }}>
        <div className="admin-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LogoHeader imageStyle={{ height: '36px' }} />
          <div className="topbar-divider" style={{ height: '24px', width: '1px', background: 'var(--surface-border)' }}></div>
          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            HOD Portal — {current?.label}
          </span>
        </div>
        <div className="admin-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {userSession.fullName || userSession.email}
          </span>
          <div className="status-chip">
            <div className="led green"></div>
            Live
          </div>
          <button className="btn-topbar danger" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* Main Body with Sidebar on Desktop, Content in Center */}
      <div className="admin-body" style={{ flex: 1, display: 'flex', flexDirection: 'row', width: '100%' }}>
        {/* Desktop Sidebar (No Icons, Text Only) */}
        <aside className="hod-desktop-sidebar">
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>
            Navigation
          </div>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--r2)',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                background: activeTab === tab.id ? 'var(--accent-subtle)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-primary)',
                borderLeft: activeTab === tab.id ? '3px solid var(--accent)' : '3px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
          
          {/* Section Manager Configurator */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--surface-border)' }}>
            <button
              onClick={() => {
                const currentSecs = getSavedSections();
                const input = prompt("Manage Sections (comma-separated list):", currentSecs.join(", "));
                if (input !== null) {
                  const cleaned = input.split(",")
                    .map(s => s.trim().toUpperCase())
                    .filter(s => s.length > 0);
                  if (cleaned.length > 0) {
                    saveSectionsList(cleaned);
                    alert("Sections updated to: " + cleaned.join(", "));
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 'var(--r2)',
                fontWeight: 600,
                fontSize: '12px',
                border: '1px dashed var(--surface-border)',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ⚙️ Manage Sections
            </button>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--surface-border)' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--r2)',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                background: 'transparent',
                color: 'var(--danger)'
              }}
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main hod-main-area" style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div className="admin-main-content">
            {renderTab()}
          </div>

          {/* CIET Footer like Admin / Student / Faculty dashboards */}
          <footer className="admin-footer" style={{
            padding: '36px 24px 28px',
            background: 'var(--surface-raised)',
            borderTop: '1px solid var(--surface-border)',
            borderRadius: 'var(--r3)',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            marginTop: '40px',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '32px'
            }}>
              <div style={{ maxWidth: '380px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <LogoHeader imageStyle={{ height: '36px', background: '#fff', borderRadius: '4px', padding: '2px' }} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Approved by AICTE, Affiliated to Acharya Nagarjuna University. Accredited by NAAC with 'A' Grade & NBA.
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                <div>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Contacts</h5>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📞 0863 - 2524112 / 113</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a href="mailto:principal@chalapathiengg.ac.in" style={{ color: 'inherit', textDecoration: 'none' }}>✉️ principal@chalapathiengg.ac.in</a>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Address</h5>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '240px' }}>
                    Chalapathi Nagar, Lam,<br />
                    Guntur District, Andhra Pradesh<br />
                    PIN – 522 034, India
                  </p>
                </div>
              </div>
            </div>
            
            <div style={{
              borderTop: '1px solid var(--surface-border)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontWeight: 500
            }}>
              <span>© {new Date().getFullYear()} CIET. All Rights Reserved.</span>
              <a href="http://chalapathiengg.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Official Portal →</a>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile & Tablet Bottom Navigation (<768px only) */}
      <nav className="hod-mobile-bottom-nav">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.id ? '0 2px 8px var(--accent-glow)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default HODDashboard;

