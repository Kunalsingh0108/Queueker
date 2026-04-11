import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DOMAINS } from '../utils/domains';
import { getAllQueues, getStats } from '../utils/api';
import BgCanvas from '../components/BgCanvas';

const FEATURES = [
    { icon: '🎫', title: 'Instant Tokens', desc: 'Customers get unique numbered tokens the moment they join.' },
    { icon: '📍', title: 'Live Position', desc: 'Real-time queue position and estimated wait time.' },
    { icon: '⏭️', title: 'Call & Skip', desc: 'Admins call the next customer or skip with one click.' },
    { icon: '🔐', title: 'PIN Protected', desc: 'Queue management locked behind a custom admin PIN.' },
    { icon: '⏸️', title: 'Pause & Resume', desc: 'Pause during breaks and resume when ready.' },
    { icon: '📊', title: 'Live Dashboard', desc: 'Waiting, serving, done — at a glance, always fresh.' },
    { icon: '🌐', title: 'Works Offline', desc: 'Powered by local storage — no backend needed.' },
    { icon: '📱', title: 'Mobile Ready', desc: 'Responsive on any screen — phone, tablet, desktop.' },
];

const STEPS = [
    { n: '1', title: 'Admin Creates Queue', desc: 'Pick domain, service type, and get a unique 6-char Queue ID instantly.' },
    { n: '2', title: 'Customer Joins', desc: 'Enter the Queue ID, fill your name, and receive your token number.' },
    { n: '3', title: 'Track in Real-Time', desc: 'Watch your position live with an estimated wait time.' },
    { n: '4', title: 'Admin Calls Next', desc: 'One click to call the next person. The board updates for everyone.' },
];

export default function Home() {
    const navigate = useNavigate();
    const [qid, setQid] = useState('');
    const [activeCount, setActiveCount] = useState(0);
    const [servedCount, setServedCount] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('queueker_token'));

    useEffect(() => {
        const sync = () => setIsLoggedIn(!!localStorage.getItem('queueker_token'));
        window.addEventListener('auth_change', sync);
        return () => window.removeEventListener('auth_change', sync);
    }, []);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const all = await getAllQueues();
                setActiveCount(all.filter(q => q.status === 'active').length);
                let s = 0;
                all.forEach(q => { const st = getStats(q); if (st) s += st.done + st.skipped; });
                setServedCount(s);
            } catch (err) {
                console.error("Failed to load queues:", err);
            }
        };
        fetchStats();
    }, []);

    function handleJoin() {
        const id = qid.trim().toUpperCase();
        if (!id) return;
        navigate(`/customer?queue=${id}`);
    }

    return (
        <div className="page">
            <BgCanvas />

            {/* ---- HERO ---- */}
            <section style={{ minHeight: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5rem 1.5rem 3rem' }}>
                <h1 className="display fade-up" style={{ marginBottom: '1.5rem' }}>
                    Skip the Wait,<br />
                    <span className="gradient-text">Join Digitally</span>
                </h1>

                <p className="body fade-up-2" style={{ maxWidth: 560, margin: '0 auto 2.5rem', fontSize: '1.1rem' }}>
                    Queueker helps banks, colleges, shops, hospitals &amp; government offices manage queues effortlessly. Customers join from any device and track their position in real-time.
                </p>

                <div className="fade-up-3" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem' }}>
                    <a href="/admin" onClick={e => { e.preventDefault(); navigate('/admin'); }} className="btn btn-primary btn-lg">🏢 {isLoggedIn ? 'Go to Dashboard' : 'Create a Queue'}</a>
                    {!isLoggedIn && (
                        <button className="btn btn-outline btn-lg" onClick={() => document.getElementById('join-section').scrollIntoView({ behavior: 'smooth' })}>🎫 Join a Queue</button>
                    )}
                </div>

                {/* Stats */}
                <div className="fade-up-4" style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {[
                        { n: '6', label: 'Domains' },
                        { n: activeCount, label: 'Active Queues' },
                        { n: servedCount, label: 'Customers Served' },
                    ].map((s, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.25rem', fontWeight: 900, fontFamily: "'JetBrains Mono',monospace" }}>{s.n}</div>
                            <div className="micro" style={{ marginTop: '0.25rem' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---- TICKER ---- */}
            <div className="ticker-wrap">
                <div className="ticker-track">
                    {[...Array(2)].flatMap(() =>
                        Object.values(DOMAINS).map((d, i) => (
                            <span key={`${d.name}-${i}`} className="ticker-item">
                                {d.icon} <span className="hl">{d.name}</span> — Now Serving: <span className="num">#—</span>
                            </span>
                        ))
                    )}
                </div>
            </div>

            {/* ---- DOMAINS ---- */}
            <section className="section">
                <div className="container">
                    <div className="section-header">
                        <div className="micro section-eyebrow">Supported Domains</div>
                        <h2 className="heading-1 section-title" style={{ fontSize: '2.5rem', letterSpacing: '-1px' }}>Works Everywhere<br />You Need It</h2>
                        <p className="section-sub">Built for all types of organizations — from government offices to small corner shops.</p>
                    </div>
                    <div className="grid-auto">
                        {Object.entries(DOMAINS).map(([key, d], i) => (
                            <DomainCard key={key} domainKey={key} domain={d} delay={i * 0.07} onClick={() => navigate(`/admin?domain=${key}`)} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- HOW IT WORKS ---- */}
            <section className="section" style={{ paddingTop: 0 }}>
                <div className="container">
                    <div className="section-header">
                        <div className="micro section-eyebrow">How It Works</div>
                        <h2 className="heading-1 section-title" style={{ fontSize: '2.2rem', letterSpacing: '-1px' }}>Simple by <span className="gradient-text">Design</span></h2>
                    </div>
                    <div className="grid-4">
                        {STEPS.map((s, i) => (
                            <div key={i} className={`fade-up-${i + 1}`} style={{ padding: '1.75rem', borderRadius: 'var(--r-lg)', background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                <div style={{ width: 50, height: 50, borderRadius: 14, margin: '0 auto 1.25rem', background: 'linear-gradient(135deg, var(--indigo), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900 }}>{s.n}</div>
                                <div className="heading-3" style={{ marginBottom: '0.4rem' }}>{s.title}</div>
                                <p className="small">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- FEATURES ---- */}
            <section className="section" style={{ paddingTop: 0 }}>
                <div className="container">
                    <div className="section-header">
                        <div className="micro section-eyebrow">Features</div>
                        <h2 className="heading-1 section-title" style={{ fontSize: '2.2rem', letterSpacing: '-1px' }}>Everything You <span className="gradient-text">Need</span></h2>
                    </div>
                    <div className="grid-4">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="card" style={{ padding: '1.4rem' }}>
                                <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                                <div className="heading-3" style={{ marginBottom: '0.4rem' }}>{f.title}</div>
                                <p className="small">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ---- QUICK JOIN — only for guests / customers ---- */}
            {!isLoggedIn && (
                <section className="section-sm" id="join-section" style={{ paddingBottom: '6rem' }}>
                    <div className="container" style={{ maxWidth: 520 }}>
                        <div className="section-header">
                            <div className="micro section-eyebrow">Quick Join</div>
                            <h2 className="heading-1 section-title" style={{ fontSize: '2.2rem', letterSpacing: '-1px' }}>Have a <span className="gradient-text">Queue ID?</span></h2>
                            <p className="section-sub">Enter the Queue ID shared by the staff.</p>
                        </div>
                        <div className="card" style={{ padding: '2rem' }}>
                            <div className="input-wrap" style={{ marginBottom: '1rem' }}>
                                <label className="input-label">Queue ID</label>
                                <input
                                    className="input"
                                    placeholder="e.g. AB12CD"
                                    value={qid}
                                    maxLength={10}
                                    onChange={e => setQid(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                                    style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '1.1rem', textAlign: 'center' }}
                                />
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleJoin}>🎫 Find Queue &amp; Join</button>
                            <p className="small" style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                                Managing a queue? <a onClick={() => navigate('/auth')} style={{ color: 'var(--indigo-light)', cursor: 'pointer' }}>Institution Login →</a>
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {/* ---- FOOTER ---- */}
            <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-300)', fontSize: '0.82rem' }}>
                © 2026 <strong style={{ color: 'var(--text-200)' }}>Queueker</strong> — Smart Queue Management &nbsp;|&nbsp;
                <a onClick={() => navigate('/admin')} style={{ color: 'var(--text-200)', cursor: 'pointer' }}>Admin</a> &nbsp;|&nbsp;
                <a onClick={() => navigate('/customer')} style={{ color: 'var(--text-200)', cursor: 'pointer' }}>Join Queue</a>
            </footer>
        </div>
    );
}

function DomainCard({ domainKey, domain, delay, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="fade-up"
            style={{
                animationDelay: `${delay}s`,
                padding: '1.75rem', borderRadius: 'var(--r-lg)', cursor: 'pointer',
                background: hovered ? `${domain.bg}` : 'var(--bg-card)',
                border: `1px solid ${hovered ? domain.color + '66' : 'var(--border)'}`,
                transform: hovered ? 'translateY(-10px) scale(1.04)' : 'translateY(0) scale(1)',
                boxShadow: hovered
                    ? `0 24px 56px rgba(0,0,0,0.5), 0 0 0 1px ${domain.color}44, 0 0 32px ${domain.color}22`
                    : '0 0 0 0 transparent',
                transition: 'all 0.38s cubic-bezier(0.34,1.56,0.64,1)',
                position: 'relative', overflow: 'hidden',
                willChange: 'transform',
            }}
        >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{domain.icon}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem' }}>{domain.name}</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-200)', lineHeight: 1.5 }}>{domain.description}</div>
            <div style={{ display: 'inline-block', marginTop: '0.9rem', padding: '0.2rem 0.7rem', borderRadius: 'var(--r-full)', fontSize: '0.72rem', fontWeight: 700, background: `${domain.color}18`, color: domain.color }}>
                {domain.services.length} services
            </div>
            {hovered && (
                <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', width: 28, height: 28, borderRadius: 8, background: `${domain.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>↗</div>
            )}
        </div>
    );
}
