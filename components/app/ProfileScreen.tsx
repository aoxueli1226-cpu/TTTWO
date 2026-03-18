"use client"

import { useState, useRef } from "react"
import { User, API_PROVIDERS, DEMO_HISTORY } from "@/lib/store"
import { ChevronLeft, Pencil, Plus, LogOut, Check } from "lucide-react"

interface ProfileScreenProps {
  user: User
  onBack: () => void
  onUpdate: (user: User) => void
  onLogout: () => void
  onAddProvider: () => void
}

type Tab = "profile" | "history" | "settings"

export default function ProfileScreen({
  user,
  onBack,
  onUpdate,
  onLogout,
  onAddProvider,
}: ProfileScreenProps) {
  const [tab, setTab] = useState<Tab>("profile")
  const [editingName, setEditingName] = useState(false)
  const [nickname, setNickname] = useState(user.nickname)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  function saveName() {
    onUpdate({ ...user, nickname: nickname.trim() || user.nickname })
    setEditingName(false)
  }

  function handleAvatarChange(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      if (result) onUpdate({ ...user, avatar: result })
    }
    reader.readAsDataURL(file)
  }

  function switchProvider(providerId: string) {
    const updated = user.apiProviders.map((p) => ({ ...p, current: p.providerId === providerId }))
    onUpdate({ ...user, apiProviders: updated })
  }

  const currentProvider = user.apiProviders.find((p) => p.current)
  const currentProviderInfo = currentProvider
    ? API_PROVIDERS.find((p) => p.id === currentProvider.providerId)
    : null

  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "个人资料" },
    { id: "history", label: "历史记录" },
    { id: "settings", label: "设置" },
  ]

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground text-lg">个人中心</h1>
      </div>

      {/* avatar + name */}
      <div className="flex flex-col items-center py-6 px-5">
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            handleAvatarChange(file)
            if (avatarInputRef.current) avatarInputRef.current.value = ""
          }}
        />
        <button
          onClick={() => avatarInputRef.current?.click()}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl mb-3 active:scale-95 transition-all overflow-hidden border border-white/40 backdrop-blur-md"
          title="更换头像"
        >
          {user.avatar && user.avatar.startsWith("data:") ? (
            <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            user.avatar || "👤"
          )}
        </button>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              autoFocus
              className="text-center font-bold text-foreground text-lg bg-secondary rounded-xl px-3 py-1 outline-none"
            />
            <button onClick={saveName} className="text-primary">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex items-center gap-2 active:scale-95"
          >
            <span className="font-bold text-foreground text-lg">{user.nickname}</span>
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* tabs */}
      <div className="flex px-5 gap-1 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 flex flex-col gap-4">
        {/* profile tab */}
        {tab === "profile" && (
          <>
            {/* current AI */}
            <div className="glass-card rounded-3xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-foreground text-sm">当前 AI 服务</span>
              </div>
              {currentProviderInfo ? (
                <div className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                      AI
                    </div>
                    <span className="font-medium text-foreground text-sm">{currentProviderInfo.name}</span>
                  </div>
                  <span className="text-xs text-primary font-medium">当前使用</span>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">尚未配置 AI 服务</p>
              )}
            </div>

            {/* configured providers */}
            <div className="glass-card rounded-3xl p-4">
              <p className="font-semibold text-foreground text-sm mb-3">已配置的服务</p>
              {user.apiProviders.length === 0 ? (
                <p className="text-muted-foreground text-sm">还未添加任何 AI 服务</p>
              ) : (
                <div className="flex flex-col gap-2 mb-3">
                  {user.apiProviders.map((p) => {
                    const info = API_PROVIDERS.find((ap) => ap.id === p.providerId)
                    return (
                      <div key={p.providerId} className="flex items-center justify-between bg-secondary rounded-2xl p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-sm text-foreground">{info?.name || p.providerId}</span>
                          {p.current && (
                            <span className="text-xs text-primary font-medium">当前</span>
                          )}
                        </div>
                        {!p.current && (
                          <button
                            onClick={() => switchProvider(p.providerId)}
                            className="text-primary text-xs font-medium px-2 py-1 rounded-lg bg-primary/10 active:scale-95"
                          >
                            切换
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                onClick={onAddProvider}
                className="w-full py-2.5 rounded-2xl border border-dashed border-primary/40 text-primary text-sm font-medium
                  flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                添加新服务
              </button>
            </div>
          </>
        )}

        {/* history tab */}
        {tab === "history" && (
          <div className="glass-card rounded-3xl p-4 flex flex-col gap-3">
            {DEMO_HISTORY.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <span className="text-muted-foreground text-xs">{h.date}</span>
                  <p className="text-foreground text-sm">{h.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* settings tab */}
        {tab === "settings" && (
          <div className="glass-card rounded-3xl p-4 flex flex-col gap-1">
            {[
              { label: "闹钟提醒", key: "notifications" as const },
              { label: "日历同步", key: "calendarSync" as const },
              { label: "深色模式", key: "darkMode" as const },
            ].map((s) => (
              <div key={s.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-foreground text-sm">{s.label}</span>
                <button
                  onClick={() => onUpdate({ ...user, [s.key]: !user[s.key] })}
                  className={`w-11 h-6 rounded-full transition-all flex items-center px-1
                    ${user[s.key] ? "bg-primary justify-end" : "bg-secondary justify-start"}`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* logout button */}
        <button
          onClick={onLogout}
          className="w-full py-3.5 rounded-2xl bg-destructive/10 text-destructive font-semibold text-sm
            flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </div>
  )
}
