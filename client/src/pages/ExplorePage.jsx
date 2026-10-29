import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, Layers, Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { SAMPLE_RESOURCES } from '../data/sampleResources';
import ResourceFilters from '../components/resources/ResourceFilters';
import ResourceGrid from '../components/resources/ResourceGrid';
import Button from '../components/common/Button';
import { getResources } from '../services/resourceService';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filter state from URL query parameters if present
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All Categories';
  const initialSubcategory = searchParams.get('subcategory') || 'All Subcategories';
  const initialBranch = searchParams.get('branch') || 'All Branches';
  const initialLocation = searchParams.get('location') || 'All Campuses';
  const initialAvailability = searchParams.get('availability') || 'All Statuses';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialSubcategory);
  const [selectedBranch, setSelectedBranch] = useState(initialBranch);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedAvailability, setSelectedAvailability] = useState(initialAvailability);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(initialPage);

  // API State
  const [backendResources, setBackendResources] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1,
    limit: 9,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [dataSource, setDataSource] = useState('live'); // 'live' | 'sample-fallback'

  // Fetch from backend API
  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await getResources({
        search: searchQuery,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        branch: selectedBranch,
        location: selectedLocation,
        availability: selectedAvailability,
        sortBy,
        page: currentPage,
        limit: 9,
      });

      if (response?.data) {
        setBackendResources(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
        setDataSource('live');
      }
    } catch (err) {
      // If backend is unreachable or DB is disconnected, gracefully fallback to local sample data
      setFetchError(err.message || 'The catalog is temporarily in offline mode.');
      setDataSource('sample-fallback');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedBranch,
    selectedLocation,
    selectedAvailability,
    sortBy,
    currentPage,
  ]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Synchronize state with URL search param changes
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams, searchQuery]);

  // Fallback in-memory filter logic for sample data when backend is unreachable
  const fallbackFilteredResources = useMemo(() => {
    let result = [...SAMPLE_RESOURCES];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.title && item.title.toLowerCase().includes(q)) ||
          item.summary.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.institution.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.subcategory && item.subcategory.toLowerCase().includes(q)) ||
          (item.academicMetadata?.subject && item.academicMetadata.subject.toLowerCase().includes(q)) ||
          (item.academicMetadata?.bookTitle && item.academicMetadata.bookTitle.toLowerCase().includes(q)) ||
          (item.academicMetadata?.author && item.academicMetadata.author.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'All Categories') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (selectedSubcategory && selectedSubcategory !== 'All Subcategories') {
      result = result.filter((item) => item.subcategory === selectedSubcategory);
    }

    if (selectedBranch && selectedBranch !== 'All Branches') {
      result = result.filter((item) =>
        item.academicMetadata?.branch
          ? item.academicMetadata.branch.toLowerCase().includes(selectedBranch.toLowerCase())
          : false
      );
    }

    if (selectedLocation !== 'All Campuses') {
      result = result.filter((item) => item.location.campus === selectedLocation);
    }

    if (selectedAvailability !== 'All Statuses') {
      result = result.filter((item) => item.availability === selectedAvailability);
    }

    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    selectedBranch,
    selectedLocation,
    selectedAvailability,
    sortBy,
  ]);

  // Active display items: live backend data or sample fallback
  const displayedResources =
    dataSource === 'live' ? backendResources : fallbackFilteredResources;

  const totalCount =
    dataSource === 'live' ? pagination.total : fallbackFilteredResources.length;

  // Handle filter resets
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedSubcategory('All Subcategories');
    setSelectedBranch('All Branches');
    setSelectedLocation('All Campuses');
    setSelectedAvailability('All Statuses');
    setSortBy('newest');
    setCurrentPage(1);
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
          <Layers className="w-3.5 h-3.5" />
          <span>Institutional Catalog</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight transition-colors">
              Explore Shared Resources
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed mt-1">
              Search scientific apparatus, computing clusters, and specialized labs across partner campuses.
            </p>
          </div>

          {/* Data Source Indicator */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                dataSource === 'live'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{dataSource === 'live' ? 'Live Institutional Catalog' : 'Offline Sample Mode'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Need-First Smart Match Discovery Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-white to-purple-50 dark:from-blue-950/40 dark:via-slate-900 dark:to-purple-950/30 border border-blue-200 dark:border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm dark:shadow-lg transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-600/15 dark:bg-blue-600/20 border border-blue-500/30 dark:border-blue-500/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Need-First Smart Matching</h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                New • Smart Match
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
              Describe your project in natural language (e.g. <em>"DSLR camera for college festival tomorrow"</em>) and receive ranked, availability-checked resource recommendations.
            </p>
          </div>
        </div>
        <Link to="/match" className="shrink-0 w-full sm:w-auto">
          <Button
            variant="primary"
            size="sm"
            icon={Sparkles}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 px-4"
          >
            Launch Smart Match
          </Button>
        </Link>
      </div>

      {/* Backend Offline / Notice Banner */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold">Notice: {fetchError}</p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Displaying offline demonstration catalog so your exploration remains uninterrupted.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchCatalog}
            icon={RefreshCw}
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <ResourceFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSubcategory={selectedSubcategory}
        setSelectedSubcategory={setSelectedSubcategory}
        selectedBranch={selectedBranch}
        setSelectedBranch={setSelectedBranch}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        selectedAvailability={selectedAvailability}
        setSelectedAvailability={setSelectedAvailability}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onResetFilters={handleResetFilters}
        totalResults={totalCount}
      />

      {/* Resource Grid Results or Loading Skeleton */}
      <section aria-label="Search results">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">
              Querying institutional resource catalog...
            </p>
          </div>
        ) : (
          <ResourceGrid
            resources={displayedResources}
            onResetFilters={handleResetFilters}
          />
        )}
      </section>

      {/* Pagination Controls */}
      {dataSource === 'live' && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Showing Page <span className="text-slate-900 dark:text-white font-semibold">{pagination.page}</span> of{' '}
            <span className="text-slate-900 dark:text-white font-semibold">{pagination.pages}</span> ({pagination.total} total resources)
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!pagination.hasPrevPage}
              onClick={() => handlePageChange(pagination.page - 1)}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!pagination.hasNextPage}
              onClick={() => handlePageChange(pagination.page + 1)}
              icon={ChevronRight}
              iconPosition="right"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Informative Status Footer */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>
            {dataSource === 'live'
              ? `Live Catalog: ${totalCount} resources available across participating facilities`
              : `Sample Catalog: Showing ${SAMPLE_RESOURCES.length} demonstration equipment items`}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Conflict-Free Scheduling & Verified Custody Active
        </span>
      </div>
    </div>
  );
}
