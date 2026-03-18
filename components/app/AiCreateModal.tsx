"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { TagNode, TodoItem } from "@/lib/store"
import { X, Send, Mic, Paperclip, Sparkles, Plus } from "lucide-react"

interface AiCreateModalProps {
  open: boolean
  onClose: () => void
  onAdd: (todos: Omit<TodoItem, "id">[]) => void
  tags: TagNode[]
}

type Message = {
  role: "user" | "assistant"
  text: string
  todos?: Omit<TodoItem, "id">[]
  preview?: Omit<TodoItem, "id">
  previewNotes?: string
  previewSteps?: string[]
}

function parseTime(text: string): string | undefined {
  const timeMatch = text.match(/(\d{1,2})[：:点](\d{0,2})/)
  if (!timeMatch) return undefined
  return `${String(timeMatch[1]).padStart(2, "0")}:${String(timeMatch[2] || "00").padStart(2, "0")}`
}

function parseWorkflow(text: string): string[] {
  const match = text.match(/(流程|步骤)[:：]([^\n]+)/)
  if (!match) return []
  return match[2]
    .split(/->|→|>|、|，|,|;/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseNotes(text: string): string | undefined {
  const match = text.match(/(注意|备注|提示)[:：]([^\n]+)/)
  if (!match) return undefined
  return match[2].trim()
}

function parseTitle(text: string): string {
  const cleaned = text
    .replace(/流程[:：].*/g, "")
    .replace(/注意[:：].*/g, "")
    .replace(/备注[:：].*/g, "")
    .replace(/提示[:：].*/g, "")
  const first = cleaned.split(/[，,。；;！!？?]/).filter(Boolean)[0]
  return (first || text).trim()
}

// Simple AI parse: extract time + task from text
function parseInput(text: string): Omit<TodoItem, "id">[] {
  const today = new Date().toISOString().split("T")[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const results: Omit<TodoItem, "id">[] = []
  const sentences = text.split(/[，,。；;！!？?]/).filter(Boolean)

  for (const s of sentences) {
    if (!s.trim()) continue
    const isTomorrow = /明天|明日/.test(s)
    const date = isTomorrow ? tomorrow : today
    const time = parseTime(s)

    // strip time/date words to get clean title
    const title = s
      .replace(/明天|明日|今天|今日/, "")
      .replace(/(\d{1,2})[：:点]\d{0,2}/, "")
      .replace(/^\s+|\s+$/g, "")
    if (title.length < 2) continue

    results.push({
      title,
      time,
      date,
      done: false,
      steps: [`准备 ${title}`, `执行 ${title}`, `完成 ${title}`],
      notes: [`注意做好记录`],
    })
  }

  if (results.length === 0 && text.trim().length >= 2) {
    results.push({
      title: text.trim(),
      date: today,
      done: false,
      steps: [`准备 ${text.trim()}`, `执行 ${text.trim()}`, `完成确认`],
    })
  }
  return results
}

function flattenTags(nodes: TagNode[], map: Record<string, string> = {}) {
  nodes.forEach((node) => {
    map[node.id] = node.name
    if (node.children) flattenTags(node.children, map)
  })
  return map
}

function findTagIdsInText(text: string, tags: TagNode[]): string[] {
  const ids: string[] = []
  const map = flattenTags(tags)
  Object.entries(map).forEach(([id, name]) => {
    if (name && text.includes(name)) ids.push(id)
  })
  return Array.from(new Set(ids))
}

export default function AiCreateModal({ open, onClose, onAdd, tags }: AiCreateModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "你好！告诉我你需要做什么，我来帮你创建待办事项。\n例如：「明天下午3点开会」或「今天10点完成方案设计，14点客户沟通」",
    },
  ])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [draftText, setDraftText] = useState("")
  const [pendingTodo, setPendingTodo] = useState<Omit<TodoItem, "id"> | null>(null)
  const [pendingNotes, setPendingNotes] = useState<string | null>(null)
  const [pendingSteps, setPendingSteps] = useState<string[] | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tagNameMap = useMemo(() => flattenTags(tags), [tags])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function handleSend() {
    if (!input.trim() || isProcessing) return
    const userText = input.trim()
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text: userText }])
    setIsProcessing(true)

    setTimeout(() => {
      const merged = draftText ? `${draftText}\n${userText}` : userText
      const title = parseTitle(merged)
      const time = parseTime(merged)
      const steps = parseWorkflow(merged)
      const notes = parseNotes(merged)
      const date = /明天|明日/.test(merged)
        ? new Date(Date.now() + 86400000).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]

      if (!title.trim()) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: "我还没识别出事项名称，可以再补充一句吗？" },
        ])
        setIsProcessing(false)
        return
      }

      const tagIds = findTagIdsInText(merged, tags)
      const previewTodo: Omit<TodoItem, "id"> = {
        title,
        date,
        time: time || undefined,
        done: false,
        steps: steps.length ? steps : undefined,
        notes: notes ? [notes] : undefined,
        tags: tagIds.length > 0 ? tagIds : undefined,
      }

      setDraftText(merged)
      setPendingTodo(previewTodo)
      setPendingNotes(notes || null)
      setPendingSteps(steps.length ? steps : null)

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "我整理了一个预览，请确认是否填充：",
          preview: previewTodo,
          previewNotes: notes || undefined,
          previewSteps: steps.length ? steps : undefined,
        },
      ])
      setIsProcessing(false)
    }, 800)
  }

  function handleAddTodos(todos: Omit<TodoItem, "id">[]) {
    onAdd(todos)
    onClose()
  }

  function handleConfirmFill() {
    if (!pendingTodo) return
    onAdd([pendingTodo])
    setPendingTodo(null)
    setPendingNotes(null)
    setPendingSteps(null)
    setDraftText("")
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* sheet */}
      <div
        className="relative glass-card rounded-t-3xl flex flex-col"
        style={{ maxHeight: "80dvh", height: "80dvh" }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">AI 智能创建</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-border flex-shrink-0" />

        {/* messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="mr-2 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className="max-w-[80%]">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "app-gradient text-white rounded-tr-sm"
                      : "bg-secondary text-foreground rounded-tl-sm"
                  }`}
                >
                  {msg.text}
                </div>

                {/* todo preview cards */}
                {msg.todos && msg.todos.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2">
                    {msg.todos.map((todo, idx) => (
                      <div key={idx} className="bg-primary/5 border border-primary/20 rounded-2xl p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="font-medium text-foreground text-sm">{todo.title}</span>
                        </div>
                        {todo.time && (
                          <p className="text-muted-foreground text-xs ml-4 mt-0.5">{todo.time}</p>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddTodos(msg.todos!)}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-2xl app-gradient text-white text-sm font-medium active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      添加到待办
                    </button>
                  </div>
                )}

                {msg.preview && (
                  <div className="mt-2 bg-violet-50/70 border border-violet-200/60 rounded-2xl p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <span className="font-medium text-foreground text-sm">{msg.preview.title}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-violet-500">时间</span>
                        <span>{msg.preview.time || "未设置"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-violet-500">日期</span>
                        <span>{msg.preview.date}</span>
                      </div>
                      {msg.previewSteps && msg.previewSteps.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-violet-500">流程</span>
                          <span className="text-foreground/80">{msg.previewSteps.join(" / ")}</span>
                        </div>
                      )}
                      {msg.previewNotes && (
                        <div className="flex items-start gap-2">
                          <span className="text-violet-500">注意</span>
                          <span className="text-foreground/80">{msg.previewNotes}</span>
                        </div>
                      )}
                      {msg.preview.tags && msg.preview.tags.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-violet-500">标签</span>
                          <span className="text-foreground/80">
                            {msg.preview.tags.map((id) => tagNameMap[id] || id).join(" / ")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={handleConfirmFill}
                        className="flex-1 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-500 transition-colors"
                      >
                        确认填充
                      </button>
                      <button
                        onClick={() => setMessages((prev) => [...prev, { role: "assistant", text: "你可以继续补充细节，比如时间、流程或注意事项。" }])}
                        className="flex-1 py-2 rounded-xl bg-white/70 text-violet-600 text-xs font-semibold border border-violet-200 hover:bg-white"
                      >
                        继续补充
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* input area */}
        <div className="flex-shrink-0 p-4 pb-safe">
          <div className="flex items-end gap-2 bg-secondary rounded-2xl px-4 py-2.5">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入或说点什么..."
              rows={1}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none resize-none max-h-24"
            />
            <div className="flex items-center gap-2 pb-0.5">
              <button className="text-muted-foreground active:scale-95 transition-all">
                <Mic className="w-5 h-5" />
              </button>
              <button className="text-muted-foreground active:scale-95 transition-all">
                <Paperclip className="w-5 h-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="w-8 h-8 rounded-xl app-gradient flex items-center justify-center active:scale-95 transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
