import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BgCanvas from '../components/BgCanvas';
import { useToast } from '../components/Toast';
import { loginUser, registerUser } from '../utils/api';
import { DOMAINS } from '../utils/domains';

export default function Auth() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const domainQuery = params.get('domain');
    const domain = domainQuery && DOMAINS[domainQuery] ? DOMAINS[domainQuery] : null;
    const toast = useToast();
    const [isLogin, setIsLogin] = useState(!domainQuery); // If from domain card, start at Register
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Color theming: use domain color if available, else fall back to indigo
    const accentColor = domain?.color || 'var(--indigo-light)';
    const accentBg = domain?.bg || 'rgba(91,95,239,0.08)';
    const accentGlow = domain?.glow || 'rgba(91,95,239,0.2)';

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            // If switching domains, clear the current session first
            const existingDomain = localStorage.getItem('queueker_domain');
            if (existingDomain && domainQuery && existingDomain !== domainQuery) {
                localStorage.removeItem('queueker_token');
                localStorage.removeItem('queueker_domain');
            }

            let res;
            if (isLogin) {
                res = await loginUser(email, password);
            } else {
                if (!name.trim()) throw new Error('Institution Name is required');
                res = await registerUser(email, password, name);
            }
            if (res.error) throw new Error(res.error);
            localStorage.setItem('queueker_token', res.token);
            localStorage.setItem('queueker_domain', domainQuery || 'general');
            window.dispatchEvent(new Event('auth_change'));
            toast(`Welcome, ${res.user?.institutionName || res.user?.name || 'Admin'}!`, 'success');
            navigate(`/admin${domainQuery ? `?domain=${domainQuery}` : ''}`);
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem'
        }}>
            <BgCanvas />

            <div style={{
                width: '100%',
                maxWidth: 460,
                position: 'relative',
                zIndex: 2,
            }}>
                {/* Domain Banner */}
                {domain && (
                    <div style={{
                        borderRadius: 'var(--r-lg) var(--r-lg) 0 0',
                        padding: '1.5rem 2rem',
                        background: accentBg,
                        border: `1px solid ${accentColor}44`,
                        borderBottom: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                    }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: `${accentColor}18`,
                            border: `1px solid ${accentColor}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.75rem', flexShrink: 0,
                            boxShadow: `0 0 24px ${accentGlow}`,
                        }}>{domain.icon}</div>
                        <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1px', color: accentColor, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Domain Portal</div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-100)' }}>{domain.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-300)', marginTop: '0.1rem' }}>{domain.description}</div>
                        </div>
                    </div>
                )}

                {/* Card */}
                <div className="card" style={{
                    padding: '2.5rem 2rem',
                    borderRadius: domain ? '0 0 var(--r-lg) var(--r-lg)' : 'var(--r-lg)',
                    border: domain ? `1px solid ${accentColor}44` : undefined,
                    boxShadow: domain ? `0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}22, 0 0 48px ${accentGlow}` : undefined,
                    background: 'rgba(16, 21, 45, 0.90)',
                    backdropFilter: 'blur(20px)',
                    lineHeight: 1.5
                }}>
                    {!domain && (
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: 48, height: 48,
                                background: 'linear-gradient(135deg, var(--indigo-light), var(--teal))',
                                borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem',
                                margin: '0 auto 1rem',
                                boxShadow: '0 8px 32px rgba(91, 95, 239, 0.3)'
                            }}>🏢</div>
                            <h2 className="heading-2" style={{ marginBottom: '0.5rem' }}>Institution Portal</h2>
                        </div>
                    )}

                    {domain && (
                        <div style={{ marginBottom: '1.75rem' }}>
                            <h2 className="heading-2" style={{ marginBottom: '0.25rem' }}>
                                {isLogin ? 'Sign In' : 'Register Your Institution'}
                            </h2>
                            <p className="small" style={{ color: 'var(--text-300)' }}>
                                {isLogin
                                    ? `Access your ${domain.name} queue management`
                                    : `Set up ${domain.name} queue management for your organization`}
                            </p>
                        </div>
                    )}

                    {!domain && (
                        <p className="small" style={{ color: 'var(--text-300)', textAlign: 'center', marginTop: '-1rem', marginBottom: '1.5rem' }}>
                            {isLogin ? 'Sign in to manage your queues' : 'Register your organization to get started'}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {!isLogin && (
                            <div className="input-wrap">
                                <label className="input-label">Institution Name</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder={domain ? `e.g. ${domain.name === 'Bank' ? 'State Bank of India, Main Branch' : domain.name === 'Hospital / Clinic' ? 'City General Hospital' : domain.name === 'College / University' ? 'State Engineering College' : 'Your Institution Name'}` : 'e.g. State Bank of India'}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required={!isLogin}
                                    style={{ borderColor: name ? `${accentColor}66` : undefined }}
                                />
                            </div>
                        )}

                        <div className="input-wrap">
                            <label className="input-label">Email Address</label>
                            <input
                                className="input"
                                type="email"
                                placeholder="team@institution.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="input-wrap">
                            <label className="input-label">Password</label>
                            <input
                                className="input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                marginTop: '0.5rem',
                                width: '100%',
                                padding: '0.85rem',
                                background: domain ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)` : undefined,
                                boxShadow: domain ? `0 8px 24px ${accentGlow}` : undefined,
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Please wait...' : (isLogin ? `Sign In to ${domain ? domain.name + ' Portal' : 'Dashboard'}` : 'Create Account')}
                        </button>
                    </form>

                    <div className="divider" style={{ margin: '1.5rem 0' }} />

                    <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-200)' }}>
                        {isLogin ? "Don't have an account? " : "Already registered? "}
                        <button
                            className="btn-ghost"
                            style={{ color: accentColor, fontWeight: 600, padding: 0 }}
                            onClick={() => setIsLogin(!isLogin)}
                            type="button"
                        >
                            {isLogin ? 'Register here' : 'Sign in'}
                        </button>
                    </div>

                    {domain && (
                        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                            <button
                                className="btn-ghost"
                                style={{ color: 'var(--text-300)', fontSize: '0.8rem', padding: 0 }}
                                onClick={() => navigate('/auth')}
                                type="button"
                            >
                                ← Back to General Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
