import {
  parseMarkdownFolder,
  saveAllConceptsToJson,
} from "./parser/markdownParser.js";
import path from "path";
import * as fs from "fs";
import { importAllConcepts } from "./neo4j/importGraph.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { ConceptFile } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

async function readJsonFromDir(dirPath: string): Promise<ConceptFile[]> {
  const conceptFiles: ConceptFile[] = [];
  try {
    const files = await fs.promises.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const fileContent = await fs.promises.readFile(filePath, "utf8");
      const conceptFile = JSON.parse(fileContent) as ConceptFile;
      conceptFiles.push(conceptFile);
    }
  } catch (error) {
    console.error(`Error reading JSON files from ${dirPath}:`, error);
    return [];
  }
  return conceptFiles;
}

async function main() {
  // Source markdown folder

  const markdownFolderPath = path.join(__dirname, "..", "data");

  const jsonOutputPath = path.join(__dirname, "..", "data", "json");
  await ensureDirectoryExists(jsonOutputPath);

  console.log(`Parsing markdown files from ${markdownFolderPath}...`);
  const concepts = await parseMarkdownFolder(markdownFolderPath);
  console.log(`Found ${concepts.length} concept files.`);

  // Validate each concept before saving
  const validConcepts = concepts.filter((concept) => {
    try {
      JSON.stringify(concept); // Test if it can be converted to valid JSON
      return true;
    } catch (e) {
      console.error(`Invalid concept detected in ${concept.file}: ${e}`);
      return false;
    }
  });

  await saveAllConceptsToJson(validConcepts, jsonOutputPath);
  console.log(`Importing concepts into Neo4j...`);

  const jsonFiles = await readJsonFromDir(jsonOutputPath);
  console.log(`Imported ${jsonFiles.length} JSON files.`);

  const importResult = await importAllConcepts(jsonFiles);
  console.log(`Imported ${importResult.length} concepts into Neo4j.`);
}

main().catch((error) => {
  console.error("An error occurred:", error);
});
