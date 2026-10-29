const express = require('express');
const router = express.Router();
const { optionalProtect } = require('../middleware/authMiddleware');
const { matchNeeds, parseNeed } = require('../controllers/recommendationController');

// POST /api/recommendations/match
router.post('/match', optionalProtect, matchNeeds);

// POST /api/recommendations/parse-need
router.post('/parse-need', parseNeed);

module.exports = router;

