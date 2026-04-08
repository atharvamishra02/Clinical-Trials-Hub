import axios from 'axios';

const NCBI_API_KEY = process.env.NCBI_API_KEY || '';

export interface MeSHDetails {
    term: string;
    uid: string;
    descriptorUI: string;
    descendants: string[];
}

export class MeSHHierarchyService {
    private static cache: Map<string, { data: MeSHDetails, timestamp: number }> = new Map();
    private static CACHE_TTL = 15 * 60 * 1000; // 15 minutes
    /**
     * Convert a term to its NCBI UID using E-search.
     */
    static async getMeshUid(term: string): Promise<string | null> {
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`;
        try {
            const params: any = {
                db: 'mesh',
                term: term,
                retmode: 'json',
                sort: 'relevance'
            };
            if (NCBI_API_KEY) params.api_key = NCBI_API_KEY;

            const response = await axios.get(url, { params });
            const idList = response.data?.esearchresult?.idlist || [];
            return idList.length > 0 ? idList[0] : null;
        } catch (error) {
            console.error(`Error fetching MeSH UID for ${term}:`, error);
            return null;
        }
    }

    /**
     * Convert NCBI UID (e.g., 68000911) to MeSH Descriptor UI (e.g., D000911)
     * using eSummary API.
     */
    static async getDescriptorUI(ncbiUid: string): Promise<string | null> {
        const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi`;
        try {
            const params: any = {
                db: 'mesh',
                id: ncbiUid,
                retmode: 'json'
            };
            if (NCBI_API_KEY) params.api_key = NCBI_API_KEY;

            const response = await axios.get(url, { params });
            const data = response.data?.result?.[ncbiUid];
            
            // The descriptor UI is in ds_meshui field
            if (data?.ds_meshui) {
                return data.ds_meshui;
            }
            
            // Fallback: extract from ds_idxlinks
            if (data?.ds_idxlinks && Array.isArray(data.ds_idxlinks)) {
                for (const link of data.ds_idxlinks) {
                    if (link.objurl) {
                        // URL format: https://www.ncbi.nlm.nih.gov/mesh/D000911
                        const match = link.objurl.match(/mesh\/(D\d+)/);
                        if (match) return match[1];
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error(`Error fetching descriptor UI for NCBI UID ${ncbiUid}:`, error);
            return null;
        }
    }

    /**
     * Get ALL descendant terms of a MeSH descriptor using NLM SPARQL endpoint.
     */
    static async getAllDescendants(descriptorUI: string): Promise<string[]> {
        const sparqlUrl = `https://id.nlm.nih.gov/mesh/sparql`;
        
        const sparqlQuery = `
            PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
            PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
            PREFIX mesh: <http://id.nlm.nih.gov/mesh/>

            SELECT DISTINCT ?label
            WHERE {
                mesh:${descriptorUI} meshv:treeNumber ?parentTree .
                ?desc meshv:treeNumber ?childTree .
                ?desc rdfs:label ?label .
                FILTER(STRSTARTS(str(?childTree), str(?parentTree)))
            }
            LIMIT 1000
        `;
        
        try {
            const response = await axios.get(sparqlUrl, {
                params: { query: sparqlQuery, format: 'json' },
                headers: { 'Accept': 'application/sparql-results+json' },
                timeout: 30000
            });
            
            const bindings = response.data?.results?.bindings || [];
            const descendants = bindings
                .map((b: any) => (b.label?.value?.toLowerCase() || ''))
                .filter((v: string) => v.length > 0);
            
            return [...new Set(descendants)] as string[];
        } catch (error) {
            console.error(`Error fetching descendants for ${descriptorUI}:`, error);
            return [];
        }
    }

    /**
     * Full resolution: Term → NCBI UID → Descriptor UI → All Descendants
     */
    static async resolveFullMeSH(term: string): Promise<MeSHDetails | null> {
        const normalized = term.toLowerCase().trim();
        const cached = this.cache.get(normalized);
        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            console.log(`[MeSH] Cache HIT: ${normalized}`);
            return cached.data;
        }

        console.log(`[MeSH] Resolving: ${term}`);
        const uid = await this.getMeshUid(term);
        if (!uid) {
            console.log(`[MeSH] Could not resolve UID for: ${term}`);
            return null;
        }

        const descriptorUI = await this.getDescriptorUI(uid);
        if (!descriptorUI) {
            console.log(`[MeSH] Could not resolve Descriptor UI for UID: ${uid}`);
            return { term, uid, descriptorUI: '', descendants: [] };
        }

        console.log(`[MeSH] Resolved: ${term} | NCBI UID: ${uid} | Descriptor: ${descriptorUI}`);
        
        const descendants = await this.getAllDescendants(descriptorUI);
        console.log(`[MeSH] Found ${descendants.length} descendants for ${term} (${descriptorUI})`);
        
        const result: MeSHDetails = {
            term,
            uid,
            descriptorUI,
            descendants
        };

        this.cache.set(normalized, { data: result, timestamp: Date.now() });
        return result;
    }
}
