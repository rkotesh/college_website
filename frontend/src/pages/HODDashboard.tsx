import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogoHeader from '../components/LogoHeader';


interface HODDashboardProps {
  userSession: {
    role: string;
    email: string;
    fullName?: string;
    accessToken: string;
  };
  handleLogout: () => void;
}

type Tab =
  | 'overview'
  | 'faculty'
  | 'mentorship'
  | 'documents'
  | 'training'
  | 'attainment'
  | 'at-risk'
  | 'escalations'
  | 'notifications'
  | 'settings'
  | 'messages';

export default function HODDashboard({ userSession, handleLogout }: HODDashboardProps) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [department, setDepartment] = useState<any>(null);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [trainings, setTrainings] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [meetingLogs, setMeetingLogs] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  
  // HOD Profile & Notifications state
  const [hodProfile, setHodProfile] = useState<any>(null);
  const [profileFullName, setProfileFullName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
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
  
  // Staff Direct Messages states
  const [staffConversations, setStaffConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [staffMsgInput, setStaffMsgInput] = useState('');
  const [msgSidebarTab, setMsgSidebarTab] = useState<'chats' | 'students' | 'faculty' | 'mentors'>('chats');
  const staffChatContainerRef = useRef<HTMLDivElement | null>(null);
  const escalationChatContainerRef = useRef<HTMLDivElement | null>(null);

  // Active escalation thread
  const [activeThread, setActiveThread] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [privateNotes, setPrivateNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  // New Escalation Form states
  const [showNewEscalationForm, setShowNewEscalationForm] = useState(false);
  const [newEscRollNos, setNewEscRollNos] = useState<string[]>([]);
  const [newEscMentorIds, setNewEscMentorIds] = useState<string[]>([]);
  const [newEscFacultyIds, setNewEscFacultyIds] = useState<string[]>([]);
  const [newEscSubjectCode, setNewEscSubjectCode] = useState('GENERAL');
  const [creatingEscalation, setCreatingEscalation] = useState(false);

  // Form states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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

  useEffect(() => {
    if (staffChatContainerRef.current) {
      staffChatContainerRef.current.scrollTop = staffChatContainerRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  useEffect(() => {
    if (escalationChatContainerRef.current) {
      escalationChatContainerRef.current.scrollTop = escalationChatContainerRef.current.scrollHeight;
    }
  }, [activeThread?.messages]);
  const [directoryTab, setDirectoryTab] = useState<'students' | 'faculty' | 'mentors'>('students');
  const [selectedDetailUser, setSelectedDetailUser] = useState<any | null>(null);
  const [detailUserData, setDetailUserData] = useState<any | null>(null);
  const [detailUserLoading, setDetailUserLoading] = useState(false);

  // Notifications dropdown
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, title: 'Accreditation Review', msg: 'NAAC Pre-Audit check is scheduled for next Monday.', time: '2 hours ago' },
    { id: 2, title: 'At-Risk Alert', msg: 'Student Ravi Kumar (22B01A0501) flagged for low attendance.', time: '1 day ago' }
  ]);

  useEffect(() => {
    fetchBaseData();
  }, []);
  useEffect(() => {
    if (activeTab === 'messages') {
      fetchStaffConversations();
    }
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
        escalationsRes,
        profileRes,
        notifRes,
        portalRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/hod/scope`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/faculty`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/documents`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/trainings`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/announcements`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/meeting-logs`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/escalations`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/profile`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/hod/notifications`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/portal/hod/dashboard`, { headers })
      ]);

      if (scopeRes.ok) setDepartment(await scopeRes.json());
      if (facultyRes.ok) setFacultyList(await facultyRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (trainingsRes.ok) setTrainings(await trainingsRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
      if (logsRes.ok) setMeetingLogs(await logsRes.json());
      if (escalationsRes.ok) setEscalations(await escalationsRes.json());
      
      if (profileRes.ok) {
        const prof = await profileRes.json();
        setHodProfile(prof);
        setProfileFullName(prof.fullName || '');
        setProfilePhone(prof.phone || '');
        setProfilePhotoUrl(prof.photoUrl || '');
      }
      
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


  // Escalation Chat Thread Messages
  const selectThread = async (thread: any) => {
    setActiveThread(thread);
    // Fetch private case notes for the student in this thread
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/case-notes/${thread.thread.rollNo}`, {
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        setPrivateNotes(await res.json());
      }
    } catch {
      setPrivateNotes([]);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeThread) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/escalations/${activeThread.thread.id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({ content: chatMessage })
      });
      if (res.ok) {
        const newMsg = await res.json();
        // Update local thread state
        setActiveThread((prev: any) => ({
          ...prev,
          messages: [...prev.messages, newMsg]
        }));
        setChatMessage('');
        fetchBaseData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const addCaseNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeThread) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/case-notes/${activeThread.thread.rollNo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({ content: newNote })
      });
      if (res.ok) {
        const createdNote = await res.json();
        setPrivateNotes((prev) => [createdNote, ...prev]);
        setNewNote('');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };


  const handleCreateNewEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newEscRollNos.length === 0) return;
    setCreatingEscalation(true);
    try {
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userSession.accessToken}` };
      // Create one thread per selected student
      const createdThreadIds: string[] = [];
      for (const rollNo of newEscRollNos) {
        const res = await fetch(`${API_BASE_URL}/api/v1/hod/escalations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            rollNo,
            subjectCode: newEscSubjectCode || 'GENERAL',
            mentorUserIds: newEscMentorIds.length > 0 ? newEscMentorIds : undefined,
            facultyUserIds: newEscFacultyIds.length > 0 ? newEscFacultyIds : undefined,
          })
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || `Failed for ${rollNo}`); }
        const t = await res.json();
        createdThreadIds.push(t.id);
      }
      // Reload escalations list
      const escRes = await fetch(`${API_BASE_URL}/api/v1/hod/escalations`, {
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (escRes.ok) {
        const escData = await escRes.json();
        setEscalations(escData);
        // Select last created thread
        const last = escData.find((e: any) => e.thread.id === createdThreadIds[createdThreadIds.length - 1]);
        if (last) { setActiveThread(last); setPrivateNotes([]); }
      }
      // Reset form
      setShowNewEscalationForm(false);
      setNewEscRollNos([]);
      setNewEscMentorIds([]);
      setNewEscFacultyIds([]);
      setNewEscSubjectCode('GENERAL');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingEscalation(false);
    }
  };

  const handleSaveHODProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({
          fullName: profileFullName,
          phone: profilePhone,
          password: profilePassword,
          photoUrl: profilePhotoUrl
        })
      });
      if (!res.ok) throw new Error('Failed to update HOD profile.');
      const updatedUser = await res.json();
      setHodProfile(updatedUser);
      setProfilePassword('');
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleHODPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setProfilePhotoUrl(data.url);
      alert('Photo uploaded successfully! Save settings to apply.');
    } catch (err: any) {
      alert(err.message);
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

  const fetchStaffConversations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        const convs = await res.json();
        setStaffConversations(convs);
        if (convs.length > 0) {
          setSelectedConversation((prev: any) => {
            if (prev) {
              const updated = convs.find((c: any) => c.studentRollNo === prev.studentRollNo);
              return updated || convs[0];
            }
            return convs[0];
          });
        }
      }
    } catch (err) {
      console.error("Failed to load staff conversations", err);
    }
  };

  const handleSendStaffMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffMsgInput.trim() || !selectedConversation) return;
    const text = staffMsgInput;
    setStaffMsgInput('');

    const target = selectedConversation.userId || selectedConversation.studentRollNo || selectedConversation.studentEmail;
    if (!target) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/hod/messages/${target}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({ messageText: text })
      });
      if (res.ok) {
        const updatedMessages = await res.json();
        setStaffConversations(prev => {
          const exists = prev.some(c => (c.userId && c.userId === selectedConversation.userId) || c.studentRollNo === selectedConversation.studentRollNo);
          if (exists) {
            return prev.map(c => {
              if ((c.userId && c.userId === selectedConversation.userId) || c.studentRollNo === selectedConversation.studentRollNo) {
                return { ...c, messages: updatedMessages };
              }
              return c;
            });
          } else {
            const newConv = { ...selectedConversation, messages: updatedMessages };
            return [newConv, ...prev];
          }
        });
        setSelectedConversation((prev: any) => ({ ...prev, messages: updatedMessages }));
        fetchStaffConversations();
      }
    } catch (err) {
      console.error("Failed to send staff message", err);
      setStaffMsgInput(text);
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
      x: number; y: number; vx: number; vy: number; r: number; alpha: number; dAlpha: number;
    }
    const orbs: Orb[] = [];
    for (let i = 0; i < 40; i++) {
      orbs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2,
        dAlpha: (Math.random() - 0.5) * 0.015
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.4)'; // blue particles
      orbs.forEach((o) => {
        o.x += o.vx;
        o.y += o.vy;
        o.alpha += o.dAlpha;
        if (o.alpha > 0.8 || o.alpha < 0.1) o.dAlpha = -o.dAlpha;
        if (o.x < 0 || o.x > w) o.vx = -o.vx;
        if (o.y < 0 || o.y > h) o.vy = -o.vy;

        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${Math.max(0.1, Math.min(o.alpha, 0.8))})`;
        ctx.fill();
      });
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
          <p style={{ fontFamily: 'var(--ds-font-display)', fontWeight: 600 }}>Syncing HOD Portal Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ds-root" style={{ background: 'var(--ds-bg)', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* BACKGROUND PARTICLE LAYER */}
      <div className="ds-bg-layer" style={{ zIndex: 0 }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <div className="ds-grid-texture" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .ds-root {
          --accent: #ffffff !important;
          --accent-light: #ffffff !important;
          --accent-dark: #f3f4f6 !important;
          --accent-glow: rgba(255, 255, 255, 0.12) !important;
          --accent-border: #ffffff !important;
        }
        .ds-nav-item.active {
          color: #ffffff !important;
          background: var(--ds-surface3) !important;
        }
        .ds-nav-item.active svg {
          color: #ffffff !important;
          stroke: #ffffff !important;
        }
        .ds-nav-item.active::before {
          background: #ffffff !important;
        }
        .ds-btn-primary {
          background: #ffffff !important;
          color: #000000 !important;
        }
        .ds-btn-primary:hover {
          background: #f3f4f6 !important;
        }
      ` }} />

      {/* HEADER TOPBAR (BLUE COMPLIANT) */}
      <header className="ds-topbar" style={{ borderBottom: '1px solid var(--ds-border)', background: 'hsla(210, 8%, 13%, 0.82)', backdropFilter: 'blur(18px)', position: 'relative', zIndex: 1000 }}>
        <div className="ds-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LogoHeader imageStyle={{ height: '32px' }} />
          <span className="ds-logo-sep" style={{ width: '1px', height: '16px', background: 'var(--ds-border)' }} />
          <span className="ds-logo-sub" style={{ fontSize: '12.5px', color: 'var(--ds-text3)', fontWeight: 600 }}>HOD Dashboard</span>
        </div>

        <div className="ds-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="ds-icon-btn" onClick={() => setShowNotifications(!showNotifications)} style={{ position: 'relative', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--ds-border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer', color: 'var(--ds-text2)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span className="ds-notif-dot" style={{ position: 'absolute', top: '4px', right: '4px', width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%' }} />
          </button>
          
          {showNotifications && (
            <div className="ds-notif-dropdown" style={{ position: 'absolute', top: '48px', right: '80px', width: '320px', background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '12px', boxShadow: 'var(--ds-s3)', padding: '14px', zIndex: 1100 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ds-text1)' }}>Notifications</span>
                <span style={{ fontSize: '11px', color: '#3b82f6', cursor: 'pointer' }}>Mark all read</span>
              </div>
              {notifications.map(n => (
                <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--ds-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--ds-text1)' }}>{n.title}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ds-text2)', marginTop: '2px' }}>{n.msg}</div>
                  <div style={{ fontSize: '9px', color: 'var(--ds-text3)', marginTop: '4px' }}>{n.time}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="ds-mini-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '12px', overflow: 'hidden' }}>
              {profilePhotoUrl ? (
                <img src={`${API_BASE_URL}${profilePhotoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setProfilePhotoUrl('')} />
              ) : (
                userSession.fullName?.slice(0, 1)?.toUpperCase() || 'H'
              )}
            </div>
            <div className="ds-avatar-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="ds-avatar-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)' }}>{userSession.fullName || 'HOD'}</span>
              <span className="ds-avatar-sub" style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>{userSession.role}</span>
            </div>
          </div>

          <button className="ds-btn ds-btn-ghost ds-signout" onClick={handleLogout} style={{ border: '1px solid var(--ds-border)', padding: '6px 12px', borderRadius: '8px', background: 'transparent', color: 'var(--ds-text2)', fontSize: '12px', cursor: 'pointer' }}>Sign Out</button>
        </div>
      </header>

      {/* LAYOUT BODY */}
      <div className="ds-body" style={{ flex: 1, display: 'flex', overflow: 'hidden', zIndex: 1 }}>
        
        {/* SIDEBAR NAVIGATION (ACCENT BLUE INTEGRATED) */}
        <aside className="ds-sidebar" style={{ width: '240px', background: 'var(--ds-surface)', borderRight: '1px solid var(--ds-border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <nav className="ds-nav" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="ds-nav-section" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.8px', paddingBottom: '6px' }}>Operations</div>
            
            <button className={`ds-nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'overview' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'overview' ? 700 : 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Department Overview</span>
            </button>
            
            <button className={`ds-nav-item ${activeTab === 'faculty' ? 'active' : ''}`} onClick={() => setActiveTab('faculty')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'faculty' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'faculty' ? 700 : 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Faculty Workload</span>
            </button>

            <button className={`ds-nav-item ${activeTab === 'mentorship' ? 'active' : ''}`} onClick={() => setActiveTab('mentorship')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'mentorship' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'mentorship' ? 700 : 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Mentorship Assignment</span>
            </button>

            <button className={`ds-nav-item ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'documents' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'documents' ? 700 : 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              <span>Curriculum Files</span>
            </button>

            <div className="ds-nav-section" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 0 6px' }}>Development & OBE</div>

            <button className={`ds-nav-item ${activeTab === 'training' ? 'active' : ''}`} onClick={() => setActiveTab('training')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'training' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'training' ? 700 : 500 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span>Trainings & Broadcasts</span>
            </button>



             <button className={`ds-nav-item ${activeTab === 'escalations' ? 'active' : ''}`} onClick={() => setActiveTab('escalations')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'escalations' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'escalations' ? 700 : 500 }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
               <span>Escalation Chain</span>
             </button>

             <div className="ds-nav-section" style={{ fontSize: '10px', fontWeight: 800, color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 0 6px' }}>Account</div>

             <button className={`ds-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'notifications' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'notifications' ? 700 : 500 }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
               <span>Notifications</span>
               {hodNotifications.filter(n => !n.read).length > 0 && (
                 <span style={{ background: '#3b82f6', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '8px', marginLeft: 'auto' }}>
                   {hodNotifications.filter(n => !n.read).length}
                 </span>
               )}
             </button>

             <button className={`ds-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'messages' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'messages' ? 700 : 500 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Direct Messages</span>
              </button>

             <button className={`ds-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} style={{ border: 'none', background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer', color: activeTab === 'settings' ? '#ffffff' : 'var(--ds-text2)', fontWeight: activeTab === 'settings' ? 700 : 500 }}>
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
               <span>Profile Settings</span>
             </button>
          </nav>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="ds-main">
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>{error}</span>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} className="ds-page" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              
              {/* TAB OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', gap: '20px', flex: 1, flexDirection: 'row' }}>
                  {/* Left Column: Active Directory */}
                  <div style={{ flex: 1.5, background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text1)', margin: 0 }}>Department Active Directory</h2>
                        <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: '4px 0 0' }}>Resolved scope: {department?.name || 'Computer Science & Engineering'} ({department?.code || 'CSE'})</p>
                      </div>
                      
                      {/* Search Bar */}
                      <input
                        type="text"
                        className="ds-input"
                        placeholder="Search directory..."
                        value={directorySearch}
                        onChange={e => setDirectorySearch(e.target.value)}
                        style={{ maxWidth: '240px', padding: '8px 14px', fontSize: '12.5px' }}
                      />
                    </div>

                    {/* Directory Categories Tabs */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--ds-border)', paddingBottom: '10px' }}>
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
                              background: isSelected ? '#ffffff' : 'transparent',
                              color: isSelected ? '#000000' : 'var(--ds-text2)',
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
                        if (filtered.length === 0) return <p style={{ fontSize: '13px', color: 'var(--ds-text3)', textAlign: 'center', padding: '20px' }}>No students found matching your criteria</p>;
                        return filtered.map((s: any) => (
                          <div key={s.user?.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', overflow: 'hidden' }}>
                                {s.user?.photoUrl ? (
                                  <img src={`${API_BASE_URL}${s.user.photoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  s.user?.fullName?.slice(0, 1)?.toUpperCase() || 'S'
                                )}
                              </div>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--ds-text1)' }}>{s.user?.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--ds-text3)', marginTop: '2px' }}>
                                  Roll No: <span style={{ color: '#ffffff', fontWeight: 600 }}>{s.profile?.rollNo}</span> &nbsp;|&nbsp; Batch: {s.profile?.batch}
                                </div>
                              </div>
                            </div>
                            <button
                              className="ds-btn ds-btn-ghost"
                              onClick={() => fetchUserDetailForHOD({ id: s.user?.id, fullName: s.user?.fullName, email: s.user?.email, role: 'Student' })}
                              style={{ padding: '6px 12px', fontSize: '12.5px', color: '#ffffff', borderColor: 'var(--ds-border)', cursor: 'pointer' }}
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
                        if (filtered.length === 0) return <p style={{ fontSize: '13px', color: 'var(--ds-text3)', textAlign: 'center', padding: '20px' }}>No faculty members found</p>;
                        return filtered.map((f: any) => (
                          <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', overflow: 'hidden' }}>
                                {f.photoUrl ? (
                                  <img src={`${API_BASE_URL}${f.photoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  f.fullName?.slice(0, 1)?.toUpperCase() || 'F'
                                )}
                              </div>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--ds-text1)' }}>{f.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--ds-text3)', marginTop: '2px' }}>Email: {f.email}</div>
                              </div>
                            </div>
                            <button
                              className="ds-btn ds-btn-ghost"
                              onClick={() => fetchUserDetailForHOD({ id: f.id, fullName: f.fullName, email: f.email, role: 'Faculty' })}
                              style={{ padding: '6px 12px', fontSize: '12.5px', color: '#ffffff', borderColor: 'var(--ds-border)', cursor: 'pointer' }}
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
                        if (filtered.length === 0) return <p style={{ fontSize: '13px', color: 'var(--ds-text3)', textAlign: 'center', padding: '20px' }}>No mentors found</p>;
                        return filtered.map((m: any) => (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '13px', overflow: 'hidden' }}>
                                {m.photoUrl ? (
                                  <img src={`${API_BASE_URL}${m.photoUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  m.fullName?.slice(0, 1)?.toUpperCase() || 'M'
                                )}
                              </div>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--ds-text1)' }}>{m.fullName}</strong>
                                <div style={{ fontSize: '12px', color: 'var(--ds-text3)', marginTop: '2px' }}>Email: {m.email}</div>
                              </div>
                            </div>
                            <button
                              className="ds-btn ds-btn-ghost"
                              onClick={() => fetchUserDetailForHOD({ id: m.id, fullName: m.fullName, email: m.email, role: 'Mentor' })}
                              style={{ padding: '6px 12px', fontSize: '12.5px', color: '#ffffff', borderColor: 'var(--ds-border)', cursor: 'pointer' }}
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
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                         Recently Updated Curriculum Library
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {documents.slice(0, 3).map(doc => (
                          <div key={doc.id} style={{ padding: '12px', background: 'var(--ds-surface2)', borderRadius: '10px', border: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                {doc.docType.replace('_', ' ')}
                              </div>
                              <strong style={{ fontSize: '12.5px', color: 'var(--ds-text1)' }}>{doc.title}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>Target: {doc.targetYear} Year Sec-{doc.targetSection}</div>
                            </div>
                            <a href={doc.resourceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', fontSize: '11.5px', padding: '4px 10px', borderRadius: '6px', fontWeight: 700 }}>
                              Open ↗
                            </a>
                          </div>
                        ))}
                        {documents.length === 0 && <p style={{ fontSize: '12px', color: 'var(--ds-text3)', textAlign: 'center', padding: '10px' }}>No documents uploaded yet</p>}
                      </div>
                    </div>

                    {/* Widget 2: Recently Published Announcements */}
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                         Recently Published Announcements
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {announcements.slice(0, 3).map(ann => (
                          <div key={ann.id} style={{ padding: '12px', background: 'var(--ds-surface2)', borderRadius: '10px', border: '1px solid var(--ds-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--ds-text1)' }}>{ann.title}</strong>
                              <span style={{ fontSize: '9.5px', color: 'var(--ds-text3)' }}>{new Date(ann.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: 0, lineHeight: '1.4' }}>{ann.content}</p>
                            {ann.resourceUrl && (
                              <a href={ann.resourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', marginTop: '6px', fontWeight: 600 }}>
                                Reference Attachment ↗
                              </a>
                            )}
                          </div>
                        ))}
                        {announcements.length === 0 && <p style={{ fontSize: '12px', color: 'var(--ds-text3)', textAlign: 'center', padding: '10px' }}>No announcements published yet</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB FACULTY WORKLOAD */}
              {activeTab === 'faculty' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 6px' }}>Faculty List & Workload Monitoring</h2>
                    <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: 0 }}>Review assigned courses, teaching hours, and active mentorship allocations of department faculty.</p>
                  </div>

                  <div className="ds-card ds-table-wrap" style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', overflow: 'hidden' }}>
                    <table className="ds-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--ds-surface2)', textAlign: 'left', borderBottom: '1px solid var(--ds-border)' }}>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--ds-text3)' }}>Name</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--ds-text3)' }}>Role</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--ds-text3)' }}>Subjects Taught</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--ds-text3)' }}>Active Mentorship Group</th>
                          <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 800, color: 'var(--ds-text3)', textAlign: 'center' }}>Mentees</th>
                        </tr>
                      </thead>
                      <tbody>
                        {facultyList.map((f: any) => (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--ds-border)' }}>
                            <td style={{ padding: '16px', fontSize: '13.5px', fontWeight: 700, color: 'var(--ds-text1)' }}>{f.fullName}</td>
                            <td style={{ padding: '16px', fontSize: '12px', color: 'var(--ds-text2)' }}>
                              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--ds-surface2)', fontSize: '10.5px', fontWeight: 700 }}>{f.role}</span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '13.5px', color: 'var(--ds-text2)', fontWeight: 600 }}>{f.subjectCount} Subjects</td>
                            <td style={{ padding: '16px', fontSize: '13px', color: 'var(--ds-text2)' }}>
                              <span style={{ color: f.menteesCount > 0 ? '#3b82f6' : 'var(--ds-text3)', fontWeight: 700 }}>{f.mentorRange}</span>
                            </td>
                            <td style={{ padding: '16px', fontSize: '13.5px', color: 'var(--ds-text1)', fontWeight: 800, textAlign: 'center', fontFamily: 'var(--ds-font-mono)' }}>{f.menteesCount}</td>
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
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 6px' }}>Mentorship Assignment Control Panel</h2>
                    <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: 0 }}>Assign faculty mentors to department student cohorts manually or split them into half classes.</p>
                  </div>

                  {/* Halves split block */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Class Halves Split Assignment</h3>
                      <form onSubmit={handleSplitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="ds-form-group">
                          <label className="ds-label">Batch & Section</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <select className="ds-input" value={splitForm.batch} onChange={e => setSplitForm({ ...splitForm, batch: e.target.value })} style={{ flex: 1 }}>
                              <option value="2022-2026">2022-2026 (IV Year)</option>
                              <option value="2023-2027">2023-2027 (III Year)</option>
                            </select>
                            <select className="ds-input" value={splitForm.sectionId} onChange={e => setSplitForm({ ...splitForm, sectionId: e.target.value })} style={{ width: '80px' }}>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                          </div>
                        </div>

                        <div className="ds-form-group">
                          <label className="ds-label">Mentor A (1st Half)</label>
                          <select className="ds-input" required value={splitForm.mentorAId} onChange={e => setSplitForm({ ...splitForm, mentorAId: e.target.value })}>
                            <option value="">Select Mentor A...</option>
                            {facultyList.map(f => (
                              <option key={f.id} value={f.id}>{f.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="ds-form-group">
                          <label className="ds-label">Mentor B (2nd Half)</label>
                          <select className="ds-input" required value={splitForm.mentorBId} onChange={e => setSplitForm({ ...splitForm, mentorBId: e.target.value })}>
                            <option value="">Select Mentor B...</option>
                            {facultyList.map(f => (
                              <option key={f.id} value={f.id}>{f.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <button type="submit" className="ds-btn ds-btn-primary" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Run Splits & Assign</button>
                      </form>
                    </div>

                    {/* Manual checkbox block */}
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Manual Mentorship Assignment</h3>
                      <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="ds-form-group">
                          <label className="ds-label">Choose Mentor</label>
                          <select className="ds-input" required value={manualForm.mentorUserId} onChange={e => setManualForm({ ...manualForm, mentorUserId: e.target.value })}>
                            <option value="">Select Mentor...</option>
                            {facultyList.map(f => (
                              <option key={f.id} value={f.id}>{f.fullName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="ds-form-group">
                          <label className="ds-label">Select Student Mentees</label>
                          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--ds-border)', borderRadius: '8px', padding: '10px', background: 'var(--ds-surface2)' }}>
                            {studentsList.map(item => (
                              <label key={item.profile.rollNo} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', padding: '4px 0', color: 'var(--ds-text2)', cursor: 'pointer' }}>
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

                        <button type="submit" className="ds-btn ds-btn-primary" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Assign Selected</button>
                      </form>
                    </div>
                  </div>

                  {/* Active logs summary of Assignments */}
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Active Mentorship Meeting Logs</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                      {meetingLogs.map(log => (
                        <div key={log.id} style={{ padding: '12px', background: 'var(--ds-surface2)', borderRadius: '10px', borderLeft: '3px solid #3b82f6' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--ds-text1)' }}>
                            <span>Student: {log.rollNo}</span>
                            <span>{log.meetingDate}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '4px 0 0' }}>
                            <strong>Discussed:</strong> {log.topicsDiscussed} | <strong>Concerns:</strong> {log.concerns}
                          </p>
                        </div>
                      ))}
                      {meetingLogs.length === 0 && <p style={{ fontSize: '13px', color: 'var(--ds-text3)', textAlign: 'center', padding: '12px' }}>No session logs reported for this academic year.</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CURRICULUM FILES */}
              {activeTab === 'documents' && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  
                  {/* Uploader */}
                  {userSession.role === 'HOD' && (
                    <div style={{ width: '320px', background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px', flexShrink: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Upload Curriculum File</h3>
                      <form onSubmit={handleDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="ds-form-group">
                          <label className="ds-label">Document Category</label>
                          <select className="ds-input" value={docForm.docType} onChange={e => setDocForm({ ...docForm, docType: e.target.value })}>
                            <option value="LESSON_PLAN">Lesson Plan</option>
                            <option value="TIMETABLE">Class Timetable</option>
                            <option value="CALENDAR">Academic Calendar</option>
                          </select>
                        </div>

                        <div className="ds-form-group">
                          <label className="ds-label">Title / Caption</label>
                          <input type="text" className="ds-input" required value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} placeholder="e.g. III B.Tech CSE-A Timetable" />
                        </div>

                        <div className="ds-form-group">
                          <label className="ds-label">Subject Code (if Lesson Plan)</label>
                          <input type="text" className="ds-input" value={docForm.subjectCode} onChange={e => setDocForm({ ...docForm, subjectCode: e.target.value })} placeholder="e.g. CS301" />
                        </div>

                        <div className="ds-form-group">
                          <label className="ds-label">External PDF Resource URL</label>
                          <input type="url" className="ds-input" required value={docForm.resourceUrl} onChange={e => setDocForm({ ...docForm, resourceUrl: e.target.value })} placeholder="https://..." />
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div className="ds-form-group" style={{ flex: 1 }}>
                            <label className="ds-label">Year</label>
                            <select className="ds-input" value={docForm.targetYear} onChange={e => setDocForm({ ...docForm, targetYear: e.target.value })}>
                              <option value="I">I Year</option>
                              <option value="II">II Year</option>
                              <option value="III">III Year</option>
                              <option value="IV">IV Year</option>
                            </select>
                          </div>
                          <div className="ds-form-group" style={{ flex: 1 }}>
                            <label className="ds-label">Section</label>
                            <select className="ds-input" value={docForm.targetSection} onChange={e => setDocForm({ ...docForm, targetSection: e.target.value })}>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                            </select>
                          </div>
                        </div>

                        <button type="submit" disabled={submittingDoc} className="ds-btn ds-btn-primary" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                          {submittingDoc ? 'Recording...' : 'Record File'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* List */}
                  <div style={{ flex: 1, background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Active Curriculum Library</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {documents.map(doc => (
                        <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--ds-surface2)', borderRadius: '10px', border: '1px solid var(--ds-border)' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', textTransform: 'uppercase', marginRight: '8px' }}>
                              {doc.docType.replace('_', ' ')}
                            </span>
                            <strong style={{ fontSize: '13.5px', color: 'var(--ds-text1)' }}>{doc.title}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '4px' }}>
                              Target: {doc.targetYear} Year Sec-{doc.targetSection} | Semester: {doc.semester}
                            </div>
                          </div>
                          <a href={doc.resourceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--ds-border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12.5px', color: '#ffffff', fontWeight: 600 }}>
                            View PDF ↗
                          </a>
                        </div>
                      ))}
                      {documents.length === 0 && <p style={{ fontSize: '13px', color: 'var(--ds-text3)', textAlign: 'center', padding: '24px' }}>No syllabus plans or timetables uploaded yet.</p>}
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
                      <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Broadcast Announcement</h3>
                        <form onSubmit={handleAnnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="ds-form-group">
                            <label className="ds-label">Title</label>
                            <input type="text" className="ds-input" required value={annForm.title} onChange={e => setAnnForm({ ...annForm, title: e.target.value })} placeholder="e.g. NBA Pre-Audit Review Scheduled" />
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-label">Content Description</label>
                            <textarea className="ds-input" required rows={3} value={annForm.content} onChange={e => setAnnForm({ ...annForm, content: e.target.value })} placeholder="Write announcement details..." />
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-label">Optional Resource Link</label>
                            <input type="url" className="ds-input" value={annForm.resourceUrl} onChange={e => setAnnForm({ ...annForm, resourceUrl: e.target.value })} placeholder="https://..." />
                          </div>
                          <button type="submit" disabled={submittingAnn} className="ds-btn ds-btn-primary" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>{submittingAnn ? 'Publishing...' : 'Publish Broadcast'}</button>
                        </form>
                      </div>

                      <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '14px' }}>Create Skill Training Course</h3>
                        <form onSubmit={handleTrainingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div className="ds-form-group">
                            <label className="ds-label">Course Title</label>
                            <input type="text" className="ds-input" required value={trainingForm.title} onChange={e => setTrainingForm({ ...trainingForm, title: e.target.value })} placeholder="e.g. React & Node.js bootcamp" />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="ds-form-group" style={{ flex: 1 }}>
                              <label className="ds-label">Category</label>
                              <select className="ds-input" value={trainingForm.category} onChange={e => setTrainingForm({ ...trainingForm, category: e.target.value })}>
                                <option value="Technical">Technical</option>
                                <option value="Aptitude">Aptitude</option>
                                <option value="Soft Skills">Soft Skills</option>
                              </select>
                            </div>
                            <div className="ds-form-group" style={{ flex: 1 }}>
                              <label className="ds-label">Venue</label>
                              <input type="text" className="ds-input" required value={trainingForm.venue} onChange={e => setTrainingForm({ ...trainingForm, venue: e.target.value })} placeholder="CSE Lab 3" />
                            </div>
                          </div>
                          <div className="ds-form-group">
                            <label className="ds-label">Registration Landing Page URL</label>
                            <input type="url" className="ds-input" required value={trainingForm.registrationUrl} onChange={e => setTrainingForm({ ...trainingForm, registrationUrl: e.target.value })} placeholder="https://..." />
                          </div>
                          <button type="submit" disabled={submittingTraining} className="ds-btn ds-btn-primary" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>{submittingTraining ? 'Recording...' : 'Record Training Course'}</button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* List Right */}
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '10px' }}>Recent Published Announcements</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {announcements.map(ann => (
                          <div key={ann.id} style={{ padding: '10px', background: 'var(--ds-surface2)', borderRadius: '8px', border: '1px solid var(--ds-border)' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--ds-text1)' }}>{ann.title}</strong>
                            <p style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '4px 0' }}>{ann.content}</p>
                            {ann.resourceUrl && <a href={ann.resourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#ffffff' }}>Attachment Resource ↗</a>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', marginBottom: '10px' }}>Active Skill Trainings</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {trainings.map(t => (
                          <div key={t.id} style={{ padding: '10px', background: 'var(--ds-surface2)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--ds-text1)' }}>{t.title}</strong>
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#3b82f6', color: '#fff' }}>{t.category}</span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)', marginTop: '4px' }}>Venue: {t.venue} | <a href={t.registrationUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>Portal Register ↗</a></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* TAB ESCALATION & 4-WAY CHAT (Staff collaborative case notes integrated) */}
              {activeTab === 'escalations' && (
                <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 140px)', minHeight: '0' }}>
                  
                  {/* Left Threads list */}
                  <div style={{ width: '280px', background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ds-text1)', margin: 0 }}>Escalation Threads</h3>
                      <button
                        onClick={() => { setShowNewEscalationForm(true); setActiveThread(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
                      {escalations.map(esc => (
                        <button
                          key={esc.thread.id}
                          onClick={() => selectThread(esc)}
                          style={{
                            textAlign: 'left',
                            background: activeThread?.thread.id === esc.thread.id ? 'var(--ds-surface2)' : 'transparent',
                            border: '1px solid var(--ds-border)',
                            borderRadius: '8px',
                            padding: '10px',
                            cursor: 'pointer',
                            color: 'inherit',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '12.5px', color: 'var(--ds-text1)' }}>{esc.studentUser?.fullName || esc.thread.rollNo}</strong>
                            {esc.thread.isEscalatedToHOD && <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px' }}>HOD</span>}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>Roll No: {esc.thread.rollNo}</span>
                          {esc.thread.subjectCode && <span style={{ fontSize: '11px', color: 'var(--ds-text2)' }}>Sub: {esc.thread.subjectCode}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chat Box Center */}
                  <div style={{ flex: 1, background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {activeThread ? (
                      <>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface2)' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--ds-text1)' }}>
                            Intervention Room: {activeThread.studentUser?.fullName} ({activeThread.thread.rollNo})
                          </h4>
                          <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>
                            {activeThread.mentors && activeThread.mentors.length > 0 ? (
                              <span>Mentors: {activeThread.mentors.map((m: any) => m.fullName).join(', ')}</span>
                            ) : (
                              <span>Mentor: {activeThread.mentor?.fullName || 'None'}</span>
                            )}
                            &nbsp;|&nbsp;
                            {activeThread.facultyMembers && activeThread.facultyMembers.length > 0 ? (
                              <span>Faculty: {activeThread.facultyMembers.map((f: any) => f.fullName).join(', ')}</span>
                            ) : (
                              <span>Faculty: {activeThread.faculty?.fullName || 'None'}</span>
                            )}
                          </div>
                        </div>

                        {/* Message history */}
                        <div ref={escalationChatContainerRef} style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {activeThread.messages.map((m: any) => {
                            const isMe = m.senderUserId === userSession.fullName; // simple mock check
                            return (
                              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                <span style={{ fontSize: '9.5px', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                                  {m.senderName} ({m.senderRole})
                                </span>
                                <div style={{ background: isMe ? '#ffffff' : 'var(--ds-surface2)', border: isMe ? 'none' : '1px solid var(--ds-border)', padding: '10px', borderRadius: '8px', fontSize: '12.5px', color: isMe ? '#000000' : '#fff' }}>
                                  {m.content}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Send bar */}
                        <form onSubmit={sendChatMessage} style={{ display: 'flex', gap: '8px', padding: '14px', borderTop: '1px solid var(--ds-border)', background: 'var(--ds-surface2)' }}>
                          <input type="text" className="ds-input" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type contribution to study plan chat..." style={{ flex: 1 }} />
                          <button type="submit" className="ds-btn ds-btn-primary" style={{ background: '#ffffff', color: '#000000', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Send</button>
                        </form>
                      </>
                    ) : showNewEscalationForm ? (
                      /* ── NEW ESCALATION CREATION FORM ── */
                      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--ds-text1)' }}>Start New Intervention</h3>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ds-text3)' }}>Select a student, assign mentor &amp; faculty, then create the 4-way thread.</p>
                          </div>
                          <button onClick={() => setShowNewEscalationForm(false)} style={{ background: 'transparent', border: '1px solid var(--ds-border)', borderRadius: '6px', color: 'var(--ds-text3)', padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}>✕ Cancel</button>
                        </div>

                        <form onSubmit={handleCreateNewEscalation} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                          {/* ─ STUDENT SELECTOR (multi-select) ─ */}
                          <div style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ds-text1)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Select Students</span>
                              {newEscRollNos.length > 0 && (
                                <span style={{ marginLeft: 'auto', fontSize: '9px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>
                                  {newEscRollNos.length} selected
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                              {studentsList.length === 0 ? (
                                <span style={{ fontSize: '12px', color: 'var(--ds-text3)', padding: '8px 0' }}>No students in department</span>
                              ) : studentsList.map((s: any) => {
                                const student = s.user;
                                const rollNo = s.profile?.rollNo || '';
                                const isSelected = newEscRollNos.includes(rollNo);
                                const toggle = () => setNewEscRollNos(prev => isSelected ? prev.filter(r => r !== rollNo) : [...prev, rollNo]);
                                return (
                                  <button key={student.id} type="button" onClick={toggle}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', border: isSelected ? '1.5px solid #3b82f6' : '1px solid var(--ds-border)', background: isSelected ? 'rgba(59,130,246,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
                                    {/* Checkbox */}
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1.5px solid var(--ds-border)', background: isSelected ? '#3b82f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </div>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{student.fullName?.charAt(0) || '?'}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ds-text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.fullName}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>Roll: {rollNo}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ─ MENTOR SELECTOR (multi-select) ─ */}
                          <div style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ds-text1)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Assign Mentors</span>
                              {newEscMentorIds.length > 0 ? (
                                <span style={{ marginLeft: 'auto', fontSize: '9px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>
                                  {newEscMentorIds.length} selected
                                </span>
                              ) : (
                                <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--ds-text3)' }}>optional</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                              {facultyList.filter((f: any) => f.role === 'Mentor').length === 0 ? (
                                <span style={{ fontSize: '12px', color: 'var(--ds-text3)', padding: '8px 0' }}>No mentors in department</span>
                              ) : facultyList.filter((f: any) => f.role === 'Mentor').map((m: any) => {
                                const isSelected = newEscMentorIds.includes(m.id);
                                const toggle = () => setNewEscMentorIds(prev => isSelected ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                                return (
                                  <button key={m.id} type="button" onClick={toggle}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', border: isSelected ? '1.5px solid #10b981' : '1px solid var(--ds-border)', background: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1.5px solid var(--ds-border)', background: isSelected ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </div>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isSelected ? '#10b981' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.fullName?.charAt(0) || '?'}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ds-text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.fullName}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--ds-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ─ FACULTY SELECTOR (multi-select) ─ */}
                          <div style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ds-text1)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Assign Faculty</span>
                              {newEscFacultyIds.length > 0 ? (
                                <span style={{ marginLeft: 'auto', fontSize: '9px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 7px', borderRadius: '4px', fontWeight: 800 }}>
                                  {newEscFacultyIds.length} selected
                                </span>
                              ) : (
                                <span style={{ marginLeft: 'auto', fontSize: '9px', color: 'var(--ds-text3)' }}>optional</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '130px', overflowY: 'auto' }}>
                              {facultyList.filter((f: any) => f.role === 'Faculty').length === 0 ? (
                                <span style={{ fontSize: '12px', color: 'var(--ds-text3)', padding: '8px 0' }}>No faculty in department</span>
                              ) : facultyList.filter((f: any) => f.role === 'Faculty').map((f: any) => {
                                const isSelected = newEscFacultyIds.includes(f.id);
                                const toggle = () => setNewEscFacultyIds(prev => isSelected ? prev.filter(id => id !== f.id) : [...prev, f.id]);
                                return (
                                  <button key={f.id} type="button" onClick={toggle}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', border: isSelected ? '1.5px solid #f59e0b' : '1px solid var(--ds-border)', background: isSelected ? 'rgba(245,158,11,0.08)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.15s' }}>
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: isSelected ? 'none' : '1.5px solid var(--ds-border)', background: isSelected ? '#f59e0b' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {isSelected && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                    </div>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isSelected ? '#f59e0b' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{f.fullName?.charAt(0) || '?'}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ds-text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fullName}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--ds-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.email}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ─ SUBJECT CODE ─ */}
                          <div style={{ background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '12px', padding: '14px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ds-text1)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: '8px' }}>Subject / Course Code</label>
                            <input
                              type="text"
                              className="ds-input"
                              value={newEscSubjectCode}
                              onChange={e => setNewEscSubjectCode(e.target.value)}
                              placeholder="e.g. CS301 or GENERAL"
                              style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                            <p style={{ margin: '6px 0 0', fontSize: '10px', color: 'var(--ds-text3)' }}>Leave as GENERAL for a non-subject-specific review.</p>
                          </div>

                          {/* ─ SUBMIT ─ */}
                          <button
                            type="submit"
                            disabled={newEscRollNos.length === 0 || creatingEscalation}
                            style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: newEscRollNos.length > 0 ? '#ffffff' : 'var(--ds-surface2)', color: newEscRollNos.length > 0 ? '#000000' : 'var(--ds-text3)', fontWeight: 800, fontSize: '13px', cursor: newEscRollNos.length > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                          >
                            {creatingEscalation ? (
                              <><div style={{ width: '14px', height: '14px', border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />Creating...</>
                            ) : (
                              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              Create {newEscRollNos.length > 1 ? `${newEscRollNos.length} Threads` : 'Intervention Thread'}</>
                            )}
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--ds-text3)', padding: '24px' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        <span style={{ fontSize: '13px', textAlign: 'center' }}>Select a thread from the sidebar to open the 4-way intervention room, or click <strong style={{ color: 'var(--ds-text2)' }}>+ New</strong> to start one.</span>
                      </div>
                    )}
                  </div>

                  {/* Private Staff Case Notes Right (Security Restrictive Component) */}
                  <div style={{ width: '280px', background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ds-text2)' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                       <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ds-text1)', margin: 0 }}>Private Case Notes</h3>
                     </div>
                    <span style={{ fontSize: '10px', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Staff Only — Hidden from Student</span>

                    {activeThread ? (
                      <>
                        <form onSubmit={addCaseNote} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <textarea className="ds-input" rows={2} value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Log confidential counseling comment..." style={{ resize: 'none', fontSize: '12px' }} />
                          <button type="submit" className="ds-btn ds-btn-primary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>Save Note</button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, marginTop: '8px' }}>
                          {privateNotes.map((note: any) => (
                            <div key={note.id} style={{ padding: '8px', background: 'var(--ds-surface2)', borderRadius: '8px', borderLeft: '2.5px solid #10b981' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--ds-text3)', marginBottom: '4px' }}>
                                <span>By: {note.authorRole}</span>
                                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              </div>
                              <p style={{ fontSize: '11.5px', color: 'var(--ds-text2)', margin: 0 }}>{note.content}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text3)', fontSize: '12px', textAlign: 'center' }}>
                        Confidential case notes render once an active thread is selected.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'notifications' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 6px' }}>HOD Command Center Notifications</h2>
                    <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: 0 }}>View audit updates, system-generated intervention warnings, and send manual alerts to students.</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', alignItems: 'start' }}>
                    {/* Left Column: Inbox */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 4px' }}>Inbox Alerts</h3>
                      {hodNotifications.length === 0 ? (
                        <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '30px', textAlign: 'center', color: 'var(--ds-text3)' }}>
                          No new notifications.
                        </div>
                      ) : (
                        hodNotifications.map((notif: any) => (
                          <div key={notif.id} style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'flex-start', opacity: notif.read ? 0.7 : 1 }}>
                            <div style={{ background: notif.read ? 'rgba(255, 255, 255, 0.04)' : 'rgba(59, 130, 246, 0.1)', color: notif.read ? 'var(--ds-text3)' : '#3b82f6', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: 'var(--ds-text1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {notif.title}
                                  {!notif.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--ds-text3)' }}>
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
                              <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: '6px 0 0', lineHeight: '1.4' }}>{notif.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Right Column: Broadcast Form */}
                    <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 14px' }}>Manual Notification Broadcast</h3>
                      <form onSubmit={handleSendHODNotification} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Target Audience</label>
                          <select className="ds-input" value={hodNotifTarget === 'ALL' ? 'ALL' : 'SPECIFIC'} onChange={e => setHodNotifTarget(e.target.value === 'ALL' ? 'ALL' : '')} style={{ padding: '10px', fontSize: '13px' }}>
                            <option value="ALL">Department Students (Global)</option>
                            <option value="SPECIFIC">Target Specific Roll Number</option>
                          </select>
                        </div>

                        {hodNotifTarget !== 'ALL' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Student Roll Number</label>
                            <input 
                              type="text" 
                              className="ds-input" 
                              placeholder="e.g. 22B01A0501" 
                              value={hodNotifTarget} 
                              onChange={e => setHodNotifTarget(e.target.value)} 
                              style={{ padding: '10px', fontSize: '13px' }}
                              required
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Alert Category</label>
                          <select className="ds-input" value={hodNotifType} onChange={e => setHodNotifType(e.target.value)} style={{ padding: '10px', fontSize: '13px' }}>
                            <option value="SYSTEM">System Announcement</option>
                            <option value="ACADEMIC">Academic</option>
                            <option value="PLACEMENT">Placement Training</option>
                            <option value="VERIFICATION">Verification Request</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Alert Title</label>
                          <input 
                            type="text" 
                            className="ds-input" 
                            placeholder="Enter alert title..." 
                            value={hodNotifTitle} 
                            onChange={e => setHodNotifTitle(e.target.value)} 
                            style={{ padding: '10px', fontSize: '13px' }}
                            required
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Message Body</label>
                          <textarea 
                            className="ds-input" 
                            rows={3} 
                            placeholder="Enter warning details..." 
                            value={hodNotifMessage} 
                            onChange={e => setHodNotifMessage(e.target.value)} 
                            style={{ padding: '10px', fontSize: '13px', resize: 'vertical' }}
                            required
                          />
                        </div>

                        <button type="submit" className="ds-btn ds-btn-primary" style={{ marginTop: '6px' }} disabled={sendingHodNotif}>
                          {sendingHodNotif ? 'Broadcasting...' : 'Broadcast Alert'}
                        </button>
                      </form>
                    </div>

                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════
                  DIRECT MESSAGES TAB (Forest Green Theme)
              ══════════════════════════════════════════ */}
              {activeTab === 'messages' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: '20px' }}>
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 6px' }}>Direct Messages</h2>
                    <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: 0 }}>Real-time counseling and support with students in your department.</p>
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
                    {/* Left Sidebar: Conversations & Contacts */}
                    <div style={{
                      width: '260px',
                      borderRight: '1px solid var(--ds-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'var(--ds-surface2)',
                      flexShrink: 0
                    }}>
                      {/* Pill Tab Selector */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '12px', borderBottom: '1px solid var(--ds-border)' }}>
                        {['chats', 'students', 'faculty', 'mentors'].map((tab) => {
                          const isAct = msgSidebarTab === tab;
                          return (
                            <button
                              key={tab}
                              onClick={() => setMsgSidebarTab(tab as any)}
                              style={{
                                padding: '6px 2px',
                                borderRadius: '6px',
                                border: 'none',
                                background: isAct ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                                color: isAct ? '#ffffff' : 'var(--ds-text3)',
                                fontSize: '10px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                textAlign: 'center',
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px'
                              }}
                            >
                              {tab === 'chats' ? 'Chats' : tab === 'students' ? 'Studs' : tab === 'faculty' ? 'Fac' : 'Ment'}
                            </button>
                          );
                        })}
                      </div>

                      {/* Scrollable list */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {msgSidebarTab === 'chats' && (
                          staffConversations.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ds-text3)' }}>
                              No active chats
                            </div>
                          ) : (
                            staffConversations.map((c) => {
                              const isSelected = (selectedConversation?.userId && selectedConversation?.userId === c.userId) || 
                                                 (selectedConversation?.studentRollNo === c.studentRollNo);
                              const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
                              return (
                                <button
                                  key={c.userId || c.studentRollNo}
                                  onClick={() => setSelectedConversation(c)}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    padding: '12px',
                                    border: 'none',
                                    borderRadius: '10px',
                                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    width: '100%',
                                    transition: 'all 0.2s ease',
                                    borderLeft: isSelected ? '3px solid #ffffff' : '3px solid transparent'
                                  }}
                                >
                                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: isSelected ? '#ffffff' : 'var(--ds-text1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span>{c.studentName}</span>
                                      {c.role && c.role !== 'Student' && (
                                        <span style={{ fontSize: '8.5px', padding: '1px 4px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--ds-text3)', textTransform: 'uppercase' }}>
                                          {c.role}
                                        </span>
                                      )}
                                    </div>
                                    {c.role === 'Student' && (
                                      <span style={{ fontSize: '10px', color: 'var(--ds-text3)' }}>{c.studentRollNo}</span>
                                    )}
                                  </div>
                                  {lastMsg && (
                                    <div style={{
                                      fontSize: '11.5px',
                                      color: 'var(--ds-text3)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      width: '100%',
                                      marginTop: '2px'
                                    }}>
                                      {lastMsg.senderRole === 'HOD' ? 'You: ' : `${lastMsg.senderRole}: `}{lastMsg.messageText}
                                    </div>
                                  )}
                                </button>
                              );
                            })
                          )
                        )}

                        {msgSidebarTab === 'students' && (
                          studentsList.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ds-text3)' }}>
                              No students loaded
                            </div>
                          ) : (
                            studentsList.map((s) => {
                              const student = s.user;
                              const rollNo = s.profile.rollNo;
                              const isSelected = selectedConversation?.userId === student.id || selectedConversation?.studentRollNo === rollNo;
                              return (
                                <button
                                  key={student.id}
                                  onClick={() => {
                                    const existing = staffConversations.find(c => c.userId === student.id || c.studentRollNo === rollNo);
                                    if (existing) {
                                      setSelectedConversation(existing);
                                    } else {
                                      setSelectedConversation({
                                        userId: student.id,
                                        studentRollNo: rollNo,
                                        studentName: student.fullName,
                                        studentEmail: s.profile.personalEmail || student.email,
                                        role: 'Student',
                                        messages: []
                                      });
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    width: '100%',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: '#ffffff', flexShrink: 0, justifyContent: 'center' }}>
                                    {student.fullName ? student.fullName.substring(0, 1) : '?'}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--ds-text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {student.fullName}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--ds-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      Roll No: {rollNo}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )
                        )}

                        {msgSidebarTab === 'faculty' && (
                          facultyList.filter(f => f.role === 'Faculty' && f.email !== userSession.email).length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ds-text3)' }}>
                              No faculty found
                            </div>
                          ) : (
                            facultyList.filter(f => f.role === 'Faculty' && f.email !== userSession.email).map((f) => {
                              const isSelected = selectedConversation?.userId === f.id || selectedConversation?.studentEmail === f.email;
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => {
                                    const existing = staffConversations.find(c => c.userId === f.id || c.studentEmail === f.email);
                                    if (existing) {
                                      setSelectedConversation(existing);
                                    } else {
                                      setSelectedConversation({
                                        userId: f.id,
                                        studentRollNo: f.email,
                                        studentName: f.fullName,
                                        studentEmail: f.email,
                                        role: 'Faculty',
                                        messages: []
                                      });
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    width: '100%',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: '#ffffff', flexShrink: 0, justifyContent: 'center' }}>
                                    {f.fullName ? f.fullName.substring(0, 1) : '?'}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--ds-text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {f.fullName}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--ds-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {f.email}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )
                        )}

                        {msgSidebarTab === 'mentors' && (
                          facultyList.filter(f => f.role === 'Mentor' && f.email !== userSession.email).length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--ds-text3)' }}>
                              No mentors found
                            </div>
                          ) : (
                            facultyList.filter(f => f.role === 'Mentor' && f.email !== userSession.email).map((m) => {
                              const isSelected = selectedConversation?.userId === m.id || selectedConversation?.studentEmail === m.email;
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    const existing = staffConversations.find(c => c.userId === m.id || c.studentEmail === m.email);
                                    if (existing) {
                                      setSelectedConversation(existing);
                                    } else {
                                      setSelectedConversation({
                                        userId: m.id,
                                        studentRollNo: m.email,
                                        studentName: m.fullName,
                                        studentEmail: m.email,
                                        role: 'Mentor',
                                        messages: []
                                      });
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    width: '100%',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: '#ffffff', flexShrink: 0, justifyContent: 'center' }}>
                                    {m.fullName ? m.fullName.substring(0, 1) : '?'}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--ds-text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {m.fullName}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--ds-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {m.email}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )
                        )}
                      </div>
                    </div>

                    {/* Right: Chat Feed & Action Panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--ds-surface)' }}>
                      {selectedConversation ? (
                        <>
                          {/* Chat Header */}
                          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-border)', background: 'var(--ds-surface2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ds-text1)' }}>{selectedConversation.studentName}</span>
                              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: selectedConversation.role === 'Student' ? '#10b981' : selectedConversation.role === 'Faculty' ? '#f59e0b' : '#3b82f6', color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>
                                {selectedConversation.role || 'Student'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)', marginTop: '4px' }}>
                              {selectedConversation.role === 'Student' ? `Roll No: ${selectedConversation.studentRollNo}` : `Email: ${selectedConversation.studentEmail}`}
                            </div>
                          </div>

                          {/* Chat Feed */}
                          <div ref={staffChatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {selectedConversation.messages && selectedConversation.messages.map((msg: any, idx: number) => {
                              const isMe = msg.senderRole === 'HOD';
                              return (
                                <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '70%',
                                    gap: '3px'
                                  }}>
                                    <div style={{
                                      background: isMe ? 'var(--accent)' : 'var(--ds-surface3)',
                                      color: isMe ? '#000000' : 'var(--ds-text1)',
                                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                      padding: '10px 14px',
                                      fontSize: '13px',
                                      lineHeight: '1.45',
                                      border: isMe ? 'none' : '1px solid var(--ds-border)'
                                    }}>
                                      {msg.messageText}
                                    </div>
                                    <span style={{ fontSize: '9.5px', color: 'var(--ds-text3)' }}>
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Chat Reply Form */}
                          <form onSubmit={handleSendStaffMessage} style={{ padding: '16px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', gap: '12px', background: 'var(--ds-surface2)' }}>
                            <input
                              type="text"
                              className="ds-input"
                              placeholder={`Reply to ${selectedConversation.studentName}...`}
                              value={staffMsgInput}
                              onChange={e => setStaffMsgInput(e.target.value)}
                              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                            />
                            <button
                              type="submit"
                              className="ds-btn ds-btn-primary"
                              disabled={!staffMsgInput.trim()}
                              style={{ padding: '10px 20px', background: '#ffffff', border: 'none', color: '#000000', fontWeight: 700 }}
                            >
                              Send
                            </button>
                          </form>
                        </>
                      ) : (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--ds-text3)' }}>
                          <div style={{ fontSize: '32px', marginBottom: '10px' }}>💬</div>
                          <div style={{ fontWeight: 700 }}>Select a student conversation to view chat history</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 6px' }}>HOD Profile Settings</h2>
                    <p style={{ fontSize: '13px', color: 'var(--ds-text2)', margin: 0 }}>Review your registered account profile status and update security parameters.</p>
                  </div>

                  <div style={{ background: 'var(--ds-surface)', border: '1px solid var(--ds-border)', borderRadius: '16px', padding: '24px' }}>
                    <form onSubmit={handleSaveHODProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Profile Picture Section */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          color: '#fff',
                          fontSize: '24px',
                          overflow: 'hidden',
                          border: '2px solid var(--ds-border)'
                        }}>
                          {profilePhotoUrl ? (
                            <img src={`${API_BASE_URL}${profilePhotoUrl}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            userSession.fullName?.slice(0, 1)?.toUpperCase() || 'H'
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Profile Photo</label>
                          <input type="file" accept="image/*" onChange={handleHODPhotoUpload} style={{ fontSize: '12px', color: 'var(--ds-text2)' }} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Full Name</label>
                        <input type="text" className="ds-input" value={profileFullName} onChange={e => setProfileFullName(e.target.value)} required />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Email Address</label>
                        <input type="email" className="ds-input" value={hodProfile?.email || userSession.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Contact Phone</label>
                        <input type="text" className="ds-input" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="Enter mobile number..." />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Account Authority Role</label>
                        <input type="text" className="ds-input" value={hodProfile?.role || userSession.role} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--ds-text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Change Password</label>
                        <input type="password" className="ds-input" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Type new password to modify..." />
                      </div>

                      <button type="submit" className="ds-btn ds-btn-primary" style={{ marginTop: '10px' }}>
                        Save Settings
                      </button>
                    </form>
                  </div>
                </div>
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
            background: 'var(--ds-surface)',
            border: '1px solid var(--ds-border)',
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
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ds-surface2)' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ds-text1)', margin: 0 }}>{selectedDetailUser.fullName}</h3>
                <span style={{ fontSize: '12px', color: 'var(--ds-text3)' }}>{selectedDetailUser.role} &nbsp;|&nbsp; {selectedDetailUser.email}</span>
              </div>
              <button
                onClick={() => setSelectedDetailUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ds-text2)', fontSize: '20px', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {detailUserLoading ? (
                <div style={{ margin: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div className="ds-loading-spinner" />
                  <span style={{ fontSize: '13px', color: 'var(--ds-text2)' }}>Syncing profile workspace records...</span>
                </div>
              ) : detailUserData ? (
                <>
                  {/* General User Profile Details (Matches Admin layout style) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', marginBottom: '24px', borderBottom: '1px solid var(--ds-border)', paddingBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Email Address</span>
                      <span style={{ fontWeight: '500', color: 'var(--ds-text1)' }}>{detailUserData.user?.email}</span>
                    </div>

                    {selectedDetailUser.role === 'Student' && detailUserData.profile?.rollNo && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Register Number</span>
                        <span style={{ fontWeight: '700', color: 'var(--accent)', fontFamily: 'monospace', letterSpacing: '1px' }}>{detailUserData.profile.rollNo}</span>
                      </div>
                    )}

                    {selectedDetailUser.role === 'Student' && detailUserData.profile?.batch && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Academic Batch</span>
                        <span style={{ fontWeight: '500', color: 'var(--ds-text1)' }}>{detailUserData.profile.batch}</span>
                      </div>
                    )}

                    {selectedDetailUser.role === 'Student' && detailUserData.profile?.cgpa !== undefined && (
                      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                        <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>CGPA</span>
                        <span style={{ fontWeight: '700', color: detailUserData.profile.cgpa >= 8 ? '#10b981' : detailUserData.profile.cgpa >= 6 ? '#f59e0b' : '#ef4444' }}>
                          {detailUserData.profile.cgpa.toFixed(2)} / 10.00
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Phone Number</span>
                      <span style={{ fontWeight: '500', color: 'var(--ds-text1)' }}>{detailUserData.user?.phone || 'Not Registered'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Departments</span>
                      <span style={{ fontWeight: '500', color: 'var(--ds-text1)' }}>{detailUserData.user?.departmentIds?.join(', ') || 'General / None'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Portal Access</span>
                      <span style={{ fontWeight: '700', color: detailUserData.user?.active ? '#10b981' : '#ef4444' }}>
                        {detailUserData.user?.active ? 'Granted / Active' : 'Revoked / Locked'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Date Enrolled</span>
                      <span style={{ fontWeight: '500', color: 'var(--ds-text1)' }}>{detailUserData.user?.createdAt ? new Date(detailUserData.user.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid var(--ds-border)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Last IP Address</span>
                      <span style={{ fontWeight: '500', fontFamily: 'monospace', color: 'var(--ds-text1)' }}>{detailUserData.user?.lastLoginIp || 'None'}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr' }}>
                      <span style={{ color: 'var(--ds-text3)', fontWeight: '600' }}>Last Login Time</span>
                      <span style={{ fontWeight: '500', color: 'var(--ds-text1)' }}>
                        {detailUserData.user?.lastLogin ? new Date(detailUserData.user.lastLogin).toLocaleString() : 'Never'}
                      </span>
                    </div>
                  </div>

                  {selectedDetailUser.role === 'Student' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Semester Results */}
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Semester Results History</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {detailUserData.results && detailUserData.results.map((r: any) => (
                            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '8px', fontSize: '12.5px' }}>
                              <span style={{ color: 'var(--ds-text1)', fontWeight: 600 }}>{r.subjectCode} - {r.subjectName}</span>
                              <span style={{ color: r.grade === 'F' ? 'var(--ds-red)' : 'var(--accent)', fontWeight: 800 }}>{r.grade} (Sem {r.semester})</span>
                            </div>
                          ))}
                          {(!detailUserData.results || detailUserData.results.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)', margin: 0 }}>No results uploaded yet.</p>}
                        </div>
                      </div>

                      {/* Projects */}
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Portfolios & Projects</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {detailUserData.projects && detailUserData.projects.map((p: any) => (
                            <div key={p.id} style={{ padding: '12px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '10px' }}>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ds-text1)' }}>{p.title}</div>
                              <div style={{ fontSize: '11px', color: 'var(--ds-text3)', marginTop: '2px' }}>Tech stack: {p.technologies}</div>
                              <p style={{ fontSize: '12px', color: 'var(--ds-text2)', margin: '6px 0 0' }}>{p.description}</p>
                            </div>
                          ))}
                          {(!detailUserData.projects || detailUserData.projects.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)', margin: 0 }}>No projects uploaded yet.</p>}
                        </div>
                      </div>

                      {/* Certifications */}
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Professional Certifications</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {detailUserData.certifications && detailUserData.certifications.map((c: any) => (
                            <div key={c.id} style={{ padding: '12px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ds-text1)' }}>{c.title}</div>
                                <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)', marginTop: '2px' }}>Issued by: {c.issuingAuthority}</div>
                              </div>
                              {c.certUrl && <a href={c.certUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 700 }}>Verify ↗</a>}
                            </div>
                          ))}
                          {(!detailUserData.certifications || detailUserData.certifications.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)', margin: 0 }}>No certifications recorded.</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDetailUser.role === 'Mentor' && (
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Mentees</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detailUserData.assignedStudents && detailUserData.assignedStudents.map((s: any) => (
                          <div key={s.profile?.id} style={{ padding: '12px 16px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '13.5px', color: 'var(--ds-text1)' }}>{s.user?.fullName}</strong>
                              <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)', marginTop: '2px' }}>Roll No: {s.profile?.rollNo} | Batch: {s.profile?.batch}</div>
                            </div>
                            <button
                              className="ds-btn ds-btn-ghost"
                              onClick={() => fetchUserDetailForHOD({ id: s.user?.id, fullName: s.user?.fullName, email: s.user?.email, role: 'Student' })}
                              style={{ padding: '4px 10px', fontSize: '11.5px', cursor: 'pointer', color: 'var(--accent)' }}
                            >
                              Check Profile
                            </button>
                          </div>
                        ))}
                        {(!detailUserData.assignedStudents || detailUserData.assignedStudents.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)', textAlign: 'center', padding: '12px' }}>No student mentees assigned yet.</p>}
                      </div>
                    </div>
                  )}

                  {selectedDetailUser.role === 'Faculty' && (
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ds-text1)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teaching Course Workload</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detailUserData.courses && detailUserData.courses.map((c: any) => (
                          <div key={c.id} style={{ padding: '12px 16px', background: 'var(--ds-surface2)', border: '1px solid var(--ds-border)', borderRadius: '10px' }}>
                            <strong style={{ fontSize: '13.5px', color: 'var(--ds-text1)' }}>{c.courseName} ({c.courseCode})</strong>
                            <div style={{ fontSize: '11.5px', color: 'var(--ds-text3)', marginTop: '2px' }}>Target: {c.targetYear} Year Sec-{c.targetSection} | Credits: {c.credits || 3}</div>
                          </div>
                        ))}
                        {(!detailUserData.courses || detailUserData.courses.length === 0) && <p style={{ fontSize: '12.5px', color: 'var(--ds-text3)', textAlign: 'center', padding: '12px' }}>No courses assigned to teach.</p>}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--ds-text3)', margin: '0 0 12px' }}>Failed to resolve profile dataset.</p>
                  <button
                    className="ds-btn ds-btn-primary"
                    onClick={() => fetchUserDetailForHOD(selectedDetailUser)}
                    style={{ padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Retry Connection
                  </button>
                </div>
              )}
            </div>
            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--ds-border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--ds-surface2)' }}>
              <button
                className="ds-btn ds-btn-ghost"
                onClick={() => setSelectedDetailUser(null)}
                style={{ padding: '8px 18px', cursor: 'pointer', border: '1px solid var(--ds-border)', background: 'transparent', borderRadius: '8px', color: 'var(--ds-text2)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="ds-bottom-nav">
        {([
          { key: 'overview' as Tab, label: 'Home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
          { key: 'faculty' as Tab, label: 'Faculty', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { key: 'training' as Tab, label: 'Training', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'notifications' as Tab, label: 'Alerts', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'settings' as Tab, label: 'Profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(item => (
          <button
            key={item.key}
            className={`ds-bottom-nav-item ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.key === 'notifications' && hodNotifications.filter((n: any) => !n.read).length > 0 && (
              <span className="ds-bottom-badge">{hodNotifications.filter((n: any) => !n.read).length}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
