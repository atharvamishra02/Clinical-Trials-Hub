import express from 'express';
import cors from 'cors';
import { parseQuery } from './agents/QueryParser.js';
import { buildAndExecuteQuery } from './services/QueryBuilder.js';
import { resolveMeshTerm } from './services/MeshService.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/search', async (req, res) => {
  const { query: userQuery, page = 1, limit = 50 } = req.body;
  if (!userQuery) {
    return res.status(400).json({ error: "Query is required" });
  }

  try {
    console.log(`\n--- Incoming Search Query: "${userQuery}" (Page ${page}) ---`);
    
    // ── STEP 1: AI extracts raw terms ──
    const parsed = await parseQuery(userQuery);

    // ── STEP 2: MeSH Resolution ──
    const resolvedConditions = await Promise.all(
      (parsed.conditions || []).map(async (term) => {
        const meshNames = await resolveMeshTerm(term);
        const meshName = meshNames.length > 0 ? (meshNames[0] as string) : null;
        return { original: term, mesh: meshName };
      })
    );

    const resolvedInterventions = await Promise.all(
      (parsed.interventions || []).map(async (term) => {
        const meshNames = await resolveMeshTerm(term);
        const meshName = meshNames.length > 0 ? (meshNames[0] as string) : null;
        return { original: term, mesh: meshName };
      })
    );

    const resolvedExclusions = await Promise.all(
      (parsed.excluded_terms || []).map(async (term) => {
        const meshNames = await resolveMeshTerm(term);
        const meshName = meshNames.length > 0 ? (meshNames[0] as string) : null;
        return { original: term, mesh: meshName };
      })
    );

    console.log(`\n========================================`);
    console.log(`[MEDICAL TERM RESOLUTION (MeSH)]`);
    console.log(`Conditions: ${JSON.stringify(resolvedConditions, null, 2)}`);
    console.log(`Interventions: ${JSON.stringify(resolvedInterventions, null, 2)}`);
    console.log(`Exclusions (The "NOT"s): ${JSON.stringify(resolvedExclusions, null, 2)}`);
    console.log(`========================================\n`);

    // ── STEP 3: Query Database ──
    const { rows, totalCount, summary, filteredSummary } = await buildAndExecuteQuery(
      parsed, 
      resolvedConditions, 
      resolvedInterventions,
      resolvedExclusions,
      req.body.filters || {},
      Number(page),
      Number(limit)
    );

    res.json({
      query: userQuery,
      parsed,
      results: rows,
      totalCount,
      summary,
      filteredSummary,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalCount / Number(limit))
    });

  } catch (error) {
    console.error("ERROR in search pipeline:", error);
    res.status(500).json({ error: "Search failed", details: error instanceof Error ? error.message : "Internal Error" });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Clinical Intelligence API running at http://localhost:${PORT}`);
});
