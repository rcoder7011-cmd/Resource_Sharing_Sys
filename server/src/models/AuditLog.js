const mongoose = require('mongoose');

/**
 * AuditLog Model
 * Provides an immutable, append-only audit trail for administrative actions:
 * - User role modifications (promotions/demotions)
 * - User account status changes (suspension/reactivation)
 * - Resource moderation (flagging/hiding/approving)
 * - Handover & condition issue status updates
 */
const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin reference is required for audit logs'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      enum: {
        values: [
          'USER_ROLE_UPDATED',
          'USER_STATUS_UPDATED',
          'RESOURCE_MODERATED',
          'ISSUE_STATUS_UPDATED',
          'ADMIN_INITIALIZED',
        ],
        message: '{VALUE} is not a valid audit action',
      },
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target record ID is required'],
      index: true,
    },
    targetModel: {
      type: String,
      required: [true, 'Target model name is required'],
      enum: ['User', 'Resource', 'Booking'],
    },
    details: {
      type: String,
      trim: true,
      maxlength: [2000, 'Details cannot exceed 2000 characters'],
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Strategic indexes for chronologically sorted log inspection and filtering
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ admin: 1, action: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

