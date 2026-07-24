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
        document.title = `${name} | Portfolio`;
        setMsgs([{ sender: 'assistant', text: `Hi there! 👋 I'm ${name.split(' ')[0]}'s AI avatar. How can I help?` }]);
        setChips(["Tell me about yourself", "Show your projects", "What are your skills?", "Get contact info"]);
      } catch { setError('Unable to load. Please try again later.'); }
      finally { setLoading(false); }
    })();
  }, [slug, API_BASE_URL]);

  /* ---- scroll progress & reveal ---- */
  useEffect(() => {
    const fn = () => {
      const s = document.body.scrollTop || document.documentElement.scrollTop;
      const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      setScrollPct(h > 0 ? (s / h) * 100 : 0);
      setNavScrolled(s > 50);
    };
    window.addEventListener('scroll', fn);
    
    // Reveal Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.01, rootMargin: '50px 0px 50px 0px' });
    
    const triggerObserve = () => {
      document.querySelectorAll('.reveal, .reveal-item, .stagger-reveal').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100) {
          el.classList.add('visible');
          el.classList.add('active');
        } else {
          observer.observe(el);
        }
      });
    };

    setTimeout(triggerObserve, 100);
    setTimeout(triggerObserve, 500);

    return () => {
      window.removeEventListener('scroll', fn);
      observer.disconnect();
    };
  }, [data]);

  /* ---- chat notification ---- */
  useEffect(() => {
    const t = setTimeout(() => { if (!chatOpen && !hasOpenedChat) setShowNotif(true); }, 7000);
    return () => clearTimeout(t);
  }, [chatOpen, hasOpenedChat]);
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, isTyping]);

  /* ---- lottie script injection ---- */
  useEffect(() => {
    if (!document.querySelector('script[src*="lottie-player"]')) {
      const script = document.createElement('script');
      script.src = "https://unpkg.com/@lottiefiles/lottie-player@2.0.4/dist/lottie-player.js";
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

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
    }, 900 + Math.random() * 700);
  };

  const md = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  /* ============ LOADING & ERROR ============ */
  if (loading) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>Loading...</div>;
  if (error || !data) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>{error}</div>;

  const { user, profile, education=[], certifications=[], projects=[], internships=[], skills=[] } = data;
  const firstName = user?.fullName?.split(' ')[0] || 'Student';
  const lastName = user?.fullName?.split(' ').slice(1).join(' ') || '';
  const photo = profile?.photoUrl || 'https://github.com/rkotesh.png';
  
  const groupedSkills = skills.reduce((acc: any, skill: any) => {
    const cat = skill.category || 'Others';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill.name);
    return acc;
  }, {});

  /* ============ RENDER ============ */
  return (
    <>
      <div className="scroll-progress" style={{ width: `${scrollPct}%` }}></div>
      
      <nav className={navScrolled ? 'scrolled' : ''}>
        <div className="nav-container">
          <a href="#" className="nav-logo">
            <img src={photo} alt={user?.fullName} />
            {firstName} <span>{lastName}</span>
          </a>
          <div className="nav-links" id="navLinks">
            <a href="#about">About</a>
            {internships.length > 0 && <a href="#experience">Experience</a>}
            {education.length > 0 && <a href="#education">Education</a>}
            {certifications.length > 0 && <a href="#certificates">Certificates</a>}
            {skills.length > 0 && <a href="#brands">Technologies</a>}
            {projects.length > 0 && <a href="#projects">Projects</a>}
            <a href="#contact" className="nav-cta">Contact</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-text-col">
            <div className="hero-eyebrow">
              <span className="dot"></span> Open to Opportunities
            </div>
            <h1>
              <span style={{ animationDelay: '0.15s' }}>{firstName}</span>{' '}
              <span className="highlight" style={{ animationDelay: '0.3s' }}>{lastName}</span>
            </h1>
            <p className="hero-description">
              {profile?.profileSummary || 'Python & Django Developer | Ex-Flipkart Intern | REST APIs · React · MERN | Open to Full-Time Roles'}
            </p>
            <div className="hero-actions">
              <a href="#contact" className="btn-primary">Get in Touch →</a>
              {profile?.resumeUrl && profile?.showResumeOnProfile && (
                <a href={profile.resumeUrl} className="btn-secondary" target="_blank" rel="noreferrer">Download Resume</a>
              )}
            </div>
            <div className="hero-stats">
              <div className="stat"><h3>{projects.length}+</h3><p>Projects</p></div>
              <div className="stat"><h3>{skills.length}+</h3><p>Tech Skills</p></div>
              {profile?.cgpa && <div className="stat"><h3>{profile.cgpa}</h3><p>CGPA</p></div>}
            </div>
          </div>
          <div className="hero-image-col">
            <div className="hero-image-wrapper">
              <div className="hero-image-card">
                <img src={photo} alt={user?.fullName} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="about">
        <div className="section-header">
          <div>
            <p className="section-label">Who I Am</p>
            <h2 className="section-title">About Me</h2>
          </div>
        </div>
        <div className="about-grid">
          <div className="about-text reveal">
            <p>I'm <strong>{user?.fullName}</strong>. {profile?.profileSummary}</p>
            <div className="skills-categories stagger-reveal">
              {Object.keys(groupedSkills).map((cat: string) => (
                <div key={cat} className="skills-category reveal-item">
                  <h5>{cat}</h5>
                  <div className="skills-tags">
                    {groupedSkills[cat].map((s: string, i: number) => (
                      <span key={i} className="skill-tag">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {(() => {
          const platforms = [
            { key: 'leetcodeUrl', label: 'LeetCode', icon: '🧠', desc: 'Solved problems & coding skills' },
            { key: 'githubUrl', label: 'GitHub', icon: '⌨️', desc: 'Repositories & open-source contributions' },
            { key: 'hackerrankUrl', label: 'HackerRank', icon: '🏆', desc: 'Verified badges & certifications' },
            { key: 'linkedinUrl', label: 'LinkedIn', icon: '💼', desc: 'Professional network & profile' },
            { key: 'codechefUrl', label: 'CodeChef', icon: '⭐', desc: 'Competitive programming & ratings' },
            { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', icon: '🎓', desc: 'IIT Bombay spoken tutorial certifications' },
            { key: 'prepinstaUrl', label: 'PrepInsta', icon: '🚀', desc: 'Placement preparation & coding resources' },
          ].filter(plat => !!profile?.[plat.key]);

          if (platforms.length === 0) return null;

          return (
            <div style={{ marginTop: '3.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <p className="section-label">Connected Platforms</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>Developer Profiles</h3>
              </div>
              <div className="about-highlights stagger-reveal" style={{ marginTop: '0', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {platforms.map((plat) => {
                  const url = profile[plat.key];
                  return (
                    <div key={plat.key} className="highlight-card reveal-item" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '160px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1.25rem' }}>{plat.icon}</span>
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '3px 8px',
                          borderRadius: '100px',
                          background: 'rgba(153, 102, 255, 0.12)',
                          color: 'var(--highlight-dark)',
                          border: '1px solid rgba(153, 102, 255, 0.3)'
                        }}>
                          CONNECTED
                        </span>
                      </div>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>{plat.label}</h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', flexGrow: 1, lineHeight: '1.4' }}>{plat.desc}</p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600, margin: '0 0 12px 0' }}>
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
                      <a href={url} target="_blank" rel="noreferrer" className="project-link" style={{ marginTop: 'auto', alignSelf: 'flex-start' }}>
                        View Profile ↗
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </section>

      {internships.length > 0 && (
        <section id="experience">
          <div className="section-header">
            <div>
              <p className="section-label">Professional Experience</p>
              <h2 className="section-title">Work Experience</h2>
              <p className="section-headline">My professional roles and internships.</p>
            </div>
          </div>
          <div className="experience-timeline stagger-reveal">
            {internships.map((intern: any) => (
              <div key={intern.id} className="experience-card reveal-item">
                <div className="experience-meta">
                  <span className="company">{intern.organization || intern.companyName}</span>
                  {intern.startDate} – {intern.endDate || 'Present'}
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{intern.internshipType || intern.mode || 'Remote'}</div>
                </div>
                <div className="experience-body">
                  <h4>{intern.role}</h4>
                  <p>{intern.description}</p>
                  {intern.certificateUrl && (
                    <div style={{ marginTop: '1.15rem' }}>
                      <a href={intern.certificateUrl} target="_blank" rel="noreferrer" className="project-link">View Certificate ↗</a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {education.length > 0 && (
        <section id="education">
          <div className="section-header">
            <div>
              <p className="section-label">My Journey</p>
              <h2 className="section-title">Education & Training</h2>
            </div>
          </div>
          <div className="education-timeline stagger-reveal">
            {education.map((edu: any) => (
              <div key={edu.id} className="education-card reveal-item">
                <div className="education-meta">
                  <span className="institution">{edu.institution || edu.boardUniversity}</span>
                  {edu.startDate || edu.yearOfPassing || ''}
                </div>
                <div className="education-body">
                  <h4>{edu.eduType || edu.degree}</h4>
                  <p>{edu.description}</p>
                  <div className="education-tags">
                    <span>Score: {edu.score} {edu.scoreType}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {certifications.length > 0 && (
        <section id="certificates">
          <div className="section-header">
            <div>
              <p className="section-label">Credentials</p>
              <h2 className="section-title">Certifications</h2>
              <p className="section-headline">Verified accomplishments, internship completions, and specialized credentials.</p>
            </div>
          </div>
          <div className="certificates-grid stagger-reveal">
            {certifications.map((cert: any, idx: number) => {
              const url = cert.certUrl || cert.credentialUrl || cert.certificateUrl || cert.fileUrl || cert.url;
              const img = cert.imageUrl || cert.photoUrl || cert.previewUrl;
              const org = cert.issuer || cert.issuingOrganization || cert.organization || cert.certType || 'Certification';
              const date = cert.issuedDate || cert.issueDate || cert.year || cert.date || '';

              return (
                <div key={cert.id || cert._id || idx} className="certificate-card reveal-item">
                  <div className="certificate-image-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f5f7, #eaeaef)', position: 'relative' }}>
                    {img ? (
                      <img src={img} alt={cert.title || cert.name} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.4rem', opacity: 0.8 }}>📜</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.8px', color: 'var(--highlight-dark)', textTransform: 'uppercase' }}>
                          {cert.certType || 'Verified Credential'}
                        </div>
                      </div>
                    )}
                    {url && (
                      <div className="certificate-overlay">
                        <a href={url} target="_blank" rel="noreferrer" className="btn-cert-view">View PDF Version ↗</a>
                      </div>
                    )}
                  </div>

                  <div className="certificate-info">
                    <div className="cert-meta">
                      <span className="cert-org">{org}</span>
                      {date && <span className="cert-date">{date}</span>}
                    </div>
                    <h3>{cert.title || cert.name}</h3>
                    <p>{cert.description || 'Awarded for successful completion and verification of program requirements.'}</p>
                    {url && (
                      <div className="certificate-links">
                        <a href={url} target="_blank" rel="noreferrer" className="project-link">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          View Full PDF ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {skills.length > 0 && (
        <section id="brands">
          <div className="section-header">
            <div>
              <p className="section-label">Expertise</p>
              <h2 className="section-title">Technologies & Tools</h2>
            </div>
          </div>
          <div className="brands-marquee-wrapper reveal">
            <div className="brands-marquee">
              {[...skills, ...skills, ...skills, ...skills].map((s: any, i: number) => (
                <React.Fragment key={i}>
                  <span className="brand-item">{s.name}</span>
                  <span className="brand-sep">·</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>
      )}

      {projects.length > 0 && (
        <section id="projects">
          <div className="section-header">
            <div>
              <p className="section-label">Featured Work</p>
              <h2 className="section-title">Projects</h2>
              <p className="section-headline">Real projects built utilizing python automation, web dev, and AI/chatbot integrations.</p>
            </div>
          </div>
          <div className="projects-grid stagger-reveal">
            {projects.map((proj: any, idx: number) => {
              const isFeatured = !!proj.isFeatured;
              const github = proj.githubLink || proj.repoUrl || proj.githubUrl;
              const live = proj.liveLink || proj.demoUrl || proj.projectUrl;
              
              let tags: string[] = [];
              if (proj.technologies) {
                tags = typeof proj.technologies === 'string' ? proj.technologies.split(',').map((t: string) => t.trim()) : proj.technologies;
              } else if (proj.techStack) {
                tags = typeof proj.techStack === 'string' ? proj.techStack.split(',').map((t: string) => t.trim()) : proj.techStack;
              } else if (proj.tags) {
                tags = Array.isArray(proj.tags) ? proj.tags : [proj.tags];
              } else {
                tags = ['Python', 'Web Dev'];
              }

              return (
                <div key={proj.id || proj._id || idx} className={`project-card reveal-item ${isFeatured ? 'featured' : ''}`}>
                  <div className="project-info">
                    <h4>{proj.title}</h4>
                    <p>{proj.description || 'Custom software and web development project.'}</p>
                    
                    {tags.length > 0 && (
                      <div className="project-tags">
                        {tags.map((tag: string, tIdx: number) => (
                          <span key={tIdx}>{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="project-links">
                      {live && (
                        <a href={live} target="_blank" rel="noreferrer" className="project-link" style={{ borderColor: 'var(--highlight)', color: 'var(--highlight-dark)', fontWeight: 700, background: 'rgba(153, 102, 255, 0.06)' }}>
                          Live Demo ↗
                        </a>
                      )}
                      {github && (
                        <a href={github} target="_blank" rel="noreferrer" className="project-link">
                          GitHub ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section id="contact">
        <div className="section-header">
          <div>
            <p className="section-label">Get in Touch</p>
            <h2 className="section-title">Contact</h2>
            <p className="section-headline">Have an internship, project collaboration, or just want to connect? I'd love to hear from you.</p>
          </div>
        </div>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <h3>Let's connect and create<br/>something awesome.</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
              Whether you're looking for an AI & ML engineer, a frontend developer, or just want to chat about tech, feel free to reach out.
            </p>
            {profile?.personalEmail && <a href={`mailto:${profile.personalEmail}`} className="contact-email">{profile.personalEmail}</a>}
            <div className="socials-grid stagger-reveal" style={{ marginTop: '2rem' }}>
              {profile?.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="social-link reveal-item">
                  <span className="s-icon">in</span><div><div className="s-name">LinkedIn</div><div className="s-handle">@profile</div></div>
                </a>
              )}
              {profile?.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="social-link reveal-item">
                  <span className="s-icon">⌨</span><div><div className="s-name">GitHub</div><div className="s-handle">@github</div></div>
                </a>
              )}
              {profile?.personalPhone && (
                <a href={`tel:${profile.personalPhone}`} className="social-link reveal-item">
                  <span className="s-icon">📞</span><div><div className="s-name">Phone</div><div className="s-handle">{profile.personalPhone}</div></div>
                </a>
              )}
              <a href="https://maps.google.com/?q=Bapatla,+Andhra+Pradesh,+India" target="_blank" rel="noreferrer" className="social-link reveal-item">
                <span className="s-icon">📍</span><div><div className="s-name">Location</div><div className="s-handle">Bapatla, AP, India</div></div>
              </a>
            </div>
          </div>
          <div className="contact-form-wrapper reveal">
            <div className="contact-form-card">
              <h4>Send me a message</h4>
              <form onSubmit={handleContactSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" placeholder="Your name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" placeholder="you@example.com" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" placeholder="What's this about?" required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea rows={5} placeholder="Tell me more..." required value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
                </div>
                <button type="submit" className="form-submit">{formSent ? 'Sent Successfully!' : 'Send Message →'}</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <p>© {new Date().getFullYear()} {user?.fullName || 'Student'}. Built with ❤️</p>
        <a href="#">Back to top ↑</a>
      </footer>

      {/* Floating Chat */}
      <button className="rolla-fab" onClick={() => { setChatOpen(!chatOpen); setHasOpenedChat(true); setShowNotif(false); }} aria-label="Open AI Assistant">
        <div className="rolla-fab-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'linear-gradient(135deg, #111111, #9966ff)', color: '#fff', fontSize: '24px' }}>
          🤖
        </div>
        {showNotif && <span className="rolla-notification"></span>}
      </button>

      <div className={`rolla-chat-window ${chatOpen ? 'active' : ''}`} aria-hidden={!chatOpen}>
        <div className="rolla-chat-header">
          <div className="rolla-header-info">
            <div className="rolla-avatar-wrapper">
              <span className="rolla-status-dot"></span>
            </div>
            <div>
              <h4>Kotesh AI</h4>
              <p style={{ margin: 0, fontSize: '11px', color: '#99a0b5' }}>Virtual Assistant • Online</p>
            </div>
          </div>
          <button className="rolla-close-btn" onClick={() => setChatOpen(false)}>&times;</button>
        </div>
        
        <div className="rolla-messages">
          {msgs.map((m, i) => (
            <div key={i} className={`rolla-message ${m.sender === 'user' ? 'user-message' : 'bot-message'}`} dangerouslySetInnerHTML={{ __html: md(m.text) }} />
          ))}
          {isTyping && <div className="rolla-message bot-message">...</div>}
          <div ref={msgEnd} />
        </div>
        
        <div className="rolla-suggestions">
          {chips.map((c, i) => <button key={i} className="rolla-chip" onClick={() => sendChat(c)}>{c}</button>)}
        </div>
        
        <form className="rolla-input-area" onSubmit={e => { e.preventDefault(); sendChat(); }}>
          <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask me anything..." required />
          <button type="submit" className="rolla-send-btn">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>

    </>
  );
}
