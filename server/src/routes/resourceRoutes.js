const express = require('express');
const router = express.Router();
const {
  getAllResources,
  getMyResources,
  getMyResourceUtilization,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');
const { matchNeeds } = require('../controllers/recommendationController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Public catalog routes
router.get('/', getAllResources);
router.post('/match', optionalProtect, matchNeeds);

// Authenticated user's personal listings & utilization (Must be registered BEFORE /:id route)
router.get('/mine', protect, getMyResources);
router.get('/mine/utilization', protect, getMyResourceUtilization);

// Public single resource details
router.get('/:id', getResourceById);

// Authenticated CRUD operations
router.post('/', protect, createResource);
router.patch('/:id', protect, updateResource);
router.delete('/:id', protect, deleteResource);

module.exports = router;

