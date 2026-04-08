# Data Transformers

Normalizes raw, messy data into the platform's unified taxonomy.

## Subdirectories

### `/disease-normalizer`
Maps incoming therapeutic area strings to the 3-level taxonomy defined in the specs.

### `/drug-normalizer`
Classifies interventions into Modality (Biologic vs Small Molecule) and MoA.

### `/outcome-parser`
Extracts Primary/Secondary endpoints from raw text into structured JSON fields.
