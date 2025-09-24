import * as fs from "fs";
import path from "path";

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

/**
 * Ensures a directory exists, creating it if necessary
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Saves a single concept file to JSON
 */
async function saveConceptToJson(
  conceptFile: ConceptFile,
  outputDir: string,
): Promise<void> {
  // Create filename from concept id
  const filename = `${conceptFile.concept.id}.json`;
  const filePath = path.join(outputDir, filename);

  try {
    // Use JSON.stringify with a replacer to handle any circular references or invalid values
    const jsonContent = JSON.stringify(conceptFile, null, 2);

    // Validate the JSON content before saving
    try {
      JSON.parse(jsonContent); // This will throw if JSON is invalid
    } catch (parseError) {
      console.error(
        `Invalid JSON generated for ${conceptFile.file}:`,
        parseError,
      );
      return; // Skip saving this file
    }

    await fs.promises.writeFile(filePath, jsonContent, "utf8");
    console.log(`Saved concept "${conceptFile.concept.title}" to ${filePath}`);
  } catch (error) {
    console.error(`Error saving concept to ${filePath}:`, error);
  }
}

/**
 * Saves all concept files to JSON in the specified directory
 */
export async function saveAllConceptsToJson(
  conceptFiles: ConceptFile[],
  outputDir: string,
): Promise<void> {
  // Ensure the output directory exists
  await ensureDirectoryExists(outputDir);

  // Save each concept file
  const savePromises = conceptFiles.map((conceptFile) =>
    saveConceptToJson(conceptFile, outputDir),
  );

  await Promise.all(savePromises);
  console.log(
    `Successfully saved ${conceptFiles.length} concepts to ${outputDir}`,
  );
}

export async function parseMarkdownFolder(
  folderPath: string,
  recursive: boolean = true,
): Promise<ConceptFile[]> {
  const concepts: ConceptFile[] = [];

  try {
    // Check if the directory exists
    try {
      await fs.promises.access(folderPath, fs.constants.R_OK);
    } catch (error) {
      console.error(
        `Directory ${folderPath} does not exist or is not readable`,
      );
      return concepts;
    }

    // Process all entries in the folder
    const entries = await fs.promises.readdir(folderPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const entryPath = path.join(folderPath, entry.name);

      if (entry.isDirectory() && recursive) {
        // Recursively process subdirectories
        const subConcepts = await parseMarkdownFolder(entryPath, true);
        concepts.push(...subConcepts);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Process markdown files
        try {
          const conceptFile = await parseMarkdownFile(entryPath);
          concepts.push(conceptFile);
        } catch (error) {
          console.error(`Error parsing file ${entryPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${folderPath}:`, error);
  }

  return concepts;
}

export async function parseMarkdownFile(
  filepath: string,
): Promise<ConceptFile> {
  const content = await fs.promises.readFile(filepath, "utf8");
  const lines = content.split("\n");

  let concept: Concept | null = null;
  let chunks: Chunk[] = [];
  let currentChunk: Chunk | null = null;
  let inFileRefBlock = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      concept = {
        id: slugify(line.slice(2)),
        title: line.slice(2),
        description: "",
        chunks: [],
      };
    } else if (line.startsWith("## ")) {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = {
        id: slugify(line.slice(3)),
        title: line.slice(3),
        text: "",
        file_refs: [],
        description: "",
      };
      inFileRefBlock = false;
    } else if (line.toLowerCase().startsWith("file:")) {
      if (currentChunk) {
        // Parse file references properly
        const fileRefs = line
          .slice(5)
          .trim()
          .split(",")
          .map((ref) => ref.trim());
        currentChunk.file_refs.push(...fileRefs);
      }
      inFileRefBlock = true;
    } else {
      // If we're not in a file reference block, add the line to the text
      if (!inFileRefBlock) {
        if (currentChunk) {
          currentChunk.text += (currentChunk.text ? "\n" : "") + line;
        } else if (concept) {
          concept.description += (concept.description ? "\n" : "") + line;
        }
      } else {
        // If we are in a file reference block, assume it's part of file references
        if (currentChunk && line.includes("./storage/")) {
          const fileRefs = line
            .trim()
            .split(",")
            .map((ref) => ref.trim());
          currentChunk.file_refs.push(...fileRefs);
        } else {
          // If it's not clearly a file reference, end the file ref block
          inFileRefBlock = false;
          if (currentChunk) {
            currentChunk.text += (currentChunk.text ? "\n" : "") + line;
          } else if (concept) {
            concept.description += (concept.description ? "\n" : "") + line;
          }
        }
      }
    }
  }

  if (!concept) {
    throw new Error(`No concept found in file ${filepath}`);
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  concept.chunks = chunks;
  return {
    file: filepath,
    concept,
  };
}

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9-]/g, "");
};
