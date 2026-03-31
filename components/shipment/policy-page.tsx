"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Shield, CheckCircle2, AlertTriangle, Clock, Zap,
  RefreshCw, ChevronRight, Lock, Scale, FileCheck,
  Users, Globe, DollarSign, Package,
} from "lucide-react"
import { cn } from "@/lib/utils"

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const POLICIES = [
  {
    category: "Booking Approval",
    icon: FileCheck,
    color: "bg-blue-100 text-blue-600",
    rules: [
      { name: "Auto-approve below threshold", description: "Bookings under $15,000 are auto-approved without manual review", status: "active", impact: "72% of bookings auto-approved" },
      { name: "Dual approval for critical lanes", description: "SHA→LAX and HKG→RTM require both Router and Planner sign-off", status: "active", impact: "Applies to 4 active lanes" },
      { name: "Spot rate cap enforcement", description: "Reject spot bookings exceeding 120% of contract rate", status: "active", impact: "Blocked 3 bookings this week" },
    ],
  },
  {
    category: "Carrier Selection",
    icon: Scale,
    color: "bg-purple-100 text-purple-600",
    rules: [
      { name: "SLA minimum threshold", description: "Carriers below 85% on-time delivery excluded from auto-selection", status: "active", impact: "2 carriers currently excluded" },
      { name: "Capacity-first routing", description: "Prioritize carriers with confirmed allocation over spot capacity", status: "active", impact: "Reduced rejections by 34%" },
      { name: "Rate weight: 40%", description: "Contract rate accounts for 40% of carrier scoring algorithm", status: "active", impact: "Applied to all evaluations" },
    ],
  },
  {
    category: "Exception Handling",
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-600",
    rules: [
      { name: "Auto-escalation timer", description: "Unresolved exceptions escalate to Planner after 2 hours", status: "active", impact: "Avg resolution: 1.4h" },
      { name: "Portal failure fallback", description: "Switch to backup carrier API after 3 failed portal attempts", status: "active", impact: "Triggered 2x this month" },
      { name: "Missing data auto-fill", description: "AI attempts to resolve missing fields from SAP/OTM before escalation", status: "active", impact: "67% auto-resolved" },
    ],
  },
  {
    category: "Compliance & Security",
    icon: Lock,
    color: "bg-red-100 text-red-600",
    rules: [
      { name: "Sanctions screening", description: "All bookings screened against OFAC, EU, and UN sanctions lists", status: "active", impact: "0 violations detected" },
      { name: "Document retention", description: "BOL, packing lists, and customs docs retained for 7 years", status: "active", impact: "4,231 docs archived" },
      { name: "Audit trail logging", description: "Every agent action logged with timestamp and reasoning", status: "active", impact: "100% coverage" },
    ],
  },
  {
    category: "Cost Controls",
    icon: DollarSign,
    color: "bg-green-100 text-green-600",
    rules: [
      { name: "Budget ceiling per lane", description: "Monthly spend cap per trade lane — alerts at 80%, blocks at 100%", status: "active", impact: "SHA→LAX at 74% of cap" },
      { name: "Consolidation preference", description: "Prefer LCL consolidation when shipment < 50% of FCL capacity", status: "active", impact: "Saved $12K this month" },
      { name: "Currency hedging flag", description: "Flag bookings with FX exposure > $5,000 for treasury review", status: "warning", impact: "2 bookings flagged" },
    ],
  },
]

export function PolicyPage() {
  const [thinking, setThinking] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1000)
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
          <p className="text-sm font-medium text-slate-600">Loading policy engine</p>
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
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <motion.div className="p-4 space-y-3 max-w-[1600px] mx-auto" variants={container} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0000B3]/10">
              <Shield size={18} className="text-[#0000B3]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Policy Engine</h1>
              <p className="text-xs text-slate-500">15 active rules · 5 categories · Last audit: 2 days ago</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1">
            <CheckCircle2 size={12} className="text-green-600" />
            <span className="text-[11px] font-medium text-green-700">All Policies Active</span>
          </div>
        </motion.div>

        {/* Policy categories */}
        {POLICIES.map((cat) => (
          <motion.div key={cat.category} variants={item} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-lg", cat.color)}>
                <cat.icon size={13} />
              </div>
              <span className="text-xs font-semibold text-slate-700">{cat.category}</span>
              <span className="ml-auto rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">{cat.rules.length} rules</span>
            </div>
            <div className="divide-y divide-slate-50">
              {cat.rules.map((rule) => (
                <div key={rule.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                  <CheckCircle2 size={14} className={rule.status === "warning" ? "text-amber-500" : "text-green-500"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{rule.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{rule.description}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{rule.impact}</span>
                  <ChevronRight size={12} className="text-slate-300 shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
