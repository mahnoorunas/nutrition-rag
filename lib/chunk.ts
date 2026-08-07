import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function splitDocument(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 100,
  });

  const chunks = await splitter.createDocuments([text]);

  return chunks;
}