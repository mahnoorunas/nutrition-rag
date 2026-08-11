import { auth } from "../../../src/auth";
import { supabase } from "@/lib/supabase";
import { retrieveContext } from "@/lib/retrieve";
import { generateAnswerStream } from "@/lib/generateAnswer";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // ------------------------------------------
    // Authentication
    // ------------------------------------------
    const session = await auth();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    // ------------------------------------------
    // Parse body
    // ------------------------------------------
    const { question, conversationId, history } = await req.json();

    if (!question?.trim()) {
      return new Response("Question is required", { status: 400 });
    }

    const userId = session.user.id;
    let currentConversationId = conversationId;

    // ------------------------------------------
    // Create conversation if this is a new chat
    // ------------------------------------------
    if (!currentConversationId) {
      const title =
        question.trim().length > 50
          ? question.trim().substring(0, 50) + "..."
          : question.trim();

      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          title,
        })
        .select("id")
        .single();

      if (conversationError) {
        console.error("CREATE CONVERSATION ERROR:", conversationError);
        return new Response(
          JSON.stringify({
            error:
              conversationError.message || "Failed to create conversation",
          }),
          { status: 500 }
        );
      }

      currentConversationId = conversation.id;
    }

    // ------------------------------------------
    // Save user's message
    // ------------------------------------------
    const { error: userMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: currentConversationId,
        role: "user",
        content: question.trim(),
      });

    if (userMessageError) {
      console.error("SAVE USER MESSAGE ERROR:", userMessageError);
      return new Response(
        JSON.stringify({
          error: userMessageError.message || "Failed to save user message",
        }),
        { status: 500 }
      );
    }

    // ------------------------------------------
    // Retrieve RAG context
    // ------------------------------------------
    const context = await retrieveContext(question);

    // ------------------------------------------
    // Generate & stream AI answer
    // ------------------------------------------
    const result = generateAnswerStream(
      question,
      context,
      history ?? [],
      async ({ text }) => {
        // Save assistant message after stream completes
        const { error: assistantMessageError } = await supabase
          .from("messages")
          .insert({
            conversation_id: currentConversationId,
            role: "assistant",
            content: text,
          });

        if (assistantMessageError) {
          console.error(
            "SAVE ASSISTANT MESSAGE ERROR:",
            assistantMessageError
          );
        }

        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentConversationId)
          .eq("user_id", userId);
      }
    );

    // Return streaming response with conversation ID in header
    return result.toTextStreamResponse({
      headers: {
        "x-conversation-id": currentConversationId,
      },
    });
  } catch (error: any) {
    console.error("CHAT API ERROR:", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Something went wrong",
      }),
      { status: 500 }
    );
  }
}