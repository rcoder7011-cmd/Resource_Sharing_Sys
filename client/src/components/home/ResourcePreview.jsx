import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Sparkles } from 'lucide-react';
import { SAMPLE_RESOURCES, CATEGORIES } from '../../data/sampleResources';
import ResourceCard from '../resources/ResourceCard';
import Button from '../common/Button';

export default function ResourcePreview() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Categories');
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/resources?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/resources');
    }
  };

  // Filter preview list
  const filteredPreview = SAMPLE_RESOURCES.filter((r) => {
    const matchesCategory =
      activeCategory === 'All Categories' || r.category === activeCategory;
    const matchesSearch =
      searchTerm.trim() === '' ||
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  }).slice(0, 4);

  return (
    <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Resource Discovery Preview</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors">
            Available Facilities & Equipment
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl transition-colors">
            Explore active laboratory instruments, fabrication tooling, high-performance computing, and specialized spaces available for institutional sharing.
          </p>
        </div>

        <Button
          to="/resources"
          variant="outline"
          size="sm"
          icon={ArrowRight}
          iconPosition="right"
          className="self-start md:self-end"
        >
          View Full Catalog ({SAMPLE_RESOURCES.length})
        </Button>
      </div>

      {/* Search Bar & Category Shortcuts */}
      <div className="space-y-4 mb-10">
        <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
          <label htmlFor="preview-search" className="sr-only">
            Search resources
          </label>
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="preview-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by instrument name, laboratory, specifications..."
            className="w-full pl-10 pr-24 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
          >
            Find
          </button>
        </form>

        {/* Category Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORIES.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 dark:border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Preview Cards */}
      {filteredPreview.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredPreview.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="card-surface p-8 text-center text-sm text-slate-500 dark:text-slate-400 space-y-3">
          <p>No sample resources found in this category.</p>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('All Categories');
              setSearchTerm('');
            }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Institutional Demo Notice Footnote */}
      <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-900 flex items-center justify-between text-xs text-slate-500">
        <span>* Featured equipment highlights from participating academic institutions and labs.</span>
        <Link to="/resources" className="text-blue-600 dark:text-blue-400 hover:underline">
          Explore all {SAMPLE_RESOURCES.length} resources →
        </Link>
      </div>
    </section>
  );
}
