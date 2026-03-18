"use client"

import { useState, useEffect } from "react"
import { User } from "@/lib/store"

interface LoginScreenProps {
  onLogin: (user: User) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [countdown, setCountdown] = useState(0)
  const [phoneError, setPhoneError] = useState("")
  const [codeError, setCodeError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function handlePhoneChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 11)
    setPhone(digits)
    if (digits.length > 0 && digits.length < 11) {
      setPhoneError("请输入完整的11位手机号")
    } else {
      setPhoneError("")
    }
  }

  function handleSendCode() {
    if (phone.length !== 11) {
      setPhoneError("请输入完整的11位手机号")
      return
    }
    setCountdown(60)
  }

  function createUser(nickname: string): User {
    return {
      phone,
      nickname,
      apiProviders: [],
      notifications: true,
      calendarSync: false,
      darkMode: false,
    }
  }

  function handleLogin() {
    if (phone.length !== 11) {
      setPhoneError("请输入正确的手机号")
      return
    }
    if (code.length < 4) {
      setCodeError("请输入验证码")
      return
    }
    setLoading(true)
    setTimeout(() => {
      const user = createUser(`用户${phone.slice(-4)}`)
      onLogin(user)
      setLoading(false)
    }, 800)
  }

  function handleQQ() {
    setLoading(true)
    setTimeout(() => {
      const user = createUser("QQ用户")
      onLogin(user)
      setLoading(false)
    }, 800)
  }

  function handleWechat() {
    setLoading(true)
    setTimeout(() => {
      const user = createUser("微信用户")
      onLogin(user)
      setLoading(false)
    }, 800)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh relative overflow-hidden px-5"
      style={{ background: "linear-gradient(135deg, #f5f0ff 0%, #ede4ff 50%, #f8f4ff 100%)" }}>
      <div className="absolute top-20 right-10 w-40 h-40 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="absolute bottom-32 left-10 w-56 h-56 rounded-full bg-violet-100/40 blur-3xl" />

      <div className="relative w-full max-w-sm">
        {/* logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)" }}>
            <span className="text-white font-bold text-xl">TT</span>
          </div>
          <h1 className="text-2xl font-bold text-violet-900">欢迎使用桌面管家</h1>
          <p className="text-violet-600/70 text-sm mt-1">AI 驱动的智能待办助手</p>
        </div>

        {/* card */}
        <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
          {/* phone */}
          <div>
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3 border border-violet-200/70 bg-white/60 backdrop-blur-md shadow-sm">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
              />
            </div>
            {phoneError && <p className="text-destructive text-xs mt-1 pl-1">{phoneError}</p>}
          </div>

          {/* code row */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-2xl px-4 py-3 border border-violet-200/70 bg-white/60 backdrop-blur-md shadow-sm">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="验证码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
                />
              </div>
              <button
                onClick={handleSendCode}
                disabled={countdown > 0 || phone.length !== 11}
                className="px-4 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95
                  bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {countdown > 0 ? `${countdown}s` : "发送"}
              </button>
            </div>
            {codeError && <p className="text-destructive text-xs mt-1 pl-1">{codeError}</p>}
          </div>

          {/* login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95
              app-gradient text-white shadow-lg disabled:opacity-60"
          >
            {loading ? "登录中..." : "登录 / 注册"}
          </button>

          {/* divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-violet-200" />
            <span className="text-violet-400 text-xs">或</span>
            <div className="flex-1 h-px bg-violet-200" />
          </div>

          {/* social login icons */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleWechat}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 transition-all disabled:opacity-60"
              title="微信登录"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#07c160]">
                <path d={`M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.81-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-7.062-6.122zm-3.318 2.867c-.526 0-.951.429-.951.959 0 .53.425.96.951.96.526 0 .951-.43.951-.96 0-.53-.425-.959-.951-.959zm5.096 0c-.526 0-.951.429-.951.959 0 .53.425.96.951.96.526 0 .951-.43.951-.96 0-.53-.425-.959-.951-.959z`} />
              </svg>
            </button>
            <button
              onClick={handleQQ}
              disabled={loading}
              className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center active:scale-95 transition-all disabled:opacity-60"
              title="QQ登录"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#12B7F5]">
                <path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .902-.484 1.748-2.072 0 0-.18 2.197 1.904 3.967 0 0-1.77.495-1.77 1.182 0 .686 4.078.43 6.29.43 2.214 0 6.291.256 6.291-.43 0-.687-1.77-1.182-1.77-1.182 2.085-1.77 1.904-3.967 1.904-3.967.846 1.588 1.634 2.072 1.748 2.072.111 0 .281-.36.281-1.025 0-2.514-2.166-6.954-2.166-6.954V9.325C18.293 3.364 14.268 2 12.003 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
