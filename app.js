/**
 * QUEUEKER - Core Application Logic
 * Shared state, domain config, queue management, notifications
 */

/* ============================
   Domain Configuration
============================= */
const DOMAINS = {
  bank: {
    name: 'Bank',
    icon: '🏦',
    color: '#4f8ef7',
    description: 'Banking services, account queries, loans',
    services: ['Account Opening', 'Loan Inquiry', 'Fixed Deposit', 'Card Services', 'General Inquiry']
  },
  college: {
    name: 'College / University',
    icon: '🎓',
    color: '#a78bfa',
    description: 'Admissions, fees, certificates, registrar',
    services: ['Admissions', 'Fee Payment', 'Certificate Request', 'Registrar', 'Scholarship']
  },
  hospital: {
    name: 'Hospital / Clinic',
    icon: '🏥',
    color: '#f472b6',
    description: 'Doctor consultation, lab tests, pharmacy',
    services: ['General Consultation', 'Lab Tests', 'Pharmacy', 'OPD', 'Specialist Consultation']
  },
  shop: {
    name: 'Retail Shop',
    icon: '🛍️',
    color: '#34d399',
    description: 'Billing, customer service, returns',
    services: ['Billing Counter', 'Customer Service', 'Returns & Exchange', 'Trial Room', 'Gift Wrapping']
  },
  stationary: {
    name: 'Stationary Store',
    icon: '✏️',
    color: '#fb923c',
    description: 'Books, supplies, printing, photocopying',
    services: ['Printing', 'Binding', 'Book Counter', 'Photocopying', 'Office Supplies']
  },
  govt: {
    name: 'Government Office',
    icon: '🏛️',
    color: '#facc15',
    description: 'Passports, ration card, certificates, licenses',
    services: ['Passport', 'Ration Card', 'Birth Certificate', 'Driving License', 'Property Records']
  }
};

/* ============================
   State Management (localStorage)
============================= */
const QueueState = {
  _key: 'queueker_data',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this._key)) || { queues: {}, counters: {} };
    } catch { return { queues: {}, counters: {} }; }
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  // Create a new queue
  createQueue({ id, name, domain, service, maxCapacity, adminPin }) {
    const data = this._load();
    if (data.queues[id]) return { error: 'Queue ID already exists' };
    data.queues[id] = {
      id, name, domain, service,
      maxCapacity: maxCapacity || 100,
      adminPin: adminPin || '1234',
      status: 'active',      // active | paused | closed
      currentServing: 0,
      nextToken: 1,
      tokens: [],            // { token, name, phone, joinedAt, status }
      createdAt: Date.now()
    };
    this._save(data);
    return { success: true, queue: data.queues[id] };
  },

  getQueue(id) {
    const data = this._load();
    return data.queues[id] || null;
  },

  getAllQueues() {
    const data = this._load();
    return Object.values(data.queues);
  },

  // Join a queue
  joinQueue(queueId, { name, phone }) {
    const data = this._load();
    const q = data.queues[queueId];
    if (!q) return { error: 'Queue not found' };
    if (q.status === 'closed') return { error: 'This queue is closed' };
    if (q.status === 'paused') return { error: 'Queue is temporarily paused' };

    const waitingCount = q.tokens.filter(t => t.status === 'waiting').length;
    if (waitingCount >= q.maxCapacity) return { error: 'Queue is full. Please try later.' };

    const token = q.nextToken++;
    q.tokens.push({
      token, name: name || 'Guest',
      phone: phone || '',
      joinedAt: Date.now(),
      status: 'waiting'     // waiting | serving | done | skipped
    });
    this._save(data);
    return { success: true, token, position: waitingCount + 1, queue: q };
  },

  // Serve next customer
  serveNext(queueId) {
    const data = this._load();
    const q = data.queues[queueId];
    if (!q) return { error: 'Queue not found' };

    // Mark current serving as done
    const curr = q.tokens.find(t => t.status === 'serving');
    if (curr) curr.status = 'done';

    const next = q.tokens.find(t => t.status === 'waiting');
    if (!next) return { error: 'No more customers in queue' };

    next.status = 'serving';
    q.currentServing = next.token;
    this._save(data);
    return { success: true, token: next, queue: q };
  },

  // Skip current
  skipCurrent(queueId) {
    const data = this._load();
    const q = data.queues[queueId];
    if (!q) return { error: 'Queue not found' };
    const curr = q.tokens.find(t => t.status === 'serving');
    if (curr) curr.status = 'skipped';
    const next = q.tokens.find(t => t.status === 'waiting');
    if (next) { next.status = 'serving'; q.currentServing = next.token; }
    this._save(data);
    return { success: true, queue: q };
  },

  // Update status
  setQueueStatus(queueId, status) {
    const data = this._load();
    if (!data.queues[queueId]) return { error: 'Not found' };
    data.queues[queueId].status = status;
    this._save(data);
    return { success: true };
  },

  // Delete queue
  deleteQueue(queueId) {
    const data = this._load();
    delete data.queues[queueId];
    this._save(data);
  },

  // Get position of token
  getTokenPosition(queueId, token) {
    const q = this.getQueue(queueId);
    if (!q) return null;
    const waiting = q.tokens.filter(t => t.status === 'waiting');
    const idx = waiting.findIndex(t => t.token === token);
    return idx >= 0 ? idx + 1 : null;
  },

  getStats(queueId) {
    const q = this.getQueue(queueId);
    if (!q) return null;
    return {
      waiting: q.tokens.filter(t => t.status === 'waiting').length,
      serving: q.tokens.filter(t => t.status === 'serving').length,
      done: q.tokens.filter(t => t.status === 'done').length,
      skipped: q.tokens.filter(t => t.status === 'skipped').length,
      total: q.tokens.length
    };
  }
};

/* ============================
   UI Utilities
============================= */

// Toast notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Apply domain accent color
function applyDomainTheme(domain) {
  const cfg = DOMAINS[domain];
  if (!cfg) return;
  document.documentElement.style.setProperty('--accent', cfg.color);
  const glow = hexToRgba(cfg.color, 0.25);
  const dark = hexToRgba(cfg.color, 0.12);
  document.documentElement.style.setProperty('--accent-glow', glow);
  document.documentElement.style.setProperty('--accent-dark', dark);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Generate random 6-char queue ID
function generateQueueId() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

// Format relative time
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

// Estimated wait time (avg 5 min per person)
function estimateWait(position, avgMinutes = 5) {
  if (position <= 0) return 'Your turn!';
  return `~${position * avgMinutes} min`;
}

// Verify admin PIN
function verifyPin(queueId, pin) {
  const q = QueueState.getQueue(queueId);
  return q && q.adminPin === pin;
}

// Get URL params
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Animate number counting up
function animateCount(el, target, duration = 800) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.round(start);
    if (start >= target) clearInterval(timer);
  }, 16);
}
