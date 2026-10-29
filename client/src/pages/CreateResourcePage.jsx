import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  ArrowLeft,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { createResource } from '../services/resourceService';
import {
  CATEGORIES,
  LOCATIONS,
  ACADEMIC_BRANCHES,
  ACADEMIC_SEMESTERS,
  getSubcategoriesForCategory,
  categorySupportsAcademicFields,
} from '../data/categories';

export default function CreateResourcePage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Student Essentials',
    subcategory: 'Calculators',
    resourceType: 'equipment',
    campus: 'Main Academic Campus',
    building: 'Science & Engineering Hall',
    room: 'Room 201',
    availabilityStatus: 'available',
    condition: 'good',
    quantity: 1,
    imageUrl: '',
    eligibility: 'Active Student ID Card',
    institution: 'Student Welfare & Resource Center',
    academicMetadata: {
      subject: '',
      branch: 'Computer Science & Engineering (CSE)',
      department: '',
      course: '',
      semester: '1st Semester (Year 1)',
      academicYear: '',
      classLevel: '',
      bookTitle: '',
      author: '',
      edition: '',
      isbn: '',
    },
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available categories without 'All Categories'
  const categoryOptions = CATEGORIES.filter((c) => c !== 'All Categories');
  const campusOptions = LOCATIONS.filter((l) => l !== 'All Campuses');
  const branchOptions = ACADEMIC_BRANCHES.filter((b) => b !== 'All Branches');
  const semesterOptions = ACADEMIC_SEMESTERS.filter((s) => s !== 'All Semesters');

  const currentSubcategories = getSubcategoriesForCategory(formData.category);
  const showAcademicFields = categorySupportsAcademicFields(formData.category);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (submitError) setSubmitError('');
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    const subcats = getSubcategoriesForCategory(newCategory);
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      subcategory: subcats[0] || 'Other',
    }));
  };

  const handleAcademicChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      academicMetadata: {
        ...prev.academicMetadata,
        [name]: value,
      },
    }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long';
    } else if (formData.title.trim().length > 150) {
      errors.title = 'Title cannot exceed 150 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    const qty = parseInt(formData.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        academicMetadata: showAcademicFields ? formData.academicMetadata : undefined,
        resourceType: formData.resourceType,
        location: {
          campus: formData.campus,
          building: formData.building.trim(),
          room: formData.room.trim(),
        },
        images: formData.imageUrl.trim() ? [formData.imageUrl.trim()] : undefined,
        availabilityStatus: formData.availabilityStatus,
        condition: formData.condition,
        quantity: parseInt(formData.quantity, 10),
        eligibility: formData.eligibility.trim() ? [formData.eligibility.trim()] : undefined,
        institution: formData.institution.trim() || `${user?.name}'s Laboratory`,
      };

      const result = await createResource(payload, token);
      const newId = result?.data?._id || result?.data?.id;

      if (newId) {
        navigate(`/resources/${newId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to create resource listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Listing Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            List Equipment or Research Space
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Share underutilized lab apparatus, workshops, and facilities with verified campus peers.
          </p>
        </div>

        <Button to="/dashboard" variant="outline" size="sm" icon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </div>

      {/* Global Error Banner */}
      {submitError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{submitError}</div>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800/80">
            1. Resource Identification & Description
          </h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Resource Title / Equipment Model *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="e.g. Nikon Eclipse Ti2-E Inverted Fluorescence Microscope"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  fieldErrors.title ? 'border-rose-500/70' : 'border-slate-800 hover:border-slate-700'
                }`}
              />
              {fieldErrors.title && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.title}</p>
              )}
            </div>

            {/* Category and Subcategory and Resource Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="category"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Primary Category *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleCategoryChange}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="subcategory"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Subcategory
                </label>
                <select
                  id="subcategory"
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {currentSubcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="resourceType"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  Resource Classification *
                </label>
                <select
                  id="resourceType"
                  name="resourceType"
                  value={formData.resourceType}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="equipment">Specialized Equipment / Instrument / Item</option>
                  <option value="space">Facility / Dedicated Lab Space</option>
                </select>
              </div>
            </div>

            {/* Optional Academic & Book Metadata (Rendered when category supports it) */}
            {showAcademicFields && (
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/70 border border-blue-900/30 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
                  <BookOpen className="w-4 h-4" />
                  <span>Academic Course & Study Material Details (Optional)</span>
                </div>
                <p className="text-xs text-slate-400">
                  Provide course, department, or publication details to help students and classmates discover this material accurately.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label htmlFor="acad-branch" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Academic Branch / Department
                    </label>
                    <select
                      id="acad-branch"
                      name="branch"
                      value={formData.academicMetadata.branch}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {branchOptions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="acad-semester" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Semester
                    </label>
                    <select
                      id="acad-semester"
                      name="semester"
                      value={formData.academicMetadata.semester}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {semesterOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="acad-subject" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Subject / Course Name
                    </label>
                    <input
                      id="acad-subject"
                      name="subject"
                      type="text"
                      value={formData.academicMetadata.subject}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Data Structures & Algorithms, Fluid Mechanics"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="acad-bookTitle" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Book / Material Title
                    </label>
                    <input
                      id="acad-bookTitle"
                      name="bookTitle"
                      type="text"
                      value={formData.academicMetadata.bookTitle}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Higher Engineering Mathematics"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="acad-course" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Degree / Programme
                    </label>
                    <input
                      id="acad-course"
                      name="course"
                      type="text"
                      value={formData.academicMetadata.course}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      placeholder="e.g. B.Tech, B.Arch, BCA, M.Tech"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="acad-classLevel" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Class Level / Academic Year
                    </label>
                    <input
                      id="acad-classLevel"
                      name="classLevel"
                      type="text"
                      value={formData.academicMetadata.classLevel}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      placeholder="e.g. 1st Year, 2nd Year, 2025-2026"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="acad-author" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Author / Notes Creator
                    </label>
                    <input
                      id="acad-author"
                      name="author"
                      type="text"
                      value={formData.academicMetadata.author}
                      onChange={handleAcademicChange}
                      disabled={isSubmitting}
                      placeholder="e.g. Dr. B.S. Grewal / Class Topper"
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="acad-edition" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Edition
                      </label>
                      <input
                        id="acad-edition"
                        name="edition"
                        type="text"
                        value={formData.academicMetadata.edition}
                        onChange={handleAcademicChange}
                        disabled={isSubmitting}
                        placeholder="e.g. 44th Edition"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="acad-isbn" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        ISBN (Optional)
                      </label>
                      <input
                        id="acad-isbn"
                        name="isbn"
                        type="text"
                        value={formData.academicMetadata.isbn}
                        onChange={handleAcademicChange}
                        disabled={isSubmitting}
                        placeholder="e.g. 978-8193328491"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Comprehensive Description & Capabilities *
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="Detail optical specifications, operational voltage, supported protocols, and research use cases..."
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  fieldErrors.description ? 'border-rose-500/70' : 'border-slate-800 hover:border-slate-700'
                }`}
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Location & Department */}
        <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800/80">
            2. Campus Location & Department
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="campus"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Campus Location *
              </label>
              <select
                id="campus"
                name="campus"
                value={formData.campus}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {campusOptions.map((camp) => (
                  <option key={camp} value={camp}>
                    {camp}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="building"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Building
              </label>
              <input
                id="building"
                name="building"
                type="text"
                value={formData.building}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="BioSciences Complex"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="room"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Room / Bay Number
              </label>
              <input
                id="room"
                name="room"
                type="text"
                value={formData.room}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="Room 304"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Availability, Condition & Media */}
        <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white tracking-tight pb-3 border-b border-slate-800/80">
            3. Operational Status & Media
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="availabilityStatus"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Availability Status
              </label>
              <select
                id="availabilityStatus"
                name="availabilityStatus"
                value={formData.availabilityStatus}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">Available Now</option>
                <option value="unavailable">Booking Required</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="condition"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Condition Rating
              </label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="new">New / Factory Calibrated</option>
                <option value="good">Good / Fully Operational</option>
                <option value="fair">Fair / Functional with minor wear</option>
                <option value="needs repair">Needs Calibration or Repair</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                Quantity Available *
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                max="1000"
                value={formData.quantity}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fieldErrors.quantity ? 'border-rose-500/70' : 'border-slate-800'
                }`}
              />
              {fieldErrors.quantity && (
                <p className="mt-1 text-xs text-rose-400">{fieldErrors.quantity}</p>
              )}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label
              htmlFor="imageUrl"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Image URL (Web Accessible Link)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <ImageIcon className="w-4 h-4" />
              </div>
              <input
                id="imageUrl"
                name="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Paste an image link. Leave blank to automatically use standard scientific apparatus fallback photo.
            </p>
          </div>

          {/* Access Prerequisites / Eligibility */}
          <div>
            <label
              htmlFor="eligibility"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Access Prerequisites / Safety Certification
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <input
                id="eligibility"
                name="eligibility"
                type="text"
                value={formData.eligibility}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="e.g. Cleanroom Tier-2 Certified or Laser Safety Module B"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <Button to="/dashboard" variant="secondary" size="md">
            Cancel
          </Button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:translate-y-px"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Publishing Listing...</span>
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4" />
                <span>Publish Resource Listing</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
