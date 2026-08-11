"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-2xl"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="text-7xl mb-6"
        >
          🥑
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
          NutriBuddy
        </h1>

        <p className="text-xl text-gray-400 mb-3">
          Your personal AI nutrition companion
        </p>

        <p className="text-sm text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
          Ask anything about nutrition, diets, vitamins, and healthy eating.
          NutriBuddy searches through verified nutrition knowledge to give you
          accurate, personalized answers.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/register">
            <Button className="rounded-2xl px-8 py-6 text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 transition hover:scale-105">
              Get Started
            </Button>
          </Link>

          <Link href="/login">
            <Button
              variant="outline"
              className="rounded-2xl px-8 py-6 text-base border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              I already have an account
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: "🧠", title: "AI Powered", desc: "Smart answers from verified nutrition data" },
            { icon: "⚡", title: "Instant", desc: "Real-time streaming responses" },
            { icon: "🔒", title: "Private", desc: "Your conversations are secure" },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-gray-800 bg-[#111827]/60 p-5 backdrop-blur-sm"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <p className="absolute bottom-6 text-gray-600 text-xs">
        NutriBuddy © 2026
      </p>
    </main>
  );
}