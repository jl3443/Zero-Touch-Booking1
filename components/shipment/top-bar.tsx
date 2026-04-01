"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, UserCircle, ChevronDown, Mail, Inbox, Send, BarChart2, Ship, Square, ArrowRight, Settings2, Shield, Code2, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { DEMO_SCENARIOS, DEMO_STEP_DETAILS } from "@/lib/mock-data"
import { type Persona } from "./login-page"

export type ViewTab = "dashboard" | "analytics" | "email-inbox" | "email-sent" | "automation-rules" | "policy" | "api" | "carriers" | "contracts"

interface TopBarProps {
  activeTab: ViewTab
  onTabChange: (tab: ViewTab) => void
  onAiToggle: () => void
  aiPanelOpen: boolean
  persona?: Persona
  // Demo mode
  demoActive?: boolean
  demoStep?: number
  demoScenario?: string
  onStartDemo?: (scenarioId: string) => void
  onStopDemo?: () => void
  onGoToDashboard?: () => void
  // Badges
  unreadInboxCount?: number
  exceptionsCount?: number
}

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])
  return { open, setOpen, ref }
}

export function TopBar({
  activeTab,
  onTabChange,
  onAiToggle,
  aiPanelOpen,
  persona,
  demoActive,
  demoStep,
  demoScenario,
  onStartDemo,
  onStopDemo,
  onGoToDashboard,
  unreadInboxCount = 0,
  exceptionsCount = 0,
}: TopBarProps) {
  const dashboard = useDropdown()
  const bookings = useDropdown()
  const email = useDropdown()

  const isDashboardActive = activeTab === "dashboard" || activeTab === "analytics"
  const isEmailActive = activeTab === "email-inbox" || activeTab === "email-sent"

  // Badge bounce
  const [badgeBounce, setBadgeBounce] = useState(false)
  const prevUnread = useRef(unreadInboxCount)
  useEffect(() => {
    if (unreadInboxCount > prevUnread.current) {
      setBadgeBounce(true)
      const timer = setTimeout(() => setBadgeBounce(false), 600)
      return () => clearTimeout(timer)
    }
    prevUnread.current = unreadInboxCount
  }, [unreadInboxCount])

  // Demo step label
  const stepLabel = demoStep && demoStep >= 1 && demoStep <= 8
    ? DEMO_STEP_DETAILS[demoStep - 1].thinkingLabel.replace("...", "")
    : demoStep && demoStep > 8 ? "Booking Complete" : "Starting..."

  return (
    <header className="shrink-0">
      {/* Demo mode banner */}
      {demoActive && (
        <div className="flex items-center justify-between px-5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="font-bold uppercase tracking-wider">Demo Mode</span>
            <span className="text-white/70">|</span>
            {demoStep && demoStep >= 1 ? (
              <span className="text-white/90">
                Step {Math.min(demoStep, 8)} of 8: {stepLabel}
              </span>
            ) : (
              <button
                onClick={onGoToDashboard}
                className="flex items-center gap-1 text-white/90 hover:text-white transition-colors underline underline-offset-2"
              >
                New shipment waiting on Dashboard — click to view
                <ArrowRight size={11} />
              </button>
            )}
          </div>
          <button
            onClick={onStopDemo}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors font-medium"
          >
            <Square size={10} /> End Demo
          </button>
        </div>
      )}

      {/* Main nav bar */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        {/* Left: Logo + nav dropdowns */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="text-lg text-[#0000B3]">✦</span>
            <span className="text-lg font-bold text-[#0000B3] tracking-tight">Booking Agent</span>
          </div>

          {/* Dashboard dropdown */}
          <div className="relative" ref={dashboard.ref}>
            <button
              onClick={() => { dashboard.setOpen(p => !p); bookings.setOpen(false); email.setOpen(false) }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                isDashboardActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Dashboard
              <ChevronDown size={13} className={cn("transition-transform", dashboard.open && "rotate-180")} />
            </button>
            {dashboard.open && (
              <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-xl z-[100] overflow-hidden">
                <div className="px-2 py-1.5">
                  <button
                    onClick={() => { onTabChange("dashboard"); dashboard.setOpen(false) }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      activeTab === "dashboard" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Overview
                  </button>
                  <button
                    onClick={() => { onTabChange("analytics"); dashboard.setOpen(false) }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      activeTab === "analytics" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <BarChart2 size={13} className="text-slate-500" />
                    Analytics
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bookings dropdown */}
          <div className="relative" ref={bookings.ref}>
            <button
              onClick={() => { bookings.setOpen(p => !p); dashboard.setOpen(false); email.setOpen(false) }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                !isDashboardActive && !isEmailActive && !["automation-rules", "policy", "api"].includes(activeTab)
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Ship size={13} />
              Bookings
              {exceptionsCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {exceptionsCount}
                </span>
              )}
              <ChevronDown size={13} className={cn("transition-transform", bookings.open && "rotate-180")} />
            </button>
            {bookings.open && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl border border-slate-200 bg-white shadow-xl z-[100] overflow-hidden">
                <div className="px-2 py-1.5 space-y-0.5">
                  {/* Demo Scenarios */}
                  <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Demo Scenarios</p>
                  {DEMO_SCENARIOS.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => {
                        onStartDemo?.(scenario.id)
                        bookings.setOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        demoScenario === scenario.id && demoActive
                          ? "bg-blue-50 border border-blue-200 font-semibold text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        scenario.id === "happy-path" ? "bg-green-500" :
                        scenario.id === "rate-mismatch" || scenario.id === "missing-data" ? "bg-amber-500" :
                        "bg-red-500"
                      )} />
                      <span className="text-left leading-tight">{scenario.label}</span>
                    </button>
                  ))}

                </div>
              </div>
            )}
          </div>

          {/* Email dropdown */}
          <div className="relative" ref={email.ref}>
            <button
              onClick={() => { email.setOpen(p => !p); dashboard.setOpen(false); bookings.setOpen(false) }}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                isEmailActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Mail size={13} />
              Email
              <AnimatePresence>
                {unreadInboxCount > 0 && (
                  <motion.span
                    key="inbox-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: badgeBounce ? [1, 1.4, 1] : 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0000B3] text-[9px] font-bold text-white"
                  >
                    {unreadInboxCount}
                  </motion.span>
                )}
              </AnimatePresence>
              <ChevronDown size={13} className={cn("transition-transform", email.open && "rotate-180")} />
            </button>
            {email.open && (
              <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 bg-white shadow-xl z-[100] overflow-hidden">
                <div className="px-2 py-1.5">
                  <button
                    onClick={() => { onTabChange("email-inbox"); email.setOpen(false) }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      activeTab === "email-inbox" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Inbox size={13} className="text-slate-500" />
                      Inbox
                    </div>
                    {unreadInboxCount > 0 && (
                      <span className="rounded-full bg-[#0000B3] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {unreadInboxCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { onTabChange("email-sent"); email.setOpen(false) }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      activeTab === "email-sent" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Send size={13} className="text-slate-500" />
                    Sent
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Standalone nav items */}
          <button
            onClick={() => { onTabChange("automation-rules"); dashboard.setOpen(false); bookings.setOpen(false); email.setOpen(false) }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === "automation-rules" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Settings2 size={13} />
            Rules
          </button>
          <button
            onClick={() => { onTabChange("policy"); dashboard.setOpen(false); bookings.setOpen(false); email.setOpen(false) }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === "policy" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Shield size={13} />
            Policy
          </button>
          <button
            onClick={() => { onTabChange("api"); dashboard.setOpen(false); bookings.setOpen(false); email.setOpen(false) }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === "api" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Code2 size={13} />
            API
          </button>
          <button
            onClick={() => { onTabChange("carriers"); dashboard.setOpen(false); bookings.setOpen(false); email.setOpen(false) }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === "carriers" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Ship size={13} />
            Carriers
          </button>
          <button
            onClick={() => { onTabChange("contracts"); dashboard.setOpen(false); bookings.setOpen(false); email.setOpen(false) }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              activeTab === "contracts" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <FileText size={13} />
            Contracts
          </button>
        </div>

        {/* Right: Persona + AI */}
        <div className="flex items-center gap-2.5">
          {/* Persona indicator */}
          {persona && (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs">
              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white", persona.color)}>
                {persona.initials}
              </div>
              <span className="font-medium text-slate-700">{persona.name}</span>
            </div>
          )}

          {/* AI toggle */}
          <button
            onClick={onAiToggle}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              aiPanelOpen
                ? "bg-[#0000B3] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Sparkles size={14} />
            AI
          </button>
        </div>
      </div>
    </header>
  )
}
