"use client"

import { useState, useCallback, useEffect } from "react"
import { TagNode, User, TodoItem, DEMO_TODOS, AppPage } from "@/lib/store"
import {
  loadUser,
  saveUser,
  loadTodos,
  saveTodos,
  loadTags,
  saveTags,
  clearAllStorage,
} from "@/lib/persistence"
import { encryptApiKey } from "@/lib/secure-storage"
import LoadingScreen from "@/components/app/LoadingScreen"
import LoginScreen from "@/components/app/LoginScreen"
import ApiSetupScreen from "@/components/app/ApiSetupScreen"
import HomeScreen from "@/components/app/HomeScreen"
import CalendarScreen from "@/components/app/CalendarScreen"
import ProfileScreen from "@/components/app/ProfileScreen"
import WidgetMode from "@/components/app/WidgetMode"
import AiCreateModal from "@/components/app/AiCreateModal"
import ManualCreateModal from "@/components/app/ManualCreateModal"
import TodoDetailModal from "@/components/app/TodoDetailModal"
import ScanOverlay from "@/components/app/ScanOverlay"
import DailySummaryToast from "@/components/app/DailySummaryToast"
import AiChatModal from "@/components/app/AiChatModal"
import FocusScreen from "@/components/app/FocusScreen"
import ListScreen from "@/components/app/ListScreen"
import { Home, Layers, Timer, Calendar, User as UserIcon } from "lucide-react"

// Mobile frame wrapper for desktop view

const INITIAL_TAGS: TagNode[] = [
  {
    id: "tag_work",
    name: "工作",
    children: [
      {
        id: "tag_project",
        name: "项目",
        children: [
          { id: "tag_review", name: "评审" },
        ],
      },
    ],
  },
  {
    id: "tag_study",
    name: "学习",
    children: [{ id: "tag_course", name: "课程" }],
  },
]

function findTagDepth(nodes: TagNode[], targetId: string, depth = 0): number | null {
  for (const node of nodes) {
    if (node.id === targetId) return depth
    if (node.children) {
      const found = findTagDepth(node.children, targetId, depth + 1)
      if (found !== null) return found
    }
  }
  return null
}

function insertTag(nodes: TagNode[], parentId: string, child: TagNode): TagNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = node.children ? [...node.children, child] : [child]
      return { ...node, children }
    }
    if (node.children) return { ...node, children: insertTag(node.children, parentId, child) }
    return node
  })
}
function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-900 p-4">
      <div
        className="relative overflow-hidden bg-background"
        style={{
          width: "min(375px, 100vw)",
          height: "min(812px, 100dvh)",
          borderRadius: "clamp(0px, 40px, 40px)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1)",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<AppPage>("loading")
  const [user, setUser] = useState<User | null>(null)
  const [todos, setTodos] = useState<TodoItem[]>(DEMO_TODOS)
  const [mode, setMode] = useState<"app" | "widget">("app")
  const [tags, setTags] = useState<TagNode[]>(INITIAL_TAGS)
  const [hydrated, setHydrated] = useState(false)

  // modals
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [detailTodo, setDetailTodo] = useState<TodoItem | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)

  // auto show daily summary at 18:00 (demo: show after 3s if has done todos)
  useEffect(() => {
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split("T")[0]
      const doneTodos = todos.filter((t) => t.date === today && t.done)
      if (doneTodos.length > 0 && page === "home") {
        setSummaryOpen(true)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [page]) // eslint-disable-line

  useEffect(() => {
    const storedUser = loadUser()
    const storedTodos = loadTodos()
    const storedTags = loadTags()
    if (storedUser) setUser(storedUser)
    if (storedTodos) setTodos(storedTodos)
    if (storedTags) setTags(storedTags)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (user) saveUser(user)
  }, [hydrated, user])

  useEffect(() => {
    if (!hydrated) return
    saveTodos(todos)
  }, [hydrated, todos])

  useEffect(() => {
    if (!hydrated) return
    saveTags(tags)
  }, [hydrated, tags])

  function handleLoadingDone(hasUser: boolean) {
    if (hasUser) {
      const stored = loadUser()
      if (stored) setUser(stored)
      setPage("home")
      return
    }
    setPage("login")
  }

  async function handleLogin(newUser: User) {
    // 为新用户添加默认的免费AI服务
    const encryptedKey = await encryptApiKey("demo_key")
    const userWithDefaultAi: User = {
      ...newUser,
      apiProviders: [{ providerId: "rskAi", key: encryptedKey, current: true }],
    }
    setUser(userWithDefaultAi)
    saveUser(userWithDefaultAi)
    // 直接进入主页
    setPage("home")
  }

  function handleApiDone(updatedUser: User) {
    setUser(updatedUser)
    saveUser(updatedUser)
    setPage("home")
  }

  function handleUpdateUser(updatedUser: User) {
    setUser(updatedUser)
    saveUser(updatedUser)
  }

  function handleLogout() {
    clearAllStorage()
    setUser(null)
    setPage("login")
  }

  function handleToggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function handleClickTodo(todo: TodoItem) {
    setDetailTodo(todo)
  }

  function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id))
    setDetailTodo(null)
  }

  function handleUpdateTodo(todo: TodoItem) {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)))
    setDetailTodo(todo)
  }

  function handleReorderTodo(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    setTodos((prev) => {
      const draggedIndex = prev.findIndex((t) => t.id === draggedId)
      const targetIndex = prev.findIndex((t) => t.id === targetId)
      if (draggedIndex === -1 || targetIndex === -1) return prev
      const next = [...prev]
      const [dragged] = next.splice(draggedIndex, 1)
      next.splice(targetIndex, 0, dragged)
      return next
    })
  }

  function handleCreateTag(parentId: string | null, name?: string): string | null {
    const finalName = name || window.prompt("请输入标签名称")
    if (!finalName) return null
    const newTag: TagNode = {
      id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: finalName,
    }

    if (!parentId) {
      setTags((prev) => [...prev, newTag])
      return newTag.id
    }

    const depth = findTagDepth(tags, parentId)
    if (depth === null) return null
    if (depth >= 3) {
      alert("最多支持四级标签")
      return null
    }
    setTags((prev) => insertTag(prev, parentId, newTag))
    return newTag.id
  }

  function handleManualAdd(newTodo: Omit<TodoItem, "id">) {
    const todo = { ...newTodo, id: `t${Date.now()}_${Math.random()}` }
    setTodos((prev) => [todo, ...prev])
    setManualModalOpen(false)
  }

  function handleAddTodos(newTodos: Omit<TodoItem, "id">[]) {
    const withIds = newTodos.map((t) => ({ ...t, id: `t${Date.now()}_${Math.random()}` }))
    setTodos((prev) => [...prev, ...withIds])
  }

  const isWidget = mode === "widget"

  const content = (
    <div className="flex flex-col h-dvh bg-background relative overflow-hidden">
      {page === "loading" && <LoadingScreen onDone={handleLoadingDone} />}

      {page === "login" && <LoginScreen onLogin={handleLogin} />}

      {page === "api-setup" && user && (
        <ApiSetupScreen
          user={user}
          onDone={handleApiDone}
          onBack={() => setPage("login")}
        />
      )}

      {/* Main App Screens */}
      {user && !isWidget && (
          <div
            className={`flex-1 no-scrollbar pb-20 ${
              page === "home" || page === "lists" || page === "focus" || page === "calendar"
                ? "overflow-hidden"
                : "overflow-y-auto"
            }`}
          >
              {page === "home" && (
                <HomeScreen
                  user={user}
                  todos={todos}
                  onToggleTodo={handleToggleTodo}
                  onClickTodo={handleClickTodo}
                  onClickAddAi={() => setAiModalOpen(true)}
                  onClickAddManual={() => setManualModalOpen(true)}
                  onClickProfile={() => setPage("profile")}
                  onClickCalendar={() => setPage("calendar")}
                  onClickAiChat={() => setAiChatOpen(true)}
                  onReorderTodo={handleReorderTodo}
                />
              )}

              {page === "lists" && (
                <ListScreen
                  todos={todos}
                  onUpdateTodo={handleUpdateTodo}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onSelectTodo={handleClickTodo}
                  onAddTodo={() => setManualModalOpen(true)}
                />
              )}

              {page === "focus" && (
                <FocusScreen />
              )}

              {page === "calendar" && (
                <CalendarScreen
                  todos={todos}
                  onClickTodo={handleClickTodo}
                  onClickAdd={() => setAiModalOpen(true)}
                  onClickHome={() => setPage("home")}
                  onClickAiChat={() => setAiChatOpen(true)}
                />
              )}

              {page === "profile" && (
                <ProfileScreen
                  user={user}
                  onBack={() => setPage("home")}
                  onUpdate={handleUpdateUser}
                  onLogout={handleLogout}
                  onAddProvider={() => setPage("api-setup")}
                />
              )}
          </div>
      )}

      {isWidget && user && (
        <WidgetMode
          todos={todos}
          onToggleTodo={handleToggleTodo}
          onClickTodo={handleClickTodo}
          onClickAddManual={() => setManualModalOpen(true)}
          onSwitchToApp={() => setMode("app")}
          onClickScan={() => setScanOpen(true)}
          onClickAiChat={() => setAiChatOpen(true)}
        />
      )}

      {/* Bottom Navigation */}
      {user && !isWidget && ["home", "lists", "focus", "calendar"].includes(page) && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border/50 pb-safe">
           <div className="flex items-center justify-around h-16 px-2">
              <button 
                onClick={() => setPage("home")}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-all ${page === "home" ? "text-violet-500 scale-105" : "text-muted-foreground hover:text-foreground"}`}
              >
                  <Home className={`w-6 h-6 ${page === "home" ? "fill-current" : ""}`} strokeWidth={page === "home" ? 2 : 1.5} />
                  <span className="text-[10px] font-medium">任务</span>
              </button>

              <button 
                onClick={() => setPage("lists")}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-all ${page === "lists" ? "text-violet-500 scale-105" : "text-muted-foreground hover:text-foreground"}`}
              >
                  <Layers className={`w-6 h-6 ${page === "lists" ? "fill-current" : ""}`} strokeWidth={page === "lists" ? 2 : 1.5} />
                  <span className="text-[10px] font-medium">列表</span>
              </button>

              <button 
                onClick={() => setPage("focus")}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-all ${page === "focus" ? "text-violet-500 scale-105" : "text-muted-foreground hover:text-foreground"}`}
              >
                  <Timer className={`w-6 h-6 ${page === "focus" ? "fill-current" : ""}`} strokeWidth={page === "focus" ? 2 : 1.5} />
                  <span className="text-[10px] font-medium">专注</span>
              </button>

              <button 
                onClick={() => setPage("calendar")}
                className={`flex flex-col items-center justify-center w-16 gap-1 transition-all ${page === "calendar" ? "text-violet-500 scale-105" : "text-muted-foreground hover:text-foreground"}`}
              >
                  <Calendar className={`w-6 h-6 ${page === "calendar" ? "fill-current" : ""}`} strokeWidth={page === "calendar" ? 2 : 1.5} />
                  <span className="text-[10px] font-medium">日历</span>
              </button>
           </div>
        </div>
      )}

      {/* Modals / overlays */}
      <AiCreateModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onAdd={handleAddTodos}
        tags={tags}
      />
      
      <ManualCreateModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onAdd={handleManualAdd}
        tags={tags}
        onCreateTag={handleCreateTag}
      />

      <TodoDetailModal
        todo={detailTodo}
        open={!!detailTodo}
        onClose={() => setDetailTodo(null)}
        onToggle={(id) => {
          handleToggleTodo(id)
          setDetailTodo((prev) => (prev ? { ...prev, done: !prev.done } : null))
        }}
        onDelete={handleDeleteTodo}
        onUpdate={handleUpdateTodo}
        tags={tags}
        onCreateTag={handleCreateTag}
      />

      <ScanOverlay
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onAdd={handleAddTodos}
      />

      <DailySummaryToast
        todos={todos}
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
      />

      <AiChatModal
        open={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
      />
    </div>
  )

  // On desktop, wrap in a mobile frame for better presentation
  return (
    <>
      <div className="hidden md:flex min-h-dvh items-center justify-center bg-gray-950">
        <div
          className="relative overflow-hidden bg-background"
          style={{
            width: 375,
            height: 812,
            borderRadius: 40,
            boxShadow: "0 40px 100px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.08)",
          }}
        >
          {content}
        </div>
      </div>
      <div className="md:hidden relative overflow-hidden h-dvh">
        {content}
      </div>
    </>
  )
}
