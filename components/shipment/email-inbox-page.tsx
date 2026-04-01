"use client"

import { useState, useEffect, useRef } from "react"
import { INBOX_EMAILS, DEMO_TRIGGER_EMAILS, type InboxEmail, type EmailTag } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Mail, MailOpen, Tag, Clock, Package, ChevronLeft, Brain, AlertTriangle, CheckCircle2, ArrowRight, CheckCircle, Loader2, RefreshCw, FileText, Paperclip, Sparkles, Play, Send as SendIcon } from "lucide-react"
import { generateSLI, generatePackingList, generateCustomsDeclaration, generateSAPShipmentOrder, generateBookingConfirmation, generateRejectionNotice, generateRateAdvisory, generateExceptionReport, generateEDIStatus } from "@/lib/pdf-generator"

const TAG_CONFIG: Record<EmailTag, { label: string; color: string }> = {
  sap:       { label: "SAP",       color: "bg-blue-50 border-blue-200 text-blue-700" },
  carrier:   { label: "Carrier",   color: "bg-teal-50 border-teal-200 text-teal-700" },
  booking:   { label: "Booking",   color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  rejection: { label: "Rejection", color: "bg-red-50 border-red-200 text-red-700" },
  rate:      { label: "Rate",      color: "bg-amber-50 border-amber-200 text-amber-700" },
  agent:     { label: "Agent",     color: "bg-purple-50 border-purple-200 text-purple-700" },
}

function extractBookingId(body: string): string | null {
  const match = body.match(/BKG-\d+/)
  return match ? match[0] : null
}

interface EmailInboxPageProps {
  onOpenTracking?: (shipmentId: string) => void
  onMarkRead?: (emailId: string) => void
  dynamicEmails?: Array<{ id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }>
  onReturnToFlow?: () => void
  onStartDemo?: (scenarioId: string) => void
  onSwitchToSent?: () => void
}

export function EmailInboxPage({ onOpenTracking, onMarkRead, dynamicEmails = [], onReturnToFlow, onStartDemo, onSwitchToSent }: EmailInboxPageProps) {
  const dynamicAsInbox: InboxEmail[] = dynamicEmails.map((e) => ({
    id: e.id, from: e.from, fromName: e.fromName, subject: e.subject, body: e.body,
    timestamp: e.timestamp, read: e.read, tag: e.tag as EmailTag, tags: e.tags as EmailTag[],
    shipmentId: e.shipmentId, shipmentRef: e.shipmentRef,
  }))
  const [emails, setEmails] = useState<InboxEmail[]>(INBOX_EMAILS)
  const allEmails = [...DEMO_TRIGGER_EMAILS, ...dynamicAsInbox, ...emails]

  const [demoAnalysisPhase, setDemoAnalysisPhase] = useState(0)
  const [demoAnalysisDone, setDemoAnalysisDone] = useState(false)
  const [selected, setSelected] = useState<InboxEmail | null>(null)
  const [analyzingEmail, setAnalyzingEmail] = useState<string | null>(null)
  const [analyzedEmails, setAnalyzedEmails] = useState<Record<string, string>>({})
  const [initialLoading, setInitialLoading] = useState(true)
  const [sidebarFolder, setSidebarFolder] = useState<"inbox" | "sent">("inbox")

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const [emailThinking, setEmailThinking] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<InboxEmail | null>(null)

  // Negotiation spinner state
  const [negoInboxActive, setNegoInboxActive] = useState(false)
  const [negoInboxProgress, setNegoInboxProgress] = useState(0)
  const [negoInboxStatus, setNegoInboxStatus] = useState("")
  const [negoInboxComplete, setNegoInboxComplete] = useState(false)
  const negoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if (!selected?.id.includes("-RM-") || !selected?.id.startsWith("DEMO-INBOX-")) return
    if (negoInboxActive || negoInboxComplete) return
    setNegoInboxActive(true)
    const statuses = [
      "Connecting to Maersk rate desk...",
      "Validating counter-offer against market data...",
      "Carrier reviewing proposal...",
      "Rate accepted — updating booking parameters...",
    ]
    const timers: ReturnType<typeof setTimeout>[] = []
    statuses.forEach((status, i) => {
      timers.push(setTimeout(() => { setNegoInboxProgress((i + 1) * 25); setNegoInboxStatus(status) }, i * 1200))
    })
    timers.push(setTimeout(() => { setNegoInboxComplete(true); setNegoInboxStatus("Negotiation complete — rate locked in") }, statuses.length * 1200))
    timers.push(setTimeout(() => { onReturnToFlow?.() }, statuses.length * 1200 + 2000))
    negoTimersRef.current = timers
    return () => timers.forEach(clearTimeout)
  }, [selected?.id])

  const openAttachmentPdf = (filename: string) => {
    const ref = filename.replace(/\.pdf$/, "")
    if (ref.startsWith("SAP_Shipment_Order_") || ref.startsWith("Shipment_Requirement_")) return generateSAPShipmentOrder(ref.replace(/^(SAP_Shipment_Order_|Shipment_Requirement_)/, ""))
    if (ref.startsWith("Booking_Confirmation_")) return generateBookingConfirmation(ref.replace("Booking_Confirmation_", ""))
    if (ref.startsWith("Rejection_Notice_")) return generateRejectionNotice(ref.replace("Rejection_Notice_", ""))
    if (ref.startsWith("Rate_Advisory_") || ref.startsWith("Rate_Analysis_")) return generateRateAdvisory(ref.replace(/^(Rate_Advisory_|Rate_Analysis_)/, ""))
    if (ref.startsWith("Exception_Report_") || ref.startsWith("Validation_Report_") || ref.startsWith("Portal_Diagnostics_") || ref.startsWith("Capacity_Report_")) return generateExceptionReport(ref.replace(/^(Exception_Report_|Validation_Report_|Portal_Diagnostics_|Capacity_Report_)/, ""))
    if (ref.startsWith("EDI_Status_")) return generateEDIStatus(ref.replace("EDI_Status_", ""))
    if (ref.startsWith("Packing_List_")) return generatePackingList()
    generateSLI()
  }

  const isDemoReply = selected?.id.startsWith("DEMO-INBOX-")

  const ANALYSIS_PHASES = [
    "Reading email content...",
    "Cross-referencing with procurement data...",
    "Generating resolution summary...",
  ]

  const handleSelect = (email: InboxEmail) => {
    setDemoAnalysisPhase(0)
    setDemoAnalysisDone(false)

    setEmailThinking(true)
    setPendingEmail(email)
    setSelected(null)
    if (!email.read) onMarkRead?.(email.id)
    if (!email.scenarioId) {
      setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e))
    }

    // All emails use 3-phase animation
    let phase = 1
    setDemoAnalysisPhase(1)
    const interval = setInterval(() => {
      phase++
      if (phase <= 3) {
        setDemoAnalysisPhase(phase)
      } else {
        clearInterval(interval)
        setDemoAnalysisPhase(4)
        setDemoAnalysisDone(true)
        setSelected(email)
        setEmailThinking(false)
        setPendingEmail(null)
      }
    }, 700)
  }

  const handleAnalyze = (email: InboxEmail) => {
    setAnalyzingEmail(email.id)
    setTimeout(() => {
      const extracted = extractBookingId(email.body)
      if (extracted) setAnalyzedEmails((prev) => ({ ...prev, [email.id]: extracted }))
      setAnalyzingEmail(null)
    }, 2000)
  }

  const showAnalysisBanner = selected && !selected.shipmentId && extractBookingId(selected.body) !== null
  const isAnalyzing = selected ? analyzingEmail === selected.id : false
  const analysisResult = selected ? analyzedEmails[selected.id] : null

  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0000B3]/10">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <RefreshCw size={20} className="text-[#0000B3]" />
            </motion.div>
          </div>
          <p className="text-sm font-medium text-slate-600">Loading inbox</p>
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
    <div className="flex-1 overflow-hidden bg-[#F8F9FA] flex h-full">
      {/* Left sidebar — FOLDERS */}
      <div className="w-[140px] shrink-0 border-r border-gray-200 bg-white py-5 px-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Folders</p>
        <button
          onClick={() => setSidebarFolder("inbox")}
          className={cn(
            "flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mb-1",
            sidebarFolder === "inbox" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Mail size={14} /> Inbox
        </button>
        <button
          onClick={() => { setSidebarFolder("sent"); onSwitchToSent?.() }}
          className={cn(
            "flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
            sidebarFolder === "sent" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <SendIcon size={14} /> Sent
        </button>
      </div>

      {/* Email list */}
      <div className={cn("flex flex-col border-r border-gray-200 bg-white shrink-0 overflow-hidden", selected || emailThinking ? "w-[340px]" : "w-[340px]")}>
        {/* List header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-gray-500" />
            <span className="text-[14px] font-semibold text-gray-800">Inbox</span>
          </div>
          <span className="text-[12px] text-gray-400">{allEmails.length} messages</span>
        </div>

        {/* Email items */}
        <div className="overflow-y-auto flex-1">
          {allEmails.map((email) => {
            const isSelected = selected?.id === email.id || pendingEmail?.id === email.id
            const initial = email.fromName.charAt(0).toUpperCase()
            const previewText = email.body.split("\n").find(l => l.trim()) || ""
            const attCount = email.attachments?.length || 0
            const hasAiBadge = email.scenarioId || (!email.shipmentId && extractBookingId(email.body))

            return (
              <button
                key={email.id}
                onClick={() => handleSelect(email)}
                className={cn(
                  "w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  isSelected && "bg-blue-50 border-l-[3px] border-l-blue-500",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar circle */}
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[12px] font-bold text-white">{initial}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Sender + date */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={cn("text-[13px] truncate", !email.read ? "font-semibold text-gray-900" : "font-medium text-gray-600")}>
                        {email.fromName}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">{email.timestamp}</span>
                    </div>

                    {/* Subject */}
                    <div className={cn("text-[12px] truncate mb-0.5", !email.read ? "text-gray-800 font-medium" : "text-gray-500")}>
                      {email.subject}
                    </div>

                    {/* Preview text */}
                    <div className="text-[11px] text-gray-400 truncate mb-1.5">
                      {previewText.slice(0, 60)}{previewText.length > 60 ? "..." : ""}
                    </div>

                    {/* Bottom row: attachments + AI badge */}
                    <div className="flex items-center gap-2">
                      {attCount > 0 && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Paperclip size={10} /> {attCount}
                        </span>
                      )}
                      {hasAiBadge && (
                        <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-semibold">
                          <Sparkles size={9} /> AI
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right panel: AI animation or email detail */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* AI Analysis Animation */}
        {emailThinking && pendingEmail && (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="w-full max-w-md space-y-8 px-8">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-[#EEEEF8] flex items-center justify-center">
                  <Sparkles size={32} className="text-[#5B5BD6]" />
                </div>
              </div>

              {/* Title */}
              <p className="text-center text-[16px] font-semibold text-gray-900">AI Agent Analyzing Email</p>

              {/* Steps */}
              <div className="space-y-4">
                {ANALYSIS_PHASES.map((phase, i) => {
                  const isDone = demoAnalysisPhase > i + 1
                  const isActive = demoAnalysisPhase === i + 1
                  const isFuture = demoAnalysisPhase <= i
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 transition-all duration-500",
                        isDone
                          ? "bg-emerald-100 text-emerald-600"
                          : isActive
                            ? "bg-[#5B5BD6]/15 text-[#5B5BD6]"
                            : "bg-gray-100 text-gray-400"
                      )}>
                        {isDone ? <CheckCircle2 size={15} /> : i + 1}
                      </div>
                      <span className={cn(
                        "text-[14px] transition-all duration-500",
                        isDone ? "text-emerald-600 font-medium" : isActive ? "text-gray-700 font-medium" : "text-gray-400"
                      )}>
                        {phase}
                      </span>
                      {isActive && <Loader2 size={14} className="text-[#5B5BD6] animate-spin ml-auto shrink-0" />}
                    </div>
                  )
                })}
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B5BD6] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.round((demoAnalysisPhase / 4) * 100))}%` }}
                  />
                </div>
                <p className="text-[12px] text-gray-400 text-center mt-3">
                  {Math.min(100, Math.round((demoAnalysisPhase / 4) * 100))}% complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email detail */}
        {!emailThinking && selected && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Detail header */}
            <div className="px-6 py-5 border-b border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-2 leading-snug">{selected.subject}</h3>
              <div className="flex items-center gap-3 text-[12px] text-gray-400">
                <span>From: <span className="text-gray-700 font-medium">{selected.fromName}</span> &lt;{selected.from}&gt;</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {selected.timestamp}</span>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", (TAG_CONFIG[selected.tag] ?? { color: "bg-gray-50 border-gray-200 text-gray-700" }).color)}>
                  <Tag size={9} className="inline mr-1" />{(TAG_CONFIG[selected.tag] ?? { label: selected.tag }).label}
                </span>
                {selected.tags
                  .filter((t) => t !== selected.tag && TAG_CONFIG[t])
                  .map((t) => (
                    <span key={t} className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TAG_CONFIG[t].color)}>
                      {TAG_CONFIG[t].label}
                    </span>
                  ))}
                {selected.shipmentId && (
                  <button
                    onClick={() => onOpenTracking?.(selected.shipmentId!)}
                    className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Package size={9} /> {selected.shipmentId}
                  </button>
                )}
              </div>

              {/* PDF Attachments */}
              {selected.attachments && selected.attachments.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {selected.attachments.map(att => (
                    <button
                      key={att}
                      onClick={() => openAttachmentPdf(att)}
                      className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-[11px] hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <FileText size={13} className="text-red-500 shrink-0" />
                      <span className="font-medium text-red-700">{att}</span>
                      <span className="text-red-400 text-[9px] ml-1">PDF</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Start Booking button for demo trigger emails */}
              {selected.scenarioId && demoAnalysisDone && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#0000B3]/10 flex items-center justify-center">
                        <Sparkles size={14} className="text-[#0000B3]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">AI Analysis Complete</p>
                        <p className="text-[10px] text-slate-500">Shipment requirements extracted — ready to initiate booking</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onStartDemo?.(selected.scenarioId!)}
                      className="flex items-center gap-2 rounded-xl bg-[#0000B3] hover:bg-[#00009A] px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
                    >
                      <Play size={14} /> Start Booking
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* AI Analysis Banner */}
            {showAnalysisBanner && !analysisResult && (
              <div className={cn(
                "mx-6 mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                isAnalyzing ? "border-indigo-200 bg-indigo-50" : "border-amber-200 bg-amber-50"
              )}>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Brain size={15} className="text-indigo-500 animate-pulse shrink-0" />
                    <p className="text-xs font-semibold text-indigo-700">Analyzing booking reference...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Booking reference detected. AI analysis ready.</p>
                        <p className="text-[11px] text-amber-600">Booking ID found in body — not yet linked in system</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAnalyze(selected)}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      <Brain size={12} /> Analyze with AI
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Analysis Result */}
            {analysisResult && (
              <div className="mx-6 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs font-semibold text-green-800">AI Analysis Complete</p>
                </div>
                <div className="space-y-1 text-[11px] text-green-700 pl-5">
                  <div className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500" /><span>Booking ID: <span className="font-mono font-bold text-green-800">{analysisResult}</span></span></div>
                  <div className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500" /><span>Booking linked to monitoring</span></div>
                </div>
                <button onClick={() => onOpenTracking?.(analysisResult)} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors">
                  Open Booking Detail <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <pre className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {selected.body}
              </pre>

              {/* Rate negotiation spinner */}
              {isDemoReply && selected.id.includes("-RM-") && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="p-4 bg-[#0f1623] rounded-xl border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                      {negoInboxComplete ? <CheckCircle size={16} className="text-emerald-400" /> : <Brain size={16} className="text-violet-400 animate-pulse" />}
                      <span className="text-[13px] font-bold text-white">{negoInboxComplete ? "Negotiation Complete" : "AI Negotiating Rate"}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                      <div className={cn("h-full rounded-full transition-all duration-700 ease-out", negoInboxComplete ? "bg-emerald-500" : "bg-violet-500")} style={{ width: `${negoInboxProgress}%` }} />
                    </div>
                    <div className="text-[11px] text-slate-400 mb-3">{negoInboxStatus || "Initializing..."}</div>
                    {negoInboxComplete && (
                      <div className="space-y-1.5 animate-in fade-in duration-300">
                        {[
                          { label: "Market Rate (30d avg)", value: "$3,480", badge: "Benchmark", color: "text-slate-300" },
                          { label: "Carrier Quote", value: "$3,340", badge: "-4% vs market", color: "text-amber-300" },
                          { label: "Counter-Offer", value: "$3,024", badge: "Sent", color: "text-violet-300" },
                          { label: "Carrier Accepted", value: "$3,024", badge: "Accepted", color: "text-emerald-300" },
                        ].map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-800/50">
                            <div className="flex items-center gap-2">
                              {r.badge === "Accepted" ? <CheckCircle size={12} className="text-emerald-400" /> : <div className="w-3 h-3 rounded-full border border-slate-600" />}
                              <span className={cn("text-[11px] font-medium", r.color)}>{r.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-bold text-white">{r.value}</span>
                              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                                r.badge === "Accepted" ? "bg-emerald-900/50 text-emerald-300" : r.badge === "Sent" ? "bg-violet-900/50 text-violet-300" : "bg-slate-700 text-slate-400"
                              )}>{r.badge}</span>
                            </div>
                          </div>
                        ))}
                        <div className="mt-2 px-2 py-1.5 bg-emerald-900/30 rounded-lg border border-emerald-800/50">
                          <span className="text-[11px] text-emerald-300 font-medium">Savings: <span className="font-bold">$316/container</span> ($632 total)</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {negoInboxComplete && (
                    <div className="flex items-center gap-2 justify-center py-1 text-[11px] text-emerald-600 font-medium animate-pulse">
                      <Loader2 size={12} className="animate-spin" /> Returning to booking flow...
                    </div>
                  )}
                </div>
              )}
              {isDemoReply && !selected.id.includes("-RM-") && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Brain size={14} className="text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">AI Analysis</span>
                    </div>
                    <div className="text-[12px] text-indigo-800 leading-relaxed">
                      {selected.id.includes("-MD-") && "Shipper contact information confirmed by Suzhou Plant team. Data cross-validated with Plant Directory — Li Wei is the designated logistics coordinator. Confidence: 95%. Ready to proceed with booking."}
                      {selected.id.includes("DEMO-INBOX") && !selected.id.includes("-MD-") && "Carrier response received and validated. Booking reference confirmed. All data consistent with SAP TM order."}
                    </div>
                  </div>
                  <button
                    onClick={onReturnToFlow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowRight size={14} /> Return to Booking Flow
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state — static AI spinner (matching reference) */}
        {!emailThinking && !selected && (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="w-full max-w-md space-y-8 px-8">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-[#EEEEF8] flex items-center justify-center">
                  <Sparkles size={32} className="text-[#5B5BD6]" />
                </div>
              </div>
              {/* Title */}
              <p className="text-center text-[16px] font-semibold text-gray-900">AI Agent Analyzing Email</p>
              {/* Steps — all greyed out */}
              <div className="space-y-4">
                {ANALYSIS_PHASES.map((phase, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 bg-gray-100 text-gray-400">
                      {i + 1}
                    </div>
                    <span className="text-[14px] text-gray-400">{phase}</span>
                  </div>
                ))}
              </div>
              {/* Progress bar — empty */}
              <div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden" />
                <p className="text-[12px] text-gray-400 text-center mt-3">0% complete</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
