const mongoose = require('mongoose');
const { findSmartMatches, parseNeedDescription } = require('../services/matchingService');

const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * @desc    Find smart ranked resource matches based on natural language need & structured criteria
 * @route   POST /api/recommendations/match
 * @access  Public (optional authentication)
 */
const matchNeeds = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      description = '',
      category = '',
      location = '',
      resourceType = '',
      startAt,
      endAt,
      quantity = 1,
      includeRescueBoost = true,
    } = req.body;

    // Minimum requirement: either description, category, or location must be specified
    if (!description && !category && !location && !resourceType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a need description, category, or preferred location',
      });
    }

    let results;
    try {
      results = await findSmartMatches(
        {
          description,
          category,
          location,
          resourceType,
          startAt,
          endAt,
          quantity,
          includeRescueBoost,
        },
        req.user || null
      );
    } catch (validationErr) {
      return res.status(400).json({
        success: false,
        message: validationErr.message,
      });
    }

    return res.status(200).json({
      success: true,
      count: results.count,
      totalEvaluated: results.totalEvaluated,
      query: results.query,
      parsedSignals: results.parsedSignals,
      data: results.matches,
      alternatives: results.alternatives,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Parse a natural language need query into structured filter cues
 * @route   POST /api/recommendations/parse-need
 * @access  Public
 */
const parseNeed = async (req, res, next) => {
  try {
    const { text = '' } = req.body;
    const parsed = parseNeedDescription(text);
    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  matchNeeds,
  parseNeed,
};

