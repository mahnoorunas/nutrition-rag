import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/loader";
import { splitDocument } from "@/lib/chunk";
import { getEmbedding } from "@/lib/embeddings";
import { index } from "@/lib/pinecone";

export async function GET() {

  console.log("1. Route started");

  const text = await loadDocument();

  console.log("2. Document loaded");

  const chunks = await splitDocument(text);

  console.log("3. Chunks:", chunks.length);


  const vectors = await Promise.all(
    chunks.map(async (chunk, i) => {

      console.log(`Creating embedding ${i}`);

      const embedding = await getEmbedding(
        chunk.pageContent
      );

      return {
        id: `chunk-${i}`,
        values: embedding,
        metadata: {
          text: chunk.pageContent,
        },
      };
    })
  );


  console.log("4. All embeddings created");


  await index.upsert({
    records: vectors,
  });


  console.log("5. Uploaded to Pinecone");


  return NextResponse.json({
    success: true,
    uploaded: vectors.length,
  });
}