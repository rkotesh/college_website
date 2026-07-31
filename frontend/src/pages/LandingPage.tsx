import { useEffect, useRef } from 'react';
import './LandingPage.css';

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);

  // ── Mobile menu ───────────────────────────────────────────────────────────
  const openMenu = () => {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    menu.classList.remove('hidden');
    setTimeout(() => {
      menu.classList.remove('lp-opacity-0');
      menu.classList.add('lp-opacity-100');
    }, 10);
    document.body.style.overflow = 'hidden';
  };

  const closeMenu = () => {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    menu.classList.remove('lp-opacity-100');
    menu.classList.add('lp-opacity-0');
    setTimeout(() => {
      menu.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  };

  // ── Smooth Scroll Helper ──────────────────────────────────────────────────
  const scrollToSection = (id: string) => {
    closeMenu();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── Scroll-reveal ─────────────────────────────────────────────────────────
  useEffect(() => {
    const targets = document.querySelectorAll('.lp-section-reveal');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('lp-is-visible');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, []);

  // ── Counter animation ─────────────────────────────────────────────────────
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>('[data-lp-counter]');
    const runCounter = (node: HTMLElement) => {
      const target = Number(node.dataset.lpCounter);
      if (!Number.isFinite(target)) return;
      let current = 0;
      const increment = Math.max(1, Math.floor(target / 50));
      const tick = () => {
        current = Math.min(target, current + increment);
        node.textContent = current.toLocaleString() + '+';
        if (current < target) requestAnimationFrame(tick);
      };
      tick();
    };
    const cObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            runCounter(e.target as HTMLElement);
            cObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    nodes.forEach((n) => cObs.observe(n));
    return () => cObs.disconnect();
  }, []);

  // ── Navigate to /login ────────────────────────────────────────────────────
  const goLogin = () => {
    window.history.pushState(null, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navItems = [
    { label: 'About CIET', id: 'about' },
    { label: 'Departments', id: 'programs' },
    { label: 'Placements', id: 'placements' },
    { label: 'News & Events', id: 'news' },
    { label: 'Campus Life', id: 'campus' },
    { label: 'Leadership', id: 'leadership' },
    { label: 'Contact Us', id: 'contact' },
  ];

  return (
    <div ref={rootRef} className="lp-root">
      {/* ── Utility Bar ── */}
      <div className="lp-util-bar">
        <div className="lp-util-inner">
          <div className="lp-eamcet-badge">EAMCET Code: <strong>CIET</strong></div>
          <div className="lp-util-right">
            <span>📍 Lam, Guntur, AP - 522034</span>
            <span>📞 +91 863 2524112</span>
            <span>✉️ admissions@ciet.ac.in</span>
          </div>
        </div>
      </div>

      {/* ── Main Header ── */}
      <header className="lp-header">
        <div className="lp-header-inner">
          {/* Logo */}
          <a href="/" className="lp-logo-wrap">
            <img src="/homepage-assets/ciet-logo__1_-removebg-preview.png" alt="CIET Logo" className="lp-logo-img" />
            <span className="lp-logo-text">
              Chalapathi Institute of<br />Engineering &amp; Technology
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="lp-desktop-nav">
            {navItems.map(({ label, id }) => (
              <a
                key={label}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(id);
                }}
                className="lp-nav-link"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="lp-header-actions">
            {/* Login button */}
            <button onClick={goLogin} className="lp-login-btn">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              ERP Login
            </button>

            {/* Hamburger button (Mobile Only) */}
            <button onClick={openMenu} className="lp-icon-btn lp-hamburger-btn" aria-label="Open mobile menu">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Full-screen Mobile Menu ── */}
      <div id="mobile-menu" className="lp-mobile-menu hidden lp-opacity-0">
        <div className="lp-mobile-menu-top">
          <button onClick={closeMenu} className="lp-close-btn" aria-label="Close menu">
            <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="lp-mobile-menu-body">
          <div>
            <h3 className="lp-menu-section-title">Institution &amp; Governance</h3>
            <ul className="lp-menu-list">
              <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>About CIET</a></li>
              <li><a href="#leadership" onClick={(e) => { e.preventDefault(); scrollToSection('leadership'); }}>Leadership &amp; Management</a></li>
              <li><a href="#achievements" onClick={(e) => { e.preventDefault(); scrollToSection('achievements'); }}>NBA Accreditations &amp; Stats</a></li>
              <li><a href="#news" onClick={(e) => { e.preventDefault(); scrollToSection('news'); }}>News &amp; Events</a></li>
            </ul>
          </div>
          <div>
            <h3 className="lp-menu-section-title">Academic Departments</h3>
            <ul className="lp-menu-list">
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>Computer Science &amp; Eng. (CSE)</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>Electronics &amp; Comm. (ECE)</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>AI &amp; Machine Learning (AI&amp;ML)</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>Data Science &amp; Cyber Security</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>Electrical (EEE) &amp; Civil Eng.</a></li>
            </ul>
          </div>
          <div className="lp-menu-portal-card">
            <h2>CIET Student &amp; Faculty ERP</h2>
            <p>Access attendance, grades, ERP timetable, LMS, internal marks, and academic reports.</p>
            <button onClick={goLogin} className="lp-portal-login-btn">Login to ERP Portal</button>
          </div>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <section id="about" className="lp-hero">
        <video autoPlay loop muted playsInline className="lp-hero-video">
          <source src="/homepage-assets/Chalapathi Engineering Institutions - 2025 (2).mp4" type="video/mp4" />
        </video>
        <div className="lp-hero-overlay" />
        <div className="lp-hero-content">
          <div className="lp-hero-inner lp-section-reveal">
            <span className="lp-hero-badge">AICTE Approved • JNTUK Affiliated • Autonomous • EAMCET: CIET</span>
            <h1 className="lp-hero-title">
              Education for Life.<br />Education for Living.
            </h1>
            <p className="lp-hero-sub">
              Empowering engineers through cutting-edge technology, NBA accredited programs, advanced SAP ERP training, and strong industry placements.
            </p>
            <div className="lp-hero-cta">
              <button onClick={() => scrollToSection('programs')} className="lp-btn-primary">Explore Departments</button>
              <button onClick={goLogin} className="lp-btn-outline-hero">Access ERP Portal</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Real Achievements & Impact Bar ── */}
      <section id="achievements" className="lp-section lp-section-primary">
        <div className="lp-container lp-research-grid lp-section-reveal">
          <div>
            <span className="lp-section-kicker">Excellence in Action</span>
            <h2 className="lp-research-title">Empowering Future Engineers</h2>
            <p className="lp-research-desc">
              Chalapathi Institute of Engineering and Technology (CIET), located at Lam, Guntur, plays a pivotal role in nurturing tech leaders with world-class infrastructure, research facilities, and placement training.
            </p>
            <button onClick={() => scrollToSection('placements')} className="lp-btn-outline-white">Placement Highlights</button>
          </div>
          <div className="lp-stats-grid">
            {[
              { count: 2800, label: 'Graduated Engineers' },
              { count: 20, label: 'Faculty with Ph.D.' },
              { count: 38, label: 'Top Tier Recruiters' },
              { count: 440, label: 'Campus Placements' },
            ].map(({ count, label }) => (
              <div key={label} className="lp-stat-card">
                <div className="lp-stat-number" data-lp-counter={count}>0</div>
                <div className="lp-stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Academic Departments ── */}
      <section id="programs" className="lp-section lp-section-light">
        <div className="lp-container">
          <div className="lp-section-header lp-section-reveal">
            <span className="lp-section-tag">Programs &amp; Disciplines</span>
            <h2 className="lp-section-title">Academic Departments</h2>
            <p className="lp-section-sub">NBA Accredited &amp; Emerging Technology Specializations</p>
            <div className="lp-section-divider" />
          </div>
          <div className="lp-programs-grid lp-section-reveal">
            {[
              {
                code: 'CSE',
                title: 'Computer Science & Eng.',
                desc: 'NBA Accredited • AI, Software Eng. & Cloud Systems',
                icon: <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
              },
              {
                code: 'ECE',
                title: 'Electronics & Comm.',
                desc: 'NBA Accredited • VLSI, Embedded Systems & IoT',
                icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
              },
              {
                code: 'AI & ML',
                title: 'CSE (AI & Machine Learning)',
                desc: 'Neural Networks, Deep Learning & Predictive Analytics',
                icon: <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
              },
              {
                code: 'DS',
                title: 'CSE (Data Science)',
                desc: 'Big Data Processing, Statistical Modeling & Mining',
                icon: <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
              },
              {
                code: 'CS',
                title: 'CSE (Cyber Security)',
                desc: 'Ethical Hacking, Network Security & Cryptography',
                icon: <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
              },
              {
                code: 'CSIT',
                title: 'Computer Science & IT',
                desc: 'Web Technologies, Systems Architecture & Mobile Apps',
                icon: <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />,
              },
              {
                code: 'EEE',
                title: 'Electrical & Electronics',
                desc: 'NBA Accredited • Renewable Energy & Power Systems',
                icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
              },
              {
                code: 'CIVIL',
                title: 'Civil Engineering',
                desc: 'NBA Accredited • Structural Engineering & Construction',
                icon: <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-4 0h4" />,
              },
            ].map(({ code, title, desc, icon }) => (
              <div key={code} className="lp-program-card">
                <span className="lp-program-code">{code}</span>
                <div className="lp-program-icon">
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                </div>
                <h3 className="lp-program-label">{title}</h3>
                <p className="lp-program-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real Top Recruiters & Placements ── */}
      <section id="placements" className="lp-section lp-section-card">
        <div className="lp-container">
          <div className="lp-section-header lp-section-reveal">
            <span className="lp-section-tag">Career Success</span>
            <h2 className="lp-section-title">Top Campus Recruiters</h2>
            <p className="lp-section-sub">Leading multinational tech companies hiring CIET graduates</p>
            <div className="lp-section-divider" />
          </div>
          <div className="lp-recruiters-row lp-section-reveal">
            {['IBM', 'HCLTech', 'Wipro', 'TCS', 'Syntel', 'Infosys', 'Tech Mahindra'].map((brand) => (
              <div key={brand} className="lp-recruiter-chip">
                <span className="lp-recruiter-dot" />
                <span className="lp-recruiter-name">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Real News & Events ── */}
      <section id="news" className="lp-section lp-section-light">
        <div className="lp-container">
          <div className="lp-section-header lp-section-reveal">
            <span className="lp-section-tag">Updates &amp; Campus Happenings</span>
            <h2 className="lp-section-title">News &amp; Upcoming Events</h2>
            <div className="lp-section-divider" />
          </div>
          <div className="lp-events-grid lp-section-reveal">
            <div className="lp-event-card lp-event-featured">
              <span className="lp-event-badge">Techno-Cultural Fest</span>
              <h3 className="lp-event-title">CIET NOVUM 2026</h3>
              <p className="lp-event-date">March 13th &amp; 14th, 2026 • CIET Campus, Lam</p>
              <p className="lp-event-desc">
                Annual flagship inter-collegiate festival featuring technical paper presentations, hackathons, sports fiesta, robotics competition, and cultural performances.
              </p>
            </div>

            <div className="lp-event-card">
              <span className="lp-event-badge secondary">Placement Skill Drive</span>
              <h3 className="lp-event-title">SAP Functional Training Program</h3>
              <p className="lp-event-date">Event Date: 01-06-2026</p>
              <p className="lp-event-desc">
                Hands-on training program for students on Enterprise Resource Planning (ERP) systems, focusing on SAP modules for finance, supply chain, and business operations.
              </p>
            </div>

            <div className="lp-event-card">
              <span className="lp-event-badge secondary">Technical Training</span>
              <h3 className="lp-event-title">Python &amp; Java Placement Readiness</h3>
              <p className="lp-event-date">Event Date: 15-05-2026</p>
              <p className="lp-event-desc">
                Intensive coding drive for final-year engineering students covering core algorithms, problem-solving, data structures, and mock interview preparations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Life @ CIET Media ── */}
      <section id="campus" className="lp-section lp-section-card">
        <div className="lp-container">
          <div className="lp-section-header lp-section-reveal">
            <span className="lp-section-tag">Vibrant Environment</span>
            <h2 className="lp-section-title">Life @ CIET</h2>
            <div className="lp-section-divider" />
          </div>

          <div className="lp-life-main-grid lp-section-reveal">
            <video autoPlay loop muted playsInline className="lp-life-video">
              <source src="/homepage-assets/Ciet student achivements.mp4" type="video/mp4" />
            </video>
            <div className="lp-life-photo-grid">
              <img src="/homepage-assets/ciet college .jpeg" className="lp-life-img-large" alt="CIET Campus" />
              <div className="lp-life-photo-small-col">
                <img src="/homepage-assets/001.png" className="lp-life-img-small" alt="Campus life" />
                <img src="/homepage-assets/002.png" className="lp-life-img-small" alt="Campus life" />
              </div>
              <img src="/homepage-assets/007.png" className="lp-life-img-wide" alt="Campus life" />
            </div>
          </div>

          <div className="lp-life-bottom-grid lp-section-reveal">
            {['003', '004', '005', '006'].map((n) => (
              <img key={n} src={`/homepage-assets/${n}.png`} className="lp-life-img-bottom" alt="Campus" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Leadership ── */}
      <section id="leadership" className="lp-section lp-section-light">
        <div className="lp-container">
          <div className="lp-section-header lp-section-reveal">
            <span className="lp-section-tag">Visionary Guidance</span>
            <h2 className="lp-section-title">Institute Leadership</h2>
            <div className="lp-section-divider" />
          </div>
          <div className="lp-leadership-grid lp-section-reveal">
            {[
              {
                img: 'chairman.jpg',
                name: 'Sri Y.V. Anjaneyulu',
                role: 'Founder & Chairman',
                desc: 'Chalapathi Educational Society',
              },
              {
                img: 'principal1.jpg',
                name: 'Dr. M. Chandra Sekhar',
                role: 'Principal',
                desc: 'Chalapathi Institute of Eng. & Tech.',
              },
              {
                img: 'sujithsir.jpg',
                name: 'Sri. Y. Sujith Kumar',
                role: 'Secretary & Correspondent',
                desc: 'Chalapathi Educational Society',
              },
            ].map(({ img, name, role, desc }) => (
              <div key={name} className="lp-leader-card">
                <div className="lp-leader-avatar-wrap">
                  <img src={`/homepage-assets/${img}`} className="lp-leader-avatar" alt={name} />
                </div>
                <h3 className="lp-leader-name">{name}</h3>
                <p className="lp-leader-role">{role}</p>
                <p className="lp-leader-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer id="contact" className="lp-site-footer">
        <div className="lp-site-footer-grid">
          <div className="lp-site-footer-col">
            <div className="lp-site-footer-logo-pill">
              <img
                src="/homepage-assets/ciet-logo__1_-removebg-preview.png"
                className="lp-site-footer-logo-img"
                alt="CIET Logo"
              />
            </div>
            <p className="lp-site-footer-desc">
              <strong>Chalapathi Institute of Engineering &amp; Technology</strong><br />
              Autonomous Institution • AICTE Approved • Affiliated to JNTUK<br />
              Chalapathi Nagar, Lam, Guntur, AP - 522034.<br />
              EAMCET Counseling Code: <strong>CIET</strong>
            </p>
          </div>

          <div className="lp-site-footer-col">
            <h4 className="lp-site-footer-heading">Accreditations</h4>
            <ul className="lp-site-footer-links-list">
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>NBA Re-Accredited (CSE)</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>NBA Re-Accredited (ECE)</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>NBA Re-Accredited (EEE)</a></li>
              <li><a href="#programs" onClick={(e) => { e.preventDefault(); scrollToSection('programs'); }}>NBA Re-Accredited (CIVIL)</a></li>
              <li><a href="#achievements" onClick={(e) => { e.preventDefault(); scrollToSection('achievements'); }}>NIRF 2025 &amp; AICTE Approvals</a></li>
            </ul>
          </div>

          <div className="lp-site-footer-col">
            <h4 className="lp-site-footer-heading">Academic Portal</h4>
            <ul className="lp-site-footer-links-list">
              <li><a href="#" onClick={(e) => { e.preventDefault(); goLogin(); }}>Student ERP Portal</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); goLogin(); }}>Faculty Command Center</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); goLogin(); }}>HOD &amp; Mentor Dashboard</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); goLogin(); }}>Examination Portal</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); goLogin(); }}>Parent Portal Access</a></li>
            </ul>
          </div>

          <div className="lp-site-footer-col">
            <h4 className="lp-site-footer-heading">Contact Us</h4>
            <ul className="lp-site-footer-links-list lp-site-footer-contact">
              <li>📍 Chalapathi Nagar, Lam, Guntur - 522034</li>
              <li>📞 +91 863 2524112 / +91 95426 65555</li>
              <li>✉️ admissions@ciet.ac.in</li>
              <li>✉️ principalciet@gmail.com</li>
            </ul>
          </div>
        </div>

        <div className="lp-site-footer-bottom">
          <p>© 2026 Chalapathi Institute of Engineering and Technology (CIET). All Rights Reserved.</p>
          <div className="lp-site-footer-legal">
            <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>Privacy Policy</a>
            <a href="#" onClick={(e) => { e.preventDefault(); scrollToSection('about'); }}>Terms of Use</a>
            <a href="#" onClick={(e) => { e.preventDefault(); goLogin(); }}>ERP Login</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
