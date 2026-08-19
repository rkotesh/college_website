import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogoHeader from '../components/LogoHeader';
import { EscalationsGroupChat } from '../components/EscalationsGroupChat';


interface FacultyDashboardProps {
  userSession: {
    role: string;
    email: string;
    fullName?: string;
    accessToken: string;
    isMentor?: boolean;
    departmentId?: string;
    departmentIds?: string[];
  };
  handleLogout: () => void;
}

type Tab =
  | 'overview'
  | 'faculty'
  | 'mentorship'
  | 'portfolios'
  | 'documents'
  | 'training'
  | 'escalations'
  | 'notifications'
  | 'directory'
  | 'broadcasts';

export default function FacultyDashboard({ userSession, handleLogout }: FacultyDashboardProps) {
  const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || (import.meta.env.DEV ? '' : 'https://ciet-erp.onrender.com');
  const token = userSession.accessToken;
  const userEmail = userSession.email;
  
  const getInitialTab = (): Tab => {
    const parts = window.location.pathname.split('/');
    const tabFromUrl = parts[parts.length - 1];
    const validTabs: Tab[] = [
      'overview', 'faculty', 'mentorship', 'portfolios', 'documents', 'training', 
      'escalations', 'notifications', 'directory', 'broadcasts'
    ];
    if (validTabs.includes(tabFromUrl as Tab)) {
      return tabFromUrl as Tab;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());

  // --- Injected User Directory State ---
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [dirSearchQuery, setDirSearchQuery] = useState('');
  const [dirCurrentPage, setDirCurrentPage] = useState(1);
  const [dirActiveModal, setDirActiveModal] = useState<'view' | 'edit' | null>(null);
  const [dirSelectedUser, setDirSelectedUser] = useState<any | null>(null);
  const dirUsersPerPage = 15;

  const [dirFormEmail, setDirFormEmail] = useState('');
  const [dirFormFullName, setDirFormFullName] = useState('');
  const [dirFormPhone, setDirFormPhone] = useState('');
  const [dirFormYear, setDirFormYear] = useState('');
  const [dirFormSectionId, setDirFormSectionId] = useState('');
  const [dirFormBatch, setDirFormBatch] = useState('');
  const [dirFormCgpa, setDirFormCgpa] = useState('0.0');
  const [dirFormAcademicStatus, setDirFormAcademicStatus] = useState('ACTIVE');
  const [dirFormRollNo, setDirFormRollNo] = useState('');

  // --- Injected Broadcast State ---
  const [notifTarget, setNotifTarget] = useState('AUDIENCE');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('SYSTEM');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifTargetRoles, setNotifTargetRoles] = useState<string[]>(['Student']);
  const [notifYearFilter, setNotifYearFilter] = useState<string>('ALL');
  const [notifDeptFilterAlert, setNotifDeptFilterAlert] = useState<string>('ALL');
  const [notifSectionFilter, setNotifSectionFilter] = useState<string>('ALL');
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);


  // Whenever activeTab changes, update history URL and title

  // --- Injected Functions ---
  const fetchDirectoryUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/directory`, {
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDirectoryUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditDirUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirSelectedUser) return;
    try {
      const payload: any = {
        email: dirFormEmail,
        fullName: dirFormFullName,
        phone: dirFormPhone,
      };
      if (dirSelectedUser.role === 'Student') {
        payload.year = dirFormYear;
        payload.sectionId = dirFormSectionId;
        payload.batch = dirFormBatch;
        payload.cgpa = dirFormCgpa;
        payload.academicStatus = dirFormAcademicStatus;
        payload.roll_no = dirFormRollNo;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/directory/${dirSelectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Update failed');
      alert('User updated successfully');
      setDirActiveModal(null);
      fetchDirectoryUsers();
    } catch (e) {
      alert('Error updating user');
    }
  };

  const openDirEditModal = (u: any) => {
    setDirSelectedUser(u);
    setDirFormEmail(u.email || '');
    setDirFormFullName(u.fullName || '');
    setDirFormPhone(u.phone || '');
    setDirFormRollNo(u.rollNo || '');
    setDirFormYear(u.year || '');
    setDirFormSectionId(u.sectionId || '');
    setDirFormBatch(u.batch || '');
    setDirFormCgpa(u.cgpa?.toString() || '0.0');
    setDirFormAcademicStatus(u.academicStatus || 'ACTIVE');
    setDirActiveModal('edit');
  };

  const fetchBroadcastHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/broadcasts/history`, {
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBroadcastHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return alert('Title and Message are required.');
    try {
      setSendingNotif(true);
      const payload: any = { title: notifTitle, message: notifMessage, type: notifType };
      if (notifTarget === 'AUDIENCE') {
        payload.targetRoles = notifTargetRoles;
        payload.year = notifYearFilter;
        payload.departmentId = notifDeptFilterAlert;
        payload.sectionId = notifSectionFilter;
      } else {
        payload.rollNo = notifTarget;
      }
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) { alert('Failed to send broadcast'); return; }
      const data = await res.json();
      alert(data.message);
      setNotifTitle('');
      setNotifMessage('');
      fetchBroadcastHistory();
    } catch (e) {
      alert('Error sending broadcast');
    } finally {
      setSendingNotif(false);
    }
  };

  const getStaffDeptKeys = (): string[] => {
    const keys: string[] = [];
    if (userSession.departmentIds) {
      userSession.departmentIds.forEach(d => {
        if (d) d.split(/[,;/]/).forEach(p => { if (p.trim()) keys.push(p.trim().toUpperCase()); });
      });
    }
    if (userSession.departmentId) {
      userSession.departmentId.split(/[,;/]/).forEach(p => { if (p.trim()) keys.push(p.trim().toUpperCase()); });
    }
    if (userSession.email) {
      const emailUpper = userSession.email.toUpperCase();
      if (emailUpper.includes('AIML') || emailUpper.includes('.AI@') || emailUpper.includes('CSM')) {
        keys.push('AIML', 'AI', 'CSM');
      } else if (emailUpper.includes('.CSE@') || emailUpper.includes('CSE')) {
        keys.push('CSE');
      } else if (emailUpper.includes('.ECE@') || emailUpper.includes('ECE')) {
        keys.push('ECE');
      } else if (emailUpper.includes('.IT@') || emailUpper.includes('IT')) {
        keys.push('IT');
      }
    }
    if (keys.includes('AI') || keys.includes('AIML') || keys.includes('CSM')) {
      keys.push('AI', 'AIML', 'CSM', 'CAI');
    }
    return Array.from(new Set(keys));
  };

  const isStudentInMyDept = (student: any): boolean => {
    const staffKeys = getStaffDeptKeys();
    if (staffKeys.length === 0) return true;
    const rollNo = (student.rollNo || student.email || '').toUpperCase();
    let studentDept = '';
    if (rollNo.includes('AIML') || rollNo.includes('CSM') || rollNo.includes('AI&ML')) studentDept = 'AIML';
    else if (rollNo.includes('CAI') || rollNo.includes('AI')) studentDept = 'AI';
    else if (rollNo.includes('CSE') || rollNo.includes('CS')) studentDept = 'CSE';
    else if (rollNo.includes('ECE') || rollNo.includes('EC')) studentDept = 'ECE';
    else if (rollNo.includes('EEE') || rollNo.includes('EE')) studentDept = 'EEE';
    else if (rollNo.includes('MECH') || rollNo.includes('ME')) studentDept = 'MECH';
    else if (rollNo.includes('CIVIL') || rollNo.includes('CE')) studentDept = 'CIVIL';
    else if (rollNo.includes('IT')) studentDept = 'IT';
    else if (student.departmentId) studentDept = student.departmentId.toUpperCase();

    if (studentDept) {
      return staffKeys.includes(studentDept);
    }
    return true;
  };

  const filteredDirUsers = directoryUsers.filter(u => {
    // Student Directory: only show students from this department
    if (u.role !== 'Student') return false;
    if (!isStudentInMyDept(u)) return false;
    if (dirSearchQuery) {
      const sq = dirSearchQuery.toLowerCase();
      if (!u.fullName?.toLowerCase().includes(sq) && 
          !u.email?.toLowerCase().includes(sq) &&
          !u.rollNo?.toLowerCase().includes(sq)) {
        return false;
      }
    }
    return true;
  });
  
  const dirTotalPages = Math.max(1, Math.ceil(filteredDirUsers.length / dirUsersPerPage));
  const displayedDirUsers = filteredDirUsers.slice((dirCurrentPage - 1) * dirUsersPerPage, dirCurrentPage * dirUsersPerPage);

  useEffect(() => {
    if (activeTab === 'directory') fetchDirectoryUsers();
    if (activeTab === 'broadcasts') fetchBroadcastHistory();
    if (activeTab === 'mentorship') fetchMentorMentees();
    if (activeTab === 'portfolios') fetchPortfolioStudents();
  }, [activeTab]);

  useEffect(() => {
    const isMentorUser = Boolean(userSession.isMentor || userSession.role === 'Mentor');
    const portalLabel = isMentorUser ? 'Faculty & Mentor Portal' : 'Faculty Portal';
    let tabLabel = '';
    switch (activeTab) {
      case 'overview': tabLabel = 'Overview'; break;
      case 'faculty': tabLabel = 'Faculty Members'; break;
      case 'mentorship': tabLabel = 'My Mentees'; break;
      case 'portfolios': tabLabel = 'Student Portfolios'; break;
      case 'documents': tabLabel = 'Curriculum Files'; break;
      case 'training': tabLabel = 'Trainings & Workshops'; break;
      case 'escalations': tabLabel = 'Escalation Chain'; break;
      case 'notifications': tabLabel = 'Notifications'; break;
      case 'directory': tabLabel = 'Student Directory'; break;
      case 'broadcasts': tabLabel = 'Broadcasts'; break;
      default: {
        const tabStr = activeTab as string;
        tabLabel = tabStr.charAt(0).toUpperCase() + tabStr.slice(1);
      }
    }
    
    document.title = `${tabLabel} | ${portalLabel} | CIET ERP`;
    
    const newPath = activeTab === 'overview' ? '/faculty-dashboard' : `/faculty-dashboard/${activeTab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [activeTab, userSession.isMentor, userSession.role]);

  // Sync activeTab when the back/forward button is clicked
  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split('/');
      const tabFromUrl = parts[parts.length - 1];
      const validTabs: Tab[] = [
        'overview', 'directory', 'mentorship', 'portfolios', 'documents', 'training',
        'escalations', 'notifications', 'broadcasts'
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
  const [department, setDepartment] = useState<any>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [meetingLogs, setMeetingLogs] = useState<any[]>([]);
  
  const [hodNotifications, setHodNotifications] = useState<any[]>([]);
  
  // HOD Manual Notification Form states
  const [hodNotifTarget, setHodNotifTarget] = useState('ALL');
  const [hodNotifType, setHodNotifType] = useState('SYSTEM');
  const [hodNotifTitle, setHodNotifTitle] = useState('');
  const [hodNotifMessage, setHodNotifMessage] = useState('');
  const [sendingHodNotif, setSendingHodNotif] = useState(false);
  const [submittingTraining, setSubmittingTraining] = useState(false);
  const [submittingAnn, setSubmittingAnn] = useState(false);
  const [submittingDoc, setSubmittingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  
  const [mentorMentees, setMentorMentees] = useState<any[]>([]);
  const [loadingMentees, setLoadingMentees] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState<any | null>(null);
  const [menteeNotes, setMenteeNotes] = useState<any[]>([]);
  const [newMenteeNote, setNewMenteeNote] = useState('');
  const [submittingMenteeNote, setSubmittingMenteeNote] = useState(false);

  // Student Public Portfolios state
  const [portfolioStudents, setPortfolioStudents] = useState<any[]>([]);
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioStatusFilter, setPortfolioStatusFilter] = useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');
  const [portfolioYearFilter, setPortfolioYearFilter] = useState('ALL');
  const [portfolioSectionFilter, setPortfolioSectionFilter] = useState('ALL');
  const [portfolioSelectedRolls, setPortfolioSelectedRolls] = useState<string[]>([]);
  const [copiedRoll, setCopiedRoll] = useState<string | null>(null);
  const [previewPortfolioSlug, setPreviewPortfolioSlug] = useState<string | null>(null);

  const filteredPortfolios = portfolioStudents.filter(s => {
    if (!isStudentInMyDept(s)) return false;
    if (portfolioStatusFilter === 'PUBLIC' && !s.isPublic) return false;
    if (portfolioStatusFilter === 'PRIVATE' && s.isPublic) return false;
    if (portfolioYearFilter !== 'ALL') {
      const yr = (s.year || '').toString();
      if (yr !== portfolioYearFilter) return false;
    }
    if (portfolioSectionFilter !== 'ALL') {
      const sec = (s.sectionId || '').toUpperCase();
      if (sec !== portfolioSectionFilter) return false;
    }
    if (portfolioSearch) {
      const q = portfolioSearch.toLowerCase();
      if (
        !s.fullName?.toLowerCase().includes(q) &&
        !s.rollNo?.toLowerCase().includes(q) &&
        !s.email?.toLowerCase().includes(q) &&
        !s.slug?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  // Auto-fetch mentees on mount when user is a mentor
  useEffect(() => {
    if (userSession.isMentor || userSession.role === 'Mentor') {
      fetchMentorMentees();
    }
  }, []);

  // Form states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dynamic departments & sections configured by Admin
  const [departments, setDepartments] = useState<{ code: string; name: string; sections: string[] }[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/portal/public/departments`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDepartments(data);
      })
      .catch(() => {});
  }, []);

  // Mentorship forms
  const [splitForm, setSplitForm] = useState({ batch: '2022-2026', sectionId: 'A', mentorAId: '', mentorBId: '' });
  const [manualForm, setManualForm] = useState({ mentorUserId: '', studentRollNos: [] as string[] });
  
  // Document upload form
  const [docForm, setDocForm] = useState({ title: '', docType: 'LESSON_PLAN', fileUrl: '', resourceUrl: '', subjectCode: '', semester: '1', academicYear: '2025-2026', targetYear: 'III', targetSection: 'A', validFrom: '' });
  
  // Training form
  const [trainingForm, setTrainingForm] = useState({ title: '', description: '', startDate: '', endDate: '', venue: '', registrationUrl: '', isActive: true, category: 'Technical' });
  
  // Announcement form
  const [annForm, setAnnForm] = useState({ title: '', content: '', resourceUrl: '' });

  // HOD Directory and User Detail Overlay states
  const [directorySearch, setDirectorySearch] = useState('');

  useEffect(() => {
    const mainEl = document.querySelector('.ds-main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [activeTab]);

  const [directoryTab, setDirectoryTab] = useState<'students' | 'faculty' | 'mentors'>('students');
  const [selectedDetailUser, setSelectedDetailUser] = useState<any | null>(null);
  const [detailUserData, setDetailUserData] = useState<any | null>(null);
  const [detailUserLoading, setDetailUserLoading] = useState(false);

  // Notifications dropdown
  // const [showNotifications, setShowNotifications] = useState(false);
  // const [notifications] = useState([
    // { id: 1, title: 'Accreditation Review', msg: 'NAAC Pre-Audit check is scheduled for next Monday.', time: '2 hours ago' }
  // ]);

  useEffect(() => {
    fetchBaseData();
  }, []);
  useEffect(() => {
    if (activeTab === 'notifications') {
      markNotificationsAsRead();
    }
  }, [activeTab]);
  const fetchBaseData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };
      
      const [
        scopeRes,
        facultyRes,
        docsRes,
        trainingsRes,
        announcementsRes,
        logsRes,
        notifRes,
        portalRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/hod/scope`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/faculty`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/documents`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/trainings`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/announcements`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/meeting-logs`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/notifications`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/portal/hod/dashboard`, { headers })
      ]);

      if (scopeRes.ok) setDepartment(await scopeRes.json());
      if (facultyRes.ok) setFacultyList(await facultyRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (trainingsRes.ok) setTrainings(await trainingsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
      if (logsRes.ok) setMeetingLogs(await logsRes.json());
      if (notifRes.ok) setHodNotifications(await notifRes.json());
      
      if (portalRes.ok) {
        const portalData = await portalRes.json();
        setStudentsList(portalData.students || []);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load HOD data.');
    } finally {
      setLoading(false);
    }
  };

  // Halves Split Action
  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/mentor/split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(splitForm)
      });
      if (!res.ok) throw new Error('Failed to split mentorship classes.');
      alert('Class halves split assignment completed successfully!');
      fetchBaseData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Manual Mentorship Action
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/mentor/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(manualForm)
      });
      if (!res.ok) throw new Error('Failed manual mentorship assignments.');
      alert('Selected students assigned successfully.');
      setManualForm({ mentorUserId: '', studentRollNos: [] });
      fetchBaseData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Document Upload Action
  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingDoc(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(docForm)
      });
      if (!res.ok) throw new Error('Failed to upload document.');
      alert('Document recorded successfully!');
      setDocForm({ title: '', docType: 'LESSON_PLAN', fileUrl: '', resourceUrl: '', subjectCode: '', semester: '1', academicYear: '2025-2026', targetYear: 'III', targetSection: 'A', validFrom: '' });
      fetchBaseData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingDoc(false);
    }
  };

  // Skill Course Listing Action
  const handleTrainingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingTraining(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/training`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(trainingForm)
      });
      if (!res.ok) throw new Error('Failed to save training program.');
      alert('Training program course created!');
      setTrainingForm({ title: '', description: '', startDate: '', endDate: '', venue: '', registrationUrl: '', isActive: true, category: 'Technical' });
      fetchBaseData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingTraining(false);
    }
  };

  // Announcement Action
  const handleAnnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAnn(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/announcement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(annForm)
      });
      if (!res.ok) throw new Error('Failed to post announcement.');
      alert('Announcement published to department students!');
      setAnnForm({ title: '', content: '', resourceUrl: '' });
      fetchBaseData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingAnn(false);
    }
  };




  const fetchUserDetailForHOD = async (targetUser: any) => {
    setSelectedDetailUser(targetUser);
    setDetailUserLoading(true);
    setDetailUserData(null);
    try {
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };
      if (targetUser.role === 'Student') {
        const res = await fetch(`${API_BASE_URL}/api/v1/hod/students/${targetUser.id}/dashboard`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDetailUserData(data);
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/v1/hod/staff/${targetUser.id}/profile`, { headers });
        if (res.ok) {
          const data = await res.json();
          setDetailUserData(data);
        }
      }
    } catch (err) {
      console.error('Failed to load user detail profile', err);
    } finally {
      setDetailUserLoading(false);
    }
  };

  const fetchMentorMentees = async () => {
    try {
      setLoadingMentees(true);
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/my-mentees`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMentorMentees(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load mentor mentees", err);
    } finally {
      setLoadingMentees(false);
    }
  };

  const fetchPortfolioStudents = async () => {
    try {
      setLoadingPortfolios(true);
      const headers = { 'Authorization': `Bearer ${userSession.accessToken}` };
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/all-students`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPortfolioStudents(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load department student portfolios", err);
    } finally {
      setLoadingPortfolios(false);
    }
  };

  const handleExportPortfoliosCSV = (studentsToExport: any[]) => {
    if (!studentsToExport || studentsToExport.length === 0) {
      alert('No students found to export.');
      return;
    }
    const origin = window.location.origin;
    const headers = ['Roll Number', 'Full Name', 'Email', 'Department', 'Year', 'Section', 'Batch', 'CGPA', 'Portfolio Status', 'Public Portfolio Link'];
    const rows = studentsToExport.map(s => {
      const isPub = Boolean(s.isPublic);
      const portUrl = isPub ? `${origin}/portfolio/${s.slug || s.rollNo}` : 'Private (Draft)';
      return [
        `"${s.rollNo || ''}"`,
        `"${(s.fullName || '').replace(/"/g, '""')}"`,
        `"${s.email || ''}"`,
        `"${s.departmentId || ''}"`,
        `"${s.year || ''}"`,
        `"${s.sectionId || ''}"`,
        `"${s.batch || ''}"`,
        `"${s.cgpa || '0.0'}"`,
        `"${isPub ? 'Public' : 'Private'}"`,
        `"${portUrl}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Department_Student_Portfolios_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyAllPortfolioLinks = (studentsToCopy: any[]) => {
    const origin = window.location.origin;
    const publicList = (studentsToCopy || []).filter(s => s.isPublic);
    if (publicList.length === 0) {
      alert('No active public portfolios in the current selection/filter.');
      return;
    }
    const text = publicList.map(s => `${s.rollNo} | ${s.fullName} — ${origin}/portfolio/${s.slug || s.rollNo}`).join('\n');
    navigator.clipboard.writeText(text);
    alert(`Copied ${publicList.length} student public portfolio links to clipboard!`);
  };

  const handleCopySinglePortfolioLink = (s: any) => {
    const origin = window.location.origin;
    const url = `${origin}/portfolio/${s.slug || s.rollNo}`;
    navigator.clipboard.writeText(url);
    setCopiedRoll(s.rollNo || s.id);
    setTimeout(() => setCopiedRoll(null), 2500);
  };

  const fetchMenteeNotes = async (rollNo: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/case-notes/${rollNo}`, {
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        setMenteeNotes(await res.json());
      }
    } catch (err) {
      console.error("Failed to load mentee case notes", err);
      setMenteeNotes([]);
    }
  };

  const handleAddMenteeNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenteeNote.trim() || !selectedMentee) return;
    try {
      setSubmittingMenteeNote(true);
      const rollNo = selectedMentee.profile?.rollNo;
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/case-notes/${rollNo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({ content: newMenteeNote })
      });
      if (res.ok) {
        const createdNote = await res.json();
        setMenteeNotes(prev => [createdNote, ...prev]);
        setNewMenteeNote('');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingMenteeNote(false);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/notifications/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        setHodNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const markSingleNotificationAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        setHodNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark single as read', err);
    }
  };

  const handleSendHODNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hodNotifTitle.trim() || !hodNotifMessage.trim()) {
      alert('Title and Message are required.');
      return;
    }
    try {
      setSendingHodNotif(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({
          rollNo: hodNotifTarget,
          title: hodNotifTitle,
          message: hodNotifMessage,
          type: hodNotifType
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to dispatch notification.');
      }
      alert('Departmental notification broadcast successfully!');
      setHodNotifTitle('');
      setHodNotifMessage('');
      fetchBaseData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingHodNotif(false);
    }
  };

  // Particles canvas re-used and styled to premium blue/indigo
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    interface Orb {
      x: number; y: number; vx: number; vy: number; r: number; alpha: number; dAlpha: number; isRed: boolean;
    }
    const orbs: Orb[] = [];
    for (let i = 0; i < 85; i++) {
      orbs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        dAlpha: (Math.random() - 0.5) * 0.015,
        isRed: Math.random() > 0.5
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      orbs.forEach((o) => {
        o.x += o.vx;
        o.y += o.vy;
        o.alpha += o.dAlpha;
        if (o.alpha > 0.8 || o.alpha < 0.1) o.dAlpha = -o.dAlpha;
        if (o.x < 0 || o.x > w) o.vx = -o.vx;
        if (o.y < 0 || o.y > h) o.vy = -o.vy;

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        const rgb = o.isRed ? '229, 57, 53' : '0, 0, 0';
        ctx.fillStyle = `rgba(${rgb}, ${Math.max(0.1, Math.min(o.alpha, 0.8))})`;
        ctx.fill();
      });

      // Draw connection lines (spiderweb net)
      for (let i = 0; i < orbs.length; i++) {
        for (let j = i + 1; j < orbs.length; j++) {
          const o1 = orbs[i];
          const o2 = orbs[j];
          const dx = o1.x - o2.x;
          const dy = o1.y - o2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 185) {
            const lineAlpha = 0.38 * (1 - dist / 185);
            ctx.beginPath();
            ctx.moveTo(o1.x, o1.y);
            ctx.lineTo(o2.x, o2.y);
            const isRedLine = o1.isRed || o2.isRed;
            ctx.strokeStyle = isRedLine ? `rgba(229, 57, 53, ${lineAlpha})` : `rgba(0, 0, 0, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 }
  };
  const pageTransition = { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const };

  if (loading) {
    return (
      <div className="ds-root" style={{ background: 'var(--ds-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ margin: '0 auto 16px', display: 'flex', justifyContent: 'center' }}>
            <LogoHeader imageStyle={{ height: '40px' }} />
          </div>
          <p style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 600 }}>Syncing Faculty Portal Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--surface-base)' }}>
      
      {/* Document View Modal */}
      {previewDoc && (() => {
        const fileUrl: string = previewDoc.fileUrl || previewDoc.resourceUrl || '';
        const ext = fileUrl.split('?')[0].split('.').pop()?.toLowerCase() || '';
        const isImage = ['png','jpg','jpeg','gif','webp'].includes(ext);
        const isPdf = ext === 'pdf';
        const isWord = ['doc','docx'].includes(ext);
        const isExcel = ['xls','xlsx'].includes(ext);
        const handleDownload = async () => {
          try {
            const res = await fetch(fileUrl, { headers: { 'Authorization': `Bearer ${userSession.accessToken}` } });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            a.download = previewDoc.title + (ext ? '.' + ext : '');
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          } catch {
            const a = document.createElement('a'); a.href = fileUrl; a.download = previewDoc.title;
            a.target = '_blank'; a.rel = 'noreferrer';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
          }
        };
        return (
          <div onClick={e => { if (e.target === e.currentTarget) setPreviewDoc(null); }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--ds-surface2,#1e1e2e)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, width: '100%', maxWidth: 880, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.55)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{previewDoc.title}</div>
                  {previewDoc.docType && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(239,68,68,.15)', color: 'var(--accent,#ef4444)', textTransform: 'uppercase' }}>{previewDoc.docType.replace(/_/g,' ')}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--accent,#ef4444)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </button>
                  <button onClick={() => setPreviewDoc(null)} style={{ width: 34, height: 34, borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,.12)', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✕</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 300 }}>
                {isPdf && <iframe src={fileUrl} title={previewDoc.title} style={{ width: '100%', height: '68vh', border: 'none' }} />}
                {isImage && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24, background: 'rgba(0,0,0,.25)' }}><img src={fileUrl} alt={previewDoc.title} style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: 10, objectFit: 'contain' }} /></div>}
                {(isWord || isExcel || (!isPdf && !isImage)) && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 30px', gap: 18 }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--accent,#ef4444)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 8 }}>{isWord ? 'Word Document' : isExcel ? 'Excel Spreadsheet' : 'File'}</div><p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Preview not available. Click <strong>Download</strong> to open the file.</p></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Responsive Layout Styles */}
      <style>{`
        .fac-desktop-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--surface-raised);
          border-right: 1px solid var(--surface-border);
          padding: 20px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }
        .fac-mobile-bottom-nav {
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
        .fac-mobile-bottom-nav::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .fac-desktop-sidebar { display: none !important; }
          .fac-mobile-bottom-nav { display: flex !important; }
          .fac-main-area { padding-bottom: 90px !important; }
        }
      `}</style>
      {/* Topbar with Official CIET LogoHeader */}
      <header className="admin-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--surface-raised)', borderBottom: '1px solid var(--surface-border)', flexWrap: 'wrap', gap: '12px' }}>
        <div className="admin-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LogoHeader imageStyle={{ height: '36px' }} />
          <div className="topbar-divider" style={{ height: '24px', width: '1px', background: 'var(--surface-border)' }}></div>
          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            {(userSession.isMentor || userSession.role === 'Mentor') ? 'Faculty & Mentor Portal' : 'Faculty Portal'}
            {' — '}
            {activeTab === 'overview' ? 'Overview' :
             activeTab === 'directory' ? 'Student Directory' :
             activeTab === 'mentorship' ? 'My Mentees' :
             activeTab === 'documents' ? 'Curriculum Files' :
             activeTab === 'training' ? 'Trainings & Workshops' :
             activeTab === 'escalations' ? 'Escalation Chain' :
             activeTab === 'broadcasts' ? 'Broadcasts' :
             activeTab === 'notifications' ? 'Notifications' :
             activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </span>
        </div>
        <div className="admin-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {userSession.fullName || userSession.email}
          </span>
          <span className="role-badge" style={{ padding: '3px 10px', borderRadius: '12px', background: 'var(--accent-subtle)', color: 'var(--accent)', fontSize: '11.5px', fontWeight: 800 }}>
            {(userSession.isMentor || userSession.role === 'Mentor') ? 'Faculty & Mentor' : 'Faculty'}
          </span>
          <div className="status-chip">
            <div className="led green"></div>
            Live
          </div>
          <button onClick={handleLogout} className="btn-topbar danger">Sign Out</button>
        </div>
      </header>

      {/* Main Body: sidebar + content */}
      <div className="admin-body" style={{ flex: 1, display: 'flex', flexDirection: 'row', width: '100%' }}>
        {/* Desktop Sidebar */}
        <aside className="fac-desktop-sidebar">
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingLeft: '8px' }}>Navigation</div>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', paddingBottom: '4px', paddingLeft: '8px', marginBottom: '2px' }}>Operations</div>

          {[
            { id: 'overview', label: 'Department Overview', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
            { id: 'directory', label: 'Student Directory', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            ...(Boolean(userSession.isMentor || userSession.role === 'Mentor' || (mentorMentees && mentorMentees.length > 0)) ? [{ id: 'mentorship', label: `My Mentees${mentorMentees.length > 0 ? ` (${mentorMentees.length})` : ''}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }] : []),
            { id: 'portfolios', label: 'Student Portfolios', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg> },
            { id: 'documents', label: 'Curriculum Files', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); if (tab.id === 'directory') fetchDirectoryUsers(); if (tab.id === 'mentorship') fetchMentorMentees(); if (tab.id === 'portfolios') fetchPortfolioStudents(); if (tab.id === 'broadcasts') fetchBroadcastHistory(); }} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s ease', background: activeTab === tab.id ? 'var(--accent-subtle)' : 'transparent', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-primary)', borderLeft: activeTab === tab.id ? '3px solid var(--accent)' : '3px solid transparent' }}>{tab.icon}{tab.label}</button>
          ))}

          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 0 4px 8px', marginTop: '8px' }}>Development & Outreach</div>

          {[
            { id: 'training', label: 'Trainings & Workshops', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
            { id: 'broadcasts', label: 'Broadcasts', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
            { id: 'escalations', label: 'Escalation Chain', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
          ].map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as Tab); if (tab.id === 'broadcasts') fetchBroadcastHistory(); }} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s ease', background: activeTab === tab.id ? 'var(--accent-subtle)' : 'transparent', color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-primary)', borderLeft: activeTab === tab.id ? '3px solid var(--accent)' : '3px solid transparent' }}>{tab.icon}{tab.label}</button>
          ))}

          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 0 4px 8px', marginTop: '8px' }}>Account</div>

          <button onClick={() => setActiveTab('notifications')} style={{ padding: '10px 14px', borderRadius: 'var(--r2)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.15s ease', background: activeTab === 'notifications' ? 'var(--accent-subtle)' : 'transparent', color: activeTab === 'notifications' ? 'var(--accent)' : 'var(--text-primary)', borderLeft: activeTab === 'notifications' ? '3px solid var(--accent)' : '3px solid transparent' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Notifications
            {hodNotifications.filter(n => !n.read).length > 0 && <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px' }}>{hodNotifications.filter(n => !n.read).length}</span>}
          </button>


          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--surface-border)' }}>
            <button onClick={handleLogout} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--r2)', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'transparent', color: 'var(--danger)' }}>Sign Out</button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="admin-main fac-main-area" style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div className="admin-main-content">
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>{error}</span>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="admin-page" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              
              {/* TAB OVERVIEW */}
              
              {activeTab === 'directory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="admin-view-header">
                    <h2>Student Directory</h2>
                    <p>View and manage students within your department</p>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="toolbar-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      className="search-input"
                      style={{ flex: '1 1 260px', minWidth: '220px', padding: '9px 14px', borderRadius: '8px', fontSize: '13px' }}
                      placeholder="Search student by name, email, or roll no..." 
                      value={dirSearchQuery} 
                      onChange={e => setDirSearchQuery(e.target.value)} 
                    />
                  </div>

                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Details</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedDirUsers.map((u: any) => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '14px' }}>{u.fullName}</span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</span>
                              {u.role === 'Student' && u.rollNo && (
                                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600' }}>{u.rollNo}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge-pill outline">{u.role}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '13px' }}>
                              {u.departmentIds?.join(', ') || u.departmentId || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {u.isActive ? (
                              <span className="badge-pill success">Active</span>
                            ) : (
                              <span className="badge-pill danger">Inactive</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button className="btn-row-action" onClick={() => { setDirSelectedUser(u); setDirActiveModal('view'); }}>
                                View
                              </button>
                              <button className="btn-row-action" onClick={() => openDirEditModal(u)}>
                                Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {displayedDirUsers.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>No users found matching your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                  
                  {/* Pagination */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
                    <button className="btn-action secondary" disabled={dirCurrentPage === 1} onClick={() => setDirCurrentPage(prev => Math.max(1, prev - 1))}>Previous</button>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Page {dirCurrentPage} of {dirTotalPages}</span>
                    <button className="btn-action secondary" disabled={dirCurrentPage === dirTotalPages} onClick={() => setDirCurrentPage(prev => Math.min(dirTotalPages, prev + 1))}>Next</button>
                  </div>
                </div>
              )}


              {activeTab === 'broadcasts' && (
                <>
                  <div className="admin-view-header">
                    <h2>Department Broadcast Alerts</h2>
                    <p>Send high-priority manual notifications to students or staff in your department</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '24px' }}>
                      <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Audience Mode</label>
                          <select className="filter-select" value={notifTarget === 'AUDIENCE' ? 'AUDIENCE' : notifTarget === 'ALL' ? 'ALL' : 'SPECIFIC'} onChange={e => setNotifTarget(e.target.value === 'AUDIENCE' ? 'AUDIENCE' : e.target.value === 'ALL' ? 'ALL' : '')} style={{ padding: '10px', fontSize: '13px' }}>
                            <option value="AUDIENCE">Targeted Audience (Roles, Dept, Year, Section)</option>
                            <option value="SPECIFIC">Single Roll No / Staff Email</option>
                          </select>
                        </div>

                        {notifTarget === 'AUDIENCE' && (
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target Roles</label>
                              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {['Student', 'Faculty', 'Mentor'].map(role => {
                                  const isChecked = notifTargetRoles.includes(role);
                                  return (
                                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: isChecked ? '700' : '500', color: isChecked ? 'var(--accent)' : 'var(--text-primary)' }}>
                                      <input type="checkbox" checked={isChecked} onChange={(e) => {
                                        if (e.target.checked) setNotifTargetRoles([...notifTargetRoles, role]);
                                        else setNotifTargetRoles(notifTargetRoles.filter(r => r !== role));
                                      }} /> {role}s
                                    </label>
                                  );
                                })}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>Department</label>
                                <select className="filter-select" value={notifDeptFilterAlert} onChange={e => setNotifDeptFilterAlert(e.target.value)} style={{ padding: '8px', fontSize: '12.5px' }}>
                                  <option value="ALL">All Associated Depts</option>
                                  <option value="CSE">CSE</option><option value="AI">AI</option><option value="AIML">AIML</option><option value="ECE">ECE</option><option value="IT">IT</option>
                                </select>
                              </div>
                              {notifTargetRoles.includes('Student') && (
                                <>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>Academic Year</label>
                                    <select className="filter-select" value={notifYearFilter} onChange={e => setNotifYearFilter(e.target.value)} style={{ padding: '8px', fontSize: '12.5px' }}>
                                      <option value="ALL">All Academic Years</option><option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option>
                                    </select>
                                  </div>
                                  <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-secondary)' }}>Section</label>
                                    <select className="filter-select" value={notifSectionFilter} onChange={e => setNotifSectionFilter(e.target.value)} style={{ padding: '8px', fontSize: '12.5px' }}>
                                      <option value="ALL">All Sections</option>
                                      {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {notifTarget !== 'ALL' && notifTarget !== 'AUDIENCE' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target Roll No / Staff Email</label>
                            <input type="text" className="form-input" placeholder="e.g. Y23CSM051" value={notifTarget} onChange={e => setNotifTarget(e.target.value)} required />
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alert Type</label>
                          <select className="filter-select" value={notifType} onChange={e => setNotifType(e.target.value)} style={{ padding: '10px', fontSize: '13px' }}>
                            <option value="SYSTEM">System Announcement</option><option value="ACADEMIC">Academic</option><option value="PLACEMENT">Placement Training</option><option value="VERIFICATION">Verification Pending</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alert Title</label>
                          <input type="text" className="form-input" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required placeholder="e.g. Urgent: Placement Drive Update" />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Message Body</label>
                          <textarea className="form-input" value={notifMessage} onChange={e => setNotifMessage(e.target.value)} required style={{ minHeight: '120px', resize: 'vertical' }} placeholder="Enter the detailed announcement..." />
                        </div>

                        <button type="submit" className="btn-action primary" disabled={sendingNotif} style={{ padding: '12px', fontSize: '14px', fontWeight: '600', marginTop: '8px' }}>
                          {sendingNotif ? 'Broadcasting...' : 'Send Broadcast Alert'}
                        </button>
                      </form>
                    </div>

                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Broadcast History</h3>
                      {broadcastHistory.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No broadcasts sent yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '700px', overflowY: 'auto', paddingRight: '8px' }}>
                          {broadcastHistory.map((log: any) => (
                            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--surface-border)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{log.title}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  Sent by {log.senderName} • {new Date(log.createdAt).toLocaleString()} • {log.recipientCount} recipients
                                </span>
                              </div>
                              <button className="btn-row-action" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => { setSelectedBroadcast(log); setShowBroadcastModal(true); }}>
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

{activeTab === 'overview' && (
                <div style={{ display: 'flex', gap: '20px', flex: 1, flexDirection: 'row' }}>
                  {/* Left Column: Active Directory */}
                  <div style={{ flex: 1.5, background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Department Active Directory</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Resolved scope: {department?.name || 'Computer Science & Engineering'} ({department?.code || 'CSE'})</p>
                      </div>
                      
                      {/* Search Bar */}
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Search directory..."
                        value={directorySearch}
                        onChange={e => setDirectorySearch(e.target.value)}
                        style={{ maxWidth: '240px', padding: '8px 14px', fontSize: '12.5px' }}
                      />
                    </div>

                    {/* Directory Categories Tabs */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '10px' }}>
                      {(['students', 'faculty', 'mentors'] as const).map((cat) => {
                        const isSelected = directoryTab === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setDirectoryTab(cat)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: isSelected ? 'var(--accent)' : 'transparent',
                              color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* Directory Listings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '500px' }}>
                      {directoryTab === 'students' && (() => {
                        const filtered = studentsList.filter(s => 
                          (s.user?.fullName || '').toLowerCase().includes(directorySearch.toLowerCase()) ||
                          (s.profile?.rollNo || '').toLowerCase().includes(directorySearch.toLowerCase())
                        );
                        if (filtered.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No students found matching your criteria</p>;
                        return filtered.map((s: any) => (
                          <div key={s.user?.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', overflow: 'hidden' }}>
                                {s.user?.photoUrl ? (
                                  <img src={`${API_BASE_URL}${s.user.photoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  s.user?.fullName?.slice(0, 1)?.toUpperCase() || 'S'
                                )}
                              </div>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{s.user?.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Roll No: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.profile?.rollNo}</span> &nbsp;|&nbsp; Batch: {s.profile?.batch}
                                </div>
                              </div>
                            </div>
                            <button
                              className="btn-action secondary"
                              onClick={() => fetchUserDetailForHOD({ id: s.user?.id, fullName: s.user?.fullName, email: s.user?.email, role: 'Student' })}
                              style={{ padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View Profile
                            </button>
                          </div>
                        ));
                      })()}

                      {directoryTab === 'faculty' && (() => {
                        const filtered = facultyList.filter(f => 
                          f.role === 'Faculty' &&
                          (f.fullName || '').toLowerCase().includes(directorySearch.toLowerCase())
                        );
                        if (filtered.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No faculty members found</p>;
                        return filtered.map((f: any) => (
                          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', overflow: 'hidden' }}>
                                {f.photoUrl ? (
                                  <img src={`${API_BASE_URL}${f.photoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  f.fullName?.slice(0, 1)?.toUpperCase() || 'F'
                                )}
                              </div>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{f.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Email: {f.email}</div>
                              </div>
                            </div>
                            <button
                              className="btn-action secondary"
                              onClick={() => fetchUserDetailForHOD({ id: f.id, fullName: f.fullName, email: f.email, role: 'Faculty' })}
                              style={{ padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View Workload
                            </button>
                          </div>
                        ));
                      })()}

                      {directoryTab === 'mentors' && (() => {
                        const filtered = facultyList.filter(f => 
                          f.role === 'Mentor' &&
                          (f.fullName || '').toLowerCase().includes(directorySearch.toLowerCase())
                        );
                        if (filtered.length === 0) return <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No mentors found</p>;
                        return filtered.map((m: any) => (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', overflow: 'hidden' }}>
                                {m.photoUrl ? (
                                  <img src={`${API_BASE_URL}${m.photoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  m.fullName?.slice(0, 1)?.toUpperCase() || 'M'
                                )}
                              </div>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{m.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Email: {m.email}</div>
                              </div>
                            </div>
                            <button
                              className="btn-action secondary"
                              onClick={() => fetchUserDetailForHOD({ id: m.id, fullName: m.fullName, email: m.email, role: 'Mentor' })}
                              style={{ padding: '6px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              View Mentees
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Feeds & Updates */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Widget 1: Recently Updated Curriculum Library */}
                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                         Recently Updated Curriculum Library
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {documents.slice(0, 3).map(doc => (
                          <div key={doc.id} style={{ padding: '12px', background: 'var(--surface-overlay)', borderRadius: '10px', border: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {doc.docType.replace('_', ' ')}
                              </div>
                              <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{doc.title}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Target: {doc.targetYear} Year Sec-{doc.targetSection}</div>
                            </div>
                            <button onClick={() => setPreviewDoc(doc)} style={{ textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', fontSize: '11.5px', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              View
                            </button>
                          </div>
                        ))}
                        {documents.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No documents uploaded yet</p>}
                      </div>
                    </div>

                    {/* Widget 2: Recently Published Announcements */}
                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                         Recently Published Announcements
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {announcements.slice(0, 3).map(ann => (
                          <div key={ann.id} style={{ padding: '12px', background: 'var(--surface-overlay)', borderRadius: '10px', border: '1px solid var(--surface-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ann.title}</strong>
                              <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>{ann.content}</p>
                            {ann.resourceUrl && (
                              <a href={ann.resourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', marginTop: '6px', fontWeight: 600 }}>
                                Reference Attachment ↗
                              </a>
                            )}
                          </div>
                        ))}
                        {announcements.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>No announcements published yet</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB FACULTY WORKLOAD */}
              {activeTab === 'faculty' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Faculty List & Workload Monitoring</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Review assigned courses, teaching hours, and active mentorship allocations of department faculty.</p>
                  </div>

                  <div className="admin-card data-table-wrapper" style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', overflow: 'hidden' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-overlay)', textAlign: 'left', borderBottom: '1px solid var(--surface-border)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Name</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Role</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Subjects Taught</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Active Mentorship Group</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>Mentees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facultyList.map((f: any) => (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                            <td style={{ padding: '16px', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{f.fullName}</td>
                            <td style={{ padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--surface-overlay)', fontSize: '10.5px', fontWeight: 700 }}>{f.role}</span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '13.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>{f.subjectCount} Subjects</td>
                            <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              <span style={{ color: f.menteesCount > 0 ? '#3b82f6' : 'var(--text-muted)', fontWeight: 700 }}>{f.mentorRange}</span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 800, textAlign: 'center', fontFamily: 'var(--ds-font-mono)' }}>{f.menteesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB MENTORSHIP CONTROL PANEL / MY MENTEES */}
              {activeTab === 'mentorship' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {userSession.role === 'HOD' ? (
                    <>
                      <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Mentorship Assignment Control Panel</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Assign faculty mentors to department student cohorts manually or split them into half classes.</p>
                      </div>

                      {/* Halves split block */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Class Halves Split Assignment</h3>
                          <form onSubmit={handleSplitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="admin-form-group">
                              <label className="admin-label">Batch & Section</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="filter-select" value={splitForm.batch} onChange={e => setSplitForm({ ...splitForm, batch: e.target.value })} style={{ flex: 1 }}>
                                  <option value="2022-2026">2022-2026 (IV Year)</option>
                                  <option value="2023-2027">2023-2027 (III Year)</option>
                                </select>
                                <select className="filter-select" value={splitForm.sectionId} onChange={e => setSplitForm({ ...splitForm, sectionId: e.target.value })} style={{ width: '80px' }}>
                                  {departments.flatMap(d => d.sections || []).length > 0
                                    ? Array.from(new Set(departments.flatMap(d => d.sections || []))).map(sec => <option key={sec} value={sec}>{sec}</option>)
                                    : ['A', 'B', 'C'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-label">Mentor A (1st Half)</label>
                              <select className="filter-select" required value={splitForm.mentorAId} onChange={e => setSplitForm({ ...splitForm, mentorAId: e.target.value })}>
                                <option value="">Select Mentor A...</option>
                                {facultyList.map(f => (
                                  <option key={f.id} value={f.id}>{f.fullName}</option>
                                ))}
                              </select>
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-label">Mentor B (2nd Half)</label>
                              <select className="filter-select" required value={splitForm.mentorBId} onChange={e => setSplitForm({ ...splitForm, mentorBId: e.target.value })}>
                                <option value="">Select Mentor B...</option>
                                {facultyList.map(f => (
                                  <option key={f.id} value={f.id}>{f.fullName}</option>
                                ))}
                              </select>
                            </div>

                            <button type="submit" className="btn-action primary" style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Run Splits &amp; Assign</button>
                          </form>
                        </div>

                        {/* Manual checkbox block */}
                        <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Manual Mentorship Assignment</h3>
                          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div className="admin-form-group">
                              <label className="admin-label">Choose Mentor</label>
                              <select className="filter-select" required value={manualForm.mentorUserId} onChange={e => setManualForm({ ...manualForm, mentorUserId: e.target.value })}>
                                <option value="">Select Mentor...</option>
                                {facultyList.map(f => (
                                  <option key={f.id} value={f.id}>{f.fullName}</option>
                                ))}
                              </select>
                            </div>

                            <div className="admin-form-group">
                              <label className="admin-label">Select Student Mentees</label>
                              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '10px', background: 'var(--surface-overlay)' }}>
                                {studentsList.map(item => (
                                  <label key={item.profile.rollNo} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', padding: '4px 0', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={manualForm.studentRollNos.includes(item.profile.rollNo)}
                                      onChange={e => {
                                        const checked = e.target.checked;
                                        setManualForm(prev => ({
                                          ...prev,
                                          studentRollNos: checked 
                                            ? [...prev.studentRollNos, item.profile.rollNo]
                                            : prev.studentRollNos.filter(r => r !== item.profile.rollNo)
                                        }));
                                      }}
                                    />
                                    {item.user.fullName} ({item.profile.rollNo})
                                  </label>
                                ))}
                              </div>
                            </div>

                            <button type="submit" className="btn-action primary" style={{ padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Assign Selected</button>
                          </form>
                        </div>
                      </div>

                      {/* Active logs summary of Assignments */}
                      <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Active Mentorship Meeting Logs</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                          {meetingLogs.map(log => (
                            <div key={log.id} style={{ padding: '12px', background: 'var(--surface-overlay)', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                <span>Student: {log.rollNo}</span>
                                <span>{log.meetingDate}</span>
                              </div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                                <strong>Discussed:</strong> {log.topicsDiscussed} | <strong>Concerns:</strong> {log.concerns}
                              </p>
                            </div>
                          ))}
                          {meetingLogs.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No session logs reported for this academic year.</p>}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* MENTOR MENTEES DIRECTORY VIEW */
                    <div style={{ display: 'grid', gridTemplateColumns: selectedMentee ? '1.2fr 0.8fr' : '1fr', gap: '20px', alignItems: 'start' }}>
                      
                      {/* Left Column: Mentees List */}
                      <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>My Assigned Mentees</h2>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Track academic standing, results, and log confidential counseling case notes for your assigned students.</p>
                        </div>

                        {loadingMentees ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading mentees list...</div>
                        ) : mentorMentees.length === 0 ? (
                          <div style={{ padding: '40px', background: 'var(--surface-overlay)', border: '1px dashed var(--surface-border)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No student mentees are assigned to you for the current academic year.
                          </div>
                        ) : (
                          <div className="data-table-wrapper" style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: 'var(--surface-overlay)', textAlign: 'left', borderBottom: '1px solid var(--surface-border)' }}>
                                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Roll Number</th>
                                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Name</th>
                                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>Batch &amp; Section</th>
                                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>CGPA</th>
                                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mentorMentees.map((m: any) => {
                                  const isSelected = selectedMentee?.profile?.rollNo === m.profile?.rollNo;
                                  return (
                                    <tr key={m.profile?.rollNo} style={{ borderBottom: '1px solid var(--surface-border)', background: isSelected ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                                      <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--ds-font-mono)' }}>{m.profile?.rollNo}</td>
                                      <td style={{ padding: '14px 16px', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{m.user?.fullName}</td>
                                      <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>{m.profile?.batch} - Sec {m.profile?.sectionId || 'A'}</td>
                                      <td style={{ padding: '14px 16px', fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 800, textAlign: 'center' }}>{m.profile?.cgpa || '0.0'}</td>
                                      <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        <button 
                                          onClick={() => {
                                            setSelectedMentee(m);
                                            fetchMenteeNotes(m.profile?.rollNo);
                                          }}
                                          className="btn-action secondary"
                                        >
                                          Counsel Notes
                                        </button>
                                        <button 
                                          onClick={() => fetchUserDetailForHOD(m.user)}
                                          className="btn-action secondary"
                                        >
                                          View Profile
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Right Column: counseling session case notes for selected mentee */}
                      {selectedMentee && (
                        <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Counseling Log</h3>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Student: {selectedMentee.user?.fullName} ({selectedMentee.profile?.rollNo})</span>
                            </div>
                            <button onClick={() => setSelectedMentee(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>✕ Close</button>
                          </div>

                          <form onSubmit={handleAddMenteeNote} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <textarea
                              className="form-input"
                              rows={3}
                              required
                              value={newMenteeNote}
                              onChange={e => setNewMenteeNote(e.target.value)}
                              placeholder="Write confidential mentoring remarks, student concerns, or performance reviews..."
                              style={{ fontSize: '12.5px', resize: 'vertical' }}
                            />
                            <button 
                              type="submit" 
                              disabled={submittingMenteeNote} 
                              className="btn-action primary" 
                              style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                            >
                              {submittingMenteeNote ? 'Saving Note...' : 'Save Private Case Note'}
                            </button>
                          </form>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '300px', marginTop: '10px' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Counseling Log History</h4>
                            {menteeNotes.length === 0 ? (
                              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', margin: 0 }}>No counseling sessions logged for this student.</p>
                            ) : (
                              menteeNotes.map((note: any) => (
                                <div key={note.id} style={{ padding: '10px', background: 'var(--surface-overlay)', borderRadius: '8px', borderLeft: '3.5px solid #10b981' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                    <span>By: {note.authorRole}</span>
                                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>{note.content}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {/* TAB STUDENT PUBLIC PORTFOLIOS */}
              {activeTab === 'portfolios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Header Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '24px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-subtle)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="13" y2="11"/></svg>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
                          Department Student Portfolios
                        </h2>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '750px', lineHeight: 1.5 }}>
                        Browse, inspect verified credentials, and export public portfolio links for all students in your department. These public links can be shared directly with placement recruiters and industry partners.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        onClick={() => handleCopyAllPortfolioLinks(filteredPortfolios)}
                        className="btn-action secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '12.5px', fontWeight: 700 }}
                        title="Copy all active public portfolio links to clipboard"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy Public Links ({filteredPortfolios.filter(s => s.isPublic).length})
                      </button>

                      <button
                        onClick={() => handleExportPortfoliosCSV(portfolioSelectedRolls.length > 0 
                          ? filteredPortfolios.filter(s => portfolioSelectedRolls.includes(s.rollNo || s.id))
                          : filteredPortfolios
                        )}
                        className="btn-action primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '12.5px', fontWeight: 700 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        {portfolioSelectedRolls.length > 0 ? `Export Selected (${portfolioSelectedRolls.length})` : 'Export CSV Report'}
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department Students</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{portfolioStudents.length}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Enrolled</span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Public Portfolios</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 900, color: '#10b981', fontFamily: 'var(--font-display)' }}>
                          {portfolioStudents.filter(s => s.isPublic).length}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          ({portfolioStudents.length > 0 ? Math.round((portfolioStudents.filter(s => s.isPublic).length / portfolioStudents.length) * 100) : 0}% Active)
                        </span>
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '14px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Private (Draft)</span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>
                          {portfolioStudents.filter(s => !s.isPublic).length}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Students</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '14px', padding: '14px 18px' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search by student name, roll number, or slug..."
                      value={portfolioSearch}
                      onChange={e => setPortfolioSearch(e.target.value)}
                      style={{ flex: '1 1 260px', minWidth: '220px', padding: '9px 14px', fontSize: '13px' }}
                    />

                    <select
                      className="filter-select"
                      value={portfolioStatusFilter}
                      onChange={e => setPortfolioStatusFilter(e.target.value as any)}
                      style={{ padding: '8px 12px', fontSize: '12.5px', minWidth: '140px' }}
                    >
                      <option value="ALL">All Visibility (All)</option>
                      <option value="PUBLIC">🟢 Live Public Only</option>
                      <option value="PRIVATE">🔒 Private (Draft)</option>
                    </select>

                    <select
                      className="filter-select"
                      value={portfolioYearFilter}
                      onChange={e => setPortfolioYearFilter(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12.5px', minWidth: '120px' }}
                    >
                      <option value="ALL">All Years</option>
                      <option value="I">1st Year (I)</option>
                      <option value="II">2nd Year (II)</option>
                      <option value="III">3rd Year (III)</option>
                      <option value="IV">4th Year (IV)</option>
                    </select>

                    <select
                      className="filter-select"
                      value={portfolioSectionFilter}
                      onChange={e => setPortfolioSectionFilter(e.target.value)}
                      style={{ padding: '8px 12px', fontSize: '12.5px', minWidth: '120px' }}
                    >
                      <option value="ALL">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>

                    {(portfolioSearch || portfolioStatusFilter !== 'ALL' || portfolioYearFilter !== 'ALL' || portfolioSectionFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setPortfolioSearch('');
                          setPortfolioStatusFilter('ALL');
                          setPortfolioYearFilter('ALL');
                          setPortfolioSectionFilter('ALL');
                        }}
                        className="btn-action secondary"
                        style={{ padding: '8px 12px', fontSize: '12px' }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Table View */}
                  <div className="admin-card data-table-wrapper" style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', overflow: 'hidden' }}>
                    {loadingPortfolios ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Loading department student portfolios...
                      </div>
                    ) : filteredPortfolios.length === 0 ? (
                      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', opacity: 0.4 }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>No Student Portfolios Found</h3>
                        <p style={{ fontSize: '13px', margin: 0 }}>No student public profiles match your current search and filters.</p>
                      </div>
                    ) : (
                      <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-overlay)', textAlign: 'left', borderBottom: '1px solid var(--surface-border)' }}>
                            <th style={{ padding: '12px 16px', width: '40px' }}>
                              <input
                                type="checkbox"
                                checked={filteredPortfolios.length > 0 && portfolioSelectedRolls.length === filteredPortfolios.length}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setPortfolioSelectedRolls(filteredPortfolios.map(s => s.rollNo || s.id));
                                  } else {
                                    setPortfolioSelectedRolls([]);
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </th>
                            <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student</th>
                            <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Roll Number</th>
                            <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Batch &amp; Section</th>
                            <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CGPA</th>
                            <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visibility</th>
                            <th style={{ padding: '12px 16px', fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Public Portfolio Link &amp; Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPortfolios.map((s: any) => {
                            const rollKey = s.rollNo || s.id;
                            const isSelected = portfolioSelectedRolls.includes(rollKey);
                            const isPub = Boolean(s.isPublic);

                            return (
                              <tr
                                key={s.id || s.rollNo}
                                style={{
                                  borderBottom: '1px solid var(--surface-border)',
                                  background: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                                  transition: 'background 0.15s ease'
                                }}
                              >
                                <td style={{ padding: '14px 16px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setPortfolioSelectedRolls(prev => [...prev, rollKey]);
                                      } else {
                                        setPortfolioSelectedRolls(prev => prev.filter(r => r !== rollKey));
                                      }
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>

                                <td style={{ padding: '14px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'var(--accent)', overflow: 'hidden', flexShrink: 0 }}>
                                      {s.photoUrl ? (
                                        <img src={s.photoUrl} alt={s.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        (s.fullName || 'S').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{s.fullName}</span>
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.email}</span>
                                    </div>
                                  </div>
                                </td>

                                <td style={{ padding: '14px 16px' }}>
                                  <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--surface-base)', border: '1px solid var(--surface-border)', fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', fontWeight: 800, color: 'var(--accent)' }}>
                                    {s.rollNo || 'N/A'}
                                  </span>
                                </td>

                                <td style={{ padding: '14px 16px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                  <span>{s.year ? `Year ${s.year}` : (s.batch || 'Enrolled')}</span>
                                  <span style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '4px', background: 'var(--surface-border)', fontSize: '11px', fontWeight: 700 }}>
                                    Sec {s.sectionId || 'A'}
                                  </span>
                                </td>

                                <td style={{ padding: '14px 16px' }}>
                                  <span style={{ fontSize: '13.5px', fontWeight: 800, color: parseFloat(s.cgpa) >= 8.0 ? '#10b981' : parseFloat(s.cgpa) >= 6.5 ? 'var(--text-primary)' : '#f59e0b' }}>
                                    {s.cgpa || '0.00'}
                                  </span>
                                </td>

                                <td style={{ padding: '14px 16px' }}>
                                  {isPub ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '11.5px', fontWeight: 800 }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                                      Live Public
                                    </span>
                                  ) : (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', background: 'var(--surface-border)', color: 'var(--text-muted)', fontSize: '11.5px', fontWeight: 700 }}>
                                      🔒 Private
                                    </span>
                                  )}
                                </td>

                                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                    {isPub ? (
                                      <>
                                        <a
                                          href={`/portfolio/${s.slug || s.rollNo}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn-action secondary"
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, textDecoration: 'none' }}
                                        >
                                          Open Link ↗
                                        </a>

                                        <button
                                          onClick={() => handleCopySinglePortfolioLink(s)}
                                          className="btn-action secondary"
                                          style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700 }}
                                          title="Copy link to clipboard"
                                        >
                                          {copiedRoll === rollKey ? '✓ Copied' : 'Copy'}
                                        </button>

                                        <button
                                          onClick={() => setPreviewPortfolioSlug(s.slug || s.rollNo)}
                                          className="btn-action primary"
                                          style={{ padding: '5px 11px', fontSize: '11.5px', fontWeight: 700 }}
                                        >
                                          Preview
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => fetchUserDetailForHOD(s)}
                                        className="btn-action secondary"
                                        style={{ padding: '5px 10px', fontSize: '11.5px', fontWeight: 700 }}
                                      >
                                        View Student Profile
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Portfolio Quick Preview Modal */}
                  {previewPortfolioSlug && (
                    <div
                      style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(10, 10, 10, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '24px',
                        boxSizing: 'border-box'
                      }}
                      onClick={() => setPreviewPortfolioSlug(null)}
                    >
                      <div
                        style={{
                          background: 'var(--surface-overlay)',
                          border: '1px solid var(--surface-border)',
                          borderRadius: '20px',
                          width: '100%',
                          maxWidth: '1000px',
                          maxHeight: '90vh',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-raised)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                              Live Portfolio Preview — {previewPortfolioSlug}
                            </span>
                            <a
                              href={`/portfolio/${previewPortfolioSlug}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 700 }}
                            >
                              Open in Full Window ↗
                            </a>
                          </div>
                          <button
                            onClick={() => setPreviewPortfolioSlug(null)}
                            style={{ background: 'transparent', border: 'none', fontSize: '18px', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px 8px' }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ flex: 1, minHeight: '560px', background: '#0a0a0c' }}>
                          <iframe
                            src={`/portfolio/${previewPortfolioSlug}`}
                            title="Student Portfolio Preview"
                            style={{ width: '100%', height: '100%', border: 'none', minHeight: '560px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CURRICULUM FILES */}
              {activeTab === 'documents' && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  
                  {/* Uploader */}
                  {userSession.role === 'HOD' && (
                    <div style={{ width: '320px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', flexShrink: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Upload Curriculum File</h3>
                      <form onSubmit={handleDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="admin-form-group">
                          <label className="admin-label">Document Category</label>
                          <select className="filter-select" value={docForm.docType} onChange={e => setDocForm({ ...docForm, docType: e.target.value })}>
                            <option value="LESSON_PLAN">Lesson Plan</option>
                            <option value="TIMETABLE">Class Timetable</option>
                            <option value="CALENDAR">Academic Calendar</option>
                          </select>
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-label">Title / Caption</label>
                          <input type="text" className="form-input" required value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} placeholder="e.g. III B.Tech CSE-A Timetable" />
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-label">Subject Code (if Lesson Plan)</label>
                          <input type="text" className="form-input" value={docForm.subjectCode} onChange={e => setDocForm({ ...docForm, subjectCode: e.target.value })} placeholder="e.g. CS301" />
                        </div>

                        <div className="admin-form-group">
                          <label className="admin-label">External PDF Resource URL</label>
                          <input type="url" className="form-input" required value={docForm.resourceUrl} onChange={e => setDocForm({ ...docForm, resourceUrl: e.target.value })} placeholder="https://..." />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div className="admin-form-group" style={{ flex: 1 }}>
                            <label className="admin-label">Year</label>
                            <select className="filter-select" value={docForm.targetYear} onChange={e => setDocForm({ ...docForm, targetYear: e.target.value })}>
                              <option value="I">I Year</option>
                              <option value="II">II Year</option>
                              <option value="III">III Year</option>
                              <option value="IV">IV Year</option>
                            </select>
                          </div>
                          <div className="admin-form-group" style={{ flex: 1 }}>
                            <label className="admin-label">Section</label>
                            <select className="filter-select" value={docForm.targetSection} onChange={e => setDocForm({ ...docForm, targetSection: e.target.value })}>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                          </div>
                        </div>

                        <button type="submit" disabled={submittingDoc} className="btn-action primary" style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                          {submittingDoc ? 'Recording...' : 'Record File'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* List */}
                  <div style={{ flex: 1, background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Active Curriculum Library</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {documents.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface-overlay)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                          <div>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'var(--accent-subtle)', color: 'var(--accent)', textTransform: 'uppercase', marginRight: '8px' }}>
                              {doc.docType.replace('_', ' ')}
                            </span>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{doc.title}</strong>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Target: {doc.targetYear} Year Sec-{doc.targetSection} | Semester: {doc.semester}
                            </div>
                          </div>
                          <button 
                            className="btn-action secondary" 
                            onClick={() => setPreviewDoc({ ...doc, fileUrl: doc.fileUrl || doc.resourceUrl })} 
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                          >
                            View Document
                          </button>
                        </div>
                      ))}
                      {documents.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No syllabus plans or timetables uploaded yet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB TRAININGS & BROADCASTS */}
              {activeTab === 'training' && (
                <div style={{ display: 'grid', gridTemplateColumns: userSession.role === 'HOD' ? '1fr 1.2fr' : '1fr', gap: '16px' }}>
                  
                  {/* Uploader Left */}
                  {userSession.role === 'HOD' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Broadcast Announcement</h3>
                        <form onSubmit={handleAnnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="admin-form-group">
                            <label className="admin-label">Title</label>
                            <input type="text" className="form-input" required value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} placeholder="e.g. NBA Pre-Audit Review Scheduled" />
                          </div>
                          <div className="admin-form-group">
                            <label className="admin-label">Content Description</label>
                            <textarea className="form-input" required rows={3} value={annForm.content} onChange={e => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Write announcement details..." />
                          </div>
                          <div className="admin-form-group">
                            <label className="admin-label">Optional Resource Link</label>
                            <input type="url" className="form-input" value={annForm.resourceUrl} onChange={e => setAnnForm({ ...annForm, resourceUrl: e.target.value })} placeholder="https://..." />
                          </div>
                          <button type="submit" disabled={submittingAnn} className="btn-action primary" style={{ border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>{submittingAnn ? 'Publishing...' : 'Publish Broadcast'}</button>
                        </form>
                      </div>

                      <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '14px' }}>Create Skill Training Course</h3>
                        <form onSubmit={handleTrainingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="admin-form-group">
                            <label className="admin-label">Course Title</label>
                            <input type="text" className="form-input" required value={trainingForm.title} onChange={e => setTrainingForm({ ...trainingForm, title: e.target.value })} placeholder="e.g. React & Node.js bootcamp" />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="admin-form-group" style={{ flex: 1 }}>
                              <label className="admin-label">Category</label>
                              <select className="filter-select" value={trainingForm.category} onChange={e => setTrainingForm({ ...trainingForm, category: e.target.value })}>
                                <option value="Technical">Technical</option>
                                <option value="Aptitude">Aptitude</option>
                                <option value="Soft Skills">Soft Skills</option>
                              </select>
                            </div>
                            <div className="admin-form-group" style={{ flex: 1 }}>
                              <label className="admin-label">Venue</label>
                              <input type="text" className="form-input" required value={trainingForm.venue} onChange={e => setTrainingForm({ ...trainingForm, venue: e.target.value })} placeholder="CSE Lab 3" />
                            </div>
                          </div>
                          <div className="admin-form-group">
                            <label className="admin-label">Registration Landing Page URL</label>
                            <input type="url" className="form-input" required value={trainingForm.registrationUrl} onChange={e => setTrainingForm({ ...trainingForm, registrationUrl: e.target.value })} placeholder="https://..." />
                          </div>
                          <button type="submit" disabled={submittingTraining} className="btn-action primary" style={{ padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>{submittingTraining ? 'Recording...' : 'Record Training Course'}</button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* List Right */}
                  <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Recent Published Announcements</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {announcements.map(ann => (
                          <div key={ann.id} style={{ padding: '10px', background: 'var(--surface-overlay)', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{ann.title}</strong>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0' }}>{ann.content}</p>
                            {ann.resourceUrl && <a href={ann.resourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#ffffff' }}>Attachment Resource ↗</a>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>Active Skill Trainings</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {trainings.map(t => (
                          <div key={t.id} style={{ padding: '10px', background: 'var(--surface-overlay)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{t.title}</strong>
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#3b82f6', color: '#fff' }}>{t.category}</span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Venue: {t.venue} | <a href={t.registrationUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>Portal Register ↗</a></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}





              {/* TAB ESCALATION & WHATSAPP-STYLE GROUP CHAT */}
              {activeTab === 'escalations' && (
                <EscalationsGroupChat token={token} userEmail={userEmail} userRole="Faculty" canCreateGroup={true} />
              )}

              {activeTab === 'notifications' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Faculty Portal Notifications</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>View audit updates, system-generated intervention warnings, and send manual alerts to students.</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'start' }}>
                    {/* Left Column: Inbox */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>Inbox Alerts</h3>
                      {hodNotifications.length === 0 ? (
                        <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No new notifications.
                        </div>
                      ) : (
                        hodNotifications.map((notif: any) => (
                          <div key={notif.id} style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: notif.read ? 0.7 : 1 }}>
                            <div style={{ background: notif.read ? 'rgba(255, 255, 255, 0.04)' : 'rgba(59, 130, 246, 0.1)', color: notif.read ? 'var(--text-muted)' : '#3b82f6', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {notif.title}
                                  {!notif.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'N/A'}
                                  </span>
                                  {!notif.read && (
                                    <button
                                      onClick={() => markSingleNotificationAsRead(notif.id)}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                    >
                                      ✓ Mark read
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '6px 0 0', lineHeight: '1.4' }}>{notif.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Right Column: Broadcast Form */}
                    <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '16px', padding: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 14px' }}>Manual Notification Broadcast</h3>
                      <form onSubmit={handleSendHODNotification} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Target Audience</label>
                          <select className="filter-select" value={hodNotifTarget === 'ALL' ? 'ALL' : 'SPECIFIC'} onChange={e => setHodNotifTarget(e.target.value === 'ALL' ? 'ALL' : '')} style={{ padding: '10px', fontSize: '13px' }}>
                            <option value="ALL">Department Students (Global)</option>
                            <option value="SPECIFIC">Target Specific Roll Number</option>
                          </select>
                        </div>

                        {hodNotifTarget !== 'ALL' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Student Roll Number</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              placeholder="e.g. 22B01A0501" 
                              value={hodNotifTarget} 
                              onChange={e => setHodNotifTarget(e.target.value)} 
                              required
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Alert Category</label>
                          <select className="filter-select" value={hodNotifType} onChange={e => setHodNotifType(e.target.value)} style={{ padding: '10px', fontSize: '13px' }}>
                            <option value="SYSTEM">System Announcement</option>
                            <option value="ACADEMIC">Academic</option>
                            <option value="PLACEMENT">Placement Training</option>
                            <option value="VERIFICATION">Verification Request</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Alert Title</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Enter alert title..." 
                            value={hodNotifTitle} 
                            onChange={e => setHodNotifTitle(e.target.value)} 
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Message Body</label>
                          <textarea 
                            className="form-input" 
                            rows={3} 
                            placeholder="Enter warning details..." 
                            value={hodNotifMessage} 
                            onChange={e => setHodNotifMessage(e.target.value)} 
                            style={{ resize: 'vertical' }}
                            required
                          />
                        </div>

                        <button type="submit" className="btn-action primary" style={{ marginTop: '6px' }} disabled={sendingHodNotif}>
                          {sendingHodNotif ? 'Broadcasting...' : 'Broadcast Alert'}
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              )}



            </motion.div>
          </AnimatePresence>

          {/* CIET Footer matching HOD Dashboard */}
          </div>{/* end admin-main-content */}
          <footer className="admin-footer" style={{ padding: '36px 24px 28px', background: 'var(--surface-raised)', borderTop: '1px solid var(--surface-border)', borderRadius: 'var(--r3)', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '40px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '32px' }}>
              <div style={{ maxWidth: '380px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <LogoHeader imageStyle={{ height: '36px', background: '#fff', borderRadius: '4px', padding: '2px' }} />
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>Approved by AICTE, Affiliated to Acharya Nagarjuna University. Accredited by NAAC with 'A' Grade &amp; NBA.</p>
              </div>
              <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                <div>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Contacts</h5>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📞 0863 - 2524112 / 113</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><a href="mailto:principal@chalapathiengg.ac.in" style={{ color: 'inherit', textDecoration: 'none' }}>✉️ principal@chalapathiengg.ac.in</a></li>
                  </ul>
                </div>
                <div>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Address</h5>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '240px' }}>Chalapathi Nagar, Lam,<br />Guntur District, Andhra Pradesh<br />PIN – 522 034, India</p>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              <span>© {new Date().getFullYear()} CIET. All Rights Reserved.</span>
              <a href="http://chalapathiengg.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Official Portal →</a>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fac-mobile-bottom-nav">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'directory', label: 'Directory' },
          ...(Boolean(userSession.isMentor || userSession.role === 'Mentor' || (mentorMentees && mentorMentees.length > 0)) ? [{ id: 'mentorship', label: 'Mentees' }] : []),
          { id: 'portfolios', label: 'Portfolios' },
          { id: 'documents', label: 'Curriculum' },
          { id: 'training', label: 'Training' },
          { id: 'broadcasts', label: 'Broadcasts' },
          { id: 'escalations', label: 'Escalations' },
          { id: 'notifications', label: 'Alerts' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} style={{ padding: '8px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s ease', background: activeTab === tab.id ? 'var(--accent)' : 'transparent', color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)', boxShadow: activeTab === tab.id ? '0 2px 8px var(--accent-glow)' : 'none' }}>{tab.label}</button>
        ))}
      </nav>

      {/* OVERLAY PROFILE DETAILS MODAL */}
      {selectedDetailUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(10, 10, 10, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface-overlay)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
            width: '720px',
            maxWidth: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--ds-s3)'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-overlay)' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{selectedDetailUser.fullName}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedDetailUser.role} &nbsp;|&nbsp; {selectedDetailUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedDetailUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {detailUserLoading ? (
                <div style={{ margin: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="spinner" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Syncing profile workspace records...</span>
                </div>
              ) : detailUserData ? (
                <>
                  {/* General User Profile Details (Matches Admin layout style) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', marginBottom: '24px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Email Address</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{detailUserData.user?.email}</span>
                    </div>

                    {selectedDetailUser.role === 'Student' && detailUserData.profile?.rollNo && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Register Number</span>
                        <span style={{ fontWeight: '700', color: 'var(--accent)', fontFamily: 'monospace', letterSpacing: '1px' }}>{detailUserData.profile.rollNo}</span>
                      </div>
                    )}

                    {selectedDetailUser.role === 'Student' && detailUserData.profile?.batch && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Academic Batch</span>
                        <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{detailUserData.profile.batch}</span>
                      </div>
                    )}

                    {selectedDetailUser.role === 'Student' && detailUserData.profile?.cgpa !== undefined && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>CGPA</span>
                        <span style={{ fontWeight: '700', color: detailUserData.profile.cgpa >= 8 ? '#10b981' : detailUserData.profile.cgpa >= 6 ? '#f59e0b' : '#ef4444' }}>
                          {detailUserData.profile.cgpa.toFixed(2)} / 10.00
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Phone Number</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{detailUserData.user?.phone || 'Not Registered'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Departments</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{detailUserData.user?.departmentIds?.join(', ') || 'General / None'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Portal Access</span>
                      <span style={{ fontWeight: '700', color: detailUserData.user?.active ? '#10b981' : '#ef4444' }}>
                        {detailUserData.user?.active ? 'Granted / Active' : 'Revoked / Locked'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Date Enrolled</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{detailUserData.user?.createdAt ? new Date(detailUserData.user.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--surface-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Last IP Address</span>
                      <span style={{ fontWeight: '500', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{detailUserData.user?.lastLoginIp || 'None'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Last Login Time</span>
                      <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                        {detailUserData.user?.lastLogin ? new Date(detailUserData.user.lastLogin).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  {selectedDetailUser.role === 'Student' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Semester Results */}
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester Results History</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {detailUserData.results && detailUserData.results.map((r: any) => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '8px', fontSize: '12.5px' }}>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.subjectCode} - {r.subjectName}</span>
                              <span style={{ color: r.grade === 'F' ? 'var(--ds-red)' : 'var(--accent)', fontWeight: 800 }}>{r.grade} (Sem {r.semester})</span>
                            </div>
                          ))}
                          {(!detailUserData.results || detailUserData.results.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>No results uploaded yet.</p>}
                        </div>
                      </div>

                      {/* Projects */}
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Portfolios & Projects</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {detailUserData.projects && detailUserData.projects.map((p: any) => (
                            <div key={p.id} style={{ padding: '12px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{p.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Tech stack: {p.technologies}</div>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0' }}>{p.description}</p>
                            </div>
                          ))}
                          {(!detailUserData.projects || detailUserData.projects.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>No projects uploaded yet.</p>}
                        </div>
                      </div>

                      {/* Certifications */}
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Professional Certifications</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {detailUserData.certifications && detailUserData.certifications.map((c: any) => (
                            <div key={c.id} style={{ padding: '12px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{c.title}</div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Issued by: {c.issuingAuthority}</div>
                              </div>
                              {c.certUrl && <a href={c.certUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 700 }}>Verify ↗</a>}
                            </div>
                          ))}
                          {(!detailUserData.certifications || detailUserData.certifications.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>No certifications recorded.</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDetailUser.role === 'Mentor' && (
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Mentees</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detailUserData.assignedStudents && detailUserData.assignedStudents.map((s: any) => (
                          <div key={s.profile?.id} style={{ padding: '12px 16px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{s.user?.fullName}</strong>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Roll No: {s.profile?.rollNo} | Batch: {s.profile?.batch}</div>
                            </div>
                            <button
                              className="btn-action secondary"
                              onClick={() => fetchUserDetailForHOD({ id: s.user?.id, fullName: s.user?.fullName, email: s.user?.email, role: 'Student' })}
                              style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', color: 'var(--accent)' }}
                            >
                              Check Profile
                            </button>
                          </div>
                        ))}
                        {(!detailUserData.assignedStudents || detailUserData.assignedStudents.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No student mentees assigned yet.</p>}
                      </div>
                    </div>
                  )}

                  {selectedDetailUser.role === 'Faculty' && (
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teaching Course Workload</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detailUserData.courses && detailUserData.courses.map((c: any) => (
                          <div key={c.id} style={{ padding: '12px 16px', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '10px' }}>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{c.courseName} ({c.courseCode})</strong>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Target: {c.targetYear} Year Sec-{c.targetSection} | Credits: {c.credits || 3}</div>
                          </div>
                        ))}
                        {(!detailUserData.courses || detailUserData.courses.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No courses assigned to teach.</p>}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px' }}>Failed to resolve profile dataset.</p>
                  <button
                    className="btn-action primary"
                    onClick={() => fetchUserDetailForHOD(selectedDetailUser)}
                    style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>
            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--surface-overlay)' }}>
              <button
                className="btn-action secondary"
                onClick={() => setSelectedDetailUser(null)}
                style={{ padding: '8px 18px', cursor: 'pointer', border: '1px solid var(--surface-border)', background: 'transparent', borderRadius: '8px', color: 'var(--text-secondary)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* ── INJECTED MODALS ── */}
      {dirActiveModal === 'view' && dirSelectedUser && (
        <div className="admin-modal-overlay" onClick={() => setDirActiveModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>User Details</h2>
              <button onClick={() => setDirActiveModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>
            <div className="admin-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '800', color: 'var(--accent)' }}>
                  {dirSelectedUser.fullName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '20px', color: 'var(--text-primary)' }}>{dirSelectedUser.fullName}</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="badge-pill outline">{dirSelectedUser.role}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{dirSelectedUser.email}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div><strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Phone Number</strong><div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{dirSelectedUser.phone || 'N/A'}</div></div>
                <div><strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Departments</strong><div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{dirSelectedUser.departmentIds?.join(', ') || dirSelectedUser.departmentId || 'N/A'}</div></div>
                {dirSelectedUser.role === 'Student' && (
                  <>
                    <div><strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Roll Number</strong><div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)' }}>{dirSelectedUser.rollNo}</div></div>
                    <div><strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Academic Year</strong><div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Year {dirSelectedUser.year}</div></div>
                    <div><strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Section</strong><div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{dirSelectedUser.sectionId}</div></div>
                    <div><strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Batch</strong><div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{dirSelectedUser.batch}</div></div>
                  </>
                )}
              </div>
            </div>
            <div className="admin-modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifySelf: 'flex-end', justifyContent: 'flex-end' }}>
              <button className="btn-action secondary" onClick={() => setDirActiveModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {dirActiveModal === 'edit' && dirSelectedUser && (
        <div className="admin-modal-overlay" onClick={() => setDirActiveModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>Edit User</h2>
              <button onClick={() => setDirActiveModal(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>
            <form onSubmit={handleEditDirUserSubmit}>
              <div className="admin-modal-body" style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                  <input type="text" className="form-input" value={dirFormFullName} onChange={e => setDirFormFullName(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                  <input type="email" className="form-input" value={dirFormEmail} onChange={e => setDirFormEmail(e.target.value)} required style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Phone Number</label>
                  <input type="tel" className="form-input" value={dirFormPhone} onChange={e => setDirFormPhone(e.target.value)} style={{ width: '100%' }} />
                </div>
                {dirSelectedUser.role === 'Student' && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Roll Number</label>
                      <input type="text" className="form-input" value={dirFormRollNo} onChange={e => setDirFormRollNo(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Academic Year</label>
                      <select className="filter-select" value={dirFormYear} onChange={e => setDirFormYear(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                        <option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Section</label>
                      <input type="text" className="form-input" value={dirFormSectionId} onChange={e => setDirFormSectionId(e.target.value)} placeholder="e.g. A" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Batch</label>
                      <input type="text" className="form-input" value={dirFormBatch} onChange={e => setDirFormBatch(e.target.value)} placeholder="e.g. 2023-2027" style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>CGPA</label>
                      <input type="number" step="0.01" className="form-input" value={dirFormCgpa} onChange={e => setDirFormCgpa(e.target.value)} style={{ width: '100%' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Academic Status</label>
                      <select className="filter-select" value={dirFormAcademicStatus} onChange={e => setDirFormAcademicStatus(e.target.value)} style={{ width: '100%', padding: '10px' }}>
                        <option value="ACTIVE">Active</option><option value="GRADUATED">Graduated</option><option value="DROPOUT">Drop-out</option><option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="admin-modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-action secondary" onClick={() => setDirActiveModal(null)}>Cancel</button>
                <button type="submit" className="btn-action primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBroadcastModal && selectedBroadcast && (
        <div className="admin-modal-overlay" onClick={() => setShowBroadcastModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="admin-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%', background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
            <div className="admin-modal-header" style={{ padding: '20px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>Broadcast Message Details</h2>
              <button onClick={() => setShowBroadcastModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', padding: 0 }}>&times;</button>
            </div>
            <div className="admin-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Title</strong>
                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>{selectedBroadcast.title}</div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Sent By</strong>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedBroadcast.senderName} ({selectedBroadcast.senderRole})</div>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Date</strong>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{new Date(selectedBroadcast.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Target Scope</strong>
                <div style={{ fontSize: '13px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedBroadcast.specificTarget ? (
                    <span>Specific Target: <strong>{selectedBroadcast.specificTarget}</strong></span>
                  ) : (
                    <>
                      <span>Roles: <strong>{selectedBroadcast.targetRoles?.join(', ') || 'ALL'}</strong></span>
                      <span>Dept: <strong>{selectedBroadcast.targetDepartment || 'ALL'}</strong></span>
                      <span>Year: <strong>{selectedBroadcast.targetYear || 'ALL'}</strong></span>
                      <span>Section: <strong>{selectedBroadcast.targetSection || 'ALL'}</strong></span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Recipients Delivered To</strong>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)' }}>{selectedBroadcast.recipientCount} users</div>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Message</strong>
                <div style={{ fontSize: '14px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--surface-border)', whiteSpace: 'pre-wrap', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                  {selectedBroadcast.message}
                </div>
              </div>
            </div>
            <div className="admin-modal-footer" style={{ padding: '20px', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-action secondary" onClick={() => setShowBroadcastModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="admin-bottom-nav">
        {([
          { key: 'overview' as Tab, label: 'Home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { key: 'documents' as Tab, label: 'Docs', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
          { key: 'training' as Tab, label: 'Training', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'notifications' as Tab, label: 'Alerts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'settings' as Tab, label: 'Profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(item => (
          <button
            key={item.key}
            className={`admin-bottom-nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.key === 'notifications' && hodNotifications.filter((n: any) => !n.read).length > 0 && (
              <span className="admin-bottom-badge">{hodNotifications.filter((n: any) => !n.read).length}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
