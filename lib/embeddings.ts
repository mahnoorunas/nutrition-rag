import OpenAI from "openai";


const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});


export async function createEmbedding(text:string){

  const response = await openai.embeddings.create({

    model:"text-embedding-3-small",

    input:text,

  });


  return response.data[0].embedding;

}



export async function createEmbeddings(texts:string[]){

  const embeddings:number[][] = [];


  for(const text of texts){

    const embedding = await createEmbedding(text);

    embeddings.push(embedding);

    console.log("Embedding created");

  }


  return embeddings;

}