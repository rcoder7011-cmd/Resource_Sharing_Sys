/**
 * Resource Management & Catalog Test Suite
 * Resource Sharing Platform — Part 4
 */

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const fs = require('fs');
const Resource = require('../models/Resource');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const {
  getAllResources,
  getMyResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  uploadResourceImage,
  serveResourceImage,
} = require('../controllers/resourceController');
const resourceImageService = require('../services/resourceImageService');

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

function createMockReqRes({
  method = 'GET',
  url = '/',
  query = {},
  params = {},
  headers = {},
  body = {},
  user = null,
} = {}) {
  const req = {
    method,
    url,
    query: { ...query },
    params: { ...params },
    headers: { ...headers },
    body: { ...body },
    user,
    originalUrl: url,
  };

  let statusCode = 200;
  let jsonResponse = null;
  const responseHeaders = {};
  let sentFile = null;
  let redirectUrl = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonResponse = data;
      return this;
    },
    setHeader(key, value) {
      responseHeaders[key] = value;
      return this;
    },
    sendFile(filePath) {
      sentFile = filePath;
      return this;
    },
    redirect(code, url) {
      if (typeof code === 'string') {
        url = code;
        code = 302;
      }
      statusCode = code;
      redirectUrl = url;
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get jsonResponse() {
      return jsonResponse;
    },
    get headers() {
      return responseHeaders;
    },
    get sentFile() {
      return sentFile;
    },
    get redirectUrl() {
      return redirectUrl;
    },
  };

  return { req, res };
}

async function runResourceTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Part 4 Resource Management Test Suite');
  console.log('====================================================\n');

  // Test users
  const ownerUser = {
    _id: new mongoose.Types.ObjectId(),
    id: 'owner123',
    name: 'Dr. Jane Smith',
    email: 'jsmith@university.edu',
    role: 'user',
  };

  const otherUser = {
    _id: new mongoose.Types.ObjectId(),
    id: 'other456',
    name: 'Dr. John Doe',
    email: 'jdoe@university.edu',
    role: 'user',
  };

  const adminUser = {
    _id: new mongoose.Types.ObjectId(),
    id: 'admin789',
    name: 'System Administrator',
    email: 'admin@university.edu',
    role: 'admin',
  };

  // --- Test Suite 1: Mongoose Resource Model Schema & Validation ---
  console.log('--- Test Suite 1: Resource Model Validation & Virtuals ---');

  const validResourceDoc = new Resource({
    title: 'Precision Fluorescent Microscope',
    description: 'High-power optical microscopy setup for cellular observation and fluorophore imaging.',
    category: 'Laboratories',
    resourceType: 'equipment',
    location: {
      campus: 'North Research Campus',
      building: 'Biosciences Complex',
      room: 'Lab 102',
    },
    availabilityStatus: 'available',
    quantity: 1,
    condition: 'good',
    owner: ownerUser._id,
  });

  const schemaErr = validResourceDoc.validateSync();
  assert(schemaErr === undefined, 'Valid resource document passes Mongoose schema validation');

  // Virtuals check
  assert(validResourceDoc.name === 'Precision Fluorescent Microscope', 'Virtual "name" aliases "title"');
  assert(validResourceDoc.availability === 'Available Now', 'Virtual "availability" returns "Available Now"');
  assert(validResourceDoc.badgeVariant === 'available', 'Virtual "badgeVariant" returns "available"');

  // Short title validation
  const shortTitleDoc = new Resource({
    title: 'AB',
    description: 'Valid description with more than ten characters',
    category: 'Laboratories',
    owner: ownerUser._id,
  });
  const shortTitleErr = shortTitleDoc.validateSync();
  assert(shortTitleErr?.errors?.title !== undefined, 'Resource with title < 3 chars is rejected');

  // Short description validation
  const shortDescDoc = new Resource({
    title: 'Valid Resource Title',
    description: 'Short',
    category: 'Laboratories',
    owner: ownerUser._id,
  });
  const shortDescErr = shortDescDoc.validateSync();
  assert(shortDescErr?.errors?.description !== undefined, 'Resource with description < 10 chars is rejected');

  // Invalid category validation
  const badCategoryDoc = new Resource({
    title: 'Valid Resource Title',
    description: 'Valid description with more than ten characters',
    category: 'InvalidCategory123',
    owner: ownerUser._id,
  });
  const badCatErr = badCategoryDoc.validateSync();
  assert(badCatErr?.errors?.category !== undefined, 'Resource with unsupported category is rejected');

  // Missing owner validation
  const noOwnerDoc = new Resource({
    title: 'Valid Resource Title',
    description: 'Valid description with more than ten characters',
    category: 'Laboratories',
  });
  const noOwnerErr = noOwnerDoc.validateSync();
  assert(noOwnerErr?.errors?.owner !== undefined, 'Resource without owner reference is rejected');

  // --- Test Suite 2: Controller Unit Validation & Offline Guard ---
  console.log('\n--- Test Suite 2: Controller Validation & Offline Guard ---');

  // Test DB disconnected 503 handling
  const originalReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const { req: offReq, res: offRes } = createMockReqRes();
  await getAllResources(offReq, offRes, () => {});
  assert(offRes.statusCode === 503, 'GET /api/resources returns 503 when database is disconnected');

  const { req: offCreateReq, res: offCreateRes } = createMockReqRes({
    method: 'POST',
    user: ownerUser,
    body: { title: 'Test Title', description: 'Long enough description', category: 'Laboratories' },
  });
  await createResource(offCreateReq, offCreateRes, () => {});
  assert(offCreateRes.statusCode === 503, 'POST /api/resources returns 503 when database is disconnected');

  // --- Test Suite 3: Controller In-Memory Simulation (Full CRUD & Ownership) ---
  console.log('\n--- Test Suite 3: Controller Simulation (Full CRUD & Ownership) ---');

  // Mock database connection as active
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

  // In-memory resource repository
  const memoryResources = [];

  const originalFind = Resource.find;
  const originalFindById = Resource.findById;
  const originalFindOne = Resource.findOne;
  const originalCreate = Resource.create;
  const originalCount = Resource.countDocuments;
  const originalDelete = Resource.findByIdAndDelete;

  Resource.countDocuments = async function (filter = {}) {
    return memoryResources.length;
  };

  Resource.find = function (filter = {}) {
    let results = [...memoryResources];

    if (filter.owner) {
      results = results.filter((r) => r.owner.toString() === filter.owner.toString());
    }

    if (filter.category) {
      results = results.filter((r) => r.category === filter.category);
    }

    if (filter['location.campus']) {
      results = results.filter((r) => r.location?.campus === filter['location.campus']);
    }

    if (filter.availabilityStatus) {
      results = results.filter((r) => r.availabilityStatus === filter.availabilityStatus);
    }

    const queryObj = {
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      skip() {
        return this;
      },
      limit(n) {
        return results.slice(0, n);
      },
      then(resolve) {
        resolve(results);
      },
    };

    return queryObj;
  };

  Resource.findById = function (id) {
    const found = memoryResources.find((r) => r._id.toString() === id.toString()) || null;
    return {
      populate() {
        return Promise.resolve(found);
      },
      then(resolve) {
        resolve(found);
      },
    };
  };

  Resource.findOne = function (filter) {
    let found = null;
    if (filter.slug) {
      found = memoryResources.find((r) => r.slug === filter.slug) || null;
    }
    return {
      populate() {
        return Promise.resolve(found);
      },
      then(resolve) {
        resolve(found);
      },
    };
  };

  Resource.create = async function (doc) {
    const item = {
      _id: new mongoose.Types.ObjectId(),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      resourceType: doc.resourceType || 'equipment',
      location: doc.location || { campus: 'Main Academic Campus' },
      images: doc.images || [],
      availabilityStatus: doc.availabilityStatus || 'available',
      quantity: doc.quantity || 1,
      condition: doc.condition || 'good',
      eligibility: doc.eligibility || [],
      owner: doc.owner,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        return this;
      },
    };
    memoryResources.push(item);
    return item;
  };

  Resource.findByIdAndDelete = async function (id) {
    const idx = memoryResources.findIndex((r) => r._id.toString() === id.toString());
    if (idx !== -1) {
      return memoryResources.splice(idx, 1)[0];
    }
    return null;
  };

  try {
    // 3.1 Validation on Create (Missing Title)
    const { req: badReq1, res: badRes1 } = createMockReqRes({
      method: 'POST',
      user: ownerUser,
      body: { title: 'AB', description: 'A long enough description', category: 'Laboratories' },
    });
    await createResource(badReq1, badRes1, () => {});
    assert(badRes1.statusCode === 400, 'POST /api/resources rejects title < 3 chars with 400');

    // 3.2 Validation on Create (Missing Description)
    const { req: badReq2, res: badRes2 } = createMockReqRes({
      method: 'POST',
      user: ownerUser,
      body: { title: 'Laser Interferometer', description: 'Short', category: 'Laboratories' },
    });
    await createResource(badReq2, badRes2, () => {});
    assert(badRes2.statusCode === 400, 'POST /api/resources rejects description < 10 chars with 400');

    // 3.3 Successful Resource Creation
    const { req: createReq, res: createRes } = createMockReqRes({
      method: 'POST',
      user: ownerUser,
      body: {
        title: 'Confocal Laser Scanning Microscope',
        description: 'Multi-laser confocal system for optical sectioning and 3D fluorescence imaging.',
        category: 'Laboratories',
        resourceType: 'equipment',
        location: { campus: 'North Research Campus', building: 'Optics Hall', room: 'Room 101' },
        quantity: 1,
        condition: 'good',
        owner: otherUser._id, // Malicious attempt to spoof owner
      },
    });
    await createResource(createReq, createRes, () => {});
    assert(createRes.statusCode === 201, 'POST /api/resources creates resource with 201 Created');
    assert(createRes.jsonResponse?.success === true, 'Response indicates success: true');

    const createdItem = memoryResources[0];
    assert(createdItem !== undefined, 'Resource stored in repository');
    assert(
      createdItem.owner.toString() === ownerUser._id.toString(),
      'Owner is strictly assigned from authenticated user, ignoring client spoof'
    );

    // 3.4 Public Get All Resources
    const { req: getAllReq, res: getAllRes } = createMockReqRes({ method: 'GET', query: {} });
    await getAllResources(getAllReq, getAllRes, () => {});
    assert(getAllRes.statusCode === 200, 'GET /api/resources returns 200 OK');
    assert(getAllRes.jsonResponse?.pagination?.total >= 1, 'Response includes pagination metadata');

    // 3.5 Get Single Resource by ID
    const { req: getByIdReq, res: getByIdRes } = createMockReqRes({
      params: { id: createdItem._id.toString() },
    });
    await getResourceById(getByIdReq, getByIdRes, () => {});
    assert(getByIdRes.statusCode === 200, 'GET /api/resources/:id returns 200 OK');
    assert(getByIdRes.jsonResponse?.data?.title === 'Confocal Laser Scanning Microscope', 'Returns correct resource');

    // 3.6 Get Non-Existent Resource returns 404
    const fakeId = new mongoose.Types.ObjectId().toString();
    const { req: notFoundReq, res: notFoundRes } = createMockReqRes({ params: { id: fakeId } });
    await getResourceById(notFoundReq, notFoundRes, () => {});
    assert(notFoundRes.statusCode === 404, 'GET /api/resources/:id returns 404 for non-existent ID');

    // 3.7 Get User-Owned Resources (GET /api/resources/mine)
    const { req: myReq, res: myRes } = createMockReqRes({ user: ownerUser });
    await getMyResources(myReq, myRes, () => {});
    assert(myRes.statusCode === 200, 'GET /api/resources/mine returns 200 OK');
    assert(myRes.jsonResponse?.count === 1, 'GET /api/resources/mine returns user resources');

    // Other user has 0 resources
    const { req: otherMyReq, res: otherMyRes } = createMockReqRes({ user: otherUser });
    await getMyResources(otherMyReq, otherMyRes, () => {});
    assert(otherMyRes.jsonResponse?.count === 0, 'Other user has 0 resources in /mine');

    // 3.8 Non-Owner Attempt to Update Listing (Forbidden 403)
    const { req: nonOwnerUpdateReq, res: nonOwnerUpdateRes } = createMockReqRes({
      method: 'PATCH',
      params: { id: createdItem._id.toString() },
      user: otherUser, // not the owner
      body: { title: 'Hacked Title' },
    });
    await updateResource(nonOwnerUpdateReq, nonOwnerUpdateRes, () => {});
    assert(nonOwnerUpdateRes.statusCode === 403, 'Non-owner update attempt is rejected with 403 Forbidden');

    // 3.9 Owner Updating Their Listing
    const { req: ownerUpdateReq, res: ownerUpdateRes } = createMockReqRes({
      method: 'PATCH',
      params: { id: createdItem._id.toString() },
      user: ownerUser,
      body: {
        title: 'Updated Confocal Microscope Model X',
        owner: otherUser._id, // attempt to change owner
      },
    });
    await updateResource(ownerUpdateReq, ownerUpdateRes, () => {});
    assert(ownerUpdateRes.statusCode === 200, 'Owner can update listing with 200 OK');
    assert(
      createdItem.owner.toString() === ownerUser._id.toString(),
      'Protected field "owner" cannot be modified during update'
    );

    // 3.10 Non-Owner Attempt to Delete Listing (Forbidden 403)
    const { req: nonOwnerDelReq, res: nonOwnerDelRes } = createMockReqRes({
      method: 'DELETE',
      params: { id: createdItem._id.toString() },
      user: otherUser, // not the owner
    });
    await deleteResource(nonOwnerDelReq, nonOwnerDelRes, () => {});
    assert(nonOwnerDelRes.statusCode === 403, 'Non-owner delete attempt is rejected with 403 Forbidden');
    assert(memoryResources.length === 1, 'Listing was not deleted by non-owner');

    // 3.11 Owner Deleting Their Listing
    const { req: ownerDelReq, res: ownerDelRes } = createMockReqRes({
      method: 'DELETE',
      params: { id: createdItem._id.toString() },
      user: ownerUser,
    });
    await deleteResource(ownerDelReq, ownerDelRes, () => {});
    assert(ownerDelRes.statusCode === 200, 'Owner can delete listing with 200 OK');
    assert(memoryResources.length === 0, 'Listing was deleted from repository');
  } finally {
    // Restore originals
    Resource.find = originalFind;
    Resource.findById = originalFindById;
    Resource.findOne = originalFindOne;
    Resource.create = originalCreate;
    Resource.countDocuments = originalCount;
    Resource.findByIdAndDelete = originalDelete;
    Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });
  }

  // --- Test Suite 4: Device Image Upload & Static Asset Serving ---
  console.log('\n--- Test Suite 4: Device Image Upload & Static Asset Serving ---');

  const validPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let createdTestImageFilename = null;

  try {
    // 4.1 Validate service saves valid PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const saved = resourceImageService.saveResourceImage(pngBuffer, 'image/png');
    assert(typeof saved.filename === 'string' && saved.filename.endsWith('.png'), 'Saves PNG buffer with safe filename');
    assert(saved.relativeUrl.startsWith('/api/resources/images/'), 'Returns relative URL starting with /api/resources/images/');
    assert(fs.existsSync(saved.fullPath), 'Saved file exists in uploads/resources directory');
    createdTestImageFilename = saved.filename;

    // 4.2 Rejects invalid mime types
    let mimeRejected = false;
    try {
      resourceImageService.saveResourceImage(Buffer.from('hello world'), 'application/pdf');
    } catch {
      mimeRejected = true;
    }
    assert(mimeRejected, 'resourceImageService rejects unsupported MIME types (e.g. PDF)');

    // 4.3 Rejects files with invalid magic bytes
    let magicByteRejected = false;
    try {
      resourceImageService.saveResourceImage(Buffer.from([0x00, 0x01, 0x02, 0x03]), 'image/png');
    } catch {
      magicByteRejected = true;
    }
    assert(magicByteRejected, 'resourceImageService rejects file whose magic bytes do not match declared MIME');

    // 4.4 Controller uploadResourceImage succeeds with 201 Created and image URL
    const { req: uploadReq, res: uploadRes } = createMockReqRes({
      method: 'POST',
      body: { image: validPngBase64 },
    });
    await uploadResourceImage(uploadReq, uploadRes, () => {});
    assert(uploadRes.statusCode === 201, 'uploadResourceImage returns 201 Created');
    assert(uploadRes.jsonResponse?.success === true, 'upload response has success: true');
    assert(
      uploadRes.jsonResponse?.data?.url?.startsWith('/api/resources/images/'),
      'upload response returns accessible relative URL'
    );

    // 4.5 Controller uploadResourceImage rejects missing image with 400 Bad Request
    const { req: badUploadReq, res: badUploadRes } = createMockReqRes({
      method: 'POST',
      body: {},
    });
    await uploadResourceImage(badUploadReq, badUploadRes, () => {});
    assert(badUploadRes.statusCode === 400, 'uploadResourceImage rejects missing image payload with 400 Bad Request');

    // 4.6 Controller serveResourceImage blocks directory traversal with 400 Bad Request
    const { req: traversalReq, res: traversalRes } = createMockReqRes({
      method: 'GET',
      params: { filename: '../../etc/passwd' },
    });
    await serveResourceImage(traversalReq, traversalRes, () => {});
    assert(traversalRes.statusCode === 400, 'serveResourceImage prevents directory traversal attacks with 400 Bad Request');

    // 4.7 Controller serveResourceImage falls back gracefully on non-existent file
    const { req: missingImgReq, res: missingImgRes } = createMockReqRes({
      method: 'GET',
      params: { filename: 'res-img-nonexistent-123.jpg' },
    });
    await serveResourceImage(missingImgReq, missingImgRes, () => {});
    assert(missingImgRes.statusCode === 302, 'serveResourceImage redirects missing files with 302 fallback');
    assert(
      typeof missingImgRes.redirectUrl === 'string' && missingImgRes.redirectUrl.includes('unsplash.com'),
      'serveResourceImage fallback points to safe default placeholder'
    );

    // 4.8 Controller serveResourceImage serves valid file with correct headers
    if (createdTestImageFilename) {
      const { req: validImgReq, res: validImgRes } = createMockReqRes({
        method: 'GET',
        params: { filename: createdTestImageFilename },
      });
      await serveResourceImage(validImgReq, validImgRes, () => {});
      assert(validImgRes.headers['Content-Type'] === 'image/png', 'serveResourceImage sets Content-Type header to image/png');
      assert(validImgRes.headers['Cache-Control']?.includes('public'), 'serveResourceImage sets Cache-Control header');
      assert(typeof validImgRes.sentFile === 'string', 'serveResourceImage transmits file via sendFile');
    }
  } finally {
    // Cleanup created test file
    if (createdTestImageFilename) {
      try {
        const info = resourceImageService.getResourceImageFilePath(createdTestImageFilename);
        if (info.exists) {
          fs.unlinkSync(info.fullPath);
        }
      } catch {
        // ignore
      }
    }
  }

  console.log('\n====================================================');
  console.log(`🏁 Part 4 Resource Test Results: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('====================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runResourceTestSuite().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runResourceTestSuite };

