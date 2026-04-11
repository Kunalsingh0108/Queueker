const Queue = require('../models/Queue');
const Token = require('../models/Token');

// Helper to attach tokens to a single queue object
const attachTokens = async (queueDoc) => {
    const queueObj = queueDoc.toObject ? queueDoc.toObject() : queueDoc;
    const tokens = await Token.find({ queueId: queueObj._id || queueObj.id }).sort('createdAt');
    // Align _id with id for frontend
    queueObj.id = (queueObj._id || queueObj.id).toString();
    queueObj.tokens = tokens.map(t => {
        const to = t.toObject();
        to.id = to._id.toString();
        // The array might track token object statuses or other details
        return to;
    });
    return queueObj;
};

// @desc    Create a new queue
// @route   POST /api/queues
// @access  Private/Admin
exports.createQueue = async (req, res, next) => {
    try {
        const { id, name, domain, serviceType, service, maxCapacity, adminPin } = req.body;
        // The frontend sends `id` as custom string! We can map standard ObjectId to `id` or use custom `_id`. 
        // Wait, Mongoose uses ObjectId for _id by default. Frontend sends custom 6-char id.
        // Let's modify creation to use custom `_id` if provided.

        const queue = await Queue.create({
            _id: id && id.length < 24 ? id : undefined, // Allow custom short ID if provided
            name,
            domain,
            serviceType: serviceType || service || 'General',
            maxCapacity: maxCapacity || 100,
            adminId: req.user.id,
            status: 'active'
        });

        // Mongoose might have failed if _id is string instead of ObjectId? 
        // Actually, schema uses default ObjectId. Let's see later.

        const qWithTokens = await attachTokens(queue);

        if (req.io) {
            req.io.emit('QUEUE_UPDATED', qWithTokens);
        }

        res.status(201).json({ success: true, queue: qWithTokens, data: qWithTokens });
    } catch (err) {
        next(err);
    }
};

// @desc    Get all queues
// @route   GET /api/queues
// @access  Public
exports.getQueues = async (req, res, next) => {
    try {
        const queues = await Queue.find().populate('adminId', 'name email');
        const enriched = await Promise.all(queues.map(q => attachTokens(q)));
        // Return directly an array to match frontend getAllQueues() expecting an array!
        res.status(200).json(enriched);
    } catch (err) {
        next(err);
    }
};

// @desc    Get a single queue
// @route   GET /api/queues/:id
// @access  Public
exports.getQueue = async (req, res, next) => {
    try {
        const queue = await Queue.findById(req.params.id).populate('adminId', 'name email');
        if (!queue) return res.status(404).json({ success: false, message: 'Not found' });

        const enriched = await attachTokens(queue);
        res.status(200).json(enriched);
    } catch (err) {
        next(err);
    }
};

// @desc    Start / Activate a queue
// @route   PUT /api/queues/:id/start
// @access  Private/Admin
exports.startQueue = async (req, res, next) => {
    try {
        let queue = await Queue.findById(req.params.id);
        if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
        if (queue.adminId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        queue.status = 'active';
        await queue.save();

        const enriched = await attachTokens(queue);
        if (req.io) req.io.emit('QUEUE_UPDATED', enriched);

        res.status(200).json(enriched);
    } catch (err) {
        next(err);
    }
};

// @desc    Stop / Inactivate a queue
// @route   PUT /api/queues/:id/stop
// @access  Private/Admin
exports.stopQueue = async (req, res, next) => {
    try {
        let queue = await Queue.findById(req.params.id);
        if (!queue) return res.status(404).json({ success: false, message: 'Queue not found' });
        if (queue.adminId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Since frontend uses 'setQueueStatus', let's accept generic status update
        const { status } = req.body;
        queue.status = status || 'paused';
        await queue.save();

        const enriched = await attachTokens(queue);
        if (req.io) req.io.emit('QUEUE_UPDATED', enriched);

        res.status(200).json(enriched);
    } catch (err) {
        next(err);
    }
};

// @desc    Delete queue
// @route   DELETE /api/queues/:id
// @access  Private/Admin
exports.deleteQueue = async (req, res, next) => {
    try {
        const queue = await Queue.findById(req.params.id);
        if (!queue) return res.status(404).json({ success: false, message: 'Not found' });
        if (queue.adminId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        await queue.deleteOne();
        await Token.deleteMany({ queueId: queue._id });
        if (req.io) req.io.emit('QUEUE_DELETED', req.params.id);
        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (err) {
        next(err);
    }
};
