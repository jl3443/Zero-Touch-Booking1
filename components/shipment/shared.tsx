"use client"

import { cn } from "@/lib/utils"
import type { BookingExceptionType, BookingStatus, ReasonChip, Severity, TransportMode } from "@/lib/mock-data"
import { Plane, Ship, Truck } from "lucide-react"

// Keep old type alias for any legacy imports
export type ExceptionType = BookingExceptionType

// ─── Severity Badge ───────────────────────────────────────────────────────────
export function SeverityBadge({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    Critical: "bg-red-600 text-white",
    High: "bg-amber-500 text-white",
    Medium: "bg-yellow-400 text-yellow-900",
    Low: "bg-green-100 text-green-800",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide", map[severity])}>
      {severity}
    </span>
  )
}

// ─── Mode Icon ────────────────────────────────────────────────────────────────
export function ModeIcon({ mode, size = 14 }: { mode: TransportMode; size?: number }) {
  const map: Record<TransportMode, { Icon: typeof Plane; color: string }> = {
    Air: { Icon: Plane, color: "text-indigo-600" },
    Ocean: { Icon: Ship, color: "text-blue-600" },
    Road: { Icon: Truck, color: "text-orange-600" },
  }
  const { Icon, color } = map[mode]
  return <Icon size={size} className={color} />
}

// ─── Mode Badge ───────────────────────────────────────────────────────────────
export function ModeBadge({ mode }: { mode: TransportMode }) {
  const map: Record<TransportMode, string> = {
    Air: "bg-indigo-50 text-indigo-700 border-indigo-200",
    Ocean: "bg-blue-50 text-blue-700 border-blue-200",
    Road: "bg-orange-50 text-orange-700 border-orange-200",
  }
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium", map[mode])}>
      <ModeIcon mode={mode} size={11} />
      {mode}
    </span>
  )
}

// ─── Booking Status Badge ─────────────────────────────────────────────────────
export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, string> = {
    "Pending": "bg-gray-100 text-gray-700 border-gray-300",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    "Carrier Selected": "bg-indigo-50 text-indigo-700 border-indigo-200",
    "Portal Login": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "Booking Submitted": "bg-sky-50 text-sky-700 border-sky-200",
    "Docs Uploaded": "bg-violet-50 text-violet-700 border-violet-200",
    "Confirmed": "bg-green-50 text-green-700 border-green-200",
    "Notified": "bg-green-100 text-green-800 border-green-300",
    "Exception": "bg-red-50 text-red-700 border-red-200",
    "Awaiting Approval": "bg-amber-50 text-amber-700 border-amber-200",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap", map[status])}>
      {status}
    </span>
  )
}

// ─── Carrier Badge ────────────────────────────────────────────────────────────
export function CarrierBadge({ carrier }: { carrier: string }) {
  const map: Record<string, string> = {
    "Maersk": "bg-[#0000B3] text-white",
    "MSC": "bg-[#1A1ACD] text-white",
    "Hapag-Lloyd": "bg-[#3333E0] text-white",
    "CMA-CGM": "bg-[#4D4DF0] text-white",
    "FedEx Freight": "bg-[#6666F5] text-white",
    "DHL Freight": "bg-[#8080F8] text-white",
    "XPO Logistics": "bg-[#9999FA] text-white",
    "J.B. Hunt": "bg-[#B3B3FC] text-gray-900",
  }
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide", map[carrier] ?? "bg-gray-200 text-gray-700")}>
      {carrier}
    </span>
  )
}

// ─── Exception Badge (repurposed for booking exceptions) ──────────────────────
export function ExceptionBadge({ type }: { type: BookingExceptionType }) {
  const map: Record<BookingExceptionType, string> = {
    "Missing Allocation": "bg-amber-50 text-amber-700 border-amber-200",
    "Portal Unavailable": "bg-blue-50 text-blue-700 border-blue-200",
    "Rate Mismatch": "bg-amber-50 text-amber-700 border-amber-200",
    "Missing Booking Fields": "bg-blue-50 text-blue-700 border-blue-200",
    "Carrier Rejection": "bg-red-50 text-red-700 border-red-200",
    "Credentials Expired": "bg-gray-100 text-gray-600 border-gray-300",
    "None": "bg-blue-50 text-blue-600 border-blue-200",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium whitespace-nowrap", map[type])}>
      {type}
    </span>
  )
}

// ─── Reason Chips ─────────────────────────────────────────────────────────────
export function ReasonChips({ chips }: { chips: ReasonChip[] }) {
  const colorMap: Record<ReasonChip["type"], string> = {
    carrier: "bg-blue-100 text-blue-800",
    rate: "bg-amber-100 text-amber-800",
    capacity: "bg-teal-100 text-teal-800",
    portal: "bg-purple-100 text-purple-800",
    document: "bg-indigo-100 text-indigo-800",
    approval: "bg-orange-100 text-orange-800",
    sap: "bg-gray-100 text-gray-700",
    booking: "bg-sky-100 text-sky-800",
  }
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span key={chip.label} className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", colorMap[chip.type])}>
          {chip.label}
        </span>
      ))}
    </div>
  )
}

// ─── Delay Display ───────────────────────────────────────────────────────────
export function DelayDisplay({ hours }: { hours: number }) {
  if (hours === 0) return <span className="text-gray-400 text-xs">On Time</span>
  const color = hours >= 12 ? "text-red-600" : hours >= 6 ? "text-amber-600" : "text-yellow-700"
  return <span className={cn("font-mono text-sm font-semibold", color)}>+{hours}d</span>
}

// ─── Confidence Bar (repurposed as booking progress) ────────────────────────
export function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-600 min-w-[2.5rem]">{score}%</span>
    </div>
  )
}

// ─── OTM Status Badge ─────────────────────────────────────────────────────────
export function OTMStatusBadge({ status }: { status: "Synced" | "Pending Update" | "Needs Review" }) {
  const map = {
    Synced: "bg-green-50 text-green-700 border-green-200",
    "Pending Update": "bg-amber-50 text-amber-700 border-amber-200",
    "Needs Review": "bg-red-50 text-red-700 border-red-200",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium", map[status])}>
      {status}
    </span>
  )
}

// ─── Source Badge ─────────────────────────────────────────────────────────────
export function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    "SAP TM": "bg-blue-600 text-white",
    "OTM": "bg-indigo-600 text-white",
    "Maersk Portal": "bg-sky-700 text-white",
    "MSC Portal": "bg-blue-700 text-white",
    "Hapag-Lloyd Portal": "bg-orange-600 text-white",
    "CMA-CGM Portal": "bg-red-700 text-white",
    "RPA Bot": "bg-purple-600 text-white",
    "Email": "bg-gray-500 text-white",
    "EDI": "bg-teal-600 text-white",
    "API Gateway": "bg-cyan-600 text-white",
    "Agent": "bg-slate-700 text-white",
    "System Alert": "bg-red-500 text-white",
    "Rate Engine": "bg-amber-600 text-white",
    "Document System": "bg-violet-600 text-white",
  }
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide", map[source] ?? "bg-gray-200 text-gray-700")}>
      {source}
    </span>
  )
}
