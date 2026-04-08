import { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, SlidersHorizontal, ChevronDown, Layers, Activity, Calendar, Briefcase } from 'lucide-react';

interface SearchProps {
  onSearch: (query: string, filters?: Record<string, string[]>) => void;
  isLoading: boolean;
  summary?: any;
  initialQuery?: string;
  initialFilters?: Record<string, string[]>;
}

const Search: React.FC<SearchProps> = ({ onSearch, isLoading, summary, initialQuery = '', initialFilters = {} }) => {
  const [query, setQuery] = useState(initialQuery);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Phase');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(initialFilters);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter panel on click outside
  useEffect(() => {
    if (!isFilterOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  // Sync state if props change (useful for refresh/direct link entry)
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
    if (initialFilters && Object.keys(initialFilters).length > 0) setSelectedFilters(initialFilters);
  }, [initialQuery, initialFilters]);

  const toggleFilter = (category: string, option: string) => {
    setSelectedFilters(prev => {
      const current = prev[category] || [];
      const updated = current.includes(option)
        ? current.filter(item => item !== option)
        : [...current, option];
      return { ...prev, [category]: updated };
    });
  };

  const totalActiveFilters = Object.values(selectedFilters).flat().length;

  const clearFilters = () => setSelectedFilters({});

  const dynamicInterventions = summary?.drugs?.map((d: any) => d.name).filter(Boolean) || [];
  const dynamicConditions = summary?.diseases?.map((d: any) => d.name).filter(Boolean) || [];
  const dynamicPhases = summary?.phases?.map((p: any) => p.phase).filter(Boolean) || [];
  const dynamicSponsors = summary?.sponsors?.map((s: any) => s.name).filter(Boolean) || [];

  const filterCategories = [
    { id: 'Phase', icon: <Layers className="w-4 h-4" />, label: 'Phase', 
      options: dynamicPhases.length > 0 ? dynamicPhases : ['Early Phase 1', 'Phase 1', 'Phase 1/Phase 2', 'Phase 2', 'Phase 2/Phase 3', 'Phase 3', 'Phase 4', 'Not Applicable'] 
    },
    { id: 'Status', icon: <Calendar className="w-4 h-4" />, label: 'Status', 
      options: ['ACTIVE_NOT_RECRUITING', 'APPROVED_FOR_MARKETING', 'AVAILABLE', 'COMPLETED', 'ENROLLING_BY_INVITATION', 'NOT_YET_RECRUITING', 'NO_LONGER_AVAILABLE', 'RECRUITING', 'SUSPENDED', 'TEMPORARILY_NOT_AVAILABLE', 'TERMINATED', 'UNKNOWN', 'WITHDRAWN', 'WITHHELD'] 
    },
    ...(dynamicInterventions.length > 0 ? [{ 
      id: 'Specific Intervention', icon: <Activity className="w-4 h-4" />, label: 'Interventions', 
      options: dynamicInterventions
    }] : []),
    ...(dynamicConditions.length > 0 ? [{
      id: 'Specific Condition', icon: <Activity className="w-4 h-4" />, label: 'Conditions',
      options: dynamicConditions
    }] : []),
    { id: 'Sponsor', icon: <Briefcase className="w-4 h-4" />, label: 'Sponsors', 
      options: dynamicSponsors.length > 0 ? dynamicSponsors : ['INDUSTRY', 'NIH', 'U.S. FED', 'OTHER', 'OTHER_GOV'] 
    },

  ];

  return (
    <div ref={filterRef} className={`w-full max-w-3xl mx-auto px-4 py-8 relative ${isFilterOpen ? 'z-50' : 'z-10'}`}>
      <div className="relative">
        {/* Search bar — liquid glass pill */}
        <div className="glass liquid-shadow-lg relative flex items-center rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-indigo-500/10">
          <div className="flex items-center pl-5 text-slate-400 dark:text-slate-500">
            <SearchIcon className="w-4 h-4" />
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              className="w-full py-4 px-3 bg-transparent outline-none text-[15px] text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 font-medium"
              placeholder="Search trials targeting EGFR in oncology..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && query.trim() && !isLoading) onSearch(query, selectedFilters); }}
            />
          </div>

          <div className="flex items-center gap-1.5 pr-2.5 py-2">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 text-[13px] font-medium ${isFilterOpen ? 'bg-indigo-100/80 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
              {totalActiveFilters > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{totalActiveFilters}</span>
              )}
              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            <button 
              onClick={() => onSearch(query, selectedFilters)}
              disabled={isLoading || !query.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 text-white px-5 py-2 rounded-xl transition-all duration-300 active:scale-95 font-semibold text-[13px] shadow-md shadow-indigo-500/20"
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <SearchIcon className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>

        {/* Floating Filter Panel — liquid glass */}
        {isFilterOpen && (
          <div className="absolute top-full left-0 right-0 mt-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row gap-0 min-h-[420px] rounded-3xl overflow-hidden">
              
              {/* Sidebar */}
              <div className="w-full md:w-56 flex flex-col border-r border-slate-200/30 dark:border-slate-800/30">
                <div className="p-5">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] mb-4 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3 h-3" />
                    Filters
                  </p>
                  <div className="space-y-0.5">
                    {filterCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 ${
                          activeTab === cat.id 
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className={`transition-transform duration-300 ${activeTab === cat.id ? 'scale-110' : 'opacity-60'}`}>
                          {cat.icon}
                        </div>
                        <span className="truncate">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-auto p-5 border-t border-slate-200/20 dark:border-slate-800/20">
                  <p className="text-[11px] text-slate-400 dark:text-slate-600 font-medium mb-3">
                    {totalActiveFilters === 0 ? 'No active filters' : `${totalActiveFilters} active`}
                  </p>
                  <button 
                    onClick={clearFilters}
                    className="w-full px-3 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700/30 hover:border-indigo-300 dark:hover:border-indigo-800"
                  >
                    Reset All
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                  <header className="mb-6">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"></div>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.15em]">{activeTab}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                      {filterCategories.find(c => c.id === activeTab)?.label}
                    </h3>
                  </header>

                  <div className="flex flex-wrap gap-2">
                    {filterCategories.find(c => c.id === activeTab)?.options.map((opt: string) => {
                      const isActive = (selectedFilters[activeTab] || []).includes(opt);
                      return (
                        <button 
                          key={opt} 
                          onClick={() => toggleFilter(activeTab, opt)}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-200 text-left whitespace-nowrap ${
                            isActive 
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-transparent shadow-md shadow-indigo-500/15 text-white' 
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-sm text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="text-[13px] font-medium">{opt}</span>
                          <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            isActive ? 'bg-white border-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isActive && <div className="w-1 h-1 rounded-full bg-indigo-600"></div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Bar */}
                <footer className="p-5 md:px-8 border-t border-slate-200/20 dark:border-slate-800/20 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => {
                      onSearch(query, selectedFilters);
                      setIsFilterOpen(false);
                    }}
                    className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-[13px] font-semibold shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apply Filters
                  </button>
                </footer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
