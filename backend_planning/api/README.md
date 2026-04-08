# Backend API Architecture

This directory handles all external-facing endpoints for the Clinical Trials Hub.

## Subdirectories

### `/v1`
Versioned API routes:
- `search.ts`: Handles unified search logic.
- `trials.ts`: CRUD and summary retrieval for specific trials.
- `analytics.ts`: Endpoints for dashboard data.

### `/middleware`
Handles authentication, request logging, and error normalization.

### `/validators`
Schema validation for incoming requests (e.g., ensuring "Phase" is a valid trial phase) without using an ORM validator.
