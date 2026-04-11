const Token = require('../models/Token');
const Queue = require('../models/Queue');
const mongoose = require('mongoose');

// Helper to fully enrich queue for broadcasting
const getEnrichedQueue = async (queueId) => {
    const q = await Queue.findById(queueId);
    if (!q) return null;
    const tokens = await Token.find({ queueId }).sort('createdAt');
    const qObj = q.toObject();
    qObj.id = qObj._id.toString();
    qObj.tokens = tokens.map(t => {
        const to = t.toObject();
        to.id = to._id.toString();
        return to;
    });
    return qObj;
};

// @desc    Generate a new token for a queue
// @route   POST /api/tokens
// @access  Public
exports.generateToken = async (req, res, next) => {
    try {
        const { queueId, name, phone } = req.body;

        const queue = await Queue.findById(queueId);
        if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
        if (queue.status !== 'active') return res.status(400).json({ success: false, message: 'Queue is currently inactive' });

        const lastToken = await Token.findOne({ queueId }).sort('-tokenNumber');
        const nextNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

        const token = await Token.create({
            queueId,
            userId: req.user ? req.user.id : null,
            name: name || 'Guest',
            phone: phone || '',
            tokenNumber: nextNumber,
            status: 'waiting'
        });

        const enrichedQ = await getEnrichedQueue(queueId);

        if (req.io) {
            // Also Frontend listens to `queue_updated` natively for id!
            req.io.emit('queue_updated', queueId);
            // Keeping older events for posterity
            req.io.emit('NEW_TOKEN', token);
            req.io.emit('QUEUE_UPDATED', enrichedQ);
        }

        res.status(201).json({ success: true, token: token.tokenNumber, queue: enrichedQ });
    } catch (err) {
        next(err);
    }
};

// @desc    Call next token (FIFO)
// @route   POST /api/tokens/:queueId/next
// @access  Private/Admin
exports.callNextToken = async (req, res, next) => {
    try {
        const queueId = req.params.queueId;
        const queue = await Queue.findById(queueId);

        if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
        if (queue.adminId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // 1. Mark currently "serving" token as "done" (default behavior)
        await Token.updateMany(
            { queueId, status: 'serving' },
            { $set: { status: 'done' } }
        );

        // 2. Find oldest "waiting" token and mark as "serving"
        const nextToken = await Token.findOneAndUpdate(
            { queueId, status: 'waiting' },
            { $set: { status: 'serving' } },
            { sort: { createdAt: 1 }, new: true }
        );

        if (!nextToken) {
            return res.status(404).json({ success: false, message: 'No more customers waiting', error: 'No more customers waiting' });
        }

        const enrichedQ = await getEnrichedQueue(queueId);

        if (req.io) {
            req.io.emit('queue_updated', queueId);
        }

        res.status(200).json({ success: true, token: nextToken, queue: enrichedQ });
    } catch (err) {
        next(err);
    }
};

// @desc    Skip current token and automatically call next
// @route   POST /api/tokens/:queueId/skip-current
// @access  Private/Admin
exports.skipCurrentToken = async (req, res, next) => {
    try {
        const queueId = req.params.queueId;
        const queue = await Queue.findById(queueId);

        if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
        if (queue.adminId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // 1. Mark currently "serving" token as "skipped"
        await Token.updateMany(
            { queueId, status: 'serving' },
            { $set: { status: 'skipped' } }
        );

        // 2. Find next waiting and make it serving
        const nextToken = await Token.findOneAndUpdate(
            { queueId, status: 'waiting' },
            { $set: { status: 'serving' } },
            { sort: { createdAt: 1 }, new: true }
        );

        const enrichedQ = await getEnrichedQueue(queueId);

        if (req.io) {
            req.io.emit('queue_updated', queueId);
        }

        res.status(200).json({ success: true, token: nextToken, queue: enrichedQ });
    } catch (err) {
        next(err);
    }
};

// @desc    Get tokens by queue
// @route   GET /api/tokens/queue/:queueId
// @access  Public
exports.getTokens = async (req, res, next) => {
    try {
        const tokens = await Token.find({ queueId: req.params.queueId }).sort('createdAt');
        res.status(200).json({ success: true, count: tokens.length, data: tokens });
    } catch (err) {
        next(err);
    }
};
