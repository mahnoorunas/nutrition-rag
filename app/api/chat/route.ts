import { NextResponse } from "next/server";
import { retrieveContext } from "@/lib/retrieve";
import { generateAnswer } from "@/lib/generateAnswer";


export async function POST(req:Request){

    const {question}=await req.json();


    // 1. Retrieve chunks from Pinecone
    const context = await retrieveContext(question);


    // 2. Generate answer using OpenRouter
    const answer = await generateAnswer(
        question,
        context as string[]
    );


    return NextResponse.json({
        answer
    });

}