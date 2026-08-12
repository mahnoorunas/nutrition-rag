"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const justCreatedIdRef = useRef<string | null>(null);

  /*
   * --------------------------------------------------
   * Load conversation from URL on mount / direct nav
   * --------------------------------------------------
   */
  useEffect(() => {
    const id = params.id?.[0];
    if (
      id &&
      status === "authenticated" &&
      id !== justCreatedIdRef.current &&
      !loadingConversation
    ) {
      loadConversation(id);
    }
  }, [params.id, status]);

  /*
   * --------------------------------------------------
   * Redirect unauthenticated users to login
   * --------------------------------------------------
   */
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  /*
   * --------------------------------------------------
   * Auto-scroll to bottom
   * --------------------------------------------------
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /*
   * --------------------------------------------------
   * Load conversations
   * --------------------------------------------------
   */
  async function loadConversations() {
    try {
      setLoadingConversations(true);
      const response = await fetch("/api/conversations");
      if (!response.ok) throw new Error("Failed to load conversations");
      const data = await response.json();
      setConversations(data.conversations ?? []);
    } catch (error) {
      console.error("Load conversations error:", error);
    } finally {
      setLoadingConversations(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadConversations();
    }
  }, [status]);

  /*
   * --------------------------------------------------
   * Load a specific conversation
   * --------------------------------------------------
   */
  async function loadConversation(id: string) {
    try {
      setLoadingConversation(true);
      const response = await fetch(`/api/conversations/${id}`);

      if (!response.ok) {
        const text = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = {
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
        console.error("CONVERSATIONS API ERROR:", errorData);
        throw new Error(
          errorData.error || "Failed to load conversation"
        );
      }

      const data = await response.json();

      setConversationId(id);
      setMessages(data.messages ?? []);
      setQuestion("");
    } catch (error) {
      console.error("Load conversation error:", error);
    } finally {
      setLoadingConversation(false);
    }
  }

  /*
   * --------------------------------------------------
   * Start new chat
   * --------------------------------------------------
   */
  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setQuestion("");
    justCreatedIdRef.current = null;
    router.push("/chat");
  }

  /*
   * --------------------------------------------------
   * Rename conversation
   * --------------------------------------------------
   */
  async function renameConversation(id: string, newTitle: string) {
    if (!newTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!response.ok) throw new Error("Failed to rename");

      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, title: newTitle.trim() } : c
        )
      );
    } catch (error) {
      console.error("Rename error:", error);
    } finally {
      setEditingId(null);
    }
  }

  /*
   * --------------------------------------------------
   * Ask question — MANUAL STREAMING
   * --------------------------------------------------
   */
  async function askQuestion() {
    if (!question.trim() || loading) return;

    const userQuestion = question.trim();
    setQuestion("");

    const userMessage: Message = {
      role: "user",
      content: userQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userQuestion,
          conversationId,
          history,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong");
      }

      const newConversationId = response.headers.get("x-conversation-id");
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        justCreatedIdRef.current = newConversationId;
        window.history.replaceState(
          null,
          "",
          `/chat/${newConversationId}`
        );
        loadConversations();
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let fullText = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        if (!assistantAdded) {
          assistantAdded = true;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: fullText },
          ]);
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullText,
            };
            return updated;
          });
        }
      }
    } catch (error: any) {
      console.error("Chat error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Something went wrong.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * --------------------------------------------------
   * Delete conversation
   * --------------------------------------------------
   */
  async function deleteConversation(
    id: string,
    event: React.MouseEvent
  ) {
    event.stopPropagation();
    const confirmed = window.confirm("Delete this conversation?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete conversation");

      setConversations((previous) =>
        previous.filter((conversation) => conversation.id !== id)
      );

      if (conversationId === id) {
        startNewChat();
      }
    } catch (error) {
      console.error("Delete conversation error:", error);
    }
  }

  /*
   * --------------------------------------------------
   * Keyboard handling
   * --------------------------------------------------
   */
  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  }

  /*
   * --------------------------------------------------
   * Loading / Auth states
   * --------------------------------------------------
   */
  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-purple-300"
        >
          🌸 Loading NutriBuddy...
        </motion.div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  const displayName =
    session.user?.name?.split(" ")[0] ||
    session.user?.name ||
    "Friend";

  return (
    <main className="min-h-screen bg-[#0f172a] p-3 md:p-5">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-purple-500/20 bg-[#111827] shadow-2xl shadow-purple-900/20 md:h-[calc(100vh-2.5rem)]">
        {/* ============================================
            SIDEBAR
        ============================================ */}

        <aside className="hidden w-72 shrink-0 flex-col border-r border-gray-800 bg-[#0b1220] md:flex">
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 border-b border-gray-800 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-xl">
              🥑
            </div>

            <div>
              <h1 className="font-bold text-white">NutriBuddy</h1>
              <p className="text-[11px] text-gray-500">
                Nutrition Assistant
              </p>
            </div>
          </div>

          {/* New Chat */}
          <div className="p-4">
            <button
              onClick={startNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-300 transition hover:bg-purple-500/20"
            >
              <span className="text-lg">＋</span>
              New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-600">
              Recent chats
            </p>

            {loadingConversations ? (
              <div className="space-y-2 px-2">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-10 animate-pulse rounded-xl bg-gray-800/60"
                  />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <div className="mb-2 text-2xl">💬</div>
                <p className="text-xs text-gray-600">
                  Your conversations will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => {
                      if (editingId === conversation.id) return;
                      loadConversation(conversation.id);
                      router.push(`/chat/${conversation.id}`);
                    }}
                    className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-3 transition ${
                      conversationId === conversation.id &&
                      editingId !== conversation.id
                        ? "bg-purple-500/15 text-white"
                        : "text-gray-400 hover:bg-gray-800/70 hover:text-gray-200"
                    }`}
                  >
                    <span className="shrink-0 text-sm">💬</span>

                    {editingId === conversation.id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            renameConversation(
                              conversation.id,
                              editValue
                            );
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        onBlur={() =>
                          renameConversation(
                            conversation.id,
                            editValue
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-gray-800 text-white text-xs rounded px-2 py-1 outline-none border border-purple-500/50"
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-xs">
                        {conversation.title}
                      </span>
                    )}

                    {editingId !== conversation.id && (
                      <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(conversation.id);
                            setEditValue(conversation.title);
                          }}
                          className="text-xs text-gray-600 transition hover:text-purple-400"
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(event) =>
                            deleteConversation(
                              conversation.id,
                              event
                            )
                          }
                          className="text-xs text-gray-600 transition hover:text-red-400"
                          title="Delete conversation"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar user */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                <p className="text-[11px] text-gray-600">
                  NutriBuddy user
                </p>
              </div>

              <button
                onClick={() => signOut()}
                title="Sign out"
                className="text-gray-500 transition hover:text-red-400"
              >
                🚪
              </button>
            </div>
          </div>
        </aside>

        {/* ============================================
            MAIN CHAT
        ============================================ */}

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Mobile header */}
          <header className="flex items-center justify-between border-b border-gray-800 px-4 py-4 md:hidden">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🥑</span>
              <span className="font-bold text-white">NutriBuddy</span>
            </div>

            <button
              onClick={() => signOut()}
              className="text-sm text-gray-400"
            >
              🚪
            </button>
          </header>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {loadingConversation ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-sm text-purple-300">
                  🌸 Loading conversation...
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[500px] flex-col items-center justify-center text-center">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="mb-5 text-6xl"
                >
                  🌱
                </motion.div>

                <h2 className="text-2xl font-bold text-white">
                  Hey {displayName}! 👋
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
                  Ask me anything about nutrition and I'll search my
                  nutrition knowledge for you.
                </p>

                <div className="mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
                  {[
                    "What are good sources of protein?",
                    "What are carbohydrates?",
                    "Why are vitamins important?",
                    "What foods contain healthy fats?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setQuestion(suggestion)}
                      className="rounded-full border border-gray-700 bg-[#1e293b] px-4 py-2 text-xs text-gray-300 transition hover:border-purple-400 hover:bg-purple-500/10 hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id ?? index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex max-w-[85%] items-start gap-3 ${
                        message.role === "user"
                          ? "flex-row-reverse"
                          : ""
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          message.role === "user"
                            ? "bg-purple-500/20"
                            : "bg-pink-500/10"
                        }`}
                      >
                        {message.role === "user" ? "👤" : "🤖"}
                      </div>

                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-purple-500 text-white"
                            : "border border-gray-700 bg-[#1e293b] text-gray-300"
                        }`}
                      >
                        {message.role === "user" ? (
                          <p className="whitespace-pre-wrap text-sm leading-7">
                            {message.content}
                          </p>
                        ) : (
                          <div className="text-sm leading-7">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkBreaks]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc pl-4 mb-2 space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal pl-4 mb-2 space-y-1">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="mb-0.5">
                                    {children}
                                  </li>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-bold text-white">
                                    {children}
                                  </strong>
                                ),
                                em: ({ children }) => (
                                  <em className="italic text-gray-300">
                                    {children}
                                  </em>
                                ),
                                code: ({
                                  className,
                                  children,
                                }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="bg-gray-800 px-1 py-0.5 rounded text-xs font-mono text-pink-300">
                                      {children}
                                    </code>
                                  ) : (
                                    <code
                                      className={`${className} text-xs font-mono text-pink-300`}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                                pre: ({ children }) => (
                                  <pre className="bg-gray-900 p-3 rounded-lg overflow-x-auto text-xs my-2">
                                    {children}
                                  </pre>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-purple-500 pl-3 italic text-gray-400 my-2">
                                    {children}
                                  </blockquote>
                                ),
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-400 underline hover:text-purple-300"
                                  >
                                    {children}
                                  </a>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="text-lg font-bold text-white mb-2">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-base font-bold text-white mb-2">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-sm font-bold text-white mb-1">
                                    {children}
                                  </h3>
                                ),
                                hr: () => (
                                  <hr className="border-gray-700 my-3" />
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Thinking indicator — only while loading and last message is from user */}
                {loading &&
                  messages[messages.length - 1]?.role ===
                    "user" && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10">
                        🤖
                      </div>
                      <div className="rounded-2xl border border-gray-700 bg-[#1e293b] px-5 py-3">
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                          }}
                          className="text-gray-400"
                        >
                          Thinking...
                        </motion.div>
                      </div>
                    </div>
                  )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-800 bg-[#111827] p-4 md:p-5">
            <div className="mx-auto max-w-3xl">
              <div className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={2}
                  placeholder="Ask NutriBuddy something... 💭"
                  className="w-full resize-none rounded-2xl border border-gray-700 bg-[#1f2937] py-4 pl-4 pr-14 text-sm text-white placeholder-gray-500 outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 disabled:opacity-50"
                />

                <button
                  onClick={askQuestion}
                  disabled={loading || !question.trim()}
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ➤
                </button>
              </div>

              <p className="mt-2 text-center text-[11px] text-gray-600">
                Enter to send • Shift + Enter for a new line
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}