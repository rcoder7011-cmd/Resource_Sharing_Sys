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
  uploadResourceImage,
  serveResourceImage,
} = require('../controllers/resourceController');
const { matchNeeds } = require('../controllers/recommendationController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Public catalog routes
router.get('/', getAllResources);
router.post('/match', optionalProtect, matchNeeds);

// Public resource image serving (Must be registered BEFORE /:id route)
router.get('/images/:filename', serveResourceImage);

// Authenticated image upload for resource listings
router.post('/upload-image', protect, uploadResourceImage);

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

