# Scraper Architecture

Responsible for raw data collection from various clinical registries and sources.

## Subdirectories

### `/registries`
Scrapers for ClinicalTrials.gov (API/XML), EudraCT, and JPRN.

### `/clinical-journals`
Integration with PubMed and bioRxiv to pull scientific context for trials.

### `/news-engine`
Scrapers for corporate press release pages (e.g., Pfizer, Roche) to catch real-time trial readouts.
