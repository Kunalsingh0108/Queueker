import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BgCanvas from '../components/BgCanvas';
import { useToast } from '../components/Toast';
import { DOMAINS } from '../utils/domains';
import { socket, getQueue, getStats, joinQueue, getTokenPosition, estimateWait, timeAgo } from '../utils/api';

export default function Customer() {
    const [params, setParams] = useSearchParams();
    const toast = useToast();
    const navigate = useNavigate();

    const [qid, setQid] = useState((params.get('queue') || '').toUpperCase());
    const [queue, setQueue] = useState(null);
    const [myToken, setMyToken] = useState(params.get('token') ? parseInt(params.get('token')) : null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    // Live refresh via Socket.io
    useEffect(() => {
        if (!queue) return;
        const fetchQ = async () => setQueue(await getQueue(queue.id));
        socket.on('queue_updated', (id) => {
            if (id === queue.id) fetchQ();
        });
        return () => socket.off('queue_updated');
    }, [queue?.id]);

    // Auto-load from URL
    useEffect(() => {
        const urlQ = params.get('queue');
        if (urlQ) findQueue(urlQ, false);
    }, []);

    async function findQueue(id = qid, showError = true) {
        const q = await getQueue(id.trim().toUpperCase());
        if (!q) {
            if (showError) toast(`Queue "${id}" not found`, 'error');
            return;
        }
        setQueue(q);
    }

    async function handleJoin() {
        if (!name.trim()) { toast('Please enter your name', 'error'); return; }
        if (!queue) return;

        try {
            const res = await joinQueue(queue.id, { name: name.trim(), phone });
            if (res.error) { toast(res.error, 'error'); return; }
            setMyToken(res.token);
            setQueue(res.queue);
            toast(`✅ Joined! Your token: #${res.token}`, 'success');
            setParams({ queue: queue.id, token: res.token });
        } catch (e) {
            toast('Failed to join queue', 'error');
        }
    }

    function handleLeave() {
        setMyToken(null);
        setParams({ queue: queue.id });
    }

    const stats = queue ? getStats(queue.id) : null;
    const serving = queue?.tokens.find(t => t.status === 'serving');
    const myTok = queue && myToken ? queue.tokens.find(t => t.token === myToken) : null;
    const myPos = queue && myToken ? getTokenPosition(queue.id, myToken) : null;
    const isMyTurn = myTok?.status === 'serving';
    const isDone = myTok?.status === 'done' || myTok?.status === 'skipped';
    const d = queue ? DOMAINS[queue.domain] : null;
    const done = (stats?.done || 0) + (stats?.skipped || 0);
    const total = stats?.total || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div className="page">
            <BgCanvas />
            <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.5rem 5rem', position: 'relative', zIndex: 2 }}>
                <div style={{ marginBottom: '1.75rem' }}>
                    <div className="micro" style={{ color: 'var(--indigo-light)', marginBottom: '0.4rem' }}>Customer View</div>
                    <h1 className="heading-1">Join a Queue</h1>
                    <p className="small" style={{ marginTop: '0.35rem' }}>Enter a Queue ID to get your token and track your position live.</p>
                </div>

                {/* Search */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <input className="input" placeholder="Queue ID (e.g. AB12CD)" value={qid} maxLength={10}
                            onChange={e => setQid(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && findQueue()}
                            style={{ textTransform: 'uppercase', letterSpacing: '2px', flex: 1 }} />
                        <button className="btn btn-primary" onClick={() => findQueue()}>Find</button>
                    </div>
                </div>

                {/* Banners */}
                {queue?.status === 'paused' && (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                        ⏸ Queue paused — please wait, it will resume shortly.
                    </div>
                )}
                {queue?.status === 'closed' && (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                        🚫 This queue is closed. Please come back later.
                    </div>
                )}
                {isMyTurn && (
                    <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--r-md)', background: 'rgba(0,207,170,0.1)', border: '1px solid rgba(0,207,170,0.3)', color: 'var(--teal)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1.25rem', animation: 'pulse 1.5s infinite' }}>
                        🎉 It's YOUR TURN! Please proceed to the counter now.
                    </div>
                )}

                {/* Queue header */}
                {queue && (
                    <div style={{ padding: '1.5rem', borderRadius: 'var(--r-xl)', background: d ? d.bg : 'var(--indigo-bg)', border: `1px solid ${d ? d.color + '33' : 'var(--border-accent)'}`, marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{d?.icon} {queue.name}</div>
                                <div className="small">{d?.name} · {queue.service} · ID: {queue.id}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-300)' }}>
                                <div className="live-dot" /> Live
                            </div>
                        </div>
                    </div>
                )}

                {/* Now Serving Board */}
                {queue && (
                    <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
                        <div className="micro" style={{ marginBottom: '0.5rem' }}>Now Serving</div>
                        <div style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-2px', fontFamily: "'JetBrains Mono',monospace", background: 'linear-gradient(135deg, var(--indigo-light), var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1, marginBottom: '0.4rem' }}>
                            {serving ? `#${serving.token}` : '—'}
                        </div>
                        <div className="small">{serving ? serving.name : 'Waiting to start'}</div>
                        <div className="divider" />
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <div className="small">👥 Waiting: <strong>{stats?.waiting ?? 0}</strong></div>
                            <div className="small">✅ Done: <strong>{stats?.done ?? 0}</strong></div>
                        </div>
                        {/* Progress */}
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <span className="small">Queue Progress</span>
                                <span className="small">{done} / {total} served</span>
                            </div>
                            <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                        </div>
                    </div>
                )}

                {/* My Token Card */}
                {queue && myToken && myTok && (
                    <div className="card" style={{ padding: '2rem', marginBottom: '1.25rem', textAlign: 'center', background: 'linear-gradient(135deg, rgba(91,95,239,0.06), rgba(0,207,170,0.05))', border: '1px solid rgba(91,95,239,0.18)' }}>
                        <div className="micro" style={{ marginBottom: '0.75rem' }}>Your Token</div>
                        <div className="token-giant">#{myTok.token}</div>
                        <div className="small" style={{ marginTop: '0.5rem' }}>{myTok.name}</div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                            <div className="stat-card" style={{ minWidth: 110 }}>
                                <div className="stat-num" style={{ color: 'var(--indigo-light)' }}>
                                    {isDone ? '✅' : isMyTurn ? '🎉' : myPos ?? '—'}
                                </div>
                                <div className="stat-label">Position</div>
                            </div>
                            <div className="stat-card" style={{ minWidth: 110 }}>
                                <div className="stat-num" style={{ color: 'var(--teal)', fontSize: '1.4rem' }}>
                                    {isDone ? 'Done' : isMyTurn ? 'Now!' : myPos ? estimateWait(myPos) : '—'}
                                </div>
                                <div className="stat-label">Est. Wait</div>
                            </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: '1.25rem' }} onClick={handleLeave}>Leave queue view</button>
                    </div>
                )}

                {/* Join Form */}
                {queue && !myToken && queue.status !== 'closed' && (
                    <div className="card" style={{ padding: '1.75rem', marginBottom: '1.25rem' }}>
                        <h3 className="heading-3" style={{ marginBottom: '1.25rem' }}>🎫 Join This Queue</h3>
                        <div className="input-wrap" style={{ marginBottom: '1rem' }}>
                            <label className="input-label">Your Name</label>
                            <input className="input" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleJoin()} autoFocus />
                        </div>
                        <div className="input-wrap" style={{ marginBottom: '1.25rem' }}>
                            <label className="input-label">Phone (optional)</label>
                            <input className="input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleJoin}>🎫 Get My Token</button>
                    </div>
                )}

                {/* No queue selected placeholder */}
                {!queue && (
                    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-300)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎫</div>
                        <p style={{ fontWeight: 700, marginBottom: '0.4rem' }}>Enter a Queue ID above</p>
                        <p className="small">The Queue ID is shared by the staff or displayed at the venue.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
