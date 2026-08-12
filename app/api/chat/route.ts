import { auth } from "../../../src/auth";
import { supabase } from "@/lib/supabase";
import { retrieveContext } from "@/lib/retrieve";
import { generateAnswerStream, generateChatTitle } from "@/lib/generateAnswer";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { question, conversationId, history } = await req.json();

    if (!question?.trim()) {
      return new Response("Question is required", { status: 400 });
    }

    const userId = session.user.id;
    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const { data: conversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            user_id: userId,
            title: "New conversation",
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

      // Generate AI title asynchronously — don't block the stream
      generateChatTitle(question)
        .then(async (title) => {
          await supabase
            .from("conversations")
            .update({ title })
            .eq("id", currentConversationId)
            .eq("user_id", userId);
        })
        .catch(console.error);
    }

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

    const context = await retrieveContext(question);

    const result = generateAnswerStream(
      question,
      context,
      history ?? [],
      async ({ text }) => {
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

        await supabase
          .from("conversations")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentConversationId)
          .eq("user_id", userId);
      }
    );

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