"use client"

import { useState, useEffect } from "react"
import { TodoItem } from "@/lib/store"
import { X } from "lucide-react"

interface ScanOverlayProps {
  open: boolean
  onClose: () => void
  onAdd: (todos: Omit<TodoItem, "id">[]) => void
}

const SCAN_RESULTS = [
  { title: "项目评审会议", time: "10:00", date: "2026-03-15" },
  { title: "提交周报", time: "18:00", date: "2026-03-12" },
  { title: "预约体检", date: "2026-03-20" },
]

export default function ScanOverlay({ open, onClose, onAdd }: ScanOverlayProps) {
  const [scanning, setScanning] = useState(true)
  const [scanY, setScanY] = useState(0)
  const [selected, setSelected] = useState<number[]>([0, 1])

  useEffect(() => {
    if (!open) return
    setScanning(true)
    setScanY(0)
    setSelected([0, 1])

    // animate scan line
    let frame = 0
    const interval = setInterval(() => {
      frame += 2
      setScanY(frame % 100)
    }, 30)

    const timer = setTimeout(() => {
      clearInterval(interval)
      setScanning(false)
    }, 2000)

    return () => {
      clearInterval(interval)
      clearTimeout(timer)
    }
  }, [open])

  if (!open) return null

  function toggleSelect(idx: number) {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    )
  }

  function handleCreate() {
    const today = new Date().toISOString().split("T")[0]
    const todos: Omit<TodoItem, "id">[] = selected.map((idx) => ({
      title: SCAN_RESULTS[idx].title,
      time: SCAN_RESULTS[idx].time,
      date: SCAN_RESULTS[idx].date || today,
      done: false,
      steps: [`准备 ${SCAN_RESULTS[idx].title}`, `执行 ${SCAN_RESULTS[idx].title}`, "完成确认"],
    }))
    onAdd(todos)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* camera area */}
      <div className="relative flex-1 overflow-hidden">
        {/* simulated camera */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

        {/* scan frame */}
        <div className="absolute inset-8 border-2 border-violet-400/60 rounded-3xl overflow-hidden">
          {/* corner brackets */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-violet-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-violet-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-violet-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-violet-400 rounded-br-lg" />

          {/* scan line */}
          {scanning && (
            <div
              className="absolute left-0 right-0 h-0.5 bg-violet-400/80"
              style={{
                top: `${scanY}%`,
                boxShadow: "0 0 8px 2px rgba(139, 92, 246, 0.5)",
                transition: "top 0.03s linear",
              }}
            />
          )}
        </div>

        {/* status text */}
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
            <p className="text-white text-sm">
              {scanning ? "扫描中..." : "发现以下可创建的事项"}
            </p>
          </div>
        </div>

        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* results panel */}
      {!scanning && (
        <div className="glass-card rounded-t-3xl p-5 flex flex-col gap-4">
          <p className="font-semibold text-foreground">发现以下可创建的事项</p>

          <div className="flex flex-col gap-2">
            {SCAN_RESULTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => toggleSelect(idx)}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-all
                  ${selected.includes(idx) ? "bg-primary/10 border border-primary/30" : "bg-secondary border border-transparent"}`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${selected.includes(idx) ? "border-primary bg-primary" : "border-border"}`}
                >
                  {selected.includes(idx) && (
                    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-white">
                      <path d="M13.5 2.5L6 10l-3.5-3.5L1 8l5 5 9-9z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-foreground text-sm font-medium">{item.title}</p>
                  {item.time && <p className="text-muted-foreground text-xs">{item.time}</p>}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleCreate}
            disabled={selected.length === 0}
            className="w-full py-3.5 rounded-2xl app-gradient text-white font-semibold text-sm
              disabled:opacity-50 active:scale-95 transition-all"
          >
            创建选中的 {selected.length} 个事项
          </button>

          <button onClick={onClose} className="text-center text-muted-foreground text-sm">
            取消
          </button>
        </div>
      )}
    </div>
  )
}
