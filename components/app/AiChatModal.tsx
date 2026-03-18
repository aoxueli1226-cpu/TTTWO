"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send, Mic, MicOff } from "lucide-react"

interface AiChatModalProps {
  open: boolean
  onClose: () => void
}

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export default function AiChatModal({ open, onClose }: AiChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "您好！我是您的 AI 助手，有什么可以帮您的吗？您可以问我关于待办事项、日程安排或任何问题。",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!open) return null

  function handleSend() {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: generateResponse(userMessage.content),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1000)
  }

  function generateResponse(userInput: string): string {
    const lower = userInput.toLowerCase()
    if (lower.includes("待办") || lower.includes("任务")) {
      return "好的，您想添加什么待办事项呢？请告诉我任务的标题、日期和时间。"
    }
    if (lower.includes("日程") || lower.includes("安排")) {
      return "您今天的日程安排如下：10:00 完成产品方案设计，14:30 客户需求沟通，17:00 整理周报。有什么需要调整的吗？"
    }
    if (lower.includes("提醒")) {
      return "我可以帮您设置提醒。请告诉我需要提醒的内容和时间。"
    }
    return "我理解了。还有什么可以帮您的吗？"
  }

  function toggleRecording() {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器。")
      return
    }

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = "zh-CN"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsRecording(true)
    recognition.onend = () => setIsRecording(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* modal */}
      <div className="relative flex-1 flex flex-col m-4 mt-12 rounded-3xl overflow-hidden bg-background">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI 助手</h3>
              <p className="text-xs text-muted-foreground">随时为您服务</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-[10px] mt-1 opacity-60">
                    {msg.timestamp.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* input */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRecording}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="输入消息..."
              className="flex-1 bg-secondary rounded-2xl px-4 py-2.5 text-sm outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
