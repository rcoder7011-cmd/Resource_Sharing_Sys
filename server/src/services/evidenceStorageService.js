/**
 * Secure Evidence Storage Service (Part 12)
 *
 * Implements hardened, secure storage for handover and return condition proof images.
 * Features:
 * - MIME type whitelist validation (image/jpeg, image/png, image/webp)
 * - Strict 5MB file size limit
 * - Cryptographically random UUID filenames preventing path traversal
 * - Private, authenticated file access (never exposes raw server directory paths)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.EVIDENCE_UPLOAD_DIR
  ? path.resolve(process.env.EVIDENCE_UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads/evidence');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Ensure the secure upload directory exists
 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Validates and saves an evidence image file to secure local storage
 *
 * @param {string} bookingId - Associated booking ID
 * @param {Buffer} buffer - Binary file buffer
 * @param {string} mimeType - Reported MIME type
 * @returns {Object} Stored file metadata and safe relative access URL
 */
function saveEvidenceFile(bookingId, buffer, mimeType) {
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

  // Basic magic bytes check for extra security
  if (extension === '.jpg') {
    if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      throw new Error('File content does not match reported JPEG format');
    }
  } else if (extension === '.png') {
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      throw new Error('File content does not match reported PNG format');
    }
  } else if (extension === '.webp') {
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    if (riff !== 'RIFF' || webp !== 'WEBP') {
      throw new Error('File content does not match reported WebP format');
    }
  }

  ensureUploadDir();

  // Generate safe nonces and filename: evidence-<bookingId>-<randomHex><ext>
  const safeRandom = crypto.randomBytes(12).toString('hex');
  const cleanBookingId = String(bookingId).replace(/[^a-zA-Z0-9]/g, '');
  const filename = `evidence-${cleanBookingId}-${safeRandom}${extension}`;
  const targetPath = path.join(UPLOAD_DIR, filename);

  // Path traversal check
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Security violation: Attempted path traversal detected');
  }

  fs.writeFileSync(targetPath, buffer);

  return {
    filename,
    relativeUrl: `/api/bookings/${bookingId}/evidence/${filename}`,
    mimeType: normalizedMime,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Retrieves the absolute path of an evidence file after strict sanitization
 *
 * @param {string} bookingId - Booking ID
 * @param {string} filename - Target filename
 * @returns {Object} { fullPath, mimeType }
 */
function getEvidenceFilePath(bookingId, filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error('Filename required');
  }

  // Strict regex: must only contain alphanumeric, dash, and dot
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
    throw new Error('Invalid filename format');
  }

  const cleanBookingId = String(bookingId).replace(/[^a-zA-Z0-9]/g, '');
  if (!filename.startsWith(`evidence-${cleanBookingId}-`)) {
    throw new Error('Access denied: File does not belong to this booking context');
  }

  const fullPath = path.join(UPLOAD_DIR, filename);

  // Path traversal check
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    throw new Error('Security violation: Path traversal prevented');
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error('Evidence file not found on disk');
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };

  return {
    fullPath,
    mimeType: mimeMap[ext] || 'application/octet-stream',
  };
}

/**
 * Parse a data-URI base64 string or raw base64 string into a Buffer and MIME type
 */
function parseBase64Upload(base64Payload) {
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
  saveEvidenceFile,
  getEvidenceFilePath,
  parseBase64Upload,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
};

