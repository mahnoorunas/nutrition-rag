"use client";

import { useState } from "react";
import { motion } from "framer-motion";


export default function Home() {

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);


  async function askQuestion() {

    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
      }),
    });


    const data = await response.json();

    setAnswer(data.answer);

    setLoading(false);
  }



  return (

    <main className="
      min-h-screen
      bg-[#0f172a]
      flex
      items-center
      justify-center
      p-6
      overflow-hidden
      relative
    ">


      {/* floating cute bubbles */}

      <motion.div
        animate={{
          y:[0,-20,0]
        }}
        transition={{
          duration:4,
          repeat:Infinity
        }}
        className="
        absolute
        top-20
        left-20
        text-5xl
        "
      >
        🌙
      </motion.div>



      <motion.div
        animate={{
          y:[0,20,0]
        }}
        transition={{
          duration:3,
          repeat:Infinity
        }}
        className="
        absolute
        bottom-20
        right-20
        text-5xl
        "
      >
        🥑
      </motion.div>




      <motion.div

        initial={{
          opacity:0,
          scale:0.8
        }}

        animate={{
          opacity:1,
          scale:1
        }}

        transition={{
          duration:0.6
        }}

        className="
        w-full
        max-w-3xl
        bg-[#111827]/80
        backdrop-blur-xl
        border
        border-purple-500/20
        shadow-2xl
        shadow-purple-900/40
        rounded-[2rem]
        p-8
        "

      >


        <motion.h1

        animate={{
          y:[0,-5,0]
        }}

        transition={{
          duration:2,
          repeat:Infinity
        }}

        className="
        text-4xl
        font-bold
        text-center
        bg-gradient-to-r
        from-pink-400
        via-purple-400
        to-blue-400
        bg-clip-text
        text-transparent
        "

        >

          🥗 NutriBuddy AI

        </motion.h1>



        <p className="
        text-center
        text-gray-400
        mt-3
        mb-8
        ">
          Your cute little nutrition companion ✨
        </p>




        <textarea

        value={question}

        onChange={(e)=>setQuestion(e.target.value)}

        placeholder="Ask me anything about nutrition... 💭"

        className="
        w-full
        h-36
        bg-[#1f2937]
        text-white
        placeholder-gray-500
        rounded-3xl
        p-5
        border
        border-gray-700
        outline-none
        focus:border-purple-400
        focus:ring-4
        focus:ring-purple-500/20
        transition
        resize-none
        "

        />





        <motion.button

        whileHover={{
          scale:1.05
        }}

        whileTap={{
          scale:0.95
        }}

        onClick={askQuestion}

        className="
        mt-5
        w-full
        py-4
        rounded-3xl
        bg-gradient-to-r
        from-purple-500
        via-pink-500
        to-blue-500
        text-white
        font-semibold
        shadow-lg
        shadow-purple-500/30
        "

        >

        {
          loading
          ? "🐾 Thinking..."
          : "✨ Ask NutriBuddy"
        }


        </motion.button>






        {
          loading && (

          <motion.div

          animate={{
            opacity:[0.3,1,0.3]
          }}

          transition={{
            duration:1,
            repeat:Infinity
          }}

          className="
          text-center
          text-purple-300
          mt-6
          "

          >

          🌸 Looking through my nutrition notes...

          </motion.div>

          )
        }





        {
          answer && (

          <motion.div

          initial={{
            opacity:0,
            y:30
          }}

          animate={{
            opacity:1,
            y:0
          }}

          className="
          mt-8
          bg-[#1e293b]
          rounded-3xl
          p-6
          border
          border-purple-500/20
          "

          >


          <h2 className="
          text-xl
          font-bold
          text-pink-300
          mb-3
          ">
            🤖 NutriBuddy says:
          </h2>


          <p className="
          text-gray-300
          leading-8
          ">
            {answer}
          </p>


          </motion.div>

          )
        }



      </motion.div>


    </main>

  );
}