"use client"

import { useState, useEffect, useRef } from "react"
import { INBOX_EMAILS, DEMO_TRIGGER_EMAILS, type InboxEmail, type EmailTag } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, MailOpen, Tag, Clock, Package, ChevronLeft, Brain, AlertTriangle, CheckCircle2, ArrowRight, CheckCircle, Loader2, RefreshCw, FileText, Paperclip, Sparkles, Play } from "lucide-react"
import { generateSLI, generatePackingList, generateCustomsDeclaration, generateSAPShipmentOrder, generateBookingConfirmation, generateRejectionNotice, generateRateAdvisory, generateExceptionReport, generateEDIStatus } from "@/lib/pdf-generator"

const TAG_CONFIG: Record<EmailTag, { label: string; color: string }> = {
  sap:       { label: "SAP",       color: "bg-blue-50 border-blue-200 text-blue-700" },
  carrier:   { label: "Carrier",   color: "bg-teal-50 border-teal-200 text-teal-700" },
  booking:   { label: "Booking",   color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  rejection: { label: "Rejection", color: "bg-red-50 border-red-200 text-red-700" },
  rate:      { label: "Rate",      color: "bg-amber-50 border-amber-200 text-amber-700" },
  agent:     { label: "Agent",     color: "bg-purple-50 border-purple-200 text-purple-700" },
}

// Extracts the first BKG-XXXXX from an email body
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
}

export function EmailInboxPage({ onOpenTracking, onMarkRead, dynamicEmails = [], onReturnToFlow, onStartDemo }: EmailInboxPageProps) {
  const dynamicAsInbox: InboxEmail[] = dynamicEmails.map((e) => ({
    id: e.id, from: e.from, fromName: e.fromName, subject: e.subject, body: e.body,
    timestamp: e.timestamp, read: e.read, tag: e.tag as EmailTag, tags: e.tags as EmailTag[],
    shipmentId: e.shipmentId, shipmentRef: e.shipmentRef,
  }))
  const [emails, setEmails] = useState<InboxEmail[]>(INBOX_EMAILS)
  // Prepend demo trigger emails at top, then dynamic, then regular
  const allEmails = [...DEMO_TRIGGER_EMAILS, ...dynamicAsInbox, ...emails]

  // Extended AI analysis state for demo trigger emails
  const [demoAnalysisPhase, setDemoAnalysisPhase] = useState(0) // 0=none, 1-4=phases, 5=done
  const [demoAnalysisDone, setDemoAnalysisDone] = useState(false)
  const [selected, setSelected] = useState<InboxEmail | null>(null)
  const [activeTagFilter, setActiveTagFilter] = useState<EmailTag | null>(null)
  const [analyzingEmail, setAnalyzingEmail] = useState<string | null>(null)
  const [analyzedEmails, setAnalyzedEmails] = useState<Record<string, string>>({})
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  // Task 5a: AI thinking animation on email click
  const [emailThinking, setEmailThinking] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<InboxEmail | null>(null)

  // Task 4: Negotiation spinner in inbox for rate-mismatch replies
  const [negoInboxActive, setNegoInboxActive] = useState(false)
  const [negoInboxProgress, setNegoInboxProgress] = useState(0)
  const [negoInboxStatus, setNegoInboxStatus] = useState("")
  const [negoInboxComplete, setNegoInboxComplete] = useState(false)
  const negoTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Start negotiation spinner when rate-mismatch reply email is selected
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
      timers.push(setTimeout(() => {
        setNegoInboxProgress((i + 1) * 25)
        setNegoInboxStatus(status)
      }, i * 1200))
    })
    timers.push(setTimeout(() => {
      setNegoInboxComplete(true)
      setNegoInboxStatus("Negotiation complete — rate locked in")
    }, statuses.length * 1200))
    // Auto-return to flow after completion
    timers.push(setTimeout(() => {
      onReturnToFlow?.()
    }, statuses.length * 1200 + 2000))
    negoTimersRef.current = timers

    return () => timers.forEach(clearTimeout)
  }, [selected?.id])

  // PDF attachment opener
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

  const filteredEmails = activeTagFilter
    ? allEmails.filter((e) => e.tag === activeTagFilter || e.tags.includes(activeTagFilter))
    : allEmails

  const unreadCount = allEmails.filter((e) => !e.read).length

  // Check if selected email is a demo reply that should show AI analysis + return button
  const isDemoReply = selected?.id.startsWith("DEMO-INBOX-")

  const ANALYSIS_PHASES_DEMO = [
    "Extracting shipment data from PDF...",
    "Analyzing booking requirements...",
    "Checking contract compliance (CCR-01)...",
    "Matching to workflow scenario...",
  ]
  const ANALYSIS_PHASES_REGULAR = [
    "Reading email content...",
    "Cross-referencing with procurement data...",
    "Generating resolution summary...",
  ]
  const activePhases = pendingEmail?.scenarioId ? ANALYSIS_PHASES_DEMO : ANALYSIS_PHASES_REGULAR
  const totalPhases = activePhases.length

  const handleSelect = (email: InboxEmail) => {
    // Reset demo analysis state
    setDemoAnalysisPhase(0)
    setDemoAnalysisDone(false)

    if (email.scenarioId) {
      // Demo trigger email — extended AI analysis (2.5s with 4 phases)
      setEmailThinking(true)
      setPendingEmail(email)
      setSelected(null)
      if (!email.read) onMarkRead?.(email.id)

      let phase = 1
      setDemoAnalysisPhase(1)
      const interval = setInterval(() => {
        phase++
        if (phase <= 4) {
          setDemoAnalysisPhase(phase)
        } else {
          clearInterval(interval)
          setDemoAnalysisPhase(5)
          setDemoAnalysisDone(true)
          setSelected(email)
          setEmailThinking(false)
          setPendingEmail(null)
        }
      }, 600)
      return
    }

    // Regular email — multi-step AI analysis (2.5s with 3 phases)
    setEmailThinking(true)
    setPendingEmail(email)
    setSelected(null)
    if (!email.read) onMarkRead?.(email.id)
    setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e))
    let regPhase = 1
    setDemoAnalysisPhase(1)
    const regInterval = setInterval(() => {
      regPhase++
      if (regPhase <= 3) {
        setDemoAnalysisPhase(regPhase)
      } else {
        clearInterval(regInterval)
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
      if (extracted) {
        setAnalyzedEmails((prev) => ({ ...prev, [email.id]: extracted }))
      }
      setAnalyzingEmail(null)
    }, 2000)
  }

  // Determine if the selected email should show the AI analysis banner
  const showAnalysisBanner = selected && !selected.shipmentId && extractBookingId(selected.body) !== null
  const isAnalyzing = selected ? analyzingEmail === selected.id : false
  const analysisResult = selected ? analyzedEmails[selected.id] : null

  // All unique tags for filter bar
  const allTags = Object.keys(TAG_CONFIG) as EmailTag[]

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
    <div className="flex-1 overflow-hidden bg-[#F8F9FA] flex flex-col">
      <div className="p-6 pb-3 max-w-[1100px] mx-auto w-full">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Mail size={16} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Inbox</h2>
              <p className="text-xs text-gray-400">SAP requirements, carrier confirmations, and agent alerts</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold bg-blue-600 text-white rounded-full px-2.5 py-1">
              {unreadCount} unread
            </span>
          )}
        </motion.div>

        {/* Tag filter bar */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={() => setActiveTagFilter(null)}
            className={cn(
              "text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors",
              activeTagFilter === null
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            )}
          >
            All ({emails.length})
          </button>
          {allTags.map((tag) => {
            const count = emails.filter((e) => e.tag === tag || e.tags.includes(tag)).length
            if (count === 0) return null
            const cfg = TAG_CONFIG[tag]
            return (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className={cn(
                  "text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors",
                  activeTagFilter === tag
                    ? cfg.color
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                )}
              >
                {cfg.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden max-w-[1100px] mx-auto w-full px-6 pb-6 gap-4">
        {/* Email list */}
        <div className={cn(
          "flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shrink-0",
          selected ? "w-72" : "flex-1"
        )}>
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              {filteredEmails.length} messages
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredEmails.map((email) => {
              const tagCfg = TAG_CONFIG[email.tag] ?? { label: email.tag || "Other", color: "bg-gray-50 border-gray-200 text-gray-700" }
              const isSelected = selected?.id === email.id || pendingEmail?.id === email.id
              return (
                <button
                  key={email.id}
                  onClick={() => handleSelect(email)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    isSelected && "bg-blue-50/60 border-l-2 border-l-blue-500",
                    !email.read && "bg-white"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 shrink-0">
                      {email.read
                        ? <MailOpen size={13} className="text-gray-300" />
                        : <Mail size={13} className="text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={cn("text-xs truncate", email.read ? "text-gray-500 font-normal" : "text-gray-800 font-semibold")}>
                          {email.fromName}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">{email.timestamp}</span>
                      </div>
                      <div className={cn("text-[11px] mb-1 truncate", email.read ? "text-gray-500" : "text-gray-700 font-medium")}>
                        {email.subject}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", tagCfg.color)}>
                          {tagCfg.label}
                        </span>
                        {email.shipmentId && (
                          <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                            {email.shipmentId}
                          </span>
                        )}
                        {/* PDF attachment badge */}
                        {email.attachments && email.attachments.length > 0 && (
                          <span className="text-[9px] text-red-600 bg-red-50 border border-red-200 flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <Paperclip size={8} /> PDF
                          </span>
                        )}
                        {/* Demo scenario badge */}
                        {email.scenarioId && (
                          <span className="text-[9px] text-white bg-[#0000B3] flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <Sparkles size={8} /> Demo
                          </span>
                        )}
                        {/* AI Ready badge for emails without registered booking */}
                        {!email.shipmentId && !email.scenarioId && extractBookingId(email.body) && (
                          <span className="text-[9px] text-white bg-indigo-600 flex items-center gap-0.5 font-semibold rounded-full px-1.5 py-0.5">
                            <Brain size={8} /> AI Analyze
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

        {/* AI Analysis Animation */}
        {emailThinking && pendingEmail && (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center">
            <div className="w-full max-w-sm space-y-6 animate-in fade-in duration-200 px-6">
              {/* Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Sparkles size={28} className="text-[#0000B3]" />
                  </motion.div>
                </div>
              </div>
              {/* Title */}
              <p className="text-center text-[15px] font-semibold text-gray-800">AI Agent Analyzing Email</p>
              {/* Steps */}
              <div className="space-y-3">
                {activePhases.map((phase, i) => {
                  const isDone = demoAnalysisPhase > i + 1
                  const isActive = demoAnalysisPhase === i + 1
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.3, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors duration-300",
                        isDone ? "bg-green-100 text-green-700" : isActive ? "bg-[#0000B3]/10 text-[#0000B3]" : "bg-gray-100 text-gray-400"
                      )}>
                        {isDone ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                      <span className={cn(
                        "text-[13px] transition-colors duration-300",
                        isDone ? "text-green-700 font-medium" : isActive ? "text-[#0000B3] font-medium" : "text-gray-400"
                      )}>
                        {phase}
                      </span>
                      {isActive && (
                        <Loader2 size={12} className="text-[#0000B3] animate-spin ml-auto shrink-0" />
                      )}
                    </motion.div>
                  )
                })}
              </div>
              {/* Progress bar */}
              <div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#0000B3] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (demoAnalysisPhase / (totalPhases + 1)) * 100)}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  {Math.min(100, Math.round((demoAnalysisPhase / (totalPhases + 1)) * 100))}% complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email detail */}
        {!emailThinking && selected ? (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {/* Detail header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 leading-snug">{selected.subject}</h3>
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span>From: <span className="text-gray-600 font-medium">{selected.fromName}</span> &lt;{selected.from}&gt;</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {selected.timestamp}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", (TAG_CONFIG[selected.tag] ?? { color: "bg-gray-50 border-gray-200 text-gray-700" }).color)}>
                  <Tag size={9} className="inline mr-1" />{(TAG_CONFIG[selected.tag] ?? { label: selected.tag }).label}
                </span>
                {/* Show all secondary tags */}
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

              {/* PDF Attachments — clickable to open PDF */}
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
                        <p className="text-[10px] text-slate-500">Shipment requirements extracted from PDF — ready to initiate booking workflow</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onStartDemo?.(selected.scenarioId!)}
                      className="flex items-center gap-2 rounded-xl bg-[#0000B3] hover:bg-[#00009A] px-5 py-2.5 text-sm font-semibold text-white transition-colors shadow-sm"
                    >
                      <Play size={14} />
                      Start Booking
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* AI Analysis Banner */}
            {showAnalysisBanner && !analysisResult && (
              <div className={cn(
                "mx-5 mt-4 rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                isAnalyzing
                  ? "border-indigo-200 bg-indigo-50"
                  : "border-amber-200 bg-amber-50"
              )}>
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <Brain size={15} className="text-indigo-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-indigo-700">Analyzing booking reference...</p>
                      <div className="flex items-end gap-[3px] mt-0.5">
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                            style={{ animationDelay: `${d}ms`, animationDuration: "900ms" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800">Booking reference detected. AI analysis ready.</p>
                        <p className="text-[11px] text-amber-600">Booking ID found in body -- not yet linked in system</p>
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

            {/* Analysis Result Card */}
            {analysisResult && (
              <div className="mx-5 mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                  <p className="text-xs font-semibold text-green-800">AI Analysis Complete</p>
                </div>
                <div className="space-y-1 text-[11px] text-green-700 pl-5">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Booking ID identified: <span className="font-mono font-bold text-green-800">{analysisResult}</span></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={10} className="text-green-500" />
                    <span>Booking linked to monitoring</span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenTracking?.(analysisResult)}
                  className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors"
                >
                  Open Booking Detail <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {selected.body}
              </pre>

              {/* AI Analysis + Return to Flow for demo reply emails */}
              {isDemoReply && selected.id.includes("-RM-") && (
                <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {/* Negotiation spinner for rate-mismatch */}
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
        ) : (
          <div className="hidden" />
        )}

        {/* Empty state when nothing selected and list is shown full-width */}
        {!selected && (
          <div className="hidden" />
        )}
      </div>
    </div>
  )
}
