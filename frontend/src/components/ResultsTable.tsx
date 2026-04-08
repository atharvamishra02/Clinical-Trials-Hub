import React, { useState } from 'react';
import { ExternalLink, Beaker, Building2, Activity, Layers, Calendar } from 'lucide-react';

export interface Trial {
  nct_id: string;
  brief_title: string;
  phase: string;
  overall_status: string;
  study_type: string;
  sponsors?: string;
  agency_classes?: string;
  all_diseases?: string;
  drug_names?: string;
  intervention_types?: string;
  outcomes?: string;
  matched_conditions?: string;
  matched_drugs?: string;
  start_date?: string;
}

interface ResultsTableProps {
  trials: Trial[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const isInMatchedSet = (value: string, matchedStr?: string) => {
  if (!matchedStr) return false;
  const matched = matchedStr.split('|').map(s => s.trim().toLowerCase());
  return matched.some(m => value.toLowerCase().includes(m) || m.includes(value.toLowerCase()));
};

const ResultsTable: React.FC<ResultsTableProps> = ({ trials, isLoading, totalCount, page, totalPages, onPageChange }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (nctId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(nctId)) next.delete(nctId); else next.add(nctId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Analyzing clinical trials...</p>
        </div>
      </div>
    );
  }

  if (trials.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12">
          <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Matching Trials Found</h3>
          <p className="text-slate-500 dark:text-white/80 max-w-md mx-auto">
            Try broadening your search or checking for different keywords. Our AI handles natural language, so you can try describing the trial in different words.
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s.includes('RECRUITING')) return 'bg-emerald-500/10 text-emerald-600 dark:text-white border-emerald-500/20';
    if (s.includes('ACTIVE')) return 'bg-amber-500/10 text-amber-600 dark:text-white border-amber-500/20';
    if (s.includes('COMPLETED')) return 'bg-indigo-500/10 text-indigo-600 dark:text-white border-indigo-500/20';
    return 'bg-slate-500/10 text-slate-600 dark:text-white border-slate-500/20';
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Results</h2>
          <p className="text-[13px] text-slate-400 dark:text-slate-500 font-medium">
            {((page - 1) * 50) + 1}–{Math.min(page * 50, totalCount)} of {totalCount.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="glass liquid-shadow-lg rounded-2xl overflow-hidden mb-5">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/40 dark:border-slate-800/40">
                <th className="px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black dark:text-white">Clinical ID</th>
                <th className="px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black dark:text-white w-[40%]">Study Title</th>
                <th className="px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black dark:text-white">Phase</th>
                <th className="px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black dark:text-white">Start Date</th>
                <th className="px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black dark:text-white">Lead Sponsors</th>
                <th className="px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-black dark:text-white">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/30">
              {trials.map((trial) => (
                <tr key={trial.nct_id} className="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all duration-300">
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <a href={`https://clinicaltrials.gov/study/${trial.nct_id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-mono text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50/80 dark:bg-indigo-900/20 w-fit px-2 py-0.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                        {trial.nct_id}
                        <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                      </a>
                      <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border w-fit ${getStatusColor(trial.overall_status)}`}>
                        {trial.overall_status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                       <p title={trial.brief_title} className="text-[15px] font-medium text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                          {trial.brief_title}
                       </p>
                       <div className="flex flex-wrap gap-1 mt-1.5">
                          {(() => {
                            const diseaseTags = (trial.all_diseases || '').split('|').filter(d => d.trim()).map(d => ({
                              label: d.trim(), type: 'disease' as const, matched: isInMatchedSet(d.trim(), trial.matched_conditions)
                            }));
                            const drugTags = (trial.drug_names || '').split('|').filter(d => d.trim()).map(d => ({
                              label: d.trim(), type: 'drug' as const, matched: isInMatchedSet(d.trim(), trial.matched_drugs)
                            }));
                            const allTags = [...diseaseTags, ...drugTags].sort((a, b) => (b.matched ? 1 : 0) - (a.matched ? 1 : 0));
                            const isExpanded = expandedRows.has(trial.nct_id);
                            const visible = isExpanded ? allTags : allTags.slice(0, 4);
                            const remaining = allTags.length - 4;
                            return (
                              <>
                                {visible.map((tag, idx) => (
                                  <span key={`${tag.type}-${idx}`} title={tag.label}
                                    className={`text-[12px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-0.5 border ${
                                      tag.matched
                                        ? tag.type === 'disease'
                                          ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/30 ring-1 ring-amber-400/20'
                                          : 'bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/30 ring-1 ring-rose-400/20'
                                        : tag.type === 'disease'
                                          ? 'bg-indigo-50/80 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border-transparent'
                                          : 'bg-emerald-50/80 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 border-transparent'
                                    }`}
                                  >
                                    {tag.type === 'disease' ? <Activity className="w-2 h-2" /> : <Beaker className="w-2 h-2" />}
                                    {tag.label}
                                  </span>
                                ))}
                                {remaining > 0 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(trial.nct_id); }}
                                    className="text-[12px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
                                  >
                                    {isExpanded ? 'Less' : `+${remaining}`}
                                  </button>
                                )}
                              </>
                            );
                          })()}
                       </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[14px]">
                       <Layers className="w-3 h-3 text-indigo-400" />
                       <span className="text-slate-600 dark:text-slate-300 font-medium">{trial.phase || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-[14px]">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        {trial.start_date ? new Date(trial.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 max-w-[180px]">
                      <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span title={trial.sponsors || 'Global Academic / NIH'} className="text-[14px] text-slate-500 dark:text-slate-400 truncate group-hover:whitespace-normal font-medium transition-all duration-300">
                        {trial.sponsors || 'Global Academic / NIH'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="bg-slate-50/60 dark:bg-slate-800/20 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/20 group-hover:bg-white/60 dark:group-hover:bg-slate-800/40 group-hover:border-indigo-200/30 transition-all duration-300">
                      <p title={trial.outcomes || "Outcome measures tracking primary safety and efficacy endpoints across target cohorts."} className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 group-hover:line-clamp-none italic transition-all duration-300">
                        {trial.outcomes || "Outcome measures tracking primary safety and efficacy endpoints across target cohorts."}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="glass liquid-shadow flex items-center justify-between rounded-xl px-5 py-3">
        <p className="text-[12px] font-medium text-slate-400 dark:text-slate-500">
          Page <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{page}</span> of {totalPages}
        </p>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-lg transition-all disabled:opacity-25"
          >
            ← Prev
          </button>
          
          <div className="flex items-center gap-0.5 hidden md:flex">
             {[...Array(Math.min(5, totalPages))].map((_, i) => {
               const pageNum = page <= 3 ? i + 1 : page + i - 2;
               if (pageNum > totalPages) return null;
               return (
                 <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-[12px] font-semibold transition-all duration-200 ${page === pageNum ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'}`}
                 >
                   {pageNum}
                 </button>
               );
             })}
          </div>

          <button 
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-lg transition-all disabled:opacity-25"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;
