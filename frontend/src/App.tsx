import { useState, useEffect, useCallback } from 'react';
import Search from './components/Search';
import ThemeToggle from './components/ThemeToggle';
import ResultsTable from './components/ResultsTable';
import type { Trial } from './components/ResultsTable';
import OverviewCharts from './components/OverviewCharts';

function App() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [lastQuery, setLastQuery] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [filteredSummary, setFilteredSummary] = useState<any>(null);

  const [lastFilters, setLastFilters] = useState<Record<string, string[]>>({});
  const [parsedPhases, setParsedPhases] = useState<string[]>([]);

  const handleSearch = useCallback(async (query: string, filters: Record<string, string[]> = {}, targetPage: number = 1, isInitialLoad: boolean = false) => {
    if (!query && !isInitialLoad) return;
    
    setIsLoading(true);
    setHasSearched(true);
    setLastQuery(query);
    setLastFilters(filters);
    setPage(targetPage);
    // Don't clear previous results — keep them visible during loading

    // Update URL without reloading
    if (!isInitialLoad) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', query);
      url.searchParams.set('page', targetPage.toString());
      if (Object.keys(filters).length > 0) {
        url.searchParams.set('filters', JSON.stringify(filters));
      } else {
        url.searchParams.delete('filters');
      }
      window.history.pushState({}, '', url);
    }

    try {
      const apiBase = (window as any).__RUNTIME_CONFIG__?.API_URL || import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters, page: targetPage, limit: 50 })
      });
      const data = await response.json();
      setTrials(data.results || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      
      if (data.summary) {
        setSummary(data.summary);
      }
      if (data.filteredSummary) {
        setFilteredSummary(data.filteredSummary);
      } else if (data.summary) {
        setFilteredSummary(data.summary);
      }

      setParsedPhases(data.parsed?.phases || []);
      
      // Scroll to top of results
      if (targetPage > 1) {
        window.scrollTo({ top: 400, behavior: 'smooth' });
      }
    } catch (error) {
      console.error("Search error:", error);
      setTrials([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore from URL on Load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const p = params.get('page');
    const f = params.get('filters');

    if (q) {
      const initialFilters = f ? JSON.parse(f) : {};
      const initialPage = p ? parseInt(p, 10) : 1;
      setLastQuery(q);
      setLastFilters(initialFilters);
      setPage(initialPage);
      handleSearch(q, initialFilters, initialPage, true);
    }
  }, [handleSearch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 dark:from-[#080b16] dark:via-[#0d1025] dark:to-[#0a0d1e] text-slate-800 dark:text-slate-200 font-sans selection:bg-indigo-200/60 dark:selection:bg-indigo-800/40 transition-colors duration-500 relative overflow-x-hidden">

      {/* ── Persistent gradient orbs (visible through glass) ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        {/* Top-left warm blob */}
        <div className="absolute -top-[200px] -left-[150px] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-400/25 via-violet-400/20 to-transparent dark:from-indigo-500/15 dark:via-violet-500/10 dark:to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
        {/* Center-right pink blob */}
        <div className="absolute top-[30%] -right-[100px] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-fuchsia-400/20 via-rose-400/15 to-transparent dark:from-fuchsia-500/10 dark:via-rose-500/8 dark:to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
        {/* Bottom-left teal blob */}
        <div className="absolute bottom-[10%] -left-[100px] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-emerald-400/20 via-cyan-400/15 to-transparent dark:from-emerald-500/12 dark:via-cyan-500/8 dark:to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />
        {/* Mid-center indigo blob */}
        <div className="absolute top-[55%] left-[40%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-indigo-400/15 via-purple-400/10 to-transparent dark:from-indigo-500/8 dark:via-purple-500/5 dark:to-transparent blur-[100px] animate-pulse" style={{ animationDuration: '9s' }} />
      </div>

      {/* Navigation */}
      <nav className="glass-strong sticky top-0 z-50 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white text-[11px] font-black">C</span>
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-slate-800 dark:text-white">ClinicalHub</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-500 dark:text-slate-400">
            <a href="#" className="text-indigo-600 dark:text-indigo-400 transition-colors">Explorer</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-white transition-colors">Intelligence</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-white transition-colors">Compare</a>
          </div>
          <div className="flex items-center gap-3">
             <ThemeToggle />
             <button className="text-[13px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">Sign In</button>
             <button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-1.5 rounded-xl text-[13px] font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 active:scale-[0.97]">Get Started</button>
          </div>
        </div>
      </nav>

      <div className="relative">
        <main>
          {/* Hero Section */}
          <section className="pt-20 pb-8 text-center relative z-20">
            <div className="max-w-3xl mx-auto px-4">
              <h1 className="text-3xl md:text-[2.75rem] font-bold tracking-tight mb-4 leading-[1.15] bg-clip-text text-transparent bg-gradient-to-b from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400">
                The Intelligence Hub for<br />Clinical Research.
              </h1>
              <p className="text-[15px] text-slate-500 dark:text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                Unify global clinical trials data with natural language intelligence and advanced visual analytics.
              </p>
              
              <Search 
                onSearch={handleSearch} 
                isLoading={isLoading} 
                summary={summary} 
                initialQuery={lastQuery}
                initialFilters={lastFilters}
              />
            </div>
          </section>
          
          {hasSearched && (
            <OverviewCharts summary={filteredSummary || summary} isLoading={isLoading} trials={trials} hasPhaseFilter={parsedPhases.length > 0} />
          )}

          {/* Results / Feature Cards */}
          <section className="pb-20">
            {hasSearched ? (
              <ResultsTable 
                trials={trials} 
                isLoading={isLoading} 
                totalCount={totalCount}
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => handleSearch(lastQuery, lastFilters, p)}
              />
            ) : (
              <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-5">
                <div className="glass liquid-shadow p-6 rounded-3xl hover:scale-[1.02] hover:liquid-shadow-lg transition-all duration-300 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                       <div className="w-4 h-4 bg-indigo-500 rounded-lg"></div>
                    </div>
                    <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-white">1.7M+ Records</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">Direct access to the full AACT dataset synced from ClinicalTrials.gov.</p>
                </div>
                <div className="glass liquid-shadow p-6 rounded-3xl hover:scale-[1.02] hover:liquid-shadow-lg transition-all duration-300 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-violet-500/5 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                       <div className="w-4 h-4 bg-violet-500 rounded-lg"></div>
                    </div>
                    <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-white">MeSH Intelligence</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">Automatic resolution of natural language terms to canonical MeSH medical entities.</p>
                </div>
                <div className="glass liquid-shadow p-6 rounded-3xl hover:scale-[1.02] hover:liquid-shadow-lg transition-all duration-300 group">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                       <div className="w-4 h-4 bg-emerald-500 rounded-lg"></div>
                    </div>
                    <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-white">Pattern Recognition</h3>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">Identify trends in Phase III outcomes and sponsor collaborations instantly.</p>
                </div>
              </div>
            )}
          </section>
          
          <footer className="py-8 text-center text-slate-400 dark:text-slate-600 text-[13px]">
            <p>© 2026 ClinicalHub Intelligence. All rights reserved.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
