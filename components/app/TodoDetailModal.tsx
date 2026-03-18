"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bell,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  GitCommit,
  GripVertical,
  Image as ImageIcon,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Mic,
  Plus,
  Sparkles,
  StickyNote,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Volume2,
  X,
  Redo2,
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import TagSelector from "@/components/app/TagSelector"
import AppDateTimePicker from "@/components/app/AppDateTimePicker"
import { TagNode, TodoItem, WorkflowNode } from "@/lib/store"
import { cn } from "@/lib/utils"

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false })

const WORKFLOW_PRESETS: Record<string, string[]> = {
  "常规流程": ["准备", "执行", "复盘"],
  "学习计划": ["预习", "学习", "练习", "总结"],
  "项目推进": ["需求", "设计", "开发", "测试", "交付"],
}

const quillFormats = ["bold", "italic", "underline", "strike", "align", "list", "header", "color"]

const listToHtml = (items: string[]) => {
  if (items.length === 0) return ""
  return `<ul style="padding-left: 18px;">${items.map((s) => `<li>${s}</li>`).join("")}</ul>`
}

const cleanupQuillArtifacts = (root: ParentNode | Document = document) => {
  if (typeof document === "undefined") return
  root.querySelectorAll(".ql-tooltip, .ql-tooltip-arrow").forEach((node) => node.remove())
  root.querySelectorAll(".ql-picker-options").forEach((node) => node.remove())

  const toolbars = Array.from(root.querySelectorAll(".ql-toolbar"))
  if (toolbars.length > 1) {
    toolbars.slice(0, -1).forEach((node) => node.remove())
  }

  const colorPickers = Array.from(root.querySelectorAll(".ql-picker.ql-color, .ql-picker.ql-background"))
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
  cleanupQuillArtifacts(wrapper)
  return wrapper.innerHTML
}

const formatDateTime = (value?: string) => {
  if (!value) return ""
  const [datePart, timePart] = value.split("T")
  if (!datePart || !timePart) return ""
  return `${datePart.replaceAll("-", "/")} ${timePart.slice(0, 8)}`
}



const formatMonthDay = (value?: string) => {
  if (!value) return ""
  const [datePart] = value.split("T")
  if (!datePart) return ""
  const [year, month, day] = datePart.split("-")
  if (!month || !day) return ""
  return `${month}/${day}`
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

interface TodoDetailModalProps {
  todo: TodoItem | null
  open: boolean
  onClose: () => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (todo: TodoItem) => void
  tags: TagNode[]
  onCreateTag: (parentId: string | null, name?: string) => string | null
}

export default function TodoDetailModal({
  todo,
  open,
  onClose,
  onToggle,
  onDelete,
  onUpdate,
  tags,
  onCreateTag,
}: TodoDetailModalProps) {
  const [notesEditing, setNotesEditing] = useState(false)
  const [notesDraft, setNotesDraft] = useState("")
  const notesDraftRef = useRef("")
  const notesSelectionRef = useRef<any>(null)
  const notesPanelRef = useRef<HTMLDivElement>(null)

  const [editingWorkflow, setEditingWorkflow] = useState(false)
  const [showAllNodes, setShowAllNodes] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const workflowDragTimerRef = useRef<number | null>(null)
  const [newNodeLabel, setNewNodeLabel] = useState("")

  const [aiInput, setAiInput] = useState("")
  const [aiExpanded, setAiExpanded] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const aiFileInputRef = useRef<HTMLInputElement>(null)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const toolbarId = useMemo(() => {
    const rawId = String(todo?.id ?? "new")
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "_")
    return `notes-toolbar-${safeId}`
  }, [todo?.id])
  const quillModules = useMemo(() => {
    return {
      toolbar: {
        container: `#${toolbarId}`,
        handlers: {
          undo(this: any) {
            const quill = this?.quill
            if (!quill?.history) return
            quill.history.undo()
          },
          redo(this: any) {
            const quill = this?.quill
            if (!quill?.history) return
            quill.history.redo()
          },
          bold(this: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            quill.format("bold", !current?.bold)
          },
          italic(this: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            quill.format("italic", !current?.italic)
          },
          underline(this: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            quill.format("underline", !current?.underline)
          },
          strike(this: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            quill.format("strike", !current?.strike)
          },
          align(this: any, value: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            const nextValue = current?.align === value ? false : value
            quill.formatLine(range.index, range.length, "align", nextValue)
          },
          list(this: any, value: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            const nextValue = current?.list === value ? false : value
            quill.formatLine(range.index, range.length, "list", nextValue)
          },
          header(this: any, value: any) {
            const quill = this?.quill
            if (!quill) return
            const range = quill.getSelection(true) || notesSelectionRef.current
            if (!range) return
            const current = quill.getFormat(range)
            const headerValue = value === false || value == null ? false : Number(value)
            const nextValue = current?.header === headerValue ? false : headerValue
            quill.formatLine(range.index, range.length, "header", nextValue)
          },
        },
      },
      history: {
        delay: 300,
        maxStack: 200,
        userOnly: true,
      },
    }
  }, [toolbarId])

  useEffect(() => {
    if (!todo) return
    if (!notesEditing) {
      const raw = todo.notesContent || listToHtml(todo.notes || [])
      setNotesDraft(raw)
      notesDraftRef.current = raw
    }
  }, [notesEditing, todo])

  useEffect(() => {
    if (!notesEditing) return
    if (!notesDraftRef.current) return
    setNotesDraft(notesDraftRef.current)
  }, [notesEditing])

  useEffect(() => {
    if (notesEditing) return
    const timer = window.setTimeout(() => {
      cleanupQuillArtifacts(notesPanelRef.current ?? document)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [notesEditing])

  useEffect(() => {
    if (!open || !todo) return
    if (todo.timeRangeEnabled) {
      if (!todo.timeRangeStart || !todo.timeRangeEnd) {
        const nextStart = todo.timeRangeStart || getNextHalfHour()
        const nextEnd = todo.timeRangeEnd || addHours(nextStart, 1)
        onUpdate({
          ...todo,
          timeRangeStart: nextStart,
          timeRangeEnd: nextEnd,
          time: `${formatDateTime(nextStart)} - ${formatDateTime(nextEnd)}`,
        })
      }
    } else if (!todo.reminderAt) {
      const nextReminder = getNextHalfHour()
      onUpdate({
        ...todo,
        reminderAt: nextReminder,
        time: formatDateTime(nextReminder),
      })
    }
  }, [open, todo?.id, todo?.timeRangeEnabled])

  const viewNotesHtml = sanitizeNotesHtml(notesDraft)

  async function handleAiImageFile(file: File) {
    setAiProcessing(true)
    try {
      const mod = await import("tesseract.js")
      const result = await mod.default.recognize(file, "chi_sim+eng")
      const text = result.data?.text?.trim()
      if (text) {
        setAiInput((prev) => (prev ? `${prev}\n${text}` : text))
        setAiExpanded(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setAiProcessing(false)
    }
  }

  async function handleAiPaste() {
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
        setAiInput((prev) => (prev ? `${prev}\n${text}` : text))
        setAiExpanded(true)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setAiProcessing(false)
    }
  }

  function handleAiFill() {
    if (!todo) return
    const base = aiInput.trim() || todo.title
    if (!base) return
    const updates: Partial<TodoItem> = {
      stepsContent: `<ol><li>${base}</li></ol>`,
      notesContent: `<ul><li>${base}</li></ul>`,
    }
    onUpdate({ ...todo, ...updates })
    setAiInput("")
    setAiExpanded(true)
  }

  function handleAiParse() {
    if (!todo) return
    if (!aiInput.trim()) {
      handleAiFill()
      return
    }
    const tagMatch = aiInput.match(/添加标签[:：\s]*["“']?([^"”'，。\n]+)["”']?/)
    const tagName = tagMatch ? tagMatch[1].trim() : null
    let cleanedInput = aiInput

    if (tagName) {
      const findTagId = (nodes: TagNode[]): string | null => {
        for (const node of nodes) {
          if (node.name === tagName) return node.id
          if (node.children) {
            const found = findTagId(node.children)
            if (found) return found
          }
        }
        return null
      }

      const currentTags = todo.tags || []
      const existingId = findTagId(tags)
      let nextTags = currentTags

      if (existingId && !currentTags.includes(existingId)) {
        nextTags = [...currentTags, existingId]
      }

      if (!existingId) {
        const shouldCreate = window.confirm(`未找到标签“${tagName}”，是否新建并添加？`)
        if (shouldCreate) {
          const newId = onCreateTag(null, tagName)
          if (newId && !currentTags.includes(newId)) {
            nextTags = [...currentTags, newId]
          }
        }
      }

      if (nextTags !== currentTags) {
        onUpdate({ ...todo, tags: nextTags })
      }

      cleanedInput = tagMatch ? aiInput.replace(tagMatch[0], "").trim() : aiInput
    }

    const lines = cleanedInput
      .split(/[\n;；。]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const steps = lines.slice(0, 6)
    const generatedSteps = steps.length ? `<ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol>` : ""
    const generatedNotes =
      lines.length > 0 ? `<ul>${lines.slice(0, 4).map((s) => `<li>${s}</li>`).join("")}</ul>` : ""

    const updates: Partial<TodoItem> = {}
    if (generatedSteps) updates.stepsContent = generatedSteps
    if (generatedNotes) updates.notesContent = generatedNotes
    if (Object.keys(updates).length > 0) onUpdate({ ...todo, ...updates })

    setAiInput("")
    setAiExpanded(true)
  }

  function startListening() {
    if (typeof window === "undefined") return
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = "zh-CN"
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setAiInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setAiExpanded(true)
    }

    recognition.start()
  }

  function handleDeleteConfirm() {
    if (!todo) return
    onDelete(todo.id)
    onClose()
    setShowDeleteConfirm(false)
  }

  function handleWorkflowNodeClick(idx: number) {
    if (!todo || !todo.workflow) return
    const updated: WorkflowNode[] = todo.workflow.map((n, i) => ({
      ...n,
      done: i <= idx,
    }))
    onUpdate({ ...todo, workflow: updated, currentWorkflowIndex: idx })
  }

  function handleAddNode() {
    if (!newNodeLabel.trim() || !todo) return
    const newNode: WorkflowNode = {
      id: `w${Date.now()}`,
      label: newNodeLabel.trim(),
      done: false,
    }
    onUpdate({ ...todo, workflow: [...(todo.workflow || []), newNode] })
    setNewNodeLabel("")
  }

  function handleRemoveNode(nodeId: string) {
    if (!todo || !todo.workflow) return
    onUpdate({ ...todo, workflow: todo.workflow.filter((n) => n.id !== nodeId) })
  }

  function applyPreset(labels: string[]) {
    if (!todo) return
    const nodes: WorkflowNode[] = labels.map((l, i) => ({ id: `w${i}`, label: l, done: false }))
    onUpdate({ ...todo, workflow: nodes, currentWorkflowIndex: 0 })
    setEditingWorkflow(false)
  }

  if (!open || !todo) return null

  const today = new Date().toISOString().split("T")[0]
  const workflowNodes = todo.workflow || []
  const timeRangeLabel = todo.timeRangeEnabled
    ? `${formatDateTime(todo.timeRangeStart)}${todo.timeRangeStart || todo.timeRangeEnd ? " - " : ""}${formatDateTime(
        todo.timeRangeEnd
      )}`
    : ""
  const reminderLabel = todo.reminderAt ? formatDateTime(todo.reminderAt) : ""
  const timeLabel = todo.timeRangeEnabled ? timeRangeLabel : reminderLabel || todo.time || ""
  const headerDateLabel = todo.timeRangeEnabled
    ? formatMonthDay(todo.timeRangeEnd || todo.timeRangeStart)
    : formatMonthDay(todo.reminderAt)

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card rounded-t-3xl flex flex-col overflow-hidden" style={{ maxHeight: "88dvh" }}>
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="flex items-start justify-between gap-3 py-3">
            <div className="flex items-start gap-3 flex-1">
              <button
                onClick={() => onToggle(todo.id)}
                className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5 active:scale-95 transition-all"
                style={{ backgroundColor: todo.done ? "var(--violet-main)" : "transparent" }}
              >
                {todo.done && (
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-white">
                    <path d="M13.5 2.5L6 10l-3.5-3.5L1 8l5 5 9-9z" />
                  </svg>
                )}
              </button>
              <h2 className={`font-bold text-foreground text-base leading-snug ${todo.done ? "line-through opacity-60" : ""}`}>
                {todo.title}
              </h2>
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
                      {todo.date === today ? "今天" : todo.date.substring(5)}
                      {todo.endDate ? ` - ${todo.endDate.substring(5)}` : ""}
                    </span>
                    {headerDateLabel && <span className="text-[10px] text-muted-foreground ml-1">{headerDateLabel}</span>}
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
                      onClick={() =>
                        onUpdate({
                          ...todo,
                          timeRangeEnabled: !todo.timeRangeEnabled,
                        })
                      }
                      className={cn(
                        "w-10 h-5 rounded-full transition-all flex items-center px-1",
                        todo.timeRangeEnabled ? "bg-violet-500 justify-end" : "bg-secondary justify-start"
                      )}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow" />
                    </button>
                  </div>

                  {todo.timeRangeEnabled ? (
                    <div className="grid gap-2">
                      <div className="grid gap-1.5">
                        <span className="text-xs text-muted-foreground">开始时间</span>
                        <AppDateTimePicker
                          value={todo.timeRangeStart}
                          onChange={(next) => {
                            const nextLabel = `${formatDateTime(next)}${next || todo.timeRangeEnd ? " - " : ""}${formatDateTime(
                              todo.timeRangeEnd
                            )}`
                            onUpdate({
                              ...todo,
                              timeRangeStart: next,
                              time: nextLabel || undefined,
                            })
                          }}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <span className="text-xs text-muted-foreground">结束时间</span>
                        <AppDateTimePicker
                          value={todo.timeRangeEnd}
                          onChange={(next) => {
                            const nextLabel = `${formatDateTime(todo.timeRangeStart)}${todo.timeRangeStart || next ? " - " : ""}${formatDateTime(
                              next
                            )}`
                            onUpdate({
                              ...todo,
                              timeRangeEnd: next,
                              time: nextLabel || undefined,
                            })
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">提醒时间</span>
                        {todo.reminderAt && (
                          <button
                            onClick={() => onUpdate({ ...todo, reminderAt: "", time: undefined })}
                            className="text-[10px] text-destructive hover:underline"
                          >
                            清除
                          </button>
                        )}
                      </div>
                      <AppDateTimePicker
                        value={todo.reminderAt}
                        onChange={(next) =>
                          onUpdate({
                            ...todo,
                            reminderAt: next,
                            time: next ? formatDateTime(next) : undefined,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <button
              onClick={() => onUpdate({ ...todo, reminder: !todo.reminder })}
              className={`flex-shrink-0 flex items-center gap-1 text-sm px-3 py-1.5 rounded-full transition-all border border-transparent
                ${
                  todo.reminder
                    ? "bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-900"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
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
            selectedTagIds={todo.tags || []}
            onChange={(next) => onUpdate({ ...todo, tags: next })}
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
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
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
                    <button
                      onClick={handleAiPaste}
                      className="h-6 w-6 rounded-md bg-white/70 text-violet-500 hover:bg-white disabled:opacity-60"
                      title="粘贴"
                      disabled={aiProcessing}
                    >
                      <Clipboard className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => aiFileInputRef.current?.click()}
                      className="h-6 w-6 rounded-md bg-white/70 text-violet-500 hover:bg-white disabled:opacity-60"
                      title="识别图片"
                      disabled={aiProcessing}
                    >
                      <ImageIcon className="w-3 h-3" />
                    </button>
                    <button
                      onClick={startListening}
                      className={cn("h-6 w-6 rounded-md bg-white/70 text-violet-500 hover:bg-white", isListening && "text-rose-500 animate-pulse")}
                      title="语音输入"
                      disabled={aiProcessing}
                    >
                      <Mic className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleAiParse}
                    className="flex items-center justify-center gap-1.5 p-2 bg-white/50 dark:bg-zinc-900/50 rounded-lg border hover:border-violet-300 transition-colors text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="w-3 h-3" /> 智能拆解
                  </button>
                  <button
                    onClick={handleAiFill}
                    className="flex items-center justify-center gap-1.5 p-2 bg-white/50 dark:bg-zinc-900/50 rounded-lg border hover:border-violet-300 transition-colors text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Volume2 className="w-3 h-3" /> 一键填充
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
                <span className="text-muted-foreground text-xs font-mono ml-1 bg-secondary px-1.5 py-0.5 rounded">
                  {workflowNodes.length > 0 ? Math.round((workflowNodes.filter((n) => n.done).length / workflowNodes.length) * 100) : 0}%
                </span>
              </div>

              <button
                onClick={() => setEditingWorkflow(!editingWorkflow)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 ${
                  editingWorkflow
                    ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                    : "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300 hover:bg-violet-200"
                }`}
                title={editingWorkflow ? "完成编辑" : "添加/管理流程"}
              >
                {editingWorkflow ? <ListChecks className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            {!editingWorkflow && workflowNodes.length > 0 && (
              <div className="relative flex items-center gap-1.5 flex-wrap mb-4 px-1 animate-in fade-in zoom-in-95 duration-300">
                {(workflowNodes.slice(0, showAllNodes ? undefined : 6) || []).map((node, idx) => (
                  <div key={node.id} className="group relative flex items-center">
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        node.done ? "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]" : "bg-border"
                      }`}
                    />
                    {idx < (showAllNodes ? workflowNodes.length : Math.min(6, workflowNodes.length)) - 1 && (
                      <div
                        className={`w-3 h-0.5 transition-colors duration-300 mx-0.5 ${
                          node.done && workflowNodes[idx + 1]?.done ? "bg-violet-500/50" : "bg-border"
                        }`}
                      />
                    )}

                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {node.label}
                    </div>
                  </div>
                ))}
                {workflowNodes.length > 6 && (
                  <button
                    onClick={() => setShowAllNodes(!showAllNodes)}
                    className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-secondary text-primary transition-colors ml-1"
                  >
                    {showAllNodes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {workflowNodes.map((node, idx) => {
                const isDragging = activeDragId === node.id
                return (
                  <div
                    key={node.id}
                    className={`group flex items-center gap-3 p-3 rounded-xl transition-all border ${
                      isDragging
                        ? "bg-background shadow-lg scale-[1.02] z-50 border-violet-500"
                        : node.done
                        ? "border-transparent opacity-60 hover:bg-muted/5"
                        : "border-violet-500/20 bg-transparent hover:bg-violet-500/5"
                    }`}
                    draggable={editingWorkflow && activeDragId === node.id}
                    onDragStart={(e) => {
                      if (!editingWorkflow || activeDragId !== node.id) {
                        e.preventDefault()
                        return
                      }
                      e.dataTransfer.setData("text/plain", idx.toString())
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onDragEnd={() => setActiveDragId(null)}
                    onPointerDown={() => {
                      if (!editingWorkflow) return
                      if (workflowDragTimerRef.current) window.clearTimeout(workflowDragTimerRef.current)
                      workflowDragTimerRef.current = window.setTimeout(() => {
                        setActiveDragId(node.id)
                      }, 220)
                    }}
                    onPointerUp={() => {
                      if (workflowDragTimerRef.current) window.clearTimeout(workflowDragTimerRef.current)
                    }}
                    onPointerLeave={() => {
                      if (workflowDragTimerRef.current) window.clearTimeout(workflowDragTimerRef.current)
                    }}
                    onPointerCancel={() => {
                      if (workflowDragTimerRef.current) window.clearTimeout(workflowDragTimerRef.current)
                    }}
                    onDragOver={(e) => {
                      if (!editingWorkflow) return
                      e.preventDefault()
                    }}
                    onDrop={(e) => {
                      setActiveDragId(null)
                      if (!editingWorkflow) return
                      e.preventDefault()

                      const dragIdx = parseInt(e.dataTransfer.getData("text/plain"))
                      if (isNaN(dragIdx) || dragIdx === idx) return

                      const newWorkflow = [...workflowNodes]
                      const [removed] = newWorkflow.splice(dragIdx, 1)
                      newWorkflow.splice(idx, 0, removed)
                      onUpdate({ ...todo, workflow: newWorkflow })
                    }}
                  >
                    {editingWorkflow && (
                      <div
                        className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 rounded-lg hover:bg-violet-500/10 text-muted-foreground/30 hover:text-violet-500 transition-colors flex items-center justify-center"
                        onMouseDown={(e) => {
                          if (e.button === 0) setActiveDragId(node.id)
                        }}
                        onMouseUp={() => setActiveDragId(null)}
                        onTouchStart={() => setActiveDragId(node.id)}
                        onTouchEnd={() => setActiveDragId(null)}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    <button
                      onClick={() => handleWorkflowNodeClick(idx)}
                      className={`w-5 h-5 rounded-[6px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        node.done
                          ? "bg-violet-500 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.35)]"
                          : "border-violet-500 bg-transparent shadow-[0_0_0_2px_rgba(139,92,246,0.12)]"
                      }`}
                    >
                      {node.done && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </button>

                    {editingWorkflow ? (
                      <input
                        value={node.label}
                        onChange={(e) => {
                          const newWorkflow = [...workflowNodes]
                          newWorkflow[idx] = { ...node, label: e.target.value }
                          onUpdate({ ...todo, workflow: newWorkflow })
                        }}
                        placeholder="输入步骤名称..."
                        className={`flex-1 bg-transparent text-sm outline-none transition-colors border-none p-0 ${
                          node.done ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground font-medium"
                        }`}
                      />
                    ) : (
                      <span
                        className={`flex-1 text-sm py-0.5 select-none ${
                          node.done ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground font-medium"
                        }`}
                      >
                        {node.label}
                      </span>
                    )}

                    {editingWorkflow && (
                      <button
                        onClick={() => handleRemoveNode(node.id)}
                        className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}

              {editingWorkflow && (
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
              )}

              {editingWorkflow && workflowNodes.length === 0 && (
                <div className="flex gap-2 flex-wrap mt-2 animate-in fade-in duration-500">
                  <p className="text-muted-foreground text-xs w-full mb-1">快速选择预设：</p>
                  {Object.entries(WORKFLOW_PRESETS).map(([name, labels]) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(labels)}
                      className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-medium hover:bg-violet-500/20 active:scale-95 transition-all"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
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
                className={cn("px-2 py-1 rounded-lg text-xs font-semibold", notesEditing ? "text-violet-600" : "bg-orange-100 text-orange-600")}
                onClick={() => {
                  cleanupQuillArtifacts(notesPanelRef.current ?? document)
                  if (notesEditing) {
                    const nextNotes = notesDraftRef.current
                    setNotesDraft(nextNotes)
                    onUpdate({ ...todo, notesContent: nextNotes })
                  }
                  setNotesEditing(!notesEditing)
                  if (notesEditing) {
                    window.setTimeout(() => cleanupQuillArtifacts(notesPanelRef.current ?? document), 0)
                  }
                }}
              >
                {notesEditing ? "完成" : "+"}
              </button>
            </div>

            {notesEditing ? (
              <div className="px-3 pb-3">
                <div id={toolbarId} className="flex flex-wrap items-center gap-1 mb-2 border-b border-orange-200/60 pb-2">
                  <button className="ql-undo p-1.5 rounded hover:bg-orange-100/70 text-orange-700" title="撤销">
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-redo p-1.5 rounded hover:bg-orange-100/70 text-orange-700" title="重做">
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-orange-200/80 mx-1" />
                  <button className="ql-bold p-1.5 rounded hover:bg-orange-100/70 text-orange-700" title="加粗">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-italic p-1.5 rounded hover:bg-orange-100/70 text-orange-700" title="斜体">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-underline p-1.5 rounded hover:bg-orange-100/70 text-orange-700" title="下划线">
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-strike p-1.5 rounded hover:bg-orange-100/70 text-orange-700" title="删除线">
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-orange-200/80 mx-1" />
                  <button className="ql-align p-1.5 rounded hover:bg-orange-100/70 text-orange-700" value="" title="左对齐">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-align p-1.5 rounded hover:bg-orange-100/70 text-orange-700" value="center" title="居中">
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-align p-1.5 rounded hover:bg-orange-100/70 text-orange-700" value="right" title="右对齐">
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-orange-200/80 mx-1" />
                  <button className="ql-list p-1.5 rounded hover:bg-orange-100/70 text-orange-700" value="bullet" title="无序列表">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button className="ql-list p-1.5 rounded hover:bg-orange-100/70 text-orange-700" value="ordered" title="有序列表">
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-orange-200/80 mx-1" />
                  <button className="ql-header px-2 py-1 rounded hover:bg-orange-100/70 text-orange-700 text-[16px] font-semibold leading-none" value="1" title="标题1">
                    H1
                  </button>
                  <button className="ql-header px-2 py-1 rounded hover:bg-orange-100/70 text-orange-700 text-[16px] font-semibold leading-none" value="2" title="标题2">
                    H2
                  </button>
                  <button className="ql-header px-2 py-1 rounded hover:bg-orange-100/70 text-orange-700 text-[16px] font-semibold leading-none" value="3" title="标题3">
                    H3
                  </button>
                  <div className="w-px h-4 bg-orange-200/80 mx-1" />
                  <select className="ql-color" defaultValue="">
                    <option value="" />
                    <option value="#111827" />
                    <option value="#ef4444" />
                    <option value="#f97316" />
                    <option value="#10b981" />
                    <option value="#3b82f6" />
                    <option value="#8b5cf6" />
                    <option value="#64748b" />
                  </select>
                </div>
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

          {showDeleteConfirm ? (
            <div className="bg-destructive/10 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-foreground text-sm font-medium">确认删除这个待办事项？</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium"
                >
                  删除
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-destructive transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="opacity-80">删除事项</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
