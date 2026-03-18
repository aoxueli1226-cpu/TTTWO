"use client"

import { useState, useRef, useEffect } from "react"
import { TodoItem } from "@/lib/store"
import { ScanLine, MessageSquare, Plus } from "lucide-react"

interface WidgetModeProps {
  todos: TodoItem[]
  onToggleTodo: (id: string) => void
  onClickTodo: (todo: TodoItem) => void
  onSwitchToApp: () => void
  onClickAddManual: () => void
  onClickScan: () => void
  onClickAiChat: () => void
}

export default function WidgetMode({
  todos,
  onToggleTodo,
  onClickTodo,
  onSwitchToApp,
  onClickAddManual,
  onClickScan,
  onClickAiChat,
}: WidgetModeProps) {
  const [ballPos, setBallPos] = useState({ x: 16, y: 120 })
  const [dragging, setDragging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const ballRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef({ x: 0, y: 0, ballX: 0, ballY: 0 })
  const dragMoved = useRef(false)

  const today = new Date().toISOString().split("T")[0]
  const todayTodos = todos.filter((t) => t.date === today)

  const now = new Date()
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"]
  const weekdayStr = `星期${weekdays[now.getDay()]}`
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`

  // Stick to edge
  function stickToEdge(x: number, containerW: number) {
    const threshold = containerW / 2
    if (x < threshold) return 8 // left
    return containerW - 48 - 8 // right
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragMoved.current = false
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ballX: ballPos.x,
      ballY: ballPos.y,
    }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true
    const containerW = containerRef.current?.offsetWidth || 375
    const containerH = containerRef.current?.offsetHeight || 812
    const newX = Math.max(0, Math.min(containerW - 48, dragStart.current.ballX + dx))
    const newY = Math.max(0, Math.min(containerH - 48, dragStart.current.ballY + dy))
    setBallPos({ x: newX, y: newY })
  }

  function handlePointerUp(e: React.PointerEvent) {
    setDragging(false)
    if (!dragMoved.current) {
      setMenuOpen((v) => !v)
      return
    }
    // snap to edge
    const containerW = containerRef.current?.offsetWidth || 375
    const snappedX = stickToEdge(ballPos.x, containerW)
    setBallPos((prev) => ({ ...prev, x: snappedX }))
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-dvh overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #1a1040 0%, #0f0b2e 50%, #1e0a3c 100%)",
      }}
    >
      {/* wallpaper stars */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() > 0.7 ? 2 : 1,
            height: Math.random() > 0.7 ? 2 : 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.6 + 0.2,
          }}
        />
      ))}

      {/* widget card */}
      <div
        className="absolute left-4 top-16 right-4"
        style={{ maxWidth: 280 }}
      >
        <div
          className="glass-card rounded-3xl p-4 transition-all duration-300 backdrop-blur-md"
          style={{
            background: "rgba(255, 255, 255, 0.1)", // More transparent
            borderColor: "rgba(255, 255, 255, 0.2)",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* date header */}
          <div className="mb-3">
            <p className="text-white/80 text-xs font-medium">{weekdayStr}</p>
            <p className="font-bold text-white text-lg tracking-wide">{dateStr}</p>
          </div>

          {/* todo list */}
          <div className="flex flex-col gap-3">
            {todayTodos.slice(0, 4).map((todo) => {
              const displayTime = todo.time; // Keep time string as is

              return (
              <div key={todo.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => onToggleTodo(todo.id)}
                  className={`w-4 h-4 rounded-full border border-white/60 flex items-center justify-center flex-shrink-0 transition-all
                    ${todo.done ? "bg-white/80 border-transparent" : "hover:border-white"}`}
                >
                  {todo.done && (
                    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-black/70">
                      <path d="M13.5 2.5L6 10l-3.5-3.5L1 8l5 5 9-9z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => onClickTodo(todo)}
                  className="text-left flex items-center gap-2 min-w-0"
                >
                  {displayTime && (
                    <span className="text-white/70 text-xs font-mono bg-white/10 px-1 rounded">{displayTime}</span>
                  )}
                  <span className={`text-white text-sm truncate ${todo.done ? "line-through opacity-50" : "font-medium shadow-black/50 drop-shadow-sm"}`}>
                    {todo.title}
                  </span>
                </button>
              </div>
            )})}
            {todayTodos.length === 0 && (
                 <div className="text-white/50 text-xs italic">暂无待办事项</div>
            )}
          </div>
        </div>
      </div>

      {/* floating ball */}
      <button
        ref={ballRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`absolute w-12 h-12 rounded-full flex items-center justify-center z-50
          shadow-lg transition-shadow active:shadow-xl select-none touch-none
          ${dragging ? "shadow-violet-500/50" : "shadow-black/40"}`}
        style={{
          left: ballPos.x,
          top: ballPos.y,
          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        }}
      >
        <div className="w-4 h-4 rounded-full bg-white/80" />
      </button>

      {/* ball menu */}
      {menuOpen && (
        <div
          className="absolute z-40 glass-card rounded-2xl p-2 flex flex-col gap-1"
          style={{
            left: ballPos.x + 56,
            top: ballPos.y,
            minWidth: 130,
          }}
        >
          <button
            onClick={() => { onClickScan(); setMenuOpen(false) }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-accent text-foreground text-sm"
          >
            <ScanLine className="w-4 h-4 text-primary" />
            扫描
          </button>
          <button
            onClick={() => { onClickAddManual(); setMenuOpen(false) }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-accent text-foreground text-sm"
          >
            <Plus className="w-4 h-4 text-primary" />
            添加事项
          </button>
          <button
            onClick={() => { onClickAiChat(); setMenuOpen(false) }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-accent text-foreground text-sm"
          >
            <MessageSquare className="w-4 h-4 text-primary" />
            AI 对话
          </button>
        </div>
      )}

      {/* close menu tap outside */}
      {menuOpen && (
        <div
          className="absolute inset-0 z-30"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}
