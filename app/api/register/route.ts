
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    console.log("========== REGISTER START ==========");

    const { name, email, password } = await req.json();

    console.log("NAME:", name);
    console.log("EMAIL:", email);
    console.log("PASSWORD RECEIVED:", !!password);

    if (!name || !email || !password) {
      console.log("ERROR: Missing fields");

      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check whether user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    console.log("EXISTING USER:", existingUser);
    console.log("CHECK ERROR:", checkError);

    if (checkError) {
      console.error("ERROR CHECKING USER:", checkError);

      return NextResponse.json(
        { error: "Could not check existing user" },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log("USER ALREADY EXISTS");

      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("PASSWORD HASH CREATED:", hashedPassword);

    // Insert user
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password: hashedPassword,
      })
      .select("id, name, email, created_at")
      .single();

    console.log("NEW USER:", newUser);
    console.log("INSERT ERROR:", insertError);

    if (insertError) {
      console.error("SUPABASE INSERT ERROR:", insertError);

      return NextResponse.json(
        {
          error: "Could not create user",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    console.log("========== REGISTER SUCCESS ==========");

    return NextResponse.json(
      {
        message: "User created successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTER EXCEPTION:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
