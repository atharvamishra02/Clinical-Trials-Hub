# Database Schema

Definitions for the hybrid SQL + Vector storage layer.

## Subdirectories

### `/core`
Core SQL table definitions for `trials`, `sponsors`, and `interventions`.

### `/vector`
Definitions for vector indexes used in semantic search for press releases and abstracts.

### `/seeds`
Initial data for therapy classes, disease stages, and known sponsor hierarchies.

> [!IMPORTANT]
> **No Prisma**: All definitions are written in raw SQL or Knex-style migrations for maximum performance and schema control.
