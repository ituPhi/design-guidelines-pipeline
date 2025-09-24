export interface Chunk {
  id: string;
  title: string;
  text: string;
  file_refs: string[];
  description: string;
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  chunks: Chunk[];
}

export interface ConceptFile {
  file: string;
  concept: Concept;
}

export interface Success {
  message: string;
}
