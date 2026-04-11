const express = require('express');
const { createQueue, getQueues, getQueue, startQueue, stopQueue, deleteQueue } = require('../controllers/queue');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .post(protect, authorize('admin'), createQueue)
    .get(getQueues);

router.route('/:id')
    .get(getQueue)
    .delete(protect, authorize('admin'), deleteQueue);

router.put('/:id/start', protect, authorize('admin'), startQueue);
router.put('/:id/stop', protect, authorize('admin'), stopQueue);
router.put('/:id/status', protect, authorize('admin'), stopQueue); // mapped status change

module.exports = router;
