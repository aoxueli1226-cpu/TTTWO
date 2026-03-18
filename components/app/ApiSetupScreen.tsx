"use client"

import { useState } from "react"
import { API_PROVIDERS, ApiProvider, User } from "@/lib/store"
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink } from "lucide-react"
import ApiKeyManager from "@/components/app/ApiKeyManager"
import { encryptApiKey } from "@/lib/secure-storage"

interface ApiSetupScreenProps {
  user: User
  onDone: (user: User) => void
  onBack?: () => void
  isFromProfile?: boolean
}

type Step = "select" | "confirm" | "guide"

export default function ApiSetupScreen({ user, onDone, onBack, isFromProfile }: ApiSetupScreenProps) {
  const [step, setStep] = useState<Step>("select")
  const [selected, setSelected] = useState<ApiProvider | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [keyError, setKeyError] = useState("")
  const [saving, setSaving] = useState(false)

  function handleSelectProvider(p: ApiProvider) {
    setSelected(p)
    if (p.type === "paid") {
      setStep("confirm")
    } else {
      setStep("guide")
    }
  }

  function handleConfirmCost() {
    setStep("guide")
  }

  async function handleSave() {
    if (apiKey.trim().length < 8) {
      setKeyError("请输入有效的 API Key")
      return
    }
    setSaving(true)
    try {
      const encrypted = await encryptApiKey(apiKey)
      const existingIdx = user.apiProviders.findIndex((p) => p.providerId === selected!.id)
      let newProviders = [...user.apiProviders]
      if (existingIdx >= 0) {
        newProviders[existingIdx] = { providerId: selected!.id, key: encrypted, current: true }
      } else {
        newProviders = newProviders.map((p) => ({ ...p, current: false }))
        newProviders.push({ providerId: selected!.id, key: encrypted, current: true })
      }
      onDone({ ...user, apiProviders: newProviders })
    } catch {
      setKeyError("保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => {
            if (step === "select") onBack?.()
            else if (step === "confirm") setStep("select")
            else if (step === "guide") setStep(selected?.type === "paid" ? "confirm" : "select")
          }}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground text-lg">
          {step === "select" && "选择 AI 服务"}
          {step === "confirm" && "费用说明"}
          {step === "guide" && "配置指引"}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Step 1: select */}
        {step === "select" && (
          <div className="flex flex-col gap-3 mt-2">
            <p className="text-muted-foreground text-sm mb-2">选择一个 AI 供应商</p>
            {API_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectProvider(p)}
                className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border
                  active:scale-98 transition-all text-left group hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
                    ${p.type === "free" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-600"}`}>
                    {p.type === "free" ? "免" : "¥"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{p.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${p.type === "free" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {p.label}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs">{p.desc}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: confirm cost */}
        {step === "confirm" && selected && (
          <div className="flex flex-col gap-5 mt-4">
            <div className="glass-card rounded-3xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl">⚠️</div>
                <div>
                  <h2 className="font-bold text-foreground text-base">费用提醒</h2>
                  <p className="text-muted-foreground text-xs">按量付费服务</p>
                </div>
              </div>
              <p className="text-foreground text-sm leading-relaxed">
                你选择的 <span className="font-semibold text-primary">{selected.name}</span> 是按量付费服务。
              </p>
              <div className="bg-amber-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="font-medium text-amber-800 text-sm">预估费用</p>
                <p className="text-amber-700 text-sm">· 每条消息约 {selected.price}</p>
                <p className="text-amber-700 text-sm">· 每月 100 条约不到 ¥1</p>
              </div>
            </div>
            <button
              onClick={handleConfirmCost}
              className="w-full py-4 rounded-2xl app-gradient text-white font-semibold
                flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              我已了解，继续配置
            </button>
          </div>
        )}

        {/* Step 3: guide + key input */}
        {step === "guide" && selected && (
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-muted-foreground text-sm">按照以下步骤获取 API Key</p>

            <div className="glass-card rounded-3xl p-5 flex flex-col gap-4">
              {selected.steps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{s.title}</p>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs flex items-center gap-1 mt-0.5"
                      >
                        {s.url} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="text-muted-foreground text-xs mt-0.5">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <ApiKeyManager
              value={apiKey}
              onChange={(value) => {
                setApiKey(value)
                setKeyError("")
              }}
              onSave={handleSave}
              saving={saving}
              error={keyError}
            />
          </div>
        )}
      </div>
    </div>
  )
}
