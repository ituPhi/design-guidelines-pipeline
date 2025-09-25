# Design Guidelines Pipeline

A tool for parsing design system markdown documentation into structured concepts and importing them into Neo4j graph database.

## Overview

This pipeline:
1. Parses markdown files from a source directory
2. Extracts concepts and chunks from the markdown structure
3. Saves the structured data as JSON files
4. Imports the data into a Neo4j graph database

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up Neo4j environment variables:
   - `NEO4J_URL`
   - `NEO4J_USERNAME`
   - `NEO4J_PASSWORD`

3. Prepare your markdown files in the `data` directory

## Usage

Run the pipeline with:

```
node dist/index.js
```

## Data Structure

The pipeline processes markdown files with the following structure:

- `# Title` - Defines a concept
- `## Subtitle` - Defines a chunk within a concept
- Lines below titles are used as descriptions
- Lines beginning with "File:" are processed as file references

## Neo4j Schema

The imported graph consists of:
- `Concept` nodes with properties: id, title, description, source_file
- `Chunk` nodes with properties: id, title, text, assets, description
- Relationships: `HAS` (Concept to Chunk) and `PART_OF` (Chunk to Concept)
