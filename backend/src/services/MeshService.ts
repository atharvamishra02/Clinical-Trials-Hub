/**
 * MeSH Resolution Service
 * 
 * Uses the NCBI E-Utilities API (same engine powering the MeSH Browser website)
 * to resolve user-typed medical terms to their official MeSH Descriptor names.
 * 
 * Example: "lung cancer" → "Lung Neoplasms"
 *          "heart attack" → "Myocardial Infarction"
 */

/**
 * Resolves a user-typed medical term to its official MeSH Descriptor name
 * using the NCBI E-Utilities API.
 * 
 * How it works:
 * 1. Sends the term to NCBI's esearch API (same backend as MeSH Browser)
 * 2. NCBI's translationset automatically maps synonyms to official MeSH terms
 *    e.g. "lung cancer" → "lung neoplasms"[MeSH Terms]
 * 3. We extract the canonical MeSH name from the translation
 */
export async function resolveMeshTerm(term: string): Promise<string[]> {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=mesh&term=${encodeURIComponent(term)}&retmode=json`;
    console.log(`   [NLM] Querying: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`   [NLM] API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as any;
    const translationSet = data?.esearchresult?.translationset;

    if (translationSet && translationSet.length > 0) {
      // The "to" field contains something like: "lung neoplasms"[MeSH Terms] OR lung cancer[Text Word]
      // We need to extract the MeSH term from within the quotes before [MeSH Terms]
      const translation = translationSet[0].to as string;
      const meshMatch = translation.match(/"([^"]+)"\[MeSH Terms\]/i);

      if (meshMatch && meshMatch[1]) {
        const meshName = meshMatch[1];
        console.log(`   [NLM] Resolved: "${term}" → "${meshName}"`);
        return [meshName];
      }
    }

    // If no translation found, check if the term itself is already a valid descriptor
    const descriptorUrl = `https://id.nlm.nih.gov/mesh/lookup/descriptor?label=${encodeURIComponent(term)}&match=exact&limit=10`;
    const dResponse = await fetch(descriptorUrl);
    if (dResponse.ok) {
      const descriptors = await dResponse.json() as any[];
      if (descriptors && descriptors.length > 0) {
        console.log(`   [NLM] Term is already a Descriptor: "${descriptors[0].label}"`);
        return descriptors.map(d => d.label);
      }
    }

    console.log(`   [NLM] No MeSH match found for: "${term}"`);
    return [];
  } catch (error) {
    console.error('   [NLM] ERROR:', error instanceof Error ? error.message : String(error));
    return [];
  }
}
