import { index } from "./pinecone";
import { createEmbedding } from "./embeddings";


export async function retrieveContext(query: string) {
  if (!query?.trim()) {
    return [];
  }

  const queryEmbedding = await createEmbedding(query);

  const result = await index.query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata: true,
  });

  return (
    result.matches
      ?.map((match) => match.metadata?.text ?? "")
      .filter((text): text is string => Boolean(text)) ?? []
  );
}