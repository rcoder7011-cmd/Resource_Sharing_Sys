import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';
import ResourceCard from './ResourceCard';

/**
 * Responsive Grid displaying resource cards or empty/fallback states.
 */
export default function ResourceGrid({ resources, onResetFilters }) {
  if (!resources || resources.length === 0) {
    return (
      <div className="card-surface p-12 text-center max-w-lg mx-auto my-12 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
          <SearchX className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-white">No Matching Resources Found</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          No resources matched your search query or filter combination. Try clearing filters or searching with alternative keywords.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
