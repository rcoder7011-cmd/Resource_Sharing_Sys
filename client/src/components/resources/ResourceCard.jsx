import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Building, ShieldCheck, ArrowRight, ImageOff } from 'lucide-react';
import Badge from '../common/Badge';

/**
 * Reusable Resource Card component with image fallbacks and institutional metadata.
 */
export default function ResourceCard({ resource }) {
  const [imgError, setImgError] = useState(false);

  const fallbackImage =
    'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=800&q=80';

  const resourceId = resource._id || resource.id || resource.slug;
  const resourceTitle = resource.title || resource.name;
  const campusLocation =
    typeof resource.location === 'object'
      ? resource.location?.campus || 'Main Academic Campus'
      : resource.location || 'Main Academic Campus';

  const availabilityText =
    resource.availability ||
    (resource.availabilityStatus === 'available'
      ? 'Available Now'
      : resource.availabilityStatus === 'unavailable'
      ? 'Currently Unavailable'
      : 'Maintenance');

  const badgeVariant =
    resource.badgeVariant ||
    (resource.availabilityStatus === 'available'
      ? 'available'
      : resource.availabilityStatus === 'unavailable'
      ? 'warning'
      : 'neutral');

  const institutionLabel =
    resource.institution ||
    (resource.owner?.name ? `Listed by ${resource.owner.name}` : 'Institutional Facility');

  const isSampleItem =
    resource.isSample ||
    (typeof resource.id === 'string' && resource.id.includes('-'));

  const resourceTypeLabel =
    resource.type ||
    (resource.resourceType === 'space' ? 'Facility Space' : 'Specialized Equipment');

  const accessPrerequisite =
    resource.accessRequirements?.[0] ||
    (Array.isArray(resource.eligibility) && resource.eligibility[0]) ||
    'Standard Safety Briefing';

  return (
    <article className="card-surface card-surface-hover flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Card Image with Badges */}
        <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
          {!imgError ? (
            <img
              src={resource.images?.[0] || fallbackImage}
              alt={resourceTitle}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-500 text-xs p-4 text-center">
              <ImageOff className="w-8 h-8 mb-2 opacity-50" />
              <span>Image preview unavailable</span>
            </div>
          )}

          {/* Availability Badge Overlay */}
          <div className="absolute top-3 left-3">
            <Badge variant={badgeVariant} size="sm">
              {availabilityText}
            </Badge>
          </div>

          {/* Category Chip & Subcategory */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700/60">
              {resource.category}
            </span>
            {resource.subcategory && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-blue-950/80 backdrop-blur-md text-blue-300 border border-blue-800/50">
                {resource.subcategory}
              </span>
            )}
          </div>

          {/* Facility Status Tag */}
          <div className="absolute bottom-2 left-3">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                isSampleItem
                  ? 'bg-blue-950/90 text-blue-300 border border-blue-800/60'
                  : 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/60'
              }`}
            >
              {isSampleItem ? 'Institutional Facility' : 'Verified Listing'}
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 space-y-3">
          {/* Institution / Owner Label */}
          <p className="text-xs font-medium text-slate-400 flex items-center gap-1.5 line-clamp-1">
            <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{institutionLabel}</span>
          </p>

          {/* Resource Title */}
          <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
            <Link to={`/resources/${resourceId}`} className="focus:outline-none">
              {resourceTitle}
            </Link>
          </h3>

          {/* Summary / Description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {resource.summary || resource.description}
          </p>

          {/* Academic Info if available */}
          {(resource.academicMetadata?.author ||
            resource.academicMetadata?.branch ||
            resource.academicMetadata?.subject) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-blue-300/90 bg-blue-950/40 px-2 py-1 rounded-md border border-blue-900/30">
              {resource.academicMetadata.author && (
                <span className="font-medium">By {resource.academicMetadata.author}</span>
              )}
              {resource.academicMetadata.edition && (
                <span className="text-slate-400">• {resource.academicMetadata.edition}</span>
              )}
              {resource.academicMetadata.branch && !resource.academicMetadata.author && (
                <span className="truncate">{resource.academicMetadata.branch}</span>
              )}
            </div>
          )}

          {/* Location & Quantity details */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 truncate max-w-[60%]">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{campusLocation}</span>
            </span>
            <span className="text-[11px] font-medium text-slate-300 shrink-0">
              {resource.availableQuantity !== undefined
                ? `${resource.availableQuantity} of ${resource.quantity || 1} available`
                : `${resource.quantity || 1} unit(s)`}
            </span>
          </div>

          {/* Access Safety Level */}
          {accessPrerequisite && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/50 px-2.5 py-1.5 rounded-md border border-slate-800/60">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{accessPrerequisite}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 pb-5 pt-2">
        <Link
          to={`/resources/${resourceId}`}
          className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white transition-all border border-slate-700/80 hover:border-blue-500"
        >
          <span>View Details & Specs</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </article>
  );
}
