import { Pinecone } from "@pinecone-database/pinecone";
import { createEmbedding } from "./embeddings";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index(
  process.env.PINECONE_INDEX!
);


export async function retrieveContext(query:string){

  // create embedding for user question
  const queryEmbedding = await createEmbedding(query);


  // search pinecone
  const result = await index.query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata:true
  });


  const contexts = result.matches?.map(
    match => match.metadata?.text
  );


  return contexts;
}