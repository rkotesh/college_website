import { useState, useEffect, useRef } from 'react';

interface PublicPortfolioProps {
  slug: string;
  API_BASE_URL: string;
}

export default function PublicPortfolio({ slug, API_BASE_URL }: PublicPortfolioProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollPct, setScrollPct] = useState(0);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [msgs, setMsgs] = useState<Array<{ sender: 'assistant' | 'user'; text: string }>>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const msgEnd = useRef<HTMLDivElement>(null);

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
        document.title = `${name} | Public Portfolio`;
        setMsgs([{ sender: 'assistant', text: `Hi there! 👋 I'm ${name.split(' ')[0]}'s AI avatar. I can tell you about my skills, projects, experience, and how to contact me. How can I help?` }]);
        setChips(["Tell me about yourself 👨‍💻", "Show your projects 🚀", "What are your skills? 🧠", "Get contact info 📞"]);
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
    };
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* ---- chat notification ---- */
  useEffect(() => {
    const t = setTimeout(() => { if (!chatOpen && !hasOpenedChat) setShowNotif(true); }, 7000);
    return () => clearTimeout(t);
  }, [chatOpen, hasOpenedChat]);

  /* ---- scroll chat to bottom ---- */
  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, isTyping]);

  /* ---- card 3-D tilt + spotlight ---- */
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(y - .5) * 8}deg) rotateY(${(x - .5) * -8}deg) translateY(-5px)`;
    el.style.transition = 'transform .12s ease';
    el.style.setProperty('--cx', `${e.clientX - r.left}px`);
    el.style.setProperty('--cy', `${e.clientY - r.top}px`);
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)';
    el.style.transition = 'transform .5s ease';
  };

  /* ---- chatbot logic ---- */
  const has = (q: string, terms: string[]) => terms.some(t => q.includes(t));
  const reply = (q: string) => {
    if (!data) return { text: "Still loading…" };
    const lower = q.toLowerCase();
    const { user, profile, projects = [], internships = [] } = data;
    const name = user?.fullName || 'Student';
    if (has(lower, ['hi','hello','hey','greetings','sup'])) return { text: `Hello! Great to meet you. I'm ready to share details about my engineering journey. Try asking about my **skills**, **projects**, or **experience**!`, chips: ['Tell me about yourself 👨‍💻','Show your projects 🚀','Get contact info 📞'] };
    if (has(lower, ['about','bio','yourself','who are you','background'])) return { text: profile?.profileSummary ? `Here's a bit about me:

${profile.profileSummary}` : `I'm **${name}**, a student at CIET currently building my portfolio. Ask me about my projects or skills!`, chips: ['What are your skills? 🧠','Show your projects 🚀','Education details 🎓'], scroll: 'about' };
    if (has(lower, ['skill','tech','language','stack','framework'])) return { text: `My core tech stack:\n\n• **Languages**: Python, JavaScript, HTML/CSS, SQL\n• **Web**: React.js, Django, Flask, Express\n• **Tools**: Git, GitHub, REST APIs, AI Tools`, chips: ['Show your projects 🚀','Work experience 💼','Get contact info 📞'], scroll: 'brands' };
    if (has(lower, ['experience','work','job','internship','intern'])) {
      const list = internships.length ? internships.map((i: any) => `• **${i.role}** at **${i.organization || i.companyName}** (${i.startDate || ''} – ${i.endDate || 'Present'})`).join('\n') : 'No internship experience listed yet.';
      return { text: `My professional experience:\n\n${list}`, chips: ['Show your projects 🚀','Get contact info 📞'], scroll: 'experience' };
    }
    if (has(lower, ['project','built','portfolio'])) {
      const list = projects.slice(0,4).map((p: any, i: number) => `${i+1}. **${p.title}** — ${(p.description||'Custom project').slice(0,70)}…`).join('\n');
      return { text: `I've built **${projects.length}+ projects**. Some highlights:\n\n${list}`, chips: ['Rolla AI details ✨','Hospital Chatbot 🤖','Get contact info 📞'], scroll: 'projects' };
    }
    if (has(lower, ['contact','email','phone','reach','connect','linkedin','github'])) {
      const emailStr = profile?.personalEmail || user?.email ? `• **Email**: ${profile?.personalEmail || user?.email}` : '';
      const phoneStr = profile?.personalPhone ? `• **Phone**: ${profile.personalPhone}` : '';
      const linkedinStr = profile?.linkedinUrl ? `• **LinkedIn**: [Profile](${profile.linkedinUrl})` : '';
      const githubStr = profile?.githubUrl ? `• **GitHub**: [Repos](${profile.githubUrl})` : '';
      const lines = [emailStr, phoneStr, linkedinStr, githubStr].filter(Boolean).join('\n');
      return { text: `You can reach me:\n\n${lines || 'Contact details not added yet.'}`, chips: ['Tell me about yourself 👨‍💻','Show your projects 🚀'], scroll: 'contact' };
    }
    if (has(lower, ['education','college','ciet','academic','cgpa'])) return { text: `I'm pursuing **B.Tech** at CIET, Lam${profile?.cgpa ? `, holding a **CGPA of ${profile.cgpa}**` : ''}.`, chips: ['What are your skills? 🧠','Show your projects 🚀'], scroll: 'education' };
    return { text: `I'm here to share details about **${name}'s** skills, projects, education, and credentials. Try: "What are your projects?" or "How to contact you?"`, chips: ['Show your projects 🚀','What are your skills? 🧠','Get contact info 📞'] };
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
      if ((r as any).chips) setChips((r as any).chips);
      if ((r as any).scroll) document.getElementById((r as any).scroll)?.scrollIntoView({ behavior: 'smooth' });
    }, 900 + Math.random() * 700);
  };

  const md = (t: string) => t
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#e53935;text-decoration:underline">$1</a>')
    .replace(/\n/g, '<br>');

  /* ============ LOADING ============ */
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'hsl(0,0%,92%)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:'40px', height:'40px', borderRadius:'50%', border:'3px solid rgba(229, 57, 53,.15)', borderTopColor:'#e53935', animation:'_spin 1s linear infinite', margin:'0 auto 16px' }} />
        <p style={{ color:'hsl(0,0%,40%)', fontFamily:"'Inter',sans-serif", fontSize:'14px' }}>Loading portfolio…</p>
      </div>
      <style>{`@keyframes _spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ============ ERROR ============ */
  if (error || !data) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'hsl(0,0%,92%)' }}>
      <div style={{ maxWidth:'480px', padding:'48px', textAlign:'center', background:'hsl(0,0%,96.5%)', border:'1px solid hsl(0,0%,86%)', borderRadius:'16px', boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
        <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔒</div>
        <h2 style={{ fontFamily:"'Outfit',sans-serif", fontSize:'22px', fontWeight:800, color:'hsl(0,0%,10%)', marginBottom:'8px' }}>Portfolio Unavailable</h2>
        <p style={{ color:'hsl(0,0%,40%)', fontSize:'14px' }}>{error || 'No data.'}</p>
      </div>
    </div>
  );

  const { user, profile, education=[], certifications=[], projects=[], internships=[], research=[], courses=[], events=[] } = data;
  const cgpa = profile?.cgpa||'8.03';
  const techCount = (data?.skills?.length || 0) + [profile?.leetcodeUrl,profile?.githubUrl,profile?.hackerrankUrl,profile?.codechefUrl,profile?.spokenTutorialUrl,profile?.prepinstaUrl].filter(Boolean).length;

  /* ============ MAIN RENDER ============ */
  return (
    <div className="_pp">
      {/* ───── embedded styles ───── */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ._pp{min-height:100vh;background:hsl(0,0%,92%);color:hsl(0,0%,10%);font-family:'Inter',sans-serif;overflow-x:hidden;line-height:1.65}
        ._pp ::selection{background:#e53935;color:#fff}
        ._pp ::-webkit-scrollbar{width:6px}
        ._pp ::-webkit-scrollbar-track{background:hsl(0,0%,92%)}
        ._pp ::-webkit-scrollbar-thumb{background:rgba(229,57,53,.35);border-radius:99px}

        /* ── scroll bar ── */
        ._sp{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#e53935,#111,#e53935);background-size:200% auto;z-index:1000;transition:width .1s}

        /* ── particles (subtle on light bg) ── */
        ._pp ._pt{position:fixed;width:8px;height:8px;border-radius:50%;opacity:.10;filter:blur(2px);pointer-events:none;animation:_fl 9s ease-in-out infinite}
        ._pp ._p1{top:15%;left:10%;background:rgba(229,57,53,0.55);animation-duration:10s}
        ._pp ._p2{top:40%;right:12%;background:rgba(0,0,0,0.35);animation-duration:7s;animation-delay:1s}
        ._pp ._p3{bottom:30%;left:8%;background:rgba(229,57,53,0.45);animation-duration:8s;animation-delay:2s}
        ._pp ._p4{bottom:15%;right:15%;background:rgba(0,0,0,0.3);animation-duration:11s;animation-delay:.5s}
        ._pp ._p5{top:70%;left:45%;background:rgba(229,57,53,0.4);animation-duration:6s}
        @keyframes _fl{0%,100%{transform:translateY(0) scale(1);opacity:.10}50%{transform:translateY(-20px) scale(1.3);opacity:.20}}

        /* ── nav ── */
        ._nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(242,242,242,.92);backdrop-filter:blur(20px);border-bottom:1px solid hsl(0,0%,86%)}
        ._nw{max-width:1200px;margin:0 auto;padding:13px 24px;display:flex;justify-content:space-between;align-items:center}
        ._nl{font-family:'Outfit',sans-serif;font-weight:800;font-size:17px;color:hsl(0,0%,10%);text-decoration:none;display:flex;align-items:center;gap:8px}
        ._nl img{width:30px;height:30px;border-radius:50%;border:1.5px solid hsl(0,0%,86%);object-fit:cover;transition:transform .4s}
        ._nl:hover img{transform:scale(1.1) rotate(10deg);border-color:#e53935}
        ._nl span{color:hsl(0,0%,42%);font-weight:400}
        ._nlinks{display:flex;gap:22px}
        ._nlinks a{text-decoration:none;color:hsl(0,0%,42%);font-size:13px;font-weight:600;transition:color .2s}
        ._nlinks a:hover{color:hsl(0,0%,10%)}
        ._ncta{background:#e53935!important;color:#fff!important;padding:5px 14px;border-radius:100px;border:1px solid #e53935}
        ._ncta:hover{background:hsl(0,75%,40%)!important}

        /* ── hero ── */
        ._hero{min-height:88vh;display:flex;align-items:center;padding:120px 24px 60px;max-width:1200px;margin:0 auto}
        ._hg{display:grid;grid-template-columns:1.15fr 0.85fr;gap:60px;align-items:center;width:100%}
        ._eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:hsl(0,0%,42%);margin-bottom:16px}
        ._dot{width:8px;height:8px;border-radius:50%;background:#e53935;animation:_pd 2s infinite}
        @keyframes _pd{0%,100%{opacity:1}50%{opacity:.35}}
        ._h1{font-family:'Outfit',sans-serif;font-size:clamp(30px,4.5vw,52px);font-weight:900;line-height:1.08;letter-spacing:-1.5px;margin-bottom:20px;color:hsl(0,0%,10%)}
        ._hl{background:linear-gradient(90deg,#e53935,#111,#e53935);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:_fg 5s linear infinite}
        @keyframes _fg{to{background-position:200% center}}
        ._hdesc{font-size:15px;color:hsl(0,0%,40%);margin-bottom:30px;max-width:560px}
        ._acts{display:flex;gap:14px;margin-bottom:36px;flex-wrap:wrap}
        ._btn{font-size:13px;font-weight:700;padding:10px 24px;border-radius:100px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:transform .2s,box-shadow .2s;border:none}
        ._bp{background:hsl(0,0%,10%);color:hsl(0,0%,96%)}
        ._bp:hover{box-shadow:0 8px 20px rgba(0,0,0,.15)}
        ._bs{background:transparent;color:hsl(0,0%,10%);border:1.5px solid hsl(0,0%,80%)!important}
        ._bs:hover{border-color:#e53935!important;background:rgba(229,57,53,.04)!important}
        ._stats{display:flex;gap:36px}
        ._stat h3{font-family:'Outfit',sans-serif;font-size:30px;font-weight:900;color:hsl(0,0%,10%)}
        ._stat p{font-size:11px;color:hsl(0,0%,42%);text-transform:uppercase;font-weight:700;letter-spacing:.5px;margin-top:2px}

        /* ── photo morph ── */
        ._pw{position:relative;width:320px;height:320px;display:flex;justify-content:center;align-items:center;margin:0 auto}
        ._pw::after{content:'';position:absolute;inset:-14px;border:1.5px dashed #e53935;border-radius:40% 60% 70% 30%/40% 50% 60% 70%;opacity:.25;pointer-events:none;animation:_rot 24s linear infinite}
        @keyframes _rot{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        ._pc{width:100%;height:100%;overflow:hidden;position:relative;z-index:2;border-radius:60% 40% 30% 70%/60% 30% 70% 40%;animation:_mb 10s ease-in-out infinite;background:hsl(0,0%,96.5%);border:1px solid hsl(0,0%,86%)}
        @keyframes _mb{0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%}50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%}}
        ._pc img{width:100%;height:100%;object-fit:cover;filter:grayscale(8%) contrast(105%);transition:transform .6s,filter .4s}
        ._pc:hover img{transform:scale(1.06);filter:grayscale(0%) contrast(107%)}

        /* ── section layout ── */
        ._sec{padding:80px 24px;max-width:1200px;margin:0 auto;position:relative;z-index:1}
        ._sep{border-top:1px solid hsl(0,0%,86%)}
        ._slbl{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#e53935;margin-bottom:6px}
        ._stitle{font-family:'Outfit',sans-serif;font-size:clamp(22px,3vw,34px);font-weight:800;color:hsl(0,0%,10%);letter-spacing:-.5px;margin-bottom:8px}
        ._ssub{font-size:13.5px;color:hsl(0,0%,40%);max-width:580px;margin-bottom:40px}

        /* ── 3D spotlight card ── */
        ._card{background:hsl(0,0%,96.5%);border:1px solid hsl(0,0%,86%);border-radius:12px;position:relative;overflow:hidden;transform-style:preserve-3d;box-shadow:0 4px 16px rgba(0,0,0,.07);transition:border-color .3s,box-shadow .3s}
        ._card::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:0;z-index:1;background:radial-gradient(260px circle at var(--cx,0px) var(--cy,0px),rgba(229,57,53,.08),transparent 75%);transition:opacity .4s}
        ._card:hover{border-color:rgba(229,57,53,.3);box-shadow:0 8px 28px rgba(229,57,53,.10)}
        ._card:hover::before{opacity:1}

        /* ── about ── */
        ._ag{display:grid;grid-template-columns:1.1fr 0.9fr;gap:48px}
        ._at p{font-size:14px;color:hsl(0,0%,38%);margin-bottom:18px}
        ._at strong{color:hsl(0,0%,10%)}
        ._sc{background:hsl(0,0%,94.5%);padding:18px;border-radius:10px;border:1px solid hsl(0,0%,86%);margin-bottom:14px}
        ._sc h5{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#e53935;margin-bottom:10px}
        ._tags{display:flex;flex-wrap:wrap;gap:7px}
        ._tag{font-size:12px;color:hsl(0,0%,38%);padding:4px 11px;border-radius:100px;background:hsl(0,0%,100%);border:1px solid hsl(0,0%,86%);transition:all .2s;cursor:default}
        ._tag:hover{background:#e53935;color:#fff;border-color:#e53935}
        ._ahs{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:48px}
        ._ahc{padding:22px;border-radius:10px;background:hsl(0,0%,96.5%);border:1px solid hsl(0,0%,86%);text-align:center;transition:border-color .3s;box-shadow:0 2px 8px rgba(0,0,0,.04)}
        ._ahc:hover{border-color:#e53935}
        ._ahc .ico{font-size:22px;margin-bottom:8px}
        ._ahc h4{font-family:'Outfit',sans-serif;font-size:14px;font-weight:700;margin-bottom:5px;color:hsl(0,0%,10%)}
        ._ahc p{font-size:12px;color:hsl(0,0%,42%);line-height:1.5}

        /* ── timeline ── */
        ._tl{position:relative;padding-left:32px;display:flex;flex-direction:column;gap:36px}
        ._tl::before{content:'';position:absolute;top:0;bottom:0;left:7px;width:2px;background:hsl(0,0%,86%)}
        ._tc{padding:26px;display:grid;grid-template-columns:200px 1fr;gap:30px;position:relative}
        ._tc::before{content:'';position:absolute;top:38px;left:-32px;width:14px;height:14px;border-radius:50%;background:hsl(0,0%,96.5%);border:3px solid hsl(0,0%,80%);transform:translate(-50%,-50%);transition:all .3s;z-index:10}
        ._tc:hover::before{background:#e53935;border-color:#e53935;box-shadow:0 0 10px rgba(229,57,53,.4)}
        ._tm{font-size:12px;color:hsl(0,0%,42%)}
        ._inst{font-family:'Outfit',sans-serif;font-weight:700;font-size:15px;color:hsl(0,0%,10%);display:block;margin-bottom:3px}
        ._tb h4{font-size:14px;font-weight:700;margin-bottom:8px;color:hsl(0,0%,10%)}
        ._tb p{font-size:13px;color:hsl(0,0%,40%);margin-bottom:10px}
        ._tb ul{padding-left:16px;margin-bottom:12px}
        ._tb li{font-size:12.5px;color:hsl(0,0%,40%);margin-bottom:5px}
        ._ttags{display:flex;gap:6px;flex-wrap:wrap}
        ._ttag{font-size:11px;padding:3px 8px;border-radius:100px;background:hsl(0,0%,100%);border:1px solid hsl(0,0%,86%);color:hsl(0,0%,38%)}

        /* ── certs ── */
        ._cg{display:grid;grid-template-columns:repeat(2,1fr);gap:22px;max-width:900px;margin:0 auto}
        ._cc{display:flex;flex-direction:column}
        ._ciw{width:100%;aspect-ratio:1.414/1;overflow:hidden;background:hsl(0,0%,94%);border-bottom:1px solid hsl(0,0%,86%);position:relative}
        ._ciw img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
        ._cc:hover ._ciw img{transform:scale(1.04)}
        ._cov{position:absolute;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s;z-index:10}
        ._cc:hover ._cov{opacity:1}
        ._ci{padding:22px;flex:1;display:flex;flex-direction:column}
        ._ci h3{font-size:14px;font-weight:700;margin-bottom:6px;color:hsl(0,0%,10%)}
        ._ci p{font-size:12px;color:hsl(0,0%,40%);line-height:1.5;margin-bottom:14px;flex:1}

        /* ── marquee ── */
        ._mw{overflow:hidden;padding:22px 0;border-top:1px solid hsl(0,0%,86%);border-bottom:1px solid hsl(0,0%,86%)}
        ._mk{display:flex;gap:44px;align-items:center;animation:_mq 26s linear infinite;width:max-content}
        ._mw:hover ._mk{animation-play-state:paused}
        @keyframes _mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        ._mi{font-family:'Outfit',sans-serif;font-size:22px;font-weight:700;color:hsl(0,0%,10%);opacity:.18;transition:opacity .3s,color .3s,transform .3s;cursor:default}
        ._mi:hover{opacity:1;color:#e53935;transform:scale(1.08)}
        ._ms{color:hsl(0,0%,80%);font-size:16px}

        /* ── projects ── */
        ._pg{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px}
        ._pcard{display:flex;flex-direction:column;cursor:pointer}
        ._feat{border:2px solid transparent;background:hsl(0,0%,96.5%) padding-box,linear-gradient(135deg,#e53935,hsl(0,0%,80%)) border-box}
        ._pi{padding:26px;flex:1;display:flex;flex-direction:column}
        ._pi h4{font-family:'Outfit',sans-serif;font-size:16px;font-weight:700;margin-bottom:8px;color:hsl(0,0%,10%)}
        ._pi p{font-size:13px;color:hsl(0,0%,40%);line-height:1.6;margin-bottom:18px;flex:1}
        ._pls{display:flex;gap:10px;margin-top:auto;flex-wrap:wrap}

        /* ── otw ── */
        ._otw{background:hsl(0,0%,96.5%);border:1px solid hsl(0,0%,86%);border-radius:20px;padding:56px;position:relative;overflow:hidden;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.06)}
        ._otw::before{content:'';position:absolute;top:-80px;right:-80px;width:300px;height:300px;border-radius:50%;background:#e53935;opacity:.04}
        ._otw h2{font-family:'Outfit',sans-serif;font-size:clamp(22px,4vw,34px);font-weight:800;margin-bottom:14px;color:hsl(0,0%,10%)}
        ._owroles{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:28px}
        ._owrole{font-size:12px;padding:6px 16px;border-radius:100px;border:1px solid hsl(0,0%,86%);background:hsl(0,0%,100%);color:hsl(0,0%,42%)}
        ._owrole.sp{background:#e53935;border-color:#e53935;color:#fff;box-shadow:0 4px 12px rgba(229,57,53,.25)}

        /* ── contact ── */
        ._cog{display:grid;grid-template-columns:1fr 1fr;gap:60px}
        ._coi h3{font-family:'Outfit',sans-serif;font-size:22px;font-weight:700;margin-bottom:10px;color:hsl(0,0%,10%)}
        ._coi p{color:hsl(0,0%,40%);font-size:13.5px;margin-bottom:28px}
        ._cemail{font-size:16px;font-weight:700;color:hsl(0,0%,10%);text-decoration:none;border-bottom:2px solid #e53935;padding-bottom:2px}
        ._csg{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:28px}
        ._csc{display:flex;align-items:center;gap:10px;padding:13px 18px;border-radius:10px;text-decoration:none;color:hsl(0,0%,10%)}
        ._csc .ico{font-size:18px}
        ._csc .sn{font-weight:700;font-size:13px;color:hsl(0,0%,10%)}
        ._csc .sh{font-size:11px;color:hsl(0,0%,42%);margin-top:1px}
        ._fc{padding:28px;border-radius:12px}
        ._fc h4{font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;margin-bottom:18px;color:hsl(0,0%,10%)}
        ._fr{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        ._fg{margin-bottom:14px}
        ._fg label{display:block;font-size:10.5px;font-weight:700;color:hsl(0,0%,30%);margin-bottom:5px;text-transform:uppercase;letter-spacing:.5px}
        ._fg input,._fg textarea{width:100%;padding:9px 13px;border-radius:6px;border:1px solid hsl(0,0%,86%);background:hsl(0,0%,100%);color:hsl(0,0%,10%);outline:none;font-family:'Inter',sans-serif;font-size:13px;transition:border-color .2s}
        ._fg input:focus,._fg textarea:focus{border-color:#e53935}

        /* ── footer ── */
        ._ft{padding:44px 24px;border-top:1px solid hsl(0,0%,86%);max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1}
        ._ft p{font-size:12px;color:hsl(0,0%,42%)}
        ._ft a{color:hsl(0,0%,10%);text-decoration:none;font-weight:600;font-size:12.5px}

        /* ── chatbot ── */
        ._fab{position:fixed;bottom:24px;right:24px;width:54px;height:54px;border-radius:50%;background:hsl(0,0%,10%);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.2);z-index:999;overflow:hidden;transition:transform .2s}
        ._fab:hover{transform:scale(1.08) rotate(5deg);box-shadow:0 14px 32px rgba(229,57,53,.3)}
        ._fab img{width:100%;height:100%;object-fit:cover}
        ._fno{position:absolute;top:2px;right:2px;width:10px;height:10px;border-radius:50%;background:#e53935;border:2px solid hsl(0,0%,92%);animation:_np 2s infinite}
        @keyframes _np{0%{box-shadow:0 0 0 0 rgba(229,57,53,.7)}70%{box-shadow:0 0 0 6px rgba(229,57,53,0)}100%{box-shadow:0 0 0 0 rgba(229,57,53,0)}}
        ._cw{position:fixed;bottom:88px;right:24px;width:350px;height:490px;max-height:calc(100vh - 120px);background:rgba(246,246,246,.97);backdrop-filter:blur(20px);border:1px solid hsl(0,0%,86%);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.12);display:flex;flex-direction:column;z-index:998;overflow:hidden;opacity:0;transform:translateY(20px) scale(.95);pointer-events:none;transition:all .3s cubic-bezier(.16,1,.3,1)}
        ._cw.open{opacity:1;transform:translateY(0) scale(1);pointer-events:all}
        ._ch{padding:14px 18px;background:hsl(0,0%,94.5%);border-bottom:1px solid hsl(0,0%,86%);display:flex;justify-content:space-between;align-items:center}
        ._ct img{width:30px;height:30px;border-radius:50%;object-fit:cover;margin-right:8px}
        ._ct{display:flex;align-items:center}
        ._ct h4{font-size:13px;font-weight:700;color:hsl(0,0%,10%)}
        ._ct p{font-size:10px;color:hsl(142,60%,35%)}
        ._cm{flex:1;padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}
        ._cmsg{max-width:82%}
        ._cmsg.a{align-self:flex-start}
        ._cmsg.u{align-self:flex-end}
        ._cbu{padding:9px 13px;border-radius:14px;font-size:12.5px;line-height:1.5}
        ._cmsg.a ._cbu{background:hsl(0,0%,100%);border:1px solid hsl(0,0%,86%);border-top-left-radius:3px;color:hsl(0,0%,10%)}
        ._cmsg.u ._cbu{background:#e53935;color:#fff;border-top-right-radius:3px}
        ._cchips{display:flex;flex-wrap:wrap;gap:5px;padding:6px 16px 10px}
        ._chip{padding:5px 11px;background:hsl(0,0%,100%);border:1px solid hsl(0,0%,86%);border-radius:100px;font-size:11px;color:hsl(0,0%,38%);cursor:pointer;transition:all .2s}
        ._chip:hover{background:#e53935;color:#fff;border-color:#e53935}
        ._cia{padding:10px 16px;border-top:1px solid hsl(0,0%,86%);display:flex;gap:8px;align-items:center}
        ._cia input{flex:1;padding:7px 14px;border-radius:100px;border:1px solid hsl(0,0%,86%);background:hsl(0,0%,100%);color:hsl(0,0%,10%);outline:none;font-size:12px;transition:border-color .2s}
        ._cia input:focus{border-color:#e53935}
        ._csend{width:30px;height:30px;border-radius:50%;background:#e53935;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
        ._td{display:flex;gap:4px;padding:8px 14px}
        ._td span{width:6px;height:6px;background:hsl(0,0%,60%);border-radius:50%;animation:_bt 1.4s infinite ease-in-out}
        ._td span:nth-child(2){animation-delay:.2s}
        ._td span:nth-child(3){animation-delay:.4s}
        @keyframes _bt{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}

        /* ── modal ── */
        ._mb{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;opacity:0;pointer-events:none;transition:opacity .3s}
        ._mb.open{opacity:1;pointer-events:all}
        ._mc{background:hsl(0,0%,96.5%);border:1px solid hsl(0,0%,86%);border-radius:18px;padding:36px;width:95%;max-width:580px;position:relative;transform:translateY(20px);transition:transform .3s;box-shadow:0 16px 48px rgba(0,0,0,.12)}
        ._mb.open ._mc{transform:translateY(0)}
        ._mcl{position:absolute;top:18px;right:20px;font-size:26px;background:none;border:none;color:hsl(0,0%,52%);cursor:pointer;line-height:1}
        ._mcl:hover{color:hsl(0,0%,10%)}
        ._mtags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 18px}
        ._mtag{font-size:11px;padding:3px 9px;border-radius:100px;background:rgba(229,57,53,.08);color:#e53935;border:1px solid rgba(229,57,53,.2);font-weight:600}
        ._mdesc{font-size:13.5px;color:hsl(0,0%,38%);line-height:1.65;margin-bottom:22px}
        ._mhl h4{font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-bottom:8px;color:hsl(0,0%,10%)}
        ._mhl ul{padding-left:18px;margin-bottom:28px}
        ._mhl li{font-size:13px;color:hsl(0,0%,38%);margin-bottom:5px}
        ._mlinks{display:flex;gap:14px}

        /* ── developer sidebar ── */
        ._dvcard{padding:22px}
        ._dvsec{padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid hsl(0,0%,86%)}
        ._dvlbl{font-size:10px;color:hsl(0,0%,46%);font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
        ._dvval{font-family:'Outfit',sans-serif;font-size:22px;font-weight:800;color:hsl(0,0%,10%)}
        ._pb{height:4px;background:hsl(0,0%,88%);border-radius:3px;margin-top:3px}
        ._pf{height:100%;border-radius:3px}
        ._vbadge{display:flex;align-items:center;gap:6px;padding:7px 11px;background:hsl(0,0%,100%);border-radius:6px;border:1px solid hsl(0,0%,86%);font-size:11px;color:hsl(0,0%,40%);font-weight:600}
        ._vbadge .vc{color:hsl(142,60%,35%);font-size:12px}

        /* ── responsive ── */
        @media(max-width:900px){
          ._hg,._ag,._cog{grid-template-columns:1fr;gap:32px}
          ._hic{order:-1}
          ._tc{grid-template-columns:1fr;gap:10px}
          ._tc::before{left:-20px;top:30px}
          ._pg{grid-template-columns:1fr}
          ._feat{grid-column:span 1}
          ._cg{grid-template-columns:1fr}
          ._csg,._fr{grid-template-columns:1fr}
          ._ahs{grid-template-columns:1fr}
          ._nlinks{display:none}
          ._ft{flex-direction:column;gap:10px;text-align:center}
          ._stats{gap:24px}
          ._pw{width:260px;height:260px}
          ._cw{right:12px;left:12px;bottom:78px;width:auto}
        }
      `}</style>

      {/* scroll progress */}
      <div className="_sp" style={{ width: `${scrollPct}%` }} />

      {/* particles */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {['_p1','_p2','_p3','_p4','_p5'].map(c => <div key={c} className={`_pt ${c}`} />)}
      </div>

      {/* ───── NAV ───── */}
      <nav className="_nav">
        <div className="_nw">
          <a href="#" className="_nl">
            {profile?.photoUrl
              ? <img src={profile.photoUrl} alt={user?.fullName} />
              : <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(229, 57, 53,.12)', border:'1.5px solid #282f3e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#e53935' }}>{user?.fullName?.[0]?.toUpperCase()||'S'}</div>
            }
            {user?.fullName?.split(' ')[0] || 'Student'} <span>Portfolio</span>
          </a>
          <div className="_nlinks">
            <a href="#about">About</a>
            {internships.length > 0 && <a href="#experience">Experience</a>}
            {education.length > 0 && <a href="#education">Education</a>}
            {certifications.length > 0 && <a href="#certificates">Certificates</a>}
            {data?.skills && data.skills.length > 0 && <a href="#brands">Technologies</a>}
            {projects.length > 0 && <a href="#projects">Projects</a>}
            <a href="#contact" className="_ncta">Contact</a>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <div className="_hero">
        <div className="_hg">
          <div>
            <div className="_eyebrow"><span className="_dot" /> Open to Opportunities</div>
            <h1 className="_h1">
              {user?.fullName?.split(' ')[0] || 'Student'}'s Portfolio
            </h1>
            {profile?.profileSummary && (
              <p className="_hdesc">{profile.profileSummary}</p>
            )}
            <div className="_acts">
              <a href="#contact" className="_btn _bp">Get in Touch →</a>
              {profile?.resumeUrl && profile?.showResumeOnProfile &&
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="_btn _bs">Download Resume</a>
              }
            </div>
            <div className="_stats">
              <div className="_stat"><h3>{projects.length}+</h3><p>Projects</p></div>
              <div className="_stat"><h3>{techCount}+</h3><p>Tech Skills</p></div>
              <div className="_stat"><h3>{cgpa}</h3><p>B.Tech CGPA</p></div>
            </div>
          </div>
          <div className="_hic" style={{ display:'flex', justifyContent:'center' }}>
            <div className="_pw">
              <div className="_pc">
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt={user?.fullName} />
                  : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:100, fontWeight:900, color:'rgba(229, 57, 53,.25)', background:'rgba(229, 57, 53,.05)' }}>{user?.fullName?.[0]?.toUpperCase()||'?'}</div>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── ABOUT ───── */}
      <section className="_sec _sep" id="about">
        <div className="_ag" style={!(data?.skills && data.skills.length > 0) ? { gridTemplateColumns: '1fr' } : {}}>
          <div className="_at">
            <div className="_slbl">Who I Am</div>
            <h2 className="_stitle">About Me</h2>
            <div className="_ssub">Academic foundation and specialized skills in engineering and development.</div>
            {profile?.profileSummary ? (
              <p style={{ whiteSpace: 'pre-wrap' }}>{profile.profileSummary}</p>
            ) : (
              <p style={{ color: '#666e82', fontStyle: 'italic' }}>This student hasn't added a bio yet.</p>
            )}
            {/* Platform badges */}
            <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', marginTop:'20px' }}>
              {profile?.linkedinUrl && profile?.showLinkedinOnProfile && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>LinkedIn →</a>}
              {profile?.githubUrl && profile?.showGithubOnProfile && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>GitHub →</a>}
              {profile?.leetcodeUrl && profile?.showLeetcodeOnProfile && <a href={profile.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>LeetCode →</a>}
              {profile?.codechefUrl && profile?.showCodechefOnProfile && <a href={profile.codechefUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>CodeChef →</a>}
              {profile?.hackerrankUrl && profile?.showHackerrankOnProfile && <a href={profile.hackerrankUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>HackerRank →</a>}
              {profile?.spokenTutorialUrl && <a href={profile.spokenTutorialUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>Spoken Tutorial →</a>}
              {profile?.prepinstaUrl && <a href={profile.prepinstaUrl} target="_blank" rel="noopener noreferrer" className="_tag" style={{ textDecoration:'none' }}>PrepInsta →</a>}
            </div>
          </div>
          {data?.skills && data.skills.length > 0 && (
            <div className="_card" onMouseMove={onMove} onMouseLeave={onLeave} style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', alignSelf: 'center', width: '100%', minHeight: 'fit-content' }}>
              <div style={{ fontSize: '11px', color: '#e53935', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '24px' }}>Skills &amp; Technologies</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '28px 24px', flex: 1, alignItems: 'start' }}>
                {(() => {
                  const skills = data.skills;
                  const categories = ['Languages', 'Web Frameworks', 'Tools', 'Others'];
                  const groupedSkills = skills.reduce((acc: any, skill: any) => {
                    const cat = skill.category || 'Others';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(skill.name);
                    return acc;
                  }, {});

                  return categories.filter(cat => groupedSkills[cat] && groupedSkills[cat].length > 0).map(cat => (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#eef0f6', textTransform: 'uppercase', letterSpacing: '0.8px', paddingBottom: '6px', borderBottom: '1px solid #282f3e', marginBottom: '4px' }}>{cat}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {groupedSkills[cat].map((name: string, i: number) => (
                          <span key={i} style={{ fontSize: '13px', color: '#99a0b5', fontWeight: 500 }}>{name}</span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Developer Profiles Section */}
        {(() => {
          const platforms = [
            { key: 'leetcodeUrl', label: 'LeetCode', desc: 'Solved problems & coding skills' },
            { key: 'githubUrl', label: 'GitHub', desc: 'Repositories & open-source contributions' },
            { key: 'hackerrankUrl', label: 'HackerRank', desc: 'Verified badges & certifications' },
            { key: 'linkedinUrl', label: 'LinkedIn', desc: 'Professional network & profile' },
            { key: 'codechefUrl', label: 'CodeChef', desc: 'Competitive programming & ratings' },
            { key: 'spokenTutorialUrl', label: 'Spoken Tutorial', desc: 'IIT Bombay spoken tutorial certifications' },
            { key: 'prepinstaUrl', label: 'PrepInsta', desc: 'Placement preparation & coding resources' },
          ].filter(plat => !!profile?.[plat.key]);

          if (platforms.length === 0) return null;

          return (
            <div style={{ marginTop: 56 }}>
              <h3 style={{ fontFamily: "'Outfit',sans-serif", fontSize: '22px', fontWeight: 800, color: '#eef0f6', marginBottom: '24px' }}>Developer Profiles</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {platforms.map((plat) => {
                  const url = profile[plat.key];
                  return (
                    <div key={plat.key} className="_card" onMouseMove={onMove} onMouseLeave={onLeave} style={{ padding: '22px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '160px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '15px', fontWeight: 700, color: '#eef0f6' }}>{plat.label}</span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '3px 8px',
                          borderRadius: '100px',
                          background: 'rgba(229, 57, 53, 0.16)',
                          color: '#e53935',
                          border: '1px solid rgba(229, 57, 53, 0.35)'
                        }}>
                          CONNECTED
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#99a0b5', margin: '0 0 12px 0', flexGrow: 1, lineHeight: '1.4' }}>{plat.desc}</p>
                      <div style={{ fontSize: '12.5px', color: '#eef0f6', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', fontWeight: 700, color: '#e53935', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', marginTop: 'auto' }}>
                        View Profile →
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </section>

      {/* ───── EXPERIENCE ───── */}
      {internships.length > 0 && (
        <section className="_sec _sep" id="experience">
          <div className="_slbl">Professional Experience</div>
          <h2 className="_stitle">Work Experience</h2>
          <div className="_ssub">Professional roles, internship programs, and coordination work.</div>
          <div className="_tl">
            {internships.map((intern: any) => (
              <div key={intern.id} className="_card _tc" onMouseMove={onMove} onMouseLeave={onLeave}>
                <div className="_tm"><span className="_inst">{intern.organization || intern.companyName}</span>{intern.startDate||''} {intern.endDate ? `– ${intern.endDate}` : '– Present'}<div style={{ fontSize:'10.5px', color:'#666e82', marginTop:3 }}>{intern.internshipType || intern.mode || 'Remote'}</div></div>
                <div className="_tb">
                  <h4>{intern.role}</h4>
                  <p>{intern.description || 'Completed internship program responsibilities successfully.'}</p>
                  <div className="_ttags"><span className="_ttag" style={{ color:'#e53935', fontWeight:700 }}>✓ Verified Role</span></div>
                  {intern.certificateUrl && <div style={{ marginTop:14 }}><a href={intern.certificateUrl} target="_blank" rel="noopener noreferrer" className="_btn _bs" style={{ fontSize:'11px', padding:'5px 12px' }}>View Certificate ↗</a></div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───── EDUCATION ───── */}
      {education.length > 0 && (
        <section className="_sec _sep" id="education">
          <div className="_slbl">My Journey</div>
          <h2 className="_stitle">Education &amp; Training</h2>
          <div className="_ssub">Academic milestones and specialized program completions.</div>
          <div className="_tl">
            {education.map((edu: any) => (
              <div key={edu.id} className="_card _tc" onMouseMove={onMove} onMouseLeave={onLeave}>
                <div className="_tm"><span className="_inst">{edu.institution || edu.boardUniversity}</span>{edu.startDate||edu.yearOfPassing||''}</div>
                <div className="_tb">
                  <h4>{edu.eduType || edu.degree}</h4>
                  <p>{edu.description || 'Completed academic curriculum and requirements.'}</p>
                  <div className="_ttags"><span className="_ttag">Score: {edu.score} {edu.scoreType}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ───── CERTIFICATIONS ───── */}
      {certifications.length > 0 && (() => {
        const certTypes = ['All', ...Array.from(new Set(certifications.map((c: any) => c.certType || 'Other'))) as string[]];
        return (
        <section className="_sec _sep" id="certificates">
          <div className="_slbl">Credentials</div>
          <h2 className="_stitle">Certifications</h2>
          <div className="_ssub">Verified accomplishments and specialized credentials.</div>
          {/* Type Filter Tabs */}
          {certTypes.length > 2 && (
            <div id="cert-type-filter" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {certTypes.map((t: string) => (
                <button
                  key={t}
                  onClick={() => {
                    document.querySelectorAll('[data-cert-type]').forEach((el: any) => {
                      el.style.display = (t === 'All' || el.dataset.certType === t) ? 'flex' : 'none';
                    });
                    document.querySelectorAll('.cert-filter-btn').forEach((btn: any) => {
                      btn.style.background = btn.dataset.filter === t ? '#e53935' : 'rgba(255,255,255,0.04)';
                      btn.style.color = btn.dataset.filter === t ? '#fff' : '#99a0b5';
                    });
                  }}
                  className="cert-filter-btn"
                  data-filter={t}
                  style={{ fontSize: '11.5px', padding: '6px 16px', borderRadius: '100px', border: '1px solid #282f3e', background: t === 'All' ? '#e53935' : 'rgba(255,255,255,0.04)', color: t === 'All' ? '#fff' : '#99a0b5', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 360px))', gap: '16px' }}>
            {certifications.map((cert: any) => {
              const certLink = cert.certUrl;
              return (
                <div
                  key={cert.id}
                  className="_card"
                  data-cert-type={cert.certType || 'Other'}
                  onMouseMove={onMove}
                  onMouseLeave={onLeave}
                  style={{ display: 'flex', flexDirection: 'column', padding: '22px', minHeight: '160px', cursor: certLink ? 'pointer' : 'default' }}
                  onClick={() => certLink && window.open(certLink, '_blank')}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '15px', fontWeight: 800, color: '#eef0f6' }}>{cert.title}</span>
                    <span style={{ fontSize: '11px', color: '#e53935', fontWeight: 700, padding: '3px 8px', background: 'rgba(229, 57, 53, 0.14)', borderRadius: '100px', border: '1px solid rgba(229, 57, 53, 0.28)' }}>
                      🎓 {cert.certType || 'Certificate'}
                    </span>
                  </div>

                  {(cert.issuer || cert.issuedDate) && (
                    <div style={{ fontSize: '11.5px', color: '#99a0b5', marginBottom: '12px', display: 'flex', gap: '6px' }}>
                      {cert.issuer && <span style={{ color: '#eef0f6', fontWeight: 600 }}>{cert.issuer}</span>}
                      {cert.issuer && cert.issuedDate && <span>•</span>}
                      {cert.issuedDate && <span>{cert.issuedDate}</span>}
                    </div>
                  )}

                  <p style={{ fontSize: '12.5px', color: '#99a0b5', marginBottom: '20px', lineHeight: '1.5', flexGrow: 1 }}>
                    {cert.description || 'Certified validation of professional engineering skills.'}
                  </p>

                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #282f3e', paddingTop: '14px' }}>
                    <div style={{ fontSize: '11.5px', color: '#38d682', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><span>✓</span> Verified</div>
                    {certLink && <span style={{ fontSize:'11.5px', color:'#e53935', fontWeight:700 }}>View Certificate ↗</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        );
      })()}

      {/* ───── TECH MARQUEE ───── */}
      {data?.skills && data.skills.length > 0 && (
        <section className="_sec _sep" id="brands" style={{ maxWidth:'none', paddingLeft:0, paddingRight:0, paddingTop:60, paddingBottom:60 }}>
          <div style={{ maxWidth:1200, margin:'0 auto 28px', padding:'0 24px' }}>
            <div className="_slbl">Expertise</div>
            <h2 className="_stitle">Technologies &amp; Tools</h2>
          </div>
          <div className="_mw">
            <div className="_mk">
              {(() => {
                const skillNames = data.skills.map((s: any) => s.name);
                const repeatedList = [...skillNames, ...skillNames, ...skillNames, ...skillNames];
                const items: any[] = [];
                repeatedList.forEach((name, idx) => {
                  items.push(<span key={`s-${idx}`} className={idx % 2 === 1 ? '_ms' : '_mi'}>{name}</span>);
                  items.push(<span key={`dot-${idx}`} className="_ms">·</span>);
                });
                if (items.length > 0) items.pop();
                return items;
              })()}
            </div>
          </div>
        </section>
      )}

      {/* ───── PROJECTS ───── */}
      {projects.length > 0 && (
        <section className="_sec _sep" id="projects">
          <div className="_slbl">Featured Work</div>
          <h2 className="_stitle">Projects</h2>
          <div className="_ssub">Real software solutions and engineering experiments built and deployed.</div>
          <div className="_pg">
            {projects.map((proj: any, idx: number) => {
              const isFeat = proj.isFeatured || idx === 0;
              return (
                <div key={proj.id} className={`_card _pcard ${isFeat ? '_feat' : ''}`} onMouseMove={onMove} onMouseLeave={onLeave} onClick={() => setActiveProject(proj)}>
                  <div className="_pi">
                    {isFeat && <span style={{ color:'#e53935', fontSize:'10.5px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', marginBottom:8, display:'block' }}>★ Featured Project</span>}
                    <h4>{proj.title}</h4>
                    <p>{proj.description || 'No description provided.'}</p>
                    {proj.techStack && (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
                        {proj.techStack.split(',').slice(0,5).map((t: string, i: number) => (
                          <span key={i} style={{ fontSize:'10.5px', padding:'3px 8px', background:'rgba(255,255,255,.03)', border:'1px solid #282f3e', borderRadius:4 }}>{t.trim()}</span>
                        ))}
                      </div>
                    )}
                    <div className="_pls">
                      {proj.repoUrl ? <a href={proj.repoUrl} target="_blank" rel="noopener noreferrer" className="_btn _bs" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={e => e.stopPropagation()}>Source Code ↗</a> : <span style={{ fontSize:'11px', color:'#666e82' }}>Private repo</span>}
                      {proj.projectUrl && <a href={proj.projectUrl} target="_blank" rel="noopener noreferrer" className="_btn _bp" style={{ fontSize:'11px', padding:'5px 12px' }} onClick={e => e.stopPropagation()}>Live Demo</a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ───── COURSES & RESEARCH & EVENTS ───── */}
      {(courses.length > 0 || research.length > 0 || events.length > 0) && (
        <section className="_sec _sep" id="credentials">
          <div className="_slbl">Credentials &amp; Research</div>
          <h2 className="_stitle">Courses &amp; Publications</h2>
          <div className="_ssub">Verified online certifications, academic research works, and campus event contributions.</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,420px))', gap:24, justifyContent:'start' }}>
            {courses.length > 0 && (
              <div className="_card" style={{ padding: 24 }} onMouseMove={onMove} onMouseLeave={onLeave}>
                <div style={{ fontSize:'11px', color:'#e53935', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Courses Completed</div>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {courses.map((c: any, i: number) => (
                    <div 
                      key={i} 
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i < courses.length - 1 ? '1px solid #282f3e' : 'none', cursor: c.certificateUrl ? 'pointer' : 'default' }}
                      onClick={() => c.certificateUrl && window.open(c.certificateUrl, '_blank')}
                    >
                      <div>
                        <div style={{ fontSize:'13.5px', fontWeight:700, color:'#eef0f6' }}>{c.title || c.courseName}</div>
                        <div style={{ fontSize:'11px', color:'#99a0b5', marginTop:2 }}>{c.platform}</div>
                        {c.certificateUrl && (
                          <span style={{ fontSize:'11px', color:'#e53935', fontWeight:700, display:'inline-block', marginTop:6 }}>
                            View Certificate ↗
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize:'12px', color:'#38d682', fontWeight:700 }}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {research.length > 0 && (
              <div className="_card" style={{ padding: 24 }} onMouseMove={onMove} onMouseLeave={onLeave}>
                <div style={{ fontSize:'11px', color:'#e53935', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Research &amp; Publications</div>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {research.map((r: any, i: number) => {
                    const paperLink = r.publicationUrl || r.doi;
                    return (
                      <div 
                        key={i} 
                        style={{ padding:'12px 0', borderBottom: i < research.length - 1 ? '1px solid #282f3e' : 'none', cursor: paperLink ? 'pointer' : 'default' }}
                        onClick={() => paperLink && window.open(paperLink, '_blank')}
                      >
                        <div style={{ fontSize:'13.5px', fontWeight:700, color:'#eef0f6', marginBottom:2 }}>{r.title}</div>
                        <div style={{ fontSize:'11px', color:'#99a0b5' }}>{r.journalConference} · {r.publicationYear}</div>
                        {paperLink && (
                          <span style={{ fontSize:'11px', color:'#e53935', fontWeight:700, display:'inline-block', marginTop:6 }}>
                            View Publication ↗
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {events.length > 0 && (
              <div className="_card" style={{ padding: 24 }} onMouseMove={onMove} onMouseLeave={onLeave}>
                <div style={{ fontSize:'11px', color:'#e53935', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Campus Events</div>
                <div style={{ display:'flex', flexDirection:'column' }}>
                  {events.map((e: any, i: number) => (
                    <div 
                      key={i} 
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i < events.length - 1 ? '1px solid #282f3e' : 'none', cursor: e.certificateUrl ? 'pointer' : 'default' }}
                      onClick={() => e.certificateUrl && window.open(e.certificateUrl, '_blank')}
                    >
                      <div>
                        <div style={{ fontSize:'13.5px', fontWeight:700, color:'#eef0f6' }}>{e.eventName || e.title}</div>
                        <div style={{ fontSize:'11px', color:'#99a0b5', marginTop:2 }}>{e.role} · {e.eventDate}</div>
                        {e.certificateUrl && (
                          <span style={{ fontSize:'11px', color:'#e53935', fontWeight:700, display:'inline-block', marginTop:6 }}>
                            View Certificate ↗
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize:'12px', color:'#38d682', fontWeight:700 }}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}



      {/* ───── CONTACT ───── */}
      <section className="_sec _sep" id="contact">
        <div className="_slbl">Get in Touch</div>
        <h2 className="_stitle">Contact</h2>
        <div className="_ssub">Internship inquiries, project collaborations, or just connect.</div>
        <div className="_cog">
          <div className="_coi">
            <h3>Let's connect and create something awesome.</h3>
            <p>Whether you're looking for an engineer, a developer, or want to chat about tech — feel free to reach out.</p>
            <a href={`mailto:${profile?.personalEmail || user?.email || ''}`} className="_cemail">{profile?.personalEmail || user?.email || ''}</a>
            <div className="_csg">
              {profile?.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="_card _csc" onMouseMove={onMove} onMouseLeave={onLeave}><span className="ico">💼</span><div><div className="sn">LinkedIn</div><div className="sh">Connect Professional</div></div></a>}
              {profile?.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="_card _csc" onMouseMove={onMove} onMouseLeave={onLeave}><span className="ico">⌨</span><div><div className="sn">GitHub</div><div className="sh">View Repos</div></div></a>}
              {profile?.personalPhone && <a href={`tel:${profile.personalPhone}`} className="_card _csc" onMouseMove={onMove} onMouseLeave={onLeave}><span className="ico">📞</span><div><div className="sn">Phone</div><div className="sh">{profile.personalPhone}</div></div></a>}
              <div className="_card _csc" onMouseMove={onMove} onMouseLeave={onLeave}><span className="ico">📍</span><div><div className="sn">Location</div><div className="sh">CIET Lam, AP, India</div></div></div>
            </div>
          </div>
          <div className="_card _fc" onMouseMove={onMove} onMouseLeave={onLeave}>
            <h4>Send me a message</h4>
            {formSent ? (
              <div style={{ textAlign:'center', padding:'36px 0' }}>
                <span style={{ fontSize:44 }}>🚀</span>
                <h4 style={{ color:'#e53935', marginTop:14, fontFamily:"'Outfit',sans-serif" }}>Message Sent!</h4>
                <p style={{ fontSize:'13px', color:'#99a0b5', marginTop:8 }}>Thank you for reaching out. I'll get back to you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit}>
                <div className="_fr">
                  <div className="_fg"><label>Name</label><input type="text" required value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Your name" /></div>
                  <div className="_fg"><label>Email</label><input type="email" required value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} placeholder="you@example.com" /></div>
                </div>
                <div className="_fg"><label>Subject</label><input type="text" value={formData.subject} onChange={e=>setFormData({...formData,subject:e.target.value})} placeholder="Subject header" /></div>
                <div className="_fg"><label>Message</label><textarea rows={4} required value={formData.message} onChange={e=>setFormData({...formData,message:e.target.value})} placeholder="Tell me more…" /></div>
                <button type="submit" className="_btn _bp" style={{ border:'none', width:'100%', justifyContent:'center' }}>Send Message →</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="_ft">
        <p>© {new Date().getFullYear()} {user?.fullName || 'Student'}. CIET Portfolio. Built with ❤️</p>
        <a href="#">Back to top ↑</a>
      </footer>

      {/* ───── PROJECT MODAL ───── */}
      {activeProject && (
        <div className={`_mb ${activeProject ? 'open' : ''}`} onClick={() => setActiveProject(null)}>
          <div className="_mc" onClick={e => e.stopPropagation()}>
            <button className="_mcl" onClick={() => setActiveProject(null)}>&times;</button>
            <h3 style={{ fontFamily:"'Outfit',sans-serif", fontSize:22, fontWeight:800 }}>{activeProject.title}</h3>
            {activeProject.techStack && <div className="_mtags">{activeProject.techStack.split(',').map((t: string, i: number) => <span className="_mtag" key={i}>{t.trim()}</span>)}</div>}
            <p className="_mdesc">{activeProject.description || 'No description provided.'}</p>
            <div className="_mhl">
              <h4>Project Details</h4>
              <ul>
                <li>Fully developed engineering module with integrated version control.</li>
                {activeProject.projectType && <li>Classification: Academic {activeProject.projectType} project.</li>}
                {activeProject.startDate && <li>Duration: {activeProject.startDate} – {activeProject.endDate || 'Present'}</li>}
              </ul>
            </div>
            <div className="_mlinks">
              {activeProject.projectUrl && <a href={activeProject.projectUrl} target="_blank" rel="noopener noreferrer" className="_btn _bp">Live Demo →</a>}
              {activeProject.repoUrl && <a href={activeProject.repoUrl} target="_blank" rel="noopener noreferrer" className="_btn _bs">Source Code</a>}
            </div>
          </div>
        </div>
      )}

      {/* ───── CHATBOT ───── */}
      <button className="_fab" onClick={() => { setChatOpen(o=>!o); setHasOpenedChat(true); setShowNotif(false); }} aria-label="Open AI assistant">
        {profile?.photoUrl ? <img src={profile.photoUrl} alt="avatar" /> : <span style={{ fontSize:22 }}>🤖</span>}
        {showNotif && <span className="_fno" />}
      </button>

      <div className={`_cw ${chatOpen ? 'open' : ''}`}>
        <div className="_ch">
          <div className="_ct">
            {profile?.photoUrl ? <img src={profile.photoUrl} alt="chatbot" /> : <div style={{ width:30, height:30, borderRadius:'50%', background:'#282f3e', display:'flex', alignItems:'center', justifyContent:'center', marginRight:8 }}>👤</div>}
            <div><h4>{user?.fullName?.split(' ')[0] || 'Student'} AI</h4><p>● Online assistant</p></div>
          </div>
          <button style={{ background:'none', border:'none', color:'#eef0f6', fontSize:22, cursor:'pointer', lineHeight:1 }} onClick={() => setChatOpen(false)}>&times;</button>
        </div>
        <div className="_cm">
          {msgs.map((m, i) => (
            <div key={i} className={`_cmsg ${m.sender === 'assistant' ? 'a' : 'u'}`}>
              <div className="_cbu" dangerouslySetInnerHTML={{ __html: md(m.text) }} />
            </div>
          ))}
          {isTyping && <div className="_cmsg a"><div className="_cbu _td"><span /><span /><span /></div></div>}
          <div ref={msgEnd} />
        </div>
        <div className="_cchips">{chips.map((c, i) => <button key={i} className="_chip" onClick={() => sendChat(c)}>{c}</button>)}</div>
        <form className="_cia" onSubmit={e => { e.preventDefault(); sendChat(); }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask me anything…" />
          <button type="submit" className="_csend"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
        </form>
      </div>
    </div>
  );
}



