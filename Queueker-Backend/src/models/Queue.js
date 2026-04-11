const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema({
    _id: { type: String },
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    serviceType: { type: String, required: true, trim: true },
    maxCapacity: { type: Number, default: 100 },
    status: { type: String, enum: ['active', 'inactive', 'paused', 'closed'], default: 'active' },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Queue', queueSchema);
