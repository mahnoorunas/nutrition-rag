import { NextResponse } from "next/server";
import fs from "fs";
import mammoth from "mammoth";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { createEmbeddings } from "@/lib/embeddings";
import { index } from "@/lib/pinecone";


export async function GET() {

  try {

    console.log("Loading document...");


    const fileBuffer = fs.readFileSync(
  "./data/Understanding_Everyday_Nutrition.docx"
);


const result = await mammoth.extractRawText({
  buffer: fileBuffer
});


const docs = [
  {
    pageContent: result.value,
    metadata: {}
  }
];



    console.log("Splitting document...");


    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });


    const chunks = await splitter.splitDocuments(docs);


    console.log(`Chunks: ${chunks.length}`);



    console.log("Creating embeddings...");


    const texts = chunks.map(
      (chunk)=>chunk.pageContent
    );


    const embeddings = await createEmbeddings(texts);



    console.log("Uploading to Pinecone...");


    const vectors = chunks.map((chunk, i) => ({
  id: `nutrition-${i}`,
  values: embeddings[i],
  metadata: {
    text: chunk.pageContent,
  },
}));


await index.upsert({
  records: vectors,
});



    console.log(
      `Uploaded ${vectors.length} vectors`
    );



    return NextResponse.json({

      success:true,

      message:`Uploaded ${vectors.length} vectors`

    });



  } catch(error:any){

    console.error(error);


    return NextResponse.json({

      success:false,

      error:error.message

    },{
      status:500
    });

  }

}