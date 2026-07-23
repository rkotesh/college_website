import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import PublicPortfolio from './pages/PublicPortfolio';
import HODDashboard from './pages/HODDashboard';
import MentorDashboard from './pages/MentorDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import LandingPage from './pages/LandingPage';
import LogoHeader from './components/LogoHeader';
import ParentDashboard from './pages/ParentDashboard';


const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || (import.meta.env.DEV ? '' : 'https://ciet-erp.onrender.com');

export default function App() {
  const [userSession, setUserSession] = useState<{
    role: string;
    email: string;
    fullName?: string;
    accessToken: string;
  } | null>(null);

  const [initializing, setInitializing] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen to popstate event (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem('accessToken');
      const savedRole  = localStorage.getItem('role');
      const savedEmail = localStorage.getItem('email');
      const savedName  = localStorage.getItem('fullName');

      if (!savedToken || !savedRole || !savedEmail) {
        setInitializing(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/auth/session`, {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUserSession({
              role: data.role || savedRole,
              email: data.email || savedEmail,
              fullName: data.fullName || savedName || undefined,
              accessToken: savedToken
            });
            return;
          }
        }

        console.warn('Stored token rejected by server (expired/invalid). Clearing session.');
        localStorage.clear();
      } catch (e) {
        console.warn('Session validation network error, restoring from localStorage:', e);
        setUserSession({
          role: savedRole,
          email: savedEmail,
          fullName: savedName || undefined,
          accessToken: savedToken
        });
      } finally {
        setInitializing(false);
      }
    };
    checkSession();
  }, []);

  // Sync URL & Document Title based on userSession & currentPath
  useEffect(() => {
    if (initializing) return;

    const portfolioMatch = currentPath.match(/^\/portfolio\/(.+)/);
    if (portfolioMatch) {
      return;
    }

    if (!userSession) {
      if (currentPath === '/') {
        document.title = "CIET - Chalapathi Institute of Engineering and Technology";
      } else if (currentPath === '/login') {
        document.title = "Login | CIET ERP";
      } else {
        window.history.replaceState(null, '', '/login');
        setCurrentPath('/login');
        document.title = "Login | CIET ERP";
      }
    } else {
      let basePath = '';
      let title = '';

      switch (userSession.role) {
        case 'Director':
          basePath = '/admin-dashboard';
          title = "Admin Dashboard | CIET ERP";
          break;
        case 'HOD':
          basePath = '/hod-dashboard';
          title = "HOD Dashboard | CIET ERP";
          break;
        case 'Mentor':
          basePath = '/mentor-dashboard';
          title = "Mentor Dashboard | CIET ERP";
          break;
        case 'Faculty':
          basePath = '/faculty-dashboard';
          title = "Faculty Dashboard | CIET ERP";
          break;
        case 'Student':
          basePath = '/student-dashboard';
          title = "Student Dashboard | CIET ERP";
          break;
        case 'Parent':
          basePath = '/parent-dashboard';
          title = "Parent Dashboard | CIET ERP";
          break;
        default:
          basePath = '/account';
          title = "Account | CIET ERP";
      }

      if (!currentPath.startsWith(basePath)) {
        window.history.replaceState(null, '', basePath);
        setCurrentPath(basePath);
      }
      if (currentPath === basePath) {
        document.title = title;
      }
    }
  }, [userSession, currentPath, initializing]);

  const handleLoginSuccess = (session: {
    role: string;
    email: string;
    fullName?: string;
    accessToken: string;
  }) => {
    setUserSession(session);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.warn("Logout request failed", e);
    }
    localStorage.clear();
    setUserSession(null);
    window.history.pushState(null, '', '/login');
    setCurrentPath('/login');
  };

  if (initializing) {
    return (
      <div className="ds-loader">
        <div className="ds-loader-ring" />
        <div className="ds-loader-text">Loading secure session...</div>
      </div>
    );
  }

  // Public portfolio route — no auth needed, accessible by HR/recruiters
  const portfolioMatch = currentPath.match(/^\/portfolio\/(.+)/);
  if (portfolioMatch) {
    return <PublicPortfolio slug={portfolioMatch[1]} API_BASE_URL={API_BASE_URL} />;
  }

  // Render landing page for root path before login
  if (currentPath === '/' && !userSession) {
    return <LandingPage />;
  }

  // If user is not logged in, show the split-panel Login Page
  if (!userSession) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // If user is logged in as Director, show the Admin Command Center Dashboard
  if (userSession.role === 'Director' && currentPath.startsWith('/admin-dashboard')) {
    return <AdminDashboard userSession={userSession} handleLogout={handleLogout} />;
  }

  // Route each role to its dedicated dashboard page
  if (userSession.role === 'HOD' && currentPath.startsWith('/hod-dashboard')) {
    return <HODDashboard userSession={userSession} handleLogout={handleLogout} />;
  }
  if (userSession.role === 'Mentor' && currentPath.startsWith('/mentor-dashboard')) {
    return <MentorDashboard userSession={userSession} handleLogout={handleLogout} />;
  }
  if (userSession.role === 'Faculty' && currentPath.startsWith('/faculty-dashboard')) {
    return <FacultyDashboard userSession={userSession} handleLogout={handleLogout} />;
  }

  // If user is logged in as Student, show the Student Dashboard
  if (userSession.role === 'Student' && currentPath.startsWith('/student-dashboard')) {
    return <StudentDashboard userSession={userSession} handleLogout={handleLogout} />;
  }

  // If user is logged in as Parent, show the Parent Dashboard
  if (userSession.role === 'Parent' && currentPath.startsWith('/parent-dashboard')) {
    return <ParentDashboard userSession={userSession} handleLogout={handleLogout} />;
  }

  // Fallback for other logged in roles
  return (
    <div className="login-page-wrapper">
      <div className="login-left-panel">
        <div className="login-brand-logo">
          <LogoHeader imageStyle={{ height: '36px' }} />
          <span style={{ marginLeft: '8px' }}>CIET ERP</span>
        </div>
        <div className="login-hero-text">
          <h1>Welcome back to <em>CIET</em> Portal</h1>
          <p>You are securely logged in to the Enterprise Resource Portal of Chalapathi Institute of Engineering and Technology.</p>
        </div>
        <div className="login-feature-pills">
          <div className="login-feature-pill"><span className="dot"/> Secure Session</div>
          <div className="login-feature-pill"><span className="dot"/> {userSession.role} Access</div>
        </div>
      </div>
      <div className="login-right-panel">
        <div className="login-form-box">
          <div className="login-form-header">
            <h2>Account Dashboard</h2>
            <p>Logged in as {userSession.role}</p>
          </div>
          <div className="status-msg success">✓ Session active — {userSession.fullName || userSession.email}</div>
          <div style={{ margin: '20px 0', padding: '16px', background: 'var(--card-alt)', borderRadius: 'var(--r2)', border: '1px solid var(--card-border)' }}>
            <p style={{ color: 'var(--card-sub)', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.6px', marginBottom: '6px' }}>Account</p>
            <h2 style={{ fontSize: '18px', color: 'var(--card-text)', margin: '0 0 4px', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{userSession.fullName || 'User'}</h2>
            <p style={{ fontSize: '13px', color: 'var(--card-sub)' }}>{userSession.email}</p>
          </div>
          <button onClick={handleLogout} className="btn-primary" style={{ marginTop: '12px' }}>Sign Out</button>
        </div>
      </div>
    </div>
  );
}
