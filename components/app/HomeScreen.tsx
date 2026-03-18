"use client"

import { useState } from "react"
import { User, TodoItem } from "@/lib/store"
import { Plus, Home, Calendar, MessageSquare, PlusCircle, GripVertical } from "lucide-react"

interface HomeScreenProps {
  user: User
  todos: TodoItem[]
  onToggleTodo: (id: string) => void
  onClickTodo: (todo: TodoItem) => void
  onClickAddAi: () => void
  onClickAddManual: () => void
  onClickProfile: () => void
  onClickCalendar: () => void
  onClickAiChat: () => void
  onReorderTodo: (draggedId: string, targetId: string) => void
}

export default function HomeScreen({
  user,
  todos,
  onToggleTodo,
  onClickTodo,
  onClickAddAi,
  onClickAddManual,
  onClickProfile,
  onClickCalendar,
  onClickAiChat,
  onReorderTodo,
}: HomeScreenProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [cardExpanded, setCardExpanded] = useState(false)
  // get today's todos
  const today = new Date().toISOString().split("T")[0]
  const todayTodos = todos.filter((t) => {
    if (!t.endDate) return t.date === today
    return today >= t.date && today <= t.endDate
  })
  const completedCount = todayTodos.filter((t) => t.done).length

  // format date
  const now = new Date()
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"]
  const weekdayStr = weekdays[now.getDay()]
  const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`

  const listMaxHeight = cardExpanded ? "min(64dvh, 620px)" : "min(36dvh, 340px)"

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={onClickProfile}
          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center active:scale-95 transition-all"
        >
          <span className="text-lg">👤</span>
        </button>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">{weekdayStr}</p>
          <p className="font-semibold text-foreground">{dateStr}</p>
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 min-h-0 px-5 pb-6">
        {/* todo card */}
        <div className="glass-card rounded-3xl p-5 shadow-xl flex flex-col overflow-hidden">
          {/* card header */}
          <div
            className="flex items-center justify-between mb-4 cursor-pointer select-none"
            onClick={() => setCardExpanded((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <span className="font-bold text-foreground">今日待办</span>
              <span className="text-muted-foreground text-sm">
                {completedCount}/{todayTodos.length}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClickAddManual()
              }}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* divider */}
          <div className="h-px bg-border mb-4" />

          {/* todo items */}
          <div
            className="flex flex-col gap-4 overflow-y-auto no-scrollbar pr-1"
            style={{ maxHeight: listMaxHeight }}
          >
            {todayTodos.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-6">还没有待办事项</p>
            )}
            {todayTodos.map((todo) => (
              <div
                key={todo.id}
                className={
                  "flex items-start gap-3 rounded-2xl px-2 py-1 transition-colors " +
                  (dragOverId === todo.id ? "bg-violet-50/70" : "")
                }
                draggable
                onDragStart={(e) => {
                  setDraggedId(todo.id)
                  e.dataTransfer.effectAllowed = "move"
                }}
                onDragEnd={() => {
                  setDraggedId(null)
                  setDragOverId(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (draggedId && draggedId !== todo.id) setDragOverId(todo.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedId && draggedId !== todo.id) {
                    onReorderTodo(draggedId, todo.id)
                  }
                  setDraggedId(null)
                  setDragOverId(null)
                }}
              >
                <div className="pt-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4" />
                </div>
                {/* checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleTodo(todo.id)
                  }}
                  className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0 mt-0.5 active:scale-95 transition-all"
                  style={{
                    backgroundColor: todo.done ? "var(--violet-main)" : "transparent",
                  }}
                >
                  {todo.done && (
                    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-white">
                      <path d="M13.5 2.5L6 10l-3.5-3.5L1 8l5 5 9-9z" />
                    </svg>
                  )}
                </button>

                {/* content */}
                <div
                  className={`flex-1 text-left transition-opacity ${todo.done ? "todo-item-complete" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => onClickTodo(todo)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      <span className="text-foreground text-sm font-medium">{todo.title}</span>
                    </button>
                    
                    {/* Add Step Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onClickTodo(todo)
                      }}
                      className="p-1 text-muted-foreground hover:text-primary active:scale-95 transition-colors"
                      title="Add Step"
                    >
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* workflow progress - improved */}
                  {todo.workflow && todo.workflow.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-2">
                      {todo.workflow.map((node, idx) => {
                        const isCurrentStep = !node.done && (idx === 0 || todo.workflow![idx - 1].done)
                        return (
                          <div key={node.id} className="flex items-center gap-0.5">
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 border-[1.5px] ${
                                node.done 
                                  ? "bg-primary border-primary" 
                                  : isCurrentStep
                                    ? "bg-violet-200 border-violet-400"
                                    : "bg-gray-200 border-gray-200"
                              }`}
                            />
                            {idx < todo.workflow!.length - 1 && (
                              <div className={`w-6 h-0.5 ${node.done ? "bg-primary" : "bg-gray-200"}`} />
                            )}
                          </div>
                        )
                      })}
                      <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                        {todo.workflow.find((n) => !n.done)?.label || "已完成"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
