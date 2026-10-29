/**
 * Resource Image Storage Service
 *
 * Implements hardened, secure storage for public resource listing photographs.
 * Features:
 * - MIME type whitelist validation (image/jpeg, image/png, image/webp)
 * - Strict 5MB file size limit
 * - Cryptographically random filenames preventing collisions and path traversal
 * - Magic byte inspection verifying true binary file format
 * - Public streaming/serving with safe headers and caching
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.RESOURCE_UPLOAD_DIR
  ? path.resolve(process.env.RESOURCE_UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads/resources');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Ensure the resource images upload directory exists
 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Validates and saves an uploaded resource image to local disk storage
 *
 * @param {Buffer} buffer - Binary file buffer
 * @param {string} mimeType - Reported MIME type
 * @returns {Object} Stored file metadata and safe relative access URL
 */
function saveResourceImage(buffer, mimeType) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Invalid file payload: Expected binary buffer');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds strict 5MB limit (provided: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);
  }

  const normalizedMime = (mimeType || '').toLowerCase().trim();
  const extension = ALLOWED_MIME_TYPES[normalizedMime];

  if (!extension) {
    throw new Error(`Unsupported file type: "${mimeType}". Only JPEG, PNG, and WebP images are permitted.`);
  }

  // Magic bytes check for binary verification
  if (extension === '.jpg') {
    if (buffer.length < 2 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      throw new Error('File content does not match reported JPEG format');
    }
  } else if (extension === '.png') {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      throw new Error('File content does not match reported PNG format');
    }
  } else if (extension === '.webp') {
    if (buffer.length < 12) {
      throw new Error('File content too short for WebP format');
    }
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      throw new Error('File content does not match reported WebP format');
    }
  }

  ensureUploadDir();

  // Generate safe filename: res-img-<timestamp>-<randomHex><ext>
  const safeRandom = crypto.randomBytes(12).toString('hex');
  const timestamp = Date.now();
  const filename = `res-img-${timestamp}-${safeRandom}${extension}`;
  const targetPath = path.join(UPLOAD_DIR, filename);

  // Path traversal check
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Security violation: Attempted path traversal detected');
  }

  fs.writeFileSync(targetPath, buffer);

  return {
    filename,
    relativeUrl: `/api/resources/images/${filename}`,
    fullPath: targetPath,
    mimeType: normalizedMime,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Resolves a safe file path for public resource image delivery
 *
 * @param {string} filename - Stored image filename
 * @returns {Object} Full file path and MIME type
 */
function getResourceImageFilePath(filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename parameter');
  }

  // Reject path separators or relative path segments directly to prevent directory traversal
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error('Security violation: Attempted path traversal detected');
  }

  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    throw new Error('Invalid filename format');
  }

  const targetPath = path.join(UPLOAD_DIR, filename);
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Security violation: Attempted path traversal detected');
  }

  const exists = fs.existsSync(targetPath);

  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  return {
    fullPath: targetPath,
    exists,
    mimeType: mimeMap[ext] || 'application/octet-stream',
  };
}

/**
 * Parse a data-URI base64 string or raw base64 string into a Buffer and MIME type
 *
 * @param {string} base64Payload
 * @returns {{ buffer: Buffer, mimeType: string }}
 */
function parseBase64Image(base64Payload) {
  if (!base64Payload || typeof base64Payload !== 'string') {
    throw new Error('Base64 payload required');
  }

  let mimeType = 'image/jpeg';
  let cleanBase64 = base64Payload;

  const dataUriMatch = base64Payload.match(/^data:([a-zA-Z0-9\/+-]+);base64,(.+)$/);
  if (dataUriMatch) {
    mimeType = dataUriMatch[1].toLowerCase();
    cleanBase64 = dataUriMatch[2];
  }

  const buffer = Buffer.from(cleanBase64, 'base64');
  return { buffer, mimeType };
}

module.exports = {
  saveResourceImage,
  getResourceImageFilePath,
  parseBase64Image,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  UPLOAD_DIR,
};
