import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Clock,
  MapPin,
  Tag,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sliders,
  ChevronRight,
  TrendingDown,
  Layers,
  Info,
  ArrowRight,
  HelpCircle,
  Box,
} from 'lucide-react';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { getSmartMatches, parseNeedText } from '../services/recommendationService';

const EXAMPLE_PROMPTS = [
  {
    label: '📸 DSLR Camera for Campus Fest',
    text: 'I need a high-resolution DSLR camera with lenses for college event recording tomorrow at North Campus',
    category: 'Cameras',
    location: 'North Campus',
  },
  {
    label: '💻 GPU Workstation for ML',
    text: 'Looking for a high-performance computer or workstation for coding and deep learning simulations',
    category: 'Computers',
    location: '',
  },
  {
    label: '🔬 Oscilloscope for Circuit Lab',
    text: 'Need an oscilloscope or testing equipment for an electronics frequency measurement experiment',
    category: 'Testing Equipment',
    location: '',
  },
  {
    label: '👥 Meeting Room for Group Presentation',
    text: 'Reserve a quiet meeting room or conference space for student project discussion and presentation',
    category: 'Meeting Rooms',
    location: '',
  },
];

const CATEGORIES = [
  'All Categories',
  'Cameras',
  'Computers',
  'Laboratories',
  'Meeting Rooms',
  'Testing Equipment',
  'Electronics',
  'Workshop Tools',
  'Study Spaces',
];

const LOCATIONS = [
  'All Campuses',
  'North Campus',
  'South Campus',
  'Central Campus',
  'Tech Innovation Center',
];

export default function SmartMatchPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Form state
  const [needDescription, setNeedDescription] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All Categories');
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'All Campuses');
  const [resourceType, setResourceType] = useState('all'); // 'all' | 'equipment' | 'space'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Results & status state
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [matches, setMatches] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [parsedSignals, setParsedSignals] = useState(null);
  const [totalEvaluated, setTotalEvaluated] = useState(0);

  // Set default start/end dates (tomorrow 10:00 to 14:00) on first render
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(14, 0, 0, 0);

    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const toIsoLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setStartDate(toIsoLocal(tomorrow));
    setEndDate(toIsoLocal(tomorrowEnd));
  }, []);

  // Quick prompt chip selector
  const handleApplyExample = (example) => {
    setNeedDescription(example.text);
    if (example.category) setSelectedCategory(example.category);
    if (example.location) setSelectedLocation(example.location);
    setSearchError('');
  };

  // Submit search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (!needDescription.trim() && selectedCategory === 'All Categories' && selectedLocation === 'All Campuses') {
      setSearchError('Please enter a description of your need or select a specific category/location.');
      return;
    }

    if (startDate && endDate) {
      const s = new Date(startDate);
      const end = new Date(endDate);
      if (s >= end) {
        setSearchError('Reservation end time must be strictly after the start time.');
        return;
      }
      if (s.getTime() < Date.now() - 60000) {
        setSearchError('Booking start time cannot be in the past.');
        return;
      }
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const payload = {
        description: needDescription.trim(),
        category: selectedCategory !== 'All Categories' ? selectedCategory : '',
        location: selectedLocation !== 'All Campuses' ? selectedLocation : '',
        resourceType: resourceType !== 'all' ? resourceType : '',
        quantity: parseInt(quantity, 10) || 1,
        startAt: startDate ? new Date(startDate).toISOString() : null,
        endAt: endDate ? new Date(endDate).toISOString() : null,
        includeRescueBoost: true,
      };

      const response = await getSmartMatches(payload, token);

      if (response?.data) {
        setMatches(response.data);
        setAlternatives(response.alternatives || []);
        setParsedSignals(response.parsedSignals || null);
        setTotalEvaluated(response.totalEvaluated || 0);
      }
    } catch (err) {
      setSearchError(err.message || 'Failed to find matching resources. Please verify inputs.');
    } finally {
      setIsSearching(false);
    }
  };

  // Helper for match score color variant
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 60) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Need-First Smart Resource Matching</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Find the Exact Equipment or Space You Need
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Describe your academic goal, laboratory experiment, or campus event in plain language.
          Our transparent, rule-based matching engine verifies real-time booking availability,
          applies institutional eligibility, and ranks verified campus resources.
        </p>
      </div>

      {/* Main Need Input Form Card */}
      <div className="card-surface p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl space-y-6">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Natural Language Need Input */}
          <div className="space-y-2">
            <label htmlFor="needDescription" className="block text-sm font-semibold text-slate-200">
              What do you need? <span className="text-slate-400 font-normal">(Describe your project, required tools, or event)</span>
            </label>
            <div className="relative">
              <textarea
                id="needDescription"
                rows={3}
                value={needDescription}
                onChange={(e) => setNeedDescription(e.target.value)}
                placeholder="e.g., I need a high-resolution DSLR camera with a tripod for campus fest recording tomorrow afternoon at North Campus..."
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500 resize-none shadow-inner"
              />
              <div className="absolute right-3 bottom-3 text-slate-500 text-xs flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />
                <span>Text signal parsing</span>
              </div>
            </div>
          </div>

          {/* Prompt Idea Chips */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-400">Try an example need:</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyExample(ex)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs transition-colors flex items-center gap-1.5"
                >
                  <span>{ex.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Timing & Location Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800/80">
            {/* Preferred Category */}
            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-xs font-medium text-slate-300">
                Resource Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Preferred Location */}
            <div className="space-y-1.5">
              <label htmlFor="location" className="block text-xs font-medium text-slate-300">
                Preferred Campus
              </label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              >
                {LOCATIONS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Reservation Start Time */}
            <div className="space-y-1.5">
              <label htmlFor="startDate" className="block text-xs font-medium text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Start Time</span>
              </label>
              <input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Reservation End Time */}
            <div className="space-y-1.5">
              <label htmlFor="endDate" className="block text-xs font-medium text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>End Time</span>
              </label>
              <input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Toggle Advanced Filters */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Criteria (Quantity & Facility Type)'}</span>
            </button>

            <span className="text-[11px] text-slate-500">
              * Non-monetary institutional resources (budget not applicable)
            </span>
          </div>

          {/* Advanced Section */}
          {showAdvanced && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="quantity" className="block text-xs font-medium text-slate-300">
                  Required Quantity (Units)
                </label>
                <input
                  id="quantity"
                  type="number"
                  min={1}
                  max={50}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Facility vs. Equipment Filter
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'all', label: 'Any' },
                    { key: 'equipment', label: 'Equipment' },
                    { key: 'space', label: 'Spaces' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setResourceType(t.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                        resourceType === t.key
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error notice */}
          {searchError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Audits live capacity against approved reservations in real time.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSearching}
              icon={isSearching ? Loader2 : Sparkles}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 shadow-lg shadow-blue-600/25"
            >
              {isSearching ? 'Evaluating Matches...' : 'Find Smart Matches'}
            </Button>
          </div>
        </form>
      </div>

      {/* Extracted Parser Signals Banner */}
      {parsedSignals && (parsedSignals.inferredCategories.length > 0 || parsedSignals.inferredLocations.length > 0 || parsedSignals.inferredIntents.length > 0) && (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Detected Signals:
          </span>
          {parsedSignals.inferredCategories.map((c) => (
            <span key={c} className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-300 border border-blue-500/20">
              Category: {c}
            </span>
          ))}
          {parsedSignals.inferredLocations.map((l) => (
            <span key={l} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              Location: {l}
            </span>
          ))}
          {parsedSignals.inferredIntents.map((intent) => (
            <span key={intent} className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Activity: {intent}
            </span>
          ))}
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-6">
        {isSearching ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-semibold text-white">Evaluating institutional resources...</p>
            <p className="text-xs text-slate-500">Checking capacity constraints, eligibility, and keyword affinity</p>
          </div>
        ) : hasSearched && matches.length === 0 ? (
          <div className="p-10 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-4 max-w-2xl mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
              <Box className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Exact Matches Found</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We couldn't find an available resource matching all your criteria.
                Try broadening your preferred campus, adjusting the reservation time window, or selecting another category.
              </p>
            </div>
          </div>
        ) : matches.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Ranked Smart Matches ({matches.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Evaluated across {totalEvaluated} institutional resources with live capacity verification
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Sorted by Explainable Score
              </span>
            </div>

            {/* Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {matches.map((item, idx) => {
                const res = item.resource;
                const capacity = item.capacity;
                const score = item.matchScore;
                const isUnderused = item.isUnderused;

                return (
                  <div
                    key={res.id || res._id}
                    className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group shadow-lg"
                  >
                    {/* Top rank & score banner */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                          <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                            <Link to={`/resources/${res.id || res._id}`}>
                              {res.title || res.name}
                            </Link>
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {res.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {res.location?.campus || 'Campus'}
                          </span>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className={`px-3 py-1.5 rounded-xl border text-center font-bold shrink-0 ${getScoreColor(score)}`}>
                        <span className="text-sm">{score}%</span>
                        <span className="block text-[9px] uppercase tracking-wider font-semibold opacity-80">Match</span>
                      </div>
                    </div>

                    {/* Image and Description */}
                    <div className="flex gap-4 items-start">
                      {res.images && res.images.length > 0 && (
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-800 bg-slate-950">
                          <img
                            src={res.images[0]}
                            alt={res.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {res.description}
                      </p>
                    </div>

                    {/* Smart Resource Rescue Badge (Part 11) */}
                    {isUnderused && (
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-purple-400 shrink-0" />
                          <span className="font-semibold">Smart Rescue: Underused Campus Resource</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-200">
                          &lt;20% Booked
                        </span>
                      </div>
                    )}

                    {/* Explainable Matching Reasons */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                        Why this matched your need:
                      </span>
                      <ul className="space-y-1 text-slate-300">
                        {item.explanations.slice(0, 3).map((exp, expIdx) => (
                          <li key={expIdx} className="flex items-start gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Availability Footer & Booking Action */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="font-semibold text-slate-200">
                            {capacity.availableCapacity} of {capacity.totalCapacity} units free
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {capacity.hasOverlap ? `${capacity.currentlyBooked} reserved in this window` : 'No conflicting reservations'}
                        </span>
                      </div>

                      <Link
                        to={`/resources/${res.id || res._id}?startAt=${encodeURIComponent(startDate)}&endAt=${encodeURIComponent(endDate)}&quantity=${quantity}`}
                      >
                        <Button
                          variant="primary"
                          size="sm"
                          icon={ArrowRight}
                          className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          Book Resource
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Alternative Recommendations Section */}
        {hasSearched && alternatives.length > 0 && (
          <div className="pt-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Alternative Recommendations ({alternatives.length})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Resources that differ in specific constraints (location, category, or timing)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {alternatives.map((alt) => {
                const res = alt.resource;
                return (
                  <div
                    key={res.id || res._id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 block truncate">
                        {alt.constraintReason}
                      </span>
                      <h4 className="text-sm font-bold text-white hover:text-blue-400 transition-colors pt-1">
                        <Link to={`/resources/${res.id || res._id}`}>
                          {res.title || res.name}
                        </Link>
                      </h4>
                      <p className="text-xs text-slate-400">
                        {res.category} • {res.location?.campus}
                      </p>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {res.description}
                    </p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-mono">
                        {alt.matchScore}% score
                      </span>
                      <Link
                        to={`/resources/${res.id || res._id}`}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <span>View</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

