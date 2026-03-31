"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Code2, CheckCircle2, XCircle, Clock, Zap, RefreshCw,
  ExternalLink, Copy, ChevronDown, ChevronRight, Activity,
  Globe, Lock, Key, Server,
} from "lucide-react"
import { cn } from "@/lib/utils"

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

const API_ENDPOINTS = [
  { method: "GET", path: "/api/bookings", description: "List all bookings with filters", status: "live", latency: "45ms", calls24h: 1247 },
  { method: "POST", path: "/api/bookings", description: "Create a new booking request", status: "live", latency: "120ms", calls24h: 342 },
  { method: "GET", path: "/api/bookings/:id", description: "Get booking detail by ID", status: "live", latency: "32ms", calls24h: 2891 },
  { method: "PUT", path: "/api/bookings/:id/status", description: "Update booking status", status: "live", latency: "85ms", calls24h: 567 },
  { method: "GET", path: "/api/carriers", description: "List available carriers & rates", status: "live", latency: "65ms", calls24h: 891 },
  { method: "POST", path: "/api/carriers/evaluate", description: "AI carrier evaluation", status: "live", latency: "230ms", calls24h: 342 },
  { method: "GET", path: "/api/portals/status", description: "Carrier portal health check", status: "degraded", latency: "180ms", calls24h: 456 },
  { method: "POST", path: "/api/portal/login", description: "Authenticate to carrier portal", status: "live", latency: "350ms", calls24h: 234 },
  { method: "POST", path: "/api/portal/submit", description: "Submit booking to portal", status: "live", latency: "450ms", calls24h: 187 },
  { method: "GET", path: "/api/exceptions", description: "List active exceptions", status: "live", latency: "55ms", calls24h: 723 },
  { method: "POST", path: "/api/exceptions/:id/resolve", description: "Resolve an exception", status: "live", latency: "95ms", calls24h: 156 },
  { method: "GET", path: "/api/sap/orders", description: "SAP TM order feed", status: "live", latency: "110ms", calls24h: 1023 },
  { method: "POST", path: "/api/sap/update", description: "Push booking back to SAP", status: "live", latency: "200ms", calls24h: 567 },
  { method: "GET", path: "/api/documents/:id", description: "Get shipment documents", status: "live", latency: "75ms", calls24h: 445 },
  { method: "POST", path: "/api/documents/upload", description: "Upload BOL / packing list", status: "live", latency: "280ms", calls24h: 198 },
  { method: "GET", path: "/api/analytics/kpis", description: "Dashboard KPI aggregates", status: "live", latency: "90ms", calls24h: 2100 },
]

const INTEGRATIONS = [
  { name: "SAP TM", status: "connected", version: "ECC 6.0", icon: Server, lastSync: "2 min ago" },
  { name: "OTM", status: "connected", version: "6.4.3", icon: Globe, lastSync: "5 min ago" },
  { name: "Maersk Portal", status: "connected", version: "API v3", icon: Globe, lastSync: "1 min ago" },
  { name: "MSC Portal", status: "connected", version: "API v2", icon: Globe, lastSync: "3 min ago" },
  { name: "Hapag-Lloyd", status: "degraded", version: "API v1.2", icon: Globe, lastSync: "12 min ago" },
  { name: "CMA-CGM", status: "connected", version: "API v2.1", icon: Globe, lastSync: "4 min ago" },
]

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  DELETE: "bg-red-100 text-red-700",
}

const STATUS_DOT: Record<string, string> = {
  live: "bg-green-500",
  degraded: "bg-amber-500 animate-pulse",
  offline: "bg-red-500",
  connected: "bg-green-500",
}

export function ApiPage() {
  const [thinking, setThinking] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>("endpoints")

  useEffect(() => {
    const t = setTimeout(() => setThinking(false), 1200)
    return () => clearTimeout(t)
  }, [])

  if (thinking) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0000B3]/10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={20} className="text-[#0000B3]" />
            </motion.div>
          </div>
          <p className="text-sm font-medium text-slate-600">Loading API dashboard</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-[#0000B3]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <motion.div
        className="p-4 space-y-3 max-w-[1600px] mx-auto"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0000B3]/10">
              <Code2 size={18} className="text-[#0000B3]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">API & Integrations</h1>
              <p className="text-xs text-slate-500">16 endpoints · 6 integrations · 99.7% uptime</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-medium text-green-700">All Systems Operational</span>
            </div>
          </div>
        </motion.div>

        {/* Integration Cards */}
        <motion.div variants={item}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Connected Systems</p>
          <div className="grid grid-cols-6 gap-2">
            {INTEGRATIONS.map(int => (
              <div key={int.name} className="rounded-lg border border-slate-200 bg-white p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <int.icon size={14} className="text-slate-500" />
                  <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT[int.status])} />
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">{int.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{int.version}</p>
                <p className="text-[10px] text-slate-400 mt-1">Synced {int.lastSync}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* API Key */}
        <motion.div variants={item} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={14} className="text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">API Key</span>
              <span className="rounded bg-green-50 border border-green-200 px-1.5 py-0.5 text-[9px] font-medium text-green-700">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">ztb_live_••••••••••••4f8a</code>
              <button className="rounded-md p-1 hover:bg-slate-100 transition-colors">
                <Copy size={12} className="text-slate-400" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Endpoints Table */}
        <motion.div variants={item} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity size={13} className="text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">API Endpoints</span>
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-600">{API_ENDPOINTS.length}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {API_ENDPOINTS.map((ep, i) => (
              <motion.div
                key={ep.path + ep.method}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 transition-colors text-xs"
              >
                <span className={cn("rounded px-1.5 py-0.5 font-mono text-[10px] font-bold w-12 text-center", METHOD_COLORS[ep.method])}>
                  {ep.method}
                </span>
                <code className="font-mono text-slate-700 font-medium min-w-[200px]">{ep.path}</code>
                <span className="text-slate-400 flex-1 truncate">{ep.description}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[ep.status])} />
                <span className="text-slate-400 font-mono w-14 text-right">{ep.latency}</span>
                <span className="text-slate-400 font-mono w-16 text-right">{ep.calls24h.toLocaleString()}/d</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
