import { NextResponse } from "next/server";
import { auth } from "../../../src/auth";
import { supabase } from "@/lib/supabase";


export async function GET() {
  try {
    const session = await auth();

    console.log("CONVERSATIONS SESSION:", session);
    console.log("CONVERSATIONS USER ID:", session?.user?.id);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          debug: {
            hasSession: !!session,
            user: session?.user ?? null,
          },
        },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("SUPABASE CONVERSATIONS ERROR:", error);
      throw error;
    }

    return NextResponse.json({
      conversations: data ?? [],
    });
  } catch (error: any) {
    console.error("Get conversations error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ?? "Failed to load conversations",
      },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const title =
      body.title?.trim() || "New conversation";

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: session.user.id,
        title,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      conversation: data,
    });
  } catch (error: any) {
    console.error("Create conversation error:", error);

    return NextResponse.json(
      {
        error: error?.message ?? "Failed to create conversation",
      },
      { status: 500 }
    );
  }
}
