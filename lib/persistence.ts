"use client"

import type { TodoItem, TagNode, User } from "@/lib/store"

const STORAGE_KEYS = {
  user: "deskmaster_user_v1",
  todos: "deskmaster_todos_v1",
  tags: "deskmaster_tags_v1",
}

function isBrowser() {
  return typeof window !== "undefined"
}

function readJson<T>(key: string): T | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function loadUser(): User | null {
  return readJson<User>(STORAGE_KEYS.user)
}

export function saveUser(user: User) {
  writeJson(STORAGE_KEYS.user, user)
}

export function loadTodos(): TodoItem[] | null {
  return readJson<TodoItem[]>(STORAGE_KEYS.todos)
}

export function saveTodos(todos: TodoItem[]) {
  writeJson(STORAGE_KEYS.todos, todos)
}

export function loadTags(): TagNode[] | null {
  return readJson<TagNode[]>(STORAGE_KEYS.tags)
}

export function saveTags(tags: TagNode[]) {
  writeJson(STORAGE_KEYS.tags, tags)
}

export function clearAllStorage() {
  if (!isBrowser()) return
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key))
}
