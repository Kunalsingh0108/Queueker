import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BgCanvas from '../components/BgCanvas';
import { useToast } from '../components/Toast';
import { DOMAINS } from '../utils/domains';
import {
    socket,
    getAllQueues, getQueue, getStats,
    createQueue, deleteQueue, setQueueStatus,
    serveNext, skipCurrent, verifyPin, timeAgo,
} from '../utils/api';

// Create a quick local generateId for the create form
const generateId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function Admin() {
    const [params] = useSearchParams();
    const toast = useToast();
    const [tab, setTab] = useState('create');
    const [managingId, setManagingId] = useState(null);

    return (
        <div className="page">
            <BgCanvas />
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem 5rem', position: 'relative', zIndex: 2 }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div className="micro" style={{ color: 'var(--indigo-light)', marginBottom: '0.4rem' }}>Admin Panel</div>
                    <h1 className="heading-1">Queue Management Dashboard</h1>
                    <p className="small" style={{ marginTop: '0.35rem' }}>Create and manage queues for your organisation.</p>
                </div>

                {/* Tabs */}
                <div className="tabs" style={{ marginBottom: '2rem' }}>
                    <button className={`tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>➕ Create Queue</button>
                    <button className={`tab ${tab === 'queues' ? 'active' : ''}`} onClick={() => setTab('queues')}>📋 My Queues</button>
                    {managingId && <button className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>⚙️ Manage</button>}
                </div>

                {tab === 'create' && <CreateTab toast={toast} defaultDomain={params.get('domain')} onCreated={() => setTab('queues')} />}
                {tab === 'queues' && <QueuesTab toast={toast} onManage={(id) => { setManagingId(id); setTab('manage'); }} />}
                {tab === 'manage' && managingId && <ManageTab toast={toast} queueId={managingId} />}
            </div>
        </div>
    );
}

/* ---- Create Tab ---- */
function CreateTab({ toast, defaultDomain, onCreated }) {
    // Enforce one-domain-at-a-time: read the active domain from the login session
    const sessionDomain = localStorage.getItem('queueker_domain');
    const lockedDomain = sessionDomain && sessionDomain !== 'general' ? sessionDomain : null;

    const [name, setName] = useState('');
    const [domain, setDomain] = useState(lockedDomain || defaultDomain || '');
    const [service, setService] = useState('');
    const [capacity, setCapacity] = useState(100);
    const [pin, setPin] = useState('1234');
    const [qid, setQid] = useState(generateId);

    const d = DOMAINS[domain];

    async function handleCreate() {
        if (!name.trim()) { toast('Queue name is required', 'error'); return; }
        if (!domain) { toast('Please select a domain', 'error'); return; }

        // Double-check domain lock on submit
        if (lockedDomain && domain !== lockedDomain) {
            toast(`You can only create queues for the ${DOMAINS[lockedDomain]?.name} domain while logged in.`, 'error');
            return;
        }

        try {
            const res = await createQueue({ id: qid, name: name.trim(), domain, service: service || 'General', maxCapacity: capacity, adminPin: pin || '1234' });
            if (res.error) { toast(res.error, 'error'); return; }
            toast(`Queue "${name}" created! ID: ${qid}`, 'success');
            setName(''); setService(''); setQid(generateId());
            onCreated();
        } catch (e) {
            toast('Failed to create queue', 'error');
        }
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left form */}
            <div className="card" style={{ padding: '2rem' }}>
                <h2 className="heading-3" style={{ marginBottom: '1.5rem', color: 'var(--text-200)' }}>Queue Details</h2>

                {/* Domain lock notice */}
                {lockedDomain && d && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem', borderRadius: 'var(--r-md)',
                        background: d.bg, border: `1px solid ${d.color}44`,
                        marginBottom: '1.25rem',
                    }}>
                        <span style={{ fontSize: '1.4rem' }}>{d.icon}</span>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: d.color, letterSpacing: '0.5px' }}>DOMAIN LOCKED</div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-200)' }}>
                                You are logged in as <strong style={{ color: 'var(--text-100)' }}>{d.name}</strong>. Queues can only be created for this domain.
                            </div>
                        </div>
                        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: d.color }}>🔒</span>
                    </div>
                )}

                <div className="input-wrap" style={{ marginBottom: '1rem' }}>
                    <label className="input-label">Queue Name</label>
                    <input className="input" placeholder="e.g. SBI Main Branch, Engineering Registrar" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="input-wrap">
                        <label className="input-label">Domain</label>
                        {lockedDomain && d ? (
                            /* Show locked domain as a read-only display */
                            <div className="input" style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: d.bg, borderColor: `${d.color}44`,
                                cursor: 'not-allowed', color: d.color, fontWeight: 700,
                            }}>
                                {d.icon} {d.name} 🔒
                            </div>
                        ) : (
                            <select className="input" value={domain} onChange={e => { setDomain(e.target.value); setService(''); }}>
                                <option value="">Select domain…</option>
                                {Object.entries(DOMAINS).map(([k, d]) => <option key={k} value={k}>{d.icon} {d.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="input-wrap">
                        <label className="input-label">Service Type</label>
                        <select className="input" value={service} onChange={e => setService(e.target.value)} disabled={!domain}>
                            <option value="">Select service…</option>
                            {(d?.services || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-wrap">
                        <label className="input-label">Max Capacity</label>
                        <input className="input" type="number" value={capacity} min={5} max={500} onChange={e => setCapacity(+e.target.value)} />
                    </div>
                    <div className="input-wrap">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                            <label className="input-label" style={{ marginBottom: 0 }}>Admin PIN</label>
                            <button className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'var(--sky)' }} onClick={() => setPin(Math.floor(1000 + Math.random() * 9000).toString())}>Generate PIN</button>
                        </div>
                        <input className="input" type="text" maxLength={8} placeholder="4-digit PIN" value={pin} onChange={e => setPin(e.target.value)} />
                    </div>
                </div>
                {d && (
                    <div style={{ marginTop: '1.25rem' }}>
                        <div className="input-label" style={{ marginBottom: '0.5rem' }}>Quick Services</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {d.services.map(s => (
                                <button key={s} onClick={() => setService(s)} style={{ padding: '0.25rem 0.7rem', borderRadius: 'var(--r-full)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: service === s ? d.bg : 'rgba(255,255,255,0.04)', color: service === s ? d.color : 'var(--text-200)', border: service === s ? `1px solid ${d.color}55` : '1px solid var(--border)' }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div className="micro" style={{ marginBottom: '1rem' }}>Queue ID</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '5px', color: 'var(--indigo-light)', fontFamily: "'JetBrains Mono',monospace", marginBottom: '0.5rem' }}>{qid}</div>
                    <div className="small" style={{ marginBottom: '1rem' }}>Share this ID with customers to join</div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setQid(generateId())}>🔄 Regenerate ID</button>
                </div>
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div className="micro" style={{ marginBottom: '0.75rem' }}>Summary</div>
                    <div style={{ fontSize: '0.88rem', lineHeight: 1.9, color: 'var(--text-200)' }}>
                        <strong style={{ color: 'var(--text-100)' }}>{name || '—'}</strong><br />
                        🏷️ {d ? `${d.icon} ${d.name}` : '—'}<br />
                        🛎️ {service || '—'}<br />
                        👥 Max: {capacity}<br />
                        🆔 <span style={{ color: 'var(--indigo-light)', fontFamily: 'monospace' }}>{qid}</span>
                    </div>
                    <div className="divider" />
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleCreate}>🚀 Create Queue</button>
                </div>
            </div>
        </div>
    );
}

/* ---- My Queues Tab ---- */
function QueuesTab({ toast, onManage }) {
    const [queues, setQueues] = useState([]);
    const [delTarget, setDelTarget] = useState(null);
    const [pinModal, setPinModal] = useState(null); // {id, mode}
    const [pinVal, setPinVal] = useState('');

    async function loadQueues() {
        const qList = await getAllQueues();
        setQueues(qList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }

    useEffect(() => { loadQueues(); }, []);

    async function handleDelete() {
        await deleteQueue(delTarget);
        loadQueues();
        toast('Queue deleted', 'info');
        setDelTarget(null);
    }

    async function handlePin() {
        const res = await verifyPin(pinModal.id, pinVal);
        if (res.error) { toast('Incorrect PIN', 'error'); return; }
        setPinModal(null); setPinVal('');
        if (pinModal.mode === 'manage') onManage(pinModal.id);
    }

    return (
        <>
            {delTarget && (
                <div className="modal-bg" onClick={() => setDelTarget(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>🗑️ Delete Queue?</h3>
                        <p>This will permanently delete the queue and all its data. This cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="btn btn-danger" onClick={handleDelete}>Delete Forever</button>
                            <button className="btn btn-ghost" onClick={() => setDelTarget(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {pinModal && (
                <div className="modal-bg" onClick={() => setPinModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>🔐 Admin PIN</h3>
                        <p>Enter the admin PIN to manage this queue.</p>
                        <div className="input-wrap" style={{ marginBottom: '1.25rem' }}>
                            <input className="input" type="password" placeholder="••••" maxLength={8} value={pinVal} onChange={e => setPinVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePin()} style={{ fontSize: '1.5rem', letterSpacing: '8px', textAlign: 'center' }} autoFocus />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-primary" onClick={handlePin}>Unlock</button>
                            <button className="btn btn-ghost" onClick={() => setPinModal(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h2 className="heading-2">Your Queues</h2>
            </div>

            {queues.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-300)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                    <p style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No queues yet</p>
                    <p className="small">Create your first queue to get started.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {queues.map(q => {
                        const d = DOMAINS[q.domain] || {};
                        const stats = getStats(q.id);
                        const statusBadge = { active: 'badge-active', paused: 'badge-paused', closed: 'badge-closed' }[q.status] || '';
                        return (
                            <div key={q.id} className="card" style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem' }}>{d.icon || '🏢'} {q.name}</div>
                                        <div className="small">ID: <strong style={{ color: 'var(--indigo-light)', letterSpacing: '1px', fontFamily: 'monospace' }}>{q.id}</strong> · {d.name} · {q.service}</div>
                                    </div>
                                    <span className={`badge ${statusBadge}`}>{q.status}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                    {[
                                        { n: stats?.waiting, label: 'Waiting', c: '#F59E0B' },
                                        { n: stats?.serving, label: 'Serving', c: 'var(--indigo-light)' },
                                        { n: stats?.done, label: 'Done', c: 'var(--success)' },
                                        { n: stats?.skipped, label: 'Skipped', c: 'var(--text-300)' },
                                    ].map((s, i) => (
                                        <div key={i} className="stat-card" style={{ flex: 1, minWidth: 80 }}>
                                            <div className="stat-num" style={{ color: s.c }}>{s.n ?? 0}</div>
                                            <div className="stat-label">{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => setPinModal({ id: q.id, mode: 'manage' })}>⚙️ Manage</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => window.open(`/customer?queue=${q.id}`)}>👁 Customer View</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(q.id); toast(`Copied: ${q.id}`, 'success'); }}>📋 Copy ID</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => setDelTarget(q.id)}>🗑️ Delete</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

/* ---- Manage Tab ---- */
function ManageTab({ toast, queueId }) {
    const navigate = useNavigate();
    const [q, setQ] = useState(null);

    async function fetchQ() {
        const data = await getQueue(queueId);
        setQ(data);
    }

    useEffect(() => {
        fetchQ();
        // Listen to explicit socket updates instead of polling
        socket.on('queue_updated', (id) => {
            if (id === queueId) fetchQ();
        });
        return () => socket.off('queue_updated');
    }, [queueId]);

    if (!q) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-300)' }}>Loading…</div>;

    const d = DOMAINS[q.domain] || {};
    const stats = getStats(q);
    const serving = q.tokens.find(t => t.status === 'serving');
    const active = q.tokens.filter(t => t.status !== 'done' && t.status !== 'serving');

    async function handleServeNext() {
        const res = await serveNext(queueId);
        if (res.error) { toast(res.error, 'info'); return; }
        toast(`Serving #${res.token.token} — ${res.token.name}`, 'success');
        fetchQ();
    }

    async function handleSkip() {
        await skipCurrent(queueId);
        toast('Customer skipped', 'info');
        fetchQ();
    }

    async function handleTogglePause() {
        const next = q.status === 'paused' ? 'active' : 'paused';
        await setQueueStatus(queueId, next);
        toast(`Queue ${next === 'paused' ? 'paused' : 'resumed'}`, 'info');
        fetchQ();
    }

    const statusBadge = { active: 'badge-active', paused: 'badge-paused', closed: 'badge-closed' }[q.status] || '';

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2 className="heading-2">{d.icon || '🏢'} {q.name}</h2>
                    <p className="small">ID: {q.id} · {q.service}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge ${statusBadge}`}>{q.status}</span>
                    <button className="btn btn-ghost btn-sm" onClick={handleTogglePause}>{q.status === 'paused' ? '▶ Resume' : '⏸ Pause'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/customer?queue=${queueId}`)}>👁 Customer View</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Left: Controls */}
                <div>
                    <div className="serve-display" style={{ marginBottom: '1.25rem' }}>
                        <div className="serve-label">Now Serving</div>
                        <div className="serve-num">{serving ? `#${serving.token}` : '—'}</div>
                        <div className="serve-name">{serving ? serving.name : 'No one yet — click Call Next'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleServeNext}>⏭ Call Next</button>
                        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleSkip}>⏩ Skip</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
                        {[
                            { n: stats?.waiting, label: 'Waiting', c: '#F59E0B' },
                            { n: stats?.serving, label: 'Serving', c: 'var(--indigo-light)' },
                            { n: stats?.done, label: 'Done', c: 'var(--success)' },
                            { n: stats?.skipped, label: 'Skipped', c: 'var(--text-300)' },
                        ].map((s, i) => (
                            <div key={i} className="stat-card">
                                <div className="stat-num" style={{ color: s.c }}>{s.n ?? 0}</div>
                                <div className="stat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Queue list */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div className="micro" style={{ marginBottom: '1rem' }}>Queue List</div>
                    {active.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-300)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
                            <p className="small">Queue is empty or all served</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 340, overflowY: 'auto' }}>
                            {active.map(t => {
                                const statusColor = t.status === 'serving' ? 'var(--indigo-light)' : t.status === 'skipped' ? 'var(--danger)' : '#F59E0B';
                                return (
                                    <div key={t.token} className="q-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div className="q-item-num">#{t.token}</div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-300)' }}>{timeAgo(t.joinedAt)}</div>
                                            </div>
                                        </div>
                                        <span className="badge" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33` }}>{t.status}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
