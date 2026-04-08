import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const CACHE_FILE = join(process.cwd(), ".query_cache.json");

export interface ParsedQuery {
  conditions: string[];
  interventions: string[];
  excluded_terms?: string[];
  phases: string[];
  statuses: string[];
  sponsors: string[];
  outcomes: string[];
  is_active: boolean | null;
  keywords: string[];
}

const SYSTEM_PROMPT = `
You are a specialized clinical trial query extraction agent. Your job is to parse a user's natural language search query and extract terms into a strictly structured JSON object.

Extraction & Spelling Correction Rules:
1. CORRECT SPELLING: If a user makes a spelling mistake or typo (e.g., "keratoconos" instead of "keratoconus", "diabtes" instead of "diabetes"), you MUST correct it to the standard English medical spelling.
2. DO NOT NORMALIZE TO DIFFERENT NAMES: While you should fix spelling, do NOT change the common name to a formal MeSH descriptor if it's already spelled correctly.
   - Example: Keep "lung cancer" (don't change to "Lung Neoplasms").
   - Example: Keep "heart attack" (don't change to "Myocardial Infarction").
3. "conditions": Diseases/therapeutic areas. Correct any spelling errors.
4. "interventions": Drugs, biologicals, or techniques. Correct any spelling errors (e.g., "pembrolizuma" -> "pembrolizumab").
5. "phases": "EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", or "NA".
6. "statuses": Only use specific AACT strings: "ACTIVE_NOT_RECRUITING", "APPROVED_FOR_MARKETING", "AVAILABLE", "COMPLETED", "ENROLLING_BY_INVITATION", "NOT_YET_RECRUITING", "NO_LONGER_AVAILABLE", "RECRUITING", "SUSPENDED", "TEMPORARILY_NOT_AVAILABLE", "TERMINATED", "UNKNOWN", "WITHDRAWN", "WITHHELD". (DO NOT extract "ACTIVE" itself).
7. "sponsors": Pharmaceutical companies or lead organizations.
8. "outcomes": Endpoint descriptors (e.g., "PFS", "Overall Survival").
9. "is_active": Set to true if query context implies ongoing/active trials (e.g., "Active trials" -> true).
10. "excluded_terms": A list of terms to EXCLUDE. Keep the user's exact term (with spelling corrections only). Do NOT expand or add synonyms — MeSH resolution will handle that downstream. Example: if user says "not cancer", just return ["cancer"].

Return ONLY raw JSON. Do not include markdown formatting.
`;

// --- Cache helpers ---
function getCache(): Record<string, ParsedQuery> {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function setCache(key: string, value: ParsedQuery) {
  try {
    const cache = getCache();
    cache[key] = value;
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    console.error("Cache write error:", err);
  }
}

// --- Direct OpenAI API call using fetch (no SDK needed) ---
async function callOpenAI(
  userQuery: string,
  retries = 3,
  delay = 2000,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment variables");
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `User Query: "${userQuery}"` },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });

      if (res.status === 429 && i < retries - 1) {
        console.log(
          `⚠️ Rate limit hit. Retrying in ${delay / 1000}s... (Attempt ${i + 1}/${retries})`,
        );
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenAI API error (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      return data.choices[0].message.content || "{}";
    } catch (error: any) {
      if (error.message?.includes("429") && i < retries - 1) {
        console.log(`⚠️ Rate limit hit. Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  return "{}";
}

// --- Main exported function ---
export async function parseQuery(userQuery: string): Promise<ParsedQuery> {
  const cacheKey = userQuery.toLowerCase().trim();
  const cache = getCache();

  if (cache[cacheKey]) {
    console.log(`\n========================================`);
    console.log(`[AI EXTRACTION RESULT - FROM CACHE]`);
    console.log(`User Query: "${userQuery}"`);
    console.log(`Extracted JSON:\n${JSON.stringify(cache[cacheKey], null, 2)}`);
    console.log(`========================================\n`);
    return cache[cacheKey];
  }

  const text = await callOpenAI(userQuery);

  try {
    const parsed = JSON.parse(text) as ParsedQuery;

    console.log(`\n========================================`);
    console.log(`[AI EXTRACTION RESULT]`);
    console.log(`User Query: "${userQuery}"`);
    console.log(`Extracted JSON:\n${JSON.stringify(parsed, null, 2)}`);
    console.log(`========================================\n`);

    // AI only extracts raw terms — no MeSH normalization here
    // MeSH resolution is done by QueryBuilder via resolveMeshTerm()
    setCache(cacheKey, parsed);
    return parsed;
  } catch (e) {
    console.error("Failed to parse AI response:", text);
    throw new Error("Invalid response from AI.");
  }
}
