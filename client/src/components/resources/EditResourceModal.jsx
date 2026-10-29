import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Save } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { updateResource } from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORIES,
  LOCATIONS,
  getSubcategoriesForCategory,
  categorySupportsAcademicFields,
} from '../../data/categories';

export default function EditResourceModal({ resource, isOpen, onClose, onSuccess }) {
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Student Essentials',
    subcategory: 'Calculators',
    campus: 'Main Academic Campus',
    building: '',
    room: '',
    availabilityStatus: 'available',
    condition: 'good',
    quantity: 1,
    imageUrl: '',
    academicMetadata: {
      subject: '',
      branch: '',
      department: '',
      course: '',
      semester: '',
      academicYear: '',
      classLevel: '',
      bookTitle: '',
      author: '',
      edition: '',
      isbn: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categoryOptions = CATEGORIES.filter((c) => c !== 'All Categories');
  const campusOptions = LOCATIONS.filter((l) => l !== 'All Campuses');
  const currentSubcategories = getSubcategoriesForCategory(formData.category);
  const showAcademicFields = categorySupportsAcademicFields(formData.category);

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title || resource.name || '',
        description: resource.description || '',
        category: resource.category || 'Student Essentials',
        subcategory: resource.subcategory || '',
        campus:
          typeof resource.location === 'object'
            ? resource.location?.campus || 'Main Academic Campus'
            : resource.location || 'Main Academic Campus',
        building:
          typeof resource.location === 'object' ? resource.location?.building || '' : '',
        room: typeof resource.location === 'object' ? resource.location?.room || '' : '',
        availabilityStatus: resource.availabilityStatus || 'available',
        condition: resource.condition || 'good',
        quantity: resource.quantity || 1,
        imageUrl: resource.images?.[0] || '',
        academicMetadata: {
          subject: resource.academicMetadata?.subject || '',
          branch: resource.academicMetadata?.branch || '',
          department: resource.academicMetadata?.department || '',
          course: resource.academicMetadata?.course || '',
          semester: resource.academicMetadata?.semester || '',
          academicYear: resource.academicMetadata?.academicYear || '',
          classLevel: resource.academicMetadata?.classLevel || resource.academicMetadata?.class || '',
          bookTitle: resource.academicMetadata?.bookTitle || '',
          author: resource.academicMetadata?.author || '',
          edition: resource.academicMetadata?.edition || '',
          isbn: resource.academicMetadata?.isbn || '',
        },
      });
      setError('');
    }
  }, [resource]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleCategoryChange = (e) => {
    const newCategory = e.target.value;
    const subcats = getSubcategoriesForCategory(newCategory);
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      subcategory: subcats[0] || 'Other',
    }));
    if (error) setError('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const resourceId = resource._id || resource.id;
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        subcategory: formData.subcategory,
        academicMetadata: showAcademicFields ? formData.academicMetadata : undefined,
        location: {
          campus: formData.campus,
          building: formData.building.trim(),
          room: formData.room.trim(),
        },
        availabilityStatus: formData.availabilityStatus,
        condition: formData.condition,
        quantity: parseInt(formData.quantity, 10) || 1,
        images: formData.imageUrl.trim() ? [formData.imageUrl.trim()] : resource.images,
      };

      const result = await updateResource(resourceId, payload, token);
      if (onSuccess) {
        onSuccess(result.data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update resource');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Resource Listing">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleCategoryChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm"
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Subcategory
            </label>
            <select
              name="subcategory"
              value={formData.subcategory}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm"
            >
              {currentSubcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Campus
            </label>
            <select
              name="campus"
              value={formData.campus}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm"
            >
              {campusOptions.map((camp) => (
                <option key={camp} value={camp}>
                  {camp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showAcademicFields && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Academic & Book Details (Optional)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.academicMetadata.subject}
                  onChange={handleAcademicChange}
                  placeholder="e.g. Mathematics"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Branch</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.academicMetadata.branch}
                  onChange={handleAcademicChange}
                  placeholder="e.g. CSE / Mechanical"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Book / Material Title</label>
                <input
                  type="text"
                  name="bookTitle"
                  value={formData.academicMetadata.bookTitle}
                  onChange={handleAcademicChange}
                  placeholder="e.g. Higher Engineering Math"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Author</label>
                <input
                  type="text"
                  name="author"
                  value={formData.academicMetadata.author}
                  onChange={handleAcademicChange}
                  placeholder="e.g. Dr. B.S. Grewal"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Edition</label>
                <input
                  type="text"
                  name="edition"
                  value={formData.academicMetadata.edition}
                  onChange={handleAcademicChange}
                  placeholder="e.g. 44th Edition"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">Class / Semester</label>
                <input
                  type="text"
                  name="classLevel"
                  value={formData.academicMetadata.classLevel}
                  onChange={handleAcademicChange}
                  placeholder="e.g. 2nd Year / Sem 3"
                  className="w-full px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Status
            </label>
            <select
              name="availabilityStatus"
              value={formData.availabilityStatus}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            >
              <option value="available">Available</option>
              <option value="unavailable">Booking Req.</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Condition
            </label>
            <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            >
              <option value="new">New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="needs repair">Needs Repair</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs"
            />
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={isSubmitting ? Loader2 : Save}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

