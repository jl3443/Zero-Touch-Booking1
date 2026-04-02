"use client"

import { X, Zap, Clock, TrendingUp, ShieldCheck, Target, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

interface DemoModalProps {
  open: boolean
  onClose?: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  width?: "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
  showClose?: boolean
}

export function DemoModal({ open, onClose, title, subtitle, icon, children, footer, width = "2xl", showClose = true }: DemoModalProps) {
  if (!open) return null

  const widthClass = {
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  }[width]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className={cn(
        "bg-white rounded-2xl shadow-2xl border border-gray-200 w-full mx-4 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 fade-in duration-300",
        widthClass,
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {showClose && onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 shrink-0">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 relative">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-100 px-6 py-3 shrink-0 bg-gray-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Completion Modal (special design) ────────────────────────────────────────

interface CompletionModalProps {
  open: boolean
  onClose: () => void
  elapsedTime: string
}

export function CompletionModal({ open, onClose, elapsedTime }: CompletionModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-90 fade-in duration-500">
        {/* Success animation */}
        <div className="bg-gradient-to-b from-emerald-50 to-white pt-10 pb-6 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4 animate-in zoom-in-50 duration-700">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-in slide-in-from-left duration-500" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-gray-900">Zero Touch Booking Complete</h2>
          <p className="text-[13px] text-gray-500 mt-1">Fully autonomous — no human intervention required</p>
        </div>

        {/* ROI comparison */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-3">
            {[
              { label: "Manual Process", time: "~45 min", color: "bg-gray-300", width: "100%", textColor: "text-gray-500" },
              { label: "Workflow Tool", time: "~15 min", color: "bg-amber-400", width: "33%", textColor: "text-amber-700" },
              { label: "Zero Touch AI", time: elapsedTime, color: "bg-emerald-500", width: "4%", textColor: "text-emerald-700" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-gray-500">{item.label}</span>
                  <span className={cn("text-[14px] font-bold", item.textColor)}>{item.time}</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-1000 ease-out", item.color)} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>

          {/* KPI Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <Zap size={14} />, value: "84%", label: "Zero-Touch Rate", baseline: "from 71%", bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
              { icon: <Clock size={14} />, value: "2.4h", label: "Avg Resolution", baseline: "from 8.2h", bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
              { icon: <Target size={14} />, value: "95%", label: "On-Time Delivery", baseline: "from 70%", bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
              { icon: <ShieldCheck size={14} />, value: "3/3", label: "Exceptions Resolved", baseline: "67% auto", bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
              { icon: <TrendingUp size={14} />, value: "95%", label: "Contracted Lanes", baseline: "from 78%", bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
              { icon: <DollarSign size={14} />, value: "4.2%", label: "Spot Buy Ratio", baseline: "from 22%", bg: "bg-blue-50", iconColor: "text-blue-600", valueColor: "text-blue-700" },
            ].map((kpi) => (
              <div key={kpi.label} className={cn("rounded-lg px-3 py-2.5 text-center", kpi.bg)}>
                <div className={cn("flex items-center justify-center mb-1", kpi.iconColor)}>{kpi.icon}</div>
                <p className={cn("text-[16px] font-bold leading-tight", kpi.valueColor)}>{kpi.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{kpi.label}</p>
                <p className="text-[9px] text-green-600 mt-0.5">{"↑ " + kpi.baseline}</p>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
            <p className="text-[13px] text-gray-700">
              This booking saved <span className="font-bold text-emerald-700">43 minutes</span> of manual work.
            </p>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Projected annual savings: <span className="font-bold text-emerald-600">$2.4M</span> across 14,000 bookings.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 text-white text-[13px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
          >
            End Demo
          </button>
        </div>
      </div>
    </div>
  )
}
