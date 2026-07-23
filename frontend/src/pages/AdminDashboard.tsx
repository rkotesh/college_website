import React, { useState, useEffect } from 'react';
import { read, utils, write } from 'xlsx';
import LogoHeader from '../components/LogoHeader';


type Role = 'Student' | 'Parent' | 'Faculty' | 'Mentor' | 'HOD' | 'Director';

interface AdminDashboardProps {
  userSession: {
    role: string;
    email: string;
    fullName?: string;
    accessToken: string;
  };
  handleLogout: () => void;
}

export default function AdminDashboard({ userSession, handleLogout }: AdminDashboardProps) {
  const getInitialTab = (): 'uploads' | 'directory' | 'otp' | 'results' | 'departments' | 'certifications' | 'notifications' => {
    const parts = window.location.pathname.split('/');
    const tabFromUrl = parts[parts.length - 1];
    const validTabs = ['uploads', 'directory', 'otp', 'results', 'departments', 'certifications', 'notifications'];
    if (validTabs.includes(tabFromUrl)) {
      return tabFromUrl as any;
    }
    return 'directory';
  };

  const [adminTab, setAdminTab] = useState<'uploads' | 'directory' | 'otp' | 'results' | 'departments' | 'certifications' | 'notifications'>(getInitialTab());

  // Whenever adminTab changes, update history URL and title
  useEffect(() => {
    let tabLabel = '';
    switch (adminTab) {
      case 'directory': tabLabel = 'User Directory'; break;
      case 'uploads': tabLabel = 'Bulk Data Import'; break;
      case 'otp': tabLabel = 'OTP Audit Logs'; break;
      case 'results': tabLabel = 'Semester Exams Results'; break;
      case 'departments': tabLabel = 'Academic Departments'; break;
      case 'certifications': tabLabel = 'External Certifications'; break;
      case 'notifications': tabLabel = 'Broadcast Notifications'; break;
      default: {
        const tabStr = adminTab as string;
        tabLabel = tabStr.charAt(0).toUpperCase() + tabStr.slice(1);
      }
    }
    
    document.title = `${tabLabel} | Admin Dashboard | CIET ERP`;
    
    const newPath = adminTab === 'directory' ? '/admin-dashboard' : `/admin-dashboard/${adminTab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [adminTab]);

  // Sync adminTab when the back/forward button is clicked
  useEffect(() => {
    const handlePopState = () => {
      const parts = window.location.pathname.split('/');
      const tabFromUrl = parts[parts.length - 1];
      const validTabs = ['uploads', 'directory', 'otp', 'results', 'departments', 'certifications', 'notifications'];
      if (validTabs.includes(tabFromUrl)) {
        setAdminTab(tabFromUrl as any);
      } else {
        setAdminTab('directory');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [departments, setDepartments] = useState<{code: string, name: string, sections: string[]}[]>([]);

  // Notifications manual broadcast states
  const [notifTarget, setNotifTarget] = useState('ALL');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('SYSTEM');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Departments & Sections modal state
  const [activeDeptModal, setActiveDeptModal] = useState<'create' | 'edit' | null>(null);
  const [selectedDeptForModal, setSelectedDeptForModal] = useState<any | null>(null);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [deptCodeInput, setDeptCodeInput] = useState('');
  const [deptSectionsInput, setDeptSectionsInput] = useState('');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [otpRecords, setOtpRecords] = useState<any[]>([]);
  // const [resultsList, setResultsList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [staffFile, setStaffFile] = useState<File | null>(null);
  const [_resultsFile, setResultsFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Salesforce-style bulk selections
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // AWS-style system audit logs
  const [systemLogs, setSystemLogs] = useState<Array<{ time: string, message: string, type: 'info' | 'warn' | 'error' }>>([
    { time: new Date().toLocaleTimeString(), message: 'Security System Audit initialized.', type: 'info' }
  ]);

  // Vercel-style real-time diagnostics drawer
  const [diagnostics, setDiagnostics] = useState<{
    status: string;
    dbConnected: boolean;
    dbLatencyMs: number;
    smtpOk: boolean;
    totalUsers: number;
    activeSessions: number;
    timestamp: string;
  } | null>(null);
  const [diagnosticsDrawerOpen, setDiagnosticsDrawerOpen] = useState(false);

  // Retool-style Pre-Flight staging grid
  const [stagedData, setStagedData] = useState<{
    type: 'students' | 'users' | 'results';
    headers: string[];
    rows: any[];
    errorsCount: number;
  } | null>(null);

  // Search filter options
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // CRUD Modal States
  const [activeModal, setActiveModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<any | null>(null);
  const [formEmail, setFormEmail] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<Role>('Student');
  const [formPassword, setFormPassword] = useState('');
  const [formDeptCode, setFormDeptCode] = useState('');

  // Student Profile specific fields
  const [formRollNo, setFormRollNo] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formCgpa, setFormCgpa] = useState('0.0');
  const [formSectionId, setFormSectionId] = useState('');

  // Results CRUD Modal States
  // const [activeResultModal, setActiveResultModal] = useState<'create' | 'edit' | null>(null);
  // const [selectedResult, setSelectedResult] = useState<any | null>(null);
  // const [resRollNo, setResRollNo] = useState('');
  // const [resSemester, setResSemester] = useState('');
  // const [resExamName, setResExamName] = useState('');
  // const [resSubjectCode, setResSubjectCode] = useState('');
  // const [resSubjectName, setResSubjectName] = useState('');
  // const [resScore, setResScore] = useState('0.0');
  // const [resMaxScore, setResMaxScore] = useState('100.0');
  // const [resGrade, setResGrade] = useState('');

  // Student full profile data for admin view
  const [studentDashboardData, setStudentDashboardData] = useState<any | null>(null);
  const [studentDataLoading, setStudentDataLoading] = useState(false);
  const [certTypeFilter, setCertTypeFilter] = useState<string>('All');

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';

  const fetchStudentDashboardData = async (userId: string) => {
    setStudentDataLoading(true);
    setStudentDashboardData(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/students/${userId}/dashboard`, { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentDashboardData(data);
      }
    } catch (e) {
      // ignore
    } finally {
      setStudentDataLoading(false);
    }
  };

  const handleSendAdminNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert('Title and Message are required.');
      return;
    }
    try {
      setSendingNotif(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({
          rollNo: notifTarget,
          title: notifTitle,
          message: notifMessage,
          type: notifType
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send notification.');
      }
      alert('Notification dispatched successfully!');
      setNotifTitle('');
      setNotifMessage('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSendingNotif(false);
    }
  };

  // State for Admin Certifications Tab
  const [allStudentCertifications, setAllStudentCertifications] = useState<any[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [certSearchQuery, setCertSearchQuery] = useState('');
  const [certDomainFilter, setCertDomainFilter] = useState('ALL');
  const [certTypeFilterTab, setCertTypeFilterTab] = useState('ALL');
  const [certStatusFilter, setCertStatusFilter] = useState('ALL');

  const fetchAllStudentCertifications = async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/certifications`, { 
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllStudentCertifications(data);
      }
    } catch (e) {
      console.error("Failed to fetch all certifications", e);
    } finally {
      setLoadingCerts(false);
    }
  };

  const handleVerifyCert = async (certId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/certifications/${certId}/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (res.ok) {
        alert('Certification verified successfully!');
        fetchAllStudentCertifications();
      } else {
        const err = await res.json();
        alert('Verification failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Verification failed: Network or server error');
    }
  };

  const handleRejectCert = async (certId: string) => {
    const reason = window.prompt('Enter rejection feedback reason for the student:');
    if (reason === null) return; // cancelled
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/certifications/${certId}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify({ reason }),
        credentials: 'include'
      });
      if (res.ok) {
        alert('Certification rejected with feedback!');
        fetchAllStudentCertifications();
      } else {
        const err = await res.json();
        alert('Rejection failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Rejection failed: Network or server error');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchDiagnostics();
    fetchDepartments();
    if (userSession.role === 'Director') {
      fetchOtpRecords();
    }
    if (adminTab === 'certifications') {
      fetchAllStudentCertifications();
    }
  }, [userSession, adminTab, userSearch]);

  const logSystemAction = (message: string, type: 'info' | 'warn' | 'error' = 'info') => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setSystemLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const handleResponse = async (response: Response) => {
    // Logout only on truly unauthorized (401). Forbidden (403) may be expected for some admin actions.
    if (response.status === 401) {
      logSystemAction('Security rejection: 401 Unauthorized. Session key mismatch or token expired.', 'error');
      handleLogout();
      alert('Your session has expired. Please log in again.');
      throw new Error('Unauthorized');
    }
    // For 403, allow the caller to handle the error without logging out.
    if (!response.ok) {
      let errMsg = `Request failed with status ${response.status}`;
      try {
        const errData = await response.json();
        errMsg = errData.error || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
    }
    return response.json();
  };

  const openCreateDeptModal = () => {
    setDeptNameInput('');
    setDeptCodeInput('');
    setDeptSectionsInput('');
    setActiveDeptModal('create');
  };

  const openEditDeptModal = (dept: any) => {
    setSelectedDeptForModal(dept);
    setDeptNameInput(dept.name);
    setDeptCodeInput(dept.code);
    setDeptSectionsInput(dept.sections.join(', '));
    setActiveDeptModal('edit');
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/public/departments`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (e) {
      console.error("Failed to fetch departments from DB", e);
    }
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = deptCodeInput.trim().toUpperCase();
    if (!code || !deptNameInput.trim()) {
      alert("Department code and name are required.");
      return;
    }
    if (departments.some(d => d.code === code)) {
      alert("A department with this code already exists.");
      return;
    }
    const newDept = {
      code,
      name: deptNameInput.trim(),
      sections: deptSectionsInput.split(',').map(s => s.trim()).filter(Boolean)
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(newDept),
        credentials: 'include'
      });
      if (res.ok) {
        await fetchDepartments();
        setActiveDeptModal(null);
        logSystemAction(`Created department: ${code}`, 'info');
      } else {
        const err = await res.json();
        alert("Failed to create department: " + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert("Network or server error during creation.");
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptForModal) return;
    const code = deptCodeInput.trim().toUpperCase();
    if (!code || !deptNameInput.trim()) {
      alert("Department code and name are required.");
      return;
    }
    if (code !== selectedDeptForModal.code && departments.some(d => d.code === code)) {
      alert("A department with this code already exists.");
      return;
    }
    const updatedDept = {
      code,
      name: deptNameInput.trim(),
      sections: deptSectionsInput.split(',').map(s => s.trim()).filter(Boolean)
    };
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userSession.accessToken}`
        },
        body: JSON.stringify(updatedDept),
        credentials: 'include'
      });
      if (res.ok) {
        if (code !== selectedDeptForModal.code) {
          await fetch(`${API_BASE_URL}/api/v1/admin/departments/${selectedDeptForModal.code}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${userSession.accessToken}` },
            credentials: 'include'
          });
        }
        await fetchDepartments();
        setActiveDeptModal(null);
        logSystemAction(`Updated department: ${code}`, 'info');
      } else {
        const err = await res.json();
        alert("Failed to update department: " + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert("Network or server error during update.");
    }
  };

  const handleDeleteDept = async (code: string) => {
    if (['CSE', 'ECE', 'EEE', 'AI', 'AIML'].includes(code)) {
      if (!window.confirm(`Warning: ${code} is a default core department. Are you sure you want to delete it?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you sure you want to delete the department ${code}?`)) {
        return;
      }
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/departments/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` },
        credentials: 'include'
      });
      if (res.ok) {
        await fetchDepartments();
        logSystemAction(`Deleted department: ${code}`, 'warn');
      } else {
        const err = await res.json();
        alert("Failed to delete: " + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert("Network or server error during delete.");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users?q=${userSearch}`, { credentials: 'include', 
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      const data = await handleResponse(response);
      setUsersList(data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchOtpRecords = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/otp-records`, { credentials: 'include', 
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOtpRecords(data);
      } else if (response.status === 403) {
        console.warn('OTP records endpoint returned 403 – ignoring for current role');
        setOtpRecords([]);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to fetch OTP records (status ${response.status})`);
      }
    } catch (err) {
      console.error('Failed to fetch OTP records', err);
    }
  };


  const openCreateModal = () => {
    setFormEmail('');
    setFormFullName('');
    setFormPhone('');
    setFormRole('Student');
    setFormPassword('');
    setFormDeptCode('');
    setFormRollNo('');
    setFormBatch('');
    setFormCgpa('0.0');
    setFormSectionId('');
    setActiveModal('create');
  };

  const openEditModal = (u: any) => {
    setSelectedUserForModal(u);
    setFormEmail(u.email);
    setFormFullName(u.fullName || '');
    setFormPhone(u.phone || '');
    setFormRole(u.role);
    setFormPassword('');
    setFormDeptCode(u.departmentIds?.[0] || '');
    setFormRollNo(u.rollNo || '');
    setFormBatch(u.batch || '');
    setFormCgpa(u.cgpa !== undefined ? String(u.cgpa) : '0.0');
    setFormSectionId(u.sectionId || '');
    setActiveModal('edit');
  };

  const openViewModal = (u: any) => {
    setSelectedUserForModal(u);
    setCertTypeFilter('All');
    setStudentDashboardData(null);
    if (u.role === 'Student') fetchStudentDashboardData(u.id);
    setActiveModal('view');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Validate password strength if custom password is supplied or required
    const isCustomPasswordSupplied = formPassword && formPassword.trim().length > 0;
    const isPasswordRequired = formRole !== 'Student';

    if (isPasswordRequired || isCustomPasswordSupplied) {
      const pwd = formPassword.trim();
      const lengthOk = pwd.length >= 8;
      const upperOk = /[A-Z]/.test(pwd);
      const lowerOk = /[a-z]/.test(pwd);
      const numOk = /[0-9]/.test(pwd);
      const symOk = /[^A-Za-z0-9]/.test(pwd);

      if (!lengthOk || !upperOk || !lowerOk || !numOk || !symOk) {
        setErrorMsg('Password must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, one number, and one symbol (e.g. @).');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users`, { credentials: 'include', 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userSession.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formEmail,
          fullName: formFullName,
          phone: formPhone,
          role: formRole,
          password: formPassword || undefined,
          department_code: formDeptCode,
          roll_no: formRollNo,
          batch: formBatch,
          cgpa: formCgpa,
          sectionId: formSectionId
        })
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Manually created user: ${formEmail} with role ${formRole}`, 'info');
        setActiveModal(null);
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Failed to create user');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForModal) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${selectedUserForModal.id}`, { credentials: 'include', 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userSession.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formEmail,
          fullName: formFullName,
          phone: formPhone,
          role: formRole,
          department_code: formDeptCode,
          cgpa: formCgpa,
          batch: formBatch,
          sectionId: formSectionId
        })
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Updated user ID: ${selectedUserForModal.id}`, 'info');
        setActiveModal(null);
        fetchUsers();
      } else {
        setErrorMsg(data.error || 'Failed to update user');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user account?")) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, { credentials: 'include', 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Permanently deleted user ID: ${userId}`, 'warn');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/results`, { credentials: 'include', 
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      await response.json();
      if (response.ok) {
        // setResultsList(data);
      }
    } catch (err) {
      console.error("Failed to fetch results", err);
    }
  };

  /*
  const openCreateResultModal = () => {
    setResRollNo('');
    setResSemester('1');
    setResExamName('Semester End Examinations');
    setResSubjectCode('');
    setResSubjectName('');
    setResScore('0.0');
    setResMaxScore('100.0');
    setResGrade('');
    setActiveResultModal('create');
  };

  const openEditResultModal = (r: any) => {
    setSelectedResult(r);
    setResRollNo(r.rollNo);
    setResSemester(r.semester);
    setResExamName(r.examName);
    setResSubjectCode(r.subjectCode);
    setResSubjectName(r.subjectName);
    setResScore(String(r.score));
    setResMaxScore(String(r.maxScore));
    setResGrade(r.grade || '');
    setActiveResultModal('edit');
  };

  const handleCreateResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/results`, { credentials: 'include', 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userSession.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rollNo: resRollNo,
          semester: resSemester,
          examName: resExamName,
          subjectCode: resSubjectCode,
          subjectName: resSubjectName,
          score: parseFloat(resScore),
          maxScore: parseFloat(resMaxScore),
          grade: resGrade
        })
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Created result for student: ${resRollNo}, subject: ${resSubjectCode}`, 'info');
        setActiveResultModal(null);
        fetchResults();
      } else {
        setErrorMsg(data.error || 'Failed to create result');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/results/${selectedResult.id}`, { credentials: 'include', 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userSession.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rollNo: resRollNo,
          semester: resSemester,
          examName: resExamName,
          subjectCode: resSubjectCode,
          subjectName: resSubjectName,
          score: parseFloat(resScore),
          maxScore: parseFloat(resMaxScore),
          grade: resGrade
        })
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Updated result ID: ${selectedResult.id}`, 'info');
        setActiveResultModal(null);
        fetchResults();
      } else {
        setErrorMsg(data.error || 'Failed to update result');
      }
    } catch (err) {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResult = async (resId: string) => {
    if (!window.confirm("Are you sure you want to delete this result record?")) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/results/${resId}`, { credentials: 'include', 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Deleted result ID: ${resId}`, 'warn');
        fetchResults();
      } else {
        alert(data.error || 'Failed to delete result');
      }
    } catch (err) {
      alert('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };
  */

  const fetchDiagnostics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/diagnostics`, { credentials: 'include', 
        headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
      });
      const data = await response.json();
      if (response.ok) {
        setDiagnostics(data);
      }
    } catch (err) {
      console.error("Failed to fetch diagnostics", err);
    }
  };

  const handleBulkToggle = async (action: 'activate' | 'deactivate') => {
    if (selectedUserIds.length === 0) return;
    setLoading(true);
    try {
      let successfulCount = 0;
      for (const userId of selectedUserIds) {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/toggle-active`, { credentials: 'include', 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userSession.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        });
        if (response.ok) {
          successfulCount++;
        }
      }
      logSystemAction(`Bulk ${action}d ${successfulCount} user(s).`, 'info');
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err) {
      alert('Failed to complete bulk updates.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete the ${selectedUserIds.length} selected user account(s)?`)) return;
    setLoading(true);
    try {
      let successfulCount = 0;
      for (const userId of selectedUserIds) {
        const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, { credentials: 'include', 
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${userSession.accessToken}` }
        });
        if (response.ok) {
          successfulCount++;
        }
      }
      logSystemAction(`Bulk deleted ${successfulCount} user(s).`, 'warn');
      setSelectedUserIds([]);
      fetchUsers();
    } catch (err) {
      alert('Failed to complete bulk delete.');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'students' | 'users' | 'results') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'students') setStudentFile(file);
    else if (type === 'users') setStaffFile(file);
    else setResultsFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows: any[] = utils.sheet_to_json(ws);
        
        let headers: string[] = [];
        if (rawRows.length > 0) {
          headers = Object.keys(rawRows[0]).filter(k => !k.startsWith('_'));
        }

        let errorsCount = 0;
        const processedRows = rawRows.map((row, idx) => {
          const errors: Record<string, string> = {};
          
          if (type === 'students') {
            if (!row.email) { errors.email = 'Required'; errorsCount++; }
            else if (!row.email.includes('@')) { errors.email = 'Must be email'; errorsCount++; }
            if (!row.fullName) { errors.fullName = 'Required'; errorsCount++; }
            if (!row.rollNo) { errors.rollNo = 'Required'; errorsCount++; }
          } else if (type === 'users') {
            if (!row.email) { errors.email = 'Required'; errorsCount++; }
            if (!row.role) { errors.role = 'Required'; errorsCount++; }
          } else {
            if (!row.rollNo) { errors.rollNo = 'Required'; errorsCount++; }
            if (!row.subjectCode) { errors.subjectCode = 'Required'; errorsCount++; }
            if (row.score === undefined) { errors.score = 'Required'; errorsCount++; }
          }

          return {
            ...row,
            _rowNum: idx + 2,
            _errors: errors
          };
        });

        setStagedData({
          type,
          headers,
          rows: processedRows,
          errorsCount
        });
      } catch (err) {
        alert('Failed to parse Excel file format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitStaged = async () => {
    if (!stagedData) return;
    setLoading(true);
    setErrorMsg('');
    setUploadErrors([]);
    try {
      const endpoint = stagedData.type === 'students' ? 'students' : stagedData.type === 'users' ? 'users' : 'results';
      const cleanRows = stagedData.rows.map(r => {
        const { _rowNum, _errors, ...rest } = r;
        return rest;
      });

      const response = await fetch(`${API_BASE_URL}/api/v1/admin/ingest/${endpoint}`, { credentials: 'include', 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userSession.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanRows)
      });

      const resJson = await response.json();
      if (response.ok) {
        setUploadStatus(`Ingestion success: ${resJson.processed || cleanRows.length} records processed!`);
        logSystemAction(`Ingested ${cleanRows.length} ${stagedData.type} from staging.`, 'info');
        setStagedData(null);
        setStudentFile(null);
        setStaffFile(null);
        setResultsFile(null);
        fetchUsers();
        fetchResults();
      } else {
        const errorList: string[] = resJson.errors || [resJson.error || 'Ingestion failed.'];
        setUploadErrors(errorList);
      }
    } catch (err) {
      setErrorMsg('Ingestion failed to link with Spring Boot.');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcelTemplate = (type: 'students' | 'users' | 'results') => {
    let headers: string[] = [];
    let sampleData: any[] = [];
    let filename = '';

    if (type === 'students') {
      headers = ['email', 'fullName', 'phone', 'rollNo', 'batch', 'department', 'cgpa', 'sectionId'];
      sampleData = [{
        email: 'student.cse@ciet.edu.in',
        fullName: 'Aditya Vardhan',
        phone: '9876543210',
        rollNo: '22B01A0501',
        batch: '2022-2026',
        department: 'CSE',
        cgpa: 9.25,
        sectionId: 'CSE-A'
      }];
      filename = 'students_template.xlsx';
    } else if (type === 'users') {
      headers = ['email', 'fullName', 'phone', 'role', 'department', 'password'];
      sampleData = [{
        email: 'faculty.ece@ciet.edu.in',
        fullName: 'Dr. Suresh Kumar',
        phone: '9988776655',
        role: 'Faculty',
        department: 'ECE',
        password: 'password123'
      }];
      filename = 'users_template.xlsx';
    } else {
      headers = ['rollNo', 'semester', 'examName', 'subjectCode', 'subjectName', 'score', 'maxScore', 'grade'];
      sampleData = [{
        rollNo: '22B01A0501',
        semester: '3',
        examName: 'Semester End Examinations',
        subjectCode: 'R22-CSE301',
        subjectName: 'Data Structures & Algorithms',
        score: 85.0,
        maxScore: 100.0,
        grade: 'A+'
      }];
      filename = 'results_template.xlsx';
    }

    const ws = utils.json_to_sheet(sampleData, { header: headers });
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Template');
    const wopts: any = { bookType: 'xlsx', bookSST: false, type: 'binary' };
    const wbout = write(wb, wopts);

    const s2ab = (s: string) => {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    };

    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleToggleUser = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/toggle-active`, { credentials: 'include', 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userSession.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok) {
        logSystemAction(`Toggled lock status for user ID: ${userId}`, 'info');
        fetchUsers();
      } else {
        alert(data.error || 'Failed to toggle account lock');
      }
    } catch (err) {
      alert('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersList.filter(u => {
    const matchesQuery = !userSearch || 
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.role && u.role.toLowerCase().includes(userSearch.toLowerCase()));
      
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && u.isActive) || 
      (statusFilter === 'LOCKED' && !u.isActive);
      
    const matchesDept = deptFilter === 'ALL' || 
      (u.departmentIds && u.departmentIds.includes(deptFilter));
      
    return matchesQuery && matchesRole && matchesStatus && matchesDept;
  });

  const initials = (userSession.fullName || userSession.email || 'A').substring(0,2).toUpperCase();

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh' }} className="admin-root">
      {/* Vercel Diagnostics Slide-out Drawer */}
      {diagnosticsDrawerOpen && (
        <div className="diag-drawer">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--surface-border)' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Developer Diagnostics</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Live system health payload</div>
            </div>
            <button onClick={() => setDiagnosticsDrawerOpen(false)} className="modal-close">✕</button>
          </div>
          {diagnostics ? (
            <div>
              <div className="diag-section-title">Server Status</div>
              <div className="diag-metric">
                <div className="diag-metric-label">STATUS</div>
                <div className="diag-metric-value" style={{ color: diagnostics.dbConnected ? 'var(--success)' : 'var(--danger)' }}>● {diagnostics.status}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '0 0 6px' }}>
                <div className="diag-metric">
                  <div className="diag-metric-label">DB LATENCY</div>
                  <div className="diag-metric-value">{diagnostics.dbLatencyMs} ms</div>
                </div>
                <div className="diag-metric">
                  <div className="diag-metric-label">DB STATE</div>
                  <div className="diag-metric-value" style={{ color: diagnostics.dbConnected ? 'var(--success)' : 'var(--danger)' }}>{diagnostics.dbConnected ? 'CONNECTED' : 'DISCONNECTED'}</div>
                </div>
              </div>
              <div className="diag-metric">
                <div className="diag-metric-label">SMTP</div>
                <div className="diag-metric-value" style={{ color: diagnostics.smtpOk ? 'var(--success)' : 'var(--warning)' }}>{diagnostics.smtpOk ? 'READY' : 'FAIL'}</div>
              </div>
              <div className="diag-metric">
                <div className="diag-metric-label">TOTAL USERS</div>
                <div className="diag-metric-value">{diagnostics.totalUsers}</div>
              </div>
              <div className="diag-metric">
                <div className="diag-metric-label">SESSIONS</div>
                <div className="diag-metric-value">{diagnostics.activeSessions}</div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fetching diagnostics payload...</p>
          )}
        </div>
      )}

      {stagedData && (
        <div className="staging-overlay">
          <div className="staging-box">
            <div className="staging-header">
              <div>
                <h2>Pre-Flight Ingestion Staging Grid</h2>
                <p>Reviewing parsed rows before database write. Errors will block commit.</p>
              </div>
              <button onClick={() => { setStagedData(null); setStudentFile(null); setStaffFile(null); setResultsFile(null); }} className="btn-action secondary">Cancel Upload</button>
            </div>
            <div className="staging-body">
              {stagedData.errorsCount > 0 ? (
                <div className="status-msg error">Ingestion blocked: {stagedData.errorsCount} validation error(s) flagged in red. Please correct and re-upload.</div>
              ) : (
                <div className="status-msg success">Pre-flight passed. 0 errors. Ready to commit to MongoDB.</div>
              )}
              <div className="data-table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th style={{ width: '50px' }}>#</th>
                    {stagedData.headers.map(h => <th key={h}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {stagedData.rows.map((row) => (
                      <tr key={row._rowNum}>
                        <td style={{ fontWeight: 700, textAlign: 'center' }}>{row._rowNum}</td>
                        {stagedData.headers.map(col => {
                          const err = row._errors[col];
                          return (
                            <td key={col} className={err ? 'cell-error' : ''}>
                              {row[col]}
                              {err && <small>({err})</small>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="staging-footer">
              <button onClick={() => { setStagedData(null); setStudentFile(null); setStaffFile(null); setResultsFile(null); }} className="btn-action secondary">Cancel</button>
              <button onClick={handleCommitStaged} className="btn-action primary" disabled={stagedData.errorsCount > 0 || loading}>
                {loading ? 'Writing to MongoDB...' : 'Commit to Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="topbar-logo">
            <LogoHeader imageStyle={{ height: '36px' }} />
          </div>
          <div className="topbar-divider" />
          <span className="topbar-breadcrumb">Administrator Console</span>
        </div>
        <div className="admin-topbar-right">
          <div className="status-chip"><span className="led green" /> API: Active</div>
          <div className="status-chip">
            <span className={`led ${diagnostics?.dbConnected ? 'green' : 'red'}`} />
            DB: {diagnostics ? `${diagnostics.dbLatencyMs}ms` : '…'}
          </div>
          <div className="status-chip">
            <span className={`led ${diagnostics?.smtpOk ? 'green' : 'yellow'}`} />
            SMTP: {diagnostics?.smtpOk ? 'Ready' : 'Offline'}
          </div>
          <button onClick={() => { fetchDiagnostics(); setDiagnosticsDrawerOpen(true); }} className="btn-topbar">Diagnostics</button>
          <div className="user-avatar-chip">
            <div className="user-avatar">{initials}</div>
            <div className="user-avatar-info">
              <div className="user-avatar-name">{userSession.fullName || 'Admin'}</div>
              <div className="user-avatar-role">{userSession.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-topbar danger">Sign Out</button>
        </div>
      </div>

      {/* BODY */}
      <div className="admin-body">
        <div className="admin-sidebar">
          <div className="sidebar-section-label">Command Center</div>
          <button className={`sidebar-item ${adminTab === 'directory' ? 'active' : ''}`} onClick={() => { setAdminTab('directory'); setErrorMsg(''); setUploadStatus(''); }}>
            User Accounts CRUD
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Management</div>
          <button className={`sidebar-item ${adminTab === 'departments' ? 'active' : ''}`} onClick={() => { setAdminTab('departments'); setErrorMsg(''); setUploadStatus(''); }}>
            Departments &amp; Sections
          </button>
          <button className={`sidebar-item ${adminTab === 'certifications' ? 'active' : ''}`} onClick={() => { setAdminTab('certifications'); setErrorMsg(''); setUploadStatus(''); }}>
            Student Certifications
          </button>
          <button className={`sidebar-item ${adminTab === 'notifications' ? 'active' : ''}`} onClick={() => { setAdminTab('notifications'); setErrorMsg(''); setUploadStatus(''); }}>
            Broadcast Alerts
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '8px' }}>Audit &amp; Import</div>
          {userSession.role === 'Director' && (
            <button className={`sidebar-item ${adminTab === 'otp' ? 'active' : ''}`} onClick={() => { setAdminTab('otp'); setErrorMsg(''); setUploadStatus(''); }}>
              OTP Audit Logs
            </button>
          )}
          <button className={`sidebar-item ${adminTab === 'uploads' ? 'active' : ''}`} onClick={() => { setAdminTab('uploads'); setErrorMsg(''); setUploadStatus(''); }}>
            Bulk Data Import
          </button>
        </div>

        <div className="admin-main" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{ padding: '32px 36px 0 36px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {errorMsg && <div className="status-msg error" style={{ marginBottom: '20px' }}>{errorMsg}</div>}
            {uploadStatus && <div className="status-msg success" style={{ marginBottom: '20px' }}>{uploadStatus}</div>}

            {adminTab === 'directory' ? (
            <div>
              <div className="page-header">
                <div className="page-header-left">
                  <h2>User Directory</h2>
                  <p>Manage all registered portal accounts</p>
                </div>
                <button onClick={openCreateModal} className="btn-action primary">Add User</button>
              </div>

              {/* Stat cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total Users</div>
                  <div className="stat-value">{usersList.length}</div>
                  <div className="stat-sub">All portal accounts</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active Sessions</div>
                  <div className="stat-value">{diagnostics ? diagnostics.activeSessions : 1}</div>
                  <div className="stat-sub">Live right now</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">OTP Backlog</div>
                  <div className="stat-value">{otpRecords.filter(r => !r.isUsed).length}</div>
                  <div className="stat-sub">Pending verification</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">DB Latency</div>
                  <div className="stat-value" style={{ color: diagnostics && diagnostics.dbLatencyMs < 100 ? 'var(--success)' : 'var(--warning)' }}>
                    {diagnostics ? `${diagnostics.dbLatencyMs}ms` : '—'}
                  </div>
                  <div className="stat-sub">Round-trip time</div>
                </div>
              </div>

              {/* Analytics charts */}
              <div className="charts-grid">
                <div className="chart-card">
                  <div className="chart-title">Department Enrollment</div>
                  {departments.map((d) => {
                    const count = usersList.filter(u => u.departmentIds?.includes(d.code)).length;
                    const pct = Math.round((count / Math.max(1, usersList.length)) * 100) || 0;
                    return (
                      <div className="bar-row" key={d.code}>
                        <div className="bar-label">{d.code}</div>
                        <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
                        <div className="bar-count">{count}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-card">
                  <div className="chart-title">CGPA Score Tiers</div>
                  {[
                    { label: '9–10', pct: 35, cls: 'tier-a' },
                    { label: '8–9',  pct: 45, cls: 'tier-b' },
                    { label: '7–8',  pct: 15, cls: 'tier-c' },
                    { label: '<7',   pct: 5,  cls: 'tier-d' },
                  ].map(t => (
                    <div className="bar-row" key={t.label}>
                      <div className="bar-label">{t.label}</div>
                      <div className="bar-track"><div className={`bar-fill ${t.cls}`} style={{ width: `${t.pct}%` }} /></div>
                      <div className="bar-count">{t.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedUserIds.length > 0 && (
                <div className="bulk-action-bar">
                  <span>{selectedUserIds.length} user(s) selected</span>
                  <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                    <button onClick={() => handleBulkToggle('activate')} className="btn-action success" disabled={loading}>Bulk Reactivate</button>
                    <button onClick={() => handleBulkToggle('deactivate')} className="btn-action warning" disabled={loading}>Bulk Deactivate</button>
                    <button onClick={handleBulkDelete} className="btn-action danger" disabled={loading}>Bulk Delete</button>
                    <button onClick={() => setSelectedUserIds([])} className="btn-action secondary">Clear</button>
                  </div>
                </div>
              )}

              <div className="toolbar-row">
                <div className="search-input-wrapper" style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="search-input" 
                    style={{ paddingLeft: '14px', paddingRight: '36px' }} 
                    placeholder="Search users by name, email, or role..." 
                    value={userSearch} 
                    onChange={(e) => setUserSearch(e.target.value)} 
                  />
                  {userSearch && (
                    <button 
                      type="button" 
                      onClick={() => setUserSearch('')} 
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--text-muted)', 
                        cursor: 'pointer', 
                        fontSize: '14px', 
                        fontWeight: 'bold',
                        padding: '4px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="ALL">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Mentor">Mentor</option>
                  <option value="HOD">HOD</option>
                  <option value="Director">Director</option>
                </select>
                <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="LOCKED">Locked</option>
                </select>
                <select className="filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                  <option value="ALL">All Depts</option>
                  {departments.map(d => (
                    <option key={d.code} value={d.code}>{d.code}</option>
                  ))}
                </select>
              </div>

              {/* Role splits as tabs at the top of the table data */}
              {(() => {
                const totalStudents = usersList.filter((u: any) => u.role === 'Student').length;
                const totalFaculty = usersList.filter((u: any) => u.role === 'Faculty').length;
                const totalMentors = usersList.filter((u: any) => u.role === 'Mentor').length;
                const totalHods = usersList.filter((u: any) => u.role === 'HOD').length;
                const totalDirectors = usersList.filter((u: any) => u.role === 'Director').length;
                const totalAll = usersList.length;

                return (
                  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '12px', marginBottom: '16px', overflowX: 'auto' }}>
                    {[
                      { label: 'All Users', value: 'ALL', count: totalAll },
                      { label: 'Directors', value: 'Director', count: totalDirectors },
                      { label: 'HODs', value: 'HOD', count: totalHods },
                      { label: 'Faculty', value: 'Faculty', count: totalFaculty },
                      { label: 'Mentors', value: 'Mentor', count: totalMentors },
                      { label: 'Students', value: 'Student', count: totalStudents }
                    ].map(tab => {
                      const isActive = roleFilter === tab.value;
                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => setRoleFilter(tab.value)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--accent)' : 'var(--surface-border)',
                            background: isActive ? 'var(--accent)' : 'var(--surface-raised)',
                            color: isActive ? '#FFF' : 'var(--text-secondary)',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span>{tab.label}</span>
                          <span style={{
                            background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--surface-hover)',
                            color: isActive ? '#FFF' : 'var(--text-muted)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '700'
                          }}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={(e) => setSelectedUserIds(e.target.checked ? filteredUsers.map(u => u.id) : [])}
                        />
                      </th>
                      <th>Full Name</th>
                      <th>Email Address & Audit Trail</th>
                      <th>User Portal Role</th>
                      <th>Login Status</th>
                      <th>Departments</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => setSelectedUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                          />
                        </td>
                        <td style={{ fontWeight: '600' }}>{u.fullName || 'N/A'}</td>
                        <td>
                          <div style={{ fontWeight: '600' }}>{u.email}</div>
                          {u.rollNo && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Roll No: {u.rollNo}</div>}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>IP Address: {u.lastLoginIp || 'None'}</span>
                            <span>Last Login: {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</span>
                            <span>Enrolled: {new Date(u.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge ${u.role}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${u.isActive ? 'active' : 'inactive'}`}>
                            <span className="status-dot" />
                            {u.isActive ? 'Active' : 'Locked'}
                          </span>
                        </td>
                        <td>{u.departmentIds?.join(', ') || 'General / None'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                            <button className="btn-row-action" onClick={() => openViewModal(u)}>View</button>
                            <button className="btn-row-action" onClick={() => openEditModal(u)}>Edit</button>
                            <button className="btn-row-action" onClick={() => handleToggleUser(u.id)}>{u.isActive ? 'Lock' : 'Unlock'}</button>
                            <button className="btn-row-action" onClick={() => handleDeleteUser(u.id)} style={{ color: 'var(--danger)' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center" style={{ padding: '25px', color: 'gray' }}>
                          No users match filters or search queries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* AWS Security System Logs Console */}
              <div style={{ marginTop: '40px' }}>
                <div className="admin-view-header" style={{ marginBottom: '15px' }}>
                  <h2>Security Audit Logs (Live Console)</h2>
                </div>
                <div style={{
                  background: '#0F0E0C',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '15px 20px',
                  borderRadius: '8px',
                  height: '180px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  color: '#a3a3a3',
                  marginBottom: '50px'
                }}>
                  {systemLogs.map((log, idx) => (
                    <div key={idx} style={{ marginBottom: '5px', display: 'flex', gap: '15px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>[{log.time}]</span>
                      <span style={{ 
                        color: log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#eab308' : '#22c55e'
                      }}>[{log.type.toUpperCase()}]</span>
                      <span style={{ color: log.type === 'error' ? '#fca5a5' : '#fff' }}>{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : adminTab === 'otp' ? (
            <div style={{marginBottom: '50px'}}>
              <div className="admin-view-header">
                <h2>OTP Record Audit Panel</h2>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Verification Code</th>
                      <th>Target User Email</th>
                      <th>Generation Purpose</th>
                      <th>Expired Date / Time</th>
                      <th>Attempt Count</th>
                      <th>State Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otpRecords.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--accent)', fontSize: '15px' }}>
                          {r.otpCode}
                        </td>
                        <td style={{ fontWeight: '500' }}>{r.targetEmail}</td>
                        <td style={{ textTransform: 'capitalize' }}>{r.purpose}</td>
                        <td style={{ fontSize: '13px' }}>
                          {new Date(r.expiresAt).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.attemptCount}</td>
                        <td>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: '600',
                            background: r.isUsed ? 'rgba(107, 114, 128, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                            color: r.isUsed ? '#4b5563' : '#166534'
                          }}>
                            {r.isUsed ? 'Consumed' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {otpRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center" style={{ padding: '25px', color: 'gray' }}>
                          No OTP codes generated recently.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : adminTab === 'departments' ? (
            <div style={{marginBottom: '50px'}}>
              <div className="page-header">
                <div className="page-header-left">
                  <h2>Departments &amp; Sections</h2>
                  <p>Manage college departments and their corresponding academic sections</p>
                </div>
                <button onClick={openCreateDeptModal} className="btn-action primary">Add Department</button>
              </div>

              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Department Code</th>
                      <th>Department Name</th>
                      <th>Academic Sections</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((d) => (
                      <tr key={d.code}>
                        <td style={{ fontWeight: '700', color: 'var(--accent)' }}>{d.code}</td>
                        <td style={{ fontWeight: '600' }}>{d.name}</td>
                        <td>
                          {d.sections && d.sections.length > 0 ? (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {d.sections.map(sec => (
                                <span key={sec} style={{
                                  padding: '3px 8px',
                                  background: 'var(--surface-overlay)',
                                  border: '1px solid var(--surface-border)',
                                  borderRadius: '4px',
                                  fontSize: '11.5px',
                                  fontWeight: '600'
                                }}>
                                  {sec}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No sections defined</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-row-action" onClick={() => openEditDeptModal(d)}>
                              Edit
                            </button>
                            <button className="btn-row-action" onClick={() => handleDeleteDept(d.code)} style={{ color: 'var(--danger)' }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : adminTab === 'certifications' ? (
            <div style={{ marginBottom: '50px' }}>
              <div className="page-header">
                <div className="page-header-left">
                  <h2>Student Certifications Portal</h2>
                  <p>View, verify, and filter professional certificates uploaded by students</p>
                </div>
                <button onClick={fetchAllStudentCertifications} className="btn-action secondary" disabled={loadingCerts}>
                  {loadingCerts ? 'Refreshing...' : 'Refresh List'}
                </button>
              </div>

              {/* Filters Panel */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px', background: 'var(--surface-overlay)', padding: '16px', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                <div className="stat-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Search Certificates</label>
                  <input
                    type="text"
                    className="ds-input"
                    placeholder="Search title, roll number, student name..."
                    value={certSearchQuery}
                    onChange={(e) => setCertSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                  />
                </div>

                <div className="stat-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none', marginTop: '10px', marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filter by Domain (Branch)</label>
                  <select
                    className="ds-input"
                    value={certDomainFilter}
                    onChange={(e) => setCertDomainFilter(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                  >
                    <option value="ALL">All Domains / Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="AIML">AIML</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>

                <div className="stat-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none', marginTop: '10px', marginBottom: '10px'  }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filter by Type</label>
                  <select
                    className="ds-input"
                    value={certTypeFilterTab}
                    onChange={(e) => setCertTypeFilterTab(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                  >
                    <option value="ALL">All Types</option>
                    <option value="Technical">Technical</option>
                    <option value="Soft Skills">Soft Skills</option>
                    <option value="Workshop / Seminar">Workshop / Seminar</option>
                    <option value="Award / Achievement">Award / Achievement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="stat-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Verification Status</label>
                  <select
                    className="ds-input"
                    value={certStatusFilter}
                    onChange={(e) => setCertStatusFilter(e.target.value)}
                    style={{ width: '100%', padding: '10px', fontSize: '13px' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Verification</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Domain</th>
                      <th>Certification Info</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Uploaded On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = allStudentCertifications.filter(c => {
                        // Search filter
                        if (certSearchQuery.trim()) {
                          const query = certSearchQuery.toLowerCase();
                          const titleMatch = c.title && c.title.toLowerCase().includes(query);
                          const issuerMatch = c.issuer && c.issuer.toLowerCase().includes(query);
                          const nameMatch = c.studentName && c.studentName.toLowerCase().includes(query);
                          const rollMatch = c.rollNo && c.rollNo.toLowerCase().includes(query);
                          if (!titleMatch && !issuerMatch && !nameMatch && !rollMatch) return false;
                        }

                        // Domain (Branch) filter
                        if (certDomainFilter !== 'ALL') {
                          if ((c.studentDepartment || '').toUpperCase() !== certDomainFilter) return false;
                        }

                        // Cert type filter
                        if (certTypeFilterTab !== 'ALL') {
                          if ((c.certType || 'Other').toLowerCase() !== certTypeFilterTab.toLowerCase()) return false;
                        }

                        // Verification status filter
                        if (certStatusFilter !== 'ALL') {
                          if (certStatusFilter === 'VERIFIED' && !c.isVerified) return false;
                          if (certStatusFilter === 'REJECTED' && (!c.rejectionReason || c.isVerified)) return false;
                          if (certStatusFilter === 'PENDING' && (c.isVerified || c.rejectionReason)) return false;
                        }

                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="text-center" style={{ padding: '25px', color: 'var(--text-muted)', fontStyle: 'italic'}}>
                              {loadingCerts ? 'Loading certifications...' : 'No student certifications match the filter criteria.'}
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span
                                onClick={() => {
                                  // Open user's profile fully
                                  const mockUser = {
                                    id: c.userId || '',
                                    rollNo: c.rollNo,
                                    fullName: c.studentName,
                                    role: 'Student',
                                    departmentIds: [c.studentDepartment]
                                  };
                                  const foundUser = usersList.find(u => u.rollNo?.toLowerCase() === c.rollNo?.toLowerCase());
                                  if (foundUser) {
                                    openViewModal(foundUser);
                                  } else {
                                    openViewModal(mockUser);
                                  }
                                }}
                                style={{ fontWeight: '700', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                              >
                                {c.studentName}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.rollNo}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge-dept" style={{ fontWeight: '700', padding: '3px 8px', background: 'rgba(56, 214, 130, 0.1)', color: '#38d682', borderRadius: '4px', fontSize: '11px' }}>
                              {c.studentDepartment || 'GEN'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600' }}>{c.title}</span>
                              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{c.issuer} · Issued: {c.issuedDate}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '100px', background: 'rgba(229, 57, 53, 0.14)', color: '#e53935', border: '1px solid rgba(229, 57, 53, 0.28)' }}>
                              {c.certType || 'Other'}
                            </span>
                          </td>
                          <td>
                            {c.isVerified ? (
                              <span className="status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>✓ Verified</span>
                            ) : c.rejectionReason ? (
                              <span className="status-badge locked" title={c.rejectionReason} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>✗ Rejected</span>
                            ) : (
                              <span className="status-badge pending" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>⏳ Pending</span>
                            )}
                          </td>
                          <td style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {c.certUrl && (
                                <a href={c.certUrl} target="_blank" rel="noopener noreferrer" className="btn-row-action" style={{ textDecoration: 'none', color: 'var(--accent)' }}>
                                  View ↗
                                </a>
                              )}
                              {!c.isVerified && (
                                <button className="btn-row-action" onClick={() => handleVerifyCert(c.id)} style={{ color: '#10b981' }}>
                                  Verify
                                </button>
                              )}
                              {!c.rejectionReason && (
                                <button className="btn-row-action" onClick={() => handleRejectCert(c.id)} style={{ color: '#ef4444' }}>
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : adminTab === 'notifications' ? (
            <div style={{ marginBottom: '50px' }}>
              <div className="page-header">
                <div className="page-header-left">
                  <h2>Manual Broadcast Alerts Center</h2>
                  <p>Send high-priority manual notifications to all students or specific scholars</p>
                </div>
              </div>

              <div style={{ background: 'var(--surface-overlay)', border: '1px solid var(--surface-border)', borderRadius: '8px', padding: '24px', maxWidth: '640px' }}>
                <form onSubmit={handleSendAdminNotification} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target Audience</label>
                    <select className="ds-input" value={notifTarget === 'ALL' ? 'ALL' : 'SPECIFIC'} onChange={e => setNotifTarget(e.target.value === 'ALL' ? 'ALL' : '')} style={{ padding: '10px', fontSize: '13px' }}>
                      <option value="ALL">Broadcast to All Students</option>
                      <option value="SPECIFIC">Target Specific Roll Number</option>
                    </select>
                  </div>

                  {notifTarget !== 'ALL' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Student Roll Number</label>
                      <input 
                        type="text" 
                        className="ds-input" 
                        placeholder="Enter Student Roll Number (e.g. Y23CSM051)" 
                        value={notifTarget} 
                        onChange={e => setNotifTarget(e.target.value)} 
                        style={{ padding: '10px', fontSize: '13px' }}
                        required
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alert Type</label>
                    <select className="ds-input" value={notifType} onChange={e => setNotifType(e.target.value)} style={{ padding: '10px', fontSize: '13px' }}>
                      <option value="SYSTEM">System Announcement</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="PLACEMENT">Placement Training</option>
                      <option value="VERIFICATION">Verification Pending</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alert Title</label>
                    <input 
                      type="text" 
                      className="ds-input" 
                      placeholder="Enter notification title..." 
                      value={notifTitle} 
                      onChange={e => setNotifTitle(e.target.value)} 
                      style={{ padding: '10px', fontSize: '13px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Alert Message Body</label>
                    <textarea 
                      className="ds-input" 
                      rows={4} 
                      placeholder="Enter the detailed notification message..." 
                      value={notifMessage} 
                      onChange={e => setNotifMessage(e.target.value)} 
                      style={{ padding: '10px', fontSize: '13px', resize: 'vertical' }}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-action primary" style={{ marginTop: '10px' }} disabled={sendingNotif}>
                    {sendingNotif ? 'Broadcasting...' : 'Broadcast Notification Now'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div>
              <div className="admin-view-header">
                <h2>Bulk Excel Ingestion Portal (.xlsx)</h2>
              </div>

              <div className="upload-grid">
                <div className="upload-card">
                  <h3>Import Student Accounts</h3>
                  <p>Upload a spreadsheet (.xlsx) containing student accounts.</p>
                  <label className="file-drop-zone" style={{ display: 'block' }}>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={(e) => handleExcelFileChange(e, 'students')}
                      key={studentFile ? 'hasFile' : 'empty'}
                    />
                    {studentFile ? `Selected: ${studentFile.name}` : "Click to select Excel file"}
                  </label>
                </div>

                <div className="upload-card">
                  <h3>Import Staff / Authority Accounts</h3>
                  <p>Upload a spreadsheet (.xlsx) containing staff members.</p>
                  <label className="file-drop-zone" style={{ display: 'block' }}>
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={(e) => handleExcelFileChange(e, 'users')}
                      key={staffFile ? 'hasFile' : 'empty'}
                    />
                    {staffFile ? `Selected: ${staffFile.name}` : "Click to select Excel file"}
                  </label>
                </div>

              </div>

              <div className="admin-view-header" style={{ marginTop: '40px' }}>
                <h2>Download Excel Formatting Templates</h2>
              </div>

              <div className="template-row">
                <p>Student Ingestion Spreadsheet Template (students_template.xlsx)</p>
                <button className="btn-row-action" onClick={() => downloadExcelTemplate('students')}>Download Excel</button>
              </div>

              <div className="template-row">
                <p>Staff Ingestion Spreadsheet Template (users_template.xlsx)</p>
                <button className="btn-row-action" onClick={() => downloadExcelTemplate('users')}>Download Excel</button>
              </div>

              {uploadErrors.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>Upload warnings and errors:</h4>
                  <ul style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', padding: '15px 25px', borderRadius: '8px', color: '#fca5a5', fontSize: '13px' }}>
                    {uploadErrors.map((err, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          </div>

          {/* CIET Footer */}
          <footer className="admin-footer" style={{
            marginTop: 'auto',
            padding: '40px 36px 36px',
            background: 'var(--surface-overlay)',
            borderTop: '1px solid var(--surface-border)',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
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
                  <LogoHeader imageStyle={{ height: '38px', background: '#fff', borderRadius: '4px', padding: '2px' }} />
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>CHALAPATHI INSTITUTE</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>OF ENGINEERING & TECHNOLOGY (AUTONOMOUS)</p>
                  </div>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      <span>0863 - 2524112 / 113</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      <a href="mailto:principal@chalapathiengg.ac.in" style={{ color: 'inherit', textDecoration: 'none' }}>principal@chalapathiengg.ac.in</a>
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
              <a href="http://chalapathiengg.ac.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 600 }}>Official Portal →</a>
            </div>
          </footer>
        </div>
      </div>

      {/* CRUD Modal Overlays */}
      {activeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'var(--surface-overlay)',
            color: 'var(--text-primary)',
            padding: '30px',
            borderRadius: '16px',
            width: '500px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {activeModal === 'create' && 'Create User Profile'}
                {activeModal === 'edit' && 'Edit User Details'}
                {activeModal === 'view' && 'User Profile Details'}
              </h2>
              <button 
                type="button"
                onClick={() => { setActiveModal(null); setErrorMsg(''); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            {activeModal === 'view' && selectedUserForModal && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(229, 57, 53, 0.08)', padding: '15px', borderRadius: '10px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e53935', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                    {(selectedUserForModal.fullName || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedUserForModal.fullName || 'N/A'}</h3>
                    <span className={`role-badge ${selectedUserForModal.role}`}>
                      {selectedUserForModal.role}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', marginTop: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Email Address</span>
                    <span style={{ fontWeight: '500' }}>{selectedUserForModal.email}</span>
                  </div>
                  {selectedUserForModal.rollNo && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Register Number</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent)', fontFamily: 'monospace', letterSpacing: '1px' }}>{selectedUserForModal.rollNo}</span>
                    </div>
                  )}
                  {selectedUserForModal.batch && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Academic Batch</span>
                      <span style={{ fontWeight: '500' }}>{selectedUserForModal.batch}</span>
                    </div>
                  )}
                  {selectedUserForModal.cgpa !== undefined && selectedUserForModal.cgpa > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>CGPA</span>
                      <span style={{ fontWeight: '700', color: selectedUserForModal.cgpa >= 8 ? '#16a34a' : selectedUserForModal.cgpa >= 6 ? '#d97706' : '#dc2626' }}>
                        {selectedUserForModal.cgpa.toFixed(2)} / 10.00
                      </span>
                    </div>
                  )}
                  {selectedUserForModal.sectionId && (
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Section</span>
                      <span style={{ fontWeight: '500' }}>{selectedUserForModal.sectionId}</span>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Phone Number</span>
                    <span style={{ fontWeight: '500' }}>{selectedUserForModal.phone || 'Not Registered'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Departments</span>
                    <span style={{ fontWeight: '500' }}>{selectedUserForModal.departmentIds?.join(', ') || 'General / None'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Portal Access</span>
                    <span style={{ fontWeight: '700', color: selectedUserForModal.isActive ? '#16a34a' : '#dc2626' }}>
                      {selectedUserForModal.isActive ? 'Granted / Active' : 'Revoked / Locked'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Date Enrolled</span>
                    <span style={{ fontWeight: '500' }}>{new Date(selectedUserForModal.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Last IP Address</span>
                    <span style={{ fontWeight: '500', fontFamily: 'monospace' }}>{selectedUserForModal.lastLoginIp || 'None'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Last Login Time</span>
                    <span style={{ fontWeight: '500' }}>
                      {selectedUserForModal.lastLogin ? new Date(selectedUserForModal.lastLogin).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>



                {/* ── CERTIFICATIONS ── */}
                {selectedUserForModal.role === 'Student' && (
                  <div style={{ marginTop: '15px', borderTop: '1px solid var(--surface-raised)', paddingTop: '15px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certifications</h4>
                    {studentDataLoading ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading student data...</p>
                    ) : studentDashboardData?.certifications?.length > 0 ? (() => {
                      const allTypes = ['All', ...Array.from(new Set(studentDashboardData.certifications.map((c: any) => c.certType || 'Other'))) as string[]];
                      const filtered = certTypeFilter === 'All' ? studentDashboardData.certifications : studentDashboardData.certifications.filter((c: any) => (c.certType || 'Other') === certTypeFilter);
                      return (
                        <div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {allTypes.map((t: string) => (
                              <button key={t} onClick={() => setCertTypeFilter(t)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '100px', border: '1px solid var(--surface-border)', background: certTypeFilter === t ? 'var(--accent)' : 'var(--surface-raised)', color: certTypeFilter === t ? '#fff' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>{t}</button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filtered.map((cert: any, idx: number) => (
                              <div key={idx} style={{ padding: '12px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--surface-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{cert.title}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{cert.issuer} · {cert.issuedDate}</div>
                                    {cert.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{cert.description}</div>}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                    {cert.certType && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', background: 'rgba(229, 57, 53, 0.14)', color: '#e53935', border: '1px solid rgba(229, 57, 53, 0.28)' }}>{cert.certType}</span>}
                                    {cert.certUrl && <a href={cert.certUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>View ↗</a>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })() : (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>{studentDashboardData ? 'No certifications added.' : 'No data available.'}</p>
                    )}
                  </div>
                )}

                {/* ── FULL PORTFOLIO SECTIONS ── */}
                {selectedUserForModal.role === 'Student' && studentDashboardData && (() => {
                  const sections = [
                    { label: 'Projects', icon: '💻', items: studentDashboardData.projects, render: (p: any) => `${p.title} — ${p.techStack || ''}` },
                    { label: 'Internships', icon: '🏢', items: studentDashboardData.internships, render: (i: any) => `${i.role} at ${i.organization || i.companyName}` },
                    { label: 'Courses', icon: '📚', items: studentDashboardData.courses, render: (c: any) => `${c.title || c.courseName} (${c.platform})` },
                    { label: 'Research', icon: '🔬', items: studentDashboardData.research, render: (r: any) => `${r.title} — ${r.publisher || ''}` },
                    { label: 'Events', icon: '🎯', items: studentDashboardData.events, render: (e: any) => `${e.eventName || e.title} · ${e.role}` },
                  ];
                  return sections.map(sec => sec.items?.length > 0 ? (
                    <div key={sec.label} style={{ marginTop: '15px', borderTop: '1px solid var(--surface-raised)', paddingTop: '15px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sec.icon} {sec.label}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sec.items.map((item: any, idx: number) => (
                          <div key={idx} style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--surface-raised)', border: '1px solid var(--surface-border)', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                            {sec.render(item)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null);
                })()}

                <button 
                  type="button"
                  onClick={() => { setActiveModal(null); setStudentDashboardData(null); }}
                  className="btn-primary"
                  style={{ marginTop: '20px', width: '100%', background: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  Close Profile View
                </button>
              </div>
            )}

            {(activeModal === 'create' || activeModal === 'edit') && (
              <form onSubmit={activeModal === 'create' ? handleCreateUser : handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Full Name</label>
                    <input 
                      type="text" 
                      required
                      className="form-input" 
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                      placeholder="e.g. Dr. Ramesh Kumar"
                    />
                </div>

                {activeModal === 'create' && formRole === 'Student' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)' }}>Register Number (Roll No.) *</label>
                    <input 
                      type="text" 
                      required
                      className="form-input" 
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '2px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                      value={formRollNo}
                      onChange={(e) => setFormRollNo(e.target.value.toUpperCase())}
                      placeholder="e.g. 22B01A0501"
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>This becomes the student's login ID and default password.</span>
                  </div>
                )}

                {activeModal === 'edit' && formRollNo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Register Number (Roll No.)</label>
                    <input 
                      type="text"
                      className="form-input" 
                      style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', cursor: 'not-allowed' }}
                      value={formRollNo}
                      readOnly
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Email Address / User ID</label>
                  <input 
                    type="email" 
                    required
                    className="form-input" 
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. student@ciet.edu.in"
                  />
                </div>

                {activeModal === 'create' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      {formRole === 'Student' ? 'Custom Password (Optional)' : 'Initial Password *'}
                    </label>
                    <input 
                      type="password" 
                      required={formRole !== 'Student'}
                      className="form-input" 
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={formRole === 'Student' ? 'Leave blank → defaults to Register Number' : 'Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 symbol'}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {formRole === 'Student' 
                        ? 'Default password is the Register Number. If setting a custom password, it must meet complexity requirements.'
                        : 'Must be at least 8 characters with at least one uppercase, one lowercase, one number, and one symbol (e.g. @).'}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Phone Number</label>
                  <input 
                    type="tel" 
                    className="form-input" 
                    style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="10-digit number"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Portal Role</label>
                    <select 
                      className="form-input"
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '10px' }}
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as Role)}
                    >
                      <option value="Student">Student</option>
                      <option value="Faculty">Faculty</option>
                      <option value="Mentor">Mentor</option>
                      <option value="HOD">HOD</option>
                      <option value="Director">Director</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Dept Code</label>
                    <select 
                      className="form-input"
                      style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '10px' }}
                      value={formDeptCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setFormDeptCode(code);
                        const deptObj = departments.find(d => d.code === code);
                        if (deptObj && deptObj.sections && deptObj.sections.length > 0) {
                          setFormSectionId(deptObj.sections[0]);
                        } else {
                          setFormSectionId('');
                        }
                      }}
                    >
                      <option value="">None / General</option>
                      {departments.map(d => (
                        <option key={d.code} value={d.code}>{d.code} - {d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {formRole === 'Student' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', borderTop: '1px solid var(--surface-raised)', paddingTop: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>Academic Batch</label>
                      <input 
                        type="text"
                        className="form-input"
                        style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                        value={formBatch}
                        onChange={(e) => setFormBatch(e.target.value)}
                        placeholder="e.g. 2024-2028"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>Cumulative CGPA</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        className="form-input"
                        style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '3px',
    paddingLeft: '6px' }}
                        value={formCgpa}
                        onChange={(e) => setFormCgpa(e.target.value)}
                        placeholder="e.g. 8.50"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '11.5px', fontWeight: '600', color: 'var(--text-secondary)' }}>Section ID</label>
                      {formDeptCode && departments.find(d => d.code === formDeptCode)?.sections?.length ? (
                        <select
                          className="form-input"
                          style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', padding: '10px' }}
                          value={formSectionId}
                          onChange={(e) => setFormSectionId(e.target.value)}
                        >
                          {departments.find(d => d.code === formDeptCode)?.sections.map(sec => (
                            <option key={sec} value={sec}>{sec}</option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text"
                          className="form-input"
                          style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '1px',
    paddingLeft: '2px' }}
                          value={formSectionId}
                          onChange={(e) => setFormSectionId(e.target.value)}
                          placeholder="e.g. A"
                        />
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setActiveModal(null); setErrorMsg(''); }}
                    className="btn-signout-small"
                    style={{ flex: 1, padding: '12px', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', background: 'none' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px', background: 'var(--accent)', borderColor: 'var(--accent)' }}
                  >
                    {loading ? 'Processing...' : activeModal === 'create' ? 'Create User' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {activeDeptModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          zIndex: 110,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            background: 'var(--surface-overlay)',
            color: 'var(--text-primary)',
            padding: '30px',
            borderRadius: '16px',
            width: '500px',
            maxWidth: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-raised)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                {activeDeptModal === 'create' ? 'Create Department' : 'Edit Department Details'}
              </h2>
              <button 
                type="button"
                onClick={() => { setActiveDeptModal(null); }}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={activeDeptModal === 'create' ? handleCreateDept : handleUpdateDept} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Department Code *</label>
                <input 
                  type="text" 
                  required
                  className="form-input" 
                  style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '1px',
    paddingLeft: '6px' }}
                  value={deptCodeInput}
                  onChange={(e) => setDeptCodeInput(e.target.value)}
                  placeholder="e.g. MECH"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Department Name *</label>
                <input 
                  type="text" 
                  required
                  className="form-input" 
                  style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '1px',
    paddingLeft: '6px'  }}
                  value={deptNameInput}
                  onChange={(e) => setDeptNameInput(e.target.value)}
                  placeholder="e.g. Mechanical Engineering"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>Academic Sections (Comma-separated)</label>
                <input 
                  type="text"
                  className="form-input" 
                  style={{ background: 'var(--surface-base)', color: 'var(--text-primary)', border: '1px solid var(--card-border)', marginLeft: '1px',
    paddingLeft: '6px'  }}
                  value={deptSectionsInput}
                  onChange={(e) => setDeptSectionsInput(e.target.value)}
                  placeholder="e.g. MECH-A, MECH-B"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Specify the sections belonging to this department, separated by commas.</span>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                <button 
                  type="button" 
                  onClick={() => { setActiveDeptModal(null); }}
                  className="btn-signout-small"
                  style={{ flex: 1, padding: '12px', color: 'var(--text-secondary)', border: '1px solid var(--card-border)', background: 'none' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', background: 'var(--accent)', borderColor: 'var(--accent)' }}
                >
                  {activeDeptModal === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


