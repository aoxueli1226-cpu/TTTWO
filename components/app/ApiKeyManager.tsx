"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

interface ApiKeyManagerProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  saving: boolean
  error?: string
}

export default function ApiKeyManager({ value, onChange, onSave, saving, error }: ApiKeyManagerProps) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div>
      <div className="flex items-center gap-2 bg-secondary rounded-2xl px-4 py-3.5">
        <input
          type={showKey ? "text" : "password"}
          placeholder="sk-xxxxxxxxxxxx"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none font-mono"
        />
        <button onClick={() => setShowKey(!showKey)} className="text-muted-foreground">
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-destructive text-xs mt-1 pl-1">{error}</p>}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-4 mt-4 rounded-2xl app-gradient text-white font-semibold
          active:scale-95 transition-all disabled:opacity-60"
      >
        {saving ? "保存中..." : "完成配置"}
      </button>
    </div>
  )
}
