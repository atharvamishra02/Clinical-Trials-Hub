import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

import type { Trial } from './ResultsTable';

interface SummaryData {
  phases: { phase: string; count: string }[];
  sponsors?: { name: string; count: string }[];
  relationships?: { disease: string; drug: string; phase: string; count: string }[];
}

interface OverviewChartsProps {
  summary: SummaryData | null;
  isLoading: boolean;
  trials: Trial[];
  hasPhaseFilter?: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

const OverviewCharts: React.FC<OverviewChartsProps> = ({ summary, isLoading, trials, hasPhaseFilter = false }) => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [selectedCell, setSelectedCell] = useState<{ disease: string; drug: string; x: number; y: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ disease: string; drug: string; count: number; x: number; y: number } | null>(null);
  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const tickColor = isDark ? '#ffffff' : '#1e293b';

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 glass animate-pulse rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return null;

  // Clean phase data
  const phaseData = summary.phases
    .filter(p => p.phase && p.phase !== 'N/A' && p.phase !== 'Not Applicable')
    .map(p => {
       // Humanize phase name
       let name = p.phase;
       if (name === 'PHASE1') name = 'P-I';
       else if (name === 'PHASE2') name = 'P-II';
       else if (name === 'PHASE3') name = 'P-III';
       else if (name === 'PHASE4') name = 'P-IV';
       else if (name === 'PHASE1/PHASE2') name = 'P-I/II';
       else if (name === 'PHASE2/PHASE3') name = 'P-II/III';
       else if (name === 'EARLY_PHASE1') name = 'EP-I';
       return {
         name,
         value: parseInt(p.count, 10)
       };
    });

  const sponsorData = (summary.sponsors || []).map(s => ({
    name: s.name.length > 20 ? s.name.substring(0, 18) + '...' : s.name,
    fullName: s.name,
    value: parseInt(s.count, 10)
  }));

  // ---- Aggregate matched diseases/drugs across all trials ----
  const matchedDiseaseCounts = new Map<string, number>();
  const matchedDrugCounts = new Map<string, number>();
  for (const trial of trials) {
    if (trial.matched_conditions) {
      for (const d of trial.matched_conditions.split('|')) {
        const name = d.trim().toLowerCase();
        if (name) matchedDiseaseCounts.set(name, (matchedDiseaseCounts.get(name) || 0) + 1);
      }
    }
    if (trial.matched_drugs) {
      for (const d of trial.matched_drugs.split('|')) {
        const name = d.trim().toLowerCase();
        if (name) matchedDrugCounts.set(name, (matchedDrugCounts.get(name) || 0) + 1);
      }
    }
  }
  const matchedDiseaseData = Array.from(matchedDiseaseCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({
      name: name.length > 20 ? name.substring(0, 18) + '...' : name,
      fullName: name,
      value: count,
    }));
  const matchedDrugData = Array.from(matchedDrugCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({
      name: name.length > 20 ? name.substring(0, 18) + '...' : name,
      fullName: name,
      value: count,
    }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{payload[0].payload.fullName || payload[0].payload.name}</p>
          <p className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">
            {payload[0].value.toLocaleString()} Trials
          </p>
        </div>
      );
    }
    return null;
  };

  // ---- Build Heatmap + Stacked Bar Data from Table Trials ----
  const PHASE_COLORS: Record<string, string> = {
    'Phase 1': '#f59e0b',
    'Phase 2': '#8b5cf6',
    'Phase 3': '#6366f1',
    'Phase 4': '#10b981',
    'Early Phase 1': '#f43f5e',
    'N/A': '#64748b',
  };

  const diseaseCounts = new Map<string, number>();
  const drugCounts = new Map<string, number>();
  const heatmapData = new Map<string, Map<string, number>>();
  const drugPhaseData = new Map<string, Map<string, number>>();
  const cellPhaseMap = new Map<string, Map<string, number>>();

  // Determine if there was an active search filter for each category by checking for non-NULL matched columns
  const diseaseSearchActive = trials.some(t => t.matched_conditions !== null && t.matched_conditions !== undefined);
  const drugSearchActive = trials.some(t => t.matched_drugs !== null && t.matched_drugs !== undefined);

  trials.forEach(t => {
    // Priority logic:
    // 1. If we matched a search target, use it.
    // 2. If a search was active for this category but we didn't match, this row is 'noise' for this category -> set to null.
    // 3. If no search was active, fallback to the primary (first) term.
    const matchedD = t.matched_conditions?.trim() || null;
    const disease = matchedD ? matchedD.split('|')[0].trim().toLowerCase() : (diseaseSearchActive ? null : t.all_diseases?.split('|')[0]?.trim().toLowerCase());
    
    const matchedDr = t.matched_drugs?.trim() || null;
    const drug = matchedDr ? matchedDr.split('|')[0].trim().toLowerCase() : (drugSearchActive ? null : t.drug_names?.split('|')[0]?.trim().toLowerCase());
    
    const phase = t.phase || 'N/A';
    
    if (disease && drug) {
      diseaseCounts.set(disease, (diseaseCounts.get(disease) || 0) + 1);
      drugCounts.set(drug, (drugCounts.get(drug) || 0) + 1);
      
      if (!heatmapData.has(disease)) heatmapData.set(disease, new Map());
      heatmapData.get(disease)!.set(drug, (heatmapData.get(disease)!.get(drug) || 0) + 1);
      
      if (!drugPhaseData.has(drug)) drugPhaseData.set(drug, new Map());
      drugPhaseData.get(drug)!.set(phase, (drugPhaseData.get(drug)!.get(phase) || 0) + 1);
      
      // Track phases per cell for click detail
      const cellKey = `${disease}::${drug}`;
      if (!cellPhaseMap.has(cellKey)) cellPhaseMap.set(cellKey, new Map());
      cellPhaseMap.get(cellKey)!.set(phase, (cellPhaseMap.get(cellKey)!.get(phase) || 0) + 1);
    }
  });

  const topDiseases = Array.from(diseaseCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(e => e[0]);
  const topDrugs = Array.from(drugCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15).map(e => e[0]);

  let heatmapMax = 1;
  topDiseases.forEach(d => topDrugs.forEach(dr => {
    const v = heatmapData.get(d)?.get(dr) || 0;
    if (v > heatmapMax) heatmapMax = v;
  }));

  const getShortPhase = (phase: string) => {
    if (phase.includes('1') && phase.toLowerCase().includes('early')) return 'EP1';
    if (phase.includes('1')) return 'P1';
    if (phase.includes('2')) return 'P2';
    if (phase.includes('3')) return 'P3';
    if (phase.includes('4')) return 'P4';
    return 'N/A';
  };

  const getPhaseColor = (phase: string) => {
    for (const [key, color] of Object.entries(PHASE_COLORS)) {
      if (phase.toLowerCase().includes(key.toLowerCase())) return color;
    }
    return '#64748b';
  };

  return (
    <div className="max-w-7xl mx-auto px-6 mb-12">

      {/* ===== Heatmap + Stacked Bar Combo ===== */}
      {topDiseases.length > 0 && topDrugs.length > 0 && (
        <div className="mb-10 p-6 rounded-2xl glass liquid-shadow-lg relative" style={{ overflow: 'visible' }}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-t-2xl"></div>

          <header className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-white tracking-tight mb-0.5">Clinical Intelligence Matrix</h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Each cell shows the dominant phase · Click for full phase breakdown</p>
            </div>
            <div className="flex flex-wrap gap-2.5 items-center">
              {Object.entries(PHASE_COLORS).filter(([k]) => k !== 'N/A').map(([name, color]) => (
                <div key={name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{name}</span>
                </div>
              ))}
            </div>
          </header>

          {/* ---- HEATMAP ---- */}
          <div className="mb-10" style={{ overflow: 'visible' }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: `110px repeat(${topDrugs.length}, 1fr)`, gap: '3px' }}>
                <div className="p-1"></div>
                {topDrugs.map((drug, i) => (
                  <div key={i} className="p-1 text-center group/label relative">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider capitalize block leading-tight truncate cursor-default">{drug.length > 10 ? drug.slice(0,10) + '…' : drug}</span>
                    {drug.length > 10 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover/label:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap capitalize" style={{ zIndex: 9999 }}>{drug}</div>
                    )}
                  </div>
                ))}
                {topDiseases.map((disease, rIdx) => (
                  <React.Fragment key={rIdx}>
                    <div className="p-1 flex items-center justify-end group/dlabel relative">
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-right capitalize leading-tight truncate cursor-default">{disease.length > 14 ? disease.slice(0,14) + '…' : disease}</span>
                      {disease.length > 14 && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover/dlabel:opacity-100 transition-opacity pointer-events-none bg-slate-900 text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap capitalize" style={{ zIndex: 9999 }}>{disease}</div>
                      )}
                    </div>
                    {topDrugs.map((drug, cIdx) => {
                      const count = heatmapData.get(disease)?.get(drug) || 0;
                      
                      let dominantPhase = 'N/A';
                      let color = 'rgba(100,116,139,0.05)';
                      let shortLabel = '·';
                      
                      if (count > 0) {
                        const cellKey = `${disease}::${drug}`;
                        const phases = cellPhaseMap.get(cellKey);
                        if (phases) {
                          const sortedPhases = Array.from(phases.entries()).sort((a, b) => b[1] - a[1]);
                          if (sortedPhases.length > 0) {
                            dominantPhase = sortedPhases[0][0];
                            color = getPhaseColor(dominantPhase);
                            shortLabel = getShortPhase(dominantPhase);
                          }
                        }
                      }

                      return (
                        <div key={cIdx} className="rounded-md flex items-center justify-center relative cursor-pointer transition-colors"
                          style={{ backgroundColor: color, height: 36, zIndex: 1 }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.zIndex = '100';
                            if (count > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const tooltipW = 160, tooltipH = 120;
                              // Center above the cell
                              let tx = rect.left + rect.width / 2 - tooltipW / 2;
                              let ty = rect.top - tooltipH - 8;
                              // If goes off top, show below
                              if (ty < 8) ty = rect.bottom + 8;
                              // Clamp horizontally
                              if (tx < 8) tx = 8;
                              if (tx + tooltipW > window.innerWidth - 8) tx = window.innerWidth - tooltipW - 8;
                              setHoveredCell({ disease, drug, count, x: tx, y: ty });
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedCell) e.currentTarget.style.zIndex = '1';
                            setHoveredCell(null);
                          }}
                          onClick={(e) => {
                            if (count > 0) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setSelectedCell({ disease, drug, x: rect.left + rect.width / 2, y: rect.top - 8 });
                            }
                          }}>
                          <span className={`text-[10px] font-bold ${count > 0 ? 'text-white' : 'text-slate-400 dark:text-slate-700'}`}>{shortLabel}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* ---- HOVER TOOLTIP (fixed position, viewport-aware) ---- */}
          {hoveredCell && (
            <div className="fixed pointer-events-none w-40 bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-lg text-center" style={{ zIndex: 9999, left: hoveredCell.x, top: hoveredCell.y }}>
              <p className="text-purple-400 text-[10px] font-bold capitalize">{hoveredCell.disease}</p>
              <p className="text-slate-500 text-[9px] my-0.5">treated with</p>
              <p className="text-emerald-400 text-[10px] font-bold capitalize">{hoveredCell.drug}</p>
              <p className="text-white text-[15px] font-bold mt-1.5">{hoveredCell.count}<span className="text-[10px] text-slate-400 ml-1">trials</span></p>
              <p className="text-indigo-400 text-[9px] mt-1 font-semibold">Click for details</p>
            </div>
          )}

          {/* ---- CLICK DETAIL POPUP ---- */}
          {selectedCell && (() => {
            const cellKey = `${selectedCell.disease}::${selectedCell.drug}`;
            const phases = cellPhaseMap.get(cellKey);
            if (!phases) return null;
            const sorted = Array.from(phases.entries()).sort((a, b) => b[1] - a[1]);
            const total = sorted.reduce((s, [, c]) => s + c, 0);
            return (
              <>
                <div className="fixed inset-0 z-[9998]" onClick={() => setSelectedCell(null)}></div>
                <div className="fixed z-[9999] w-56 bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-lg"
                  style={{
                    left: Math.max(8, Math.min(selectedCell.x - 112, window.innerWidth - 240)),
                    top: Math.max(8, Math.min(selectedCell.y - 280, window.innerHeight - 320))
                  }}>
                  <button onClick={() => setSelectedCell(null)} className="absolute top-2 right-3 text-slate-500 hover:text-white text-sm font-bold transition-colors">×</button>
                  <p className="text-purple-400 text-[12px] font-bold capitalize mb-0.5">{selectedCell.disease}</p>
                  <p className="text-slate-500 text-[10px]">treated with</p>
                  <p className="text-emerald-400 text-[12px] font-bold capitalize mb-2.5">{selectedCell.drug}</p>
                  <div className="border-t border-slate-700 pt-2.5 space-y-1.5">
                    {sorted.map(([phase, count]) => (
                      <div key={phase} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPhaseColor(phase) }}></div>
                          <span className="text-white text-[11px] font-semibold">{phase}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(count / total) * 100}%`, backgroundColor: getPhaseColor(phase) }}></div>
                          </div>
                          <span className="text-white text-[12px] font-bold w-5 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-white text-[15px] font-bold mt-3">{total} <span className="text-[10px] text-slate-400">total trials</span></p>
                </div>
              </>
            );
          })()}


        </div>
      )}

      {/* ===== 2×2 Chart Grid ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Phase Distribution */}
        {!hasPhaseFilter && (
        <div className="group p-5 rounded-2xl glass liquid-shadow transition-all duration-300 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/5 blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors"></div>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-1.5 uppercase tracking-[0.15em] px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Global Phase Progress
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: tickColor }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} animationBegin={200} animationDuration={1000}>
                  {phaseData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Lead Sponsor Types */}
        {sponsorData.length > 0 && (
        <div className="group p-5 rounded-2xl glass liquid-shadow transition-all duration-300 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-pink-500/5 blur-3xl -z-10 group-hover:bg-pink-500/10 transition-colors"></div>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-1.5 uppercase tracking-[0.15em] px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
            Lead Sponsor Types
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sponsorData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: tickColor }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#pinkGradient)" radius={[0, 4, 4, 0]} barSize={10} animationBegin={800} />
                <defs>
                  <linearGradient id="pinkGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Matched Diseases */}
        {matchedDiseaseData.length > 0 && (
        <div className="group p-5 rounded-2xl glass liquid-shadow transition-all duration-300 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-red-500/5 blur-3xl -z-10 group-hover:bg-red-500/10 transition-colors"></div>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-1.5 uppercase tracking-[0.15em] px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Matched Diseases
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchedDiseaseData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: tickColor }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#redGradient)" radius={[0, 4, 4, 0]} barSize={10} animationBegin={400} />
                <defs>
                  <linearGradient id="redGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f87171" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

        {/* Matched Drugs */}
        {matchedDrugData.length > 0 && (
        <div className="group p-5 rounded-2xl glass liquid-shadow transition-all duration-300 hover:scale-[1.01] hover:shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-orange-500/5 blur-3xl -z-10 group-hover:bg-orange-500/10 transition-colors"></div>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-5 flex items-center gap-1.5 uppercase tracking-[0.15em] px-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Matched Drugs
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchedDrugData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={90} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: tickColor }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#orangeGradient)" radius={[0, 4, 4, 0]} barSize={10} animationBegin={600} />
                <defs>
                  <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}

      </div>

    </div>
  );
};

export default OverviewCharts;
