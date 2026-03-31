"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, LogIn, AlertCircle, Sparkles, Ship, Anchor } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Persona {
  role: string
  name: string
  email: string
  initials: string
  color: string
}

const PERSONAS: Persona[] = [
  {
    role: "Router",
    name: "Alex Chen",
    email: "a.chen@logistics.co",
    initials: "AC",
    color: "bg-violet-600",
  },
  {
    role: "Shipment Planner",
    name: "Maria Santos",
    email: "m.santos@logistics.co",
    initials: "MS",
    color: "bg-blue-600",
  },
]

const DEMO_PASSWORD = "Demo@2024"

const FEATURES = [
  "End-to-end autonomous booking execution",
  "AI carrier selection by rate, SLA & capacity",
  "RPA-powered carrier portal integration",
  "Proactive booking status tracking & alerts",
  "Exception handling with auto-resolution",
]

interface LoginPageProps {
  onLogin: (persona: Persona) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const match = PERSONAS.find((p) => p.email === email.trim().toLowerCase())
    if (!match) {
      // fallback — allow any credentials
      if (password) {
        setLoading(true)
        setTimeout(() => onLogin(PERSONAS[0]), 700)
        return
      }
      setError("Invalid email or password.")
      return
    }
    setLoading(true)
    setTimeout(() => onLogin(match), 700)
  }

  const fillAccount = (p: Persona) => {
    setEmail(p.email)
    setPassword(DEMO_PASSWORD)
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel: Branding ── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="lg:w-[440px] flex-shrink-0 bg-gradient-to-br from-[#040d1e] via-[#071a3e] to-[#040d1e] flex flex-col justify-between px-10 py-12 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-[-60px] left-[-60px] w-60 h-60 rounded-full bg-blue-600/10 blur-3xl" />
        </div>

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Booking Agent</p>
              <p className="text-blue-200 text-[10px]">AI-Powered Booking Automation</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mt-8">
            <h1 className="text-3xl font-bold text-white leading-tight">
              Autonomous
              <br />
              Shipment
              <br />
              <span className="text-blue-200">Booking</span>
            </h1>
            <p className="mt-4 text-blue-100/80 text-sm leading-relaxed">
              AI-powered platform for end-to-end autonomous booking execution, carrier selection, and proactive booking status tracking across global trade lanes.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-10 space-y-3">
            {FEATURES.map((feat) => (
              <div key={feat} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-200 shrink-0" />
                <span className="text-blue-100/90 text-sm">{feat}</span>
              </div>
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { value: "842", label: "Bookings Made" },
              { value: "71%", label: "Zero-Touch" },
              { value: "4.2m", label: "Avg. Time" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2.5 text-center">
                <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
                <p className="text-blue-200 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-12 border-t border-white/15 pt-6">
          <p className="text-blue-200/60 text-xs">Demo environment · All data is fictitious</p>
          <p className="text-blue-200/40 text-[11px] mt-1">Booking Agent v1.0 · Built by TCS MGF</p>
        </div>
      </motion.div>

      {/* ── Right panel: Login form ── */}
      <div className="flex-1 bg-slate-50 flex items-center justify-center px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Access your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError("") }}
                placeholder="you@logistics.co"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400
                           focus:outline-none focus:ring-2 focus:ring-[#0000B3] focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError("") }}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400
                             focus:outline-none focus:ring-2 focus:ring-[#0000B3] focus:border-transparent transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5"
              >
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600">{error}</span>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0000B3] hover:bg-[#00009A]
                         text-white text-sm font-semibold py-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <><LogIn size={15} /> Sign In</>
              )}
            </button>
          </form>

          {/* Persona cards */}
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Demo personas — click to fill
            </p>
            <div className="flex gap-2.5">
              {PERSONAS.map((p) => {
                const isFirst = p === PERSONAS[0]
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => fillAccount(p)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl border py-3 font-semibold text-sm transition",
                      isFirst
                        ? "border-violet-200 bg-violet-50/60 text-violet-700 hover:border-violet-500 hover:bg-violet-50"
                        : "border-blue-200 bg-blue-50/60 text-[#0000B3] hover:border-[#0000B3] hover:bg-blue-50"
                    )}
                  >
                    {isFirst ? <Ship size={18} /> : <Anchor size={18} />}
                    {p.role}
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
