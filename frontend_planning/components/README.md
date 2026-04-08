# Frontend Component Architecture

This directory contains the reusable UI building blocks for the Clinical Trials Hub.

## Subdirectories

### `/ui`
Generic, low-level components like buttons, inputs, modals, and tables. These follow the visual identity of the brand (Glassmorphism, dark mode).

### `/charts`
Data visualization components using D3 or Chart.js for recruitment trends, phase distributions, and geographic trial maps.

### `/search`
Complex search-related components:
- **SmartSearchBar**: Handles both text input and visual filters.
- **FilterPanel**: Multi-level taxonomy selectors for diseases and drugs.

### `/trial-detail`
Components specific to the trial analysis view, such as Arm Design grids and Endpoint definition cards.
