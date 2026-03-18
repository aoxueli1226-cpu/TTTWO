"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import { TodoItem } from "@/lib/store"

interface DailySummaryToastProps {
  todos: TodoItem[]
  open: boolean
  onClose: () => void
}

export default function DailySummaryToast({ todos, open, onClose }: DailySummaryToastProps) {
  const today = new Date().toISOString().split("T")[0]
  const doneTodos = todos.filter((t) => t.date === today && t.done)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed top-12 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
      <div className="glass-card rounded-3xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🎉</span>
              <h3 className="font-bold text-foreground">今日完成情况</h3>
            </div>
            <p className="text-primary font-semibold text-sm mb-2">
              完成了 {doneTodos.length} 项任务！
            </p>
            {doneTodos.slice(0, 3).map((todo) => (
              <div key={todo.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <p className="text-foreground text-xs">{todo.title}</p>
              </div>
            ))}
            {doneTodos.length === 0 && (
              <p className="text-muted-foreground text-sm">今天还没有完成任务，加油！</p>
            )}
            <p className="text-muted-foreground text-xs mt-2">明天继续加油！</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
