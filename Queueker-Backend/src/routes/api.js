const express = require('express');
const router = express.Router();

const queueController = require('../controllers/queue');
const tokenController = require('../controllers/token');
const authController = require('../controllers/auth');
const { protect } = require('../middleware/auth');

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', protect, authController.getMe);

// Queue Routes
router.post('/queues', protect, queueController.createQueue);
router.get('/queues', queueController.getAllQueues);
router.get('/queues/me', protect, queueController.getMyQueues); // New route for logged-in user
router.get('/queues/:id', queueController.getQueue);
router.delete('/queues/:id', protect, queueController.deleteQueue);
router.put('/queues/:id/status', protect, queueController.setStatus);
router.post('/queues/:id/verify', queueController.verifyPin);

// Token Routes
router.post('/queues/:id/join', tokenController.joinQueue);
router.post('/queues/:id/serve', tokenController.serveNext);
router.post('/queues/:id/skip', tokenController.skipCurrent);

module.exports = router;
