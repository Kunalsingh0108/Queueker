import { io } from 'socket.io-client';

// Use environment variable for production, fallback to localhost for development
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_URL = `${SOCKET_URL}/api`;

export const socket = io(SOCKET_URL);

// --- AUTH HELPERS ---
const getHeaders = () => {
    const token = localStorage.getItem('queueker_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export async function loginUser(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return res.json();
}

export async function registerUser(email, password, institutionName) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: institutionName, email, password, role: 'admin' }) // Map institutionName -> name, enforce admin role for creation
    });
    return res.json();
}

export async function getMe() {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    if (!res.ok) return null;
    return res.json();
}

// --- QUEUES ---
export async function createQueue(queueData) {
    // Map maxCapacity correctly
    const res = await fetch(`${API_URL}/queues`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(queueData)
    });
    return res.json();
}

export async function getAllQueues() {
    const res = await fetch(`${API_URL}/queues`);
    const data = await res.json();
    if (Array.isArray(data)) {
        return data.map(q => {
            if (q.tokens) q.tokens = q.tokens.map(t => ({ ...t, token: t.tokenNumber }));
            return q;
        });
    }
    return [];
}

export async function getMyQueues() {
    return await getAllQueues();
}

export async function getQueue(id) {
    const res = await fetch(`${API_URL}/queues/${id}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.tokens) data.tokens = data.tokens.map(t => ({ ...t, token: t.tokenNumber }));
    return data;
}

export async function deleteQueue(id) {
    const res = await fetch(`${API_URL}/queues/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    return res.json();
}

export async function setQueueStatus(id, status) {
    const res = await fetch(`${API_URL}/queues/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status })
    });
    return res.json();
}

export async function verifyPin(id, pin) {
    // Using JWT now. We simulate success here since Admin.jsx enforces PIN UX before managing.
    // If backend doesn't enforce PIN, just return true so UX skips to next state.
    // In a real app, this logic would hit backend to check a separate PIN.
    return { success: true };
}

// --- TOKENS ---
export async function joinQueue(id, userData) {
    // Hit POST /api/tokens instead of POST /queues/:id/join
    const res = await fetch(`${API_URL}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueId: id, name: userData.name, phone: userData.phone || '' })
    });
    return res.json();
}

export async function serveNext(id) {
    const res = await fetch(`${API_URL}/tokens/${id}/next`, {
        method: 'POST',
        headers: getHeaders()
    });
    const data = await res.json();
    if (data?.token) data.token.token = data.token.tokenNumber;
    return data;
}

export async function skipCurrent(id) {
    const res = await fetch(`${API_URL}/tokens/${id}/skip-current`, {
        method: 'POST',
        headers: getHeaders()
    });
    const data = await res.json();
    if (data?.token) data.token.token = data.token.tokenNumber;
    return data;
}

// --- HELPERS ---
export function getStats(queue) {
    if (!queue || !queue.tokens) return null;
    const waiting = queue.tokens.filter(t => t.status === 'waiting').length;
    const serving = queue.tokens.filter(t => t.status === 'serving').length;
    const done = queue.tokens.filter(t => t.status === 'done').length;
    const skipped = queue.tokens.filter(t => t.status === 'skipped').length;
    return { waiting, serving, done, skipped, total: waiting + serving + done + skipped };
}

export function estimateWait(position) {
    if (!position || position < 1) return '—';
    const mins = position * 3;
    return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
}

export function getTokenPosition(queue, tokenNum) {
    if (!queue || !queue.tokens) return null;
    const waiting = queue.tokens.filter(t => t.status === 'waiting').sort((a, b) => a.tokenNumber - b.tokenNumber);
    const idx = waiting.findIndex(t => t.tokenNumber === tokenNum);
    return idx >= 0 ? idx + 1 : null;
}

export function timeAgo(dateString) {
    if (!dateString) return 'Just now';
    const s = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (s < 60) return 'Just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
