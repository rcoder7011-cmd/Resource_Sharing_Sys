const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const Booking = require('../models/Booking');
const { getOwnerResourceUtilization } = require('../services/rescueService');
const {
  calculateCurrentAvailability,
  calculateSlotAvailability,
} = require('../services/availabilityService');
const {
  isValidCategory,
  ALL_CATEGORIES,
} = require('../config/categories');

/**
 * Check MongoDB connection status
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Safe sorting allowlist
 */
const SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'name-asc': { title: 1 },
  'name-desc': { title: -1 },
};

/**
 * @desc    Get all resources with filtering, search, sorting & pagination
 * @route   GET /api/resources
 * @access  Public
 */
const getAllResources = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      search,
      q,
      category,
      subcategory,
      branch,
      department,
      semester,
      year,
      subject,
      location,
      campus,
      availability,
      status,
      resourceType,
      startDate,
      endDate,
      sortBy = 'newest',
      page = 1,
      limit = 9,
    } = req.query;

    // Public resource catalog excludes hidden/moderated listings
    const query = {
      moderationStatus: { $ne: 'hidden' },
    };

    // 1. Full-text search (title, description, category, subcategory, institution, academic fields)
    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      query.$or = [
        { title: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } },
        { subcategory: { $regex: searchTerm, $options: 'i' } },
        { institution: { $regex: searchTerm, $options: 'i' } },
        { 'academicMetadata.subject': { $regex: searchTerm, $options: 'i' } },
        { 'academicMetadata.branch': { $regex: searchTerm, $options: 'i' } },
        { 'academicMetadata.course': { $regex: searchTerm, $options: 'i' } },
        { 'academicMetadata.bookTitle': { $regex: searchTerm, $options: 'i' } },
        { 'academicMetadata.author': { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // 2. Category filter
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    // 2.1 Subcategory filter
    if (subcategory && subcategory !== 'All Subcategories') {
      query.subcategory = subcategory;
    }

    // 2.2 Academic Branch / Department filter
    const branchTerm = (branch || department || '').trim();
    if (branchTerm && branchTerm !== 'All Branches') {
      query['academicMetadata.branch'] = { $regex: branchTerm, $options: 'i' };
    }

    // 2.3 Academic Semester / Year filter
    const semesterTerm = (semester || year || '').trim();
    if (semesterTerm && semesterTerm !== 'All Semesters') {
      query['academicMetadata.semester'] = { $regex: semesterTerm, $options: 'i' };
    }

    // 2.4 Subject filter
    if (subject && subject.trim()) {
      query['academicMetadata.subject'] = { $regex: subject.trim(), $options: 'i' };
    }

    // 3. Location / Campus filter
    const campusTerm = (location || campus || '').trim();
    if (campusTerm && campusTerm !== 'All Campuses') {
      query['location.campus'] = campusTerm;
    }

    // 4. Availability Status filter
    const availTerm = (availability || status || '').trim();
    if (availTerm && availTerm !== 'All Statuses') {
      // Map frontend label to schema enum if needed
      const availMap = {
        'Available Now': 'available',
        available: 'available',
        'Currently Unavailable': 'unavailable',
        'Booking Required': 'unavailable',
        unavailable: 'unavailable',
        Maintenance: 'maintenance',
        maintenance: 'maintenance',
      };
      query.availabilityStatus = availMap[availTerm] || availTerm;
    }

    // 5. Resource Type filter
    if (resourceType && ['equipment', 'space'].includes(resourceType)) {
      query.resourceType = resourceType;
    }

    // 6. Safe sorting
    const sortField = SORT_OPTIONS[sortBy] || SORT_OPTIONS.newest;

    // 7. Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 9));
    const skip = (pageNum - 1) * limitNum;

    const total = await Resource.countDocuments(query);
    const resources = await Resource.find(query)
      .populate('owner', 'name email role')
      .sort(sortField)
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(total / limitNum) || 1;

    // Enhance resources with real-time available quantity and dynamic availability
    const activeMap = {};
    if (mongoose.connection.db || (typeof Booking.find === 'function' && !Booking.find.toString().includes('function find(conditions'))) {
      try {
        const resourceIds = resources.map((r) => r._id);
        const now = new Date();
        const activeBookings = await Booking.find({
          resource: { $in: resourceIds },
          $or: [
            { status: 'checked_in' },
            { status: 'approved', startAt: { $lte: now }, endAt: { $gt: now } },
          ],
        }).select('resource quantity');

        if (Array.isArray(activeBookings)) {
          for (const b of activeBookings) {
            const rId = b.resource?.toString?.();
            if (rId) {
              activeMap[rId] = (activeMap[rId] || 0) + (Number(b.quantity) || 1);
            }
          }
        }
      } catch (err) {
        // Fallback cleanly on error
      }
    }

    const enhancedResources = resources.map((resDoc) => {
      const obj = resDoc.toObject ? resDoc.toObject() : { ...resDoc };
      const rId = resDoc._id?.toString?.();
      const activeUnits = (rId && activeMap[rId]) || 0;
      const totalUnits = Number(resDoc.quantity) || 1;
      const isExplicitUnavailable = resDoc.availabilityStatus === 'unavailable';
      const availableUnits = isExplicitUnavailable ? 0 : Math.max(0, totalUnits - activeUnits);
      obj.availableQuantity = availableUnits;
      obj.totalQuantity = totalUnits;
      if (obj.availabilityStatus !== 'maintenance') {
        obj.availabilityStatus = availableUnits > 0 ? 'available' : 'unavailable';
        obj.availability = availableUnits > 0 ? 'Available Now' : 'Currently Unavailable';
        obj.badgeVariant = availableUnits > 0 ? 'available' : 'warning';
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: enhancedResources.length,
      pagination: {
        total,
        page: pageNum,
        pages: totalPages,
        limit: limitNum,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      },
      data: enhancedResources,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get resources owned by current authenticated user
 * @route   GET /api/resources/mine
 * @access  Private (Requires JWT)
 */
const getMyResources = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const resources = await Resource.find({ owner: req.user._id })
      .populate('owner', 'name email role')
      .sort({ createdAt: -1 });

    const activeMap = {};
    if (mongoose.connection.db || (typeof Booking.find === 'function' && !Booking.find.toString().includes('function find(conditions'))) {
      try {
        const resourceIds = resources.map((r) => r._id);
        const now = new Date();
        const activeBookings = await Booking.find({
          resource: { $in: resourceIds },
          $or: [
            { status: 'checked_in' },
            { status: 'approved', startAt: { $lte: now }, endAt: { $gt: now } },
          ],
        }).select('resource quantity');

        if (Array.isArray(activeBookings)) {
          for (const b of activeBookings) {
            const rId = b.resource?.toString?.();
            if (rId) {
              activeMap[rId] = (activeMap[rId] || 0) + (Number(b.quantity) || 1);
            }
          }
        }
      } catch (err) {
        // Fallback cleanly
      }
    }

    const enhancedResources = resources.map((resDoc) => {
      const obj = resDoc.toObject ? resDoc.toObject() : { ...resDoc };
      const rId = resDoc._id?.toString?.();
      const activeUnits = (rId && activeMap[rId]) || 0;
      const totalUnits = Number(resDoc.quantity) || 1;
      const isExplicitUnavailable = resDoc.availabilityStatus === 'unavailable';
      const availableUnits = isExplicitUnavailable ? 0 : Math.max(0, totalUnits - activeUnits);
      obj.availableQuantity = availableUnits;
      obj.totalQuantity = totalUnits;
      if (obj.availabilityStatus !== 'maintenance') {
        obj.availabilityStatus = availableUnits > 0 ? 'available' : 'unavailable';
        obj.availability = availableUnits > 0 ? 'Available Now' : 'Currently Unavailable';
        obj.badgeVariant = availableUnits > 0 ? 'available' : 'warning';
      }
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: enhancedResources.length,
      data: enhancedResources,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single resource by ID or slug
 * @route   GET /api/resources/:id
 * @access  Public
 */
const getResourceById = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    let resource = null;

    // 1. Try finding by valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      resource = await Resource.findById(id).populate('owner', 'name email role');
    }

    // 2. If not found or not ObjectId, attempt lookup by sample slug (e.g. 'sem-nanotech-01')
    if (!resource) {
      resource = await Resource.findOne({ slug: id }).populate('owner', 'name email role');
    }

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const activeInfo = await calculateCurrentAvailability(resource);
    const resObj = resource.toObject ? resource.toObject() : { ...resource };
    if (activeInfo) {
      resObj.availableQuantity = activeInfo.currentAvailableQuantity;
      resObj.totalQuantity = activeInfo.totalCapacity;
      if (resObj.availabilityStatus !== 'maintenance') {
        resObj.availabilityStatus = activeInfo.availabilityStatus;
        resObj.availability = activeInfo.availabilityLabel;
        resObj.badgeVariant = activeInfo.availabilityStatus === 'available' ? 'available' : 'warning';
      }
    }

    return res.status(200).json({
      success: true,
      data: resObj,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new resource listing
 * @route   POST /api/resources
 * @access  Private (Requires JWT)
 */
const createResource = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const {
      title,
      name,
      description,
      category,
      subcategory,
      academicMetadata,
      resourceType = 'equipment',
      location,
      images,
      availabilityStatus = 'available',
      quantity = 1,
      condition = 'good',
      eligibility,
      specs,
      institution,
      operatingHours,
      maxBookingDuration,
      safetyLevel,
    } = req.body;

    const resourceTitle = (title || name || '').trim();

    // Field-level validation
    if (!resourceTitle || resourceTitle.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be at least 3 characters',
      });
    }

    if (resourceTitle.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Title cannot exceed 150 characters',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description is required and must be at least 10 characters',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required',
      });
    }

    if (!isValidCategory(category)) {
      return res.status(400).json({
        success: false,
        message: `${category} is not a supported category`,
      });
    }

    const parsedSubcategory = typeof subcategory === 'string' ? subcategory.trim().substring(0, 100) : '';

    let parsedAcademicMetadata = {};
    if (academicMetadata && typeof academicMetadata === 'object') {
      parsedAcademicMetadata = {
        subject: typeof academicMetadata.subject === 'string' ? academicMetadata.subject.trim().substring(0, 100) : '',
        branch: typeof academicMetadata.branch === 'string' ? academicMetadata.branch.trim().substring(0, 100) : '',
        course: typeof academicMetadata.course === 'string' ? academicMetadata.course.trim().substring(0, 100) : '',
        semester: typeof academicMetadata.semester === 'string' ? academicMetadata.semester.trim().substring(0, 50) : '',
        bookTitle: typeof academicMetadata.bookTitle === 'string' ? academicMetadata.bookTitle.trim().substring(0, 200) : '',
        author: typeof academicMetadata.author === 'string' ? academicMetadata.author.trim().substring(0, 150) : '',
        edition: typeof academicMetadata.edition === 'string' ? academicMetadata.edition.trim().substring(0, 50) : '',
        isbn: typeof academicMetadata.isbn === 'string' ? academicMetadata.isbn.trim().substring(0, 30) : '',
      };
    }

    // Normalize location
    let parsedLocation = {
      campus: 'Main Academic Campus',
      building: 'Main Facility',
      room: 'General Access',
    };

    if (typeof location === 'string' && location.trim()) {
      parsedLocation.campus = location.trim();
    } else if (typeof location === 'object' && location !== null) {
      parsedLocation = {
        campus: (location.campus || 'Main Academic Campus').trim(),
        building: (location.building || 'Main Facility').trim(),
        room: (location.room || 'General Access').trim(),
      };
    }

    // Normalize images array
    let parsedImages = [];
    if (Array.isArray(images)) {
      parsedImages = images.filter((img) => typeof img === 'string' && img.trim() !== '');
    } else if (typeof images === 'string' && images.trim()) {
      parsedImages = [images.trim()];
    }

    if (parsedImages.length === 0) {
      parsedImages = [
        'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80',
      ];
    }

    // Validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer (at least 1)',
      });
    }

    // Normalize eligibility / access requirements
    let parsedEligibility = [];
    if (Array.isArray(eligibility)) {
      parsedEligibility = eligibility.map((e) => String(e).trim()).filter(Boolean);
    } else if (typeof eligibility === 'string' && eligibility.trim()) {
      parsedEligibility = [eligibility.trim()];
    }

    // Strictly derive owner from verified JWT user — never from req.body
    const newResource = await Resource.create({
      title: resourceTitle,
      description: description.trim(),
      category: category.trim(),
      subcategory: parsedSubcategory,
      academicMetadata: parsedAcademicMetadata,
      resourceType: resourceType === 'space' ? 'space' : 'equipment',
      location: parsedLocation,
      images: parsedImages,
      availabilityStatus: ['available', 'unavailable', 'maintenance'].includes(availabilityStatus)
        ? availabilityStatus
        : 'available',
      quantity: parsedQuantity,
      condition: ['new', 'good', 'fair', 'needs repair'].includes(condition)
        ? condition
        : 'good',
      eligibility: parsedEligibility.length > 0 ? parsedEligibility : undefined,
      specs: specs && typeof specs === 'object' ? specs : {},
      institution: institution ? institution.trim() : 'Institutional Facility',
      operatingHours: operatingHours ? operatingHours.trim() : undefined,
      maxBookingDuration: maxBookingDuration ? maxBookingDuration.trim() : undefined,
      safetyLevel: safetyLevel ? safetyLevel.trim() : 'Standard',
      owner: req.user._id,
      isSample: false,
      isDemo: false,
    });

    const populated = await Resource.findById(newResource._id).populate(
      'owner',
      'name email role'
    );

    return res.status(201).json({
      success: true,
      message: 'Resource listing created successfully',
      data: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    next(error);
  }
};

/**
 * @desc    Update an existing resource listing (Owner or Admin only)
 * @route   PATCH /api/resources/:id
 * @access  Private (Requires JWT)
 */
const updateResource = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Ownership authorization check
    const isOwner = resource.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this resource listing',
      });
    }

    // Prevent mass assignment of immutable / protected fields
    const updates = { ...req.body };
    delete updates.owner;
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.isSample;
    delete updates.isDemo;
    delete updates.demoSeedKey;

    if (updates.category && !isValidCategory(updates.category)) {
      return res.status(400).json({
        success: false,
        message: `${updates.category} is not a supported category`,
      });
    }

    if (updates.subcategory !== undefined) {
      updates.subcategory = typeof updates.subcategory === 'string' ? updates.subcategory.trim().substring(0, 100) : '';
    }

    if (updates.academicMetadata && typeof updates.academicMetadata === 'object') {
      const existingAcademic = resource.academicMetadata?.toObject ? resource.academicMetadata.toObject() : (resource.academicMetadata || {});
      updates.academicMetadata = {
        ...existingAcademic,
        ...updates.academicMetadata,
      };
    }

    // Handle name alias if provided
    if (updates.name && !updates.title) {
      updates.title = updates.name;
    }
    delete updates.name;

    // Normalize location if updated as string
    if (typeof updates.location === 'string' && updates.location.trim()) {
      updates.location = {
        campus: updates.location.trim(),
        building: resource.location?.building || 'Main Facility',
        room: resource.location?.room || 'General Access',
      };
    }

    // Apply updates
    Object.assign(resource, updates);
    const updatedResource = await resource.save();

    const populated = await Resource.findById(updatedResource._id).populate(
      'owner',
      'name email role'
    );

    return res.status(200).json({
      success: true,
      message: 'Resource updated successfully',
      data: populated,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join('. '),
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete a resource listing (Owner or Admin only)
 * @route   DELETE /api/resources/:id
 * @access  Private (Requires JWT)
 */
const deleteResource = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    // Ownership authorization check
    const isOwner = resource.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this resource listing',
      });
    }

    await Resource.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Resource deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get utilization analytics and rescue tips for authenticated owner's listings
 * @route   GET /api/resources/mine/utilization
 * @access  Private (Requires JWT)
 */
const getMyResourceUtilization = async (req, res, next) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please ensure MongoDB is configured and reachable.',
      });
    }

    const windowDays = parseInt(req.query.windowDays, 10) || 30;
    const result = await getOwnerResourceUtilization(req.user._id, windowDays);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllResources,
  getMyResources,
  getMyResourceUtilization,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
};

