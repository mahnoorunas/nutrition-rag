import { NextResponse } from "next/server";
import { loadDocument } from "@/lib/loader";
import { splitDocument } from "@/lib/chunk";
import { createEmbeddings } from "@/lib/embeddings";
import { index } from "@/lib/pinecone";

export async function GET() {
  try {
    const text = await loadDocument();
    const chunks = await splitDocument(text);

    const texts = chunks.map((chunk) => chunk.pageContent);
    const embeddings = await createEmbeddings(texts);

    const vectors = chunks.map((chunk, i) => ({
      id: `nutrition-${i}`,
      values: embeddings[i],
      metadata: {
        text: chunk.pageContent,
      },
    }));

    await index.upsert({ records: vectors });

    return NextResponse.json({
      success: true,
      uploaded: vectors.length,
    });
  } catch (error: any) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
