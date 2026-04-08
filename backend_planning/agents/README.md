# Backend Intelligence & Agents

This directory houses the LLM-driven "brain" of the platform.

## Subdirectories

### `/summarizers`
Specific scripts to condense long trial readouts and press releases into actionable clinical summaries.

### `/intent-parsers`
Agents that take queries like *"Identify initial first-in-class mAb..."* and translate them into a combination of SQL filters and vector search parameters.

### `/linkers`
Entity resolution agents that ensure "EGFR", "ERBB1", and "HER1" all point to the same internal entity ID.
