import React from 'react';
import { Search, RotateCcw, SlidersHorizontal, BookOpen } from 'lucide-react';
import {
  CATEGORIES,
  LOCATIONS,
  AVAILABILITY_OPTIONS,
  ACADEMIC_BRANCHES,
  getSubcategoriesForCategory,
  categorySupportsAcademicFields,
} from '../../data/sampleResources';

/**
 * Filter and Search controls bar for Explore Resources.
 * Supports Student Essentials, Books & Study Materials, Design, Gadgets, and academic metadata.
 */
export default function ResourceFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  selectedBranch,
  setSelectedBranch,
  selectedLocation,
  setSelectedLocation,
  selectedAvailability,
  setSelectedAvailability,
  sortBy,
  setSortBy,
  onResetFilters,
  totalResults,
}) {
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'All Categories' ||
    (selectedSubcategory && selectedSubcategory !== 'All Subcategories') ||
    (selectedBranch && selectedBranch !== 'All Branches') ||
    selectedLocation !== 'All Campuses' ||
    selectedAvailability !== 'All Statuses';

  const subcategoryList =
    selectedCategory !== 'All Categories'
      ? ['All Subcategories', ...getSubcategoriesForCategory(selectedCategory)]
      : [];

  const showBranchFilter =
    selectedCategory === 'All Categories' ||
    categorySupportsAcademicFields(selectedCategory);

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    if (setSelectedSubcategory) {
      setSelectedSubcategory('All Subcategories');
    }
  };

  return (
    <div className="space-y-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
      {/* Top Search Input & Sort row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <label htmlFor="resource-search" className="sr-only">
            Search resources
          </label>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="resource-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item, book title, author, course, instrument, calculator..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="sort-select" className="text-xs text-slate-400 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Sort:</span>
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="name-asc">Name (A – Z)</option>
            <option value="name-desc">Name (Z – A)</option>
          </select>
        </div>
      </div>

      {/* Category Pills Row */}
      <div className="overflow-x-auto pb-1 pt-1 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory Pills Row (Visible when a specific category is selected) */}
      {subcategoryList.length > 0 && (
        <div className="pt-1 pb-1 overflow-x-auto scrollbar-thin border-t border-slate-800/50">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 uppercase tracking-wider">
              Subcategory:
            </span>
            {subcategoryList.map((sub) => {
              const isSelected = (selectedSubcategory || 'All Subcategories') === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubcategory && setSelectedSubcategory(sub)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                    isSelected
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 font-semibold'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Secondary Dropdown Filters Row */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Academic Branch Selector */}
          {showBranchFilter && setSelectedBranch && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Branch:</span>
              </span>
              <select
                value={selectedBranch || 'All Branches'}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 max-w-[200px] truncate"
              >
                {ACADEMIC_BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Location Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Campus:</span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Availability Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Availability:</span>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {AVAILABILITY_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count & Clear All */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400">
            Showing <strong className="text-white">{totalResults}</strong> available resources
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-500/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
