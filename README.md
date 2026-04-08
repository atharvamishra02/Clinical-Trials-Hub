# Clinical Trials Hub - System Design

This document outlines the high-level architecture for the Clinical Trials Hub, an intelligent platform for clinical trial analysis.

## Architecture Overview

The system is designed to handle high-volume data ingestion from multiple sources (registries, literature, market news) and provide a sophisticated search interface powered by both structured filtering and AI-driven summarization.

### Core Components

1.  **Frontend**: A modern web interface for researchers and strategy teams.
2.  **Backend (API & Intelligence)**: Processes requests, integrates with Large Language Models (LLMs) for "intelligent" queries, and manages business logic.
3.  **Data Pipeline**: Automated workers that crawl and normalize data from ClinicalTrials.gov, PubMed, and OpenTargets.
4.  **Database Layer**: Hybrid storage using a Relational Database (SQL) for structured trial data and a Vector Database for semantic search and AI retrieval.

---

## Directory Structure

| Folder | Responsibility |
| :--- | :--- |
| [`/frontend`](./frontend/) | React/Next.js application, UI components, and state management. |
| [`/backend`](./backend/) | API Layer, LLM orchestration, and core service logic. |
| [`/data-pipeline`](./data-pipeline/) | ETL processes, scrapers, and data normalization workers. |
| [`/database`](./database/) | Schema definitions and migration scripts (SQL + Vector). |
| [`/docs`](./docs/) | Technical specs, API documentation, and architecture diagrams. |

## Data Flow
1. **Ingestion**: The `data-pipeline` pulls from `ClinicalTrials.gov`, `PubMed`, etc.
2. **Processing**: Data is cleaned and indexed in the `database`.
3. **Querying**: User asks a query on the `frontend`.
4. **Intelligence**: `backend` determines if it's a structured filter or an LLM-required summarization.
5. **Response**: Data is served via the API to the UI.
