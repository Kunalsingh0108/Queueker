const KEY = 'queueker_v2';

function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { queues: {} }; }
    catch { return { queues: {} }; }
}
function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

export function generateId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createQueue({ id, name, domain, service, maxCapacity = 100, adminPin = '1234' }) {
    const data = load();
    if (data.queues[id]) return { error: 'Queue ID already exists' };
    data.queues[id] = {
        id, name, domain, service, maxCapacity, adminPin,
        status: 'active',       // active | paused | closed
        currentServing: 0,
        nextToken: 1,
        tokens: [],             // {token, name, phone, joinedAt, status}
        createdAt: Date.now(),
    };
    save(data);
    return { success: true, queue: data.queues[id] };
}

export function getQueue(id) { return load().queues[id] || null; }

export function getAllQueues() { return Object.values(load().queues); }

export function joinQueue(queueId, { name, phone }) {
    const data = load();
    const q = data.queues[queueId];
    if (!q) return { error: 'Queue not found' };
    if (q.status === 'closed') return { error: 'This queue is closed' };
    if (q.status === 'paused') return { error: 'Queue is paused — please wait' };
    const waiting = q.tokens.filter(t => t.status === 'waiting').length;
    if (waiting >= q.maxCapacity) return { error: 'Queue is full' };
    const token = q.nextToken++;
    q.tokens.push({ token, name: name || 'Guest', phone: phone || '', joinedAt: Date.now(), status: 'waiting' });
    save(data);
    return { success: true, token, position: waiting + 1, queue: q };
}

export function serveNext(queueId) {
    const data = load();
    const q = data.queues[queueId];
    if (!q) return { error: 'Queue not found' };
    const curr = q.tokens.find(t => t.status === 'serving');
    if (curr) curr.status = 'done';
    const next = q.tokens.find(t => t.status === 'waiting');
    if (!next) return { error: 'No more customers waiting' };
    next.status = 'serving';
    q.currentServing = next.token;
    save(data);
    return { success: true, token: next, queue: q };
}

export function skipCurrent(queueId) {
    const data = load();
    const q = data.queues[queueId];
    if (!q) return { error: 'Queue not found' };
    const curr = q.tokens.find(t => t.status === 'serving');
    if (curr) curr.status = 'skipped';
    const next = q.tokens.find(t => t.status === 'waiting');
    if (next) { next.status = 'serving'; q.currentServing = next.token; }
    save(data);
    return { success: true };
}

export function setQueueStatus(queueId, status) {
    const data = load();
    if (!data.queues[queueId]) return { error: 'Not found' };
    data.queues[queueId].status = status;
    save(data);
    return { success: true };
}

export function deleteQueue(queueId) {
    const data = load();
    delete data.queues[queueId];
    save(data);
}

export function getStats(queueId) {
    const q = getQueue(queueId);
    if (!q) return null;
    return {
        waiting: q.tokens.filter(t => t.status === 'waiting').length,
        serving: q.tokens.filter(t => t.status === 'serving').length,
        done: q.tokens.filter(t => t.status === 'done').length,
        skipped: q.tokens.filter(t => t.status === 'skipped').length,
        total: q.tokens.length,
    };
}

export function getTokenPosition(queueId, token) {
    const q = getQueue(queueId);
    if (!q) return null;
    const waiting = q.tokens.filter(t => t.status === 'waiting');
    const idx = waiting.findIndex(t => t.token === token);
    return idx >= 0 ? idx + 1 : null;
}

export function verifyPin(queueId, pin) {
    const q = getQueue(queueId);
    return q && q.adminPin === pin;
}

export function timeAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
}

export function estimateWait(pos, avg = 5) {
    if (pos <= 0) return 'Your turn!';
    return `~${pos * avg} min`;
}
