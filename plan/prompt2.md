# Clinical Trials Hub - Functional Spec

## Example User Queries:
* “Trials targeting EGFR in oncology”
* “Trials using plasma-derived therapeutics in autoimmune disorders”
* “Identify all active interventional trials for Pediatric Crohn's disease that are using a 'Head-to-Head' design comparing a JAK inhibitor against an Anti-TNF agent, excluding any trials that use a placebo arm”
* “I am working on first-in-class mAb development against OSMRβ in ulcerative colitis, show me all relevant clinical information”

## Use cases:
* **General dashboard** (no. of trials by different dimensions (phases, sponsors, etc)
* **Trial design:** 
    * Cohort selection
    * Primary, secondary Endpoint definition
    * Dosage selection
    * Arm design
* **Results/Readouts with analysis**
* **Site selection:** Identifying patient population, hospitals, PI, etc; e.g. trials by country
* **Market intelligence**
    * TPP definition (best-in-class definition)
    * Indication expansion
    * Target/biology/pathway assessment
* **Risk profiling** - Success rates by target/indication
* **Critical analysis** of a Press release regarding a trial readout

The product should provide meaningful views, insights and summarizations of the trial data deemed relevant for each of these use cases, rather than just a dump of trial data in a table.

## Who would want this?
* **Clinical strategy & portfolio teams** – to assess competitive trial landscapes
* **Medical affairs** – to track ongoing and upcoming trials by indication or sponsor
* **BD & licensing teams** – to identify assets, programs, and white spaces
* **Market intelligence & product teams** – to monitor trial activity shifts over time
* **Research analysts & consultants** – to generate fast, defensible trial views

## Entities handled by the search:

### Diseases
* **Levels:**
    * Therapeutic area/Disease category - e.g. cardiovascular, neuroimmune
    * Disease
    * Subcategory/stages - e.g. ALK-Positive Non-Small Cell Lung Cancer

### Drug/Intervention:
* **Levels:**
    * Mono/Combination therapies
    * Modality - e.g. small molecule, biologic, etc.
    * Broad category
    * By Route of Administration
    * By MoA/class of drugs - e.g. Lipid Modifying Agents
    * By Target
    * Drug names (generic, brand, code names)

### Sponsors:
* Pharma / biotech companies
* Academic or institutional sponsors

### Trial filters:
* Period
* Start date
* Completion date
* Recruitment status over time
* Status - ongoing/completed
* Results - success/failure, primary endpoints met, etc.
* Sites

### Data Sources:
Do not assume that ClinicalTrials.gov or trial repositories are the only source of information for this product. To ensure completeness and richness of the product other sources like PubMed, press releases, OpenTargets etc. can also be incorporated, depending on the above mentioned needs
