"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Plus,
    X,
    Mic,
    Sparkles,
    Wand2,
    GripVertical,
    CalendarDays,
    Bell,
    ChevronDown,
    Clipboard,
    Image as ImageIcon,
    GitCommit,
    StickyNote
} from "lucide-react"
import { TagNode, TodoItem, WorkflowNode } from "@/lib/store"
import TagSelector from "@/components/app/TagSelector"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import AppDateTimePicker from "@/components/app/AppDateTimePicker"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

interface ManualCreateModalProps {
  open: boolean
  onClose: () => void
  onAdd: (todo: Omit<TodoItem, "id">) => void
    tags: TagNode[]
    onCreateTag: (parentId: string | null, name?: string) => string | null
}

export default function ManualCreateModal({ open, onClose, onAdd, tags, onCreateTag }: ManualCreateModalProps) {
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [endDate, setEndDate] = useState("")
  const [reminder, setReminder] = useState(false)
    const [timeRangeEnabled, setTimeRangeEnabled] = useState(false)
    const [reminderAt, setReminderAt] = useState("")
    const [timeRangeStart, setTimeRangeStart] = useState("")
    const [timeRangeEnd, setTimeRangeEnd] = useState("")
    const [done, setDone] = useState(false)
    const [notesContent, setNotesContent] = useState("")
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
    const [notesEditing, setNotesEditing] = useState(false)
    const [notesDraft, setNotesDraft] = useState("")
    const notesDraftRef = useRef("")
    const notesPanelRef = useRef<HTMLDivElement>(null)
    const notesSelectionRef = useRef<any>(null)
  
  // Workflow state
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([])
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [newNodeLabel, setNewNodeLabel] = useState("")
  
  // Smart Input
  const [smartInput, setSmartInput] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [aiExpanded, setAiExpanded] = useState(false)
    const [aiProcessing, setAiProcessing] = useState(false)
    const aiFileInputRef = useRef<HTMLInputElement>(null)

  const formatTime = (value: string) => {
    if (!value) return ""
    const parts = value.split("T")
    if (parts.length < 2) return ""
    return parts[1].slice(0, 5)
  }

    const formatDateTime = (value: string) => {
        if (!value) return ""
        const [datePart, timePart] = value.split("T")
        if (!datePart || !timePart) return ""
        return `${datePart.replaceAll("-", "/")} ${timePart.slice(0, 8)}`
    }

    const normalizeDateTimeValue = (value: string) => (value ? value : "")

    const cleanupQuillArtifacts = () => {
        if (typeof document === "undefined") return
        const root = notesPanelRef.current ?? document
        root.querySelectorAll(".ql-tooltip, .ql-tooltip-arrow").forEach((node) => node.remove())
        root.querySelectorAll(".ql-picker-options").forEach((node) => node.remove())

        const toolbars = Array.from(root.querySelectorAll(".ql-toolbar"))
        if (toolbars.length > 1) {
                toolbars.slice(0, -1).forEach((node) => node.remove())
        }

        const colorPickers = Array.from(root.querySelectorAll(".ql-picker.ql-color"))
        if (colorPickers.length > 1) {
                colorPickers.slice(0, -1).forEach((node) => node.remove())
        }
    }

    const sanitizeNotesHtml = (html: string) => {
        if (!html) return ""
        if (typeof document === "undefined") return html
        const wrapper = document.createElement("div")
        wrapper.innerHTML = html
        wrapper.querySelectorAll(".ql-ui, .ql-tooltip, .ql-tooltip-arrow, .ql-picker-options").forEach((node) => node.remove())
        return wrapper.innerHTML
    }

    const getNextHalfHour = () => {
        const now = new Date()
        const next = new Date(now)
        const minutes = now.getMinutes()
        const nextMinutes = minutes < 30 ? 30 : 60
        next.setMinutes(nextMinutes, 0, 0)
        if (nextMinutes === 60) {
            next.setHours(now.getHours() + 1)
            next.setMinutes(0, 0, 0)
        }
        const pad = (n: number) => String(n).padStart(2, "0")
        return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(
            next.getHours()
        )}:${pad(next.getMinutes())}:00`
    }

    const addHours = (value: string, hours: number) => {
        if (!value) return ""
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return ""
        date.setHours(date.getHours() + hours)
        const pad = (n: number) => String(n).padStart(2, "0")
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
            date.getHours()
        )}:${pad(date.getMinutes())}:00`
    }

  useEffect(() => {
    if (!notesEditing) {
      const raw = notesContent || ""
      setNotesDraft(raw)
      notesDraftRef.current = raw
    }
  }, [notesEditing, notesContent])

    useEffect(() => {
        if (notesEditing) return
        const timer = window.setTimeout(() => {
            cleanupQuillArtifacts()
        }, 0)
        return () => window.clearTimeout(timer)
    }, [notesEditing])

    useEffect(() => {
        if (!open) return
        if (timeRangeEnabled) {
            if (!timeRangeStart || !timeRangeEnd) {
                const nextStart = timeRangeStart || getNextHalfHour()
                const nextEnd = timeRangeEnd || addHours(nextStart, 1)
                setTimeRangeStart(nextStart)
                setTimeRangeEnd(nextEnd)
            }
        } else if (!reminderAt) {
            setReminderAt(getNextHalfHour())
        }
    }, [open, timeRangeEnabled])

  function resetForm() {
    setTitle("")
    setStartDate(new Date().toISOString().split("T")[0])
    setEndDate("")
    setReminder(false)
        setTimeRangeEnabled(false)
        setReminderAt("")
        setTimeRangeStart("")
        setTimeRangeEnd("")
        setDone(false)
    setWorkflowNodes([])
    setSmartInput("")
    setNewNodeLabel("")
    setAiExpanded(false)
        setNotesContent("")
        setNotesDraft("")
        notesDraftRef.current = ""
        setNotesEditing(false)
        setSelectedTagIds([])
  }

  // Handle Voice Input
  function startListening() {
    // @ts-ignore - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("当前浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器。")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setSmartInput((prev) => prev + (prev ? " " : "") + transcript)
            setAiExpanded(true)
    }

    recognition.start()
  }

  // AI Smart Parse Logic
    function handleSmartParse() {
        if (!smartInput.trim()) {
            setAiExpanded(true)
            return
        }

    const text = smartInput.trim()
    let newTitle = title
    let newWorkflow: string[] = []

    const lines = text.split(/[\n;；。]/).map(s => s.trim()).filter(Boolean)
    
    if (lines.length > 0) {
      if (!newTitle) newTitle = lines[0]
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (/流程|步骤|首先|然后|第一|第二/.test(line)) {
             newWorkflow.push(line.replace(/流程[:：]?|第一步[:：]?|首先[:：]?|然后[:：]?/, ""))
        }
      }
    }

    if (newTitle) setTitle(newTitle)
    if (newWorkflow.length > 0) {
        const newNodes = newWorkflow.map(label => ({
            id: crypto.randomUUID(),
            label,
            done: false
        }))
        setWorkflowNodes(prev => [...prev, ...newNodes])
    }
    const noteMatch = text.match(/注意[:：]([^\n]+)/)
    if (noteMatch && noteMatch[1]) {
        setNotesContent(`<p>${noteMatch[1].trim()}</p>`)
    }
        // Keep open after parse
        setAiExpanded(true)
    setSmartInput("")
  }

    async function handleAiImageFile(file: File) {
        setAiProcessing(true)
        try {
            const mod = await import("tesseract.js")
            const result = await mod.default.recognize(file, "chi_sim+eng")
            const text = result.data?.text?.trim()
            if (text) {
                setSmartInput((prev) => (prev ? `${prev}\n${text}` : text))
                setAiExpanded(true)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setAiProcessing(false)
        }
    }

    async function handleSmartPaste() {
        if (!navigator.clipboard) return
        setAiProcessing(true)
        try {
            if ("read" in navigator.clipboard) {
                const items = await navigator.clipboard.read()
                for (const item of items) {
                    const imageType = item.types.find((t) => t.startsWith("image/"))
                    if (imageType) {
                        const blob = await item.getType(imageType)
                        const file = new File([blob], "clipboard", { type: blob.type })
                        await handleAiImageFile(file)
                        return
                    }
                }
            }
            const text = await navigator.clipboard.readText()
            if (text) {
                setSmartInput((prev) => (prev ? `${prev}\n${text}` : text))
                setAiExpanded(true)
            }
        } catch (error) {
            alert("无法读取剪贴板，请检查浏览器权限。")
        } finally {
            setAiProcessing(false)
        }
    }

    function handleAdd() {
    let finalTitle = title;
    if (!finalTitle.trim() && smartInput.trim()) {
        const parts = smartInput.trim().split(/[\n;；。]/)
        finalTitle = parts[0] || "新事项"
    }

    if (!finalTitle.trim()) return

        const timeRangeLabel = timeRangeEnabled
            ? `${formatDateTime(timeRangeStart)}${timeRangeStart || timeRangeEnd ? " - " : ""}${formatDateTime(
                timeRangeEnd
            )}`
            : ""
        const reminderLabel = reminderAt ? formatDateTime(reminderAt) : ""
        const timeLabel = timeRangeEnabled ? timeRangeLabel : reminderLabel

        const finalNotes = notesDraftRef.current || notesContent

        const newTodo: Omit<TodoItem, "id"> = {
      title: finalTitle,
      date: startDate,
      endDate: endDate ? endDate : undefined,
            time: timeLabel || undefined,
            reminderAt: reminderAt || undefined,
            timeRangeEnabled: timeRangeEnabled || undefined,
            timeRangeStart: timeRangeStart || undefined,
            timeRangeEnd: timeRangeEnd || undefined,
      reminder: reminder,
            done: done,
      workflow: workflowNodes.length > 0 ? workflowNodes : undefined,
            currentWorkflowIndex: 0,
            notesContent: finalNotes || undefined,
            tags: selectedTagIds.length > 0 ? selectedTagIds : undefined
    }

    onAdd(newTodo)
    resetForm()
    onClose()
  }

  function handleAddNode() {
    if (!newNodeLabel.trim()) return
    const newNode: WorkflowNode = {
      id: crypto.randomUUID(),
      label: newNodeLabel,
      done: false,
    }
    setWorkflowNodes([...workflowNodes, newNode])
    setNewNodeLabel("")
  }

  function handleRemoveNode(nodeId: string) {
    setWorkflowNodes(workflowNodes.filter((n) => n.id !== nodeId))
  }

    const today = new Date().toISOString().split("T")[0]
    const timeRangeLabel = timeRangeEnabled
        ? `${formatDateTime(timeRangeStart)}${timeRangeStart || timeRangeEnd ? " - " : ""}${formatDateTime(
            timeRangeEnd
          )}`
        : ""
    const reminderLabel = reminderAt ? formatDateTime(reminderAt) : ""
    const timeLabel = timeRangeEnabled ? timeRangeLabel : reminderLabel

    const quillModules = {
        toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ header: [1, 2, 3, false] }],
            [{ color: [] }],
            ["clean"],
        ],
        history: {
            delay: 300,
            maxStack: 200,
            userOnly: true,
        },
    }

    const quillFormats = ["bold", "italic", "underline", "strike", "align", "list", "header", "color"]

    if (!open) return null

    const viewNotesHtml = sanitizeNotesHtml(notesDraft)

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div
                className="relative glass-card rounded-t-3xl flex flex-col overflow-hidden"
                style={{ maxHeight: "88dvh" }}
            >
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                    <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-6">
                    <div className="flex items-start justify-between gap-3 py-3">
                        <div className="flex items-start gap-3 flex-1">
                            <button
                                onClick={() => setDone(!done)}
                                className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5 active:scale-95 transition-all"
                                style={{ backgroundColor: done ? "var(--violet-main)" : "transparent" }}
                            >
                                {done && (
                                    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-white">
                                        <path d="M13.5 2.5L6 10l-3.5-3.5L1 8l5 5 9-9z" />
                                    </svg>
                                )}
                            </button>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="准备做什么？"
                                className="text-xl font-semibold border-none bg-transparent px-0 shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0 h-auto py-1"
                            />
                        </div>
                        <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center active:scale-95">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar whitespace-nowrap flex-nowrap">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button className="flex items-center gap-1.5 bg-secondary/30 px-3 py-1.5 rounded-xl flex-shrink-0 hover:bg-secondary/50 transition-colors group">
                                    <span className="text-base group-hover:scale-110 transition-transform">🕐</span>
                                    <div className="flex items-center gap-1 max-w-[180px] whitespace-nowrap">
                                        <span className="text-xs font-medium text-foreground truncate">
                                            {startDate === today ? "今天" : startDate.substring(5)}
                                            {endDate ? ` - ${endDate.substring(5)}` : ""}
                                        </span>
                                        {timeLabel && <span className="text-[10px] text-muted-foreground ml-1">{timeLabel}</span>}
                                    </div>
                                    <Plus className="w-3 h-3 text-muted-foreground ml-1 opacity-50 group-hover:opacity-100" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4 flex flex-col gap-4 shadow-xl border-border/60" align="start">
                                <div className="space-y-3">
                                    <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                                        <CalendarDays className="w-4 h-4 text-violet-500" />
                                        时间设置
                                    </h4>

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-xs text-muted-foreground">设置时间段</span>
                                        <button
                                            onClick={() => setTimeRangeEnabled(!timeRangeEnabled)}
                                            className={cn(
                                                "w-10 h-5 rounded-full transition-all flex items-center px-1",
                                                timeRangeEnabled ? "bg-violet-500 justify-end" : "bg-secondary justify-start"
                                            )}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow" />
                                        </button>
                                    </div>

                                    {timeRangeEnabled ? (
                                        <div className="grid gap-2">
                                            <div className="grid gap-1.5">
                                                <span className="text-xs text-muted-foreground">开始时间</span>
                                                <AppDateTimePicker
                                                    value={timeRangeStart}
                                                    onChange={(next) => setTimeRangeStart(normalizeDateTimeValue(next))}
                                                />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <span className="text-xs text-muted-foreground">结束时间</span>
                                                <AppDateTimePicker
                                                    value={timeRangeEnd}
                                                    onChange={(next) => setTimeRangeEnd(normalizeDateTimeValue(next))}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">提醒时间</span>
                                                {reminderAt && (
                                                    <button
                                                        onClick={() => setReminderAt("")}
                                                        className="text-[10px] text-destructive hover:underline"
                                                    >
                                                        清除
                                                    </button>
                                                )}
                                            </div>
                                            <AppDateTimePicker
                                                value={reminderAt}
                                                onChange={(next) => setReminderAt(normalizeDateTimeValue(next))}
                                            />
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <button
                            onClick={() => setReminder(!reminder)}
                            className={`flex-shrink-0 flex items-center gap-1 text-sm px-3 py-1.5 rounded-full transition-all border border-transparent
                                ${reminder 
                                    ? "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-900" 
                                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                        >
                            <Bell className="w-3.5 h-3.5" />
                            提醒
                        </button>
                        <button
                            onClick={() => alert("打开系统日历")}
                            className="flex-shrink-0 flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-secondary text-muted-foreground active:scale-95 transition-all hover:bg-secondary/80"
                        >
                            <CalendarDays className="w-3.5 h-3.5" />
                            日历
                        </button>
                    </div>

                    <TagSelector
                        tags={tags}
                        selectedTagIds={selectedTagIds}
                        onChange={setSelectedTagIds}
                        onCreateTag={onCreateTag}
                    />

                    <div className="bg-secondary/20 rounded-xl mb-3 overflow-hidden transition-all duration-300 group border border-violet-100/50 dark:border-violet-900/20">
                        <Collapsible open={aiExpanded} onOpenChange={setAiExpanded}>
                            <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-sm text-violet-600 font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 fill-violet-200 animate-pulse text-violet-500" />
                                    <span>AI 智能填充</span>
                                </div>
                                <ChevronDown className="w-4 h-4 opacity-50 transition-transform data-[state=open]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-3 pb-3 pt-1 space-y-2">
                                <div className="relative">
                                    <Textarea
                                        value={smartInput}
                                        onChange={(e) => setSmartInput(e.target.value)}
                                        placeholder="粘贴任务描述或语音输入，AI 将自动拆解步骤"
                                        className="w-full min-h-[80px] rounded-lg border border-border/60 bg-white/60 dark:bg-zinc-900/50 p-2 text-xs outline-none focus:border-violet-300"
                                    />
                                    <div className="absolute right-2 bottom-2 flex gap-1">
                                        <input
                                            ref={aiFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) handleAiImageFile(file)
                                                if (aiFileInputRef.current) aiFileInputRef.current.value = ""
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 hover:bg-violet-100 text-violet-500"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                handleSmartPaste()
                                            }}
                                            title="粘贴"
                                            disabled={aiProcessing}
                                        >
                                            <Clipboard className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 hover:bg-violet-100 text-violet-500"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                aiFileInputRef.current?.click()
                                            }}
                                            title="识别图片"
                                            disabled={aiProcessing}
                                        >
                                            <ImageIcon className="w-3 h-3" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className={cn("h-6 w-6 hover:bg-violet-100 text-violet-500", isListening && "text-rose-500 animate-pulse")}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                startListening()
                                            }}
                                            title="语音输入"
                                            disabled={aiProcessing}
                                        >
                                            <Mic className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handleSmartParse} className="flex items-center justify-center gap-1.5 p-2 bg-white/50 dark:bg-zinc-900/50 rounded-lg border hover:border-violet-300 transition-colors text-xs text-muted-foreground hover:text-foreground">
                                        <Sparkles className="w-3 h-3" /> 智能拆解
                                    </button>
                                    <button onClick={handleSmartParse} className="flex items-center justify-center gap-1.5 p-2 bg-white/50 dark:bg-zinc-900/50 rounded-lg border hover:border-violet-300 transition-colors text-xs text-muted-foreground hover:text-foreground">
                                        <Wand2 className="w-3 h-3" /> 一键填充
                                    </button>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </div>

                    <div className="bg-secondary/50 rounded-2xl p-4 mb-4 border border-border/40">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <GitCommit className="w-4 h-4 text-primary" />
                                <span className="font-semibold text-foreground text-sm">流程进度</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {workflowNodes.map((node, idx) => (
                                <div
                                    key={node.id}
                                    className={cn(
                                        "group flex items-center gap-3 p-3 rounded-xl transition-all border border-violet-500/20 bg-transparent hover:bg-violet-500/5",
                                        activeDragId === node.id && "bg-background shadow-lg scale-[1.02] z-50 border-violet-500"
                                    )}
                                    draggable={activeDragId === node.id}
                                    onDragStart={(e) => {
                                        if (activeDragId !== node.id) {
                                            e.preventDefault()
                                            return
                                        }
                                        e.dataTransfer.setData("text/plain", idx.toString())
                                        e.dataTransfer.effectAllowed = "move"
                                    }}
                                    onDragEnd={() => setActiveDragId(null)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        setActiveDragId(null)
                                        e.preventDefault()
                                        const dragIdx = parseInt(e.dataTransfer.getData("text/plain"))
                                        if (isNaN(dragIdx) || dragIdx === idx) return
                                        const newNodes = [...workflowNodes]
                                        const [removed] = newNodes.splice(dragIdx, 1)
                                        newNodes.splice(idx, 0, removed)
                                        setWorkflowNodes(newNodes)
                                    }}
                                >
                                    <div
                                        className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 rounded-lg hover:bg-violet-500/10 text-muted-foreground/30 hover:text-violet-500 transition-colors flex items-center justify-center"
                                        onMouseDown={() => setActiveDragId(node.id)}
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                    <span className="flex-1 text-sm font-medium text-foreground">
                                        {node.label}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveNode(node.id)}
                                        className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}

                            <div className="flex gap-2 items-center mt-1 group animate-in slide-in-from-top-2 fade-in duration-300">
                                <div className="flex-1 flex items-center gap-2 bg-secondary/30 rounded-xl px-3 py-2.5 border border-dashed border-border/60 focus-within:border-violet-400 focus-within:bg-secondary/50 transition-all">
                                    <Plus className="w-4 h-4 text-muted-foreground/50 ml-1" />
                                    <input
                                        type="text"
                                        placeholder="添加新步骤..."
                                        value={newNodeLabel}
                                        onChange={(e) => setNewNodeLabel(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
                                        className="flex-1 bg-transparent text-sm outline-none border-none p-0 placeholder:text-muted-foreground/50"
                                    />
                                    <button
                                        onClick={handleAddNode}
                                        disabled={!newNodeLabel.trim()}
                                        className="w-7 h-7 rounded-lg bg-violet-500 text-white flex items-center justify-center disabled:opacity-0 disabled:scale-75 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        ref={notesPanelRef}
                        className="mb-4 border border-orange-200/60 bg-orange-100/40 rounded-2xl overflow-hidden backdrop-blur-md"
                    >
                        <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                                <StickyNote className="w-4 h-4 text-orange-500" />
                                <span className="text-sm font-semibold text-orange-700">注意事项</span>
                            </div>
                            <button
                                className={cn(
                                    "px-2 py-1 rounded-lg text-xs font-semibold",
                                    notesEditing ? "text-violet-600" : "bg-orange-100 text-orange-600"
                                )}
                                onClick={() => {
                                    cleanupQuillArtifacts()
                                    if (notesEditing) {
                                        const nextNotes = notesDraftRef.current
                                        setNotesDraft(nextNotes)
                                        setNotesContent(nextNotes)
                                    }
                                    setNotesEditing(!notesEditing)
                                    if (notesEditing) {
                                        window.setTimeout(() => cleanupQuillArtifacts(), 0)
                                    }
                                }}
                            >
                                {notesEditing ? "完成" : "+"}
                            </button>
                        </div>

                        {notesEditing ? (
                            <div className="px-3 pb-3">
                                <div className="rounded-xl border border-orange-200/70 bg-orange-50/80 p-2">
                                    <ReactQuill
                                        key={notesEditing ? "edit" : "view"}
                                        theme="snow"
                                        value={notesDraft}
                                        onChange={(value) => {
                                            notesDraftRef.current = value
                                            setNotesDraft(value)
                                        }}
                                        onChangeSelection={(range) => {
                                            if (range) notesSelectionRef.current = range
                                        }}
                                        placeholder="在此输入注意事项、关键点或备注信息..."
                                        modules={quillModules}
                                        formats={quillFormats}
                                        className="notes-quill"
                                        id="notes-editor-fixed"
                                        style={{ minHeight: "200px" }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="px-3 pb-3 text-sm text-orange-900">
                                {notesDraft ? (
                                    <div className="notes-quill notes-quill-view">
                                        <div className="ql-editor leading-relaxed" dangerouslySetInnerHTML={{ __html: viewNotesHtml }} />
                                    </div>
                                ) : (
                                    "暂无内容"
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-border/40 bg-background/50 flex justify-end gap-3 flex-shrink-0">
                    <Button variant="ghost" onClick={onClose} className="rounded-xl h-9 text-muted-foreground hover:text-foreground">
                        取消
                    </Button>
                    <Button
                        onClick={handleAdd}
                        disabled={!title.trim()}
                        className="rounded-xl h-9 bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-200/50 dark:shadow-none min-w-[100px]"
                    >
                        创建事项
                    </Button>
                </div>
            </div>
        </div>
    )
}
