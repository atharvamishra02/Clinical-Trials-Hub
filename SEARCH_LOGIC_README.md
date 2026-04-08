# Clinical Intelligence Search Engine Architecture

## 1. Overview and User Query Flow

The Clinical Intelligence Dashboard is designed to provide high-precision clinical trial search results. It translates natural language user queries into standardized medical ontologies (MeSH) and executes them against the exact, curated clinical data tables using an AI-assisted parsing pipeline.

### **How the User Gives a Query**
1. **User Input:** The user types a natural language query into the frontend search bar (e.g., "Cardiovascular diseases treated with monoclonal antibodies", "show me multiple myeloma trials in phase 3").
2. **AI Parsing (`QueryParser.ts`):** 
   - The raw text is sent to the Gemini AI backend. 
   - The AI acts as a sophisticated medical parser. It extracts the raw text and standardizes it into distinct categories: `conditions` (diseases), `interventions` (drugs/biologics), `phases` (e.g., Phase 3), and `status` (e.g., Recruiting).
   - *Example:* "Cardiovascular diseases" -> Condition: Cardiovascular Diseases, "Monoclonal antibodies" -> Intervention: Antibodies, Monoclonal.

## 2. Ontology Resolution & MeSH Hierarchy Expansion (`MeSHHierarchyService.ts`)

Once the terms are extracted, the system needs to understand what these terms actually mean in the broader medical landscape so it can find all related sub-diseases and sub-drugs.

### **The Resolution Pipeline:**
1. **E-Search API (UID Lookup):** The system takes the standardized term (e.g., "Cardiovascular Diseases") and queries the NCBI E-utilities API (`esearch.fcgi`) to find its official internal NCBI Sequence UID (e.g., `68002318`).
2. **E-Summary API (Descriptor UI Lookup):** It then queries the NCBI eSummary API (`esummary.fcgi`) to convert the UID into an official MeSH Descriptor UI (e.g., `D002318`).
3. **SPARQL Endpoint (Full Hierarchy Expansion):** Finally, the system queries the **NLM SPARQL Database** (`id.nlm.nih.gov/mesh/sparql`). It looks at the `meshv:treeNumber` of the parent descriptor and pulls down **every single descendant** that falls underneath that tree branch. 
   - *Example:* "Cardiovascular Diseases" expands into 470+ specific diseases (Heart Failure, Hypertension, Arrhythmia, etc.).
   - "Antibodies, Monoclonal" expands into specific biologics (Rituximab, Pembrolizumab, Trastuzumab).

## 3. Database Execution (`QueryBuilder.ts`)

With a fully expanded list of parent terms and descendants, the backend builds a massive, precision-targeted SQL query against the AACT (Access to Aggregate Content of ClinicalTrials.gov) PostgreSQL database.

### **What We Check & Where We Search**
1. **Filtering the Trials:** The system builds dynamic `IN (...)` SQL clauses using the expanded descendant list. 
2. **Current Tables Checked (The Source of Truth):**
   - We query against **`ctgov.browse_conditions.mesh_term`** and **`ctgov.browse_interventions.mesh_term`**.
   - We filter using the SQL clause `mesh_type = 'mesh-list'` to ensure it's matching officially curated clinical terms tagged by the trial administrators.
3. **Data Aggregation:** We join our matching studies heavily against these `browse` tables to build the Matched Diseases, Matched Drugs, and the deep Matrix Heatmap chart.
4. **Strict Matrix Display:** The `OverviewCharts` in the frontend visually aggregates *only* the strings that strictly match our exact MeSH Target sets (`condTargets` / `intTargets`). This filters out background noise.

---

## 4. System Evolution: What We Did Before & Why We Changed It

The path to this high-precision engine took several iterations. Here is the engineering history of what we checked before deployment and how the logic evolved:

### **Phase 1: Raw Text & Fuzzy String Matching**
- **How it worked initially:** Early in development, we took the user's search query and did wildcard SQL searches (e.g., `ILIKE '%cardiovascular%'`) directly against raw trial tables: `ctgov.conditions.downcase_name` and `ctgov.interventions.name`. 
- **The Problem:** It introduced massive clinical "noise" and missed obvious matches. For example, searching for "cancer" would completely miss specific trials labeled "Multiple Myeloma" because the string "cancer" wasn't explicitly in the disease cell. If we searched "Antibodies", we got noisy raw text like "Antibody-drug conjugate" instead of actual specific drug names.
- **Exclusion Flaws:** When users typed `except multiple myeloma`, fuzzy string matching failed because related synonyms weren't caught.

### **Phase 2: Transitioning to the AACT "Browse" Tables**
- **The Pivot:** We realized AACT has mapped, pre-curated MeSH tables (`browse_conditions` and `browse_interventions`). Instead of searching raw trial strings, we switched our core SQL queries to check the `mesh_term` column.
- **The Benefit:** This instantly harmonized synonyms. "Breast Cancer" and "Malignant Neoplasm of Breast" both mapped to the exact same terms.

### **Phase 3: Building the Active Hierarchy (The MeSH Expansion)**
- **The Problem:** Even with MeSH tables, searching a parent term like `Cardiovascular Diseases` wouldn't return trials specifically tagged with `Atrial Fibrillation` because the string didn't match exactly.
- **The Solution:** We integrated the NLM SPARQL API. Now, when a user searches a broad class, we auto-expand it to hundreds of children using their exact MeSH tree lineages, ensuring zero missed trials.

### **Phase 4: The Matrix Heatmap & the "Silo Protection" Experiment**
- **The Problem:** In the frontend, the matrix heatmap was displaying "noise." When evaluating Cardiovascular trials, diseases like "Diabetic Retinopathy" or "Multiple Myeloma" showed up.
- **The "Silo Filter" Attempt:** We briefly wrote an algorithm to detect the primary medical branch of the query (e.g., identifying Cardiovascular as tree branch `C14`). During expansion, if a term belonged primarily to an unrelated silo like Eye Diseases (`C11`) or Cancer (`C04`), we actively excluded it.
- **The Final Reality Check:** After debugging, we found what seemed like "noise" was actually official medical truth. We discovered that terms like "Multiple Myeloma" legitimately exist *inside* the Cardiovascular tree (`C14.907` - Vascular Diseases -> Hemorrhagic Disorders -> Paraproteinemias) in the NLM database. We removed the artificial "Silo Filter" to respect the exact official ontological paths constructed by the National Library of Medicine. Pure clinical accuracy requires trusting the official MeSH tree over visual aesthetics.
