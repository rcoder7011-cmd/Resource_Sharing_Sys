const mongoose = require('mongoose');
const { ALL_CATEGORIES } = require('../config/categories');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a resource title'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters long'],
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2500, 'Description cannot exceed 2500 characters'],
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true,
      enum: {
        values: ALL_CATEGORIES,
        message: '{VALUE} is not a supported category',
      },
    },
    subcategory: {
      type: String,
      trim: true,
      maxlength: [100, 'Subcategory cannot exceed 100 characters'],
      default: '',
    },
    academicMetadata: {
      subject: {
        type: String,
        trim: true,
        maxlength: [100, 'Subject cannot exceed 100 characters'],
        default: '',
      },
      branch: {
        type: String,
        trim: true,
        maxlength: [100, 'Branch cannot exceed 100 characters'],
        default: '',
      },
      course: {
        type: String,
        trim: true,
        maxlength: [100, 'Course cannot exceed 100 characters'],
        default: '',
      },
      semester: {
        type: String,
        trim: true,
        maxlength: [50, 'Semester cannot exceed 50 characters'],
        default: '',
      },
      bookTitle: {
        type: String,
        trim: true,
        maxlength: [200, 'Book title cannot exceed 200 characters'],
        default: '',
      },
      author: {
        type: String,
        trim: true,
        maxlength: [150, 'Author cannot exceed 150 characters'],
        default: '',
      },
      edition: {
        type: String,
        trim: true,
        maxlength: [50, 'Edition cannot exceed 50 characters'],
        default: '',
      },
      isbn: {
        type: String,
        trim: true,
        maxlength: [30, 'ISBN cannot exceed 30 characters'],
        default: '',
      },
    },
    resourceType: {
      type: String,
      enum: {
        values: ['equipment', 'space'],
        message: '{VALUE} is not a valid resource type (equipment or space)',
      },
      default: 'equipment',
    },
    location: {
      campus: {
        type: String,
        required: [true, 'Please specify the campus or location'],
        trim: true,
        default: 'Main Academic Campus',
      },
      building: {
        type: String,
        trim: true,
        default: 'Main Facility',
      },
      room: {
        type: String,
        trim: true,
        default: 'General Access',
      },
    },
    images: {
      type: [String],
      default: [
        'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80',
      ],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.every((url) => typeof url === 'string');
        },
        message: 'Images must be an array of valid URL strings',
      },
    },
    availabilityStatus: {
      type: String,
      enum: {
        values: ['available', 'unavailable', 'maintenance'],
        message: '{VALUE} is not a valid availability status',
      },
      default: 'available',
    },
    quantity: {
      type: Number,
      required: [true, 'Please specify quantity'],
      min: [1, 'Quantity must be at least 1'],
      max: [1000, 'Quantity cannot exceed 1000'],
      default: 1,
    },
    condition: {
      type: String,
      enum: {
        values: ['new', 'good', 'fair', 'needs repair'],
        message: '{VALUE} is not a recognized condition',
      },
      default: 'good',
    },
    eligibility: {
      type: [String],
      default: ['Standard Institutional Safety Briefing'],
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    institution: {
      type: String,
      trim: true,
      default: 'Institutional Facility',
    },
    operatingHours: {
      type: String,
      trim: true,
      default: 'Monday – Friday: 08:30 – 18:00',
    },
    maxBookingDuration: {
      type: String,
      trim: true,
      default: '4 hours / day',
    },
    safetyLevel: {
      type: String,
      trim: true,
      default: 'Standard',
    },
    slug: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    isSample: {
      type: Boolean,
      default: false,
    },
    isDemo: {
      type: Boolean,
      default: false,
      index: true,
    },
    demoSeedKey: {
      type: String,
      trim: true,
      sparse: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Resource must belong to an authenticated owner'],
    },
    moderationStatus: {
      type: String,
      enum: {
        values: ['approved', 'flagged', 'hidden'],
        message: '{VALUE} is not a valid moderation status',
      },
      default: 'approved',
    },
    moderationReason: {
      type: String,
      trim: true,
      maxlength: [1000, 'Moderation reason cannot exceed 1000 characters'],
      default: '',
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field 'name' mapping to 'title' for seamless compatibility with Part 2 UI
resourceSchema.virtual('name').get(function () {
  return this.title;
});

// Virtual field 'summary' returning the first 160 characters of description
resourceSchema.virtual('summary').get(function () {
  if (!this.description) return '';
  return this.description.length > 160
    ? `${this.description.substring(0, 157)}...`
    : this.description;
});

// Virtual field 'availability' display label
resourceSchema.virtual('availability').get(function () {
  const map = {
    available: 'Available Now',
    unavailable: 'Currently Unavailable',
    maintenance: 'Maintenance',
  };
  return map[this.availabilityStatus] || 'Available Now';
});

// Virtual field 'availableQuantity'
resourceSchema.virtual('availableQuantity').get(function () {
  if (this.availabilityStatus === 'unavailable' || this.availabilityStatus === 'maintenance') return 0;
  return Number(this.quantity) || 1;
});

// Virtual field 'totalQuantity'
resourceSchema.virtual('totalQuantity').get(function () {
  return Number(this.quantity) || 1;
});

// Virtual field 'badgeVariant' for Badge component styling
resourceSchema.virtual('badgeVariant').get(function () {
  const map = {
    available: 'available',
    unavailable: 'warning',
    maintenance: 'neutral',
  };
  return map[this.availabilityStatus] || 'neutral';
});

// Virtual field 'accessRequirements' mapping to eligibility array
resourceSchema.virtual('accessRequirements').get(function () {
  return this.eligibility && this.eligibility.length > 0
    ? this.eligibility
    : ['Standard Institutional Safety Briefing'];
});

// Virtual field 'type' for card display
resourceSchema.virtual('type').get(function () {
  return this.resourceType === 'space' ? 'Facility Space' : 'Specialized Equipment';
});

// Compound and text indexes for performant searching and filtering
resourceSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  subcategory: 'text',
  'academicMetadata.subject': 'text',
  'academicMetadata.branch': 'text',
  'academicMetadata.bookTitle': 'text',
  'academicMetadata.author': 'text',
});
resourceSchema.index({ category: 1, subcategory: 1 });
resourceSchema.index({ category: 1, availabilityStatus: 1 });
resourceSchema.index({ moderationStatus: 1, availabilityStatus: 1 });
resourceSchema.index({ 'location.campus': 1 });
resourceSchema.index({ 'academicMetadata.branch': 1 });
resourceSchema.index({ owner: 1, createdAt: -1 });

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;

