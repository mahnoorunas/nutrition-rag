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

/*
 * --------------------------------------------------
 * Tiny prompt-engineering exercise:
 * Ask the LLM to generate a short chat title (3-5 words)
 * from the first user message. Non-blocking — called
 * asynchronously so it doesn't delay the stream.
 * --------------------------------------------------
 */
export async function generateChatTitle(
  question: string
): Promise<string> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
          "X-Title": "NutriBuddy",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You generate short, concise chat titles (3-5 words max). Respond with ONLY the title text. No quotes, no explanations, no punctuation at the end.",
            },
            {
              role: "user",
              content: `Generate a title for a chat that started with: "${question}"`,
            },
          ],
          max_tokens: 20,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      console.error("Title generation failed:", await response.text());
      return question.slice(0, 50);
    }

    const data = await response.json();
    const title =
      data.choices?.[0]?.message?.content?.trim() ??
      question.slice(0, 50);

    // Clean up: remove surrounding quotes, cap length
    return title
      .replace(/^["']|["']$/g, "")
      .replace(/\.$/, "")
      .slice(0, 60);
  } catch (error) {
    console.error("generateChatTitle error:", error);
    return question.slice(0, 50);
  }
}