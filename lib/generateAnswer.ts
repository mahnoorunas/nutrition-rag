import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText } from "ai";

const openrouterProvider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function generateAnswerStream(
  question: string,
  context: string[],
  history: ChatMessage[] = [],
  onFinish?: (event: { text: string }) => Promise<void> | void
) {
  const recentHistory = history.slice(-6);

  const systemPrompt = `You are NutriBuddy, a helpful nutrition assistant.

Your job is to answer the user's question using ONLY the provided nutrition context.

IMPORTANT RULES:
1. Use the provided context as the source of truth.
2. You may use the conversation history to understand what the user means.
3. Do not invent facts that are not supported by the context.
4. If the answer cannot be found in the context, say exactly:
"I don't know based on the provided document."
5. Keep answers clear and easy to understand.
6. Do not mention "context", "retrieval", "Pinecone", or internal system details.
7. If the user's question is a follow-up, use the previous conversation to understand what they are referring to.
8. Use markdown formatting when it helps readability: **bold**, *italics*, bullet points, numbered lists, etc.`;

  const contextBlock =
    context.length > 0
      ? context.join("\n\n")
      : "No nutrition context provided.";

  return streamText({
    model: openrouterProvider("openai/gpt-4o-mini"),
    system: systemPrompt,
    messages: [
      ...recentHistory,
      {
        role: "user",
        content: `Here is the relevant nutrition context:\n${contextBlock}\n\nBased ONLY on the context above, please answer this question: ${question}`,
      },
    ],
    onFinish,
  });
}