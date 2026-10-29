const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource reference is required'],
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester reference is required'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Resource owner reference is required'],
    },
    startAt: {
      type: Date,
      required: [true, 'Start date and time is required'],
    },
    endAt: {
      type: Date,
      required: [true, 'End date and time is required'],
      validate: {
        validator: function (val) {
          if (!this.startAt) return true;
          return new Date(val) > new Date(this.startAt);
        },
        message: 'End date and time must be after start date and time',
      },
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    purpose: {
      type: String,
      required: [true, 'Booking purpose is required'],
      trim: true,
      minlength: [5, 'Purpose must be at least 5 characters long'],
      maxlength: [500, 'Purpose cannot exceed 500 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'checked_in', 'rejected', 'cancelled', 'completed'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'pending',
    },
    ownerResponse: {
      type: String,
      trim: true,
      maxlength: [500, 'Owner response cannot exceed 500 characters'],
      default: '',
    },
    reviewedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    checkIn: {
      checkedInAt: { type: Date },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAndConfirmed: { type: Boolean, default: false },
      condition: {
        type: String,
        enum: {
          values: ['excellent', 'good', 'fair', 'damaged'],
          message: '{VALUE} is not a recognized condition value',
        },
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Check-in notes cannot exceed 1000 characters'],
        default: '',
      },
      photos: {
        type: [String],
        default: [],
      },
    },
    checkOut: {
      checkedOutAt: { type: Date },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAndConfirmed: { type: Boolean, default: false },
      condition: {
        type: String,
        enum: {
          values: ['excellent', 'good', 'fair', 'damaged'],
          message: '{VALUE} is not a recognized condition value',
        },
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Check-out notes cannot exceed 1000 characters'],
        default: '',
      },
      photos: {
        type: [String],
        default: [],
      },
    },
    conditionComparison: {
      isWorsened: { type: Boolean, default: false },
      difference: { type: String, default: 'none' },
    },
    issueReport: {
      hasIssue: { type: Boolean, default: false },
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      category: {
        type: String,
        enum: [
          'condition_degradation',
          'physical_damage',
          'missing_accessories',
          'late_return',
          'other',
        ],
        default: 'other',
      },
      description: {
        type: String,
        trim: true,
        maxlength: [2000, 'Issue description cannot exceed 2000 characters'],
      },
      photos: {
        type: [String],
        default: [],
      },
      reportedAt: { type: Date },
      initialCondition: { type: String },
      finalCondition: { type: String },
      status: {
        type: String,
        enum: ['open', 'under_review', 'resolved'],
        default: 'open',
      },
      resolutionNotes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
        default: '',
      },
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      resolvedAt: {
        type: Date,
      },
    },
    pickupCoordination: {
      exactLocation: {
        type: String,
        trim: true,
        maxlength: [300, 'Exact location cannot exceed 300 characters'],
        default: '',
      },
      instructions: {
        type: String,
        trim: true,
        maxlength: [1000, 'Pickup instructions cannot exceed 1000 characters'],
        default: '',
      },
      targetTime: {
        type: Date,
      },
      ownerPhone: {
        type: String,
        trim: true,
        maxlength: [30, 'Phone number cannot exceed 30 characters'],
        default: '',
      },
      requesterPhone: {
        type: String,
        trim: true,
        maxlength: [30, 'Phone number cannot exceed 30 characters'],
        default: '',
      },
      sharePhoneWithOwner: {
        type: Boolean,
        default: false,
      },
      sharePhoneWithRequester: {
        type: Boolean,
        default: false,
      },
      lastUpdatedAt: {
        type: Date,
      },
      lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field to calculate duration in minutes
bookingSchema.virtual('durationMinutes').get(function () {
  if (!this.startAt || !this.endAt) return 0;
  return Math.round((new Date(this.endAt) - new Date(this.startAt)) / 60000);
});

// Virtual field to check if booking time is already in the past
bookingSchema.virtual('isPast').get(function () {
  if (!this.endAt) return false;
  return new Date() > new Date(this.endAt);
});

// Strategic query indexes
bookingSchema.index({ resource: 1, status: 1, startAt: 1, endAt: 1 });
bookingSchema.index({ requester: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

