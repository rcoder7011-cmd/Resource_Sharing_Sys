import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { resolveImageUrl } from '../../services/resourceService';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * ImageUploadField Component
 * Allows users to select image files directly from their laptop/computer
 * with drag-and-drop, instant preview, format/size validation, and remove/replace controls.
 */
export default function ImageUploadField({
  value,
  onChange,
  disabled = false,
  label = 'Resource Photograph',
  hint = 'Select an image directly from your laptop (JPG, PNG, or WebP, up to 5MB).',
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [fileMeta, setFileMeta] = useState(null); // { name, size }
  const [previewUrl, setPreviewUrl] = useState('');

  // Sync initial/external value
  useEffect(() => {
    if (value) {
      setPreviewUrl(resolveImageUrl(value));
    } else {
      setPreviewUrl('');
      setFileMeta(null);
    }
  }, [value]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = (file) => {
    setValidationError('');

    if (!file) return;

    // Validate type
    if (!SUPPORTED_TYPES.includes(file.type.toLowerCase())) {
      setValidationError(
        'Unsupported image format. Please select a valid JPG, PNG, or WebP image.'
      );
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setValidationError(
        `File is too large (${formatFileSize(file.size)}). Please choose an image under 5MB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target.result;
      setPreviewUrl(dataUri);
      setFileMeta({
        name: file.name,
        size: file.size,
        type: file.type,
      });

      if (typeof onChange === 'function') {
        onChange(dataUri, {
          name: file.name,
          size: file.size,
          type: file.type,
          file,
        });
      }
    };

    reader.onerror = () => {
      setValidationError('Failed to read selected image file. Please try another file.');
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input value so selecting the same file again triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewUrl('');
    setFileMeta(null);
    setValidationError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (typeof onChange === 'function') {
      onChange('', null);
    }
  };

  const triggerPicker = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {fileMeta && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Image Ready
          </span>
        )}
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
        aria-label="Upload resource photograph"
      />

      {/* Error Message Alert */}
      {validationError && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
          <div className="flex-1 font-medium">{validationError}</div>
          <button
            type="button"
            onClick={() => setValidationError('')}
            className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Zone / Active Preview */}
      {!previewUrl ? (
        <div
          onClick={triggerPicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
              : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-blue-500 dark:hover:bg-slate-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-900/60">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Click to browse or drag & drop an image from your laptop
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports JPG, JPEG, PNG, and WebP (up to 5MB)
              </p>
            </div>

            <button
              type="button"
              disabled={disabled}
              className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              Select Image File
            </button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm overflow-hidden space-y-3">
          {/* Image Preview Box */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-72 w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Resource preview"
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
              onError={() => {
                setValidationError('Could not render image preview. Please select another image file.');
              }}
            />

            {/* Quick Remove Floating Button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleRemove}
                title="Remove image"
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-md shadow-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Metadata & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {fileMeta?.name || 'Selected Photograph'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {fileMeta?.size ? formatFileSize(fileMeta.size) : 'Ready to be saved with listing'}
                </p>
              </div>
            </div>

            {/* Actions */}
            {!disabled && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={triggerPicker}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Change Image
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {hint && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
