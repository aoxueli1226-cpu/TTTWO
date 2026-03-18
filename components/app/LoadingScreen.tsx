"use client"

import { useEffect } from "react"
import { loadUser } from "@/lib/persistence"

interface LoadingScreenProps {
  onDone: (hasUser: boolean) => void
}

export default function LoadingScreen({ onDone }: LoadingScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone(!!loadUser())
    }, 2000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f5f0ff 0%, #ede4ff 50%, #f8f4ff 100%)" }}>
      {/* subtle background circles */}
      <div className="absolute top-20 right-10 w-40 h-40 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="absolute bottom-32 left-10 w-56 h-56 rounded-full bg-violet-100/40 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        {/* TT Logo - simple circle */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
            <span className="text-white font-bold text-2xl tracking-tight">TT</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-violet-900 tracking-wide">桌面管家</h1>
          <p className="text-violet-600/70 text-sm mt-1">AI 智能待办助手</p>
        </div>

        {/* loading indicator - simple spinner */}
        <div className="mt-2">
          <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}
