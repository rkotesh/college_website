import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const API = '/api/v1';

interface EscalationsGroupChatProps {
  token: string;
  userEmail: string;
  userRole: 'HOD' | 'Faculty' | 'Mentor' | 'Student';
  canCreateGroup?: boolean;
}

type ModalMode = 'create' | 'edit' | null;

/* ─── Role color badge palette ─── */
const ROLE_COLOR: Record<string, string> = {
  HOD: '#4f46e5',
  Faculty: '#d97706',
  Mentor: '#059669',
  Student: '#2563eb',
  SYSTEM: '#64748b',
};

const initials = (name: string) => (name || '?').charAt(0).toUpperCase();

const fmtTime = (dt: string) => {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const dedupe = (arr: any[]) => {
  const seen = new Set<string>();
  return arr.filter(t => {
    const id = t?.thread?.id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/* Role pill badge component */
const RoleBadge = ({ role }: { role: string }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    Student: { bg: '#f1f5f9', color: '#64748b' },
    Faculty: { bg: '#fef3c7', color: '#b45309' },
    Mentor:  { bg: '#d1fae5', color: '#047857' },
    HOD:     { bg: '#f3e8ff', color: '#6d28d9' },
    SYSTEM:  { bg: '#e2e8f0', color: '#475569' },
  };
  const s = styles[role] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 10.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center',
    }}>
      {role}
    </span>
  );
};

/* Metadata tag pill component */
const TagBadge = ({ label, type }: { label: string; type: 'year' | 'sec' | 'dept' | 'roll' | 'batch' }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    year:  { bg: '#dbeafe', color: '#1d4ed8' },
    sec:   { bg: '#f3e8ff', color: '#7e22ce' },
    dept:  { bg: '#d1fae5', color: '#0f766e' },
    roll:  { bg: '#ffedd5', color: '#c2410c' },
    batch: { bg: '#ecfdf5', color: '#047857' },
  };
  const s = styles[type] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '2px 7px', borderRadius: 6,
      fontSize: 10.5, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center',
    }}>
      {label}
    </span>
  );
};

/* Avatar badge */
const Avatar = ({ name, color, size = 40 }: { name: string; color: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
    border: `2px solid ${color}22`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: size * 0.4, color: '#ffffff', letterSpacing: '-0.5px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  }}>
    {initials(name)}
  </div>
);

export const EscalationsGroupChat: React.FC<EscalationsGroupChatProps> = ({
  token, userEmail, userRole, canCreateGroup = true
}) => {
  const h = { headers: { Authorization: `Bearer ${token}` } };
  const isStudent = userRole === 'Student';

  const fetchEndpoint = isStudent ? `${API}/portal/student/escalations` : `${API}/hod/escalations`;
  const msgEndpoint = (tid: string) =>
    isStudent ? `${API}/portal/student/escalations/${tid}/message` : `${API}/hod/escalations/${tid}/message`;

  /* State */
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any | null>(null);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  /* Group creation / editing */
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [selMembers, setSelMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Student filter for modal */
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterSec, setFilterSec] = useState('ALL');
  const [filterYear, setFilterYear] = useState('ALL');

  /* Context menu for group options */
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; thread: any } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const chatBodyRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Data loading */
  const loadThreads = useCallback(async (keepActive = true) => {
    try {
      setLoading(true);
      const r = await axios.get(fetchEndpoint, h);
      const deduped = dedupe(Array.isArray(r.data) ? r.data : []);
      setThreads(deduped);
      if (keepActive && active) {
        const updated = deduped.find((t: any) => t.thread?.id === active.thread?.id);
        if (updated) setActive(updated);
      } else if (!active && deduped.length > 0) {
        setActive(deduped[0]);
      }
    } catch (e) {
      console.error('[GroupChat] load threads error:', e);
    } finally {
      setLoading(false);
    }
  }, [fetchEndpoint, active]);

  useEffect(() => { loadThreads(false); }, []);

  /* Auto-scroll ONLY on new messages in active chat */
  const prevActiveId = useRef<string | null>(null);
  const prevMsgCount = useRef<number>(0);

  useEffect(() => {
    const currentId = active?.thread?.id ?? null;
    const currentCount = active?.messages?.length ?? 0;

    const isSameGroup = currentId === prevActiveId.current;
    const hasNewMsg = isSameGroup && currentCount > prevMsgCount.current;

    if (hasNewMsg) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevActiveId.current = currentId;
    prevMsgCount.current = currentCount;
  }, [active?.thread?.id, active?.messages?.length]);

  /* User list for group modal */
  const loadUsers = async () => {
    if (isStudent) return;
    try {
      setUsersLoading(true);
      let data: any[] = [];
      try {
        const r = await axios.get(`${API}/hod/escalations/users`, h);
        data = Array.isArray(r.data) ? r.data : [];
      } catch {
        try {
          const [stuRes, facRes] = await Promise.allSettled([
            axios.get(`${API}/hod/all-students`, h),
            axios.get(`${API}/hod/all-faculty`, h),
          ]);
          if (stuRes.status === 'fulfilled' && Array.isArray(stuRes.value.data))
            data.push(...stuRes.value.data.map((s: any) => ({ ...s, role: 'Student' })));
          if (facRes.status === 'fulfilled' && Array.isArray(facRes.value.data))
            data.push(...facRes.value.data.map((f: any) => ({ ...f, role: f.role || 'Faculty' })));
        } catch { /* ignore */ }
      }
      setAllUsers(data);
    } finally {
      setUsersLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setGroupName('');
    setSelMembers([]);
    setMemberSearch('');
    setFilterDept('ALL'); setFilterSec('ALL'); setFilterYear('ALL');
    loadUsers();
  };

  const openEdit = (thread: any) => {
    setCtxMenu(null);
    setModalMode('edit');
    setEditTarget(thread);
    setGroupName(thread.thread?.groupName || '');
    const existing: any[] = [
      ...(thread.students || []).map((s: any) => ({ ...s, role: 'Student' })),
      ...(thread.mentors || []).map((m: any) => ({ ...m, role: 'Mentor' })),
      ...(thread.facultyMembers || []).map((f: any) => ({ ...f, role: 'Faculty' })),
      ...(thread.hodMembers || []).map((hm: any) => ({ ...hm, role: 'HOD' })),
    ];
    setSelMembers(existing);
    setMemberSearch('');
    setFilterDept('ALL'); setFilterSec('ALL'); setFilterYear('ALL');
    loadUsers();
  };

  const closeModal = () => {
    setModalMode(null);
    setEditTarget(null);
    setGroupName('');
    setSelMembers([]);
    setMemberSearch('');
  };

  const toggleMember = (u: any) => {
    setSelMembers(prev =>
      prev.some(m => m.id === u.id) ? prev.filter(m => m.id !== u.id) : [...prev, u]
    );
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) { alert('Enter a group name'); return; }
    if (selMembers.length === 0) { alert('Add at least one member'); return; }
    try {
      setSaving(true);
      await axios.post(`${API}/hod/escalations`, {
        groupName: groupName.trim(),
        rollNos: selMembers.filter(m => m.role === 'Student').map(m => m.rollNo).filter(Boolean),
        mentorUserIds: selMembers.filter(m => m.role === 'Mentor').map(m => m.id),
        facultyUserIds: selMembers.filter(m => m.role === 'Faculty').map(m => m.id),
        hodUserIds: selMembers.filter(m => m.role === 'HOD').map(m => m.id),
      }, h);
      closeModal();
      await loadThreads(false);
    } catch { alert('Failed to create group. Please try again.'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) { alert('Group name cannot be empty'); return; }
    try {
      const targetId = editTarget?.thread?.id || editTarget?.id;
      if (!targetId) return;
      await axios.put(`${API}/hod/escalations/${targetId}`, {
        groupName: groupName.trim(),
        rollNos: selMembers.filter(m => m.role === 'Student').map(m => m.rollNo).filter(Boolean),
        mentorUserIds: selMembers.filter(m => m.role === 'Mentor').map(m => m.id),
        facultyUserIds: selMembers.filter(m => m.role === 'Faculty').map(m => m.id),
        hodUserIds: selMembers.filter(m => m.role === 'HOD').map(m => m.id),
      }, h);
      closeModal();
      await loadThreads(true);
    } catch (err: any) {
      console.error('[GroupChat] saveEdit error:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to save changes.';
      alert(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (thread: any) => {
    const threadId = thread?.thread?.id || thread?.id;
    if (!threadId) return;
    setConfirmDelete(null);
    try {
      await axios.delete(`${API}/hod/escalations/${threadId}`, h);
      if (active?.thread?.id === threadId || active?.id === threadId) setActive(null);
      await loadThreads(false);
    } catch (err: any) {
      console.error('[GroupChat] deleteGroup error:', err);
      const errMsg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete group.';
      alert(errMsg);
    }
  };

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !active) return;
    try {
      setSending(true);
      await axios.post(msgEndpoint(active.thread.id), { content: msg.trim() }, h);
      setMsg('');
      await loadThreads(true);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { alert('Failed to send message.'); }
    finally { setSending(false); }
  };

  const filteredForModal = allUsers.filter(u => {
    const q = memberSearch.toLowerCase();
    const nameMatch = !q || (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.rollNo || '').toLowerCase().includes(q);
    if (u.role === 'Student') {
      const deptMatch = filterDept === 'ALL' || (u.departmentId || '').toLowerCase() === filterDept.toLowerCase();
      const secMatch = filterSec === 'ALL' || (u.sectionId || '').toLowerCase() === filterSec.toLowerCase();
      const yearMatch = filterYear === 'ALL' || (u.year || '') === filterYear;
      return nameMatch && deptMatch && secMatch && yearMatch;
    }
    return nameMatch;
  });

  const usersByRole: Record<string, any[]> = {};
  for (const u of filteredForModal) {
    if (!usersByRole[u.role]) usersByRole[u.role] = [];
    usersByRole[u.role].push(u);
  }

  const allStudents = allUsers.filter(u => u.role === 'Student');
  const deptOptions = Array.from(new Set(allStudents.map(u => u.departmentId).filter(Boolean))).sort();
  const secOptions = Array.from(new Set(allStudents
    .filter(u => filterDept === 'ALL' || u.departmentId === filterDept)
    .map(u => u.sectionId).filter(Boolean))).sort();
  const yearOptions = Array.from(new Set(allStudents
    .filter(u => (filterDept === 'ALL' || u.departmentId === filterDept) && (filterSec === 'ALL' || u.sectionId === filterSec))
    .map(u => u.year).filter(Boolean))).sort();

  const filteredThreads = threads.filter(t => {
    const q = search.toLowerCase();
    return !q || (t.thread?.groupName || '').toLowerCase().includes(q);
  });

  const getParticipants = (t: any) => {
    return [
      ...(t.students || []).map((s: any) => ({ name: s.fullName || s.rollNo, role: 'Student' })),
      ...(t.mentors || []).map((m: any) => ({ name: m.fullName, role: 'Mentor' })),
      ...(t.facultyMembers || []).map((f: any) => ({ name: f.fullName, role: 'Faculty' })),
      ...(t.hodMembers || []).map((hm: any) => ({ name: hm.fullName, role: 'HOD' })),
    ];
  };

  const getLastMsg = (t: any) => {
    if (!t.lastMessage) return null;
    return `${t.lastMessage.senderName}: ${t.lastMessage.content}`;
  };

  const canManage = (t: any) =>
    !isStudent && (userRole === 'HOD' || t.thread?.createdByRole === userRole);

  /* Light ERP Theme Styles */
  const S = {
    container: {
      display: 'grid' as const,
      gridTemplateColumns: '320px 1fr',
      height: 'calc(100vh - 200px)',
      minHeight: 520,
      maxHeight: 740,
      border: '1px solid var(--surface-border, #e2e8f0)',
      borderRadius: 16,
      overflow: 'hidden',
      background: 'var(--surface-raised, #ffffff)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
    },
    sidebar: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      borderRight: '1px solid var(--surface-border, #e2e8f0)',
      background: 'var(--surface-raised, #ffffff)',
      height: '100%',
      overflow: 'hidden',
    },
    sidebarHeader: {
      padding: '16px 16px 12px',
      borderBottom: '1px solid var(--surface-border, #e2e8f0)',
      flexShrink: 0,
      background: 'var(--surface-raised, #ffffff)',
    },
    mainPane: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      background: 'var(--surface-base, #f8fafc)',
      position: 'relative' as const,
      height: '100%',
      overflow: 'hidden',
    },
    searchInput: {
      width: '100%',
      boxSizing: 'border-box' as const,
      padding: '8px 12px',
      borderRadius: 8,
      border: '1px solid var(--surface-border, #cbd5e1)',
      background: 'var(--surface-base, #f1f5f9)',
      color: 'var(--text-primary, #0f172a)',
      fontSize: 13,
      outline: 'none',
    },
    select: {
      padding: '6px 10px',
      borderRadius: 7,
      border: '1px solid var(--surface-border, #cbd5e1)',
      background: 'var(--surface-raised, #ffffff)',
      color: 'var(--text-primary, #0f172a)',
      fontSize: 12,
      outline: 'none',
      cursor: 'pointer',
    },
  };

  return (
    <div style={{ width: '100%' }} onClick={() => setCtxMenu(null)}>

      {/* ── MODAL: Create or Edit Group ── */}
      {modalMode && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div style={{
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--surface-border, #e2e8f0)',
            borderRadius: 16,
            width: '100%', maxWidth: 580,
            maxHeight: '88vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid var(--surface-border, #e2e8f0)',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #0f172a)' }}>
                  {modalMode === 'create' ? 'New Escalation Group' : 'Edit Group'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)', marginTop: 2 }}>
                  {modalMode === 'create' ? 'Select students, faculty, or mentors to form a communication group' : 'Rename or update group members'}
                </div>
              </div>
              <button onClick={closeModal} style={{
                background: 'var(--surface-base, #f1f5f9)', border: '1px solid var(--surface-border, #e2e8f0)',
                borderRadius: '50%', width: 30, height: 30, cursor: 'pointer',
                color: 'var(--text-muted, #64748b)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            <form onSubmit={modalMode === 'create' ? createGroup : saveEdit}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

              {/* Group name */}
              <div style={{ padding: '16px 20px 0' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #64748b)', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>GROUP NAME</label>
                <input
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. CSE-A Mentorship Group, Project Review Team…"
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--surface-border, #cbd5e1)',
                    background: 'var(--surface-base, #f8fafc)',
                    color: 'var(--text-primary, #0f172a)', fontSize: 14, fontWeight: 600,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Selected member chips */}
              {selMembers.length > 0 && (
                <div style={{ padding: '10px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selMembers.map(m => (
                    <span key={m.id} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: `${ROLE_COLOR[m.role] || '#4f46e5'}12`,
                      border: `1px solid ${ROLE_COLOR[m.role] || '#4f46e5'}33`,
                      borderRadius: 99, padding: '3px 10px 3px 8px',
                      fontSize: 12, fontWeight: 600,
                      color: ROLE_COLOR[m.role] || '#4f46e5',
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: `${ROLE_COLOR[m.role] || '#4f46e5'}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: ROLE_COLOR[m.role] || '#4f46e5',
                      }}>{initials(m.fullName || m.rollNo || '?')}</span>
                      {m.fullName || m.rollNo}
                      <button type="button" onClick={() => toggleMember(m)} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'inherit', fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2,
                      }}>×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Filters bar for students */}
              <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="🔍 Search name, roll no, email…"
                  style={{
                    flex: 1, minWidth: 150, padding: '7px 10px',
                    borderRadius: 8, border: '1px solid var(--surface-border, #cbd5e1)',
                    background: 'var(--surface-base, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: 12.5, outline: 'none',
                  }}
                />
                {deptOptions.length > 0 && (
                  <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setFilterSec('ALL'); setFilterYear('ALL'); }} style={S.select}>
                    <option value="ALL">All Depts</option>
                    {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                {secOptions.length > 0 && (
                  <select value={filterSec} onChange={e => { setFilterSec(e.target.value); setFilterYear('ALL'); }} style={S.select}>
                    <option value="ALL">All Secs</option>
                    {secOptions.map(s => <option key={s} value={s}>Sec {s}</option>)}
                  </select>
                )}
                {yearOptions.length > 0 && (
                  <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={S.select}>
                    <option value="ALL">All Years</option>
                    {yearOptions.map(y => <option key={y} value={y}>Yr {y}</option>)}
                  </select>
                )}
              </div>

              {/* Member list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 12px' }}>
                {usersLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: 13 }}>
                    Loading users…
                  </div>
                ) : filteredForModal.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: 13 }}>
                    No matching users found.
                  </div>
                ) : (
                  ['Student', 'Faculty', 'Mentor', 'HOD'].map(role => {
                    const users = usersByRole[role];
                    if (!users || users.length === 0) return null;
                    const color = ROLE_COLOR[role] || '#4f46e5';
                    return (
                      <div key={role}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '10px 0 4px',
                          fontSize: 11, fontWeight: 700, letterSpacing: '.5px',
                          color, textTransform: 'uppercase',
                        }}>
                          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color }} />
                          {role === 'Student' ? 'Students' : role === 'Faculty' ? 'Faculty' : role === 'Mentor' ? 'Mentors' : 'HODs'}
                          <span style={{
                            background: `${color}15`, border: `1px solid ${color}30`,
                            borderRadius: 4, padding: '0 5px', fontSize: 10, fontWeight: 600,
                          }}>{users.length}</span>
                        </div>

                        {users.map(u => {
                          const selected = selMembers.some(m => m.id === u.id);
                          return (
                            <button
                              key={u.id} type="button"
                              onClick={() => toggleMember(u)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: selected ? `${color}10` : 'transparent',
                                transition: 'background .12s', marginBottom: 2,
                              }}
                            >
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                background: `${color}18`, border: `1px solid ${color}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 13, color,
                              }}>
                                {initials(u.fullName || u.rollNo || '?')}
                              </div>
                              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                <div style={{
                                  fontWeight: 600, fontSize: 13, color: 'var(--text-primary, #0f172a)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  marginBottom: 3,
                                }}>
                                  {u.fullName || u.rollNo}
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                  <RoleBadge role={u.role} />
                                  {u.year && <TagBadge label={`Y${u.year}`} type="year" />}
                                  {u.sectionId && <TagBadge label={`Sec ${u.sectionId}`} type="sec" />}
                                  {u.departmentId && <TagBadge label={u.departmentId} type="dept" />}
                                  {u.rollNo && <TagBadge label={u.rollNo} type="roll" />}
                                  {!u.rollNo && u.email && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>{u.email}</span>
                                  )}
                                </div>
                              </div>
                              <div style={{
                                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                border: selected ? 'none' : '1.5px solid var(--surface-border, #cbd5e1)',
                                background: selected ? color : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {selected && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '12px 20px', borderTop: '1px solid var(--surface-border, #e2e8f0)',
                display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--surface-raised, #ffffff)',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
                  {selMembers.length > 0 ? `${selMembers.length} member${selMembers.length > 1 ? 's' : ''} selected` : 'Select members'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={closeModal} style={{
                    padding: '8px 16px', borderRadius: 8,
                    border: '1px solid var(--surface-border, #cbd5e1)',
                    background: 'var(--surface-raised, #ffffff)', cursor: 'pointer', color: 'var(--text-secondary, #334155)', fontSize: 13,
                  }}>Cancel</button>
                  <button type="submit" disabled={saving || selMembers.length === 0} style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: selMembers.length > 0 ? '#4f46e5' : '#cbd5e1',
                    color: '#fff', cursor: saving || selMembers.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? 'Saving…' : modalMode === 'create' ? `Create Group (${selMembers.length})` : `Save Changes`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG ── */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface-raised, #ffffff)', border: '1px solid #fee2e2',
            borderRadius: 14, padding: '24px',
            maxWidth: 380, width: '100%',
            boxShadow: '0 20px 30px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary, #0f172a)', marginBottom: 6 }}>Delete Group?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', marginBottom: 18, lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{confirmDelete.thread?.groupName}"</strong>? This will permanently remove the group chat for all participants.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                padding: '8px 16px', borderRadius: 8,
                border: '1px solid var(--surface-border, #cbd5e1)', background: '#fff',
                cursor: 'pointer', color: 'var(--text-secondary, #334155)', fontSize: 13,
              }}>Cancel</button>
              <button onClick={() => deleteGroup(confirmDelete)} style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}>Delete Group</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTEXT MENU ── */}
      {ctxMenu && (
        <div
          style={{
            position: 'fixed',
            top: ctxMenu.y, left: ctxMenu.x,
            zIndex: 9998,
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--surface-border, #e2e8f0)',
            borderRadius: 10,
            padding: '4px 0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            minWidth: 150,
          }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => openEdit(ctxMenu.thread)} style={{
            width: '100%', textAlign: 'left', padding: '8px 14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-primary, #0f172a)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 500,
          }}>
            Edit Group
          </button>
          <div style={{ height: 1, background: 'var(--surface-border, #e2e8f0)', margin: '2px 0' }} />
          <button onClick={() => { setCtxMenu(null); setConfirmDelete(ctxMenu.thread); }} style={{
            width: '100%', textAlign: 'left', padding: '8px 14px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 500,
          }}>
            Delete Group
          </button>
        </div>
      )}

      {/* ═══════════════ MAIN LAYOUT ═══════════════ */}
      <div style={S.container}>

        {/* ── LEFT SIDEBAR — Group List ── */}
        <div style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #0f172a)' }}>Escalation Groups</div>
              {!isStudent && canCreateGroup && (
                <button onClick={openCreate} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  background: '#4f46e5', color: '#ffffff', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 12,
                  boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)',
                }}>
                  <span style={{ fontSize: 13 }}>+</span> New
                </button>
              )}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search groups…"
              style={S.searchInput}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: 13 }}>
                Loading groups…
              </div>
            ) : filteredThreads.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                <div style={{ color: 'var(--text-muted, #64748b)', fontSize: 12, lineHeight: 1.5 }}>
                  {search ? 'No matching groups.' : 'No groups found.'}
                  {!isStudent && !search && (
                    <div style={{ marginTop: 10 }}>
                      <button onClick={openCreate} style={{
                        padding: '6px 14px', borderRadius: 6,
                        background: '#e0e7ff', border: '1px solid #c7d2fe',
                        color: '#4338ca', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>Create Group</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              filteredThreads.map((t: any) => {
                const isActive = active?.thread?.id === t.thread?.id;
                const groupN = t.thread?.groupName || t.thread?.subjectCode || 'Group';
                const lastMsg = getLastMsg(t);
                const participants = getParticipants(t);
                const isManageable = canManage(t);
                return (
                  <div key={t.thread?.id} className="group-item-wrap" style={{ position: 'relative' }}>
                    <button
                      onClick={() => setActive(t)}
                      onContextMenu={isManageable ? (e) => {
                        e.preventDefault();
                        setCtxMenu({ x: e.clientX, y: e.clientY, thread: t });
                      } : undefined}
                      style={{
                        width: '100%', textAlign: 'left', padding: '12px 14px',
                        border: 'none', borderBottom: '1px solid var(--surface-border, #f1f5f9)',
                        cursor: 'pointer',
                        background: isActive ? '#e0e7ff' : 'transparent',
                        borderLeft: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                        transition: 'all .12s',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Avatar name={groupN} color="#4f46e5" size={38} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{
                              fontWeight: 600, fontSize: 13, color: isActive ? '#3730a3' : 'var(--text-primary, #0f172a)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '68%',
                            }}>{groupN}</div>
                            {t.lastMessage?.createdAt && (
                              <div style={{ fontSize: 10, color: isActive ? '#4338ca' : 'var(--text-muted, #64748b)', flexShrink: 0 }}>
                                {fmtTime(t.lastMessage.createdAt)}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontSize: 11.5, color: isActive ? '#4338ca' : 'var(--text-muted, #64748b)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2,
                          }}>
                            {lastMsg || (participants.slice(0, 3).map(p => p.name).join(', ')) || 'No messages yet'}
                          </div>
                        </div>
                      </div>
                    </button>
                    {isManageable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setCtxMenu({ x: rect.left - 140, y: rect.bottom + 4, thread: t });
                        }}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          width: 28, height: 28, borderRadius: '50%',
                          background: 'rgba(15, 23, 42, 0.06)',
                          border: '1px solid rgba(15, 23, 42, 0.1)',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#0f172a',
                          transition: 'all .15s',
                        }}
                        className="group-more-btn"
                        title="Group options"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="2.2" />
                          <circle cx="12" cy="12" r="2.2" />
                          <circle cx="12" cy="19" r="2.2" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANE — Active Chat ── */}
        <div style={S.mainPane}>
          {active ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '12px 18px',
                background: 'var(--surface-raised, #ffffff)',
                borderBottom: '1px solid var(--surface-border, #e2e8f0)',
                display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
              }}>
                <Avatar name={active.thread?.groupName || 'G'} color="#4f46e5" size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary, #0f172a)' }}>
                    {active.thread?.groupName || 'Group Chat'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 3 }}>
                    {getParticipants(active).slice(0, 5).map((p, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-secondary, #334155)', fontWeight: 500 }}>
                        {p.name}
                        <RoleBadge role={p.role} />
                      </span>
                    ))}
                    {getParticipants(active).length > 5 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted, #64748b)' }}>
                        +{getParticipants(active).length - 5} more
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {canManage(active) && (
                    <>
                      <button onClick={() => openEdit(active)} style={{
                        background: 'var(--surface-base, #f1f5f9)',
                        border: '1px solid var(--surface-border, #cbd5e1)',
                        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                        color: 'var(--text-primary, #0f172a)', fontSize: 12.5, fontWeight: 600,
                        transition: 'all .12s',
                      }}>
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete(active)} style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                        color: '#dc2626', fontSize: 12.5, fontWeight: 600,
                        transition: 'all .12s',
                      }}>
                        Delete
                      </button>
                    </>
                  )}
                  <button onClick={() => loadThreads(true)} style={{
                    background: 'var(--surface-base, #f1f5f9)',
                    border: '1px solid var(--surface-border, #cbd5e1)',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    color: 'var(--text-primary, #0f172a)', fontSize: 12.5, fontWeight: 600,
                    transition: 'all .12s',
                  }}>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Messages Inline Scroll Container */}
              <div
                ref={chatBodyRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: '#f8fafc',
                }}
              >
                {(!active.messages || active.messages.length === 0) ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-muted, #64748b)' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginBottom: 2 }}>No messages yet</div>
                      <div style={{ fontSize: 12 }}>Start the conversation below</div>
                    </div>
                  </div>
                ) : (active.messages || []).map((m: any, i: number) => {
                  const isOwn = m.senderRole?.toLowerCase() === userRole.toLowerCase();
                  const isSystem = m.senderRole === 'SYSTEM';
                  if (isSystem) return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                      <span style={{
                        background: '#e2e8f0', border: '1px solid #cbd5e1',
                        borderRadius: 99, padding: '3px 12px', fontSize: 11, color: '#475569', fontWeight: 500,
                      }}>{m.content}</span>
                    </div>
                  );
                  const senderColor = ROLE_COLOR[m.senderRole] || '#475569';
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isOwn ? 'flex-end' : 'flex-start',
                      marginBottom: 2,
                    }}>
                      {!isOwn && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 12, fontWeight: 700, marginLeft: 4, marginBottom: 3,
                          color: 'var(--text-primary, #0f172a)',
                        }}>
                          <span>{m.senderName}</span>
                          <RoleBadge role={m.senderRole} />
                        </div>
                      )}
                      <div style={{
                        maxWidth: '70%',
                        padding: '9px 14px',
                        borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: isOwn ? '#4f46e5' : '#ffffff',
                        color: isOwn ? '#ffffff' : '#0f172a',
                        border: isOwn ? 'none' : '1px solid #e2e8f0',
                        fontSize: 13.5, lineHeight: 1.45, wordBreak: 'break-word',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}>
                        {m.content}
                        <div style={{
                          fontSize: 10,
                          color: isOwn ? 'rgba(255,255,255,0.75)' : '#94a3b8',
                          textAlign: 'right', marginTop: 3,
                        }}>
                          {fmtTime(m.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMsg} style={{
                padding: '12px 16px',
                background: 'var(--surface-raised, #ffffff)',
                borderTop: '1px solid var(--surface-border, #e2e8f0)',
                display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Type a message…"
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: 24,
                    border: '1px solid var(--surface-border, #cbd5e1)',
                    background: 'var(--surface-base, #f8fafc)', color: 'var(--text-primary, #0f172a)', fontSize: 13.5, outline: 'none',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(e as any); }
                  }}
                />
                <button type="submit" disabled={!msg.trim() || sending} style={{
                  width: 40, height: 40, borderRadius: '50%', border: 'none',
                  background: msg.trim() ? '#4f46e5' : '#e2e8f0',
                  color: '#ffffff',
                  cursor: msg.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s', flexShrink: 0,
                  boxShadow: msg.trim() ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted, #64748b)' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#e0e7ff', border: '1px dashed #a5b4fc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              }}>💬</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary, #0f172a)', marginBottom: 4 }}>
                  Select an escalation group
                </div>
                <div style={{ fontSize: 13 }}>
                  {threads.length === 0 ? 'No escalation groups exist yet.' : 'Choose a group from the left menu'}
                </div>
              </div>
              {!isStudent && canCreateGroup && (
                <button onClick={openCreate} style={{
                  padding: '9px 20px', borderRadius: 8,
                  background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                }}>+ Create Group</button>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .group-item-wrap { position: relative; }
        .group-more-btn { opacity: 0 !important; transition: opacity .15s; }
        .group-item-wrap:hover .group-more-btn { opacity: 1 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
};
