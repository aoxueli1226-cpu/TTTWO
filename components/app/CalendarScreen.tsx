"use client"

import { useState, useRef } from "react"
import { TodoItem } from "@/lib/store"
import { ChevronLeft, ChevronRight, ChevronDown, Home, Calendar, Plus, MessageSquare, List, Grid } from "lucide-react"

interface CalendarScreenProps {
  todos: TodoItem[]
  onClickTodo: (todo: TodoItem) => void
  onClickAdd: () => void
  onClickHome: () => void
  onClickAiChat: () => void
}

function getHeatColor(count: number): string {
  if (count === 0) return "bg-gray-100/30"
  if (count === 1) return "bg-violet-300"
  if (count === 2) return "bg-violet-500"
  if (count === 3) return "bg-violet-700"
  return "bg-violet-900"
}

function isTodoOnDate(todo: TodoItem, dateStr: string): boolean {
  if (!todo.endDate) {
    return todo.date === dateStr
  }
  return dateStr >= todo.date && dateStr <= todo.endDate
}

export default function CalendarScreen({
  todos,
  onClickTodo,
  onClickAdd,
  onClickHome,
  onClickAiChat,
}: CalendarScreenProps) {
  const [year, setYear] = useState(2026)
  const [month, setMonth] = useState(3) // 1-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate())
  const [viewMode, setViewMode] = useState<"heatmap" | "list">("heatmap")
  const [showPicker, setShowPicker] = useState(false)
  const [dayCardExpanded, setDayCardExpanded] = useState(false)
  const yearWheelRef = useRef<HTMLDivElement>(null)
  const monthWheelRef = useRef<HTMLDivElement>(null)

  // init ranges
  const startYear = 2024
  const endYear = 2040
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i)

  // build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const startOffset = (firstDay + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month, 0).getDate()

  // helper: check if date is strictly within range (not start or end)
  function isMiddleOfTodo(todo: TodoItem, dateStr: string): boolean {
    if (!todo.endDate) return false
    return dateStr > todo.date && dateStr < todo.endDate
  }
  
  // helper: check if date is start
  function isStartOfTodo(todo: TodoItem, dateStr: string): boolean {
    return todo.date === dateStr
  }
  
  // helper: check if date is end
  function isEndOfTodo(todo: TodoItem, dateStr: string): boolean {
    return todo.endDate === dateStr
  }

  // count todos per day
  function todoCountForDay(d: number): number {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    return todos.filter((t) => isTodoOnDate(t, dateStr)).length
  }

  function todosForDay(d: number): TodoItem[] {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    return todos.filter((t) => isTodoOnDate(t, dateStr))
  }

  const today = new Date()
  const isToday = (d: number) =>
    today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // stats
  // Filter for ANY overlap in the current month
  const currentMonthStr = `${year}-${String(month).padStart(2, "0")}`
  const monthTodos = todos.filter((t) => {
      // Simple logic: if start date is in month OR end date is in month OR (start < monthStart && end > monthEnd)
      // Actually simpler: just use isTodoOnDate for any day of the month? Too slow maybe.
      // Let's stick to check if start date starts with YYYY-MM OR if it spans across.
      if (t.date.startsWith(currentMonthStr)) return true;
      if (t.endDate && t.endDate.startsWith(currentMonthStr)) return true;
      if (t.endDate && t.date < currentMonthStr + "-01" && t.endDate > currentMonthStr + "-31") return true;
      return false;
  })
  
  const totalCount = monthTodos.length
  const doneCount = monthTodos.filter(t => t.done).length
  const activeCount = monthTodos.filter(t => !t.done).length

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const weekDays = ["一", "二", "三", "四", "五", "六", "日"]

  const selectedTodos = selectedDay ? todosForDay(selectedDay) : []
  const previewTodos = selectedTodos.slice(0, 3)
  const remainingDayTodos = Math.max(0, selectedTodos.length - previewTodos.length)
  const visibleDayTodos = dayCardExpanded ? selectedTodos : previewTodos
  const dayCardMaxHeight = dayCardExpanded ? "min(72dvh, 680px)" : "min(52dvh, 520px)"
  const dayListMaxHeight = dayCardExpanded ? "min(60dvh, 560px)" : "min(40dvh, 380px)"

  function handleYearScroll() {
    const el = yearWheelRef.current
    if (!el) return
    const itemHeight = 32
    const center = el.scrollTop + el.clientHeight / 2
    const index = Math.min(
      years.length - 1,
      Math.max(0, Math.round((center - itemHeight / 2) / itemHeight))
    )
    const next = years[index]
    if (next !== year) setYear(next)
  }

  function handleMonthScroll() {
    const el = monthWheelRef.current
    if (!el) return
    const itemHeight = 32
    const center = el.scrollTop + el.clientHeight / 2
    const index = Math.min(
      11,
      Math.max(0, Math.round((center - itemHeight / 2) / itemHeight))
    )
    const next = index + 1
    if (next !== month) setMonth(next)
  }


  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      {/* month/year nav */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPicker(true)}
            className="glass-card rounded-2xl px-4 py-2 text-sm font-semibold text-foreground"
          >
            {year}年{month}月
          </button>
        </div>

        {/* View Toggle */}
        <button 
          onClick={() => setViewMode(viewMode === 'heatmap' ? 'list' : 'heatmap')}
          className="p-2 rounded-full bg-secondary text-primary active:scale-95 transition-all"
        >
          {viewMode === 'heatmap' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
        </button>
      </div>

      <div className="px-5 pb-6 flex flex-col gap-4 flex-1 min-h-0">
        
        {viewMode === 'heatmap' ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="glass-card rounded-3xl p-4 flex-none overflow-hidden">
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1"> 
                {/* Reduced gap, no borders */}
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} />
                  const count = todoCountForDay(day)
                  const today_ = isToday(day)
                  const selected = selectedDay === day
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (selected) {
                          setSelectedDay(null)
                          setDayCardExpanded(false)
                          return
                        }
                        setSelectedDay(day)
                        setDayCardExpanded(false)
                      }}
                      // Removed ring/outline. Added darker colors.
                      className={`w-9 h-9 mx-auto rounded-md flex items-center justify-center text-xs font-medium transition-all active:scale-90
                        ${selected ? "ring-2 ring-primary ring-offset-1" : ""}
                        ${today_ && !selected ? "ring-1 ring-primary/50" : ""}
                        ${getHeatColor(count)}
                        ${count > 2 ? 'text-white' : 'text-foreground'}
                      `}
                    >
                      <span>{day}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            {selectedDay && !dayCardExpanded && (
              <div className="glass-card rounded-3xl p-4 flex flex-col min-h-0 overflow-hidden" style={{ maxHeight: dayCardMaxHeight }}>
                <div
                  className="flex items-center justify-between mb-3 cursor-pointer select-none"
                  onClick={() => setDayCardExpanded(true)}
                >
                  <span className="font-semibold text-foreground">{month}月{selectedDay}日的待办</span>
                  <span className="text-xs text-muted-foreground">
                    {selectedTodos.length} 项
                  </span>
                </div>
                <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1" style={{ maxHeight: dayListMaxHeight }}>
                  {selectedTodos.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-2">无待办</p>
                  ) : (
                    previewTodos.map(todo => {
                      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
                      const isMultiDay = !!todo.endDate && (todo.endDate !== todo.date)
                      const isStart = todo.date === dateStr
                      const isEnd = todo.endDate === dateStr

                      return (
                        <button
                          key={todo.id}
                          onClick={() => onClickTodo(todo)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                        >
                           <div className={`w-4 flex flex-col items-center justify-center self-stretch min-h-[40px]`}>
                                {!isMultiDay ? (
                                  <div
                                    className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center flex-shrink-0
                                    ${todo.done ? "bg-primary border-transparent" : ""}`}
                                  >
                                    {todo.done && <div className="w-1.5 h-1.5 bg-background rounded-full" />}
                                  </div>
                                ) : (
                                  <>
                                    <div className={`w-[2px] flex-1 ${isStart ? 'bg-transparent' : 'bg-primary/30'}`} />
                                    <div className={`w-3 h-3 rounded-full z-10 my-0.5 ${todo.done ? "bg-primary" : "bg-background border border-primary"}`} />
                                    <div className={`w-[2px] flex-1 ${isEnd ? 'bg-transparent' : 'bg-primary/30'}`} />
                                  </>
                                )}
                            </div>

                          <div className="text-left flex-1 min-w-0">
                             <div className="flex items-center gap-2">
                               <span className={`text-sm text-foreground truncate ${todo.done ? "line-through opacity-50" : ""}`}>
                                  {todo.title}
                               </span>
                               {isMultiDay && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap border ${
                                    isStart ? "border-primary/30 text-primary bg-primary/5" : 
                                    isEnd ? "border-primary/30 text-primary bg-primary/5" : 
                                    "border-muted text-muted-foreground bg-muted/20"
                                  }`}>
                                    {isStart ? "开始" : isEnd ? "结束" : "进行中"}
                                  </span>
                               )}
                             </div>
                             {isMultiDay && (
                               <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                   <span>{todo.date.slice(5)} - {todo.endDate?.slice(5)}</span>
                               </div>
                             )}
                          </div>
                        </button>
                      )
                    })
                  )}
                  {remainingDayTodos > 0 && (
                    <div className="w-full rounded-xl border border-dashed border-violet-200/70 bg-violet-50/40 px-3 py-2 text-xs text-muted-foreground text-center">
                      还有 {remainingDayTodos} 项
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
           <div className="glass-card rounded-3xl p-0 overflow-hidden box-border flex flex-col flex-1 min-h-0 bg-background/50 border border-white/20">
             {/* Header */}
             <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                {weekDays.map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-2 font-medium">{d}</div>
                ))}
             </div>
             
             {/* Extended Grid */}
               <div className="grid grid-cols-7 auto-rows-[6.6rem] divide-x divide-y divide-white/10 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} className="bg-white/5 min-h-[6.6rem]" />
                  
                  const dayTodos = todosForDay(day);
                  const isToday_ = isToday(day);
                  
                  // Sort for consistent order
                  const sortedTodos = [...dayTodos].sort((a, b) => a.title.localeCompare(b.title));
                  const visibleTodos = sortedTodos.slice(0, 3)
                  const remaining = Math.max(0, sortedTodos.length - visibleTodos.length)

                  return (
                    <div
                      key={idx}
                      className={`relative flex flex-col min-h-[6.6rem] p-0 overflow-hidden ${isToday_ ? 'bg-primary/5' : ''}`}
                      onClick={() => {
                        setSelectedDay(day)
                        setDayCardExpanded(true)
                      }}
                      role="button"
                      tabIndex={0}
                    >
                       <div className={`p-1 text-center text-[10px] font-bold mb-1 opacity-80 ${isToday_ ? 'text-primary' : 'text-foreground'}`}>
                         {day}
                       </div>
                       
                       <div className="flex flex-col gap-[2px] w-full px-1 pb-1">
                         {visibleTodos.map(todo => {
                            const currentDayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const hasPrev = todo.date < currentDayStr;
                            const hasNext = todo.endDate ? todo.endDate > currentDayStr : false;
                            
                            return (
                              <button 
                                key={todo.id}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  onClickTodo(todo)
                                }}
                                className={`
                                  h-4 w-full text-[7px] text-white px-1 leading-tight transition-all hover:brightness-110 text-left whitespace-nowrap overflow-hidden
                                  ${todo.done ? 'bg-gray-400' : 'bg-violet-500'}
                                  ${hasPrev ? 'rounded-l-none' : 'rounded-l-sm'}
                                  ${hasNext ? 'rounded-r-none' : 'rounded-r-sm'}
                                `}
                              >
                                {(!hasPrev || day === 1) &&
                                  (todo.title.length > 4 ? `${todo.title.slice(0, 4)}...` : todo.title)}
                              </button>
                            )
                         })}
                         {Array.from({ length: Math.max(0, 3 - visibleTodos.length) }).map((_, idx2) => (
                           <div key={`empty-${idx}-${idx2}`} className="h-4" />
                         ))}
                         <div className="h-4 text-[7px] px-1 rounded-sm flex items-center justify-center">
                           {remaining > 0 ? (
                             <span className="w-full rounded-sm bg-violet-200/70 text-violet-700 flex items-center justify-center h-full">
                               还有 {remaining} 项
                             </span>
                           ) : (
                             <span className="w-full h-full" />
                           )}
                         </div>
                       </div>
                    </div>
                  )
                })}
             </div>
          </div>
        )}
      </div>

      {selectedDay && dayCardExpanded && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-5 pt-16 pb-20">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setDayCardExpanded(false)
            }}
          />
          <div className="relative w-full max-w-md">
            <div
              className="rounded-3xl bg-white/90 dark:bg-zinc-900/90 border border-white/60 shadow-2xl p-4 flex flex-col min-h-0 overflow-hidden"
              style={{ maxHeight: dayCardMaxHeight }}
            >
              <div
                className="flex items-center justify-between mb-3 cursor-pointer select-none"
                onClick={() => setDayCardExpanded((prev) => !prev)}
              >
                <span className="font-semibold text-foreground">{month}月{selectedDay}日的待办</span>
                <span className="text-xs text-muted-foreground">
                  {selectedTodos.length} 项
                </span>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar pr-1" style={{ maxHeight: dayListMaxHeight }}>
                {selectedTodos.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-2">无待办</p>
                ) : (
                  visibleDayTodos.map(todo => {
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
                    const isMultiDay = !!todo.endDate && (todo.endDate !== todo.date)
                    const isStart = todo.date === dateStr
                    const isEnd = todo.endDate === dateStr

                    return (
                      <button
                        key={todo.id}
                        onClick={() => onClickTodo(todo)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                      >
                         {/* Visual Indicator */}
                         <div className={`w-4 flex flex-col items-center justify-center self-stretch min-h-[40px]`}>
                              {!isMultiDay ? (
                                <div
                                  className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center flex-shrink-0
                                  ${todo.done ? "bg-primary border-transparent" : ""}`}
                                >
                                  {todo.done && <div className="w-1.5 h-1.5 bg-background rounded-full" />}
                                </div>
                              ) : (
                                <>
                                  <div className={`w-[2px] flex-1 ${isStart ? 'bg-transparent' : 'bg-primary/30'}`} />
                                  <div className={`w-3 h-3 rounded-full z-10 my-0.5 ${todo.done ? "bg-primary" : "bg-background border border-primary"}`} />
                                  <div className={`w-[2px] flex-1 ${isEnd ? 'bg-transparent' : 'bg-primary/30'}`} />
                                </>
                              )}
                          </div>

                        <div className="text-left flex-1 min-w-0">
                           <div className="flex items-center gap-2">
                             <span className={`text-sm text-foreground truncate ${todo.done ? "line-through opacity-50" : ""}`}>
                                {todo.title}
                             </span>
                             {isMultiDay && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap border ${
                                  isStart ? "border-primary/30 text-primary bg-primary/5" : 
                                  isEnd ? "border-primary/30 text-primary bg-primary/5" : 
                                  "border-muted text-muted-foreground bg-muted/20"
                                }`}>
                                  {isStart ? "开始" : isEnd ? "结束" : "进行中"}
                                </span>
                             )}
                           </div>
                           {isMultiDay && (
                             <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                                 <span>{todo.date.slice(5)} - {todo.endDate?.slice(5)}</span>
                             </div>
                           )}
                        </div>
                      </button>
                    )
                  })
                )}
                {!dayCardExpanded && remainingDayTodos > 0 && (
                  <div className="w-full rounded-xl border border-dashed border-violet-200/70 bg-violet-50/40 px-3 py-2 text-xs text-muted-foreground text-center">
                    还有 {remainingDayTodos} 项
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPicker(false)} />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">选择年月</span>
              <button
                className="text-xs text-muted-foreground"
                onClick={() => setShowPicker(false)}
              >
                完成
              </button>
            </div>
            <div className="flex items-center gap-2 justify-center">
              <div className="relative">
                <div
                  ref={yearWheelRef}
                  onScroll={handleYearScroll}
                  className="h-32 w-24 overflow-y-auto no-scrollbar snap-y snap-mandatory text-center"
                >
                  <div className="h-8" />
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => {
                        setYear(y)
                        setShowPicker(false)
                      }}
                      className={`h-8 w-full flex items-center justify-center text-xs rounded-md snap-center transition-colors ${
                        year === y
                          ? "bg-violet-400 text-white shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {y}年
                    </button>
                  ))}
                  <div className="h-8" />
                </div>
              </div>

              <div className="relative">
                <div
                  ref={monthWheelRef}
                  onScroll={handleMonthScroll}
                  className="h-32 w-20 overflow-y-auto no-scrollbar snap-y snap-mandatory text-center"
                >
                  <div className="h-8" />
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMonth(m)
                        setShowPicker(false)
                      }}
                      className={`h-8 w-full flex items-center justify-center text-xs rounded-md snap-center transition-colors ${
                        month === m
                          ? "bg-violet-400 text-white shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m}月
                    </button>
                  ))}
                  <div className="h-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
