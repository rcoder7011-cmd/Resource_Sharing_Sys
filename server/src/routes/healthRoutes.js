const express = require('express');
const router = express.Router();
const { getHealthStatus, getReadinessStatus } = require('../controllers/healthController');

/**
 * @route   GET /api/health
 * @desc    Liveness check endpoint (process responsiveness)
 * @access  Public
 */
router.get('/', getHealthStatus);

/**
 * @route   GET /api/health/ready
 * @desc    Readiness probe endpoint (reflects actual database readiness: 200 OK / 503 Unavailable)
 * @access  Public
 */
router.get('/ready', getReadinessStatus);

module.exports = router;
