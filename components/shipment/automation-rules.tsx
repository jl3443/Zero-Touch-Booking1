"use client"

import { useState, useEffect } from "react"
import {
  CARRIER_SELECTION_WEIGHTS,
  AUTO_APPROVAL_THRESHOLDS,
  LANE_PREFERENCES,
  ESCALATION_RULES,
  BOOKING_REQUESTS,
  HARD_CONSTRAINTS,
  AI_POLICY_RECOMMENDATIONS,
  CONTRACT_COMPLIANCE_RULES,
  SLA_RULES,
} from "@/lib/mock-data"
import { SeverityBadge, ModeIcon } from "./shared"
import {
  Settings2, Sliders, Shield, Scale, AlertTriangle,
  ChevronDown, ChevronRight, CheckCircle2, XCircle,
  Loader2, Zap, Activity, Package, Calendar, DollarSign,
  Clock, Ban, Brain, TrendingUp, ArrowRight, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Thinking Dots ────────────────────────────────────────────────────────────

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

// ── Weight Bar ───────────────────────────────────────────────────────────────

function WeightBar({ weight, color }: { weight: number; color: string }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${weight}%` }}
        />
      </div>
      <span className="text-sm font-bold text-gray-700 min-w-[3rem] text-right">{weight}%</span>
    </div>
  )
}

// ── Toggle Switch (visual only) ──────────────────────────────────────────────

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={enabled}
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onToggle() }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onToggle() } }}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        enabled ? "bg-indigo-600" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-4" : "translate-x-0"
        )}
      />
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function AutomationRulesPage() {
  const [thinking, setThinking] = useState(true)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [weights, setWeights] = useState(CARRIER_SELECTION_WEIGHTS.map((w) => ({ ...w })))
  const [thresholds, setThresholds] = useState(AUTO_APPROVAL_THRESHOLDS.map((t) => ({ ...t })))
  const [escalations, setEscalations] = useState(ESCALATION_RULES.map((r) => ({ ...r })))
  const [constraints, setConstraints] = useState(HARD_CONSTRAINTS.map((c) => ({ ...c })))
  const [recommendations, setRecommendations] = useState(AI_POLICY_RECOMMENDATIONS.map((r) => ({ ...r })))
  const [slaRules, setSlaRules] = useState(SLA_RULES.map((r) => ({ ...r })))
  const [selectedOrder, setSelectedOrder] = useState<string>("all")
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1800)
    return () => clearTimeout(t)
  }, [])

  const toggleThreshold = (idx: number) => {
    setThresholds((prev) => prev.map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t))
  }

  const updateThreshold = (idx: number, value: string) => {
    setThresholds((prev) => prev.map((t, i) => i === idx ? { ...t, threshold: value } : t))
  }

  const toggleSla = (idx: number) => {
    setSlaRules((prev) => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r))
  }

  const updateSlaTarget = (idx: number, value: string) => {
    setSlaRules((prev) => prev.map((r, i) => i === idx ? { ...r, target: value } : r))
  }

  const toggleEscalation = (id: string) => {
    setEscalations((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const toggleConstraint = (id: string) => {
    setConstraints((prev) => prev.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c))
  }

  const updateConstraintValue = (id: string, value: string | number) => {
    setConstraints((prev) => prev.map((c) => c.id === id ? { ...c, value } : c))
  }

  const acceptRecommendation = (id: string) => {
    setRecommendations((prev) => prev.map((r) => r.id === id ? { ...r, status: "accepted" as const } : r))
  }

  const dismissRecommendation = (id: string) => {
    setRecommendations((prev) => prev.map((r) => r.id === id ? { ...r, status: "dismissed" as const } : r))
  }

  const CONSTRAINT_ICONS: Record<string, React.ReactNode> = {
    calendar: <Calendar size={14} className="text-blue-600" />,
    dollar: <DollarSign size={14} className="text-emerald-600" />,
    shield: <Shield size={14} className="text-indigo-600" />,
    clock: <Clock size={14} className="text-amber-600" />,
    ban: <Ban size={14} className="text-red-600" />,
  }

  const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    rate: { bg: "bg-emerald-50", text: "text-emerald-700", icon: <DollarSign size={12} /> },
    carrier: { bg: "bg-blue-50", text: "text-blue-700", icon: <Package size={12} /> },
    transit: { bg: "bg-amber-50", text: "text-amber-700", icon: <Clock size={12} /> },
    compliance: { bg: "bg-red-50", text: "text-red-700", icon: <Shield size={12} /> },
  }

  // Map escalation rules to exception types for cross-referencing
  const RULE_EXCEPTION_MAP: Record<string, string> = {
    "ESC-01": "Rate Mismatch",
    "ESC-02": "Carrier Rejection",
    "ESC-03": "Missing Booking Fields",
    "ESC-04": "Portal Unavailable",
    "ESC-05": "Missing Allocation",
    "ESC-06": "None", // timeout - no specific exception type
    "ESC-07": "Credentials Expired",
  }

  const getLinkedBookings = (ruleId: string) => {
    const exType = RULE_EXCEPTION_MAP[ruleId]
    if (!exType || exType === "None") return []
    return BOOKING_REQUESTS.filter((b) => b.exceptionType === exType)
  }

  const weightColors = ["bg-indigo-500", "bg-blue-500", "bg-cyan-500", "bg-teal-500"]

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1400px] mx-auto space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Settings2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Automation Rules</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Agent decision-making configuration — carrier selection, approval thresholds, and escalation policies
            </p>
          </div>
        </div>

        {thinking ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm font-medium">Loading agent rules</span>
              <ThinkingDots />
            </div>
            <p className="text-xs text-gray-400">Reading active automation configuration</p>
          </div>
        ) : (
          <>
            {/* ── Section 1: Carrier Selection Weights ───────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Sliders size={14} className="text-indigo-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Carrier Selection Weights</span>
                <span className={cn("ml-auto text-[10px] font-medium", weights.reduce((s, w) => s + w.weight, 0) === 100 ? "text-gray-400" : "text-red-500")}>
                  Total: {weights.reduce((s, w) => s + w.weight, 0)}%
                </span>
              </div>
              <div className="p-4 space-y-4">
                {weights.map((w, i) => (
                  <div key={w.factor} className="flex items-center gap-4">
                    <div className="w-[180px] shrink-0">
                      <div className="text-xs font-semibold text-gray-700">{w.factor}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{w.description}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={w.weight}
                        onChange={(e) => setWeights((prev) => prev.map((pw, pi) => pi === i ? { ...pw, weight: Number(e.target.value) } : pw))}
                        className="flex-1 h-2 appearance-none bg-gray-100 rounded-full cursor-pointer accent-indigo-600 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={w.weight}
                        onChange={(e) => setWeights((prev) => prev.map((pw, pi) => pi === i ? { ...pw, weight: Number(e.target.value) } : pw))}
                        className="text-sm font-bold text-gray-700 w-14 text-right bg-gray-50 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 2: SLA Targets (replaces Auto-Approval Thresholds) ── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Activity size={14} className="text-green-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">SLA Targets</span>
                <span className="ml-auto text-[10px] text-green-600 font-medium">
                  {slaRules.filter((r) => r.enabled).length}/{slaRules.length} active
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {slaRules.map((rule, idx) => {
                  const meets = rule.direction === "min"
                    ? rule.numericCurrent <= rule.numericTarget
                    : rule.numericCurrent >= rule.numericTarget
                  return (
                    <div key={rule.id} className="flex items-center gap-4 px-4 py-3.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-700 mb-1.5">{rule.name}</div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-400">Threshold:</span>
                            <input
                              type="text"
                              value={rule.target}
                              onChange={(e) => updateSlaTarget(idx, e.target.value)}
                              className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 hover:border-gray-300 transition-colors"
                            />
                          </div>
                          <span className="text-[10px] text-gray-300">|</span>
                          <span className="text-[10px] text-gray-400">Current: <span className={cn("font-semibold", meets ? "text-green-600" : "text-amber-600")}>{rule.currentValue}</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rule.enabled ? (
                          meets ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertTriangle size={12} className="text-amber-500" />
                        ) : (
                          <XCircle size={12} className="text-gray-300" />
                        )}
                        <ToggleSwitch enabled={rule.enabled} onToggle={() => toggleSla(idx)} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Section 3: Lane Preferences ────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Scale size={14} className="text-blue-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Lane Preferences</span>
                <span className="ml-auto text-[10px] text-gray-400">{LANE_PREFERENCES.length} lanes configured</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Lane</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Mode</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Preferred Carrier</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fallback</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Max Rate</th>
                      <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Auto-Approve</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LANE_PREFERENCES.map((lp, i) => (
                      <tr key={lp.lane} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}>
                        <td className="px-4 py-2.5 font-semibold text-gray-800">{lp.lane}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <ModeIcon mode={lp.mode} size={12} />
                            <span className="text-gray-600">{lp.mode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{lp.preferredCarrier}</td>
                        <td className="px-4 py-2.5 text-gray-500">{lp.fallbackCarrier}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">${lp.maxAcceptableRate.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-center">
                          {lp.autoApprove ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">
                              <CheckCircle2 size={9} /> Auto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">
                              <AlertTriangle size={9} /> Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Section 4: Hard Policy Constraints ───────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <AlertTriangle size={14} className="text-red-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Hard Constraints</span>
                <div className="ml-auto flex items-center gap-3">
                  {/* Order selector dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                      <Package size={11} className="text-gray-400" />
                      <span>{selectedOrder === "all" ? "All Orders" : selectedOrder}</span>
                      <ChevronDown size={11} className={cn("text-gray-400 transition-transform", orderDropdownOpen && "rotate-180")} />
                    </button>
                    {orderDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedOrder("all"); setOrderDropdownOpen(false) }}
                          className={cn("w-full text-left px-3 py-2 text-[11px] hover:bg-gray-50 flex items-center gap-2", selectedOrder === "all" && "bg-blue-50 text-blue-700")}
                        >
                          <Package size={11} className="text-gray-400" />
                          <span className="font-semibold">All Orders</span>
                          <span className="ml-auto text-[10px] text-gray-400">{BOOKING_REQUESTS.length}</span>
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        {BOOKING_REQUESTS.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => { setSelectedOrder(b.id); setOrderDropdownOpen(false) }}
                            className={cn("w-full text-left px-3 py-2 text-[11px] hover:bg-gray-50 flex items-center gap-2", selectedOrder === b.id && "bg-blue-50 text-blue-700")}
                          >
                            <span className="font-mono font-bold text-gray-700">{b.id}</span>
                            <span className="text-gray-400">{b.carrier}</span>
                            <span className="text-gray-400">·</span>
                            <span className="text-gray-400">{b.lane}</span>
                            <span className={cn(
                              "ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                              b.bookingStatus === "Exception" ? "bg-red-50 text-red-600" :
                              b.bookingStatus === "Confirmed" ? "bg-green-50 text-green-600" :
                              "bg-amber-50 text-amber-600"
                            )}>
                              {b.bookingStatus}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {constraints.filter((c) => c.enabled).length}/{constraints.length} enforced
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {constraints.map((c) => (
                  <div key={c.id} className="px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                        {CONSTRAINT_ICONS[c.icon]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700">{c.label}</span>
                          <span className="text-[9px] font-mono text-gray-400">{c.id}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">{c.description}</p>
                        <div className="flex items-center gap-2">
                          {c.type === "date" ? (
                            <input
                              type="date"
                              value={String(c.value)}
                              onChange={(e) => updateConstraintValue(c.id, e.target.value)}
                              className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                            />
                          ) : c.type === "currency" ? (
                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5">
                              <span className="text-xs text-gray-400">$</span>
                              <input
                                type="number"
                                value={Number(c.value)}
                                onChange={(e) => updateConstraintValue(c.id, Number(e.target.value))}
                                className="text-xs font-semibold text-gray-700 w-20 focus:outline-none"
                              />
                            </div>
                          ) : c.type === "percent" ? (
                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5">
                              <input
                                type="number"
                                value={Number(c.value)}
                                onChange={(e) => updateConstraintValue(c.id, Number(e.target.value))}
                                className="text-xs font-semibold text-gray-700 w-12 focus:outline-none"
                              />
                              <span className="text-xs text-gray-400">%</span>
                            </div>
                          ) : c.type === "number" ? (
                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-1.5">
                              <input
                                type="number"
                                value={Number(c.value)}
                                onChange={(e) => updateConstraintValue(c.id, Number(e.target.value))}
                                className="text-xs font-semibold text-gray-700 w-12 focus:outline-none"
                              />
                              <span className="text-xs text-gray-400">days</span>
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={String(c.value)}
                              onChange={(e) => updateConstraintValue(c.id, e.target.value)}
                              className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 w-48"
                            />
                          )}
                        </div>
                      </div>
                      <ToggleSwitch enabled={c.enabled} onToggle={() => toggleConstraint(c.id)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 5: Contract Compliance Rules ───────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Shield size={14} className="text-blue-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Contract Compliance</span>
                <span className="ml-auto text-[10px] text-gray-400">{CONTRACT_COMPLIANCE_RULES.filter(r => r.enabled).length} of {CONTRACT_COMPLIANCE_RULES.length} active</span>
              </div>
              <div className="divide-y divide-gray-100">
                {CONTRACT_COMPLIANCE_RULES.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                      rule.category === "selection" ? "bg-blue-100" : rule.category === "volume" ? "bg-amber-100" : rule.category === "expiry" ? "bg-red-100" : "bg-purple-100"
                    )}>
                      {rule.category === "selection" ? <Scale size={13} className="text-blue-600" /> :
                       rule.category === "volume" ? <Package size={13} className="text-amber-600" /> :
                       rule.category === "expiry" ? <Clock size={13} className="text-red-600" /> :
                       <Ban size={13} className="text-purple-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{rule.label}</span>
                        <span className="text-[9px] font-mono text-gray-400">{rule.id}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {rule.triggerCount30d > 0 && (
                        <span className="text-[9px] text-gray-400">{rule.triggerCount30d} triggers/30d</span>
                      )}
                      <button
                        className={cn(
                          "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                          rule.enabled ? "bg-blue-600" : "bg-gray-300"
                        )}
                      >
                        <span className={cn(
                          "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm",
                          rule.enabled ? "translate-x-[18px]" : "translate-x-[3px]"
                        )} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section 6: AI Policy Recommendations ─────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Sparkles size={14} className="text-violet-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">AI Policy Recommendations</span>
                <span className="ml-auto text-[10px] text-violet-600 font-medium">
                  {recommendations.filter((r) => r.status === "pending").length} pending review
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {recommendations.map((rec) => {
                  const cat = CATEGORY_COLORS[rec.category] ?? CATEGORY_COLORS.rate
                  return (
                    <div key={rec.id} className={cn("px-4 py-4", rec.status === "dismissed" && "opacity-50")}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Brain size={14} className="text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800">{rec.title}</span>
                            <span className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5", cat.bg, cat.text)}>
                              {cat.icon} {rec.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{rec.reason}</p>
                          <div className="flex items-center gap-4 mb-2">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp size={11} className="text-emerald-500" />
                              <span className="text-[10px] text-gray-600">{rec.impact}</span>
                            </div>
                          </div>
                          {/* Confidence bar */}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-gray-400">AI Confidence</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                              <div
                                className={cn("h-full rounded-full", rec.confidence >= 90 ? "bg-emerald-500" : rec.confidence >= 80 ? "bg-blue-500" : "bg-amber-500")}
                                style={{ width: `${rec.confidence}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-600">{rec.confidence}%</span>
                          </div>
                          {/* Actions */}
                          {rec.status === "pending" && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => acceptRecommendation(rec.id)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white text-[11px] font-semibold rounded-lg hover:bg-violet-700 transition-colors"
                              >
                                <CheckCircle2 size={11} /> Apply
                              </button>
                              <button
                                onClick={() => dismissRecommendation(rec.id)}
                                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-500 text-[11px] font-medium rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <XCircle size={11} /> Dismiss
                              </button>
                            </div>
                          )}
                          {rec.status === "accepted" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={10} /> Applied
                            </span>
                          )}
                          {rec.status === "dismissed" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
                              <XCircle size={10} /> Dismissed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Section 6: Escalation Rules ─────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Zap size={14} className="text-amber-600" />
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Escalation Rules</span>
                <span className="ml-auto text-[10px] text-gray-400">
                  {escalations.filter((r) => r.enabled).length}/{escalations.length} active
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {escalations.map((rule) => (
                  <div key={rule.id}>
                    <button
                      onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
                    >
                      {expandedRule === rule.id ? (
                        <ChevronDown size={12} className="text-gray-400 shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-gray-400 shrink-0" />
                      )}
                      <span className="text-[10px] font-mono text-gray-400 shrink-0 w-[50px]">{rule.id}</span>
                      <span className="text-xs text-gray-700 flex-1 text-left">{rule.condition}</span>
                      <SeverityBadge severity={rule.severity} />
                      <ToggleSwitch enabled={rule.enabled} onToggle={() => toggleEscalation(rule.id)} />
                    </button>
                    {expandedRule === rule.id && (() => {
                      const linked = getLinkedBookings(rule.id)
                      return (
                      <div className="px-4 pb-3 ml-[62px]">
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-start gap-2">
                            <Activity size={11} className="text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Action</div>
                              <div className="text-xs text-gray-700">{rule.action}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
                            <span className="text-[10px] text-gray-400">
                              Triggered <span className="font-semibold text-gray-600">{rule.triggerCount30d}×</span> in last 30 days
                            </span>
                          </div>
                          {linked.length > 0 && (
                            <div className="pt-1 border-t border-gray-100">
                              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <Package size={9} /> Active Exceptions
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {linked.map((b) => (
                                  <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-semibold">
                                    <AlertTriangle size={8} /> {b.id} · {b.lane}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
