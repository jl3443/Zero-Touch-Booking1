"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileText, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  ChevronDown, ChevronRight, TrendingUp, TrendingDown, Sparkles,
  Calendar, Package, DollarSign, BarChart2, Shield, XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CONTRACT_DATA, type CarrierContract, type ContractLane } from "@/lib/mock-data"

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-sky-50 border-sky-200 text-sky-700",
  "Expiring Soon": "bg-amber-50 border-amber-200 text-amber-700",
  Expired: "bg-red-50 border-red-200 text-red-700",
  "Under Review": "bg-blue-50 border-blue-200 text-blue-700",
}

const STATUS_DOT: Record<string, string> = {
  Active: "bg-sky-500",
  "Expiring Soon": "bg-amber-500 animate-pulse",
  Expired: "bg-red-500",
  "Under Review": "bg-blue-500",
}

function UtilizationBar({ used, total }: { used: number; total: number }) {
  const pct = Math.round((used / total) * 100)
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-sky-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
      <span className={cn("text-[11px] font-bold tabular-nums shrink-0", pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-sky-600")}>
        {pct}%
      </span>
    </div>
  )
}

function RateDelta({ contract, spot }: { contract: number; spot: number }) {
  const delta = spot - contract
  const pct = ((delta / contract) * 100).toFixed(1)
  const isSaving = delta > 0 // contract is cheaper
  return (
    <span className={cn("text-[10px] font-semibold", isSaving ? "text-sky-600" : "text-amber-600")}>
      {isSaving ? `↓ $${delta} saved (${pct}%)` : `↑ $${Math.abs(delta)} over (+${Math.abs(parseFloat(pct))}%)`}
    </span>
  )
}

export function ContractsPage() {
  const [thinking, setThinking] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1200)
    return () => clearTimeout(t)
  }, [])

  if (thinking) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0000B3]/10">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw size={20} className="text-[#0000B3]" />
            </motion.div>
          </div>
          <p className="text-sm font-medium text-slate-600">Loading contract registry</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-[#0000B3]" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeContracts = CONTRACT_DATA.filter(c => c.status === "Active" || c.status === "Expiring Soon")
  const totalVolume = CONTRACT_DATA.reduce((s, c) => s + c.totalVolumeCommitted, 0)
  const totalUsed = CONTRACT_DATA.reduce((s, c) => s + c.totalVolumeUsed, 0)
  const avgUtil = Math.round((totalUsed / totalVolume) * 100)
  const expiringSoon = CONTRACT_DATA.filter(c => c.status === "Expiring Soon" || c.status === "Expired").length
  const recsToShow = CONTRACT_DATA.filter(c => c.renegotiationFlag && !dismissedRecs.has(c.id))

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <motion.div className="p-4 space-y-3 max-w-[1600px] mx-auto" variants={stagger} initial="hidden" animate="show">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0000B3]/10">
              <FileText size={18} className="text-[#0000B3]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Contracts Management</h1>
              <p className="text-xs text-slate-500">{CONTRACT_DATA.length} contracts · {activeContracts.length} active · {totalUsed.toLocaleString()} / {totalVolume.toLocaleString()} TEU committed</p>
            </div>
          </div>
        </motion.div>

        {/* KPI strip */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
          {[
            { label: "Active Contracts", value: activeContracts.length, icon: FileText, iconBg: "bg-blue-100", iconColor: "text-blue-600", sub: `${CONTRACT_DATA.length} total` },
            { label: "Total Volume", value: `${(totalUsed / 1000).toFixed(1)}K`, icon: Package, iconBg: "bg-blue-100", iconColor: "text-blue-600", sub: `of ${(totalVolume / 1000).toFixed(0)}K TEU` },
            { label: "Avg Utilization", value: `${avgUtil}%`, icon: BarChart2, iconBg: "bg-blue-100", iconColor: "text-blue-600", sub: avgUtil >= 80 ? "On track" : "Below target" },
            { label: "Action Needed", value: expiringSoon, icon: AlertTriangle, iconBg: "bg-blue-100", iconColor: "text-blue-600", sub: "Expiring / Expired" },
          ].map(k => (
            <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{k.label}</p>
                  <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{k.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
                </div>
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg", k.iconBg)}>
                  <k.icon size={14} className={k.iconColor} />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Contracts table */}
        <motion.div variants={fadeUp} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <FileText size={13} className="text-slate-500" />
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Carrier Contracts</span>
            <span className="ml-auto rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">{CONTRACT_DATA.length}</span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.5fr_40px] gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
            {["Contract / Carrier", "Status", "Effective", "Expiry", "Volume (TEU)", "Utilization", ""].map(h => (
              <span key={h} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Contract rows */}
          {CONTRACT_DATA.map((contract, i) => (
            <motion.div
              key={contract.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className={cn(
                  "grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.5fr_40px] gap-2 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors",
                  expandedId === contract.id ? "bg-blue-50/50" : "hover:bg-slate-50"
                )}
                onClick={() => setExpandedId(expandedId === contract.id ? null : contract.id)}
              >
                <div>
                  <p className="text-xs font-semibold text-slate-800">{contract.carrier}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{contract.id}</p>
                </div>
                <div>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", STATUS_BADGE[contract.status])}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[contract.status])} />
                    {contract.status}
                  </span>
                </div>
                <span className="text-[11px] text-slate-600">{contract.effectiveDate}</span>
                <span className={cn("text-[11px]", contract.status === "Expired" ? "text-red-600 font-medium" : contract.status === "Expiring Soon" ? "text-amber-600 font-medium" : "text-slate-600")}>{contract.expiryDate}</span>
                <span className="text-[11px] text-slate-700 font-mono tabular-nums">{contract.totalVolumeUsed.toLocaleString()} / {contract.totalVolumeCommitted.toLocaleString()}</span>
                <UtilizationBar used={contract.totalVolumeUsed} total={contract.totalVolumeCommitted} />
                <div className="flex items-center justify-center">
                  {expandedId === contract.id ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-300" />}
                </div>
              </div>

              {/* Expanded lane details */}
              {expandedId === contract.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-4 pb-3 bg-slate-50/50"
                >
                  <div className="ml-4 border-l-2 border-blue-200 pl-4 space-y-2 pt-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Lane Details</p>
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <div className="grid grid-cols-[140px_60px_90px_90px_110px_120px_120px] gap-1 px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                        {["Lane", "Mode", "Contract", "Spot", "Delta", "Volume", "Utilization"].map(h => (
                          <span key={h} className="text-[8px] font-semibold text-slate-400 uppercase">{h}</span>
                        ))}
                      </div>
                      {contract.lanes.map(lane => (
                        <div key={lane.lane} className="grid grid-cols-[140px_60px_90px_90px_110px_120px_120px] gap-1 px-3 py-2 border-b border-slate-50 last:border-0">
                          <span className="text-[11px] font-medium text-slate-800">{lane.lane}</span>
                          <span className="text-[10px] text-slate-500">{lane.mode}</span>
                          <span className="text-[11px] font-mono text-slate-700">${lane.contractRate.toLocaleString()}</span>
                          <span className="text-[11px] font-mono text-slate-700">${lane.currentSpotRate.toLocaleString()}</span>
                          <RateDelta contract={lane.contractRate} spot={lane.currentSpotRate} />
                          <span className="text-[10px] text-slate-600 font-mono">{lane.volumeUsed.toLocaleString()} / {lane.volumeCommitted.toLocaleString()}</span>
                          <UtilizationBar used={lane.volumeUsed} total={lane.volumeCommitted} />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* AI Renegotiation Recommendations */}
        {recsToShow.length > 0 && (
          <motion.div variants={fadeUp} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100">
              <Sparkles size={13} className="text-indigo-600" />
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">AI Renegotiation Recommendations</span>
              <span className="ml-auto rounded-full bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">{recsToShow.length}</span>
            </div>
            <div className="divide-y divide-slate-50">
              {recsToShow.map(contract => (
                <div key={contract.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0", STATUS_DOT[contract.status])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-slate-800">{contract.carrier}</span>
                      <span className="text-[10px] font-mono text-slate-400">{contract.id}</span>
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-semibold", STATUS_BADGE[contract.status])}>{contract.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{contract.aiRecommendation}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button className="rounded-lg bg-[#0000B3] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#00009A] transition-colors">
                      Review
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDismissedRecs(prev => new Set([...prev, contract.id])) }}
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
