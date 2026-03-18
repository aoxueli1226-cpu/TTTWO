"use client"

import { useMemo, useState } from "react"
import { Tag, ChevronDown, Plus, ChevronRight, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagNode } from "@/lib/store"

interface TagSelectorProps {
  tags: TagNode[]
  selectedTagIds: string[]
  onChange: (next: string[]) => void
  onCreateTag: (parentId: string | null, name?: string) => string | null
}

function flattenTags(nodes: TagNode[], map: Record<string, string> = {}): Record<string, string> {
  nodes.forEach((node) => {
    map[node.id] = node.name
    if (node.children) flattenTags(node.children, map)
  })
  return map
}

type TagItem = { id: string; name: string; depth: number; children?: TagItem[] }

function buildTagTree(nodes: TagNode[], depth = 0): TagItem[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    depth,
    children: node.children ? buildTagTree(node.children, depth + 1) : undefined,
  }))
}

function filterTagTree(nodes: TagItem[], keyword: string): TagItem[] {
  if (!keyword) return nodes
  const lower = keyword.toLowerCase()
  const filtered: TagItem[] = []
  nodes.forEach((node) => {
    const children = node.children ? filterTagTree(node.children, keyword) : []
    if (node.name.toLowerCase().includes(lower) || children.length > 0) {
      filtered.push({ ...node, children })
    }
  })
  return filtered
}

export default function TagSelector({ tags, selectedTagIds, onChange, onCreateTag }: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [parentId, setParentId] = useState<string | null>(null)
  const [parentLocked, setParentLocked] = useState(false)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [listExpanded, setListExpanded] = useState<Record<string, boolean>>({})
  const tagNameMap = useMemo(() => flattenTags(tags), [tags])
  const tagTree = useMemo(() => buildTagTree(tags), [tags])
  const filteredTree = useMemo(() => filterTagTree(tagTree, search.trim()), [tagTree, search])

  const openCreateDialog = (nextParentId: string | null, lockParent: boolean) => {
    setCreateName("")
    setParentId(nextParentId)
    setParentLocked(lockParent)
    setSearch("")
    setCreateOpen(true)
  }

  const handleCreate = () => {
    const name = createName.trim()
    if (!name) return
    onCreateTag(parentId, name)
    setCreateOpen(false)
  }

  const toggleTag = (id: string) => {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((t) => t !== id))
    } else {
      onChange([...selectedTagIds, id])
    }
  }

  const renderTags = (nodes: TagItem[], forceExpand = false) => {
    return nodes.map((node) => {
      const hasChildren = !!node.children && node.children.length > 0
      const isExpanded = forceExpand ? true : listExpanded[node.id] ?? false
      const depthColor =
        node.depth === 0 ? "text-[#7e22ce]" : node.depth === 1 ? "text-[#a855f7]" : "text-[#c084fc]"
      return (
        <div key={node.id} className="space-y-1">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${node.depth * 14}px` }}>
            <button
              onClick={() =>
                hasChildren &&
                setListExpanded((prev) => ({
                  ...prev,
                  [node.id]: !(prev[node.id] ?? false),
                }))
              }
              className={cn(
                "w-5 h-5 flex items-center justify-center rounded-md transition-colors",
                hasChildren ? "text-violet-500 hover:bg-violet-50" : "opacity-0"
              )}
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
            </button>
            <button
              onClick={() => toggleTag(node.id)}
              className={cn(
                "flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left border transition-colors",
                selectedTagIds.includes(node.id)
                  ? "bg-violet-500/15 text-violet-700 border-violet-200"
                  : "bg-white/60 text-foreground border-border/60 hover:border-violet-200"
              )}
            >
              <Tag className={cn("w-3.5 h-3.5", depthColor)} />
              <span className={cn("truncate", depthColor)}>{node.name}</span>
            </button>
            {node.depth < 2 && (
              <button
                onClick={() => openCreateDialog(node.id, true)}
                className="h-7 w-7 rounded-md border border-dashed border-violet-200 text-violet-500 hover:bg-violet-50"
                title="新建子标签"
              >
                <Plus className="w-3.5 h-3.5 mx-auto" />
              </button>
            )}
          </div>
          {hasChildren && isExpanded && <div className="space-y-1">{renderTags(node.children!, forceExpand)}</div>}
        </div>
      )
    })
  }

  const renderParentOptions = (nodes: TagItem[], forceExpand = false) => {
    return nodes.map((node) => {
      const canExpand = !!node.children && node.children.length > 0
      const isExpanded = forceExpand ? true : expanded[node.id] ?? node.depth === 0
      const isSelectable = node.depth < 2
      const levelColor = node.depth === 0 ? "text-violet-700" : node.depth === 1 ? "text-violet-500" : "text-violet-400"
      return (
        <div key={node.id} className="space-y-1">
          <button
            onClick={() => isSelectable && setParentId(node.id)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2",
              parentId === node.id
                ? "bg-violet-100 text-violet-700"
                : "text-foreground hover:bg-violet-50",
              !isSelectable && "opacity-60 cursor-not-allowed"
            )}
            disabled={!isSelectable}
          >
            <button
              onClick={(event) => {
                event.stopPropagation()
                if (!canExpand) return
                setExpanded((prev) => ({ ...prev, [node.id]: !(prev[node.id] ?? node.depth === 0) }))
              }}
              className={cn("w-4 h-4 flex items-center justify-center", !canExpand && "opacity-0")}
            >
              <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
            </button>
            <span className={cn(levelColor, "font-medium")}>{node.name}</span>
          </button>
          {canExpand && isExpanded && node.children && (
            <div className="pl-4">{renderParentOptions(node.children, forceExpand)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="bg-secondary/20 rounded-xl mb-3 overflow-hidden border border-violet-100/50 dark:border-violet-900/20">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm text-violet-600 font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-violet-500" />
          <span>标签</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            {selectedTagIds.length === 0 ? (
              <span className="text-xs text-muted-foreground">未选择标签</span>
            ) : (
              selectedTagIds.map((id) => (
                <span
                  key={id}
                  className="px-2 py-1 rounded-full text-[10px] bg-violet-500/10 text-violet-700 border border-violet-200"
                >
                  {tagNameMap[id] || "未命名"}
                </span>
              ))
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">选择标签</span>
              <button
                onClick={() => openCreateDialog(null, false)}
                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
              >
                <Plus className="w-3 h-3" />
                新建标签
              </button>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/80 border border-violet-200/60">
              <Search className="w-3.5 h-3.5 text-violet-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索标签..."
                className="w-full bg-transparent text-xs text-foreground outline-none"
              />
            </div>
            <div className="space-y-1">
              {renderTags(search.trim() ? filteredTree : tagTree, !!search.trim())}
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-sm rounded-t-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-5 border border-violet-200/40 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">新建标签</span>
              <button className="text-xs text-muted-foreground" onClick={() => setCreateOpen(false)}>
                关闭
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">标签名称</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="请输入标签名称"
                  className="mt-1 w-full rounded-xl border border-violet-200/60 bg-white/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">父标签（可选）</label>
                {parentLocked ? (
                  <div className="mt-1 w-full rounded-xl border border-violet-200/60 bg-violet-50/60 px-3 py-2 text-sm text-violet-700">
                    {parentId ? tagNameMap[parentId] : "未选择"}
                  </div>
                ) : (
                  <div className="mt-1 rounded-xl border border-violet-200/60 bg-white/70 p-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/80 border border-violet-200/60">
                      <Search className="w-3.5 h-3.5 text-violet-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="搜索标签..."
                        className="w-full bg-transparent text-xs text-foreground outline-none"
                      />
                    </div>
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <button
                        onClick={() => setParentId(null)}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-sm",
                          !parentId
                            ? "bg-violet-100 text-violet-700"
                            : "text-foreground hover:bg-violet-50"
                        )}
                      >
                        不设置父标签
                      </button>
                      {renderParentOptions(filteredTree, !!search.trim())}
                    </div>
                  </div>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">父标签不可选择第三级标签</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="w-full rounded-xl border border-violet-200/60 py-2 text-sm text-violet-600"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="w-full rounded-xl bg-violet-600 text-white py-2 text-sm font-semibold hover:bg-violet-500"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
