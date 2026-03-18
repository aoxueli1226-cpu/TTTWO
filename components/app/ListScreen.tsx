"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { TodoItem } from "@/lib/store"
import {
    Plus,
    Search,
    ChevronRight,
    Check,
    Trash2,
    Edit2,
    FolderPlus,
    Palette,
    Tag,
    GripVertical,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ListScreenProps {
  todos: TodoItem[]
  onUpdateTodo: (todo: TodoItem) => void
  onToggleTodo: (id: string) => void
  onDeleteTodo: (id: string) => void
  onSelectTodo: (todo: TodoItem) => void
  onAddTodo: () => void
}

type TreeNode = {
  id: string
  name: string
  type: "tag" | "task"
  children?: TreeNode[]
    task?: {
        title: string
        completed: boolean
        subtaskCount?: string
    }
    count?: number
  depth: number
}

type TagDialogNode = {
    id: string
    name: string
    depth: number
    children?: TagDialogNode[]
}

const MOCK_TREE: TreeNode[] = [
    {
        id: "work",
        name: "工作",
        type: "tag",
        depth: 0,
        children: [
            {
                id: "project-a",
                name: "项目A",
                type: "tag",
                depth: 1,
                children: [
                    {
                        id: "project-a-phase",
                        name: "执行阶段",
                        type: "tag",
                        depth: 2,
                        children: [
                            {
                                id: "work-task-1",
                                name: "周五前提交报告",
                                type: "task",
                                depth: 3,
                                task: { title: "周五前提交报告", completed: false, subtaskCount: "2/5" },
                            },
                            {
                                id: "work-task-2",
                                name: "与客户沟通",
                                type: "task",
                                depth: 3,
                                task: { title: "与客户沟通", completed: false, subtaskCount: "1/3" },
                            },
                            {
                                id: "work-task-3",
                                name: "准备演示文稿",
                                type: "task",
                                depth: 3,
                                task: { title: "准备演示文稿", completed: true, subtaskCount: "3/3" },
                            },
                        ],
                    }
                ],
            },
        ],
    },
    {
        id: "study",
        name: "学习",
        type: "tag",
        depth: 0,
        children: [
            {
                id: "study-course",
                name: "课程",
                type: "tag",
                depth: 1,
                children: [
                    {
                        id: "study-chapter",
                        name: "章节一",
                        type: "tag",
                        depth: 2,
                        children: [
                            {
                                id: "study-task-1",
                                name: "读完一章设计模式",
                                type: "task",
                                depth: 3,
                                task: { title: "读完一章设计模式", completed: false, subtaskCount: "0/2" },
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: "fitness",
        name: "健身",
        type: "tag",
        depth: 0,
        children: [
            {
                id: "fitness-plan",
                name: "训练计划",
                type: "tag",
                depth: 1,
                children: [
                    {
                        id: "fitness-session",
                        name: "力量训练",
                        type: "tag",
                        depth: 2,
                        children: [
                            {
                                id: "fitness-task-1",
                                name: "力量训练 40min",
                                type: "task",
                                depth: 3,
                                task: { title: "力量训练 40min", completed: false, subtaskCount: "1/4" },
                            },
                        ],
                    },
                ],
            },
        ],
    },
]

const applyDepth = (nodes: TreeNode[], baseDepth = 0): TreeNode[] =>
    nodes.map((node) => ({
        ...node,
        depth: baseDepth,
        children: node.children ? applyDepth(node.children, baseDepth + 1) : undefined,
    }))

export default function ListScreen({
  todos,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
  onSelectTodo,
  onAddTodo
}: ListScreenProps) {
  const [search, setSearch] = useState("")
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})
        const [treeData, setTreeData] = useState<TreeNode[]>(() => applyDepth(MOCK_TREE))
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
    const [dragOverTagId, setDragOverTagId] = useState<string | null>(null)
    const dragInfoRef = useRef<{ path: number[]; index: number } | null>(null)
        const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
        const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
        const [editingTitle, setEditingTitle] = useState("")
                const [hasSeededExpand, setHasSeededExpand] = useState(false)
        const [tagDialogOpen, setTagDialogOpen] = useState(false)
        const [tagDialogName, setTagDialogName] = useState("")
        const [tagDialogParentId, setTagDialogParentId] = useState<string | null>(null)
        const [tagDialogParentLocked, setTagDialogParentLocked] = useState(false)
        const [tagDialogSearch, setTagDialogSearch] = useState("")
        const [tagDialogExpanded, setTagDialogExpanded] = useState<Record<string, boolean>>({})

    const filteredTree = useMemo(() => {
        if (!search.trim()) return treeData
        const lower = search.toLowerCase()
        const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
            return nodes
                .map((node) => {
                    if (node.type === "task") {
                        return node.name.toLowerCase().includes(lower) ? node : null
                    }
                    const children = node.children ? filterNodes(node.children) : []
                    if (children.length > 0 || node.name.toLowerCase().includes(lower)) {
                        return { ...node, children }
                    }
                    return null
                })
                .filter(Boolean) as TreeNode[]
        }
        return filterNodes(treeData)
    }, [search, treeData])

    useEffect(() => {
        if (hasSeededExpand) return
        const initial: Record<string, boolean> = {}
        const seed = (nodes: TreeNode[]) => {
            nodes.forEach((node) => {
                if (node.type === "tag") {
                    initial[node.id] = true
                    if (node.children) seed(node.children)
                }
            })
        }
        seed(treeData)
        setExpandedNodes(initial)
        setHasSeededExpand(true)
    }, [treeData, hasSeededExpand])

    const toggleExpand = (id: string) => setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }))

    const expandAll = () => {
        const all: Record<string, boolean> = {}
        const traverse = (nodes: TreeNode[]) => {
            nodes.forEach((node) => {
                if (node.type === "tag") {
                    all[node.id] = true
                    if (node.children) traverse(node.children)
                }
            })
        }
        traverse(treeData)
        setExpandedNodes(all)
    }

    const collapseAll = () => setExpandedNodes({})

    const cloneNodes = (nodes: TreeNode[]): TreeNode[] =>
        nodes.map((node) => ({ ...node, children: node.children ? cloneNodes(node.children) : undefined }))

    const flattenTagOptions = (nodes: TreeNode[], depth = 0): { id: string; name: string; depth: number }[] => {
        const list: { id: string; name: string; depth: number }[] = []
        nodes.forEach((node) => {
            if (node.type === "tag") {
                list.push({ id: node.id, name: node.name, depth })
                if (node.children) list.push(...flattenTagOptions(node.children, depth + 1))
            }
        })
        return list
    }

    const buildTagDialogTree = (nodes: TreeNode[]): TagDialogNode[] => {
        const list: TagDialogNode[] = []
        nodes.forEach((node) => {
            if (node.type !== "tag") return
            list.push({
                id: node.id,
                name: node.name,
                depth: node.depth,
                children: node.children ? buildTagDialogTree(node.children) : undefined,
            })
        })
        return list
    }

    const filterTagDialogTree = (nodes: TagDialogNode[], keyword: string): TagDialogNode[] => {
        if (!keyword) return nodes
        const lower = keyword.toLowerCase()
        const filtered: TagDialogNode[] = []
        nodes.forEach((node) => {
            const children = node.children ? filterTagDialogTree(node.children, keyword) : []
            if (node.name.toLowerCase().includes(lower) || children.length > 0) {
                filtered.push({ ...node, children })
            }
        })
        return filtered
    }

    const tagOptions = useMemo(() => flattenTagOptions(treeData).filter((t) => t.depth < 2), [treeData])
    const tagDialogTree = useMemo(() => buildTagDialogTree(treeData), [treeData])
    const filteredTagDialogTree = useMemo(
        () => filterTagDialogTree(tagDialogTree, tagDialogSearch.trim()),
        [tagDialogTree, tagDialogSearch]
    )

    const getTagDepth = (nodes: TreeNode[], id: string, depth = 0): number | null => {
        for (const node of nodes) {
            if (node.type === "tag" && node.id === id) return depth
            if (node.children) {
                const found = getTagDepth(node.children, id, depth + 1)
                if (found !== null) return found
            }
        }
        return null
    }

    const removeNode = (nodes: TreeNode[], nodeId: string): { updated: TreeNode[]; removed?: TreeNode } => {
        const updated: TreeNode[] = []
        let removed: TreeNode | undefined
        for (const node of nodes) {
            if (node.id === nodeId) {
                removed = node
                continue
            }
            if (node.children) {
                const result = removeNode(node.children, nodeId)
                if (result.removed) removed = result.removed
                updated.push({ ...node, children: result.updated })
            } else {
                updated.push(node)
            }
        }
        return { updated, removed }
    }

    const insertNodeAsChild = (nodes: TreeNode[], parentId: string, child: TreeNode): TreeNode[] => {
        return nodes.map((node) => {
            if (node.id === parentId && node.type === "tag") {
                const children = node.children ? [...node.children, child] : [child]
                return { ...node, children }
            }
            if (node.children) {
                return { ...node, children: insertNodeAsChild(node.children, parentId, child) }
            }
            return node
        })
    }

    const toggleTaskCompletion = (nodeId: string) => {
        const update = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((node) => {
                if (node.id === nodeId && node.type === "task" && node.task) {
                    return { ...node, task: { ...node.task, completed: !node.task.completed } }
                }
                if (node.children) return { ...node, children: update(node.children) }
                return node
            })
        setTreeData((prev) => update(prev))
    }

    const updateTagName = (nodeId: string, name: string) => {
        const update = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((node) => {
                if (node.id === nodeId && node.type === "tag") {
                    return { ...node, name }
                }
                if (node.children) return { ...node, children: update(node.children) }
                return node
            })
        setTreeData((prev) => update(prev))
    }

    const createTagNode = (name: string, depth = 0): TreeNode => ({
        id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        type: "tag",
        depth,
        children: [],
    })

    const openTagDialog = (parentId: string | null, lockParent: boolean) => {
        setTagDialogName("")
        setTagDialogParentId(parentId)
        setTagDialogParentLocked(lockParent)
        setTagDialogSearch("")
        setTagDialogOpen(true)
    }

    const addRootTag = () => {
        openTagDialog(null, false)
    }

    const addChildTag = (parentId: string, depth: number) => {
        if (depth >= 2) {
            alert("已达到最大层级，无法添加子群组")
            return
        }
        openTagDialog(parentId, true)
    }

    const handleCreateTag = () => {
        const name = tagDialogName.trim()
        if (!name) return
        if (!tagDialogParentId) {
            setTreeData((prev) => applyDepth([...prev, createTagNode(name, 0)]))
            setHasSeededExpand(true)
        } else {
            const parentDepth = getTagDepth(treeData, tagDialogParentId)
            if (parentDepth === null || parentDepth >= 2) return
            const next = insertNodeAsChild(treeData, tagDialogParentId, createTagNode(name, parentDepth + 1))
            setTreeData(applyDepth(next))
            setExpandedNodes((prev) => ({ ...prev, [tagDialogParentId]: true }))
        }
        setTagDialogOpen(false)
    }

    const renderTagDialogOptions = (nodes: TagDialogNode[], forceExpand = false) => {
        return nodes.map((node) => {
            const canExpand = !!node.children && node.children.length > 0
            const isExpanded = forceExpand ? true : tagDialogExpanded[node.id] ?? node.depth === 0
            const isSelectable = node.depth < 2
            const levelColor = node.depth === 0 ? "text-[#7e22ce]" : node.depth === 1 ? "text-[#a855f7]" : "text-[#c084fc]"
            return (
                <div key={node.id} className="space-y-1">
                    <button
                        onClick={() => isSelectable && setTagDialogParentId(node.id)}
                        className={cn(
                            "w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2",
                            tagDialogParentId === node.id
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
                                setTagDialogExpanded((prev) => ({
                                    ...prev,
                                    [node.id]: !(prev[node.id] ?? node.depth === 0),
                                }))
                            }}
                            className={cn("w-4 h-4 flex items-center justify-center", !canExpand && "opacity-0")}
                        >
                            <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
                        </button>
                        <span className={cn(levelColor, "font-medium")}>{node.name}</span>
                    </button>
                    {canExpand && isExpanded && node.children && (
                        <div className="pl-4">{renderTagDialogOptions(node.children, forceExpand)}</div>
                    )}
                </div>
            )
        })
    }

    const deleteNodeById = (nodeId: string) => {
        const cloned = cloneNodes(treeData)
        const { updated } = removeNode(cloned, nodeId)
        setTreeData(applyDepth(updated))
    }

    const updateTaskTitle = (nodeId: string, title: string) => {
        const update = (nodes: TreeNode[]): TreeNode[] =>
            nodes.map((node) => {
                if (node.id === nodeId && node.type === "task" && node.task) {
                    return {
                        ...node,
                        name: title,
                        task: { ...node.task, title },
                    }
                }
                if (node.children) return { ...node, children: update(node.children) }
                return node
            })
        setTreeData((prev) => update(prev))
    }

    const reorderAtPath = (nodes: TreeNode[], path: number[], fromIndex: number, toIndex: number): TreeNode[] => {
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

    const handleDragStart = (nodeId: string, path: number[], index: number) => {
        dragInfoRef.current = { path, index }
        setDraggedNodeId(nodeId)
    }

    const handleDropAtPath = (path: number[], index: number) => {
        const dragInfo = dragInfoRef.current
        if (!dragInfo) return
        if (dragInfo.path.join("/") !== path.join("/")) return
        if (dragInfo.index === index) return
        const next = reorderAtPath(cloneNodes(treeData), path, dragInfo.index, index)
        setTreeData(applyDepth(next))
        dragInfoRef.current = null
        setDragOverTagId(null)
        setDraggedNodeId(null)
    }

  return (
        <div className="flex flex-col h-full bg-gradient-to-b from-violet-50/60 via-background to-background dark:from-[#0b0b14] dark:via-background dark:to-background overflow-hidden">

            {/* Header */}
            <div className="flex-none px-5 pt-12 pb-3 sticky top-0 z-20 backdrop-blur-xl bg-background/40 border-b border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">所有任务</h1>
                        <p className="text-[10px] text-muted-foreground font-medium mt-1">LIST GROUP</p>
                    </div>

                    <div className="ml-auto flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={expandAll}
                            title="全部展开"
                            className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                        >
                            <span className="text-[12px] font-bold">+↓</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={collapseAll}
                            title="全部折叠"
                            className="h-8 w-8 text-muted-foreground hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                        >
                            <span className="text-[12px] font-bold">-↑</span>
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground group-focus-within:text-violet-500 transition-colors" />
                        <Input
                            placeholder="搜索任务..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-md border-violet-100/70 dark:border-white/10 focus-visible:ring-violet-500/50 h-9 rounded-xl shadow-sm transition-all"
                        />
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full border border-violet-200/60 text-violet-600 hover:bg-violet-50"
                        onClick={addRootTag}
                        title="新建标签"
                    >
                        <Tag className="w-4 h-4" />
                    </Button>
                    <Button
                        size="icon"
                        className="h-9 w-9 rounded-full bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-500/20"
                        onClick={onAddTodo}
                    >
                        <Plus className="w-5 h-5 text-white" />
                    </Button>
                </div>
            </div>

            {/* Main Content - Tree View */}
            <ScrollArea className="flex-1 min-h-0 px-4 py-3">
                <div
                    className="pb-24 min-h-full overflow-x-auto no-scrollbar"
                    onDragOver={(e) => e.preventDefault()}
                >
                    {filteredTree.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/40 gap-4 mt-10">
                            <div className="w-20 h-20 rounded-3xl bg-violet-500/5 flex items-center justify-center">
                                <FolderPlus className="w-10 h-10 stroke-[1.5]" />
                            </div>
                            <p className="text-sm font-medium">这里空空如也，添加一个标签试试？</p>
                            <Button variant="outline" size="sm" onClick={onAddTodo} className="rounded-full border-dashed text-violet-500 border-violet-200">
                                新建任务
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-1 min-w-[340px]">
                            {filteredTree.map((node, index) => (
                                <TreeNodeItem
                                    key={node.id}
                                    node={node}
                                    path={[]}
                                    index={index}
                                    expandedNodes={expandedNodes}
                                    onToggle={toggleExpand}
                                    onSelectTodo={onSelectTodo}
                                    onAddTodo={onAddTodo}
                                    onDragStart={handleDragStart}
                                    onDropAtPath={handleDropAtPath}
                                    onDragEnterTag={(id) => setDragOverTagId(id)}
                                    onDragLeaveTag={() => setDragOverTagId(null)}
                                    dragOverTagId={dragOverTagId}
                                    onToggleTask={toggleTaskCompletion}
                                    selectedNodeId={selectedNodeId}
                                    onSelectNode={(id) => setSelectedNodeId(id)}
                                    editingNodeId={editingNodeId}
                                    editingTitle={editingTitle}
                                    onEditingTitleChange={setEditingTitle}
                                    onStartEditing={(id, title) => {
                                        setEditingNodeId(id)
                                        setEditingTitle(title)
                                    }}
                                    onFinishEditing={(id, title) => {
                                        updateTaskTitle(id, title)
                                        setEditingNodeId(null)
                                        setEditingTitle("")
                                    }}
                                    onCancelEditing={() => {
                                        setEditingNodeId(null)
                                        setEditingTitle("")
                                    }}
                                    onRenameTag={(id, name) => updateTagName(id, name)}
                                    onAddChildTag={(id, depth) => addChildTag(id, depth)}
                                    onDeleteTag={(id) => deleteNodeById(id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {tagDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setTagDialogOpen(false)}
                    />
                    <div className="relative w-full max-w-sm rounded-t-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-5 border border-violet-200/40 shadow-2xl">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-foreground">新建标签</span>
                            <button className="text-xs text-muted-foreground" onClick={() => setTagDialogOpen(false)}>
                                关闭
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground">标签名称</label>
                                <input
                                    value={tagDialogName}
                                    onChange={(e) => setTagDialogName(e.target.value)}
                                    placeholder="请输入标签名称"
                                    className="mt-1 w-full rounded-xl border border-violet-200/60 bg-white/70 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-300"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-muted-foreground">父标签</label>
                                {tagDialogParentLocked ? (
                                    <div className="mt-1 w-full rounded-xl border border-violet-200/60 bg-violet-50/60 px-3 py-2 text-sm text-violet-700">
                                        {tagOptions.find((t) => t.id === tagDialogParentId)?.name || "未选择"}
                                    </div>
                                ) : (
                                    <div className="mt-1 rounded-xl border border-violet-200/60 bg-white/70 p-2">
                                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/80 border border-violet-200/60">
                                            <Search className="w-3.5 h-3.5 text-violet-400" />
                                            <input
                                                value={tagDialogSearch}
                                                onChange={(e) => setTagDialogSearch(e.target.value)}
                                                placeholder="搜索标签..."
                                                className="w-full bg-transparent text-xs text-foreground outline-none"
                                            />
                                        </div>
                                        <div className="mt-2 max-h-40 overflow-y-auto">
                                            <button
                                                onClick={() => setTagDialogParentId(null)}
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 rounded-lg text-sm",
                                                    !tagDialogParentId
                                                        ? "bg-violet-100 text-violet-700"
                                                        : "text-foreground hover:bg-violet-50"
                                                )}
                                            >
                                                不设置父标签
                                            </button>
                                            {renderTagDialogOptions(filteredTagDialogTree, !!tagDialogSearch.trim())}
                                        </div>
                                    </div>
                                )}
                                <p className="mt-1 text-[10px] text-muted-foreground">父标签不可选择第三级标签</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setTagDialogOpen(false)}
                                className="w-full rounded-xl border border-violet-200/60 py-2 text-sm text-violet-600"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleCreateTag}
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

// Recursive Tree Node Component
function TreeNodeItem({ 
    node, 
    path,
    index,
    expandedNodes, 
    onToggle, 
    onSelectTodo,
    onAddTodo,
    onDragStart,
    onDropAtPath,
    onDragEnterTag,
    onDragLeaveTag,
    dragOverTagId,
    onToggleTask,
    selectedNodeId,
    onSelectNode,
    editingNodeId,
    editingTitle,
    onEditingTitleChange,
    onStartEditing,
    onFinishEditing,
    onCancelEditing,
    onRenameTag,
    onAddChildTag,
    onDeleteTag
}: { 
    node: TreeNode, 
    path: number[],
    index: number,
    expandedNodes: Record<string, boolean>, 
    onToggle: (id: string) => void,
    onSelectTodo: (todo: TodoItem) => void,
    onAddTodo: () => void,
    onDragStart: (id: string, path: number[], index: number) => void,
    onDropAtPath: (path: number[], index: number) => void,
    onDragEnterTag: (id: string) => void,
    onDragLeaveTag: () => void,
    dragOverTagId: string | null,
    onToggleTask: (id: string) => void,
    selectedNodeId: string | null,
    onSelectNode: (id: string) => void,
    editingNodeId: string | null,
    editingTitle: string,
    onEditingTitleChange: (value: string) => void,
    onStartEditing: (id: string, title: string) => void,
    onFinishEditing: (id: string, title: string) => void,
    onCancelEditing: () => void,
    onRenameTag: (id: string, name: string) => void,
    onAddChildTag: (id: string, depth: number) => void,
    onDeleteTag: (id: string) => void
}) {
    const isExpanded = !!expandedNodes[node.id]
    const hasChildren = node.children && node.children.length > 0
    const isMaxDepth = node.depth >= 2
    const longPressTimerRef = useRef<number | null>(null)
    const [isDragReady, setIsDragReady] = useState(false)
    
    // Indent based on depth (16px per level)
    const indentation = { paddingLeft: `${node.depth * 16}px` }

    if (node.type === "tag") {
        const isDragOver = dragOverTagId === node.id

        return (
            <div className="select-none animate-in fade-in slide-in-from-left-2 duration-300">
                <ContextMenu>
                    <ContextMenuTrigger>
                                                <div 
                          className={cn(
                                                         "flex items-center gap-2 h-11 pr-3 my-1 mx-1 rounded-xl cursor-pointer transition-all border border-transparent group",
                             "hover:bg-white/70 dark:hover:bg-white/5 active:bg-violet-50/50",
                             isExpanded && "bg-white/50 dark:bg-white/5",
                                                         selectedNodeId === node.id && "bg-violet-100/60 border-violet-200",
                             isDragOver && "bg-violet-100 border-violet-300 ring-2 ring-violet-200",
                             isDragReady && "shadow-[0_12px_30px_rgba(124,58,237,0.2)] opacity-90"
                          )}
                          style={indentation}
                                                    onClick={() => {
                                                            onSelectNode(node.id)
                                                            onToggle(node.id)
                                                    }}
                                                    draggable
                                                    onDragStart={(event) => {
                                                        if (!isDragReady) {
                                                            event.preventDefault()
                                                            return
                                                        }
                                                        onDragStart(node.id, path, index)
                                                    }}
                                                    onDragEnd={() => setIsDragReady(false)}
                                                    onPointerDown={() => {
                                                        if (longPressTimerRef.current) {
                                                            window.clearTimeout(longPressTimerRef.current)
                                                        }
                                                        longPressTimerRef.current = window.setTimeout(() => {
                                                            setIsDragReady(true)
                                                        }, 220)
                                                    }}
                                                    onPointerUp={() => {
                                                        if (longPressTimerRef.current) {
                                                            window.clearTimeout(longPressTimerRef.current)
                                                        }
                                                    }}
                                                    onPointerLeave={() => {
                                                        if (longPressTimerRef.current) {
                                                            window.clearTimeout(longPressTimerRef.current)
                                                        }
                                                    }}
                                                    onPointerCancel={() => {
                                                        if (longPressTimerRef.current) {
                                                            window.clearTimeout(longPressTimerRef.current)
                                                        }
                                                    }}
                                                    onDragOver={(e) => e.preventDefault()}
                          onDragEnter={() => onDragEnterTag(node.id)}
                          onDragLeave={onDragLeaveTag}
                                                    onDrop={() => onDropAtPath(path, index)}
                        >
                             {/* Arrow - Rotates */}
                            <button 
                                className={cn(
                                    "p-0.5 rounded-md text-muted-foreground/60 hover:text-violet-600 transition-transform duration-200",
                                    isExpanded ? "rotate-90 text-violet-500" : ""
                                )}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onToggle(node.id)
                                }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            {/* Tag Label */}
                            <div className="flex-1 flex items-center gap-2">
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm transition-all",
                                    node.depth === 0 && "bg-violet-100/70 text-[#7e22ce] border-violet-200/60",
                                    node.depth === 1 && "bg-violet-100/50 text-[#a855f7] border-violet-200/60",
                                    node.depth >= 2 && "bg-violet-100/40 text-[#c084fc] border-violet-200/60"
                                )}>
                                    <Tag className="w-3 h-3" />
                                    {node.name}
                                </div>
                                <div className="h-px bg-border/40 flex-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Count */}
                            <span className="text-[10px] text-muted-foreground/60 font-mono px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {node.count ?? (node.children?.length || 0)}
                            </span>
                            <button
                                className="p-1 rounded-md text-muted-foreground/50 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(event) => {
                                    event.stopPropagation()
                                    onAddChildTag(node.id, node.depth)
                                }}
                                title="新建子标签"
                                style={{ display: isMaxDepth ? "none" : undefined }}
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    </ContextMenuTrigger>
                    
                    {/* Context Menu for Tag */}
                    <ContextMenuContent className="w-48 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-xl">
                        <ContextMenuItem
                            className="rounded-lg focus:bg-violet-50 focus:text-violet-600 cursor-pointer"
                            onClick={onAddTodo}
                        >
                            <Plus className="w-4 h-4 mr-2"/> 新建待办
                        </ContextMenuItem>
                        <ContextMenuItem
                            className="rounded-lg focus:bg-violet-50 focus:text-violet-600 cursor-pointer"
                            onClick={() => {
                                const name = window.prompt("重命名标签", node.name)
                                if (name) onRenameTag(node.id, name)
                            }}
                        >
                            <Edit2 className="w-4 h-4 mr-2"/> 重命名
                        </ContextMenuItem>
                        {!isMaxDepth && (
                            <ContextMenuItem
                                className="rounded-lg focus:bg-violet-50 focus:text-violet-600 cursor-pointer"
                                onClick={() => onAddChildTag(node.id, node.depth)}
                            >
                                <Plus className="w-4 h-4 mr-2"/> 新建子标签
                            </ContextMenuItem>
                        )}
                        <ContextMenuSub>
                            <ContextMenuSubTrigger className="rounded-lg focus:bg-violet-50 focus:text-violet-600 cursor-pointer"><Palette className="w-4 h-4 mr-2"/> 标签颜色</ContextMenuSubTrigger>
                            <ContextMenuSubContent className="bg-background/95 backdrop-blur-xl border-border/50 rounded-xl">
                                <ContextMenuItem>🟣 经典紫</ContextMenuItem>
                                <ContextMenuItem>🔵 宁静蓝</ContextMenuItem>
                                <ContextMenuItem>🟢 自然绿</ContextMenuItem>
                                <ContextMenuItem>🔴 活力红</ContextMenuItem>
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            className="text-red-500 focus:text-red-600 focus:bg-red-50 rounded-lg cursor-pointer"
                            onClick={() => onDeleteTag(node.id)}
                        >
                            <Trash2 className="w-4 h-4 mr-2"/> 删除标签
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                {/* Children container with animation */}
                                <div
                                    className={cn(
                                        "grid transition-[grid-template-rows] duration-200 ease-in-out",
                                        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                    )}
                                >
                                    <div className="overflow-hidden border-l border-violet-100/70 dark:border-violet-900/40 ml-4 pl-2">
                                        {/* Nested Items - Recursive Call */}
                                        {node.children && node.children.map((child, childIndex) => (
                                            <TreeNodeItem
                                                key={child.id}
                                                node={child}
                                                path={[...path, index]}
                                                index={childIndex}
                                                expandedNodes={expandedNodes}
                                                onToggle={onToggle}
                                                onSelectTodo={onSelectTodo}
                                                onAddTodo={onAddTodo}
                                                onDragStart={onDragStart}
                                                onDropAtPath={onDropAtPath}
                                                onDragEnterTag={onDragEnterTag}
                                                onDragLeaveTag={onDragLeaveTag}
                                                dragOverTagId={dragOverTagId}
                                                onToggleTask={onToggleTask}
                                                selectedNodeId={selectedNodeId}
                                                onSelectNode={onSelectNode}
                                                editingNodeId={editingNodeId}
                                                editingTitle={editingTitle}
                                                onEditingTitleChange={onEditingTitleChange}
                                                onStartEditing={onStartEditing}
                                                onFinishEditing={onFinishEditing}
                                                onCancelEditing={onCancelEditing}
                                                onRenameTag={onRenameTag}
                                                onAddChildTag={onAddChildTag}
                                                onDeleteTag={onDeleteTag}
                                            />
                                        ))}
                                    </div>
                                </div>
            </div>
        )
    }

        if (node.type === "task" && node.task) {
            const isDragOver = dragOverTagId === node.id
                const isDone = node.task.completed

                return (
                <div 
                    className={cn(
                                            "group relative flex items-center gap-3 h-11 px-2 my-0.5 rounded-xl transition-all select-none cursor-pointer hover:bg-white dark:hover:bg-white/5 active:scale-[0.99]",
                      isDone ? "opacity-50" : "",
                      selectedNodeId === node.id && "bg-violet-100/60",
                      isDragOver && "bg-violet-100/70 ring-2 ring-violet-200"
                    )}
                             style={{ ...indentation, paddingLeft: `${node.depth * 16 + 12}px` }}
                             onClick={() => {
                                 onSelectNode(node.id)
                                 const fallback: TodoItem = {
                                     id: node.id,
                                     title: node.task!.title,
                                     date: new Date().toISOString().split("T")[0],
                                     done: node.task!.completed,
                                 }
                                 onSelectTodo(fallback)
                             }}
                             onDoubleClick={() => onStartEditing(node.id, node.task!.title)}
               draggable
                             onDragStart={(event) => {
                                 if (!isDragReady) {
                                     event.preventDefault()
                                     return
                                 }
                                 onDragStart(node.id, path, index)
                             }}
                             onDragEnd={() => setIsDragReady(false)}
                             onPointerDown={() => {
                                 if (longPressTimerRef.current) {
                                     window.clearTimeout(longPressTimerRef.current)
                                 }
                                 longPressTimerRef.current = window.setTimeout(() => {
                                     setIsDragReady(true)
                                 }, 220)
                             }}
                             onPointerUp={() => {
                                 if (longPressTimerRef.current) {
                                     window.clearTimeout(longPressTimerRef.current)
                                 }
                             }}
                             onPointerLeave={() => {
                                 if (longPressTimerRef.current) {
                                     window.clearTimeout(longPressTimerRef.current)
                                 }
                             }}
                             onPointerCancel={() => {
                                 if (longPressTimerRef.current) {
                                     window.clearTimeout(longPressTimerRef.current)
                                 }
                             }}
                             onDragOver={(event) => event.preventDefault()}
                             onDragEnter={() => onDragEnterTag(node.id)}
                             onDragLeave={onDragLeaveTag}
                             onDrop={() => onDropAtPath(path, index)}
            >
                {/* Drag Handle (Hover only) */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-opacity">
                     <GripVertical className="w-3 h-3" />
                </div>

                {/* Custom Checkbox */}
                <div 
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleTask(node.id)
                    }}
                    className={cn(
                                                "flex-shrink-0 w-[18px] h-[16px] rounded-[4px] border-[1.5px] transition-all flex items-center justify-center z-10 box-border ml-2",
                        isDone 
                                                ? "bg-white/80 border-muted-foreground/40 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]" 
                                                : "border-violet-300/70 dark:border-violet-700 hover:border-violet-400 bg-background/50 hover:bg-background group-hover:scale-105"
                    )}
                >
                    {isDone && <Check className="w-2.5 h-2.5 text-muted-foreground stroke-[3.5]" />}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                     <div className="flex items-center gap-2">
                         {editingNodeId === node.id ? (
                             <input
                                 value={editingTitle}
                                 onChange={(e) => onEditingTitleChange(e.target.value)}
                                 onBlur={() => onFinishEditing(node.id, editingTitle.trim() || node.task!.title)}
                                 onKeyDown={(e) => {
                                     if (e.key === "Enter") onFinishEditing(node.id, editingTitle.trim() || node.task!.title)
                                     if (e.key === "Escape") onCancelEditing()
                                 }}
                                 autoFocus
                                 className="flex-1 bg-white/70 dark:bg-zinc-900/60 rounded-md px-2 py-1 text-sm outline-none border border-violet-200 focus:border-violet-400"
                             />
                         ) : (
                             <span className={cn(
                                 "text-sm font-medium truncate transition-colors text-[#111827]",
                                 isDone && "line-through"
                             )}>
                                 {node.task.title}
                             </span>
                         )}
                         
                         {/* Subtask Count */}
                                                 {node.task.subtaskCount && (
                                                     <span className="text-[10px] text-muted-foreground font-mono bg-secondary px-1 py-0.5 rounded">
                                                         {node.task.subtaskCount}
                                                     </span>
                                                 )}
                     </div>
                </div>

                {/* Right side info? - Optional */}
            </div>
        )
    }

    return null
}
