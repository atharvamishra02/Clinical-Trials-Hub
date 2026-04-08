# Database Design

A hybrid architecture to support both high-speed filtering and semantic (AI) retrieval.

## Storage Strategy
- **Relational (PostgreSQL)**: 
  - Stores all structured trial information (Arm design, dates, sponsors, endpoints).
  - Used for "Trial Filters" (Start date, status, recruitment).
- **Vector Store (pgvector or Pinecone)**:
  - Stores embeddings for press releases and PubMed abstracts.
  - Enables "Intelligent Queries" by finding semantically related trials.

## Key Entities (Tables)
- `trials`: Core trial metadata.
- `interventions`: Drugs, biologics, and modalities.
- `diseases`: Therapeutic areas and subcategories.
- `sponsors`: Pharma, Biotech, and Academic entities.
- `sites`: Geographical locations and PIs.

> [!NOTE]
> Database interactions are handled via raw SQL or query builders. **Prisma is explicitly excluded.**
