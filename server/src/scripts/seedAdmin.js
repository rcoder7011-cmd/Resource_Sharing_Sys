/**
 * Secure Initial Administrator Provisioning Script
 * 
 * Usage:
 *   1. Via environment variables in server/.env:
 *      ADMIN_EMAIL=admin@institution.edu ADMIN_PASSWORD=SecureAdminPass123! npm run seed:admin
 * 
 *   2. Or via CLI arguments:
 *      node src/scripts/seedAdmin.js --email admin@campus.edu --password SecurePassword123! --name "Lead Administrator"
 * 
 * Security Guard:
 *   - Never prints or exposes the plain-text password in logs or shell history.
 *   - Does not create a public HTTP endpoint for privilege escalation.
 *   - Records the administrative setup event in the persistent AuditLog.
 */

const dns = require('dns');
const path = require('path');
const mongoose = require('mongoose');

// Configure reliable DNS servers for MongoDB Atlas SRV lookup
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('⚠️ [DNS Warning] Failed to set custom DNS servers:', err.message);
}

// Ensure dotenv is loaded from server/.env regardless of current working directory
const envPath = path.resolve(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].replace(/^--/, '');
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      params[key] = value;
    }
  }
  return params;
};

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  const cliParams = parseArgs();
  const adminEmail = (cliParams.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const adminPassword = cliParams.password || process.env.ADMIN_PASSWORD || '';
  const adminName = cliParams.name || process.env.ADMIN_NAME || 'Platform Administrator';

  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing credentials for admin initialization.');
    console.log('   Provide credentials via environment variables:');
    console.log('     ADMIN_EMAIL=admin@institution.edu ADMIN_PASSWORD=your_password npm run seed:admin');
    console.log('   Or via CLI arguments:');
    console.log('     node src/scripts/seedAdmin.js --email admin@institution.edu --password your_password --name "Admin Name"');
    process.exit(1);
  }

  if (adminPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters long.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, {
      dbName: 'ResourceSharingDb',
      serverSelectionTimeoutMS: 10000,
    });
    console.log(' Connected to MongoDB Atlas.');

    let user = await User.findOne({ email: adminEmail });

    if (user) {
      console.log(`Found existing user account for "${adminEmail}". Promoting to administrator...`);
      user.role = 'admin';
      user.status = 'active';
      user.password = adminPassword; // Pre-save hook will hash this securely
      await user.save();
      console.log(` User "${adminEmail}" successfully promoted to Administrator.`);
    } else {
      console.log(`Creating new Administrator account for "${adminEmail}"...`);
      user = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active',
      });
      console.log(` Administrator "${adminEmail}" successfully created.`);
    }

    // Record administrative initialization in AuditLog
    await AuditLog.create({
      admin: user._id,
      action: 'ADMIN_INITIALIZED',
      targetId: user._id,
      targetModel: 'User',
      details: 'Initial administrator account provisioned via secure script.',
      metadata: {
        email: adminEmail,
        provisionMethod: cliParams.email ? 'cli_arguments' : 'env_variables',
      },
    });

    console.log('✅ Audit log entry created.');
    console.log('🎉 Admin initialization completed successfully.');
  } catch (error) {
    console.error('❌ Error provisioning administrator:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

seedAdmin();

