"use client"

import { useState } from "react"
import { BOOKING_REQUESTS, type BookingExceptionType, type Severity, type TransportMode, type BookingRequest } from "@/lib/mock-data"
import { SeverityBadge, ModeBadge, ExceptionBadge, BookingStatusBadge, ReasonChips, CarrierBadge } from "./shared"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

// Keep Shipment alias for backward compat
type Shipment = BookingRequest

type SortField = "id" | "severity" | "status" | "targetDate"

interface ShipmentTableProps {
  searchQuery: string
  activeFilter: string | null
  onSelectShipment: (shipment: Shipment) => void
  selectedId: string | null
  initialMaxRows?: number
}

const MODE_OPTIONS: TransportMode[] = ["Ocean", "Road", "Air"]
const SEVERITY_OPTIONS: Severity[] = ["Critical", "High", "Medium", "Low"]
const EXCEPTION_OPTIONS: BookingExceptionType[] = [
  "Missing Allocation", "Portal Unavailable", "Rate Mismatch",
  "Missing Booking Fields", "Carrier Rejection", "Credentials Expired",
]

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
const STATUS_ORDER: Record<string, number> = {
  Exception: 0, "Awaiting Approval": 1, Pending: 2, "In Progress": 3,
  "Carrier Selected": 4, "Portal Login": 5, "Booking Submitted": 6,
  "Docs Uploaded": 7, Confirmed: 8, Notified: 9,
}

// Booking priority score
function computeBookingPriority(s: BookingRequest): number {
  const statusBase: Record<string, number> = { Exception: 85, "Awaiting Approval": 70, Pending: 50, "In Progress": 30, Confirmed: 10 }
  const severityBonus: Record<Severity, number> = { Critical: 15, High: 10, Medium: 5, Low: 0 }
  const base = statusBase[s.bookingStatus] ?? 20
  return Math.min(base + severityBonus[s.severity], 99)
}

// Workflow step progress display
function WorkflowProgress({ steps }: { steps: BookingRequest["workflowSteps"] }) {
  const completed = steps.filter((s) => s.status === "completed").length
  const failed = steps.some((s) => s.status === "failed")
  const total = steps.length
  const pct = Math.round((completed / total) * 100)

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", failed ? "bg-[#3838E0]" : completed === total ? "bg-[#0000B3]" : "bg-blue-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-mono", failed ? "text-blue-600" : "text-gray-500")}>{completed}/{total}</span>
    </div>
  )
}

export function ShipmentTable({ searchQuery, activeFilter, onSelectShipment, selectedId, initialMaxRows = 5 }: ShipmentTableProps) {
  const [modeFilter, setModeFilter] = useState<TransportMode | "All">("All")
  const [severityFilter, setSeverityFilter] = useState<Severity | "All">("All")
  const [exceptionFilter, setExceptionFilter] = useState<BookingExceptionType | "All">("All")
  const [sortField, setSortField] = useState<SortField>("severity")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expanded, setExpanded] = useState(false)

  const filtered = BOOKING_REQUESTS.filter((s) => {
    if (modeFilter !== "All" && s.mode !== modeFilter) return false
    if (severityFilter !== "All" && s.severity !== severityFilter) return false
    if (exceptionFilter !== "All" && s.exceptionType !== exceptionFilter) return false
    if (activeFilter === "exceptions" && s.bookingStatus !== "Exception") return false
    if (activeFilter === "awaiting-approval" && s.bookingStatus !== "Awaiting Approval") return false
    if (activeFilter === "pending" && s.bookingStatus !== "Pending" && s.bookingStatus !== "In Progress") return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !s.id.toLowerCase().includes(q) &&
        !s.carrier.toLowerCase().includes(q) &&
        !s.destination.toLowerCase().includes(q) &&
        !s.lane.toLowerCase().includes(q) &&
        !s.sapOrderRef.toLowerCase().includes(q)
      ) return false
    }
    return true
  }).sort((a, b) => {
    let cmp = 0
    if (sortField === "severity") cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    else if (sortField === "status") cmp = (STATUS_ORDER[a.bookingStatus] ?? 5) - (STATUS_ORDER[b.bookingStatus] ?? 5)
    else if (sortField === "id") cmp = a.id.localeCompare(b.id)
    return sortDir === "asc" ? cmp : -cmp
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={11} className="text-gray-300" />
    return sortDir === "asc" ? <ChevronUp size={11} className="text-blue-600" /> : <ChevronDown size={11} className="text-blue-600" />
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        <Filter size={13} className="text-gray-400 shrink-0" />

        <FilterGroup label="Mode" options={["All", ...MODE_OPTIONS]} value={modeFilter} onChange={setModeFilter} />
        <div className="w-px h-4 bg-gray-300" />
        <FilterGroup label="Severity" options={["All", ...SEVERITY_OPTIONS]} value={severityFilter} onChange={setSeverityFilter} />
        <div className="w-px h-4 bg-gray-300" />
        <FilterGroup label="Exception" options={["All", ...EXCEPTION_OPTIONS]} value={exceptionFilter} onChange={setExceptionFilter} />

        <span className="ml-auto text-xs text-gray-400">{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <Th onClick={() => handleSort("id")} sortIcon={<SortIcon field="id" />}>Booking ID</Th>
              <Th>Mode</Th>
              <Th>Origin → Destination</Th>
              <Th>Carrier</Th>
              <Th onClick={() => handleSort("status")} sortIcon={<SortIcon field="status" />}>Status</Th>
              <Th>Workflow</Th>
              <Th>Container</Th>
              <Th>Target Ship</Th>
              <Th>Exception</Th>
              <Th onClick={() => handleSort("severity")} sortIcon={<SortIcon field="severity" />}>Severity</Th>
              <Th>SAP Ref</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-10 text-gray-400">No bookings match the current filters.</td>
              </tr>
            )}
            {(expanded ? filtered : filtered.slice(0, initialMaxRows)).map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                onClick={() => onSelectShipment(s)}
                className={cn(
                  "border-b border-gray-100 cursor-pointer transition-colors",
                  i % 2 === 0 ? "bg-white" : "bg-gray-50/40",
                  selectedId === s.id ? "bg-blue-50 border-blue-200" : "hover:bg-blue-50/40",
                  s.severity === "Critical" && selectedId !== s.id ? "border-l-2 border-l-red-500" : ""
                )}
              >
                <td className="px-3 py-2.5">
                  <span className="font-mono font-semibold text-blue-700">{s.id}</span>
                </td>
                <td className="px-3 py-2.5"><ModeBadge mode={s.mode} /></td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-gray-600 whitespace-nowrap">
                    <span className="truncate max-w-[90px]" title={s.origin}>{s.origin.split(",")[0]}</span>
                    <span className="text-gray-400">→</span>
                    <span className="truncate max-w-[90px]" title={s.destination}>{s.destination.split(",")[0]}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  {s.carrier !== "—" ? <CarrierBadge carrier={s.carrier} /> : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2.5"><BookingStatusBadge status={s.bookingStatus} /></td>
                <td className="px-3 py-2.5"><WorkflowProgress steps={s.workflowSteps} /></td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{s.containerType}</td>
                <td className="px-3 py-2.5 font-mono text-gray-600 whitespace-nowrap">{s.targetShipDate}</td>
                <td className="px-3 py-2.5">
                  {s.exceptionType !== "None" ? <ExceptionBadge type={s.exceptionType} /> : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2.5"><SeverityBadge severity={s.severity} /></td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500">{s.sapOrderRef}</td>
                <td className="px-3 py-2.5">
                  <span className="text-blue-700 font-medium hover:underline truncate block max-w-[140px]" title={s.recommendedAction}>{s.recommendedAction}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show more / Show less */}
      {filtered.length > initialMaxRows && (
        <div className="flex items-center justify-center border-t border-gray-100 py-2">
          <button
            onClick={() => setExpanded(p => !p)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[#0000B3] hover:text-[#00009A] transition-colors px-4 py-1 rounded-lg hover:bg-blue-50"
          >
            {expanded ? (
              <><ChevronUp size={12} /> Show less</>
            ) : (
              <><ChevronDown size={12} /> Show {filtered.length - initialMaxRows} more bookings</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function Th({ children, onClick, sortIcon }: { children: React.ReactNode; onClick?: () => void; sortIcon?: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider text-[10px] whitespace-nowrap",
        onClick ? "cursor-pointer hover:text-gray-700 select-none" : ""
      )}
      onClick={onClick}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortIcon}
      </span>
    </th>
  )
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mr-0.5">{label}:</span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "px-2 py-0.5 rounded text-[11px] font-medium transition-colors",
            value === o ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-200"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}
