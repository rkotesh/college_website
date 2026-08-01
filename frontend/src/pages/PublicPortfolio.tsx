import React, { useState, useEffect, useRef } from 'react';
import './PublicPortfolio.css';

interface PublicPortfolioProps {
  slug: string;
  API_BASE_URL: string;
}

export default function PublicPortfolio({ slug, API_BASE_URL }: PublicPortfolioProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollPct, setScrollPct] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  // @ts-expect-error unused variable warning
  const [showNotif, setShowNotif] = useState(false);
  const [msgs, setMsgs] = useState<Array<{ sender: 'assistant' | 'user'; text: string }>>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const msgEnd = useRef<HTMLDivElement>(null);
  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/portal/public/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentSlug: slug,
          name: formData.name,
          email: formData.email,
          message: `Subject: ${formData.subject}\n\n${formData.message}`
        })
      });
      if (res.ok) {
        setFormSent(true);
        setTimeout(() => {
          setFormSent(false);
          setFormData({ name: '', email: '', subject: '', message: '' });
        }, 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to send message');
      }
    } catch (err) {
      alert('Network or server error.');
    }
  };

  /* ---- fetch portfolio ---- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/v1/portal/public/portfolio/${slug}`, { credentials: 'include' });
        if (res.status === 403) { setError('This portfolio is set to private.'); return; }
        if (!res.ok) { setError('Portfolio not found. The link may be incorrect.'); return; }
        const json = await res.json();
        setData(json);
        const name = json?.user?.fullName || 'the student';
        document.title = `${name} | Portavia Portfolio`;
        setMsgs([{ sender: 'assistant', text: `Hi there! 👋 I'm ${name.split(' ')[0]}'s AI avatar. How can I help?` }]);
        setChips(["Tell me about yourself", "Show your projects", "What are your skills?", "Get contact info"]);
      } catch { setError('Unable to load. Please try again later.'); }
      finally { setLoading(false); }
    })();
  }, [slug, API_BASE_URL]);

  /* ---- scroll progress ---- */
  useEffect(() => {
    const fn = () => {
      const s = document.body.scrollTop || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollPct(h > 0 ? (s / h) * 100 : 0);
      setNavScrolled(s > 40);
    };
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* ---- chat notification ---- */
  useEffect(() => {
    const t = setTimeout(() => { if (!chatOpen && !hasOpenedChat) setShowNotif(true); }, 7000);
    return () => clearTimeout(t);
  }, [chatOpen, hasOpenedChat]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, isTyping]);

  /* ---- chatbot logic ---- */
  const has = (q: string, terms: string[]) => terms.some(t => q.includes(t));
  const reply = (q: string) => {
    if (!data) return { text: "Still loading…" };
    const lower = q.toLowerCase();
    const { user, profile, projects = [] } = data;
    const name = user?.fullName || 'Student';
    if (has(lower, ['hi','hello','hey'])) return { text: `Hello! I'm ready to share details about my engineering journey.`, chips: ['Tell me about yourself','Show your projects'] };
    if (has(lower, ['about','bio'])) return { text: profile?.profileSummary || `I'm **${name}**.`, chips: ['What are your skills?','Education details'] };
    if (has(lower, ['skill','tech'])) return { text: `Check out the Technologies section!`, chips: ['Show your projects'] };
    if (has(lower, ['experience','work'])) return { text: `Check out the Work Experience section!`, chips: ['Show your projects'] };
    if (has(lower, ['project','built'])) return { text: `I've built ${projects.length}+ projects.`, chips: ['Get contact info'] };
    if (has(lower, ['contact','email'])) return { text: `You can reach me at ${profile?.personalEmail || user?.email}`, chips: [] };
    return { text: `I can share details about ${name}'s skills and projects.`, chips: ['What are your skills?'] };
  };

  const sendChat = (text?: string) => {
    const q = (text || chatInput).trim();
    if (!q) return;
    setChatInput('');
    setMsgs(m => [...m, { sender: 'user', text: q }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const r = reply(q);
      setMsgs(m => [...m, { sender: 'assistant', text: r.text }]);
      if (r.chips) setChips(r.chips);
    }, 800 + Math.random() * 500);
  };

  const md = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  /* ============ LOADING & ERROR ============ */
  if (loading) return (
    <div className="portfolio-root" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color: '#94a3b8' }}>
      Loading Portavia portfolio...
    </div>
  );
  if (error || !data) return (
    <div className="portfolio-root" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', color: '#ef4444' }}>
      {error || 'Portfolio not found'}
    </div>
  );

  const { user, profile, education=[], certifications=[], projects=[], internships=[], skills=[] } = data;
  const fullName = user?.fullName || 'Student';
  const firstName = fullName.split(' ')[0] || 'Student';
  const lastName = fullName.split(' ').slice(1).join(' ') || '';

  const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e1b4b&color=a78bfa&size=512&font-size=0.38&bold=true`;
  
  let photo = defaultAvatar;
  const rawPhoto = profile?.photoUrl || user?.photoUrl;
  if (rawPhoto && rawPhoto.trim() !== '') {
    photo = rawPhoto.startsWith('http') ? rawPhoto : `${API_BASE_URL}${rawPhoto}`;
  }

  const groupedSkills = skills.reduce((acc: any, skill: any) => {
    const cat = skill.category || 'Others';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill.name);
    return acc;
  }, {});

  const connectedPlatformsList = [
    { key: 'leetcodeUrl', label: 'LeetCode', icon: '🧠', desc: 'Solved problems & coding skills' },
    { key: 'githubUrl', label: 'GitHub', icon: '⌨️', desc: 'Repositories & open-source contributions' },
    { key: 'hackerrankUrl', label: 'HackerRank', icon: '🏆', desc: 'Verified badges & certifications' },
    { key: 'linkedinUrl', label: 'LinkedIn', icon: '💼', desc: 'Professional network & profile' },
    { key: 'codechefUrl', label: 'CodeChef', icon: '⭐', desc: 'Competitive programming & ratings' },
    { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', icon: '🎓', desc: 'IIT Bombay spoken tutorial certifications' },
    { key: 'prepinstaUrl', label: 'PrepInsta', icon: '🚀', desc: 'Placement preparation & coding resources' },
  ].filter(plat => !!profile?.[plat.key]);

  /* ============ RENDER ============ */
  return (
    <div className="portfolio-root">
      <div className="pv-scroll-progress" style={{ width: `${scrollPct}%` }}></div>
      <div className="pv-ambient-glow-1"></div>

      {/* Floating Glass Pill Navbar */}
      <div className="pv-navbar-wrapper">
        <nav className={`pv-navbar ${navScrolled ? 'scrolled' : ''}`}>
          <a href="#" className="pv-nav-brand">
            <img 
              src={photo} 
              alt={fullName} 
              className="pv-nav-avatar"
              onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
            />
            <span>{firstName} {lastName}</span>
          </a>
          <div className="pv-nav-links">
            <a href="#about" className="pv-nav-link">About</a>
            {connectedPlatformsList.length > 0 && <a href="#platforms" className="pv-nav-link">Integrations</a>}
            {internships.length > 0 && <a href="#experience" className="pv-nav-link">Experience</a>}
            {education.length > 0 && <a href="#education" className="pv-nav-link">Education</a>}
            {certifications.length > 0 && <a href="#certificates" className="pv-nav-link">Credentials</a>}
            {skills.length > 0 && <a href="#technologies" className="pv-nav-link">Skills</a>}
            {projects.length > 0 && <a href="#projects" className="pv-nav-link">Projects</a>}
          </div>
          <a href="#contact" className="pv-nav-cta">Get in Touch</a>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="pv-section pv-hero-section">
        <div className="pv-container">
          <div className="pv-hero-grid">
            <div>
              <div className="pv-hero-status-pill">
                <span className="pv-status-dot"></span> Open to Opportunities
              </div>
              <h1 className="pv-hero-name">
                {firstName} <span className="pv-gradient-text">{lastName}</span>
              </h1>
              <p className="pv-hero-summary">
                {profile?.profileSummary || 'Software Engineer & Full Stack Developer | Open to Full-Time & Internship Opportunities'}
              </p>
              <div className="pv-hero-actions">
                <a href="#contact" className="pv-btn-primary">Get in Touch →</a>
                {profile?.resumeUrl && profile?.showResumeOnProfile && (
                  <a href={profile.resumeUrl} className="pv-btn-secondary" target="_blank" rel="noreferrer">
                    Download Resume ↗
                  </a>
                )}
              </div>
              <div className="pv-hero-stats-grid">
                <div className="pv-stat-item">
                  <div className="pv-stat-val">{projects.length}+</div>
                  <div className="pv-stat-lbl">Projects Built</div>
                </div>
                <div className="pv-stat-item">
                  <div className="pv-stat-val">{skills.length}+</div>
                  <div className="pv-stat-lbl">Tech Skills</div>
                </div>
                {profile?.cgpa && (
                  <div className="pv-stat-item">
                    <div className="pv-stat-val">{profile.cgpa}</div>
                    <div className="pv-stat-lbl">CGPA Score</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="pv-hero-photo-card">
                <div className="pv-photo-img-wrapper">
                  <img 
                    src={photo} 
                    alt={fullName} 
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="pv-section">
        <div className="pv-container">
          <div className="pv-section-header">
            <span className="pv-section-eyebrow">WHO I AM</span>
            <h2 className="pv-section-title">About Me</h2>
          </div>
          <div className="pv-card">
            <p style={{ fontSize: '1.05rem', color: 'var(--pv-text-sub)', marginBottom: '1.5rem' }}>
              I'm <strong style={{ color: '#fff' }}>{user?.fullName}</strong>. {profile?.profileSummary}
            </p>
            <div style={{ marginTop: '2rem' }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--pv-accent-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Technical Competencies</h4>
              <div className="pv-bento-grid-2">
                {Object.keys(groupedSkills).map((cat: string) => (
                  <div key={cat} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--pv-border)', borderRadius: '12px', padding: '1.25rem' }}>
                    <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#fff' }}>{cat}</h5>
                    <div className="pv-skills-flex">
                      {groupedSkills[cat].map((s: string, i: number) => (
                        <span key={i} className="pv-skill-chip">{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connected Platforms Bento Section */}
      {connectedPlatformsList.length > 0 && (
        <section id="platforms" className="pv-section">
          <div className="pv-container">
            <div className="pv-section-header">
              <span className="pv-section-eyebrow">INTEGRATIONS</span>
              <h2 className="pv-section-title">Developer Profiles</h2>
              <p className="pv-section-desc">Verified coding activity, repository contributions, and professional platforms.</p>
            </div>
            <div className="pv-bento-grid-4">
              {connectedPlatformsList.map((plat) => {
                const url = profile[plat.key];
                return (
                  <div key={plat.key} className="pv-card pv-platform-card">
                    <div className="pv-platform-top">
                      <span className="pv-platform-icon">{plat.icon}</span>
                      <span className="pv-connected-tag">CONNECTED</span>
                    </div>
                    <div className="pv-platform-name">{plat.label}</div>
                    <div className="pv-platform-desc">{plat.desc}</div>
                    <div className="pv-platform-stat">
                      {(() => {
                        switch (plat.key) {
                          case 'leetcodeUrl':
                            const easy = profile?.leetcodeEasySolved || 0;
                            const med = profile?.leetcodeMediumSolved || 0;
                            const hard = profile?.leetcodeHardSolved || 0;
                            return `Solved: ${easy + med + hard} (${easy}E · ${med}M · ${hard}H)`;
                          case 'githubUrl':
                            return `Repos: ${profile?.githubReposCount || 0} · Commits: ${profile?.githubCommitsCount || 0}`;
                          case 'codechefUrl':
                            return `Rating: ${profile?.codechefRating || 0} · Stars: ${profile?.codechefStars || '1★'}`;
                          case 'hackerrankUrl':
                            return `Badges: ${profile?.hackerrankBadgesCount || 0} verified`;
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
                    <a href={url} target="_blank" rel="noreferrer" className="pv-link-arrow">
                      View Profile ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Experience Section */}
      {internships.length > 0 && (
        <section id="experience" className="pv-section">
          <div className="pv-container">
            <div className="pv-section-header">
              <span className="pv-section-eyebrow">CAREER PATH</span>
              <h2 className="pv-section-title">Work Experience</h2>
            </div>
            <div className="pv-bento-grid-2">
              {internships.map((intern: any) => (
                <div key={intern.id} className="pv-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pv-accent-light)' }}>{intern.organization || intern.companyName}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--pv-text-dim)' }}>{intern.startDate} – {intern.endDate || 'Present'}</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{intern.role}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--pv-text-sub)', marginBottom: '1rem', lineHeight: '1.5' }}>{intern.description}</p>
                  {intern.certificateUrl && (
                    <a href={intern.certificateUrl} target="_blank" rel="noreferrer" className="pv-link-arrow">
                      View Certificate ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Education Section */}
      {education.length > 0 && (
        <section id="education" className="pv-section">
          <div className="pv-container">
            <div className="pv-section-header">
              <span className="pv-section-eyebrow">ACADEMICS</span>
              <h2 className="pv-section-title">Education</h2>
            </div>
            <div className="pv-bento-grid-2">
              {education.map((edu: any) => (
                <div key={edu.id} className="pv-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pv-accent-light)' }}>{edu.institution || edu.boardUniversity}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--pv-text-dim)' }}>{edu.startDate || edu.yearOfPassing || ''}</span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{edu.eduType || edu.degree}</h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--pv-text-sub)', marginBottom: '0.75rem' }}>{edu.description}</p>
                  <span className="pv-skill-chip">Score: {edu.score} {edu.scoreType}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Certifications Section */}
      {certifications.length > 0 && (
        <section id="certificates" className="pv-section">
          <div className="pv-container">
            <div className="pv-section-header">
              <span className="pv-section-eyebrow">CREDENTIALS</span>
              <h2 className="pv-section-title">Certifications</h2>
            </div>
            <div className="pv-bento-grid-3">
              {certifications.map((cert: any, idx: number) => {
                const url = cert.certUrl || cert.credentialUrl || cert.certificateUrl || cert.fileUrl || cert.url;
                const org = cert.issuer || cert.issuingOrganization || cert.organization || 'Certification';
                return (
                  <div key={cert.id || cert._id || idx} className="pv-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pv-accent-light)', marginBottom: '0.4rem' }}>{org}</div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>{cert.title || cert.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--pv-text-sub)', marginBottom: '1.25rem', flexGrow: 1 }}>{cert.description || 'Verified credential program completion.'}</p>
                    {url && (
                      <a href={url} target="_blank" rel="noreferrer" className="pv-link-arrow">
                        View Credential PDF ↗
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Technologies Marquee */}
      {skills.length > 0 && (
        <section id="technologies" className="pv-section" style={{ paddingBottom: '3.5rem' }}>
          <div className="pv-container" style={{ marginBottom: '1.5rem' }}>
            <span className="pv-section-eyebrow">STACK</span>
            <h2 className="pv-section-title">Technologies & Tools</h2>
          </div>
          <div className="pv-marquee-outer">
            <div className="pv-marquee-track">
              {[...skills, ...skills, ...skills, ...skills].map((s: any, i: number) => (
                <React.Fragment key={i}>
                  <span className="pv-marquee-item">{s.name}</span>
                  <span style={{ color: 'var(--pv-border-hi)' }}>•</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Projects Bento Section */}
      {projects.length > 0 && (
        <section id="projects" className="pv-section">
          <div className="pv-container">
            <div className="pv-section-header">
              <span className="pv-section-eyebrow">FEATURED WORK</span>
              <h2 className="pv-section-title">Projects</h2>
            </div>
            <div className="pv-bento-grid-3">
              {projects.map((proj: any, idx: number) => {
                const isFeatured = !!proj.isFeatured;
                const github = proj.githubLink || proj.repoUrl || proj.githubUrl;
                const live = proj.liveLink || proj.demoUrl || proj.projectUrl;
                
                let tags: string[] = [];
                if (proj.technologies) {
                  tags = typeof proj.technologies === 'string' ? proj.technologies.split(',').map((t: string) => t.trim()) : proj.technologies;
                } else if (proj.techStack) {
                  tags = typeof proj.techStack === 'string' ? proj.techStack.split(',').map((t: string) => t.trim()) : proj.techStack;
                } else {
                  tags = ['Software Dev'];
                }

                return (
                  <div key={proj.id || proj._id || idx} className="pv-card pv-project-card">
                    {isFeatured && <span className="pv-featured-tag">FEATURED PROJECT</span>}
                    <div className="pv-project-title">{proj.title}</div>
                    <div className="pv-project-desc">{proj.description || 'Custom web application.'}</div>
                    <div className="pv-tag-list">
                      {tags.map((tag: string, tIdx: number) => (
                        <span key={tIdx} className="pv-tag-pill">{tag}</span>
                      ))}
                    </div>
                    <div className="pv-project-links">
                      {github && (
                        <a href={github} target="_blank" rel="noreferrer" className="pv-btn-pill">
                          Source Code ↗
                        </a>
                      )}
                      {live && (
                        <a href={live} target="_blank" rel="noreferrer" className="pv-btn-pill" style={{ background: 'var(--pv-accent)', borderColor: 'var(--pv-accent)', color: '#fff' }}>
                          Live Demo ↗
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contact" className="pv-section">
        <div className="pv-container">
          <div className="pv-section-header">
            <span className="pv-section-eyebrow">GET IN TOUCH</span>
            <h2 className="pv-section-title">Contact</h2>
          </div>
          <div className="pv-contact-grid">
            <div className="pv-card">
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Let's build something together.</h3>
              <p style={{ color: 'var(--pv-text-sub)', fontSize: '0.92rem', marginBottom: '2rem' }}>
                Feel free to send a direct inquiry regarding employment, project collaborations, or technical opportunities.
              </p>
              {profile?.personalEmail && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pv-text-dim)', fontWeight: 700 }}>EMAIL</div>
                  <a href={`mailto:${profile.personalEmail}`} style={{ color: 'var(--pv-accent-light)', textDecoration: 'none', fontWeight: 700, fontSize: '1.05rem' }}>
                    {profile.personalEmail}
                  </a>
                </div>
              )}
              {profile?.personalPhone && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pv-text-dim)', fontWeight: 700 }}>PHONE</div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{profile.personalPhone}</div>
                </div>
              )}
            </div>

            <div className="pv-contact-card">
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#fff' }}>Send a Message</h4>
              <form onSubmit={handleContactSubmit}>
                <div className="pv-form-group">
                  <label>Name</label>
                  <input type="text" className="pv-form-input" placeholder="Your name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="pv-form-group">
                  <label>Email</label>
                  <input type="email" className="pv-form-input" placeholder="you@example.com" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="pv-form-group">
                  <label>Subject</label>
                  <input type="text" className="pv-form-input" placeholder="What's this about?" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>
                <div className="pv-form-group">
                  <label>Message</label>
                  <textarea className="pv-form-input" rows={4} placeholder="Your message..." required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
                </div>
                <button type="submit" className="pv-form-submit">{formSent ? 'Sent Successfully! ✓' : 'Send Message →'}</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="pv-footer">
        <div className="pv-container">
          <p>© {new Date().getFullYear()} {user?.fullName || 'Student'}. Portavia Portfolio Design.</p>
        </div>
      </footer>

      {/* Floating AI Assistant Drawer & FAB */}
      <button className="pv-chat-fab" onClick={() => { setChatOpen(!chatOpen); setHasOpenedChat(true); setShowNotif(false); }} aria-label="Open AI Assistant">
        🤖
      </button>

      <div className={`pv-chat-drawer ${chatOpen ? 'active' : ''}`}>
        <div className="pv-chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{firstName} AI Assistant</span>
          </div>
          <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        <div className="pv-chat-body">
          {msgs.map((m, i) => (
            <div key={i} className={`pv-chat-msg ${m.sender === 'user' ? 'user' : 'bot'}`} dangerouslySetInnerHTML={{ __html: md(m.text) }} />
          ))}
          {isTyping && <div className="pv-chat-msg bot">Thinking...</div>}
          <div ref={msgEnd} />
        </div>

        <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', background: 'rgba(13,17,26,0.6)' }}>
          {chips.map((c, i) => (
            <button key={i} className="pv-skill-chip" style={{ cursor: 'pointer', fontSize: '0.72rem' }} onClick={() => sendChat(c)}>
              {c}
            </button>
          ))}
        </div>

        <form className="pv-chat-input-row" onSubmit={e => { e.preventDefault(); sendChat(); }}>
          <input type="text" className="pv-form-input" style={{ padding: '0.5rem 0.75rem', fontSize: '0.82rem' }} value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask me anything..." required />
          <button type="submit" className="pv-btn-primary" style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}>Send</button>
        </form>
      </div>
    </div>
  );
}
