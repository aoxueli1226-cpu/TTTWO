"use client"

import { useRef, useState } from "react"
import { Plus, Trash2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { SubTaskNode } from "@/lib/store"

interface SubTaskTreeProps {
  nodes: SubTaskNode[]
  onChange: (next: SubTaskNode[]) => void
}

function cloneNodes(nodes: SubTaskNode[]): SubTaskNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? cloneNodes(node.children) : undefined,
  }))
}

function updateNode(nodes: SubTaskNode[], id: string, updater: (node: SubTaskNode) => SubTaskNode): SubTaskNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node)
    if (node.children) return { ...node, children: updateNode(node.children, id, updater) }
    return node
  })
}

function removeNode(nodes: SubTaskNode[], id: string): SubTaskNode[] {
  const next: SubTaskNode[] = []
  for (const node of nodes) {
    if (node.id === id) continue
    if (node.children) {
      next.push({ ...node, children: removeNode(node.children, id) })
    } else {
      next.push(node)
    }
  }
  return next
}

function insertChild(nodes: SubTaskNode[], parentId: string, child: SubTaskNode): SubTaskNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      const children = node.children ? [...node.children, child] : [child]
      return { ...node, children }
    }
    if (node.children) return { ...node, children: insertChild(node.children, parentId, child) }
    return node
  })
}

function reorderAtPath(nodes: SubTaskNode[], path: number[], fromIndex: number, toIndex: number): SubTaskNode[] {
  if (path.length === 0) {
    const next = [...nodes]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
  }
  const [head, ...rest] = path
  return nodes.map((node, idx) => {
    if (idx !== head) return node
    const children = node.children ? reorderAtPath(node.children, rest, fromIndex, toIndex) : node.children
    return { ...node, children }
  })
}

export default function SubTaskTree({ nodes, onChange }: SubTaskTreeProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const dragInfoRef = useRef<{ path: number[]; index: number } | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const [dragReadyId, setDragReadyId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    onChange(updateNode(nodes, id, (node) => ({ ...node, done: !node.done })))
  }

  const handleRename = (id: string, title: string) => {
    onChange(updateNode(nodes, id, (node) => ({ ...node, title })))
  }

  const handleAddRoot = () => {
    const name = window.prompt("请输入子任务名称")
    if (!name) return
    onChange([
      ...nodes,
      { id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, title: name, done: false },
    ])
  }

  const handleAddChild = (parentId: string, depth: number) => {
    if (depth >= 3) {
      alert("最多支持四级子任务")
      return
    }
    const name = window.prompt("请输入子任务名称")
    if (!name) return
    const child: SubTaskNode = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: name,
      done: false,
    }
    onChange(insertChild(nodes, parentId, child))
  }

  const handleDelete = (id: string) => {
    onChange(removeNode(nodes, id))
  }

  const startLongPress = (id: string) => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = window.setTimeout(() => {
      setDragReadyId(id)
    }, 220)
  }

  const cancelLongPress = () => {
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current)
  }

  const renderList = (list: SubTaskNode[], path: number[] = [], depth = 0) => {
    return list.map((node, index) => (
      <div key={node.id} className="space-y-1">
        <div
          className={cn(
            "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all",
            dragReadyId === node.id && "shadow-[0_10px_24px_rgba(124,58,237,0.2)] opacity-90"
          )}
          style={{ paddingLeft: `${depth * 16}px` }}
          draggable
          onDragStart={(event) => {
            if (dragReadyId !== node.id) {
              event.preventDefault()
              return
            }
            dragInfoRef.current = { path, index }
            event.dataTransfer.effectAllowed = "move"
          }}
          onDragOver={(event) => {
            event.preventDefault()
          }}
          onDrop={(event) => {
            event.preventDefault()
            const dragInfo = dragInfoRef.current
            if (!dragInfo) return
            if (dragInfo.path.join("/") !== path.join("/")) return
            if (dragInfo.index === index) return
            onChange(reorderAtPath(cloneNodes(nodes), path, dragInfo.index, index))
            dragInfoRef.current = null
            setDragReadyId(null)
          }}
          onDragEnd={() => {
            dragInfoRef.current = null
            setDragReadyId(null)
          }}
          onPointerDown={() => startLongPress(node.id)}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
        >
          <button
            onClick={(event) => {
              event.stopPropagation()
              handleToggle(node.id)
            }}
            className={cn(
              "flex-shrink-0 w-[18px] h-[16px] rounded-[4px] border-[1.5px] transition-all flex items-center justify-center",
              node.done
                ? "bg-white/80 border-muted-foreground/40"
                : "border-violet-300/70 hover:border-violet-400 bg-background/50"
            )}
          >
            {node.done && <Check className="w-2.5 h-2.5 text-muted-foreground stroke-[3.5]" />}
          </button>

          {editingId === node.id ? (
            <input
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onBlur={() => {
                handleRename(node.id, editingTitle.trim() || node.title)
                setEditingId(null)
                setEditingTitle("")
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleRename(node.id, editingTitle.trim() || node.title)
                  setEditingId(null)
                  setEditingTitle("")
                }
                if (event.key === "Escape") {
                  setEditingId(null)
                  setEditingTitle("")
                }
              }}
              autoFocus
              className="flex-1 bg-white/70 rounded-md px-2 py-1 text-sm outline-none border border-violet-200 focus:border-violet-400"
            />
          ) : (
            <span
              className={cn(
                "flex-1 text-sm font-medium truncate",
                node.done && "line-through text-muted-foreground"
              )}
              onDoubleClick={() => {
                setEditingId(node.id)
                setEditingTitle(node.title)
              }}
            >
              {node.title}
            </span>
          )}

          <button
            onClick={() => handleAddChild(node.id, depth)}
            className="h-7 w-7 rounded-md border border-dashed border-violet-200 text-violet-500 hover:bg-violet-50"
            title="添加子任务"
          >
            <Plus className="w-3.5 h-3.5 mx-auto" />
          </button>
          <button
            onClick={() => handleDelete(node.id)}
            className="h-7 w-7 rounded-md border border-dashed border-border text-muted-foreground hover:text-destructive"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5 mx-auto" />
          </button>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-1">{renderList(node.children, [...path, index], depth + 1)}</div>
        )}
      </div>
    ))
  }

  return (
    <div className="bg-secondary/50 rounded-2xl p-4 mb-4 border border-border/40">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-foreground text-sm">子任务</span>
        <button
          onClick={handleAddRoot}
          className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          添加
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {nodes.length === 0 ? (
          <div className="text-xs text-muted-foreground">暂无子任务</div>
        ) : (
          renderList(nodes)
        )}
      </div>
    </div>
  )
}
