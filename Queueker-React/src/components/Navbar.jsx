import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DOMAINS } from '../utils/domains';

export default function Navbar() {
    const navigate = useNavigate();
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('queueker_token'));
    const [activeDomain, setActiveDomain] = useState(localStorage.getItem('queueker_domain'));

    // Listen to local storage changes to update navbar (mostly for logout/login)
    useEffect(() => {
        const checkAuth = () => {
            setIsLoggedIn(!!localStorage.getItem('queueker_token'));
            setActiveDomain(localStorage.getItem('queueker_domain'));
        };
        window.addEventListener('storage', checkAuth);
        window.addEventListener('auth_change', checkAuth);
        return () => {
            window.removeEventListener('storage', checkAuth);
            window.removeEventListener('auth_change', checkAuth);
        };
    }, []);

    function handleLogout() {
        localStorage.removeItem('queueker_token');
        localStorage.removeItem('queueker_domain');
        setIsLoggedIn(false);
        setActiveDomain(null);
        navigate('/');
    }

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.9rem 2rem',
            background: 'rgba(4,6,15,0.85)',
            backdropFilter: 'blur(24px)',
            borderBottom: '1px solid var(--border)',
        }}>
            {/* Brand */}
            <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', textDecoration: 'none' }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0,
                }}>🎫</div>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--text-100)' }}>
                    Queue<span style={{ color: 'var(--indigo-light)' }}>ker</span>
                </span>
            </NavLink>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                {[
                    { to: '/', label: 'Home', end: true },
                    ...(isLoggedIn
                        ? [{ to: '/admin', label: 'Admin Dashboard' }]
                        : [
                            { to: '/customer', label: 'Join a Queue' },
                        ]
                    ),
                ].map(({ to, label, end }) => (
                    <NavLink
                        key={to} to={to} end={end}
                        style={({ isActive }) => ({
                            padding: '0.45rem 1rem', borderRadius: 'var(--r-sm)',
                            fontSize: '0.88rem', fontWeight: 600,
                            color: isActive ? 'var(--text-100)' : 'var(--text-200)',
                            background: isActive ? 'var(--indigo-bg)' : 'transparent',
                            border: isActive ? '1px solid rgba(91,95,239,0.2)' : '1px solid transparent',
                            transition: 'all 0.2s',
                        })}
                    >{label}</NavLink>
                ))}
            </div>

            {/* CTA */}
            {isLoggedIn ? (
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {activeDomain && activeDomain !== 'general' && DOMAINS[activeDomain] && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.3rem 0.75rem', borderRadius: 'var(--r-full)',
                            background: `${DOMAINS[activeDomain].bg}`,
                            border: `1px solid ${DOMAINS[activeDomain].color}44`,
                            fontSize: '0.78rem', fontWeight: 700,
                            color: DOMAINS[activeDomain].color,
                        }}>
                            {DOMAINS[activeDomain].icon} {DOMAINS[activeDomain].name}
                        </div>
                    )}
                    <NavLink to="/admin" className="btn btn-primary btn-sm">
                        ⚙️ Dashboard
                    </NavLink>
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-300)' }}>
                        Log out
                    </button>
                </div>
            ) : (
                <NavLink to="/auth" className="btn btn-primary btn-sm">
                    🔐 Institution Login
                </NavLink>
            )}
        </nav>
    );
}
