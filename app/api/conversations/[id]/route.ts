import { NextResponse } from "next/server";
import { auth } from "../../../../src/auth";
import { supabase } from "@/lib/supabase";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: Request,
  { params }: Params
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Make sure this conversation belongs to the
    // currently logged-in user.
    const { data: conversation, error: conversationError } =
      await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("id", id)
        .eq("user_id", session.user.id)
        .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const { data: messages, error: messagesError } =
      await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return NextResponse.json({
      conversation,
      messages: messages ?? [],
    });
  } catch (error: any) {
    console.error("Get conversation error:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to load conversation",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: Params
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("Delete conversation error:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to delete conversation",
      },
      { status: 500 }
    );
  }
}

