"use client"

import { useState, useEffect, useRef } from "react"
import {
  SHIPMENTS,
  BOOKING_FUNNEL_EXTENDED,
  EXCEPTION_DISTRIBUTION,
  CARRIER_SCORECARDS,
  BOOKING_REQUESTS,
  DEMO_SHIPMENT,
  type Shipment,
} from "@/lib/mock-data"
import { ShipmentTable } from "./shipment-table"
import { ShipmentDrawer } from "./shipment-drawer"

// Legacy view type — kept for compatibility with internal navigation handlers
type SidebarView = string
import { motion } from "framer-motion"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import {
  Brain, ArrowRight, AlertTriangle, CheckCircle2, Clock, Activity,
  ExternalLink, TrendingUp, Lightbulb, Flame, MapPin, Zap, Ship,
  Sparkles, FileCheck, ClipboardList, TrendingDown, Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { type SentEmailItem } from "./email-sent-page"
import { CompletionModal } from "./demo-modal"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from "recharts"

interface DashboardProps {
  searchQuery: string
  onViewChange?: (view: SidebarView, opts?: { sapOrderId?: string; emailId?: string }) => void
  onOpenWeather?: (shipmentId: string) => void
  onSendNotification?: (email: SentEmailItem) => void
  autoOpenShipmentId?: string
  onEtaApproved?: () => void
  etaUpdatedCount?: number
  // Demo mode props
  demoActive?: boolean
  demoShipmentVisible?: boolean
  demoStep?: number
  demoPaused?: boolean
  demoScenario?: string
  demoExceptionActive?: boolean
  onDemoStepAdvance?: (step: number) => void
  onDemoPause?: () => void
  onDemoResume?: () => void
  onDemoExceptionResolved?: () => void
  onDemoExceptionTriggered?: () => void
  onDemoShipmentDismiss?: () => void
  onDemoComplete?: (elapsedTime: string) => void
  onAddInboxEmail?: (email: { id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }) => void
  demoReturnedFromInbox?: boolean
  onDemoReturnedFromInboxConsumed?: () => void
  showCompletionModal?: boolean
  onCloseCompletionModal?: () => void
  demoElapsedTime?: string
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  )
}

// ── Rate analysis data derived from CARRIER_SCORECARDS ──────────────────────
const rateVariance = CARRIER_SCORECARDS.map((c) => {
  const contractMin = parseInt(c.contractRate.replace(/[^0-9]/g, "").slice(0, 4))
  const spotMin = parseInt(c.spotRate.replace(/[^0-9]/g, "").slice(0, 4))
  return {
    carrier: c.carrier.split(" ")[0],
    contract: contractMin,
    spot: spotMin,
  }
})

// ── Portal health status colors ─────────────────────────────────────────────
const PORTAL_DOT: Record<string, string> = {
  Online: "bg-green-500",
  Degraded: "bg-amber-500 animate-pulse",
  Offline: "bg-red-500",
}

const SEV_BADGE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-amber-100 text-amber-700 border-amber-200",
  Medium: "bg-blue-100 text-blue-700 border-blue-200",
  Low: "bg-gray-100 text-gray-600 border-gray-200",
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard({ searchQuery, onViewChange, onOpenWeather, onSendNotification, autoOpenShipmentId, onEtaApproved, etaUpdatedCount, demoActive, demoShipmentVisible, demoStep, demoPaused, demoScenario, demoExceptionActive, onDemoStepAdvance, onDemoPause, onDemoResume, onDemoExceptionResolved, onDemoExceptionTriggered, onDemoShipmentDismiss, onDemoComplete, onAddInboxEmail, demoReturnedFromInbox, onDemoReturnedFromInboxConsumed, showCompletionModal, onCloseCompletionModal, demoElapsedTime }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [bookingMode, setBookingMode] = useState(false)
  const [analysisThinking, setAnalysisThinking] = useState(true)
  const prevAutoOpen = useRef<string | undefined>(undefined)

  useEffect(() => {
    const t = setTimeout(() => setAnalysisThinking(false), 1800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (autoOpenShipmentId && autoOpenShipmentId !== prevAutoOpen.current) {
      prevAutoOpen.current = autoOpenShipmentId
      const s = SHIPMENTS.find((sh) => sh.id === autoOpenShipmentId)
      if (s) setSelectedShipment(s)
    }
  }, [autoOpenShipmentId])

  // Auto-restore booking drawer when returning to dashboard during active demo
  useEffect(() => {
    if (demoActive && (demoStep ?? 0) > 0 && !bookingMode) {
      setSelectedShipment(DEMO_SHIPMENT)
      setBookingMode(true)
    }
  }, [demoActive, demoStep, demoReturnedFromInbox])

  // Adjust data when demo completes
  const demoCompleted = showCompletionModal || false
  const exceptionsCount = BOOKING_REQUESTS.filter((b) => b.bookingStatus === "Exception" || b.bookingStatus === "Awaiting Approval").length
  const completedZeroTouch = BOOKING_REQUESTS.filter((b) => b.bookingStatus === "Confirmed" || b.bookingStatus === "Notified" || b.bookingStatus === "Docs Uploaded").length + (etaUpdatedCount ?? 0) + (demoCompleted ? 1 : 0)
  const zeroTouchRate = BOOKING_REQUESTS.length > 0
    ? Math.round((completedZeroTouch / (BOOKING_REQUESTS.length + (demoCompleted ? 1 : 0))) * 100)
    : 0

  // Dynamic chart data — reflects completed demo booking
  const funnelData = demoCompleted
    ? BOOKING_FUNNEL_EXTENDED.map((s) => s.stage === "Confirmed" ? { ...s, count: s.count + 1 } : s.stage === "SAP Ingested" || s.stage === "Validated" || s.stage === "Carrier Selected" || s.stage === "Submitted" ? { ...s, count: s.count + 1 } : s)
    : BOOKING_FUNNEL_EXTENDED
  const exceptionData = demoCompleted && demoScenario && demoScenario !== "happy-path"
    ? EXCEPTION_DISTRIBUTION.map((e) => {
        const scenarioMap: Record<string, string> = { "missing-data": "Missing Booking Fields", "no-capacity": "Missing Allocation", "portal-failure": "Portal Unavailable", "rate-mismatch": "Rate Mismatch", "carrier-rejection": "Carrier Rejection" }
        return e.type === scenarioMap[demoScenario ?? ""] ? { ...e, count: e.count + 1 } : e
      })
    : EXCEPTION_DISTRIBUTION

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div
        className="p-5 space-y-4 max-w-[1600px] mx-auto"
      >

        {/* ── Demo: New Shipment Notification Banner ────────────────────── */}
        {demoActive && demoShipmentVisible && !bookingMode && (
          <div className="animate-in slide-in-from-top-2 duration-500 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-lg overflow-hidden shadow-sm">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-blue-500 border-2 border-white" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[13px] font-bold text-gray-900">New Shipment Detected</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">SAP TM</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">OTM</span>
                  <span className="text-[10px] text-gray-400 ml-auto">Just now</span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-gray-600">
                  <span className="flex items-center gap-1"><Ship size={12} className="text-blue-500" /> Ocean</span>
                  <span className="font-medium text-gray-800">SHA → LAX</span>
                  <span>2×40' HC</span>
                  <span className="text-gray-400">|</span>
                  <span>Suzhou Plant</span>
                  <span className="text-gray-400">|</span>
                  <span>SAP-TM-87234</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedShipment(DEMO_SHIPMENT)
                  setBookingMode(true)
                  onDemoShipmentDismiss?.()
                }}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-sm"
              >
                View & Book
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── 1. AI Hero Card (PO Orchestrator style) ────────────────── */}
        <AiHeroCard analysisThinking={analysisThinking} bookingsCount={BOOKING_REQUESTS.length} exceptionsCount={exceptionsCount} zeroTouchRate={zeroTouchRate} />

        {/* ── 2. KPI Row (5-col, PO Orchestrator pattern) ──────────────── */}
        <KpiRow bookingsCount={BOOKING_REQUESTS.length} exceptionsCount={exceptionsCount} zeroTouchRate={zeroTouchRate} />

        {/* ── 3. Charts Row: Funnel + Exception Donut + Rate Variance ── */}
        <motion.div
          className="grid grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
        >

          {/* Agent Workflow Funnel */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
              <Brain size={13} className={`text-indigo-600 shrink-0 ${analysisThinking ? "animate-pulse" : ""}`} />
              <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider whitespace-nowrap">Workflow Funnel</span>
            </div>
            {analysisThinking ? (
              <div className="flex items-center gap-1.5 px-4 py-6">
                <span className="text-xs text-indigo-600 font-medium">Analyzing pipeline</span>
                <ThinkingDots />
              </div>
            ) : (
              <div className="px-3 pt-2 pb-1">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={funnelData}
                    margin={{ top: 6, right: 8, bottom: 28, left: 0 }}
                    barCategoryGap="25%"
                  >
                    <XAxis
                      dataKey="stage"
                      tick={{ fontSize: 9, fill: "#6B7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const map: Record<string, string> = {
                          "SAP Ingested": "Ingested",
                          "Validated": "Validated",
                          "Carrier Selected": "Carrier Sel.",
                          "Portal Login": "Portal Login",
                          "Submitted": "Submitted",
                          "Confirmed": "Confirmed",
                          "Exception": "Exception",
                        }
                        return map[v] ?? v
                      }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 9, fill: "#9CA3AF" }} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
                    <RechartsTooltip
                      cursor={{ fill: "#f3f4f6" }}
                      formatter={(v: number, _: string, props: { payload?: { stage?: string } }) => [`${v} bookings`, props?.payload?.stage ?? ""]}
                      contentStyle={{ fontSize: 11, padding: "4px 10px" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* Exception Distribution Donut */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors flex flex-col"
            onClick={() => onViewChange?.("exceptions")}
            title="Click to open Exception Workbench"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
              <AlertTriangle size={13} className="text-red-600 shrink-0" />
              <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider whitespace-nowrap">Exception Distribution</span>
              <span className="ml-auto rounded-full bg-red-100 border border-red-200 px-1.5 py-0.5 text-[9px] font-bold text-red-700">{exceptionData.reduce((sum, e) => sum + e.count, 0)}</span>
            </div>
            <div className="flex items-center gap-3 p-3 flex-1">
              {/* Donut */}
              <div className="w-[100px] shrink-0" style={{ height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exceptionData.filter((e) => e.count > 0)}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {exceptionData.filter((e) => e.count > 0).map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex-1 space-y-1.5">
                {exceptionData.filter((e) => e.count > 0).map((e) => (
                  <div key={e.type} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                      <span className="text-slate-600 truncate">{e.type}</span>
                    </div>
                    <span className="font-bold text-slate-800 shrink-0 ml-2 tabular-nums">{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Contract vs Spot Rate Variance */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className="bg-white rounded-lg border border-gray-200 p-3"
          >
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 whitespace-nowrap">Rate Variance ($)</h3>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={rateVariance} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="carrier" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <RechartsTooltip
                  cursor={{ fill: "#f3f4f6" }}
                  formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n === "contract" ? "Contract" : "Spot"]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="contract" radius={[4, 4, 0, 0]} fill="#3b82f6" name="contract" maxBarSize={16} />
                <Bar dataKey="spot" radius={[4, 4, 0, 0]} fill="#f59e0b" name="spot" maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500 inline-block" /> Contract</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> Spot</span>
            </div>
          </motion.div>
        </motion.div>

        {/* ── 4. Separator ──────────────────────────────────────────── */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </div>

        {/* ── 5. Booking Queue Table (full-width) ──────────────────────── */}
        <ShipmentTable
          searchQuery={searchQuery}
          activeFilter={activeFilter}
          onSelectShipment={setSelectedShipment}
          selectedId={selectedShipment?.id ?? null}
        />
      </div>

      {/* Detail Drawer */}
      {selectedShipment && (
        <ShipmentDrawer
          shipment={selectedShipment}
          onClose={() => { setSelectedShipment(null); setBookingMode(false); if (demoActive) onDemoStepAdvance?.(0) }}
          onOpenWeather={onOpenWeather}
          onSendNotification={onSendNotification}
          onEtaApproved={onEtaApproved}
          bookingMode={bookingMode}
          demoStep={demoStep}
          demoPaused={demoPaused}
          demoScenario={demoScenario}
          demoExceptionActive={demoExceptionActive}
          onDemoStepAdvance={onDemoStepAdvance}
          onDemoPause={onDemoPause}
          onDemoResume={onDemoResume}
          onDemoExceptionResolved={onDemoExceptionResolved}
          onDemoExceptionTriggered={onDemoExceptionTriggered}
          onDemoComplete={onDemoComplete}
          onAddInboxEmail={onAddInboxEmail}
          demoReturnedFromInbox={demoReturnedFromInbox}
          onDemoReturnedFromInboxConsumed={onDemoReturnedFromInboxConsumed}
          onNavigateView={(v) => {
            if (v === "sap-tm") {
              onViewChange?.("sap-tm" as any, { sapOrderId: "SAP-TM-87234" } as any)
            } else if (v === "email-sent") {
              onViewChange?.("email-sent" as any, { emailId: "latest" } as any)
            } else {
              onViewChange?.(v as any)
            }
          }}
        />
      )}

      {/* Completion Modal */}
      <CompletionModal
        open={showCompletionModal ?? false}
        onClose={onCloseCompletionModal ?? (() => {})}
        elapsedTime={demoElapsedTime ?? "0s"}
      />
    </div>
  )
}

// ── AI Hero Card (PO Orchestrator pattern) ──────────────────────────────────

function TypewriterText({ text, delayMs = 0 }: { text: string; delayMs?: number }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [thinking, setThinking] = useState(true)
  const words = text.split(" ")

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setThinking(false)
      let i = 0
      const interval = setInterval(() => {
        i += 1
        setVisibleCount(i)
        if (i >= words.length) clearInterval(interval)
      }, 38)
      return () => clearInterval(interval)
    }, delayMs + 600)
    return () => clearTimeout(startTimer)
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps

  if (thinking) {
    return (
      <div className="mt-1 flex items-center gap-1.5 h-5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-slate-500"
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
    )
  }

  return (
    <p className="mt-1 text-sm leading-relaxed text-slate-300">
      {words.slice(0, visibleCount).join(" ")}
      {visibleCount < words.length && (
        <motion.span
          className="inline-block w-0.5 h-3.5 bg-blue-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </p>
  )
}

function AiHeroCard({ analysisThinking, bookingsCount, exceptionsCount, zeroTouchRate }: {
  analysisThinking: boolean; bookingsCount: number; exceptionsCount: number; zeroTouchRate: number
}) {
  const summary = `${bookingsCount} active bookings across 7 carriers — ${exceptionsCount} exceptions requiring attention. Zero-touch rate at ${zeroTouchRate}%, trending up 3.2% this month. Rate variance detected on SHA→LAX lane — spot rates 12% above contract.`

  const chips = [
    ...(exceptionsCount > 0 ? [{ label: `${exceptionsCount} Exceptions Open`, type: "critical" as const }] : []),
    { label: "Rate Variance Detected", type: "warning" as const },
    { label: `${zeroTouchRate}% Zero-Touch`, type: "positive" as const },
  ]

  const chipColors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-300 ring-red-400/20",
    warning: "bg-amber-500/20 text-amber-300 ring-amber-400/20",
    positive: "bg-green-500/20 text-green-300 ring-green-400/20",
  }

  return (
    <div className="rounded-xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-4 py-3 shadow-lg ring-1 ring-white/5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0000B3]/30 ring-1 ring-blue-400/20">
          <Sparkles size={16} className="text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">AI Booking Intelligence</h3>
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-blue-400/20">
              AI-Powered
            </span>
            <span className="ml-auto text-[11px] text-slate-500">Updated 2m ago</span>
          </div>
          {analysisThinking ? (
            <div className="mt-1 flex items-center gap-1.5 h-5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-slate-500"
                  animate={{ opacity: [0.3, 0.9, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                />
              ))}
            </div>
          ) : (
            <TypewriterText text={summary} delayMs={0} />
          )}
          <motion.div
            className="mt-2.5 flex flex-wrap gap-1.5"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          >
            {chips.map((chip) => (
              <motion.span
                key={chip.label}
                variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium ring-1",
                  chipColors[chip.type]
                )}
              >
                {chip.label}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// ── KPI Row (5-col, PO Orchestrator pattern) ────────────────────────────────

// KPI tooltip definitions
const kpiTooltips = {
  activeBookings: {
    title: "Active Bookings",
    description: "Shipment bookings currently in the agent pipeline across all workflow stages.",
    baseline: "Daily avg: 12 bookings",
  },
  autoBooked: {
    title: "Auto-Booked",
    description: "Bookings completed end-to-end by AI agents without manual intervention.",
    baseline: "Target: 800/month",
  },
  avgBookingTime: {
    title: "Avg Booking Time",
    description: "Average time from SAP ingestion to booking confirmed, measured across all completed bookings.",
    baseline: "Manual baseline: 16 min",
  },
  zeroTouchRate: {
    title: "Zero-Touch Rate",
    description: "Percentage of bookings completed end-to-end without any human intervention — no exceptions, no holds.",
    baseline: "Industry avg: ~35%",
  },
  exceptionRate: {
    title: "Exception Rate",
    description: "Percentage of bookings that triggered an exception — portal failure, rate mismatch, missing data, or carrier rejection.",
    baseline: "Target: below 15%",
  },
}

function KpiTooltip({ tip }: { tip: { title: string; description: string; baseline: string } }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="ml-1 inline-flex items-center text-slate-300 hover:text-slate-500 transition-colors">
          <Info size={10} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-[220px] bg-slate-900 text-white rounded-lg px-3 py-2.5 shadow-xl border-0"
      >
        <p className="text-[11px] font-semibold mb-1">{tip.title}</p>
        <p className="text-[10px] text-slate-300 leading-relaxed">{tip.description}</p>
        <div className="mt-1.5 pt-1.5 border-t border-slate-700">
          <p className="text-[10px] text-slate-400">{tip.baseline}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function KpiRow({ bookingsCount, exceptionsCount, zeroTouchRate }: {
  bookingsCount: number; exceptionsCount: number; zeroTouchRate: number
}) {
  const containerV = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
  const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } }

  return (
    <motion.div className="grid grid-cols-5 gap-2" variants={containerV} initial="hidden" animate="show">
      <motion.div variants={itemV} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Active Bookings
              <KpiTooltip tip={kpiTooltips.activeBookings} />
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{bookingsCount}</p>
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-0.5 text-amber-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />{Math.round(bookingsCount * 0.4)} active</span>
              <span className="flex items-center gap-0.5 text-green-600"><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />{Math.round(bookingsCount * 0.45)} done</span>
            </div>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <ClipboardList size={14} className="text-blue-600" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemV} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Auto-Booked
              <KpiTooltip tip={kpiTooltips.autoBooked} />
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{Math.round(bookingsCount * 0.65)}</p>
            <div className="mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-green-600" />
              <span className="text-[10px] font-medium text-green-600">+8 this week</span>
            </div>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <FileCheck size={14} className="text-blue-600" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemV} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Avg Booking Time
              <KpiTooltip tip={kpiTooltips.avgBookingTime} />
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">4.2m</p>
            <div className="mt-1 flex items-center gap-1">
              <TrendingDown size={12} className="text-green-600" />
              <span className="text-[10px] font-medium text-green-600">-12min vs manual</span>
            </div>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Clock size={14} className="text-blue-600" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemV} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Zero-Touch Rate
              <KpiTooltip tip={kpiTooltips.zeroTouchRate} />
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{zeroTouchRate}%</p>
            <div className="mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-green-600" />
              <span className="text-[10px] font-medium text-green-600">+3.2% this month</span>
            </div>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Zap size={14} className="text-blue-600" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemV} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Exception Rate
              <KpiTooltip tip={kpiTooltips.exceptionRate} />
            </p>
            <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{bookingsCount > 0 ? Math.round((exceptionsCount / bookingsCount) * 100) : 0}%</p>
            <div className="mt-1 flex items-center gap-1">
              <TrendingDown size={12} className="text-green-600" />
              <span className="text-[10px] font-medium text-green-600">-1.4% this week</span>
            </div>
          </div>
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <AlertTriangle size={14} className="text-blue-600" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
