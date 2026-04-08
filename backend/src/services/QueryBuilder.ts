import { query } from "../db/connection.js";
import type { ParsedQuery } from "../agents/QueryParser.js";
import { MeSHHierarchyService } from "./MeSHHierarchyService.js";

export interface ResolvedTerm {
  original: string;
  mesh: string | null;
  uid?: string | null;
  descendants?: string[];
}

export interface TrialResult {
  nct_id: string;
  brief_title: string;
  phase: string;
  overall_status: string;
  sponsors?: string;
  outcomes?: string;
  all_diseases?: string;
  drug_names?: string;
  matched_conditions?: string;
  matched_drugs?: string;
  start_date?: string;
}

function buildFilters(
  parsed: ParsedQuery,
  resolvedConditions: ResolvedTerm[],
  resolvedInterventions: ResolvedTerm[],
  resolvedExclusions: ResolvedTerm[] = [],
  manualFilters: Record<string, string[]> = {},
) {
  const params: any[] = [];
  let paramCount = 1;
  const baseClauses: string[] = [
    "1=1",
    "UPPER(s.study_type) = 'INTERVENTIONAL'",
  ];
  const manualClauses: string[] = [];

  const conditionsToSearch = resolvedConditions;
  const interventionsToSearch = resolvedInterventions;

  if (conditionsToSearch.length > 0) {
    for (const { original, mesh } of conditionsToSearch) {
      const originalTerm = original.toLowerCase();
      const meshTerm = mesh ? mesh.toLowerCase() : null;
      const searchTerms = [originalTerm];
      if (meshTerm && meshTerm !== originalTerm) searchTerms.push(meshTerm);

      const orParts: string[] = [];
      for (const t of searchTerms) {
        const p = paramCount++;
        params.push(t);
        orParts.push(
          `(s.brief_title ~* ('\\y' || $${p}::text || '\\y') OR s.official_title ~* ('\\y' || $${p}::text || '\\y') OR EXISTS (SELECT 1 FROM ctgov.conditions c WHERE c.nct_id = s.nct_id AND c.downcase_name = $${p}) OR EXISTS (SELECT 1 FROM ctgov.browse_conditions bc WHERE bc.nct_id = s.nct_id AND bc.downcase_mesh_term = $${p}))`,
        );
      }
      baseClauses.push(`(${orParts.join(" OR ")})`);
    }
  }

  if (interventionsToSearch.length > 0) {
    for (const { original, mesh } of interventionsToSearch) {
      const originalTerm = original.toLowerCase();
      const meshTerm = mesh ? mesh.toLowerCase() : null;
      const searchTerms = [originalTerm];
      if (meshTerm && meshTerm !== originalTerm) searchTerms.push(meshTerm);

      const orParts: string[] = [];
      for (const t of searchTerms) {
        const p = paramCount++;
        params.push(t);
        orParts.push(
          `(s.brief_title ~* ('\\y' || $${p}::text || '\\y') OR s.official_title ~* ('\\y' || $${p}::text || '\\y') OR EXISTS (SELECT 1 FROM ctgov.interventions i WHERE i.nct_id = s.nct_id AND lower(i.name) = $${p}) OR EXISTS (SELECT 1 FROM ctgov.browse_interventions bi WHERE bi.nct_id = s.nct_id AND bi.downcase_mesh_term = $${p}))`,
        );
      }
      baseClauses.push(`(${orParts.join(" OR ")})`);
    }
  }

  if (parsed.outcomes && parsed.outcomes.length > 0) {
    const p = paramCount++;
    params.push(parsed.outcomes.map((o) => `%${o}%`));
    baseClauses.push(
      `EXISTS (SELECT 1 FROM ctgov.design_outcomes dout WHERE dout.nct_id = s.nct_id AND (dout.measure ILIKE ANY($${p}) OR dout.description ILIKE ANY($${p})))`,
    );
  }

  // --- Primary Search Universe Qualifiers (Phases, Status etc from AI) ---
  // Only add these to base (universe) if they are NOT overridden by manual filters
  if (
    parsed.phases &&
    parsed.phases.length > 0 &&
    (!manualFilters["Phase"] || manualFilters["Phase"].length === 0)
  ) {
    const phaseList = parsed.phases;
    const phaseFuzzy = phaseList.map(
      (p) => `%${p.replace("PHASE", "Phase ")}%`,
    );
    const p1 = paramCount++;
    const p2 = paramCount++;
    baseClauses.push(`(s.phase = ANY($${p1}) OR s.phase ILIKE ANY($${p2}))`);
    params.push(phaseList);
    params.push(phaseFuzzy);
  }

  if (
    parsed.statuses &&
    parsed.statuses.length > 0 &&
    (!manualFilters["Status"] || manualFilters["Status"].length === 0)
  ) {
    baseClauses.push(`s.overall_status = ANY($${paramCount++})`);
    params.push(parsed.statuses);
  }

  if (
    parsed.is_active === true &&
    (!manualFilters["Status"] || manualFilters["Status"].length === 0)
  ) {
    baseClauses.push(
      `s.overall_status NOT IN ('COMPLETED', 'TERMINATED', 'WITHDRAWN', 'UNKNOWN', 'NO_LONGER_AVAILABLE')`,
    );
  }

  if (
    parsed.sponsors &&
    parsed.sponsors.length > 0 &&
    (!manualFilters["Sponsor"] || manualFilters["Sponsor"].length === 0)
  ) {
    const p = paramCount++;
    params.push(parsed.sponsors.map((sp) => `%${sp}%`));
    baseClauses.push(
      `EXISTS (SELECT 1 FROM ctgov.sponsors sp WHERE sp.nct_id = s.nct_id AND sp.name ILIKE ANY($${p}))`,
    );
  }

  if (parsed.keywords && parsed.keywords.length > 0) {
    for (const kw of parsed.keywords) {
      const p = paramCount++;
      params.push(`%${kw}%`);
      baseClauses.push(
        `(s.brief_title ILIKE $${p} OR s.official_title ILIKE $${p})`,
      );
    }
  }

  if (resolvedExclusions.length > 0) {
    for (const { original, mesh } of resolvedExclusions) {
      const searchTerms = [original.toLowerCase()];
      if (mesh && mesh.toLowerCase() !== original.toLowerCase())
        searchTerms.push(mesh.toLowerCase());

      const orParts: string[] = [];
      for (const t of searchTerms) {
        const pExact = paramCount++;
        params.push(t);

        orParts.push(`s.brief_title ~* ('\\y' || $${pExact}::text || '\\y')`);
        orParts.push(`s.official_title ~* ('\\y' || $${pExact}::text || '\\y')`);
        orParts.push(
          `EXISTS (SELECT 1 FROM ctgov.conditions c WHERE c.nct_id = s.nct_id AND c.downcase_name = $${pExact})`,
        );
        orParts.push(
          `EXISTS (SELECT 1 FROM ctgov.browse_conditions bc WHERE bc.nct_id = s.nct_id AND bc.downcase_mesh_term = $${pExact})`,
        );
        orParts.push(
          `EXISTS (SELECT 1 FROM ctgov.interventions i WHERE i.nct_id = s.nct_id AND lower(i.name) = $${pExact})`,
        );
        orParts.push(
          `EXISTS (SELECT 1 FROM ctgov.browse_interventions bi WHERE bi.nct_id = s.nct_id AND bi.downcase_mesh_term = $${pExact})`,
        );
      }
      baseClauses.push(`NOT (${orParts.join(" OR ")})`);
    }
  }

  const baseParams = [...params];

  // --- Manual Filters from UI ---
  if (manualFilters) {
    if (manualFilters["Phase"] && manualFilters["Phase"].length > 0) {
      const pIdx1 = paramCount++;
      const pIdx2 = paramCount++;
      const exactPhases = manualFilters["Phase"].map((p) =>
        p.toUpperCase().replace(" ", "").replace("/", "_"),
      );
      const fuzzyPhases = manualFilters["Phase"].map((p) => `%${p}%`);
      params.push(exactPhases);
      params.push(fuzzyPhases);
      manualClauses.push(
        `(s.phase = ANY($${pIdx1}) OR s.phase ILIKE ANY($${pIdx2}))`,
      );
    }

    if (manualFilters["Status"] && manualFilters["Status"].length > 0) {
      const pIdx = paramCount++;
      params.push(manualFilters["Status"]);
      manualClauses.push(`s.overall_status = ANY($${pIdx})`);
    }

    if (manualFilters["Sponsor"] && manualFilters["Sponsor"].length > 0) {
      const pIdx = paramCount++;
      const sponsors = manualFilters["Sponsor"].map((s) =>
        s.replace(" ", "_").toUpperCase(),
      );
      params.push(sponsors);
      manualClauses.push(
        `EXISTS (SELECT 1 FROM ctgov.sponsors sp WHERE sp.nct_id = s.nct_id AND sp.agency_class = ANY($${pIdx}))`,
      );
    }

    if (
      manualFilters["Specific Condition"] &&
      manualFilters["Specific Condition"].length > 0
    ) {
      const conditionTerms = manualFilters["Specific Condition"];
      const combinedOrs: string[] = [];
      for (const term of conditionTerms) {
        const p = paramCount++;
        params.push(term.toLowerCase());
        combinedOrs.push(
          `(s.brief_title ~* ('\\y' || $${p}::text || '\\y') OR s.official_title ~* ('\\y' || $${p}::text || '\\y') OR EXISTS (SELECT 1 FROM ctgov.conditions c WHERE c.nct_id = s.nct_id AND c.downcase_name = $${p}) OR EXISTS (SELECT 1 FROM ctgov.browse_conditions bc WHERE bc.nct_id = s.nct_id AND bc.downcase_mesh_term = $${p}))`,
        );
      }
      manualClauses.push(`(${combinedOrs.join(" OR ")})`);
    }

    if (
      manualFilters["Specific Intervention"] &&
      manualFilters["Specific Intervention"].length > 0
    ) {
      const interventionTerms = manualFilters["Specific Intervention"];
      const combinedOrs: string[] = [];
      for (const term of interventionTerms) {
        const p = paramCount++;
        params.push(term.toLowerCase());
        combinedOrs.push(
          `(s.brief_title ~* ('\\y' || $${p}::text || '\\y') OR s.official_title ~* ('\\y' || $${p}::text || '\\y') OR EXISTS (SELECT 1 FROM ctgov.interventions i WHERE i.nct_id = s.nct_id AND lower(i.name) = $${p}) OR EXISTS (SELECT 1 FROM ctgov.browse_interventions bi WHERE bi.nct_id = s.nct_id AND bi.downcase_mesh_term = $${p}))`,
        );
      }
      manualClauses.push(`(${combinedOrs.join(" OR ")})`);
    }
  }

  return { baseClauses, manualClauses, params, baseParams };
}

/**
 * Find mesh-list DRUG terms that are TRUE descendants of the searched ancestor term.
 * Logic: A drug like "rituximab" co-occurs with ancestor "antibodies, monoclonal"
 * in almost all its trials (95%+). But "dexamethasone" only co-occurs with it
 * in ~10% of trials (it's just co-treatment). We use this to filter the matrix.
 */
async function getTrueDescendantDrugs(searchTerms: string[]): Promise<string[]> {
  return []; // No longer needed as we use MeSHHierarchyService
}

async function getTrueDescendantConditions(searchTerms: string[]): Promise<string[]> {
  return []; // No longer needed as we use MeSHHierarchyService
}

/**
 * Core clinical trial search engine.
 */
export async function buildAndExecuteQuery(
  parsed: ParsedQuery,
  resolvedConditions: ResolvedTerm[],
  resolvedInterventions: ResolvedTerm[],
  resolvedExclusions: ResolvedTerm[] = [],
  manualFilters: Record<string, string[]> = {},
  page: number = 1,
  limit: number = 50,
): Promise<{
  rows: TrialResult[];
  totalCount: number;
  summary?: any;
  filteredSummary?: any;
}> {
  // --- Hierarchy Enrichment ---
  // --- Hierarchy Enrichment ---
  // Await and expand terms using NLM MeSH Hierarchy
  const expandedConditions: ResolvedTerm[] = [...resolvedConditions];
  const expandedInterventions: ResolvedTerm[] = [...resolvedInterventions];

  // Resolve Conditions
  for (const c of expandedConditions) {
    const termToResolve = c.mesh || c.original;
    try {
      const details = await MeSHHierarchyService.resolveFullMeSH(termToResolve);
      if (details) {
        if (details.uid) c.uid = details.uid;
        if (details.descendants) c.descendants = details.descendants;
      }
    } catch (e) {
      console.error(`[Hierarchy] Failed to resolve MeSH hierarchy for ${termToResolve}`);
    }
  }

  // Resolve Interventions
  for (const i of expandedInterventions) {
    const termToResolve = i.mesh || i.original;
    try {
      const details = await MeSHHierarchyService.resolveFullMeSH(termToResolve);
      if (details) {
        if (details.uid) i.uid = details.uid;
        if (details.descendants) i.descendants = details.descendants;
      }
    } catch (e) {
      console.error(`[Hierarchy] Failed to resolve MeSH hierarchy for ${termToResolve}`);
    }
  }

  const { baseClauses, manualClauses, params, baseParams } = buildFilters(
    parsed,
    expandedConditions,
    expandedInterventions,
    resolvedExclusions,
    manualFilters,
  );
  const offset = (page - 1) * limit;

  const allClauses = [...baseClauses, ...manualClauses];
  const allWhere = allClauses.join(" AND ");
  const baseWhere = baseClauses.join(" AND ");

  // Build matched_conditions subquery — match only on MeSH terms
  const condSearchTerms = expandedConditions
    .flatMap((r) => [r.mesh, r.original])
    .filter((t): t is string => !!t)
    .map((t) => t.toLowerCase());

  const condUids = expandedConditions
    .map((r) => r.uid)
    .filter((u): u is string => !!u) as string[];

  const condDescendants = expandedConditions
    .flatMap((r) => r.descendants || [])
    .map((d) => d.toLowerCase());

  const intSearchTerms = expandedInterventions
    .flatMap((r) => [r.mesh, r.original])
    .filter((t): t is string => !!t)
    .map((t) => t.toLowerCase());

  const intUids = expandedInterventions
    .map((r) => r.uid)
    .filter((u): u is string => !!u) as string[];

  const intDescendants = expandedInterventions
    .flatMap((r) => r.descendants || [])
    .map((d) => d.toLowerCase());

  const dataParams = [...params];

  // Build target list params for the SQL results table "Matched" columns
  const condTargetsList = Array.from(new Set([...condSearchTerms, ...condDescendants]));
  const intTargetsList = Array.from(new Set([...intSearchTerms, ...intDescendants]));

  // matched_conditions: return terms from browse_conditions that are in our target list
  const condTargetParams: string[] = [];
  for (const t of condTargetsList) {
      const p = dataParams.length + 1;
      dataParams.push(t);
      condTargetParams.push(`$${p}`);
  }
  const matchedCondSql = condTargetsList.length > 0
    ? `(SELECT string_agg(DISTINCT LOWER(bc2.mesh_term), ' | ') FROM ctgov.browse_conditions bc2 WHERE bc2.nct_id = s.nct_id AND bc2.mesh_type = 'mesh-list' AND LOWER(bc2.mesh_term) IN (${condTargetParams.join(", ")})) as matched_conditions`
    : `NULL as matched_conditions`;

  // matched_drugs: return terms from browse_interventions that are in our target list
  const intTargetParams: string[] = [];
  for (const t of intTargetsList) {
      const p = dataParams.length + 1;
      dataParams.push(t);
      intTargetParams.push(`$${p}`);
  }
  const matchedDrugSql = intTargetsList.length > 0
    ? `(SELECT string_agg(DISTINCT LOWER(bi2.mesh_term), ' | ') FROM ctgov.browse_interventions bi2 WHERE bi2.nct_id = s.nct_id AND bi2.mesh_type = 'mesh-list' AND LOWER(bi2.mesh_term) IN (${intTargetParams.join(", ")})) as matched_drugs`
    : `NULL as matched_drugs`;

  // 1. Data Query — inner query deduplicates, outer sorts by date
  const sql = `
    SELECT * FROM (
      SELECT DISTINCT ON (s.nct_id)
        s.nct_id, s.brief_title, s.phase, s.overall_status, s.start_date,
        (SELECT string_agg(DISTINCT sp.name, ' | ') FROM ctgov.sponsors sp WHERE sp.nct_id = s.nct_id AND sp.lead_or_collaborator = 'lead') as sponsors,
        (SELECT string_agg(DISTINCT sp.agency_class, ' | ') FROM ctgov.sponsors sp WHERE sp.nct_id = s.nct_id AND sp.lead_or_collaborator = 'lead') as agency_classes,
        (SELECT string_agg(DISTINCT name, ' | ') FROM (
          SELECT downcase_name as name FROM ctgov.conditions WHERE nct_id = s.nct_id
          UNION
          SELECT LOWER(mesh_term) as name FROM ctgov.browse_conditions WHERE nct_id = s.nct_id AND mesh_type = 'mesh-list'
        ) as combined_conds) as all_diseases,
        (SELECT string_agg(DISTINCT name, ' | ') FROM (
          SELECT LOWER(name) as name FROM ctgov.interventions WHERE nct_id = s.nct_id AND intervention_type IN ('DRUG', 'BIOLOGICAL') 
          UNION
          SELECT LOWER(mesh_term) as name FROM ctgov.browse_interventions bi WHERE bi.nct_id = s.nct_id AND bi.mesh_type = 'mesh-list'
        ) as combined_drugs) as drug_names,
        ${matchedCondSql},
        ${matchedDrugSql},
        (SELECT string_agg(DISTINCT i.intervention_type, ' | ') FROM ctgov.interventions i WHERE i.nct_id = s.nct_id) as intervention_types,
        (SELECT string_agg(DISTINCT dout.measure, ' | ') FROM (SELECT measure FROM ctgov.design_outcomes d WHERE d.nct_id = s.nct_id AND d.outcome_type = 'primary' LIMIT 3) dout) as outcomes
      FROM ctgov.studies s
      WHERE ${allWhere}
      ORDER BY s.nct_id
    ) t
    ORDER BY t.start_date DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `;

  // 2. Count Query
  const countSql = `
    SELECT COUNT(DISTINCT s.nct_id) 
    FROM ctgov.studies s
    WHERE ${allWhere}
  `;

  // 3. Optional Summary Data (only on page 1)
  let summary = null;
  let filteredSummary = null;
  if (page === 1) {
    try {
      summary = await getSummaryData(baseWhere, baseParams, condUids, intUids, condDescendants, intDescendants, condSearchTerms, intSearchTerms);
      if (allWhere !== baseWhere) {
        filteredSummary = await getSummaryData(allWhere, params, condUids, intUids, condDescendants, intDescendants, condSearchTerms, intSearchTerms);
      } else {
        filteredSummary = summary;
      }
    } catch (err) {
      console.warn(
        "[getSummaryData] Summary queries timed out, returning results without charts:",
        (err as Error).message,
      );
      summary = { phases: [], sponsors: [], relationships: [] };
      filteredSummary = summary;
    }
  }

  const [dataResult, countResult] = await Promise.all([
    query(sql, dataParams),
    query(countSql, params),
  ]);

  return {
    rows: dataResult.rows,
    totalCount: parseInt(countResult.rows[0].count, 10),
    summary,
    filteredSummary,
  };
}

async function getSummaryData(
  baseWhere: string, 
  params: any[], 
  condUids: string[], 
  intUids: string[], 
  condDescendants: string[], 
  intDescendants: string[],
  condSearchTerms: string[],
  intSearchTerms: string[]
) {
  // Use a CTE to materialize matching nct_ids once (capped at 5000),
  // so the expensive WHERE with NOT EXISTS/ILIKE is evaluated only once
  const cte = `WITH matched_studies AS (
    SELECT s.nct_id, s.phase FROM ctgov.studies s WHERE ${baseWhere} LIMIT 5000
  )`;

  const phaseSql = `
    ${cte}
    SELECT phase, COUNT(*) as count 
    FROM matched_studies
    GROUP BY phase
    ORDER BY phase;
  `;

  const sponsorSql = `
    ${cte}
    SELECT agency_class as name, COUNT(*) as count 
    FROM (
      SELECT ms.nct_id, sp.agency_class FROM matched_studies ms JOIN ctgov.sponsors sp ON ms.nct_id = sp.nct_id
    ) combined_sponsors
    WHERE agency_class IS NOT NULL
    GROUP BY name ORDER BY count DESC LIMIT 10;
  `;

  const relParams = [...params];
  
  const relationshipSql = `
    ${cte}
    SELECT 
      LOWER(bc.mesh_term) as disease, 
      LOWER(bi.mesh_term) as drug, 
      COALESCE(ms.phase, 'N/A') as phase,
      COUNT(*) as count
    FROM matched_studies ms
    JOIN ctgov.browse_conditions bc ON ms.nct_id = bc.nct_id AND bc.mesh_type = 'mesh-list'
    JOIN ctgov.browse_interventions bi ON ms.nct_id = bi.nct_id AND bi.mesh_type = 'mesh-list'
    GROUP BY 1, 2, 3
    ORDER BY count DESC
    LIMIT 60;
  `;

  const diseaseSql = `
    ${cte}
    SELECT LOWER(c.downcase_name) as name, COUNT(*) as count
    FROM matched_studies ms
    JOIN ctgov.conditions c ON ms.nct_id = c.nct_id
    WHERE c.downcase_name IS NOT NULL
    GROUP BY 1 ORDER BY count DESC LIMIT 15;
  `;

  const drugSql = `
    ${cte}
    SELECT LOWER(i.name) as name, COUNT(*) as count
    FROM matched_studies ms
    JOIN ctgov.interventions i ON ms.nct_id = i.nct_id
    WHERE UPPER(i.intervention_type) IN ('DRUG', 'BIOLOGICAL')
    GROUP BY 1 ORDER BY count DESC LIMIT 15;
  `;

  console.log(`Params: ${JSON.stringify(params)}`);

  const [phaseRes, sponsorRes, flowRes, diseaseRes, drugRes] =
    await Promise.all([
      query(phaseSql, params),
      query(sponsorSql, params),
      query(relationshipSql, relParams),
      query(diseaseSql, params),
      query(drugSql, params),
    ]);

  // Build local reference lists for strict matching
  const condTargets = new Set([
      ...condSearchTerms,
      ...condDescendants
  ]);
  const intTargets = new Set([
      ...intSearchTerms,
      ...intDescendants
  ]);

  const logMsg = `[Matrix Filter] Targets - Conditions: ${condTargets.size}, Interventions: ${intTargets.size}\n` +
                 (intTargets.size > 0 ? `[Matrix Filter] INT SAMPLE: ${Array.from(intTargets).slice(0, 10).join(', ')}\n` : '');
  
  import('fs').then(fs => fs.appendFileSync('filter-log.txt', logMsg, 'utf-8')).catch(()=>{});

  const rawRelationships = flowRes.rows;
  const filteredRelationships = [];

  for (const row of rawRelationships) {
     const diseaseTerm = row.disease.toLowerCase();
     const drugTerm = row.drug.toLowerCase();

     const matchesCond = condTargets.size === 0 || condTargets.has(diseaseTerm);
     const matchesInt = intTargets.size === 0 || intTargets.has(drugTerm);

     if (matchesCond && matchesInt) {
         filteredRelationships.push(row);
         if (filteredRelationships.length >= 60) break;
     } else if (drugTerm.includes('bendamustine')) {
         const msg = `[Matrix Filter] EXCLUDING drug: "${drugTerm}" - matchesCond: ${matchesCond}, matchesInt: ${matchesInt}, intSize: ${intTargets.size}\n`;
         import('fs').then(fs => fs.appendFileSync('filter-log.txt', msg, 'utf-8')).catch(()=>{});
     }
  }

  const rawDiseases = diseaseRes.rows;
  const filteredDiseases = [];
  for (const row of rawDiseases) {
     const diseaseTerm = row.name.toLowerCase();
     if (condTargets.size === 0 || condTargets.has(diseaseTerm)) {
         filteredDiseases.push(row);
     }
     if (filteredDiseases.length >= 15) break; 
  }

  const rawDrugs = drugRes.rows;
  const filteredDrugs = [];
  for (const row of rawDrugs) {
     const drugTerm = row.name.toLowerCase();
     if (intTargets.size === 0 || intTargets.has(drugTerm)) {
         filteredDrugs.push(row);
     } else if (drugTerm.includes('bendamustine')) {
         const msg = `[Matrix Filter] EXCLUDING from drug-agg: "${drugTerm}", intSize: ${intTargets.size}\n`;
         import('fs').then(fs => fs.appendFileSync('filter-log.txt', msg, 'utf-8')).catch(()=>{});
     }
     if (filteredDrugs.length >= 15) break;
  }

  return {
    phases: phaseRes.rows,
    sponsors: sponsorRes.rows,
    relationships: filteredRelationships,
    diseases: filteredDiseases,
    drugs: filteredDrugs,
  };
}
