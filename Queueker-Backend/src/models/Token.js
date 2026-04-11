const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    queueId: { type: String, ref: 'Queue', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    phone: { type: String },
    tokenNumber: { type: Number, required: true },
    status: {
        type: String,
        enum: ['waiting', 'serving', 'done', 'skipped'],
        default: 'waiting'
    },
    createdAt: { type: Date, default: Date.now }
});

// Proper indexing as requested
tokenSchema.index({ queueId: 1, status: 1 });
tokenSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Token', tokenSchema);
