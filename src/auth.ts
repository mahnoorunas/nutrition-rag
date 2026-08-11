
import NextAuth, {
  type NextAuthOptions,
  getServerSession,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        console.log("AUTH CREDENTIALS:", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.log("Missing email or password");
          return null;
        }

        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        console.log("SUPABASE USER:", user);
        console.log("SUPABASE ERROR:", error);

        if (error || !user) {
          console.log("User not found");
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("PASSWORD MATCH:", passwordMatch);

        if (!passwordMatch) {
          console.log("Password does not match");
          return null;
        }

        console.log("LOGIN SUCCESS:", user.email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      /*
       * This runs when the user signs in.
       * Store the Supabase user ID inside the JWT.
       */
      if (user) {
        token.id = user.id;
      }

      return token;
    },

    async session({ session, token }) {
      /*
       * Put the ID from the JWT into the session.
       */
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
};

export const auth = () => getServerSession(authOptions);

export default NextAuth(authOptions);

