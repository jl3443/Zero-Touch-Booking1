"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import {
  FileText, CheckCircle2, AlertTriangle, Clock, RefreshCw,
  ChevronDown, ChevronRight, TrendingUp, Sparkles,
  Package, BarChart2, Shield, Upload, Download, Eye,
  X, Loader2, Brain,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CONTRACT_DATA, type CarrierContract, type ContractLane } from "@/lib/mock-data"
import { generateContractPDF, downloadContractPDF, type ContractPDFData } from "@/lib/pdf-generator"

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const STATUS_BADGE: Record<string, string> = {
  Active: "bg-sky-50 border-sky-200 text-sky-700",
  "Expiring Soon": "bg-amber-50 border-amber-200 text-amber-700",
  Expired: "bg-red-50 border-red-200 text-red-700",
  "Under Review": "bg-blue-50 border-blue-200 text-blue-700",
}
const STATUS_DOT: Record<string, string> = {
  Active: "bg-sky-500", "Expiring Soon": "bg-amber-500 animate-pulse", Expired: "bg-red-500", "Under Review": "bg-blue-500",
}

function UtilBar({ used, total }: { used: number; total: number }) {
  const pct = Math.round((used / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-sky-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-[11px] font-bold tabular-nums shrink-0", pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-sky-600")}>{pct}%</span>
    </div>
  )
}

function toContractPDFData(c: CarrierContract): ContractPDFData {
  return { id: c.id, carrier: c.carrier, status: c.status, effectiveDate: c.effectiveDate, expiryDate: c.expiryDate, totalVolumeCommitted: c.totalVolumeCommitted, totalVolumeUsed: c.totalVolumeUsed, lanes: c.lanes.map(l => ({ lane: l.lane, mode: l.mode, contractRate: l.contractRate, currentSpotRate: l.currentSpotRate, volumeCommitted: l.volumeCommitted, volumeUsed: l.volumeUsed })) }
}

export function ContractsPage() {
  const [thinking, setThinking] = useState(true)
  const [selected, setSelected] = useState<CarrierContract | null>(null)
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set())
  const [contracts, setContracts] = useState(CONTRACT_DATA)
  // Upload flow
  const [uploading, setUploading] = useState(false)
  const [uploadPhase, setUploadPhase] = useState(0) // 0=idle, 1-3=analyzing, 4=done
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { const t = setTimeout(() => setThinking(false), 1200); return () => clearTimeout(t) }, [])

  const handleUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = () => {
    setUploading(true)
    setUploadPhase(1)
    let step = 1
    const interval = setInterval(() => {
      step++
      if (step <= 3) { setUploadPhase(step) }
      else {
        clearInterval(interval)
        setUploadPhase(4)
        // Add new carrier contract
        const newContract: CarrierContract = {
          id: "CTR-2025-007", carrier: "Evergreen Marine", status: "Under Review",
          effectiveDate: "Apr 1, 2025", expiryDate: "Mar 31, 2027",
          totalVolumeCommitted: 8000, totalVolumeUsed: 0,
          lanes: [
            { lane: "SHA → LAX", mode: "Ocean", contractRate: 2650, currentSpotRate: 2850, volumeCommitted: 3000, volumeUsed: 0 },
            { lane: "SHA → RTM", mode: "Ocean", contractRate: 2400, currentSpotRate: 2600, volumeCommitted: 2500, volumeUsed: 0 },
            { lane: "HKG → LAX", mode: "Ocean", contractRate: 2800, currentSpotRate: 3050, volumeCommitted: 2500, volumeUsed: 0 },
          ],
          renegotiationFlag: false, aiRecommendation: "",
        }
        setContracts(prev => [newContract, ...prev])
        setTimeout(() => { setUploading(false); setUploadPhase(0); setSelected(newContract) }, 1500)
      }
    }, 1200)
  }

  if (thinking) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0000B3]/10">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><RefreshCw size={20} className="text-[#0000B3]" /></motion.div>
          </div>
          <p className="text-sm font-medium text-slate-600">Loading contract registry</p>
        </div>
      </div>
    )
  }

  const activeContracts = contracts.filter(c => c.status === "Active" || c.status === "Expiring Soon")
  const totalVolume = contracts.reduce((s, c) => s + c.totalVolumeCommitted, 0)
  const totalUsed = contracts.reduce((s, c) => s + c.totalVolumeUsed, 0)
  const avgUtil = totalVolume > 0 ? Math.round((totalUsed / totalVolume) * 100) : 0
  const expiringSoon = contracts.filter(c => c.status === "Expiring Soon" || c.status === "Expired").length
  const recsToShow = contracts.filter(c => c.renegotiationFlag && !dismissedRecs.has(c.id))

  return (
    <div className="flex-1 overflow-hidden bg-slate-50 flex">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelected} />

      {/* Main content */}
      <div className={cn("flex-1 overflow-y-auto", selected ? "border-r border-slate-200" : "")}>
        <motion.div className="p-4 space-y-3 max-w-[1600px] mx-auto" variants={stagger} initial="hidden" animate="show">

          {/* Header + Upload button */}
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0000B3]/10"><FileText size={18} className="text-[#0000B3]" /></div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Contracts Management</h1>
                <p className="text-xs text-slate-500">{contracts.length} contracts · {activeContracts.length} active · {totalUsed.toLocaleString()} / {totalVolume.toLocaleString()} TEU</p>
              </div>
            </div>
            <button onClick={handleUpload} className="flex items-center gap-2 px-4 py-2 bg-[#0000B3] text-white text-[12px] font-semibold rounded-lg hover:bg-[#00009A] transition-colors">
              <Upload size={14} /> Upload Contract
            </button>
          </motion.div>

          {/* KPI strip */}
          <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2">
            {[
              { label: "Active Contracts", value: activeContracts.length, icon: FileText, sub: `${contracts.length} total` },
              { label: "Total Volume", value: `${(totalUsed / 1000).toFixed(1)}K`, icon: Package, sub: `of ${(totalVolume / 1000).toFixed(0)}K TEU` },
              { label: "Avg Utilization", value: `${avgUtil}%`, icon: BarChart2, sub: avgUtil >= 80 ? "On track" : "Below target" },
              { label: "Action Needed", value: expiringSoon, icon: AlertTriangle, sub: "Expiring / Expired" },
            ].map(k => (
              <div key={k.label} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{k.label}</p>
                    <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{k.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100"><k.icon size={14} className="text-blue-600" /></div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* SLA Compliance strip */}
          <motion.div variants={fadeUp} className="flex items-center gap-3 px-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">SLA</span>
            {[
              { label: "Contracted Lane Util", value: `${avgUtil}%`, target: 92, current: avgUtil },
              { label: "Spot Buy Ratio", value: "4.2%", target: 6, current: 4.2, invert: true },
              { label: "OTD", value: "92%", target: 95, current: 92 },
              { label: "Cost/Mile (NAM)", value: "$2.56", target: 2.89, current: 2.56, invert: true },
            ].map(sla => {
              const meets = sla.invert ? sla.current <= sla.target : sla.current >= sla.target
              return (
                <div key={sla.label} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", meets ? "bg-sky-500" : "bg-amber-500")} />
                  <span className="text-[10px] text-slate-500">{sla.label}:</span>
                  <span className={cn("text-[10px] font-bold", meets ? "text-sky-700" : "text-amber-700")}>{sla.value}</span>
                </div>
              )
            })}
          </motion.div>

          {/* Contracts table */}
          <motion.div variants={fadeUp} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
              <FileText size={13} className="text-indigo-600" />
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">Carrier Contracts</span>
              <span className="ml-auto rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">{contracts.length}</span>
            </div>

            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.5fr_80px] gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
              {["Contract / Carrier", "Status", "Effective", "Expiry", "Volume (TEU)", "Utilization", "Actions"].map(h => (
                <span key={h} className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{h}</span>
              ))}
            </div>

            {contracts.map((contract, i) => (
              <div
                key={contract.id}
                className={cn("grid grid-cols-[2fr_1fr_1fr_1fr_1.2fr_1.5fr_80px] gap-2 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors",
                  selected?.id === contract.id ? "bg-blue-50/60 border-l-[3px] border-l-blue-500" : "hover:bg-slate-50"
                )}
                onClick={() => setSelected(selected?.id === contract.id ? null : contract)}
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
                <UtilBar used={contract.totalVolumeUsed} total={contract.totalVolumeCommitted} />
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); generateContractPDF(toContractPDFData(contract)) }} className="p-1 rounded hover:bg-slate-100 transition-colors" title="View PDF">
                    <Eye size={13} className="text-slate-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); downloadContractPDF(toContractPDFData(contract)) }} className="p-1 rounded hover:bg-slate-100 transition-colors" title="Download PDF">
                    <Download size={13} className="text-slate-400" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>

          {/* AI Renegotiation Recommendations */}
          {recsToShow.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
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
                      <button onClick={() => setSelected(contract)} className="rounded-lg bg-[#0000B3] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#00009A] transition-colors">Review</button>
                      <button onClick={() => setDismissedRecs(prev => new Set([...prev, contract.id]))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] text-slate-500 hover:bg-slate-50 transition-colors">Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Right detail panel */}
      {selected && (
        <div className="w-[480px] shrink-0 bg-white overflow-y-auto border-l border-slate-200 animate-in slide-in-from-right-4 duration-300">
          <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 z-10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">{selected.carrier}</h2>
                <p className="text-[11px] text-slate-400 font-mono">{selected.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold", STATUS_BADGE[selected.status])}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[selected.status])} />
                  {selected.status}
                </span>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-slate-100"><X size={14} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => generateContractPDF(toContractPDFData(selected))} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0000B3] text-white text-[11px] font-semibold rounded-lg hover:bg-[#00009A] transition-colors">
                <Eye size={12} /> View PDF
              </button>
              <button onClick={() => downloadContractPDF(toContractPDFData(selected))} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
                <Download size={12} /> Download
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* Contract Terms */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contract Terms</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Effective", value: selected.effectiveDate },
                  { label: "Expiry", value: selected.expiryDate },
                  { label: "Volume", value: `${selected.totalVolumeCommitted.toLocaleString()} TEU` },
                  { label: "Used", value: `${selected.totalVolumeUsed.toLocaleString()} TEU` },
                  { label: "Payment", value: "Net 30 days" },
                  { label: "Rebate", value: "3% at +10% vol" },
                ].map(t => (
                  <div key={t.label} className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[9px] text-slate-400 uppercase font-medium">{t.label}</span>
                    <div className="text-[13px] font-bold text-slate-800">{t.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Utilization */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Volume Utilization</p>
              <UtilBar used={selected.totalVolumeUsed} total={selected.totalVolumeCommitted} />
            </div>

            {/* SLA Performance */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SLA Performance</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "OTD", value: "93%", target: "95%", meets: false },
                  { label: "Data Entry", value: "98%", target: "24h", meets: true },
                  { label: "Critical SLA", value: "3.1h", target: "4h", meets: true },
                ].map(s => (
                  <div key={s.label} className="p-2 bg-slate-50 rounded-lg text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-medium">{s.label}</span>
                    <div className={cn("text-[14px] font-bold", s.meets ? "text-sky-600" : "text-amber-600")}>{s.value}</div>
                    <span className="text-[9px] text-slate-400">target {s.target}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Lane Breakdown */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lane Rate Schedule</p>
              <div className="space-y-2">
                {selected.lanes.map(lane => {
                  const delta = ((lane.currentSpotRate - lane.contractRate) / lane.contractRate * 100).toFixed(1)
                  const saving = lane.currentSpotRate > lane.contractRate
                  return (
                    <div key={lane.lane} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-semibold text-slate-800">{lane.lane}</span>
                        <span className="text-[10px] text-slate-400">{lane.mode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div><span className="text-[9px] text-slate-400">Contract</span><div className="text-[13px] font-bold text-slate-800">${lane.contractRate.toLocaleString()}</div></div>
                        <div><span className="text-[9px] text-slate-400">Spot</span><div className="text-[13px] font-bold text-slate-600">${lane.currentSpotRate.toLocaleString()} <span className={cn("text-[10px]", saving ? "text-sky-600" : "text-amber-600")}>{saving ? `↓${delta}%` : `↑${Math.abs(parseFloat(delta))}%`}</span></div></div>
                      </div>
                      <UtilBar used={lane.volumeUsed} total={lane.volumeCommitted} />
                      <div className="text-[9px] text-slate-400 mt-1">{lane.volumeUsed.toLocaleString()} / {lane.volumeCommitted.toLocaleString()} TEU</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload processing overlay */}
      {uploading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-in zoom-in-95 fade-in duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#0000B3]/10 flex items-center justify-center">
                <Brain size={20} className="text-[#0000B3]" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">{uploadPhase >= 4 ? "Contract Analyzed" : "AI Analyzing Contract"}</h3>
                <p className="text-[11px] text-slate-500">Extracting terms and rate schedules from PDF</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              {[
                { step: 1, label: "Extracting carrier information and contract terms...", detail: "Identified: Evergreen Marine, 2-year agreement, 8,000 TEU commitment" },
                { step: 2, label: "Parsing lane rate schedule and volume commitments...", detail: "Found 3 lanes: SHA→LAX, SHA→RTM, HKG→LAX with competitive rates" },
                { step: 3, label: "Validating SLA terms and compliance requirements...", detail: "OTD ≥95%, data entry ≤24h, critical shipment ≤4h — all standard" },
              ].map(s => {
                const isDone = uploadPhase > s.step
                const isActive = uploadPhase === s.step
                return (
                  <div key={s.step} className={cn("p-3 rounded-lg border transition-all", isDone ? "bg-blue-50 border-blue-200" : isActive ? "bg-slate-50 border-blue-300" : "bg-slate-50 border-slate-100 opacity-40")}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {isDone ? <CheckCircle2 size={13} className="text-blue-600 shrink-0" /> : isActive ? <Loader2 size={13} className="text-blue-600 animate-spin shrink-0" /> : <div className="w-[13px] h-[13px] rounded-full border border-slate-300 shrink-0" />}
                      <span className={cn("text-[11px] font-semibold", isDone || isActive ? "text-slate-800" : "text-slate-400")}>{s.label}</span>
                    </div>
                    {(isDone || isActive) && <p className="text-[10px] text-slate-500 ml-5">{s.detail}</p>}
                  </div>
                )
              })}
            </div>

            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-[#0000B3] rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.round((uploadPhase / 4) * 100))}%` }} />
            </div>
            <p className="text-[11px] text-slate-400 text-center">{uploadPhase >= 4 ? "100% — New carrier added" : `${Math.round((uploadPhase / 4) * 100)}% complete`}</p>
          </div>
        </div>
      )}
    </div>
  )
}
