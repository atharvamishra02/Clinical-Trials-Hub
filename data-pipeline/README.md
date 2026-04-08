# Data Pipeline Design

Responsible for the "completeness and richness" of the platform by aggregating diverse data sources.

## Data Sources
- **Clinical Registries**: Periodic sync with ClinicalTrials.gov and EudraCT (XML/JSON).
- **Scientific Literature**: PubMed API integration to fetch relevant abstracts based on trial IDs.
- **Omics/Targets**: OpenTargets integration for biology/pathway assessment.
- **News/PR**: Scraping engine for corporate press releases to capture "Readouts/Results" before they hit registries.

## Processing Steps
1. **Fetch**: Pull raw data from external APIs.
2. **Clean**: Remove duplicates and handle missing values.
3. **Normalize**: Map data to the internal taxonomy (Diseases, Drugs, Sponsors).
4. **Vectorize**: Convert text data into embeddings for the AI search.
