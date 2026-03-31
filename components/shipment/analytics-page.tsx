"use client"

import { useState, useEffect } from "react"
import {
  BOOKING_REQUESTS,
  LANE_PERFORMANCE,
  CARRIER_SCORECARDS,
  EXCEPTION_TREND,
  AGENT_HANDLING,
  EXCEPTION_SLA,
} from "@/lib/mock-data"
import { AgentActivityLog } from "./agent-activity-log"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ReferenceLine,
} from "recharts"
import { TrendingUp, Clock, CheckCircle2, BarChart2, Brain, Route, Wrench, AlertTriangle, Users, RefreshCw } from "lucide-react"

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

// ── Derived data ──────────────────────────────────────────────────────────────

const zeroTouchByLane = LANE_PERFORMANCE.map((l) => ({
  lane: l.lane,
  rate: l.zeroTouchRate,
})).sort((a, b) => b.rate - a.rate)

const rateAnalysis = CARRIER_SCORECARDS.map((c) => {
  const contractMin = parseInt(c.contractRate.replace(/[^0-9]/g, "").slice(0, 4))
  const spotMin = parseInt(c.spotRate.replace(/[^0-9]/g, "").slice(0, 4))
  return {
    carrier: c.carrier.split(" ")[0],
    contract: contractMin,
    spot: spotMin,
  }
})

const agentHandlingTotal = AGENT_HANDLING.reduce((s, d) => s + d.value, 0)

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyticsPage({ etaUpdatedCount = 3 }: { etaUpdatedCount?: number }) {
  const [insightThinking, setInsightThinking] = useState(true)
  const bookingsCompletedCount = etaUpdatedCount

  useEffect(() => {
    const t = setTimeout(() => setInsightThinking(false), 1500)
    return () => clearTimeout(t)
  }, [])

  if (insightThinking) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0000B3]/10">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw size={20} className="text-[#0000B3]" />
            </motion.div>
          </div>
          <p className="text-sm font-medium text-slate-600">Loading analytics</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-[#0000B3]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <motion.div className="p-6 max-w-[1400px] mx-auto space-y-5" variants={stagger} initial="hidden" animate="show">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/10 flex items-center justify-center">
            <BarChart2 size={18} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
            <p className="text-xs text-gray-400">Exception handling & agent performance &middot; March 2025 &middot; {BOOKING_REQUESTS.length} active bookings</p>
          </div>
        </motion.div>

        {/* KPI strip */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-3">
          {[
            { label: "Bookings Completed (24h)", value: `${bookingsCompletedCount}`, icon: <CheckCircle2 size={16} />, color: "text-green-600" },
            { label: "Avg Resolution Time", value: "2.4h", icon: <Clock size={16} />, color: "text-blue-600" },
            { label: "Zero-Touch Rate", value: "84%", icon: <TrendingUp size={16} />, color: "text-indigo-600" },
            { label: "Manual Interventions", value: "2", icon: <Wrench size={16} />, color: "text-amber-600" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("shrink-0", k.color)}>{k.icon}</span>
                <span className="text-[11px] text-gray-400 font-medium">{k.label}</span>
              </div>
              <div className={cn("text-2xl font-bold", k.color)}>{k.value}</div>
            </div>
          ))}
        </motion.div>

        {/* ── New Exception-Focused Charts (3-col) ──────────────────────── */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">

          {/* Exception Resolution Trend — line chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={13} className="text-red-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exception Resolution Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={EXCEPTION_TREND} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="raised" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Raised" />
                <Line type="monotone" dataKey="resolved" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-red-500 inline-block rounded" /> Raised</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-green-500 inline-block rounded" /> Resolved</span>
            </div>
          </div>

          {/* Agent vs Human Handling — donut chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={13} className="text-indigo-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent vs Human Handling</h3>
            </div>
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={AGENT_HANDLING}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {AGENT_HANDLING.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800">{agentHandlingTotal}</div>
                  <div className="text-[9px] text-gray-400">bookings</div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mt-1">
              {AGENT_HANDLING.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Exception SLA Compliance — horizontal bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={13} className="text-green-500" />
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exception SLA Compliance</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={EXCEPTION_SLA} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="type"
                  width={95}
                  tick={{ fontSize: 9, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => {
                    const map: Record<string, string> = {
                      "Missing Allocation": "Missing Alloc.",
                      "Portal Unavailable": "Portal Unavail.",
                      "Rate Mismatch": "Rate Mismatch",
                      "Carrier Rejection": "Carrier Rej.",
                      "Missing Booking Fields": "Missing Fields",
                    }
                    return map[v] ?? v
                  }}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(v: number) => [`${v}%`, "SLA"]}
                />
                <ReferenceLine x={90} stroke="#EF4444" strokeDasharray="4 4" label={{ value: "90% target", fontSize: 9, fill: "#EF4444", position: "top" }} />
                <Bar dataKey="sla" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {EXCEPTION_SLA.map((e, i) => (
                    <Cell key={i} fill={e.sla >= e.target ? "#22C55E" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> Meets SLA</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Below SLA</span>
            </div>
          </div>
        </motion.div>

        {/* Zero-Touch Rate by Lane — bar chart */}
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Zero-Touch Rate by Lane (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zeroTouchByLane} margin={{ left: 0, right: 20 }}>
              <XAxis dataKey="lane" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f3f4f6" }} formatter={(v: number) => [`${v}%`, "Zero-Touch Rate"]} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {zeroTouchByLane.map((l, i) => (
                  <Cell key={i} fill={l.rate >= 85 ? "#22c55e" : l.rate >= 70 ? "#f59e0b" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Rate Analysis: Contract vs Spot by Carrier */}
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Rate Analysis: Contract vs Spot by Carrier ($)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rateAnalysis} margin={{ left: 0, right: 20 }}>
              <XAxis dataKey="carrier" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "#f3f4f6" }} formatter={(v: number, n: string) => [`$${v.toLocaleString()}`, n === "contract" ? "Contract" : "Spot"]} />
              <Bar dataKey="contract" radius={[4, 4, 0, 0]} fill="#3b82f6" name="contract" maxBarSize={24} />
              <Bar dataKey="spot" radius={[4, 4, 0, 0]} fill="#f59e0b" name="spot" maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Contract Rate</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Spot Rate</span>
          </div>
        </motion.div>

        {/* Lane Performance Table */}
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Route size={14} className="text-indigo-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lane Performance</h3>
            <span className="ml-auto text-[10px] text-gray-400">{LANE_PERFORMANCE.length} active lanes</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Lane", "Mode", "Bookings/Mo", "Avg Turnaround", "Zero-Touch %", "Preferred Carrier", "Contract Rate"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...LANE_PERFORMANCE].sort((a, b) => b.zeroTouchRate - a.zeroTouchRate).map((l, i) => (
                <tr key={l.lane} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-700">{l.lane}</td>
                  <td className="px-3 py-2 text-gray-500">{l.mode}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{l.bookingsPerMonth}</td>
                  <td className="px-3 py-2 text-gray-600">{l.avgTurnaroundHrs}h</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", l.zeroTouchRate >= 85 ? "bg-green-500" : l.zeroTouchRate >= 70 ? "bg-amber-400" : "bg-red-500")}
                          style={{ width: `${l.zeroTouchRate}%` }}
                        />
                      </div>
                      <span className={cn("font-semibold", l.zeroTouchRate >= 85 ? "text-green-700" : l.zeroTouchRate >= 70 ? "text-amber-700" : "text-red-700")}>
                        {l.zeroTouchRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{l.preferredCarrier}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{l.contractRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* Agent Automation Summary */}
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={14} className="text-indigo-600" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent Automation Summary</h3>
            <span className="ml-auto text-[10px] text-gray-400">Rolling 7 days</span>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "Auto-Bookings", value: "3", sub: "end-to-end autonomous", color: "text-green-600", bg: "bg-green-50 border-green-100" },
              { label: "Portal Logins", value: "5", sub: "RPA + API authenticated", color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
              { label: "Docs Uploaded", value: "12", sub: "SLIs, packing lists, rate sheets", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
              { label: "Time Saved", value: "~4.2 hrs", sub: "vs. manual booking workflow", color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
            ].map((m) => (
              <div key={m.label} className={cn("rounded-lg border px-3 py-3", m.bg)}>
                <div className={cn("text-xl font-bold mb-0.5", m.color)}>{m.value}</div>
                <div className="text-[11px] font-medium text-gray-700 leading-tight">{m.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <Brain size={11} className={`text-indigo-500 mt-0.5 shrink-0 ${insightThinking ? "animate-pulse" : ""}`} />
            {insightThinking ? (
              <div className="flex items-center gap-1.5 py-0.5">
                <span className="text-[11px] text-indigo-600 font-medium">Computing automation metrics</span>
                <span className="inline-flex items-end gap-[3px] ml-0.5">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }} />
                  ))}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Agent completed <strong>3 bookings</strong> autonomously in the last 24 hours with an average turnaround of 28 minutes.
                Zero-touch rate of <strong>84%</strong> across all lanes. Only 2 bookings required manual intervention (carrier override approval and spot rate approval).
                Estimated <strong>~4.2 hours of coordinator time saved</strong> based on manual baseline (5.6h) vs. agent-assisted (1.4h).
              </p>
            )}
          </div>
        </motion.div>

        {/* Recent agent activity */}
        <motion.div variants={fadeUp}>
          <AgentActivityLog condensed maxItems={5} />
        </motion.div>
      </motion.div>
    </div>
  )
}
