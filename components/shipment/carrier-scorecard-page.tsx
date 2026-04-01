"use client"

import { CARRIER_SCORECARDS, BOOKING_REQUESTS, type CarrierRating, type PerformanceTrend } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend,
} from "recharts"
import { Award, TrendingUp, TrendingDown, Minus, Star, AlertTriangle, CheckCircle2, ShieldAlert, Zap, FileWarning, XCircle } from "lucide-react"

// ── Config ────────────────────────────────────────────────────────────────────

const RATING_CONFIG: Record<CarrierRating, { label: string; color: string; dot: string; icon: React.ReactNode }> = {
  Preferred: { label: "Preferred", color: "text-green-700 bg-green-50 border-green-200", dot: "bg-green-500", icon: <Star size={11} className="fill-green-600 text-green-600" /> },
  Standard:  { label: "Standard",  color: "text-blue-700 bg-blue-50 border-blue-200",    dot: "bg-blue-500",  icon: <CheckCircle2 size={11} className="text-blue-600" /> },
  Monitor:   { label: "Monitor",   color: "text-amber-700 bg-amber-50 border-amber-200",  dot: "bg-amber-500", icon: <AlertTriangle size={11} className="text-amber-600" /> },
}

const TREND_CONFIG: Record<PerformanceTrend, { icon: React.ReactNode; label: string; color: string }> = {
  up:     { icon: <TrendingUp size={12} />,   label: "Up",     color: "text-green-600" },
  stable: { icon: <Minus size={12} />,        label: "Stable", color: "text-gray-500"  },
  down:   { icon: <TrendingDown size={12} />,  label: "Down",   color: "text-red-600"   },
}

// ── Summary stats ─────────────────────────────────────────────────────────────

const avgSuccessRate = Math.round(
  CARRIER_SCORECARDS.reduce((sum, c) => sum + c.bookingSuccessRate, 0) / CARRIER_SCORECARDS.length
)
const avgSLA = Math.round(
  CARRIER_SCORECARDS.reduce((sum, c) => sum + c.slaScore, 0) / CARRIER_SCORECARDS.length
)
const preferred = CARRIER_SCORECARDS.filter((c) => c.rating === "Preferred").length
const monitor   = CARRIER_SCORECARDS.filter((c) => c.rating === "Monitor").length

// Chart: booking success rate by carrier (bar)
const successChartData = [...CARRIER_SCORECARDS]
  .sort((a, b) => b.bookingSuccessRate - a.bookingSuccessRate)
  .map((c) => ({ name: c.carrier.split(" ")[0], rate: c.bookingSuccessRate }))

const SUCCESS_COLORS = [...CARRIER_SCORECARDS]
  .sort((a, b) => b.bookingSuccessRate - a.bookingSuccessRate)
  .map((c) => c.bookingSuccessRate >= 95 ? "#22c55e" : c.bookingSuccessRate >= 90 ? "#3b82f6" : "#f59e0b")

// Chart: OTP history line chart per carrier
const OTP_COLORS_MAP: Record<string, string> = {
  Maersk: "#0ea5e9",
  MSC: "#3b82f6",
  "Hapag-Lloyd": "#f97316",
  "CMA-CGM": "#dc2626",
  "FedEx Freight": "#a855f7",
  "XPO Logistics": "#6366f1",
  "DHL Freight": "#eab308",
}

const otpHistoryData = CARRIER_SCORECARDS[0].otpHistory.map((_, monthIdx) => {
  const entry: Record<string, number | string> = { month: `M${monthIdx + 1}` }
  CARRIER_SCORECARDS.forEach((c) => {
    entry[c.carrier.split(" ")[0]] = c.otpHistory[monthIdx]
  })
  return entry
})

const carrierKeys = CARRIER_SCORECARDS.map((c) => c.carrier.split(" ")[0])

// ── Exception impact by carrier ───────────────────────────────────────────────

const EXCEPTION_TYPE_CONFIG: Record<string, { color: string; icon: React.ReactNode; action: string }> = {
  "Rate Mismatch":          { color: "text-orange-700 bg-orange-50 border-orange-200", icon: <FileWarning size={10} />, action: "Review contract rates — spot exceeds contract threshold" },
  "Carrier Rejection":      { color: "text-red-700 bg-red-50 border-red-200",          icon: <XCircle size={10} />,     action: "Select alternate carrier — vessel fully allocated" },
  "Missing Allocation":     { color: "text-amber-700 bg-amber-50 border-amber-200",    icon: <ShieldAlert size={10} />, action: "Request emergency allocation or reroute" },
  "Portal Unavailable":     { color: "text-purple-700 bg-purple-50 border-purple-200", icon: <Zap size={10} />,         action: "RPA fallback active — monitor resolution" },
  "Credentials Expired":    { color: "text-purple-700 bg-purple-50 border-purple-200", icon: <Zap size={10} />,         action: "Re-authenticate portal credentials immediately" },
  "Missing Booking Fields": { color: "text-blue-700 bg-blue-50 border-blue-200",       icon: <AlertTriangle size={10} />, action: "Complete missing SAP/OTM fields" },
}

const SEV_COLOR: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High:     "bg-amber-100 text-amber-700 border-amber-200",
  Medium:   "bg-blue-100 text-blue-700 border-blue-200",
  Low:      "bg-gray-100 text-gray-500 border-gray-200",
}

const exceptionBookings = BOOKING_REQUESTS.filter((b) => b.exceptionType !== "None")

const carrierExceptionImpact = CARRIER_SCORECARDS.map((c) => {
  const exceptions = exceptionBookings.filter((b) => b.carrier === c.carrier)
  const types = [...new Set(exceptions.map((e) => e.exceptionType))]
  const worstSev = exceptions.some((e) => e.severity === "Critical") ? "Critical"
    : exceptions.some((e) => e.severity === "High") ? "High"
    : exceptions.some((e) => e.severity === "Medium") ? "Medium"
    : exceptions.length > 0 ? "Low" : null
  return { carrier: c.carrier, capacity: c.capacity, rating: c.rating, exceptions, types, worstSev }
}).filter((c) => c.exceptions.length > 0)

// ── Component ─────────────────────────────────────────────────────────────────

export function CarrierScorecardPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F8F9FA]">
      <div className="p-6 max-w-[1200px] mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <Award size={16} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Carrier Scorecards</h2>
            <p className="text-xs text-gray-400">Booking success &middot; SLA scores &middot; Rate analysis &middot; {CARRIER_SCORECARDS.length} active carriers</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Avg Booking Success", value: `${avgSuccessRate}%`, sub: "Across all carriers", color: avgSuccessRate >= 90 ? "text-green-600" : "text-amber-600" },
            { label: "Avg SLA Score",       value: `${avgSLA}%`,         sub: "Service level agreement", color: avgSLA >= 90 ? "text-green-600" : "text-amber-600" },
            { label: "Active Carriers",     value: CARRIER_SCORECARDS.length, sub: "Across all modes", color: "text-gray-800" },
            { label: "Preferred / Monitor", value: `${preferred} / ${monitor}`, sub: "Rating distribution", color: "text-gray-800" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-[11px] text-gray-400 font-medium mb-1">{k.label}</p>
              <p className={cn("text-2xl font-bold", k.color)}>{k.value}</p>
              <p className="text-[10px] text-gray-400 mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Success Rate chart + table */}
        <div className="grid grid-cols-3 gap-4">

          {/* Booking Success Rate bar chart */}
          <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Booking Success Rate (%)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={successChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" domain={[80, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  formatter={(v) => [`${v}%`, "Success Rate"]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {successChartData.map((_, i) => <Cell key={i} fill={SUCCESS_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> 95%+</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> 90-94%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> &lt;90%</span>
            </div>
          </div>

          {/* Carrier table */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Carrier", "Modes", "Contract Rate", "Spot Rate", "Avg Transit", "Capacity", "SLA", "Success %", "Lane Cov.", "Trend", "Rating"].map((h) => (
                      <th key={h} className="px-2.5 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...CARRIER_SCORECARDS].sort((a, b) => b.bookingSuccessRate - a.bookingSuccessRate).map((c, i) => {
                    const rating = RATING_CONFIG[c.rating]
                    const trend  = TREND_CONFIG[c.trend]
                    return (
                      <tr key={c.carrier} className={cn("border-b border-gray-50", i % 2 === 0 ? "bg-white" : "bg-gray-50/30")}>
                        <td className="px-2.5 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{c.carrier}</td>
                        <td className="px-2.5 py-2.5 text-gray-500">{c.modes.join(", ")}</td>
                        <td className="px-2.5 py-2.5 font-mono text-gray-600 whitespace-nowrap">{c.contractRate}</td>
                        <td className="px-2.5 py-2.5 font-mono text-gray-600 whitespace-nowrap">{c.spotRate}</td>
                        <td className="px-2.5 py-2.5 text-gray-600">{c.avgTransitDays}d</td>
                        <td className="px-2.5 py-2.5">
                          <span className={cn(
                            "text-[10px] font-semibold rounded-full px-2 py-0.5",
                            c.capacity === "Available" ? "bg-green-50 text-green-700" :
                            c.capacity === "Limited" ? "bg-amber-50 text-amber-700" :
                            "bg-red-50 text-red-700"
                          )}>
                            {c.capacity}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <span className={cn("font-semibold", c.slaScore >= 92 ? "text-green-700" : c.slaScore >= 88 ? "text-blue-700" : "text-amber-700")}>
                            {c.slaScore}%
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", c.bookingSuccessRate >= 95 ? "bg-green-500" : c.bookingSuccessRate >= 90 ? "bg-blue-400" : "bg-amber-400")}
                                style={{ width: `${c.bookingSuccessRate}%` }}
                              />
                            </div>
                            <span className={cn("font-semibold", c.bookingSuccessRate >= 95 ? "text-green-700" : c.bookingSuccessRate >= 90 ? "text-blue-700" : "text-amber-700")}>
                              {c.bookingSuccessRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-2.5 py-2.5 text-gray-600">{c.laneCoverage}%</td>
                        <td className="px-2.5 py-2.5">
                          <span className={cn("flex items-center gap-1", trend.color)}>
                            {trend.icon}
                            {trend.label}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5", rating.color)}>
                            {rating.icon} {rating.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* OTP History line chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Booking Success Trend (OTP History)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={otpHistoryData} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v, n) => [`${v}%`, n]} />
              {carrierKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={OTP_COLORS_MAP[CARRIER_SCORECARDS.find((c) => c.carrier.split(" ")[0] === key)?.carrier ?? ""] ?? "#94a3b8"}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Exception Impact by Carrier */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={14} className="text-red-500" />
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Exception Impact by Carrier</h3>
            {carrierExceptionImpact.length > 0 && (
              <span className="ml-auto text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                {exceptionBookings.length} active exception{exceptionBookings.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {carrierExceptionImpact.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-4 justify-center">
              <CheckCircle2 size={14} className="text-green-500" />
              No carrier-related exceptions at this time
            </div>
          ) : (
            <div className="space-y-3">
              {carrierExceptionImpact.map((c) => (
                <div key={c.carrier} className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                  {/* Carrier header row */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-gray-800 min-w-[110px]">{c.carrier}</span>
                    {c.worstSev && (
                      <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", SEV_COLOR[c.worstSev])}>
                        {c.worstSev}
                      </span>
                    )}
                    <span className={cn(
                      "text-[9px] font-semibold rounded-full px-1.5 py-0.5",
                      c.capacity === "Available" ? "bg-green-50 text-green-700" :
                      c.capacity === "Limited"   ? "bg-amber-50 text-amber-700" :
                                                   "bg-red-50 text-red-700"
                    )}>
                      Capacity: {c.capacity}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400">{c.exceptions.length} booking{c.exceptions.length !== 1 ? "s" : ""} affected</span>
                  </div>

                  {/* Exception type pills + action */}
                  <div className="space-y-1.5">
                    {c.types.map((type) => {
                      const cfg = EXCEPTION_TYPE_CONFIG[type] ?? { color: "text-gray-600 bg-gray-50 border-gray-200", icon: <AlertTriangle size={10} />, action: "Review exception" }
                      const affectedIds = c.exceptions.filter((e) => e.exceptionType === type).map((e) => e.id)
                      return (
                        <div key={type} className="flex items-start gap-2">
                          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 mt-0.5", cfg.color)}>
                            {cfg.icon}
                            {type}
                          </span>
                          <span className="text-[10px] text-gray-500 flex-1 leading-snug">{cfg.action}</span>
                          <div className="flex gap-1 shrink-0">
                            {affectedIds.map((id) => (
                              <span key={id} className="font-mono text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">{id}</span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating guide */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rating Methodology</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(RATING_CONFIG).map(([key, cfg]) => (
              <div key={key} className={cn("rounded-lg border p-3", cfg.color)}>
                <div className="flex items-center gap-1.5 mb-1">
                  {cfg.icon}
                  <span className="text-xs font-semibold">{cfg.label}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {key === "Preferred" && "Booking success >= 95% . SLA score >= 92% . Available capacity . Stable or improving trend"}
                  {key === "Standard"  && "Booking success 90-94% . SLA score 88-91% . Adequate coverage"}
                  {key === "Monitor"   && "Booking success <90% or declining trend . Consider alternate carrier for critical lanes"}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
