import {
  parseMarkdownFolder,
  saveAllConceptsToJson,
} from "./parser/markdownParser";
import path from "path";
import * as fs from "fs";

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

async function main() {
  // Source markdown folder
  const markdownFolderPath = path.join(__dirname, "..", "data");

  // Output JSON folder
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

  // Save all concepts to the JSON directory
  await saveAllConceptsToJson(validConcepts, jsonOutputPath);
}

main().catch((error) => {
  console.error("An error occurred:", error);
});
