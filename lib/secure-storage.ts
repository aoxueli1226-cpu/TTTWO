"use client"

const DB_NAME = "deskmaster_secure"
const STORE_NAME = "keys"
const MASTER_KEY_ID = "master"

function isBrowser() {
  return typeof window !== "undefined"
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToBuffer(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getStoredKey() {
  if (!isBrowser()) return null
  const db = await openDb()
  return new Promise<CryptoKey | null>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(MASTER_KEY_ID)
    request.onsuccess = () => resolve((request.result as CryptoKey) ?? null)
    request.onerror = () => resolve(null)
  })
}

async function setStoredKey(key: CryptoKey) {
  if (!isBrowser()) return
  const db = await openDb()
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.put(key, MASTER_KEY_ID)
    tx.oncomplete = () => resolve()
  })
}

async function getMasterKey() {
  const existing = await getStoredKey()
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  await setStoredKey(key)
  return key
}

function fallbackEncrypt(value: string) {
  const salt = "desk_guardian"
  const mixed = value.split("").map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))).join("")
  return `v0:${btoa(mixed)}`
}

function fallbackDecrypt(value: string) {
  if (!value.startsWith("v0:")) return value
  const raw = atob(value.replace("v0:", ""))
  const salt = "desk_guardian"
  return raw.split("").map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ salt.charCodeAt(i % salt.length))).join("")
}

export async function encryptApiKey(plain: string) {
  if (!isBrowser() || !crypto?.subtle) return fallbackEncrypt(plain)
  try {
    const key = await getMasterKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(plain)
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)
    const payload = new Uint8Array(iv.byteLength + cipher.byteLength)
    payload.set(iv, 0)
    payload.set(new Uint8Array(cipher), iv.byteLength)
    return `v1:${bufferToBase64(payload.buffer)}`
  } catch {
    return fallbackEncrypt(plain)
  }
}

export async function decryptApiKey(cipherText: string) {
  if (!isBrowser() || !crypto?.subtle) return fallbackDecrypt(cipherText)
  if (!cipherText.startsWith("v1:")) return fallbackDecrypt(cipherText)
  try {
    const data = base64ToBuffer(cipherText.replace("v1:", ""))
    const bytes = new Uint8Array(data)
    const iv = bytes.slice(0, 12)
    const body = bytes.slice(12)
    const key = await getMasterKey()
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, body)
    return new TextDecoder().decode(plain)
  } catch {
    return fallbackDecrypt(cipherText)
  }
}
