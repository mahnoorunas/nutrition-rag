import { openrouter } from "./openrouter";


export async function generateAnswer(
    question:string,
    context:string[]
){

    const prompt = `
You are a helpful nutrition assistant.

Answer the question only using the provided context.

Context:
${context.join("\n")}


Question:
${question}

If the answer is not present in the context,
say "I don't know based on the provided document."
`;


const response = await openrouter.chat.completions.create({

    model:"openai/gpt-4o-mini",

    messages:[
        {
            role:"user",
            content:prompt
        }
    ]

});


return response.choices[0].message.content;

}