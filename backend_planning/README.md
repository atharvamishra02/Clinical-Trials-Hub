# Backend Design

The backend serves as the orchestration layer between the user, the data, and AI intelligence.

## Core Responsibilities
- **Search Service**: Translates user intent into database queries.
- **LLM Agent**:
  - Summarizes trial readouts and press releases.
  - Extracts insights for TPP (Target Product Profile) definitions.
  - Handles "First-in-class" development intelligence.
- **Entity Linking**: Maps drug names, diseases, and targets to a unified taxonomy (Normalizing "EGFR" vs "ErbB1").

## API Design (Rest/GraphQL)
- `/search`: Multi-parameter search endpoint.
- `/trials/{id}/summary`: AI-generated summary of a specific trial.
- `/analytics/market`: Aggregated data for market intelligence.

> [!IMPORTANT]
> **No ORM (Prisma)**: Database interactions will use raw SQL or a thin query builder (like Kysely or Knex) to maximize performance and visibility into complex clinical data joins.
