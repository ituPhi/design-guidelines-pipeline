import neo4j from "neo4j-driver";
import type { Success, ConceptFile } from "../types.ts";

const config = {
  url: process.env.NEO4J_URL as string,
  username: process.env.NEO4J_USERNAME as string,
  password: process.env.NEO4J_PASSWORD as string,
};

async function importGraph(file: ConceptFile): Promise<Success> {
  const driver = neo4j.driver(
    config.url,
    neo4j.auth.basic(config.username, config.password),
  );
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      tx.run(
        `
         MERGE (c:Concept {id:$conceptId})
         SET c.title = $title, c.description=$description, c.source_file=$file
         FOREACH (chunk IN $chunks |
           MERGE (ch:Chunk {id: chunk.id})
           SET ch.title = chunk.title, ch.text = chunk.text, ch.assets = chunk.file_refs, ch.description=chunk.description
           MERGE (c)-[:HAS]->(ch)
           MERGE (ch)-[:PART_OF]->(c)
         )
         `,
        {
          conceptId: file.concept.id,
          title: file.concept.title,
          description: file.concept.description,
          file: file.file,
          chunks: file.concept.chunks,
        },
      );
      return { message: "Graph has been imported successfully" };
    });
  } catch (error) {
    console.error(error);
    return { message: "Graph import failed" };
  } finally {
    await session.close();
    await driver.close();
    return { message: "Graph import completed" };
  }
}

export async function importAllConcepts(
  conceptFiles: ConceptFile[],
): Promise<Success[]> {
  const results: Success[] = [];
  for (const file of conceptFiles) {
    const result = await importGraph(file);
    results.push(result);
  }
  return results;
}
