const express = require('express');
const { generateToken, getTokens, callNextToken, skipCurrentToken } = require('../controllers/token');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Generate token (Guest or Auth)
router.post('/', generateToken);

// Get tokens for a queue
router.get('/queue/:queueId', getTokens);

// Admin controls
router.post('/:queueId/next', protect, authorize('admin'), callNextToken);
router.post('/:queueId/skip-current', protect, authorize('admin'), skipCurrentToken);

module.exports = router;
