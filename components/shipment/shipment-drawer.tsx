"use client"

import { useState, useEffect, useRef } from "react"
import { type BookingRequest, DEMO_STEP_DETAILS, DEMO_SCENARIOS, DEMO_EXCEPTION_RESOLUTIONS, type DemoStepDetail } from "@/lib/mock-data"
import { DemoModal, CompletionModal } from "./demo-modal"
import { generateSLI, generatePackingList, generateCustomsDeclaration } from "@/lib/pdf-generator"
import {
  SeverityBadge, ModeBadge, ExceptionBadge, ReasonChips,
  BookingStatusBadge, CarrierBadge, SourceBadge, OTMStatusBadge,
} from "./shared"
import { cn } from "@/lib/utils"
import {
  X, Brain, CheckCircle, Send, AlertOctagon, ArrowRight,
  Check, Loader2, FileText, Anchor, Truck, Upload, Bell,
  Monitor, Search, ShieldCheck, Maximize2, Minimize2,
  MapPin, RefreshCw, ChevronRight, Zap, Clock, Calendar,
  Mail, TrendingUp, ArrowUp, ArrowDown,
  Play, Pause, RotateCcw, AlertTriangle, Target, Timer,
  ChevronDown, Eye, Sparkles, Ship, Plane, Package, CheckCircle2,
} from "lucide-react"
import { ModeIcon } from "./shared"
import { EmailComposer } from "./email-composer"
import { type SentEmailItem } from "./email-sent-page"

// Keep Shipment alias
type Shipment = BookingRequest

interface ActionState {
  bookingApproved: boolean
  notified: boolean
  escalated: boolean
  otmSynced: boolean
  emailSent: boolean
}

interface ShipmentDrawerProps {
  shipment: Shipment | null
  onClose: () => void
  onOpenWeather?: (shipmentId: string) => void
  onSendNotification?: (email: SentEmailItem) => void
  onEtaApproved?: () => void
  onResumeWorkflow?: (shipmentId: string) => void
  // Demo booking mode
  bookingMode?: boolean
  demoStep?: number
  demoPaused?: boolean
  demoScenario?: string
  demoExceptionActive?: boolean
  onDemoStepAdvance?: (step: number) => void
  onDemoPause?: () => void
  onDemoResume?: () => void
  onDemoExceptionResolved?: () => void
  onDemoExceptionTriggered?: () => void
  onDemoComplete?: (elapsedTime: string) => void
  onNavigateView?: (view: string) => void
  onAddInboxEmail?: (email: { id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }) => void
  demoReturnedFromInbox?: boolean
  onDemoReturnedFromInboxConsumed?: () => void
}

const LOADING_STEPS = [
  {
    title: "Connecting to SAP/OTM",
    subtitle: "Pulling shipment requirement, commodity details & routing rules",
    items: ["SAP TM Gateway", "OTM Integration", "Routing Rules Engine"],
  },
  {
    title: "Evaluating carriers",
    subtitle: "Comparing rates, SLA scores & capacity across 4 carrier portals",
    items: ["Maersk Portal", "MSC Portal", "Hapag-Lloyd / CMA-CGM"],
  },
  {
    title: "Preparing booking submission",
    subtitle: "Generating optimal booking parameters & document checklist",
    items: ["Vessel Schedule Match", "Container Allocation", "Document Validation"],
  },
]

// Connection exception types get modified loading with portal failure
const CONNECTION_EXCEPTIONS = ["Portal Unavailable", "Credentials Expired"] as const
function getLoadingSteps(carrier: string) {
  return [
    {
      title: "Connecting to SAP/OTM",
      subtitle: "Pulling shipment requirement, commodity details & routing rules",
      items: ["SAP TM Gateway", "OTM Integration", "Routing Rules Engine"],
    },
    {
      title: "Connecting to carrier portals",
      subtitle: "Testing API connections to carrier booking systems",
      items: ["Maersk Portal", "MSC Portal", `${carrier} Portal`],
    },
    {
      title: "Preparing booking submission",
      subtitle: "Generating optimal booking parameters & document checklist",
      items: ["Vessel Schedule Match", "Container Allocation", "Document Validation"],
    },
  ]
}

// ─── Workflow Step Icons ──────────────────────────────────────────────────
const STEP_ICONS = [
  FileText,   // 1. Read requirement
  Search,     // 2. Identify carrier
  Monitor,    // 3. Portal login
  Anchor,     // 4. Complete booking
  Upload,     // 5. Upload docs
  ShieldCheck,// 6. Get confirmation
  Bell,       // 7. Notify + update SAP
  Truck,      // 8. Track status
]

function ThinkingDots() {
  return (
    <span className="inline-flex items-end gap-[3px] ml-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "900ms" }}
        />
      ))}
    </span>
  )
}

// ─── Reusable AI Thinking Skeleton ──────────────────────────────────────────
function AIThinkingSkeleton({ label = "AI analyzing" }: { label?: string }) {
  return (
    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 animate-pulse">
      <div className="flex items-center gap-1.5">
        <Brain size={13} className="text-blue-400 animate-pulse" />
        <span className="text-[11px] font-semibold text-blue-400">{label}<ThinkingDots /></span>
      </div>
    </div>
  )
}

export function ShipmentDrawer({ shipment, onClose, onOpenWeather, onSendNotification, onEtaApproved, onResumeWorkflow, bookingMode, demoStep, demoPaused, demoScenario, demoExceptionActive, onDemoStepAdvance, onDemoPause, onDemoResume, onDemoExceptionResolved, onDemoExceptionTriggered, onDemoComplete, onAddInboxEmail, onNavigateView, demoReturnedFromInbox, onDemoReturnedFromInboxConsumed }: ShipmentDrawerProps) {
  const [actions, setActions] = useState<ActionState>({
    bookingApproved: false,
    notified: false,
    escalated: false,
    otmSynced: false,
    emailSent: false,
  })
  const [resuming, setResuming] = useState(false)
  const [resumed, setResumed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingTick, setLoadingTick] = useState(0)
  const [expanded, setExpanded] = useState(bookingMode ?? false)
  // Req 5: Track reroute approval for timeline color change
  const [approvedReroute, setApprovedReroute] = useState(false)
  // Req 4: Notification confirmation card
  const [showNotifyConfirmation, setShowNotifyConfirmation] = useState(false)
  // Req 7: Auto-prompt notify after SAP/OTM push
  const [showNotifyPrompt, setShowNotifyPrompt] = useState(false)
  // Track what type of notification was sent
  const [notifyType, setNotifyType] = useState<"email" | "message" | "both" | null>(null)

  // Auto-expand when booking mode starts
  useEffect(() => {
    if (bookingMode) setExpanded(true)
  }, [bookingMode])

  useEffect(() => {
    setIsLoading(true)
    setLoadingTick(0)
    setActions({ bookingApproved: false, notified: false, escalated: false, otmSynced: false, emailSent: false })
    setApprovedReroute(false)
    setShowNotifyConfirmation(false)
    setShowNotifyPrompt(false)
    setNotifyType(null)
    setResuming(false)
    setResumed(false)
    const tick = setInterval(() => setLoadingTick((prev) => prev + 1), 340)
    const done = setTimeout(() => { clearInterval(tick); setIsLoading(false) }, 3200)
    return () => { clearInterval(tick); clearTimeout(done) }
  }, [shipment?.id])

  const loadingStep = Math.min(Math.floor(loadingTick / 3), 2)
  const loadingSubItem = loadingTick % 3

  if (!shipment) return null

  const handleAction = (key: keyof ActionState) => {
    setActions((prev) => ({ ...prev, [key]: true }))
  }

  // Req 7: After SAP/OTM sync, auto-show notify prompt
  const handleSyncOTM = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      handleAction("otmSynced")
      setShowNotifyPrompt(true)
    }, 1200)
  }

  // Req 5: Also set approvedReroute for timeline color change
  const handleApproveBooking = () => {
    handleAction("bookingApproved")
    setApprovedReroute(true)
    onEtaApproved?.()
  }

  // Send in-app message only
  const handleSendMessage = () => {
    handleAction("notified")
    setShowNotifyConfirmation(true)
    setShowNotifyPrompt(false)
    setNotifyType("message")
  }

  // Req 4: Show confirmation card after sending email notification
  const handleSendNotification = (email: SentEmailItem) => {
    handleAction("notified")
    handleAction("emailSent")
    setShowEmailModal(false)
    setShowNotifyConfirmation(true)
    setShowNotifyPrompt(false)
    // If notifyType was set to 'both', keep it; otherwise it's email-only
    if (notifyType !== "both") setNotifyType("email")
    onSendNotification?.(email)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <aside className={cn(
        "fixed bg-white shadow-2xl z-50 flex flex-col overflow-hidden transition-all duration-300",
        expanded
          ? "inset-0 m-auto w-[900px] max-w-[calc(100vw-80px)] h-[90vh] rounded-xl border border-gray-200"
          : "right-0 top-0 h-screen w-[520px] border-l border-gray-200"
      )}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ModeIcon mode={shipment.mode} size={18} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-800 text-sm">{shipment.id}</span>
                <BookingStatusBadge status={shipment.bookingStatus} />
                <SeverityBadge severity={shipment.severity} />
              </div>
              <p className="text-[11px] text-gray-500 truncate mt-0.5">
                {shipment.origin} → {shipment.destination} · {shipment.containerType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 transition-colors p-1" title={expanded ? "Collapse" : "Expand"}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Loading state ──────────────────────────────────────────── */}
        {isLoading && (() => {
          const isConnException = CONNECTION_EXCEPTIONS.includes(shipment.exceptionType as typeof CONNECTION_EXCEPTIONS[number])
          const steps = isConnException ? getLoadingSteps(shipment.carrier) : LOADING_STEPS
          // For connection exceptions: step 2 fails on last sub-item
          const failStep = isConnException ? 1 : -1  // step index that fails (0-based)
          const failItem = isConnException ? 2 : -1  // sub-item index that fails

          return (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            <Brain size={28} className="text-indigo-500 animate-pulse mb-4" />
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Agent analyzing booking<ThinkingDots />
            </p>
            <p className="text-xs text-gray-400 mb-6">Processing booking workflow data</p>

            <div className="w-full max-w-sm space-y-4">
              {steps.map((step, si) => {
                const isActive = si === loadingStep
                const isDone = si < loadingStep
                // For connection exceptions: step 2 (si=1) shows as failed after all its items are shown
                const isFailed = isConnException && si === failStep && isDone
                const isStepFailing = isConnException && si === failStep && isActive && loadingSubItem >= failItem

                return (
                  <div key={step.title} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                        isFailed ? "bg-red-500 border-red-500 text-white" :
                        isDone ? "bg-green-500 border-green-500 text-white" :
                        isStepFailing ? "bg-red-500 border-red-500 text-white" :
                        isActive ? "bg-indigo-500 border-indigo-500 text-white" :
                        "bg-white border-gray-300 text-gray-400"
                      )}>
                        {isFailed ? <X size={12} /> :
                         isDone ? <Check size={12} /> :
                         isStepFailing ? <X size={12} /> :
                         isActive ? <Loader2 size={12} className="animate-spin" /> : si + 1}
                      </div>
                      {si < steps.length - 1 && <div className={cn("w-0.5 flex-1 mt-1",
                        isFailed || isStepFailing ? "bg-red-300" :
                        isDone ? "bg-green-400" : "bg-gray-200"
                      )} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className={cn("text-xs font-semibold",
                        isFailed || isStepFailing ? "text-red-700" :
                        isDone || isActive ? "text-gray-800" : "text-gray-400"
                      )}>{step.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{step.subtitle}</p>
                      {(isActive || isDone || isFailed) && (
                        <div className="mt-1.5 space-y-1">
                          {step.items.map((item, ii) => {
                            const show = isDone || isFailed || (isActive && ii <= loadingSubItem)
                            const isFailedItem = isConnException && si === failStep && ii === failItem
                            const itemDone = isDone || isFailed || (isActive && ii < loadingSubItem)
                            return show ? (
                              <div key={item} className="flex items-center gap-1.5 text-[10px]">
                                {isFailedItem && (itemDone || isStepFailing) ? (
                                  <X size={10} className="text-red-500 shrink-0" />
                                ) : itemDone ? (
                                  <Check size={10} className="text-green-500 shrink-0" />
                                ) : (
                                  <Loader2 size={10} className="text-indigo-400 shrink-0 animate-spin" />
                                )}
                                <span className={cn(isFailedItem && (itemDone || isStepFailing) ? "text-red-600 font-medium" : "text-gray-500")}>
                                  {item}{isFailedItem && (itemDone || isStepFailing) ? (shipment.exceptionType === "Credentials Expired" ? " — Credentials expired" : " — API timeout") : ""}
                                </span>
                              </div>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        })()}

        {/* ── Content ──────── */}
        {bookingMode ? (
          <div className="flex-1 overflow-y-auto">
            <LiveBookingFlow
              shipment={shipment}
              demoStep={demoStep ?? 0}
              demoPaused={demoPaused ?? false}
              demoScenario={demoScenario ?? "happy-path"}
              demoExceptionActive={demoExceptionActive ?? false}
              onStepAdvance={onDemoStepAdvance}
              onPause={onDemoPause}
              onResume={onDemoResume}
              onExceptionResolved={onDemoExceptionResolved}
              onExceptionTriggered={onDemoExceptionTriggered}
              onSendNotification={onSendNotification}
              onDemoComplete={(elapsed?: string) => { onClose(); onDemoComplete?.(elapsed ?? "0s") }}
              onAddInboxEmail={onAddInboxEmail}
              onNavigateView={onNavigateView}
              demoReturnedFromInbox={demoReturnedFromInbox}
              onDemoReturnedFromInboxConsumed={onDemoReturnedFromInboxConsumed}
            />
          </div>
        ) : !isLoading ? (
          <div className="flex-1 overflow-y-auto">
            <OverviewTab
              shipment={shipment}
              actions={actions}
              onApprove={handleApproveBooking}
              resuming={resuming}
              resumed={resumed}
              onResumeWorkflow={() => {
                setResuming(true)
                setTimeout(() => {
                  setResuming(false)
                  setResumed(true)
                  onResumeWorkflow?.(shipment.id)
                }, 2000)
              }}
              approvedReroute={approvedReroute}
              syncing={syncing}
              onSyncOTM={handleSyncOTM}
              onSendEmail={() => { setNotifyType("email"); setShowEmailModal(true) }}
              onSendMessage={handleSendMessage}
              onSendBoth={() => { setNotifyType("both"); setShowEmailModal(true) }}
              showNotifyConfirmation={showNotifyConfirmation}
              notifyType={notifyType}
              showNotifyPrompt={showNotifyPrompt}
              onDismissNotifyPrompt={() => setShowNotifyPrompt(false)}
            />
          </div>
        ) : null}
      </aside>

      {/* Email composer modal */}
      {showEmailModal && shipment && (
        <EmailComposer
          shipment={shipment}
          onClose={() => setShowEmailModal(false)}
          onSend={handleSendNotification}
        />
      )}
    </>
  )
}

// ─── Step Output Panels (Rich demo content per step) ─────────────────────────

function StepOutputPanel({ step, shipment, onNavigate }: { step: number; shipment: BookingRequest; onNavigate?: (view: string) => void }) {
  if (step === 1) {
    // Parsed shipment requirement card
    return (
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Extracted Shipment Data</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            ["Order Ref", shipment.sapOrderRef],
            ["Origin", shipment.origin],
            ["Destination", shipment.destination],
            ["Mode", shipment.mode],
            ["Container", shipment.containerType],
            ["Plant", shipment.plant],
            ["Target Ship", shipment.targetShipDate],
            ["Commodity", "Electronics (HS 8471.30)"],
            ["Weight", "18,400 kg"],
            ["Incoterm", "FOB Shanghai"],
            ["Priority", "Standard"],
            ["Routing Rule", "Lowest cost, SLA ≥ 90%"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-20 shrink-0">{label}</span>
              <span className="text-[11px] font-medium text-gray-700">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1.5 border-t border-gray-200">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">All fields valid</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">12 / 12 fields</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">SAP TM + OTM</span>
        </div>
      </div>
    )
  }

  if (step === 3) {
    // Portal connection status
    return (
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Portal Connection</div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">MSK</div>
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-gray-800">Maersk Booking Portal</div>
            <div className="text-[10px] text-gray-500">api.maersk.com/booking/v2</div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Connected</span>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-200">
          <div className="text-center">
            <div className="text-[10px] text-gray-400">Response</div>
            <div className="text-[12px] font-bold text-gray-700">240ms</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-400">Auth</div>
            <div className="text-[12px] font-bold text-emerald-600">API Key</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-400">Session</div>
            <div className="text-[12px] font-bold text-gray-700 font-mono">TKN-8f3a</div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 4) {
    // Booking submission details
    return (
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Booking Parameters Submitted</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            ["Carrier", "Maersk Line"],
            ["Vessel", "AE-1234 (Ever Given)"],
            ["Sailing", "Mar 22, 2024"],
            ["ETA", "Apr 05, 2024 (14d)"],
            ["Container", "2×40' High Cube"],
            ["Rate", "$2,850 / container"],
            ["Total", "$5,700"],
            ["Contract Ref", "MSK-2024-APAC-042"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-24 shrink-0">{label}</span>
              <span className="text-[11px] font-medium text-gray-700">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-1.5 border-t border-gray-200">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">Rate within contract</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">+1.8% vs contract</span>
        </div>
      </div>
    )
  }

  if (step === 5) {
    // Document upload details
    return (
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Documents Uploaded</div>
        <div className="space-y-1.5">
          {[
            { name: "Shipper's Letter of Instruction", size: "124 KB", source: "Auto-generated from SAP", status: "Verified" },
            { name: "Commercial Packing List", size: "89 KB", source: "SAP TM attachment", status: "Verified" },
            { name: "Customs Declaration (AES)", size: "56 KB", source: "Pre-filled from HS codes", status: "Verified" },
          ].map((doc) => (
            <div key={doc.name} className="flex items-center gap-2 py-1.5 px-2 bg-white rounded border border-gray-100">
              <FileText size={14} className="text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-gray-700 truncate">{doc.name}</div>
                <div className="text-[10px] text-gray-400">{doc.size} · {doc.source}</div>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold shrink-0">{doc.status}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 6) {
    // Booking confirmation card
    return (
      <div className="mt-3 bg-emerald-50 rounded-lg border border-emerald-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600" />
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Booking Confirmed</div>
        </div>
        <div className="bg-white rounded-md border border-emerald-200 p-3">
          <div className="text-[16px] font-bold text-gray-900 font-mono tracking-wide">MAEU-2024-SHA-78432</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
            {[
              ["Carrier", "Maersk Line"],
              ["Vessel", "AE-1234 (Ever Given)"],
              ["Sailing", "Mar 22, 2024"],
              ["Port of Loading", "Shanghai (CNSHA)"],
              ["Port of Discharge", "Los Angeles (USLAX)"],
              ["ETA", "Apr 05, 2024"],
              ["Container", "2×40' HC"],
              ["CRO Number", "CRO-MAEU-78432"],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 w-24 shrink-0">{l}</span>
                <span className="text-[11px] font-medium text-gray-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 7) {
    // Notification + SAP update summary — clickable rows
    const items = [
      { system: "SAP TM", action: "Order SAP-TM-87234 updated with booking ref MAEU-2024-SHA-78432", icon: "🔄", status: "Synced", nav: "sap-tm" },
      { system: "OTM", action: "Shipment record created, carrier assignment confirmed", icon: "🔄", status: "Synced", nav: "sap-tm" },
      { system: "Email", action: "Booking confirmation sent to Suzhou Plant logistics team", icon: "📧", status: "Sent", nav: "email-sent" },
      { system: "Email", action: "Shipping instructions sent to SCM planner (M. Santos)", icon: "📧", status: "Sent", nav: "email-sent" },
    ]
    return (
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">System Updates & Notifications</div>
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate?.(item.nav)}
              className="w-full flex items-center gap-2 py-1.5 px-2 bg-white rounded border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left group"
            >
              <span className="text-[12px] shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-gray-700 group-hover:text-blue-700">{item.action}</div>
                <div className="text-[10px] text-gray-400">{item.system}</div>
              </div>
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0",
                item.status === "Synced" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
              )}>{item.status}</span>
              <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (step === 8) {
    // Monitoring status
    return (
      <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 animate-in fade-in duration-500">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Monitoring</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Tracking Feed", value: "Maersk API + AIS", active: true },
            { label: "Next Check", value: "30 min", active: true },
            { label: "Port Congestion", value: "Normal", active: false },
            { label: "Anomalies", value: "None detected", active: false },
          ].map((item) => (
            <div key={item.label} className="py-1.5 px-2 bg-white rounded border border-gray-100 text-center">
              <div className="text-[10px] text-gray-400">{item.label}</div>
              <div className={cn("text-[11px] font-semibold", item.active ? "text-blue-700" : "text-emerald-600")}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null // Step 2 has its own carrier table inline
}

// ─── Live Booking Flow (Demo Mode) ───────────────────────────────────────────

interface LiveBookingFlowProps {
  shipment: BookingRequest
  demoStep: number
  demoPaused: boolean
  demoScenario: string
  demoExceptionActive: boolean
  onStepAdvance?: (step: number) => void
  onPause?: () => void
  onResume?: () => void
  onExceptionResolved?: () => void
  onExceptionTriggered?: () => void
  onSendNotification?: (email: SentEmailItem) => void
  onDemoComplete?: (elapsedTime?: string) => void
  onNavigateView?: (view: string) => void
  onAddInboxEmail?: (email: { id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }) => void
  demoReturnedFromInbox?: boolean
  onDemoReturnedFromInboxConsumed?: () => void
}

function LiveBookingFlow({
  shipment, demoStep, demoPaused, demoScenario, demoExceptionActive,
  onStepAdvance, onPause, onResume, onExceptionResolved, onExceptionTriggered,
  onSendNotification, onDemoComplete, onAddInboxEmail, onNavigateView,
  demoReturnedFromInbox, onDemoReturnedFromInboxConsumed,
}: LiveBookingFlowProps) {
  const [subItemTick, setSubItemTick] = useState(0)
  const [stepPhase, setStepPhase] = useState<"thinking" | "revealing" | "complete" | "idle">(() => {
    // If restoring mid-demo, start in complete phase (modal shows, waiting for user)
    if (demoStep >= 1 && demoStep <= 8 && demoPaused) return "complete"
    return "idle"
  })
  const [showReasoning, setShowReasoning] = useState(true)
  const [carrierOverride, setCarrierOverride] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [approvalPending, setApprovalPending] = useState(false)
  const [approvalGranted, setApprovalGranted] = useState(false)
  const [approvalCarrier, setApprovalCarrier] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  // When remounting mid-demo (e.g. user navigated away and back), restore completed steps and current modal
  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    if (demoStep > 1) return Array.from({ length: demoStep - 1 }, (_, i) => i + 1)
    return []
  })
  const [showStepModal, setShowStepModal] = useState<number | null>(() => {
    // If remounting mid-demo and step is paused/in-progress, show the current step modal
    if (demoStep >= 1 && demoStep <= 8 && demoPaused) return demoStep
    return null
  })
  const [showEscalationConfirm, setShowEscalationConfirm] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; size: string }>>([])
  const [uploadAnalyzing, setUploadAnalyzing] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const scenario = DEMO_SCENARIOS.find((s) => s.id === demoScenario) ?? DEMO_SCENARIOS[0]
  const currentStepConfig = demoStep >= 1 && demoStep <= 8 ? DEMO_STEP_DETAILS[demoStep - 1] : null
  const StepIcon = demoStep >= 1 && demoStep <= 8 ? STEP_ICONS[demoStep - 1] : Zap

  // Elapsed time counter
  useEffect(() => {
    if (demoStep === 0 || demoStep > 8 || demoPaused) return
    const t = setInterval(() => setElapsedMs((p) => p + 100), 100)
    return () => clearInterval(t)
  }, [demoStep, demoPaused])

  // Reset state when demo restarts (demoStep goes to 0)
  useEffect(() => {
    if (demoStep === 0) {
      setSubItemTick(0)
      setStepPhase("idle")
      setCompletedSteps([])
      setElapsedMs(0)
      setShowStepModal(null)
      setCarrierOverride(false)
      setSelectedCarrier(null)
      setShowReasoning(false)
      const t = setTimeout(() => onStepAdvance?.(1), 800)
      return () => clearTimeout(t)
    }
  }, [demoStep])

  // Determine if current step should fast-forward (no modal, auto-advance)
  const exceptionStep = scenario.exceptionAtStep
  const isExceptionScenario = demoScenario !== "happy-path" && exceptionStep != null
  // Fast-forward: steps before AND after the exception step (but not the exception step itself)
  const shouldFastForward = isExceptionScenario && demoStep !== exceptionStep
  // After exception is resolved, all remaining steps should fast-forward
  const [exceptionResolved, setExceptionResolved] = useState(false)

  // Step animation engine
  useEffect(() => {
    if (demoStep < 1 || demoStep > 8 || demoPaused || demoExceptionActive) return
    if (completedSteps.includes(demoStep)) return

    // Check if this step should trigger an exception
    if (scenario.exceptionAtStep === demoStep && !demoExceptionActive && !exceptionResolved) {
      // Show thinking briefly, then trigger exception
      setStepPhase("thinking")
      setSubItemTick(0)
      const exTimer = setTimeout(() => {
        onExceptionTriggered?.()
      }, 1500)
      return () => clearTimeout(exTimer)
    }

    // Normal step flow: thinking → revealing → complete
    setStepPhase("thinking")
    setSubItemTick(0)

    const config = DEMO_STEP_DETAILS[demoStep - 1]

    // Fast-forward mode: rapid animation, no modals, auto-advance
    if (shouldFastForward) {
      const fastTimer = setTimeout(() => {
        setStepPhase("revealing")
        setSubItemTick(config.subItems.length) // reveal all at once
        setTimeout(() => {
          setStepPhase("complete")
          setCompletedSteps((p) => [...p, demoStep])
          setTimeout(() => {
            if (demoStep < 8) onStepAdvance?.(demoStep + 1)
            else {
              onDemoComplete?.()
            }
          }, 300)
        }, 250)
      }, 400)
      return () => clearTimeout(fastTimer)
    }

    // At step 2 with carrier selection, pause after revealing for user interaction
    const isCarrierStep = demoStep === 2 && demoScenario === "happy-path"

    // After thinking duration, start revealing sub-items
    const revealTimer = setTimeout(() => {
      setStepPhase("revealing")
      // Reveal sub-items one by one
      const subTimer = setInterval(() => {
        setSubItemTick((prev) => {
          const next = prev + 1
          if (next >= config.subItems.length) {
            clearInterval(subTimer)
            // After all revealed, show modal (pauses flow for user click)
            if (isCarrierStep) {
              setStepPhase("revealing") // keep in revealing to show carrier table in modal
              setTimeout(() => setShowStepModal(2), 300)
            } else {
              setTimeout(() => {
                setStepPhase("complete")
                setCompletedSteps((p) => [...p, demoStep])
                // Show modal — flow pauses until user clicks Continue
                if (demoStep !== 3) {
                  // Step 3 (portal login) has no modal — auto-advance
                  setShowStepModal(demoStep)
                } else {
                  // Step 3: auto-advance after brief pause
                  setTimeout(() => {
                    if (demoStep < 8) onStepAdvance?.(demoStep + 1)
                    else onStepAdvance?.(9)
                  }, 1500)
                }
              }, 400)
            }
          }
          return next
        })
      }, demoScenario === "happy-path" ? 340 : 180)
      return () => clearInterval(subTimer)
    }, config.duration * (demoScenario === "happy-path" ? 0.6 : 0.3))

    return () => clearTimeout(revealTimer)
  }, [demoStep, demoPaused, demoExceptionActive, completedSteps, exceptionResolved])

  const makeTimestamp = () => {
    const now = new Date()
    return `${now.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}`
  }

  // Handle modal Continue — advances to next step + side effects
  const handleModalContinue = (fromStep: number) => {
    setShowStepModal(null)

    // Step-specific side effects
    if (fromStep === 4 && onSendNotification) {
      onSendNotification({ id: `DEMO-SENT-${Date.now()}`, to: "maersk-bookings@maersk.com", subject: "Booking Request Submitted — MAEU-2024-SHA-78432 (SHA→LAX)", body: "Booking request submitted for SAP-TM-87234.\n\nVessel: AE-1234 / Mar 22\nContainer: 2×40' HC\nRate: $2,850\n\n— Zero Touch Booking Agent", timestamp: makeTimestamp(), type: "carrier" })
    }
    if (fromStep === 6) {
      // Add carrier confirmation to Inbox
      onAddInboxEmail?.({ id: `DEMO-INBOX-${Date.now()}`, from: "bookings@maersk.com", fromName: "Maersk Bookings", subject: "Booking Confirmed — MAEU-2024-SHA-78432 (SHA→LAX)", body: "Dear Customer,\n\nYour booking has been confirmed.\n\nBooking Ref: MAEU-2024-SHA-78432\nVessel: AE-1234 / Ever Given\nSailing: Mar 22, 2024\nETA: Apr 05, 2024\nContainer: 2×40' HC\n\nContainer Release Order (CRO) has been issued.\n\nRegards,\nMaersk Line Booking Team", timestamp: makeTimestamp(), read: false, tag: "carrier", tags: ["carrier", "booking"], shipmentId: "BKG-NEW-001", shipmentRef: "MAEU-2024-SHA-78432" })
    }
    if (fromStep === 7 && onSendNotification) {
      onSendNotification({ id: `DEMO-SENT-${Date.now()}-1`, to: "plant-logistics@suzhou.company.com", subject: "Booking Confirmed — MAEU-2024-SHA-78432 (SHA→LAX)", body: "Booking for SAP-TM-87234 has been confirmed.\n\nCarrier: Maersk Line\nVessel: AE-1234 / Mar 22 sailing\nBooking Ref: MAEU-2024-SHA-78432\nETA: Apr 05, 2024\n\n— Zero Touch Booking Agent", timestamp: makeTimestamp(), type: "plant" })
      onSendNotification({ id: `DEMO-SENT-${Date.now()}-2`, to: "m.santos@logistics.co", subject: "SAP TM Updated — BKG-NEW-001 Booking Confirmed", body: "SAP TM order SAP-TM-87234 has been updated with booking confirmation MAEU-2024-SHA-78432.\n\nOTM shipment record synced.\n\n— Zero Touch Booking Agent", timestamp: makeTimestamp(), type: "sap" })
    }

    // Advance
    if (fromStep === 8) {
      onDemoComplete?.() // triggers dashboard zoom + completion modal
    } else {
      setTimeout(() => onStepAdvance?.(fromStep + 1), 400)
    }
  }

  // Handle escalation from step 4
  const handleEscalateBooking = () => {
    // Send escalation email to VP Supply Chain
    onSendNotification?.({
      id: `DEMO-SENT-ESC-${Date.now()}`,
      to: "j.mitchell@logistics.co",
      subject: "Escalation: Booking Approval Required — SAP-TM-87234 (SHA→LAX, Maersk)",
      body: "Dear VP Mitchell,\n\nA booking request requires your approval before submission.\n\nOrder: SAP-TM-87234\nRoute: Shanghai (SHA) → Los Angeles (LAX)\nCarrier: Maersk Line (AI recommended)\nRate: $2,850/container (within 1.8% of contract)\nVessel: AE-1234 / Mar 22 sailing\nContainer: 2×40' HC\nTotal: $5,700\n\nThe AI agent has evaluated 4 carriers and recommends Maersk based on optimal rate-SLA-capacity combination.\n\nPlease review and approve at your earliest convenience.\n\n— Zero Touch Booking Agent",
      timestamp: makeTimestamp(),
      type: "escalation",
    })
    // Also send a confirmation to SCM planner
    onSendNotification?.({
      id: `DEMO-SENT-ESC-CC-${Date.now()}`,
      to: "a.chen@logistics.co",
      subject: "FYI: Booking SAP-TM-87234 Escalated to VP Mitchell for Approval",
      body: "FYI — The booking for SAP-TM-87234 (SHA→LAX) has been escalated to VP Supply Chain J. Mitchell for approval.\n\nCarrier: Maersk Line\nRate: $2,850/container\nStatus: Awaiting VP approval\n\nYou will be notified once the booking is approved.\n\n— Zero Touch Booking Agent",
      timestamp: makeTimestamp(),
      type: "sap",
    })
    // Close the booking preview modal, show escalation confirmation instead
    setShowStepModal(null)
    setShowEscalationConfirm(true)
    // Auto-pause demo so user can freely navigate to emails etc.
    onPause?.()
  }

  // Handle carrier selection confirm (step 2)
  const handleCarrierConfirm = () => {
    // Check if selected carrier deviates from contract (triggers approval gate)
    const chosen = shipment.carrierOptions.find(
      (c) => selectedCarrier ? c.carrier === selectedCarrier : c.recommended
    )
    const contractCarrier = shipment.carrierOptions.find((c) => c.hasActiveContract && c.recommended)
    // If user chose a non-contract carrier OR a cheaper non-recommended carrier, require approval
    if (chosen && contractCarrier && chosen.carrier !== contractCarrier.carrier && !chosen.hasActiveContract && !approvalGranted) {
      setApprovalCarrier(chosen.carrier)
      setApprovalPending(true)
      // Simulate manager approval after 3.5s
      setTimeout(() => { setApprovalPending(false); setApprovalGranted(true) }, 3500)
      return
    }
    setShowStepModal(null)
    setStepPhase("complete")
    setCompletedSteps((p) => [...p, 2])
    setCarrierOverride(false)
    setApprovalPending(false)
    setApprovalGranted(false)
    setApprovalCarrier(null)
    setTimeout(() => onStepAdvance?.(3), 400)
  }

  // Proceed after manager approval
  const handleApprovalProceed = () => {
    setShowStepModal(null)
    setStepPhase("complete")
    setCompletedSteps((p) => [...p, 2])
    setCarrierOverride(false)
    setApprovalPending(false)
    setApprovalGranted(false)
    setApprovalCarrier(null)
    setTimeout(() => onStepAdvance?.(3), 400)
  }

  // Handle exception resolution — marks resolved, then fast-forwards remaining steps
  const handleResolveException = () => {
    onExceptionResolved?.()
    setExceptionResolved(true)
    setStepPhase("complete")
    setCompletedSteps((p) => [...p, demoStep])
    setTimeout(() => {
      if (demoStep < 8) onStepAdvance?.(demoStep + 1)
      else onStepAdvance?.(9)
    }, 600)
  }

  const formatElapsed = () => {
    const s = Math.floor(elapsedMs / 1000)
    const m = Math.floor(s / 60)
    return m > 0 ? `${m}:${String(s % 60).padStart(2, "0")}` : `${s}s`
  }

  const isComplete = demoStep > 8

  return (
    <div className="p-4 space-y-4">
      {/* ── Progress Bar + Controls ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Live Booking</span>
            <span className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              isComplete ? "bg-emerald-100 text-emerald-700" :
              demoExceptionActive ? "bg-red-100 text-red-700" :
              "bg-blue-100 text-blue-700"
            )}>
              {isComplete ? "Complete" : demoExceptionActive ? "Exception" : scenario.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
              <Timer size={11} /> {formatElapsed()}
            </span>
            {!isComplete && (
              <button
                onClick={demoPaused ? onResume : onPause}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-500"
              >
                {demoPaused ? <Play size={14} /> : <Pause size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isComplete ? "bg-emerald-500" : demoExceptionActive ? "bg-amber-500" : "bg-blue-500"
            )}
            style={{ width: `${Math.min(((isComplete ? 8 : Math.max(0, demoStep - 1) + (stepPhase === "complete" ? 1 : stepPhase === "revealing" ? 0.6 : 0.2)) / 8) * 100, 100)}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex justify-between mt-2">
          {Array.from({ length: 8 }, (_, i) => {
            const stepNum = i + 1
            const Icon = STEP_ICONS[i]
            const done = completedSteps.includes(stepNum) || demoStep > stepNum
            const active = demoStep === stepNum
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500",
                  done ? "bg-emerald-500 text-white scale-100" :
                  active ? "bg-blue-500 text-white scale-110 shadow-lg shadow-blue-200" :
                  "bg-gray-100 text-gray-400"
                )}>
                  {done ? <Check size={13} /> : <Icon size={13} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Active Step Panel ────────────────────────────────────────── */}
      {demoStep >= 1 && demoStep <= 8 && !isComplete && (
        <div className={cn(
          "bg-white border rounded-lg overflow-hidden transition-all duration-300",
          demoExceptionActive ? "border-amber-300 shadow-amber-100 shadow-sm" : "border-blue-200 shadow-blue-50 shadow-sm"
        )}>
          {/* Step header */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-3 border-b",
            demoExceptionActive ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-100"
          )}>
            <StepIcon size={15} className={demoExceptionActive ? "text-amber-600" : "text-blue-600"} />
            <span className={cn("text-[12px] font-bold", demoExceptionActive ? "text-amber-800" : "text-blue-800")}>
              Step {demoStep}: {DEMO_STEP_DETAILS[demoStep - 1]?.thinkingLabel.replace("...", "")}
            </span>
            <span className="text-[10px] text-gray-400 ml-auto">{currentStepConfig?.processingTime}</span>
          </div>

          {/* Exception overlay */}
          {demoExceptionActive && (
            <DemoExceptionOverlay
              scenarioId={demoScenario}
              onResolve={handleResolveException}
              onSendNotification={onSendNotification}
              onAddInboxEmail={onAddInboxEmail}
              onNavigateView={onNavigateView}
              returnedFromInbox={demoReturnedFromInbox}
              onReturnedFromInboxConsumed={onDemoReturnedFromInboxConsumed}
            />
          )}

          {/* Normal step content */}
          {!demoExceptionActive && (
            <div className="p-4 space-y-3">
              {/* Thinking animation */}
              {stepPhase === "thinking" && (
                <div className="flex items-center gap-2 py-3">
                  <Brain size={16} className="text-blue-500 animate-pulse" />
                  <span className="text-[12px] font-medium text-blue-600">
                    {currentStepConfig?.thinkingLabel}
                  </span>
                  <ThinkingDots />
                </div>
              )}

              {/* Sub-items reveal */}
              {(stepPhase === "revealing" || stepPhase === "complete") && currentStepConfig && (
                <div className="space-y-2">
                  {currentStepConfig.subItems.map((item, idx) => {
                    const visible = idx < subItemTick
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-3 rounded-md transition-all duration-500",
                          visible ? "opacity-100 translate-x-0 bg-gray-50" : "opacity-0 -translate-x-4"
                        )}
                      >
                        {visible ? (
                          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Loader2 size={14} className="text-gray-300 shrink-0 animate-spin" />
                        )}
                        <span className={cn("text-[12px]", visible ? "text-gray-700 font-medium" : "text-gray-400")}>
                          {item}
                        </span>
                      </div>
                    )
                  })}

                  {/* Completion label + Output Panel */}
                  {stepPhase === "complete" && (
                    <>
                      <div className="flex items-center gap-2 mt-2 py-2 px-3 bg-emerald-50 rounded-md border border-emerald-200 animate-in fade-in duration-400">
                        <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                        <span className="text-[12px] font-semibold text-emerald-700">{currentStepConfig.completionLabel}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Carrier table now in Step 2 modal */}
            </div>
          )}
        </div>
      )}

      {/* ── AI Reasoning Panel (Collapsible) ─────────────────────────── */}
      {demoStep >= 1 && demoStep <= 8 && !isComplete && currentStepConfig && (stepPhase === "revealing" || stepPhase === "complete") && !demoExceptionActive && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <Eye size={13} className="text-indigo-500" />
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">AI Reasoning</span>
            <ChevronDown size={12} className={cn("text-gray-400 ml-auto transition-transform", showReasoning && "rotate-180")} />
          </button>
          {showReasoning && (
            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
              <p className="text-[12px] text-gray-600 leading-relaxed">{currentStepConfig.aiReasoning}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-500 font-medium">Confidence</span>
                  <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${currentStepConfig.aiConfidence}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">{currentStepConfig.aiConfidence}%</span>
                </div>
                <div className="flex items-center gap-1">
                  {currentStepConfig.aiSources.map((src) => (
                    <span key={src} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{src}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 8-Step Vertical Stepper ──────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Workflow Progress</div>
        <div className="space-y-1">
          {DEMO_STEP_DETAILS.map((step, idx) => {
            const stepNum = idx + 1
            const Icon = STEP_ICONS[idx]
            const done = completedSteps.includes(stepNum) || demoStep > stepNum
            const active = demoStep === stepNum
            const pending = demoStep < stepNum
            return (
              <div key={idx} className="flex items-start gap-3 py-1.5">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                  done ? "bg-emerald-500 text-white" :
                  active ? "bg-blue-500 text-white shadow-md shadow-blue-200" :
                  "bg-gray-100 text-gray-400"
                )}>
                  {done ? <Check size={11} /> :
                   active ? <Loader2 size={11} className="animate-spin" /> :
                   <Icon size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-[12px] font-medium", done ? "text-gray-800" : active ? "text-blue-700" : "text-gray-400")}>
                    {step.thinkingLabel.replace("...", "")}
                  </div>
                  {done && (
                    <div className="text-[10px] text-emerald-600 mt-0.5">{step.completionLabel}</div>
                  )}
                  {active && !demoExceptionActive && stepPhase === "thinking" && (
                    <div className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1">
                      Processing<ThinkingDots />
                    </div>
                  )}
                  {active && demoExceptionActive && (
                    <div className="text-[10px] text-amber-600 mt-0.5 font-medium">Exception — awaiting resolution</div>
                  )}
                </div>
                {done && <span className="text-[10px] text-gray-400 font-mono shrink-0">{step.processingTime}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Step Modals ─────────────────────────────────────────────── */}

      {/* Step 1: Extracted Shipment Data */}
      <DemoModal
        open={showStepModal === 1}
        title="Shipment Data Extracted"
        subtitle="12 fields parsed from SAP TM & OTM — all validated"
        icon={<div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle size={18} className="text-emerald-600" /></div>}
        footer={<div className="flex justify-end"><button onClick={() => handleModalContinue(1)} className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">Continue to Carrier Selection →</button></div>}
      >
        <StepOutputPanel step={1} shipment={shipment} />
      </DemoModal>

      {/* Step 2: Carrier Evaluation */}
      <DemoModal
        open={showStepModal === 2}
        title="Carrier Evaluation Complete"
        subtitle="4 carriers queried — AI recommendation ready"
        icon={<div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Search size={18} className="text-blue-600" /></div>}
        width="3xl"
        footer={
          <div className="flex items-center gap-2 justify-end">
            {!carrierOverride ? (
              <>
                <button onClick={() => setCarrierOverride(true)} className="px-4 py-2 border border-gray-300 text-gray-600 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors">Override Carrier</button>
                <button onClick={handleCarrierConfirm} className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"><Check size={14} /> Accept AI Selection</button>
              </>
            ) : (
              <button onClick={handleCarrierConfirm} disabled={!selectedCarrier} className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"><Check size={14} /> Confirm {selectedCarrier ?? "Selection"}</button>
            )}
          </div>
        }
      >
        {/* Contract Compliance Check Banner */}
        {(() => {
          const contractCarrier = shipment.carrierOptions.find((c) => c.hasActiveContract && c.recommended)
          if (!contractCarrier) return null
          const util = contractCarrier.volumeUsed && contractCarrier.volumeCommitted
            ? Math.round((contractCarrier.volumeUsed / contractCarrier.volumeCommitted) * 100)
            : null
          return (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span className="text-[12px] font-bold text-emerald-800">Contract Compliance Check — CCR-01</span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Active contract with <span className="font-bold">{contractCarrier.carrier}</span> on this lane
                ({contractCarrier.contractId}). AI recommends contracted carrier.
                {util !== null && <span className="ml-1">YTD utilization: <span className="font-bold">{util}%</span></span>}
              </p>
            </div>
          )
        })()}

        {/* Manager Approval Gate Overlay */}
        {(approvalPending || approvalGranted) && (
          <div className="mb-4 rounded-xl border overflow-hidden animate-in fade-in duration-300"
            style={{ borderColor: approvalGranted ? "#86efac" : "#fbbf24" }}
          >
            <div className={cn("px-4 py-3", approvalGranted ? "bg-emerald-50" : "bg-amber-50")}>
              <div className="flex items-center gap-2 mb-2">
                {approvalGranted ? (
                  <CheckCircle size={14} className="text-emerald-600" />
                ) : (
                  <AlertOctagon size={14} className="text-amber-600 animate-pulse" />
                )}
                <span className={cn("text-[12px] font-bold", approvalGranted ? "text-emerald-800" : "text-amber-800")}>
                  {approvalGranted ? "Manager Approval Granted" : "Pending Manager Approval"}
                </span>
              </div>
              {approvalPending && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-amber-700">
                    Selecting <span className="font-bold">{approvalCarrier}</span> (non-contracted) deviates from volume commitment.
                  </p>
                  <p className="text-[11px] text-amber-600">
                    Approval request sent to <span className="font-semibold">Sarah Kim, Supply Chain Manager</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                    <span className="text-[10px] text-amber-500">Awaiting response...</span>
                  </div>
                </div>
              )}
              {approvalGranted && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-emerald-700">
                    <span className="font-semibold">Sarah Kim</span> approved deviation from contract. Reason: cost savings opportunity.
                  </p>
                  <button
                    onClick={handleApprovalProceed}
                    className="mt-1 px-4 py-1.5 bg-emerald-600 text-white text-[11px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Proceed with {approvalCarrier} →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recommended carrier — full-width row */}
        {(() => {
          const recommended = shipment.carrierOptions.find(c => c.recommended)
          const alternatives = shipment.carrierOptions.filter(c => !c.recommended)
          // Pick 1 contracted + 1 premium/different (limit to 2)
          const contracted = alternatives.find(c => c.hasActiveContract)
          const other = alternatives.find(c => !c.hasActiveContract || c !== contracted) ?? alternatives.find(c => c !== contracted)
          const shownAlts = [contracted, other].filter(Boolean) as typeof alternatives

          const renderCarrierRow = (c: typeof shipment.carrierOptions[0], isFull: boolean) => {
            const isSelected = (c.recommended && !carrierOverride && !selectedCarrier) || selectedCarrier === c.carrier
            const rateDiff = c.contractRate ? ((c.rate - c.contractRate) / c.contractRate * 100).toFixed(1) : null
            const carrierUtil = c.volumeUsed && c.volumeCommitted ? Math.round((c.volumeUsed / c.volumeCommitted) * 100) : null
            return (
              <div
                key={c.carrier}
                onClick={() => carrierOverride && setSelectedCarrier(c.carrier)}
                className={cn(
                  "border rounded-xl transition-all overflow-hidden",
                  isSelected ? "border-blue-400 bg-white shadow-md ring-1 ring-blue-200" : carrierOverride ? "border-gray-200 hover:border-blue-300 cursor-pointer bg-white" : "border-gray-200 bg-white",
                )}
              >
                {/* Header */}
                <div className={cn("px-4 py-3 flex items-center justify-between border-b", isSelected ? "bg-blue-50/50 border-blue-100" : "bg-gray-50/50 border-gray-100")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold border", isSelected ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200")}>{c.carrier.slice(0, 3).toUpperCase()}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-gray-900">{c.carrier}</span>
                        {c.hasActiveContract && (
                          <span className="text-[9px] flex items-center gap-0.5 font-semibold text-emerald-600"><ShieldCheck size={10} /> Contracted</span>
                        )}
                      </div>
                      {c.reason && <p className="text-[10px] text-gray-400 mt-0.5">{c.reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[18px] font-extrabold text-gray-900">${c.rate.toLocaleString()}</div>
                      {rateDiff && (
                        <span className={cn("text-[10px] font-semibold", Number(rateDiff) <= 0 ? "text-emerald-600" : "text-amber-600")}>
                          {Number(rateDiff) > 0 ? "+" : ""}{rateDiff}% vs contract
                        </span>
                      )}
                    </div>
                    {isSelected && <span className="text-[9px] px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold uppercase tracking-wider">AI Pick</span>}
                  </div>
                </div>
                {/* Metrics row */}
                <div className="px-4 py-3">
                  <div className={cn("grid gap-3", isFull ? "grid-cols-6" : "grid-cols-4")}>
                    <div><span className="text-[9px] text-gray-400 uppercase font-medium">Transit</span><div className="text-[13px] font-bold text-gray-900">{c.transitDays} days</div></div>
                    <div><span className="text-[9px] text-gray-400 uppercase font-medium">Capacity</span><div className={cn("text-[13px] font-bold", c.capacity === "Available" ? "text-emerald-600" : c.capacity === "Limited" ? "text-amber-600" : "text-red-600")}>{c.capacity}</div></div>
                    <div><span className="text-[9px] text-gray-400 uppercase font-medium">SLA</span><div className="text-[13px] font-bold text-gray-900">{c.sla}%</div></div>
                    <div><span className="text-[9px] text-gray-400 uppercase font-medium">Contract Rate</span><div className="text-[13px] font-bold text-gray-600">${c.contractRate.toLocaleString()}</div></div>
                    {isFull && carrierUtil !== null && (
                      <div className="col-span-2">
                        <span className="text-[9px] text-gray-400 uppercase font-medium">Volume Commitment</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full", carrierUtil >= 90 ? "bg-red-400" : carrierUtil >= 70 ? "bg-amber-400" : "bg-emerald-400")} style={{ width: `${Math.min(100, carrierUtil)}%` }} />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700">{carrierUtil}%</span>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{c.volumeUsed?.toLocaleString()} / {c.volumeCommitted?.toLocaleString()} TEU</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div className="space-y-3">
              {recommended && renderCarrierRow(recommended, true)}
              {shownAlts.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {shownAlts.map(c => renderCarrierRow(c, false))}
                </div>
              )}
            </div>
          )
        })()}
      </DemoModal>

      {/* Step 4: Booking Preview */}
      <DemoModal
        open={showStepModal === 4}
        title="Booking Preview"
        subtitle="Review booking parameters before submission"
        icon={<div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center"><Anchor size={18} className="text-indigo-600" /></div>}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-600 font-medium">Rate within contract threshold (1.8%)</span>
            <div className="flex items-center gap-2">
              <button onClick={handleEscalateBooking} className="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-700 text-[13px] font-medium rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5">
                <ArrowUp size={14} /> Escalate to VP
              </button>
              <button onClick={() => handleModalContinue(4)} className="px-5 py-2 bg-emerald-600 text-white text-[13px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"><Check size={14} /> Approve & Submit</button>
            </div>
          </div>
        }
      >
        <StepOutputPanel step={4} shipment={shipment} />
      </DemoModal>

      {/* Escalation confirmation modal — standalone, doesn't block sidebar navigation */}
      {showEscalationConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <div className="pt-8 pb-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-50 duration-500">
                <Send size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-[18px] font-bold text-gray-900">Escalation Sent</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Booking approval request sent to<br />
                <span className="font-semibold text-gray-700">VP Supply Chain — J. Mitchell</span>
              </p>
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Email Delivered</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Pending Approval</span>
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50 flex items-center justify-between">
              <span className="text-[11px] text-gray-400">Demo paused — navigate freely</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowEscalationConfirm(false); onNavigateView?.("email-sent") }}
                  className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                >
                  <Mail size={13} /> View Sent Emails
                </button>
                <button
                  onClick={() => { setShowEscalationConfirm(false); setShowStepModal(4) }}
                  className="px-4 py-2 bg-emerald-600 text-white text-[12px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Continue Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Documents */}
      <DemoModal
        open={showStepModal === 5}
        title="Documents Uploaded & Verified"
        subtitle={`${3 + uploadedDocs.length} shipping documents generated and uploaded to carrier portal`}
        icon={<div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Upload size={18} className="text-blue-600" /></div>}
        footer={<div className="flex justify-end"><button onClick={() => handleModalContinue(5)} className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">Continue →</button></div>}
      >
        <div className="space-y-2">
          {[
            { name: "Shipper's Letter of Instruction (SLI)", size: "124 KB", source: "Auto-generated from SAP", onView: () => generateSLI() },
            { name: "Commercial Packing List", size: "89 KB", source: "SAP TM attachment", onView: () => generatePackingList() },
            { name: "Customs Declaration (AES)", size: "56 KB", source: "Pre-filled from HS codes", onView: () => generateCustomsDeclaration() },
          ].map((doc) => (
            <div key={doc.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <FileText size={20} className="text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800">{doc.name}</div>
                <div className="text-[11px] text-gray-400">{doc.size} · {doc.source}</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold shrink-0">Verified</span>
              <button onClick={doc.onView} className="text-[11px] px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-blue-600 font-medium hover:bg-blue-50 transition-colors shrink-0">View PDF</button>
            </div>
          ))}

          {/* Uploaded documents */}
          {uploadedDocs.map((doc, idx) => (
            <div key={`uploaded-${idx}`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in slide-in-from-bottom-2 fade-in duration-500">
              <FileText size={20} className="text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800">{doc.name}</div>
                <div className="text-[11px] text-gray-400">{doc.size} · Uploaded by user</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold shrink-0">AI Verified</span>
            </div>
          ))}

          {/* AI Analyzing animation */}
          {uploadAnalyzing && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200 animate-pulse">
              <div className="w-5 h-5 shrink-0">
                <Brain size={20} className="text-indigo-500 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-indigo-700 flex items-center gap-1">
                  AI analyzing document
                  <ThinkingDots />
                </div>
                <div className="text-[11px] text-indigo-400">Extracting content, validating compliance, cross-referencing with booking data...</div>
              </div>
              <Loader2 size={16} className="text-indigo-500 animate-spin shrink-0" />
            </div>
          )}

          {/* Upload button */}
          <input
            ref={uploadInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const sizeKB = Math.round(file.size / 1024)
              setUploadAnalyzing(true)
              // AI analysis animation for 1.5s
              setTimeout(() => {
                setUploadAnalyzing(false)
                setUploadedDocs((prev) => [...prev, { name: file.name, size: `${sizeKB} KB` }])
              }, 1500)
              // Reset input
              e.target.value = ""
            }}
          />
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors cursor-pointer"
          >
            <Upload size={16} />
            <span className="text-[12px] font-medium">Upload Supporting Document</span>
          </button>
        </div>
      </DemoModal>

      {/* Step 6: Booking Confirmed */}
      <DemoModal
        open={showStepModal === 6}
        title="Booking Confirmed by Carrier"
        subtitle="Maersk has confirmed your booking"
        icon={<div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center"><ShieldCheck size={18} className="text-emerald-600" /></div>}
        footer={<div className="flex justify-end"><button onClick={() => handleModalContinue(6)} className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">Continue to System Update →</button></div>}
      >
        <StepOutputPanel step={6} shipment={shipment} />
      </DemoModal>

      {/* Step 7: System Update */}
      <DemoModal
        open={showStepModal === 7}
        title="System Update Complete"
        subtitle="SAP TM, OTM synced — stakeholders notified"
        icon={<div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center"><Bell size={18} className="text-blue-600" /></div>}
        footer={<div className="flex justify-end"><button onClick={() => handleModalContinue(7)} className="px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">Continue to Monitoring →</button></div>}
      >
        <StepOutputPanel step={7} shipment={shipment} onNavigate={onNavigateView} />
      </DemoModal>

      {/* Step 8: Monitoring Activated */}
      <DemoModal
        open={showStepModal === 8}
        title="Booking Monitor Activated"
        subtitle="Tracking feeds subscribed — anomaly detection armed"
        icon={<div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center"><Truck size={18} className="text-indigo-600" /></div>}
        footer={<div className="flex justify-end"><button onClick={() => handleModalContinue(8)} className="px-5 py-2 bg-emerald-600 text-white text-[13px] font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5"><Sparkles size={14} /> Complete Booking →</button></div>}
      >
        <StepOutputPanel step={8} shipment={shipment} />
      </DemoModal>
    </div>
  )
}

// ─── Demo Exception Overlay ──────────────────────────────────────────────────

function DemoExceptionOverlay({ scenarioId, onResolve, onSendNotification, onAddInboxEmail, onNavigateView, returnedFromInbox, onReturnedFromInboxConsumed }: {
  scenarioId: string; onResolve: () => void
  onSendNotification?: (email: SentEmailItem) => void
  onAddInboxEmail?: (email: { id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }) => void
  onNavigateView?: (view: string) => void
  returnedFromInbox?: boolean
  onReturnedFromInboxConsumed?: () => void
}) {
  const resolution = DEMO_EXCEPTION_RESOLUTIONS[scenarioId]
  const [phase, setPhase] = useState<"showing" | "resolving" | "email-compose" | "waiting-reply" | "carrier-select" | "confirm-switch" | "negotiating" | "resolved">("showing")
  const [showModal, setShowModal] = useState(true)
  // Missing-data animation
  const [filledFields, setFilledFields] = useState<number[]>([])
  // Stepper (portal-failure, carrier-rejection)
  const [autoStep, setAutoStep] = useState(0)
  // Rate-mismatch negotiation
  const [negoProgress, setNegoProgress] = useState(0)
  const [negoStatus, setNegoStatus] = useState("")
  const [negoComplete, setNegoComplete] = useState(false)
  // Email compose
  const [emailBody, setEmailBody] = useState("")
  // New email received popup
  const [showNewEmailPopup, setShowNewEmailPopup] = useState(false)
  const [newEmailData, setNewEmailData] = useState<{ from: string; subject: string; preview: string } | null>(null)
  // Selected carrier for capacity/rejection
  const [selectedAltCarrier, setSelectedAltCarrier] = useState<string | null>(null)

  // When user returns from inbox after reading reply email
  useEffect(() => {
    if (!returnedFromInbox) return

    // Delay consume so parent effects can also see the flag
    const consumeTimer = setTimeout(() => onReturnedFromInboxConsumed?.(), 100)

    if (scenarioId === "rate-mismatch") {
      // Show negotiation results — wait for user to click "Continue Booking"
      setShowModal(true)
      setPhase("negotiating")
    } else if (scenarioId === "missing-data") {
      // Re-open modal, fill the 3rd field (Shipper Contact), then auto-resolve
      setShowModal(true)
      setPhase("resolving")
      // Fields 0,1 already filled before email was sent — restore them
      setFilledFields([0, 1])
      setTimeout(() => {
        // Now fill the 3rd field from the email reply
        setFilledFields([0, 1, 2])
      }, 800)
      setTimeout(() => {
        setPhase("resolved")
        setTimeout(() => { setShowModal(false); onResolve() }, 1000)
      }, 2000)
    }
    return () => clearTimeout(consumeTimer)
  }, [returnedFromInbox])

  // ─── New Email Received Popup ────────────────────────────────────────────
  if (showNewEmailPopup && newEmailData) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">New Email Received</span>
            <button onClick={() => setShowNewEmailPopup(false)} className="p-1 rounded hover:bg-gray-100 transition-colors"><X size={14} className="text-gray-400" /></button>
          </div>
          <div className="px-5 py-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-blue-600" />
            </div>
            <p className="text-[14px] font-bold text-gray-900 mb-1">{newEmailData.from}</p>
            <p className="text-[12px] font-semibold text-gray-700 mb-2 leading-snug">{newEmailData.subject}</p>
            <p className="text-[11px] text-gray-500">{newEmailData.preview}</p>
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
            <button
              onClick={() => {
                setShowNewEmailPopup(false)
                onNavigateView?.("email-inbox")
              }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
            >
              View in Inbox
            </button>
            <button
              onClick={() => {
                setShowNewEmailPopup(false)
                onNavigateView?.("email-inbox")
              }}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Continue Workflow
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!resolution) return null

  const makeTs = () => {
    const now = new Date()
    return `${now.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}`
  }

  const MISSING_FIELDS = [
    { field: "Commodity HS Code", source: "SAP Material Master", value: "8471.30 — Laptop Parts", confidence: 99, aiResolved: true },
    { field: "Package Dimensions", source: "Historical Shipments (BKG-09812)", value: "60×40×30 cm / carton", confidence: 87, aiResolved: true },
    { field: "Shipper Contact", source: "Carrier Portal — Not Found", value: "", confidence: 0, aiResolved: false },
  ]

  // Scenario-specific alternative carriers
  const ALT_CARRIERS_REJECTION = [
    { carrier: "MSC", route: "MAA → Houston (IAH)", mode: "Ocean" as const, vessel: "MSC-ANNA / Mar 18", sailing: "Mar 18, 2025", rate: "$2,600", rateNote: "-1.5% vs contract", transit: "22 days", eta: "Apr 09, 2025", sla: "87%", container: "40' HC", capacity: "Available", reason: "Contracted carrier — next available vessel on MAA→IAH.", recommended: true, hasContract: true, contractId: "CTR-2024-002" },
    { carrier: "CMA-CGM", route: "MAA → Houston via Colombo", mode: "Ocean" as const, vessel: "CMA-Thalassa / Mar 19", sailing: "Mar 19, 2025", rate: "$2,950", rateNote: "+3% vs contract", transit: "24 days", eta: "Apr 12, 2025", sla: "89%", container: "40' HC", capacity: "Available", reason: "Transshipment via Colombo. Slightly longer transit.", recommended: false, hasContract: true, contractId: "CTR-2024-004" },
    { carrier: "DHL Express", route: "MAA → IAH (Air Freight)", mode: "Air" as const, vessel: "AI-442 / Daily", sailing: "Mar 16, 2025", rate: "$9,200", rateNote: "Premium", transit: "3 days", eta: "Mar 19, 2025", sla: "98%", container: "Air Pallet (PMC)", capacity: "Available", reason: "Urgent option — production impact $45K/day at IAH.", recommended: false, hasContract: false },
  ]
  const ALT_CARRIERS_CAPACITY = [
    { carrier: "Maersk", route: "BOM → Rotterdam (RTM)", mode: "Ocean" as const, vessel: "AE-1240 / Mar 24", sailing: "Mar 24, 2025", rate: "$2,350", rateNote: "+2% vs contract", transit: "21 days", eta: "Apr 14, 2025", sla: "92%", container: "20' STD", capacity: "Available", reason: "Contracted carrier — next sailing window with allocation.", recommended: true, hasContract: true, contractId: "CTR-2024-001" },
    { carrier: "Hapag-Lloyd", route: "BOM → RTM via Colombo", mode: "Ocean" as const, vessel: "Berlin Express / Mar 22", sailing: "Mar 22, 2025", rate: "$2,480", rateNote: "+5% vs contract", transit: "23 days", eta: "Apr 14, 2025", sla: "88%", container: "20' STD", capacity: "Limited", reason: "Transshipment routing. Limited spots remaining.", recommended: false, hasContract: true, contractId: "CTR-2023-003" },
    { carrier: "DHL Express", route: "BOM → RTM (Air Freight)", mode: "Air" as const, vessel: "LH-762 / Daily", sailing: "Mar 17, 2025", rate: "$7,800", rateNote: "Premium", transit: "2 days", eta: "Mar 19, 2025", sla: "97%", container: "Air Pallet (PMC)", capacity: "Available", reason: "Fastest option for time-critical cargo.", recommended: false, hasContract: false },
  ]
  const ALT_CARRIERS = scenarioId === "carrier-rejection" ? ALT_CARRIERS_REJECTION : ALT_CARRIERS_CAPACITY

  // ─── Scenario 1: Missing Data ─────────────────────────────────────────────
  const handleResolveMissingData = () => {
    setPhase("resolving")
    // Fill first 2 fields (AI resolved), then pause for email flow on 3rd
    setTimeout(() => setFilledFields([0]), 600)
    setTimeout(() => setFilledFields([0, 1]), 1400)
    setTimeout(() => {
      // 3rd field not found — open email compose
      setPhase("email-compose")
      setEmailBody("Dear Suzhou Plant Team,\n\nWe are processing booking SAP-TM-87234 (SHA→LAX) and require the shipper contact information for this order.\n\nPlease confirm the primary shipper contact name and phone number for the Suzhou Plant facility.\n\nRegards,\nZero Touch Booking Agent")
    }, 2200)
  }

  const handleSendMissingDataEmail = () => {
    onSendNotification?.({ id: `DEMO-SENT-MD-${Date.now()}`, to: "plant-logistics@suzhou.company.com", subject: "Data Request: Shipper Contact for SAP-TM-87234", body: emailBody, timestamp: makeTs(), type: "plant" })
    setShowModal(false)
    const ts = makeTs()
    setTimeout(() => {
      onAddInboxEmail?.({ id: `DEMO-INBOX-MD-${Date.now()}`, from: "li.wei@suzhou.company.com", fromName: "Li Wei (Suzhou Plant)", subject: "RE: Data Request: Shipper Contact for SAP-TM-87234", body: "Hi,\n\nShipper contact for SAP-TM-87234:\n\nName: Li Wei\nPhone: +86 512 6688 7799\nRole: Logistics Coordinator, Suzhou Plant\n\nPlease proceed with the booking.\n\nBest regards,\nLi Wei", timestamp: ts, read: false, tag: "carrier", tags: ["carrier", "data-request"], shipmentId: "BKG-NEW-001", shipmentRef: "SAP-TM-87234" })
    }, 1500)
    setTimeout(() => {
      setNewEmailData({ from: "Li Wei (Suzhou Plant)", subject: "RE: Data Request: Shipper Contact for SAP-TM-87234", preview: "Shipper contact: Li Wei, +86 512 6688 7799, Logistics Coordinator" })
      setShowNewEmailPopup(true)
    }, 2000)
  }

  // ─── Scenario 2 & 5: No Capacity / Carrier Rejection → contract check → carrier select ──
  const [contractCheckPhase, setContractCheckPhase] = useState(0) // 0=idle, 1=checking contracts, 2=no contracted available, 3=done
  const handleResolveWithCarrierSelect = () => {
    setPhase("resolving")
    setContractCheckPhase(1)
    // Phase 1: Check contracted carriers (1.2s)
    setTimeout(() => setContractCheckPhase(2), 1200)
    // Phase 2: Expand to spot market (2.4s)
    setTimeout(() => { setContractCheckPhase(3); setPhase("carrier-select") }, 2400)
  }

  const handleConfirmCarrier = () => {
    setPhase("resolved")
    setTimeout(() => { setShowModal(false); onResolve() }, 1000)
  }

  // ─── Scenario 3: Portal Failure → confirm before switching ─────────────
  const handleResolvePortalFailure = () => {
    setPhase("confirm-switch")
  }

  const handleConfirmSwitch = () => {
    // Show failover sequence inline, then resolve
    setPhase("resolving")
    // Auto-step through 4 failover steps
    let step = 0
    const stepInterval = setInterval(() => {
      step++
      setAutoStep(step)
      if (step >= 4) {
        clearInterval(stepInterval)
        setTimeout(() => {
          setPhase("resolved")
          setTimeout(() => { setShowModal(false); onResolve() }, 1200)
        }, 800)
      }
    }, 900)
  }

  // ─── Scenario 4: Rate Mismatch → auto email compose → auto send → inbox reply ──
  const handleResolveRateMismatch = () => {
    setPhase("email-compose")
    setEmailBody("Dear Maersk Booking Team,\n\nRe: Booking SAP-TM-87234 (SHA→LAX)\n\nThe quoted rate of $3,340/container is 19% above our contract rate of $2,800.\n\nBased on current market conditions (SHA→LAX 30-day avg: $3,480), we propose a counter-rate of $3,024/container (contract + 8% market adjustment).\n\nPlease confirm acceptance to proceed with booking.\n\nRegards,\nZero Touch Booking Agent")
  }

  const handleSendRateEmail = () => {
    onSendNotification?.({ id: `DEMO-SENT-RM-${Date.now()}`, to: "rates@maersk.com", subject: "Counter-Offer: SAP-TM-87234 — $3,024/container (SHA→LAX)", body: emailBody, timestamp: makeTs(), type: "carrier" })
    setShowModal(false)
    // Add reply to inbox after 1.5s, show popup after 2s
    const ts = makeTs()
    setTimeout(() => {
      onAddInboxEmail?.({ id: `DEMO-INBOX-RM-${Date.now()}`, from: "rates@maersk.com", fromName: "Maersk Rate Desk", subject: "RE: Counter-Offer Accepted — $3,024/container (SHA→LAX)", body: "Dear Customer,\n\nWe accept your counter-offer.\n\nConfirmed Rate: $3,024/container\nRoute: SHA→LAX\nBooking: SAP-TM-87234\nSavings: $316/container vs original quote\n\nPlease proceed with booking submission.\n\nMaersk Rate Desk", timestamp: ts, read: false, tag: "carrier", tags: ["carrier", "rate"], shipmentId: "BKG-NEW-001", shipmentRef: "SAP-TM-87234" })
    }, 1500)
    setTimeout(() => {
      setNewEmailData({ from: "Maersk Rate Desk", subject: "RE: Counter-Offer Accepted — $3,024/container (SHA→LAX)", preview: "We accept your counter-offer. Confirmed Rate: $3,024/container" })
      setShowNewEmailPopup(true)
    }, 2000)
  }

  // Main resolve dispatcher
  const handleResolve = () => {
    if (scenarioId === "missing-data") handleResolveMissingData()
    else if (scenarioId === "no-capacity") handleResolveWithCarrierSelect()
    else if (scenarioId === "portal-failure") handleResolvePortalFailure()
    else if (scenarioId === "rate-mismatch") handleResolveRateMismatch()
    else if (scenarioId === "carrier-rejection") handleResolveWithCarrierSelect()
  }


  // ─── Email Compose Card (Gmail-style, shared by missing-data and rate-mismatch) ──
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [followUpDate, setFollowUpDate] = useState("")
  const emailTo = scenarioId === "rate-mismatch" ? "rates@maersk.com" : "plant-logistics@suzhou.company.com"
  const emailSubject = scenarioId === "rate-mismatch" ? "Counter-Offer: SAP-TM-87234 — $3,024/container" : "Data Request: Shipper Contact for SAP-TM-87234"

  const emailComposeContent = (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Header bar */}
        <div className="bg-gray-800 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white">New Message</span>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-gray-700 transition-colors"><ArrowDown size={12} className="text-gray-400" /></button>
            <button className="p-1 rounded hover:bg-gray-700 transition-colors"><X size={12} className="text-gray-400" /></button>
          </div>
        </div>

        {/* Email fields */}
        <div className="divide-y divide-gray-100">
          <div className="flex items-center px-4 py-2">
            <span className="text-[12px] text-gray-400 w-14 shrink-0">From</span>
            <span className="text-[12px] text-gray-700 font-medium">Zero Touch Agent &lt;agent@logistics.co&gt;</span>
          </div>
          <div className="flex items-center px-4 py-2">
            <span className="text-[12px] text-gray-400 w-14 shrink-0">To</span>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[12px] bg-blue-50 text-blue-700 font-medium px-2.5 py-0.5 rounded-full border border-blue-200">{emailTo}</span>
            </div>
            <button onClick={() => setShowCcBcc(!showCcBcc)} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium ml-2">Cc Bcc</button>
          </div>
          {showCcBcc && (
            <>
              <div className="flex items-center px-4 py-2">
                <span className="text-[12px] text-gray-400 w-14 shrink-0">Cc</span>
                <input className="flex-1 text-[12px] text-gray-700 outline-none placeholder:text-gray-300" placeholder="Add recipients" />
              </div>
              <div className="flex items-center px-4 py-2">
                <span className="text-[12px] text-gray-400 w-14 shrink-0">Bcc</span>
                <input className="flex-1 text-[12px] text-gray-700 outline-none placeholder:text-gray-300" placeholder="Add recipients" />
              </div>
            </>
          )}
          <div className="flex items-center px-4 py-2">
            <span className="text-[12px] text-gray-400 w-14 shrink-0">Subject</span>
            <span className="text-[12px] text-gray-800 font-semibold">{emailSubject}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-2 pb-0">
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            className="w-full text-[13px] text-gray-700 leading-relaxed min-h-[200px] focus:outline-none resize-none"
          />
        </div>

        {/* Bottom toolbar */}
        <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-0.5">
            <button className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-400"><FileText size={14} /></button>
            <button className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-400"><MapPin size={14} /></button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <div className="relative flex items-center">
              <button onClick={() => { const el = document.getElementById('email-date-picker'); el?.showPicker?.() }} className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-400 flex items-center gap-1">
                <Calendar size={14} />
                {followUpDate && <span className="text-[10px] text-blue-600 font-medium">{followUpDate}</span>}
              </button>
              <input
                id="email-date-picker"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-6 cursor-pointer"
              />
            </div>
          </div>
          <button
            onClick={scenarioId === "rate-mismatch" ? handleSendRateEmail : handleSendMissingDataEmail}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Send size={13} /> Send
          </button>
        </div>
      </div>
    </div>
  )

  // ─── Carrier Selection Panel (shared by no-capacity and carrier-rejection) ─
  const MODE_CARD: Record<string, { Icon: typeof Ship; color: string; bg: string; strip: string; label: string; border: string }> = {
    Ocean: { Icon: Ship, color: "text-blue-600", bg: "bg-blue-50", strip: "bg-blue-600", label: "Ocean Freight", border: "border-blue-200" },
    Air:   { Icon: Plane, color: "text-violet-600", bg: "bg-violet-50", strip: "bg-violet-600", label: "Air Freight", border: "border-violet-200" },
    Road:  { Icon: Truck, color: "text-emerald-600", bg: "bg-emerald-50", strip: "bg-emerald-600", label: "Ground Freight", border: "border-emerald-200" },
  }

  const carrierSelectContent = (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Contract-first check banner */}
      <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-blue-600" />
          <span className="text-[12px] font-bold text-blue-800">Contract-First Carrier Check</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {contractCheckPhase >= 2 ? <CheckCircle size={12} className="text-emerald-500" /> : <Loader2 size={12} className="text-blue-500 animate-spin" />}
            <span className={cn("text-[11px]", contractCheckPhase >= 2 ? "text-emerald-700" : "text-blue-700")}>
              {contractCheckPhase >= 2 ? "Checked contracted carriers on this lane" : "Checking contracted carriers for available capacity..."}
            </span>
          </div>
          {contractCheckPhase >= 2 && (
            <div className="flex items-center gap-2">
              {contractCheckPhase >= 3 ? <CheckCircle size={12} className="text-emerald-500" /> : <Loader2 size={12} className="text-blue-500 animate-spin" />}
              <span className={cn("text-[11px]", contractCheckPhase >= 3 ? "text-emerald-700" : "text-blue-700")}>
                {contractCheckPhase >= 3 ? `${ALT_CARRIERS.length} alternatives found — select a carrier to rebook` : "Finding alternatives..."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Carrier cards — same layout as Step 2 */}
      <div className="space-y-3">
        {/* Recommended — full width */}
        {ALT_CARRIERS.filter(c => c.recommended).map((c) => {
          const isSelected = selectedAltCarrier === c.carrier
          return (
            <button key={c.carrier} onClick={() => setSelectedAltCarrier(c.carrier)} className={cn("w-full text-left border rounded-xl transition-all overflow-hidden", isSelected ? "border-blue-400 ring-1 ring-blue-200 bg-white shadow-md" : "border-gray-200 hover:border-blue-300 bg-white")}>
              <div className={cn("px-4 py-3 flex items-center justify-between border-b", isSelected ? "bg-blue-50/50 border-blue-100" : "bg-gray-50/50 border-gray-100")}>
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold border", isSelected ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200")}>{c.carrier.slice(0, 3).toUpperCase()}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-gray-900">{c.carrier}</span>
                      {c.hasContract && <span className="text-[9px] flex items-center gap-0.5 font-semibold text-emerald-600"><ShieldCheck size={10} /> Contracted ({c.contractId})</span>}
                      <span className="text-[8px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold uppercase">Recommended</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{c.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[18px] font-extrabold text-gray-900">{c.rate}</div>
                  <span className={cn("text-[10px] font-semibold", c.rateNote.startsWith("-") ? "text-emerald-600" : "text-amber-600")}>{c.rateNote}</span>
                </div>
              </div>
              <div className="px-4 py-3 grid grid-cols-6 gap-3">
                <div><span className="text-[9px] text-gray-400 uppercase font-medium">{c.mode === "Air" ? "Flight" : "Vessel"}</span><div className="text-[12px] font-bold text-gray-900">{c.vessel.split(" / ")[0]}</div></div>
                <div><span className="text-[9px] text-gray-400 uppercase font-medium">Departure</span><div className="text-[12px] font-bold text-gray-900">{c.sailing}</div></div>
                <div><span className="text-[9px] text-gray-400 uppercase font-medium">Transit</span><div className="text-[12px] font-bold text-gray-900">{c.transit}</div></div>
                <div><span className="text-[9px] text-gray-400 uppercase font-medium">ETA</span><div className="text-[12px] font-bold text-gray-900">{c.eta}</div></div>
                <div><span className="text-[9px] text-gray-400 uppercase font-medium">SLA</span><div className="text-[12px] font-bold text-gray-900">{c.sla}</div></div>
                <div><span className="text-[9px] text-gray-400 uppercase font-medium">Capacity</span><div className={cn("text-[12px] font-bold", c.capacity === "Available" ? "text-emerald-600" : "text-amber-600")}>{c.capacity}</div></div>
              </div>
            </button>
          )
        })}

        {/* Alternatives — side by side */}
        <div className="grid grid-cols-2 gap-3">
          {ALT_CARRIERS.filter(c => !c.recommended).map((c) => {
            const isSelected = selectedAltCarrier === c.carrier
            return (
              <button key={c.carrier} onClick={() => setSelectedAltCarrier(c.carrier)} className={cn("w-full text-left border rounded-xl transition-all overflow-hidden", isSelected ? "border-blue-400 ring-1 ring-blue-200 bg-white shadow-md" : "border-gray-200 hover:border-blue-300 bg-white")}>
                <div className={cn("px-4 py-3 flex items-center justify-between border-b", isSelected ? "bg-blue-50/50 border-blue-100" : "bg-gray-50/50 border-gray-100")}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-bold border", isSelected ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200")}>{c.carrier.slice(0, 3).toUpperCase()}</div>
                    <div>
                      <span className="text-[13px] font-bold text-gray-900">{c.carrier}</span>
                      {c.hasContract && <span className="text-[9px] flex items-center gap-0.5 font-semibold text-emerald-600 mt-0.5"><ShieldCheck size={9} /> Contracted</span>}
                      {c.mode === "Air" && <span className="text-[9px] text-amber-600 font-semibold mt-0.5 block">Air Freight — Premium</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[16px] font-extrabold text-gray-900">{c.rate}</div>
                    <span className={cn("text-[10px] font-semibold", c.rateNote === "Premium" ? "text-amber-600" : c.rateNote.startsWith("-") ? "text-emerald-600" : "text-amber-600")}>{c.rateNote}</span>
                  </div>
                </div>
                <div className="px-4 py-2.5 grid grid-cols-4 gap-2">
                  <div><span className="text-[9px] text-gray-400 uppercase font-medium">Transit</span><div className="text-[12px] font-bold text-gray-900">{c.transit}</div></div>
                  <div><span className="text-[9px] text-gray-400 uppercase font-medium">SLA</span><div className="text-[12px] font-bold text-gray-900">{c.sla}</div></div>
                  <div><span className="text-[9px] text-gray-400 uppercase font-medium">Capacity</span><div className={cn("text-[12px] font-bold", c.capacity === "Available" ? "text-emerald-600" : "text-amber-600")}>{c.capacity}</div></div>
                  <div><span className="text-[9px] text-gray-400 uppercase font-medium">ETA</span><div className="text-[12px] font-bold text-gray-900">{c.eta}</div></div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{selectedAltCarrier ? `Selected: ${selectedAltCarrier}` : "Click a carrier to select"}</span>
        <button onClick={handleConfirmCarrier} disabled={!selectedAltCarrier} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 shadow-sm">
          <Check size={14} /> Confirm & Book
        </button>
      </div>
    </div>
  )

  // ─── Confirm Switch Dialog (portal-failure) ────────────────────────────────
  const confirmSwitchContent = (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-blue-600" />
          <span className="text-[13px] font-bold text-blue-800">Switch to Backup Channel?</span>
        </div>
        <div className="text-[12px] text-blue-700 leading-relaxed">
          Maersk Portal is down (HTTP 503). AI recommends switching to <span className="font-bold">INTTRA EDI channel</span> to resubmit the booking. This is a verified backup channel with 99.9% uptime.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="p-2 bg-white rounded border border-blue-200"><span className="text-[10px] text-gray-400">Current</span><div className="text-[12px] font-bold text-red-600">Maersk Portal ✕</div></div>
          <div className="p-2 bg-white rounded border border-blue-200"><span className="text-[10px] text-gray-400">Backup</span><div className="text-[12px] font-bold text-blue-600">INTTRA EDI ✓</div></div>
        </div>
      </div>
    </div>
  )

  const scenarioContent: Record<string, React.ReactNode> = {
    "missing-data": (
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Missing Fields Detected</div>
        <div className="space-y-2">
          {MISSING_FIELDS.map((f, idx) => {
            const isFilled = filledFields.includes(idx)
            const isScanning = phase === "resolving" && !isFilled && f.aiResolved
            const isEmailNeeded = !f.aiResolved && phase === "resolving"
            return (
              <div key={f.field} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all duration-500",
                isFilled ? "bg-emerald-50 border-emerald-300" : isScanning ? "bg-blue-50 border-blue-300 animate-pulse" : isEmailNeeded ? "bg-amber-50 border-amber-300" : "bg-white border-gray-200"
              )}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500",
                  isFilled ? "bg-emerald-100" : isEmailNeeded ? "bg-amber-100" : isScanning ? "bg-blue-100" : "bg-amber-100"
                )}>
                  {isFilled ? <CheckCircle size={14} className="text-emerald-600" /> : isScanning ? <Loader2 size={14} className="text-blue-500 animate-spin" /> : isEmailNeeded ? <Mail size={14} className="text-amber-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-gray-800">{f.field}</div>
                  <div className="text-[10px] text-gray-400">Source: {f.source}</div>
                </div>
                <div className="text-right shrink-0">
                  {isFilled ? (
                    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="text-[11px] font-semibold text-emerald-700">{f.value || "Li Wei, +86 512 6688 7799"}</div>
                      <div className="text-[9px] text-emerald-500 font-medium">{f.confidence || 95}% match</div>
                    </div>
                  ) : isEmailNeeded ? (
                    <div className="text-[10px] text-amber-600 font-medium">Email Required</div>
                  ) : isScanning ? (
                    <div className="text-[10px] text-blue-500 font-medium">Searching...</div>
                  ) : (
                    <div className="text-[10px] text-red-500 font-medium">Missing</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {phase === "email-compose" && emailComposeContent}
        {phase === "waiting-reply" && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
            <Loader2 size={14} className="text-blue-500 animate-spin" />
            <span className="text-[12px] font-medium text-blue-600">Waiting for carrier reply<ThinkingDots /></span>
          </div>
        )}
        {phase === "resolved" && (
          <div className="bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span className="text-[13px] font-bold text-emerald-700">3/3 Fields Resolved — 2 by AI, 1 via email</span>
            </div>
          </div>
        )}
      </div>
    ),
    "no-capacity": (
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Carrier Capacity Sweep — SHA→LAX</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { carrier: "Maersk", status: "Full", next: "Mar 28 (+5d)" },
            { carrier: "MSC", status: "Full", next: "Mar 29 (+6d)" },
            { carrier: "CMA-CGM", status: "Full", next: "Mar 27 (+4d)" },
            { carrier: "Hapag-Lloyd", status: "Full", next: "Mar 30 (+7d)" },
          ].map((c) => (
            <div key={c.carrier} className="p-2.5 bg-white rounded-lg border border-gray-200 text-center">
              <div className="text-[12px] font-bold text-gray-800">{c.carrier}</div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block bg-red-100 text-red-700">{c.status}</span>
              <div className="text-[10px] text-gray-400 mt-1">Next: {c.next}</div>
            </div>
          ))}
        </div>
        {phase === "carrier-select" && carrierSelectContent}
        {phase === "resolved" && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-200 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-600" />
              <span className="text-[12px] font-bold text-blue-700">Rerouted via {selectedAltCarrier}. Booking submitted.</span>
            </div>
          </div>
        )}
      </div>
    ),
    "portal-failure": (
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Portal Health Dashboard</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { portal: "Maersk Portal", status: "Offline", detail: "HTTP 503 · 14:23 UTC", color: "bg-red-50 text-red-700 border-red-200" },
            { portal: "MSC Portal", status: "Online", detail: "99.8% · Healthy", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { portal: "CMA-CGM Portal", status: "Online", detail: "99.2% · Healthy", color: "bg-blue-50 text-blue-700 border-blue-200" },
            { portal: "Hapag-Lloyd Portal", status: "Degraded", detail: "94.1% · Slow response", color: "bg-amber-50 text-amber-700 border-amber-200" },
          ].map((p) => (
            <div key={p.portal} className={cn("p-2.5 rounded-lg border", p.color)}>
              <div className="text-[11px] font-bold">{p.portal}</div>
              <div className="text-[13px] font-bold mt-0.5">{p.status}</div>
              <div className="text-[10px] opacity-70">{p.detail}</div>
            </div>
          ))}
        </div>
        {phase === "confirm-switch" && confirmSwitchContent}
        {(phase === "resolving" || phase === "resolved") && (
          <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">AI Failover Sequence</div>
            {["Detecting outage scope — 47 shippers affected", "Switching to INTTRA EDI channel", "Resubmitting booking via EDI", "Confirmed — INTTRA-88421"].map((step, idx) => (
              <div key={idx} className={cn("flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-300",
                autoStep > idx ? "bg-blue-50 border-blue-200" : autoStep === idx ? "bg-blue-50 border-blue-300 animate-pulse" : "bg-gray-50 border-gray-100"
              )}>
                {autoStep > idx ? <CheckCircle size={14} className="text-blue-600 shrink-0" /> :
                 autoStep === idx ? <Loader2 size={14} className="text-blue-500 animate-spin shrink-0" /> :
                 <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" />}
                <span className={cn("text-[12px] font-medium", autoStep > idx ? "text-blue-700" : autoStep === idx ? "text-blue-700" : "text-gray-400")}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    "rate-mismatch": (
      <div className="space-y-3">
        {phase === "showing" && (
          <>
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rate Comparison</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <div className="text-[10px] text-blue-600 font-semibold">Contract Rate</div>
                <div className="text-[22px] font-bold text-blue-700">$2,800</div>
                <div className="text-[10px] text-blue-500">per container</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <div className="text-[10px] text-amber-600 font-semibold">Quoted Rate</div>
                <div className="text-[22px] font-bold text-amber-700">$3,340</div>
                <div className="text-[10px] text-amber-500">+19% premium</div>
              </div>
            </div>
          </>
        )}
        {phase === "email-compose" && emailComposeContent}
        {/* Negotiation results — shown when returning from inbox */}
        {phase === "negotiating" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="p-4 bg-[#0f1623] rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={16} className="text-blue-400" />
                <span className="text-[13px] font-bold text-white">Negotiation Complete</span>
              </div>
              {/* 3 completed steps */}
              <div className="space-y-2 mb-4">
                {[
                  { label: "Validated counter-offer against contract CTR-2024-001", detail: "$3,024 vs contract ceiling $2,800 — within 8% market adjustment" },
                  { label: "Cross-referenced 30-day spot market data (SHA→LAX)", detail: "Market avg: $3,480 — counter-offer 13% below market" },
                  { label: "Rate lock confirmed by Maersk booking system", detail: "$3,024/container locked for 7 business days" },
                ].map((s, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-blue-950/50 border border-blue-800">
                    <div className="flex items-center gap-2 mb-0.5">
                      <CheckCircle2 size={12} className="text-blue-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-white">{s.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 ml-5">{s.detail}</p>
                  </div>
                ))}
              </div>
              {/* Progress bar — 100% */}
              <div className="mb-4">
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full w-full" /></div>
                <p className="text-[10px] text-slate-500 text-center mt-1">100% complete</p>
              </div>
              {/* Results */}
              <div className="space-y-1.5">
                {[
                  { label: "Market Rate (30d avg)", value: "$3,480", badge: "Benchmark", color: "text-slate-300" },
                  { label: "Carrier Quote", value: "$3,340", badge: "-4% vs market", color: "text-amber-300" },
                  { label: "Counter-Offer", value: "$3,024", badge: "Sent", color: "text-blue-300" },
                  { label: "Carrier Accepted", value: "$3,024", badge: "Locked", color: "text-blue-300" },
                ].map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      {r.badge === "Locked" ? <CheckCircle size={12} className="text-blue-400" /> : <div className="w-3 h-3 rounded-full border border-slate-600" />}
                      <span className={cn("text-[11px] font-medium", r.color)}>{r.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white">{r.value}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                        r.badge === "Locked" ? "bg-blue-900/50 text-blue-300" : r.badge === "Sent" ? "bg-blue-900/50 text-blue-300" : "bg-slate-700 text-slate-400"
                      )}>{r.badge}</span>
                    </div>
                  </div>
                ))}
                <div className="mt-2 px-2 py-1.5 bg-blue-900/30 rounded-lg border border-blue-800/50">
                  <span className="text-[11px] text-blue-300 font-medium">Savings: <span className="font-bold">$316/container</span> ($632 total for 2×40' HC)</span>
                </div>
              </div>
            </div>
            {/* Continue button — user must click to proceed */}
            <button
              onClick={() => { setPhase("resolved"); setTimeout(() => { setShowModal(false); onResolve() }, 800) }}
              className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowRight size={14} /> Continue Booking
            </button>
          </div>
        )}
      </div>
    ),
    "carrier-rejection": (
      <div className="space-y-3">
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Rejection Details</div>
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {[["Booking Ref", "MAEU-2024-SHA-78432"], ["Rejection Code", "EQ-UNAVAIL-HC40"], ["Reason", "40' HC not available"], ["Vessel", "AE-1234 (Mar 22)"]].map(([l, v]) => (
              <div key={l}><span className="text-[10px] text-red-400">{l}</span><div className="text-[11px] font-semibold text-red-800">{v}</div></div>
            ))}
          </div>
        </div>
        {phase === "carrier-select" && carrierSelectContent}
        {phase === "resolved" && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-blue-600" />
              <span className="text-[12px] font-bold text-blue-700">Re-booked with {selectedAltCarrier || "MSC"}</span>
            </div>
          </div>
        )}
      </div>
    ),
  }

  // ─── Dynamic Footer ────────────────────────────────────────────────────────
  const renderFooter = () => {
    if (phase === "resolved") {
      return (
        <div className="flex items-center gap-2 justify-center py-1">
          <CheckCircle size={14} className="text-blue-600" />
          <span className="text-[12px] font-semibold text-blue-600">Exception resolved — continuing booking flow</span>
        </div>
      )
    }
    if (phase === "email-compose") {
      return null // Send button is now integrated into the email compose card
    }
    if (phase === "waiting-reply") {
      return (
        <div className="flex items-center gap-2 justify-center py-1">
          <Loader2 size={14} className="text-blue-500 animate-spin" />
          <span className="text-[12px] font-medium text-blue-600">Awaiting reply<ThinkingDots /></span>
        </div>
      )
    }
    if (phase === "carrier-select") {
      return null // Confirm button is now integrated into the carrier select card
    }
    if (phase === "confirm-switch") {
      return (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setPhase("showing")} className="px-4 py-2 border border-gray-300 text-gray-600 text-[12px] font-medium rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleConfirmSwitch} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            <Check size={14} /> Confirm Switch to EDI
          </button>
        </div>
      )
    }
    if (phase === "negotiating") {
      return (
        <div className="flex items-center gap-2 justify-center py-1">
          <CheckCircle size={14} className="text-blue-500" />
          <span className="text-[12px] font-medium text-blue-600">Rate negotiation complete — review results above</span>
        </div>
      )
    }
    if (phase === "resolving") {
      return (
        <div className="flex items-center gap-2 justify-center py-1">
          <Loader2 size={14} className="text-blue-500 animate-spin" />
          <span className="text-[12px] font-medium text-blue-600">AI resolving<ThinkingDots /></span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          {resolution.alternatives.map((alt, idx) => (
            <button key={idx} onClick={handleResolve} className="px-3 py-2 border border-gray-300 text-gray-600 text-[12px] font-medium rounded-lg hover:bg-gray-50 transition-colors">{alt.label}</button>
          ))}
        </div>
        <button onClick={handleResolve} className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"><Sparkles size={13} /> {resolution.resolveLabel}</button>
      </div>
    )
  }

  // ─── Independent Email Compose overlay (not inside exception modal) ──────
  if (phase === "email-compose" && showModal) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div className="w-full max-w-3xl mx-4 animate-in zoom-in-95 fade-in duration-300">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
            {/* Gmail-style header */}
            <div className="bg-gray-800 px-5 py-3 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-white">New Message</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-gray-700 transition-colors"><ArrowDown size={13} className="text-gray-400" /></button>
                <button onClick={() => setPhase("showing")} className="p-1.5 rounded hover:bg-gray-700 transition-colors"><X size={13} className="text-gray-400" /></button>
              </div>
            </div>

            {/* Email fields */}
            <div className="divide-y divide-gray-100">
              <div className="flex items-center px-5 py-2.5">
                <span className="text-[13px] text-gray-400 w-16 shrink-0">From</span>
                <span className="text-[13px] text-gray-700 font-medium">Zero Touch Agent &lt;agent@logistics.co&gt;</span>
              </div>
              <div className="flex items-center px-5 py-2.5">
                <span className="text-[13px] text-gray-400 w-16 shrink-0">To</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[12px] bg-blue-50 text-blue-700 font-medium px-3 py-1 rounded-full border border-blue-200">{emailTo}</span>
                </div>
                <button onClick={() => setShowCcBcc(!showCcBcc)} className="text-[12px] text-gray-400 hover:text-gray-600 font-medium ml-2">Cc Bcc</button>
              </div>
              {showCcBcc && (
                <>
                  <div className="flex items-center px-5 py-2.5">
                    <span className="text-[13px] text-gray-400 w-16 shrink-0">Cc</span>
                    <input className="flex-1 text-[13px] text-gray-700 outline-none placeholder:text-gray-300" placeholder="Add recipients" />
                  </div>
                  <div className="flex items-center px-5 py-2.5">
                    <span className="text-[13px] text-gray-400 w-16 shrink-0">Bcc</span>
                    <input className="flex-1 text-[13px] text-gray-700 outline-none placeholder:text-gray-300" placeholder="Add recipients" />
                  </div>
                </>
              )}
              <div className="flex items-center px-5 py-2.5">
                <span className="text-[13px] text-gray-400 w-16 shrink-0">Subject</span>
                <span className="text-[13px] text-gray-800 font-semibold">{emailSubject}</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pt-3 pb-1">
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full text-[13px] text-gray-700 leading-relaxed min-h-[260px] focus:outline-none resize-none"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-1">
                <button className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-400"><FileText size={15} /></button>
                <button className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-400"><MapPin size={15} /></button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <div className="relative flex items-center">
                  <button onClick={() => { const el = document.getElementById('email-date-picker'); el?.showPicker?.() }} className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-400 flex items-center gap-1.5">
                    <Calendar size={15} />
                    {followUpDate && <span className="text-[11px] text-blue-600 font-medium">{followUpDate}</span>}
                  </button>
                  <input
                    id="email-date-picker"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="absolute inset-0 opacity-0 w-8 cursor-pointer"
                  />
                </div>
              </div>
              <button
                onClick={scenarioId === "rate-mismatch" ? handleSendRateEmail : handleSendMissingDataEmail}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Send size={14} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Independent Carrier Select overlay (reuses carrierSelectContent) ──────
  if (phase === "carrier-select" && showModal) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
        <div className="w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-300 bg-white rounded-2xl border border-gray-200 shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Ship size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-gray-900">Select Alternative Carrier</h2>
              <p className="text-[12px] text-gray-500">{ALT_CARRIERS.length} options available — select a carrier to rebook</p>
            </div>
          </div>
          {carrierSelectContent}
        </div>
      </div>
    )
  }

  return (
    <DemoModal
      open={showModal}
      title={resolution.title}
      subtitle={resolution.description}
      icon={<div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center"><AlertTriangle size={18} className="text-amber-600" /></div>}
      width="2xl"
      showClose={false}
      footer={renderFooter()}
    >
      <div className="bg-amber-50 rounded-lg px-4 py-3 border border-amber-200 mb-4">
        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Impact Assessment</div>
        <div className="text-[12px] text-amber-800">{resolution.impact}</div>
      </div>
      {scenarioContent[scenarioId]}
      {phase === "showing" && (
        <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-200 mt-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Brain size={13} className="text-blue-600" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">AI Recommendation</span>
          </div>
          <div className="text-[12px] text-blue-800">{resolution.aiRecommendation}</div>
        </div>
      )}
    </DemoModal>
  )
}
// ─── Unified Overview (Req 6: All content in single scrollable view) ──────

function OverviewTab({ shipment, actions, onApprove, resuming, resumed, onResumeWorkflow,
  approvedReroute, syncing, onSyncOTM, onSendEmail, onSendMessage, onSendBoth,
  showNotifyConfirmation, notifyType, showNotifyPrompt, onDismissNotifyPrompt,
}: {
  shipment: BookingRequest; actions: ActionState; onApprove: () => void
  resuming: boolean; resumed: boolean; onResumeWorkflow: () => void
  approvedReroute: boolean
  syncing: boolean; onSyncOTM: () => void
  onSendEmail: () => void; onSendMessage: () => void; onSendBoth: () => void
  showNotifyConfirmation: boolean; notifyType: "email" | "message" | "both" | null
  showNotifyPrompt: boolean; onDismissNotifyPrompt: () => void
}) {
  const hasFailed = shipment.workflowSteps.some((s) => s.status === "failed")

  // Req 1: AI thinking animation for Agent Summary
  const [agentThinking, setAgentThinking] = useState(true)
  // Req 1: AI thinking animation for Carrier Recommendation section
  const [carrierThinking, setCarrierThinking] = useState(true)

  useEffect(() => {
    setAgentThinking(true)
    setCarrierThinking(true)
    const t1 = setTimeout(() => setAgentThinking(false), 1400)
    const t2 = setTimeout(() => setCarrierThinking(false), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [shipment.id])

  const recommended = shipment.carrierOptions.find((c) => c.recommended)

  return (
    <div className="p-5 space-y-5">
      {/* Summary header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ModeBadge mode={shipment.mode} />
          {shipment.carrier !== "—" && <CarrierBadge carrier={shipment.carrier} />}
          {shipment.exceptionType !== "None" && <ExceptionBadge type={shipment.exceptionType} />}
        </div>
        <div className="text-xs text-gray-500 space-y-0.5">
          <p><span className="font-medium text-gray-700">SAP Ref:</span> {shipment.sapOrderRef}</p>
          <p><span className="font-medium text-gray-700">Container:</span> {shipment.containerType}</p>
          <p><span className="font-medium text-gray-700">Target Ship:</span> {shipment.targetShipDate}</p>
          {shipment.bookingRef && <p><span className="font-medium text-gray-700">Booking Ref:</span> {shipment.bookingRef}</p>}
          {shipment.vesselSchedule && <p><span className="font-medium text-gray-700">Vessel:</span> {shipment.vesselSchedule}</p>}
        </div>
        <ReasonChips chips={shipment.reasonChips} />
      </div>

      {/* Req 1: Agent Summary with thinking animation */}
      {agentThinking ? (
        <AIThinkingSkeleton label="Agent analyzing booking context" />
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Brain size={13} className="text-indigo-500" />
            <span className="text-[11px] font-semibold text-indigo-700">Agent Summary</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{shipment.agentSummary}</p>
        </div>
      )}

      {/* Notification confirmation card — dynamic based on notifyType */}
      {actions.notified && showNotifyConfirmation && notifyType && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-600" />
            <span className="text-xs font-bold text-green-700">
              {notifyType === "both" ? "Notifications Sent Successfully" :
               notifyType === "email" ? "Email Sent Successfully" :
               "Message Sent Successfully"}
            </span>
          </div>
          <div className={cn("grid gap-2", notifyType === "both" ? "grid-cols-2" : "grid-cols-1")}>
            {(notifyType === "message" || notifyType === "both") && (
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-green-100">
                <Bell size={12} className="text-blue-500" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">In-App Message</p>
                  <p className="text-[9px] text-gray-400">Sent to plant team</p>
                </div>
              </div>
            )}
            {(notifyType === "email" || notifyType === "both") && (
              <div className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-green-100">
                <Mail size={12} className="text-indigo-500" />
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Email Notification</p>
                  <p className="text-[9px] text-gray-400">Sent to stakeholders</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approval banner removed — approval handled via exception panels */}

      {/* ── 8-Step Workflow Stepper (Req 2: newest on top) ──────────── */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Booking Workflow</h4>
        <div className="space-y-0">
          {[...shipment.workflowSteps].reverse().map((step, ri) => {
            const i = shipment.workflowSteps.length - 1 - ri  // original index for icons
            const Icon = STEP_ICONS[i] ?? FileText
            // Override status when resuming/resumed
            let effectiveStatus = step.status
            if (step.status === "failed" && (resuming || resumed)) {
              effectiveStatus = resuming ? "active" : "completed"
            }
            // Req 5: Approve reroute changes failed → completed (green)
            if (step.status === "failed" && approvedReroute) {
              effectiveStatus = "completed"
            }
            // If this is the step right after the failed one and we've resumed, make it active
            const failedIdx = shipment.workflowSteps.findIndex((s) => s.status === "failed")
            if (resumed && failedIdx >= 0 && i === failedIdx + 1 && step.status === "pending") {
              effectiveStatus = "active"
            }

            const isCompleted = effectiveStatus === "completed"
            const isActive = effectiveStatus === "active"
            const isFailed = effectiveStatus === "failed"
            const isPending = effectiveStatus === "pending"

            return (
              <div key={step.step} className="flex gap-3">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                    isCompleted ? "bg-green-500 border-green-500 text-white" :
                    isActive ? "bg-blue-500 border-blue-500 text-white" :
                    isFailed ? "bg-red-500 border-red-500 text-white" :
                    "bg-white border-gray-300 text-gray-400"
                  )}>
                    {isCompleted ? <Check size={12} /> :
                     isActive ? <Loader2 size={12} className="animate-spin" /> :
                     isFailed ? <X size={12} /> :
                     <Icon size={12} />}
                  </div>
                  {ri < shipment.workflowSteps.length - 1 && (
                    <div className={cn(
                      "w-0.5 flex-1 min-h-[12px]",
                      isCompleted ? "bg-green-400" : isFailed ? "bg-red-300" : "bg-gray-200"
                    )} />
                  )}
                </div>

                {/* Step content */}
                <div className={cn("flex-1 pb-3", isPending && "opacity-50")}>
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-xs font-semibold",
                      isCompleted ? "text-green-700" :
                      isActive ? "text-blue-700" :
                      isFailed ? "text-red-700" :
                      "text-gray-400"
                    )}>
                      {step.title}
                    </p>
                    {step.system && (
                      <span className={cn(
                        "text-[9px] font-medium px-1.5 py-0.5 rounded border",
                        isCompleted ? "bg-green-50 text-green-600 border-green-200" :
                        isActive ? "bg-blue-50 text-blue-600 border-blue-200" :
                        isFailed ? "bg-red-50 text-red-600 border-red-200" :
                        "bg-gray-50 text-gray-400 border-gray-200"
                      )}>
                        {step.system}
                      </span>
                    )}
                    {/* Resumed label */}
                    {step.status === "failed" && resumed && !approvedReroute && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                        Resumed
                      </span>
                    )}
                    {/* Req 5: Resolved label after approve */}
                    {step.status === "failed" && approvedReroute && (
                      <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                        Resolved
                      </span>
                    )}
                  </div>
                  {step.timestamp && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{step.timestamp}</p>
                  )}
                  {step.detail && !resumed && !approvedReroute && (
                    <p className={cn(
                      "text-[10px] mt-0.5",
                      isFailed ? "text-red-600 font-medium" : "text-gray-500"
                    )}>
                      {step.detail}
                    </p>
                  )}
                  {step.status === "failed" && resumed && !approvedReroute && (
                    <p className="text-[10px] mt-0.5 text-green-600 font-medium">
                      Step recovered — agent continuing workflow
                    </p>
                  )}
                  {step.status === "failed" && approvedReroute && (
                    <p className="text-[10px] mt-0.5 text-green-600 font-medium">
                      Exception resolved — agent rerouting to alternate carrier
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Connection Exception Panel (Portal Unavailable / Credentials Expired) */}
        {(shipment.exceptionType === "Portal Unavailable" || shipment.exceptionType === "Credentials Expired") && (
          <div className="mt-3">
            <ConnectionExceptionPanel shipment={shipment} onApprove={onApprove} />
          </div>
        )}
        {/* Unified Exception Panel (all other non-happy-path exceptions) */}
        {shipment.exceptionType !== "None" &&
          shipment.exceptionType !== "Portal Unavailable" &&
          shipment.exceptionType !== "Credentials Expired" && (
          <div className="mt-3">
            <UnifiedExceptionPanel shipment={shipment} onApprove={onApprove} />
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
           SAP/OTM & Notifications (merged from NotificationsTab)
         ══════════════════════════════════════════════════════════════ */}
      <div className="border-t border-gray-200 pt-5 mt-2 space-y-5">
        {/* SAP/OTM Sync Status */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">SAP TM / OTM Status</h4>
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Sync Status</span>
              <OTMStatusBadge status={actions.otmSynced ? "Synced" : shipment.otmStatus} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">SAP Order</span>
              <span className="text-xs font-mono text-gray-800">{shipment.sapOrderRef}</span>
            </div>
            {shipment.bookingRef && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Booking Ref</span>
                <span className="text-xs font-mono font-bold text-green-700">{shipment.bookingRef}</span>
              </div>
            )}
            {shipment.vesselSchedule && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Vessel</span>
                <span className="text-xs text-gray-700">{shipment.vesselSchedule}</span>
              </div>
            )}

            {!actions.otmSynced && shipment.otmStatus !== "Synced" && (
              <button
                onClick={onSyncOTM}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                {syncing ? "Syncing to SAP/OTM..." : "Push to SAP/OTM"}
              </button>
            )}
            {(actions.otmSynced || shipment.otmStatus === "Synced") && (
              <div className="flex items-center gap-2 text-green-600 text-xs font-medium">
                <CheckCircle size={13} /> SAP TM & OTM synchronized
              </div>
            )}
          </div>
        </div>

        {/* Auto-prompt to send notification after SAP/OTM push — 3 options */}
        {showNotifyPrompt && !actions.notified && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-800">SAP/OTM synced — Send notification?</span>
            </div>
            <p className="text-[10px] text-blue-600">
              Notify plant and destination team about the booking update.
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={onSendEmail}
                className="flex items-center justify-center gap-1 py-2 rounded-lg bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Mail size={10} /> Email
              </button>
              <button
                onClick={onSendMessage}
                className="flex items-center justify-center gap-1 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 transition-colors"
              >
                <Bell size={10} /> Message
              </button>
              <button
                onClick={onSendBoth}
                className="flex items-center justify-center gap-1 py-2 rounded-lg bg-green-600 text-white text-[10px] font-semibold hover:bg-green-700 transition-colors"
              >
                <Send size={10} /> Both
              </button>
            </div>
            <button
              onClick={onDismissNotifyPrompt}
              className="w-full py-1 rounded-lg text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip
            </button>
          </div>
        )}

        {/* Notification Status */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Notifications</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-xs font-medium text-gray-700">Plant / Destination Team</p>
                <p className="text-[10px] text-gray-400">{shipment.plant}</p>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                actions.notified || shipment.notificationStatus === "Sent"
                  ? "bg-green-100 text-green-700"
                  : shipment.notificationStatus === "Escalated"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500"
              )}>
                {actions.notified ? "Sent" : shipment.notificationStatus}
              </span>
            </div>

            {!actions.notified && shipment.notificationStatus !== "Sent" && !showNotifyPrompt && (
              <button
                onClick={onSendEmail}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <Send size={12} /> Send Booking Notification
              </button>
            )}
          </div>
        </div>

        {/* Source Signals */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Data Sources</h4>
          <div className="space-y-1.5">
            {shipment.sources.map((src) => (
              <div key={src.source} className="flex items-center justify-between bg-gray-50 rounded px-2.5 py-2 border border-gray-100">
                <div className="flex items-center gap-2">
                  <SourceBadge source={src.source} />
                  <span className="text-[11px] text-gray-600">{src.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    src.fresh ? "bg-green-500" : "bg-amber-500"
                  )} />
                  <span className="text-[10px] text-gray-400">{src.freshness}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Unified Exception Panel (Missing Allocation, Rate Mismatch, Missing Fields, Carrier Rejection) ──

function UnifiedExceptionPanel({ shipment, onApprove }: { shipment: BookingRequest; onApprove: () => void }) {
  const [approvedReroute, setApprovedReroute] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retried, setRetried] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [notified, setNotified] = useState(false)
  const [aiThinking, setAiThinking] = useState(true)

  useEffect(() => {
    setAiThinking(true)
    const t = setTimeout(() => setAiThinking(false), 1500)
    return () => clearTimeout(t)
  }, [shipment.id])

  const recommended = shipment.carrierOptions.find((c) => c.recommended)
  const exType = shipment.exceptionType
  const isRejection = exType === "Carrier Rejection"
  const disabledCarrier = isRejection ? shipment.carrier : null

  // Exception-specific config
  const config = (() => {
    const requiredFields = (shipment.missingFields ?? []).filter((f) => f.required)
    switch (exType) {
      case "Missing Allocation":
        return {
          bannerTitle: "Missing Carrier Allocation",
          severity: "HIGH", severityClass: "bg-red-600",
          bannerDesc: <>No carrier capacity available on <span className="font-semibold">{shipment.lane}</span> for target sailing window. All contracted carriers at full allocation.</>,
          policyItems: [
            "All contracted carriers at full allocation for target window",
            "Next available sailing: +4 days from target date",
            "Alternate routing via transshipment ports available",
            "Recommendation: Approve AI-selected alternate carrier",
          ],
          retryLabel: "Check Capacity",
          retryFailMsg: "All carriers confirmed: no capacity available. Please approve reroute or escalate.",
        }
      case "Rate Mismatch":
        return {
          bannerTitle: "Rate Mismatch — Approval Required",
          severity: "HIGH", severityClass: "bg-red-600",
          bannerDesc: <><span className="font-semibold">{shipment.carrier}</span> spot rate exceeds contract threshold. Agent flagged for planner approval before proceeding.</>,
          policyItems: [
            `Spot rate vs contract rate: ${recommended ? `$${recommended.rate.toLocaleString()} vs $${recommended.contractRate.toLocaleString()} (${((recommended.rate - recommended.contractRate) / recommended.contractRate * 100).toFixed(0)}% premium)` : "N/A"}`,
            "Company policy: >10% variance requires planner approval",
            "Reefer container type limits available carrier options",
            "Recommendation: Approve spot rate or switch to alternate carrier",
          ],
          retryLabel: "Refresh Rates",
          retryFailMsg: "Rates unchanged. Please approve current rate or select alternate carrier.",
        }
      case "Missing Booking Fields":
        return {
          bannerTitle: "Missing Mandatory Booking Fields",
          severity: "MEDIUM", severityClass: "bg-amber-500",
          bannerDesc: <>SAP TM record incomplete — <span className="font-semibold">{requiredFields.length} required fields</span> missing. Booking agent blocked at validation.</>,
          policyItems: [
            "SAP TM validation requires all mandatory fields before booking",
            `Missing: ${requiredFields.map(f => f.label).join(", ")}`,
            "Agent blocked at Step 1 — cannot proceed to carrier selection",
            "Recommendation: Complete fields in SAP TM or approve with defaults",
          ],
          retryLabel: "Re-validate",
          retryFailMsg: "Fields still incomplete in SAP TM. Please complete fields or escalate.",
        }
      default: // Carrier Rejection
        return {
          bannerTitle: "Carrier Rejection — Booking Declined",
          severity: "CRITICAL", severityClass: "bg-red-700",
          bannerDesc: <><span className="font-semibold">{shipment.carrier}</span> rejected the booking at <span className="font-semibold">Step 6 (Confirmation)</span>. Steps 1–5 completed successfully.</>,
          policyItems: [
            "Booking submitted 3h 15m after vessel acceptance cut-off",
            "Vessel utilization: 98.2% at time of rejection",
            "Policy: Late bookings (>72h from acceptance) auto-declined",
            "Recommendation: Target T-5 days for future bookings on this lane",
          ],
          retryLabel: "Retry Booking",
          retryFailMsg: `${shipment.carrier} confirmed: vessel remains fully booked. Please approve reroute or escalate.`,
        }
    }
  })()

  const handleApproveWithCarrier = (carrierName?: string) => {
    const selected = carrierName ?? selectedCarrier ?? recommended?.carrier
    setSelectedCarrier(selected ?? null)
    setApprovedReroute(true)
    onApprove()
  }

  if (approvedReroute) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-green-700">Reroute Approved — AI Rebooking</p>
          <p className="text-[11px] text-green-600 mt-0.5">
            Agent initiating booking with <span className="font-semibold">{selectedCarrier ?? recommended?.carrier ?? "alternate carrier"}</span>.
            Confirmation expected within 2h.
          </p>
        </div>
      </div>
    )
  }

  if (escalated) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <TrendingUp size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Case Escalated</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Escalation case opened and assigned to supply chain manager. SLA clock paused pending resolution.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Exception Banner */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertOctagon size={14} className="text-red-600 shrink-0" />
          <span className="text-xs font-bold text-red-800">{config.bannerTitle}</span>
          <span className={cn("text-[9px] font-bold text-white px-1.5 py-0.5 rounded ml-auto", config.severityClass)}>
            {config.severity}
          </span>
        </div>
        <p className="text-[11px] text-red-700">{config.bannerDesc}</p>
      </div>

      {/* Rejection Details Card (Carrier Rejection only) */}
      {isRejection && (
        <div className="bg-white border-2 border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <X size={13} className="text-red-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-800">Rejection Details</p>
            <span className={cn(
              "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded capitalize",
              shipment.rejectionCategory === "capacity" ? "bg-red-100 text-red-700" :
              shipment.rejectionCategory === "policy" ? "bg-purple-100 text-purple-700" :
              shipment.rejectionCategory === "equipment" ? "bg-amber-100 text-amber-700" :
              "bg-orange-100 text-orange-700"
            )}>
              {shipment.rejectionCategory ?? "capacity"}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Carrier:</span><span className="font-semibold text-gray-800">{shipment.carrier}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Reason:</span><span className="text-gray-700">{shipment.rejectionReason ?? "Vessel fully allocated"}</span></div>
            <div className="flex gap-2"><span className="text-gray-400 w-20 shrink-0">Impact:</span><span className="text-red-700 font-medium">+4 day delay · production risk</span></div>
          </div>
        </div>
      )}

      {/* Missing Fields Details (Missing Booking Fields only) */}
      {exType === "Missing Booking Fields" && (shipment.missingFields ?? []).length > 0 && (
        <div className="bg-white border-2 border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <FileText size={13} className="text-amber-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-800">Missing Fields</p>
          </div>
          <div className="space-y-1">
            {(shipment.missingFields ?? []).map((f) => (
              <div key={f.field} className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", f.required ? "bg-red-500" : "bg-amber-400")} />
                <span className="text-[11px] text-gray-700 flex-1">{f.label}</span>
                <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border", f.required ? "text-red-700 bg-red-50 border-red-200" : "text-amber-700 bg-amber-50 border-amber-200")}>{f.required ? "Required" : "Optional"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rate Details (Rate Mismatch only) */}
      {exType === "Rate Mismatch" && recommended && (
        <div className="bg-white border-2 border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingUp size={13} className="text-amber-600" />
            </div>
            <p className="text-[11px] font-bold text-gray-800">Rate Variance</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-gray-400">Spot Rate</p>
              <p className="text-sm font-bold text-red-600">${recommended.rate.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Contract Rate</p>
              <p className="text-sm font-bold text-gray-800">${recommended.contractRate.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Premium</p>
              <p className="text-sm font-bold text-red-600">+{((recommended.rate - recommended.contractRate) / recommended.contractRate * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Carrier Table (with thinking) */}
      {aiThinking ? (
        <AIThinkingSkeleton label="AI evaluating carriers" />
      ) : (
        <div className="space-y-3">
          {/* AI Recommendation header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain size={13} className="text-blue-600" />
              <span className="text-[11px] font-semibold text-blue-800">AI Carrier Recommendation</span>
            </div>
            {recommended && (
              <p className="text-[10px] text-blue-700">
                <span className="font-bold">{recommended.carrier}</span> — {recommended.reason}
              </p>
            )}
          </div>

          {/* Carrier Comparison Table — selectable */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">Carrier</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Rate</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Transit</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500">Capacity</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">SLA</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">OTP%</th>
                </tr>
              </thead>
              <tbody>
                {shipment.carrierOptions.map((c) => {
                  const isDisabled = disabledCarrier !== null && c.carrier === disabledCarrier
                  const isSelected = selectedCarrier === c.carrier
                  return (
                    <tr
                      key={c.carrier}
                      onClick={() => { if (!isDisabled) setSelectedCarrier(c.carrier) }}
                      className={cn(
                        "border-b border-gray-100 transition-colors",
                        isDisabled ? "opacity-40 cursor-not-allowed bg-red-50/30 line-through" : "cursor-pointer hover:bg-blue-50",
                        isSelected && "bg-blue-50 border-l-2 border-l-blue-500 ring-1 ring-blue-200",
                        c.recommended && !isSelected && !isDisabled && "bg-green-50/30 border-l-2 border-l-green-400"
                      )}
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-medium", isDisabled ? "text-gray-400" : "text-gray-800")}>{c.carrier}</span>
                          {c.recommended && <span className="text-[8px] font-bold bg-green-600 text-white px-1 py-0.5 rounded">AI Pick</span>}
                          {isDisabled && <span className="text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded">Rejected</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>${c.rate.toLocaleString()}</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.rate < recommended.rate ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.rate > recommended.rate ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>{c.transitDays}d</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.transitDays < recommended.transitDays ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.transitDays > recommended.transitDays ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          isDisabled ? "bg-gray-100 text-gray-400" :
                          c.capacity === "Available" ? "bg-green-100 text-green-700" :
                          c.capacity === "Limited" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>{c.capacity}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>{c.sla}%</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.sla > recommended.sla ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.sla < recommended.sla ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDisabled ? "text-gray-400" : "text-gray-700"}>{c.lanePerformance}%</span>
                        {!isDisabled && recommended && c.carrier !== recommended.carrier && (
                          c.lanePerformance > recommended.lanePerformance ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.lanePerformance < recommended.lanePerformance ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-gray-400 text-center">{selectedCarrier ? `${selectedCarrier} selected — click Approve Reroute to confirm` : "Click a carrier row to select"}</p>

          {/* AI Policy Analysis */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck size={13} className="text-gray-600" />
              <span className="text-[11px] font-semibold text-gray-700">AI Policy Analysis</span>
            </div>
            <div className="space-y-1 text-[10px] text-gray-600">
              {config.policyItems.map((item, i) => <p key={i}>• {item}</p>)}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleApproveWithCarrier(selectedCarrier ?? undefined)}
            disabled={!selectedCarrier && !recommended}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[11px] font-semibold transition-colors",
              selectedCarrier || recommended ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <CheckCircle size={12} /> {selectedCarrier ? `Approve ${selectedCarrier}` : "Approve Reroute"}
          </button>
          <button
            onClick={() => { if (!retrying && !retried) { setRetrying(true); setTimeout(() => { setRetrying(false); setRetried(true) }, 2200) } }}
            disabled={retrying}
            className={cn("flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors",
              retried ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            {retrying ? <><Loader2 size={11} className="animate-spin" /> Retrying...</> :
             retried ? <><X size={11} /> Retry Failed</> :
             <><RefreshCw size={11} /> {config.retryLabel}</>}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={() => setNotified(true)} className={cn("py-2.5 rounded-lg border text-[10px] font-semibold transition-colors flex flex-col items-center gap-1", notified ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50")}>
            {notified ? <CheckCircle size={12} className="text-blue-600" /> : <Bell size={12} className="text-blue-500" />}
            {notified ? "Notified" : "Notify SCM"}
          </button>
          <button onClick={() => setEscalated(true)} className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors flex flex-col items-center gap-1">
            <TrendingUp size={12} className="text-red-500" /> Escalate
          </button>
          <button className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
            <FileText size={12} className="text-purple-500" /> Policy
          </button>
        </div>
        {retried && <p className="text-[10px] text-center text-red-700 font-medium">{config.retryFailMsg}</p>}
      </div>
    </div>
  )
}

// ─── Connection Exception Panel (Portal Unavailable / Credentials Expired) ───

function ConnectionExceptionPanel({ shipment, onApprove }: { shipment: BookingRequest; onApprove: () => void }) {
  const [aiThinking, setAiThinking] = useState(true)
  const [selectedAction, setSelectedAction] = useState<"retry" | "switch" | "manual" | "notifyIT" | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [retryFailed, setRetryFailed] = useState(false)
  const [autoRetrySet, setAutoRetrySet] = useState(false)
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)
  const [escalated, setEscalated] = useState(false)
  const [itNotified, setItNotified] = useState(false)
  const [emailDrafted, setEmailDrafted] = useState(false)
  // Portal login animation states
  const [loginPhase, setLoginPhase] = useState<"typing-user" | "typing-pass" | "logging-in" | "success" | null>(null)
  const [typedUser, setTypedUser] = useState("")
  const [typedPass, setTypedPass] = useState("")
  // Stable ticket number (avoids hydration mismatch from Math.random in render)
  const [itTicket] = useState(() => Math.floor(Math.random() * 9000 + 1000))

  useEffect(() => {
    setAiThinking(true)
    const t = setTimeout(() => setAiThinking(false), 1500)
    return () => clearTimeout(t)
  }, [shipment.id])

  const isCreds = shipment.exceptionType === "Credentials Expired"
  const recommended = shipment.carrierOptions.find((c) => c.recommended)

  // Portal login typing animation
  const loginEmail = "a.chen@logistics.co"
  const loginPassword = "••••••••••••"

  useEffect(() => {
    if (loginPhase === "typing-user") {
      let i = 0
      const t = setInterval(() => {
        i++
        setTypedUser(loginEmail.slice(0, i))
        if (i >= loginEmail.length) { clearInterval(t); setTimeout(() => setLoginPhase("typing-pass"), 400) }
      }, 60)
      return () => clearInterval(t)
    }
    if (loginPhase === "typing-pass") {
      let i = 0
      const t = setInterval(() => {
        i++
        setTypedPass(loginPassword.slice(0, i))
        if (i >= loginPassword.length) { clearInterval(t); setTimeout(() => setLoginPhase("logging-in"), 600) }
      }, 80)
      return () => clearInterval(t)
    }
    if (loginPhase === "logging-in") {
      const t = setTimeout(() => setLoginPhase("success"), 2000)
      return () => clearTimeout(t)
    }
    if (loginPhase === "success") {
      const t = setTimeout(() => { setApproved(true); onApprove() }, 1200)
      return () => clearTimeout(t)
    }
  }, [loginPhase, onApprove])

  const handleApproveSwitch = (carrierName?: string) => {
    const selected = carrierName ?? selectedCarrier ?? recommended?.carrier
    if (!selected) return
    setSelectedCarrier(selected)
    // Start portal login animation instead of immediate approval
    setLoginPhase("typing-user")
    setTypedUser("")
    setTypedPass("")
  }

  if (approved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
        <CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-green-700">Carrier Switch Approved — AI Rebooking</p>
          <p className="text-[11px] text-green-600 mt-0.5">
            Agent initiating booking with <span className="font-semibold">{selectedCarrier ?? recommended?.carrier ?? "alternate carrier"}</span>.
            Bypassing {shipment.carrier} portal. Confirmation expected within 2h.
          </p>
        </div>
      </div>
    )
  }

  if (escalated) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
        <TrendingUp size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-800">Case Escalated</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Escalation case opened — IT team and supply chain manager notified. SLA clock paused pending portal resolution.
          </p>
        </div>
      </div>
    )
  }

  // ─── Portal Login Animation ─────────────────────────────────────
  if (loginPhase) {
    const carrierName = selectedCarrier ?? recommended?.carrier ?? "Carrier"
    const isLoggingIn = loginPhase === "logging-in"
    const isSuccess = loginPhase === "success"
    return (
      <div className="space-y-3">
        <div className={cn(
          "rounded-lg border-2 overflow-hidden transition-all",
          isSuccess ? "border-green-300 bg-green-50" : "border-blue-200 bg-gradient-to-b from-slate-800 to-slate-900"
        )}>
          {/* Portal header bar */}
          {!isSuccess && (
            <div className="bg-slate-700 px-4 py-2 flex items-center gap-2 border-b border-slate-600">
              <div className="flex gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-slate-600 rounded px-2 py-0.5 text-[9px] text-slate-300 font-mono truncate">
                https://{carrierName.toLowerCase().replace(/[\s-]/g, "")}.com/portal/login
              </div>
            </div>
          )}

          {isSuccess ? (
            <div className="p-5 flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <Check size={20} className="text-white" />
              </div>
              <p className="text-sm font-bold text-green-700">Login Successful</p>
              <p className="text-[10px] text-green-600">Connected to {carrierName} eBusiness Portal</p>
              <div className="flex items-center gap-1.5 text-[10px] text-green-600 mt-1">
                <Loader2 size={10} className="animate-spin" /> Preparing booking submission...
              </div>
            </div>
          ) : (
            <div className="p-5 flex flex-col items-center">
              {/* Carrier logo area */}
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-3">
                <Anchor size={24} className="text-white" />
              </div>
              <p className="text-sm font-bold text-white mb-0.5">{carrierName}</p>
              <p className="text-[10px] text-slate-400 mb-5">eBusiness Portal — Carrier Booking System</p>

              {/* Login form */}
              <div className="w-full max-w-[260px] space-y-3">
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                  <div className="bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white font-mono min-h-[28px] flex items-center">
                    {typedUser}<span className={cn("w-0.5 h-3.5 bg-blue-400 inline-block ml-0.5", loginPhase === "typing-user" ? "animate-pulse" : "hidden")} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Password</label>
                  <div className="bg-slate-700 border border-slate-600 rounded px-2.5 py-1.5 text-xs text-white font-mono min-h-[28px] flex items-center">
                    {typedPass}<span className={cn("w-0.5 h-3.5 bg-blue-400 inline-block ml-0.5", loginPhase === "typing-pass" ? "animate-pulse" : "hidden")} />
                  </div>
                </div>

                {/* Login button */}
                <button className={cn(
                  "w-full py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                  isLoggingIn ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                )}>
                  {isLoggingIn ? (
                    <><Loader2 size={12} className="animate-spin" /> Authenticating...</>
                  ) : (
                    <><ShieldCheck size={12} /> Sign In</>
                  )}
                </button>
              </div>

              {/* RPA agent label */}
              <div className="mt-4 flex items-center gap-1.5 bg-slate-700/50 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] text-slate-400">RPA Agent auto-filling credentials</span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Diagnostics data
  const diagItems = isCreds
    ? [
        { label: "API Login", status: "401 Unauthorized", time: "04:06" },
        { label: "Token Refresh", status: "Refresh token expired", time: "04:06" },
        { label: "RPA Login", status: "Session cookie expired", time: "04:07" },
      ]
    : [
        { label: "API Attempt 1", status: "Timeout (30s)", time: "08:05" },
        { label: "API Attempt 2", status: "Timeout (30s)", time: "08:06" },
        { label: "API Attempt 3", status: "Timeout (30s)", time: "08:06" },
        { label: "RPA Fallback", status: "Login page unresponsive", time: "08:07" },
      ]

  const aiAnalysis = isCreds
    ? [
        "API credentials expired — last renewed 90 days ago",
        "Automatic token refresh failed — manual renewal required",
        `Booking deadline: ${shipment.targetShipDate} — delay risk if not resolved`,
        `Recommendation: Switch to ${recommended?.carrier ?? "alternate carrier"} or renew credentials immediately`,
      ]
    : [
        `${shipment.carrier} portal shows pattern consistent with maintenance`,
        "Similar outage observed previously — typically resolved within 4 hours",
        `Booking deadline: ${shipment.targetShipDate} — delay risk if portal remains down`,
        `Recommendation: Switch to ${recommended?.carrier ?? "alternate carrier"} (${recommended ? `$${recommended.rate.toLocaleString()}, ${recommended.sla}% SLA` : "available"})`,
      ]

  return (
    <div className="space-y-3">
      {/* Exception Banner */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <AlertOctagon size={14} className="text-red-600 shrink-0" />
          <span className="text-xs font-bold text-red-800">
            {isCreds ? "Credentials Expired — API Access Blocked" : "Portal Unavailable — Connection Failed"}
          </span>
          <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded ml-auto">HIGH</span>
        </div>
        <p className="text-[11px] text-red-700">
          {isCreds
            ? <><span className="font-semibold">{shipment.carrier}</span> API credentials expired. Agent login failed, RPA fallback session also expired.</>
            : <><span className="font-semibold">{shipment.carrier}</span> portal unreachable — API timeout after 3 retries. RPA fallback also failed.</>
          }
        </p>
      </div>

      {/* Connection Diagnostics Card */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            {isCreds ? <ShieldCheck size={13} className="text-red-600" /> : <Monitor size={13} className="text-red-600" />}
          </div>
          <p className="text-[11px] font-bold text-gray-800">{isCreds ? "Authentication Diagnostics" : "Connection Diagnostics"}</p>
        </div>
        <div className="space-y-2">
          {diagItems.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <X size={11} className="text-red-500 shrink-0" />
              <span className="text-gray-500 w-24 shrink-0">{d.label}</span>
              <span className="text-red-700 font-medium flex-1">{d.status}</span>
              <span className="text-[10px] text-gray-400">{d.time}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1 text-[10px]">
          {isCreds ? (
            <>
              <div className="flex items-center gap-2"><ShieldCheck size={10} className="text-amber-500 shrink-0" /><span className="text-gray-600">Last credential renewal: <span className="font-semibold text-amber-700">90 days ago</span></span></div>
              <div className="flex items-center gap-2"><Monitor size={10} className="text-green-500 shrink-0" /><span className="text-gray-600">Portal status: <span className="font-semibold text-green-700">Accessible</span> (auth blocked)</span></div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2"><Clock size={10} className="text-gray-400 shrink-0" /><span className="text-gray-600">Total elapsed: <span className="font-semibold">2m 15s</span></span></div>
              <div className="flex items-center gap-2"><Monitor size={10} className="text-red-500 shrink-0" /><span className="text-gray-600">Portal status: <span className="font-semibold text-red-700">Unreachable</span></span></div>
            </>
          )}
        </div>
      </div>

      {/* AI Diagnosis (with thinking) */}
      {aiThinking ? (
        <AIThinkingSkeleton label={isCreds ? "AI diagnosing auth failure" : "AI diagnosing connection"} />
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Brain size={13} className="text-blue-600" />
            <span className="text-[11px] font-semibold text-blue-800">AI Diagnosis</span>
          </div>
          <div className="space-y-1 text-[10px] text-blue-700">
            {aiAnalysis.map((item, i) => <p key={i}>• {item}</p>)}
          </div>
        </div>
      )}

      {/* Recovery Options — 4 interactive cards */}
      <div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Recovery Options</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: Retry / Renew */}
          <div
            onClick={() => setSelectedAction(selectedAction === "retry" ? null : "retry")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "retry" ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                {isCreds ? <ShieldCheck size={10} className="text-blue-600" /> : <RefreshCw size={10} className="text-blue-600" />}
              </div>
              <span className="text-[10px] font-semibold text-gray-800">{isCreds ? "Renew Credentials" : "Retry Connection"}</span>
            </div>
            <p className="text-[9px] text-gray-500">{isCreds ? "Trigger API key refresh via IT portal" : "Auto-retry portal every 15 min"}</p>
          </div>

          {/* Card 2: Switch Carrier */}
          <div
            onClick={() => setSelectedAction(selectedAction === "switch" ? null : "switch")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "switch" ? "border-green-300 bg-green-50/50 ring-1 ring-green-200" : "border-gray-200 bg-white hover:border-green-200 hover:bg-green-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <ArrowRight size={10} className="text-green-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-800">Switch Carrier</span>
            </div>
            <p className="text-[9px] text-gray-500">AI recommends {recommended?.carrier ?? "alternate"}</p>
          </div>

          {/* Card 3: Manual Booking */}
          <div
            onClick={() => setSelectedAction(selectedAction === "manual" ? null : "manual")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "manual" ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200" : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Mail size={10} className="text-indigo-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-800">Manual Booking</span>
            </div>
            <p className="text-[9px] text-gray-500">Email booking request to {shipment.carrier}</p>
          </div>

          {/* Card 4: Notify IT */}
          <div
            onClick={() => setSelectedAction(selectedAction === "notifyIT" ? null : "notifyIT")}
            className={cn("border rounded-lg p-2.5 cursor-pointer transition-all",
              selectedAction === "notifyIT" ? "border-amber-300 bg-amber-50/50 ring-1 ring-amber-200" : "border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/20"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Bell size={10} className="text-amber-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-800">Notify IT</span>
            </div>
            <p className="text-[9px] text-gray-500">Alert IT about {isCreds ? "expired creds" : "portal outage"}</p>
          </div>
        </div>
      </div>

      {/* Expanded Action Panels */}
      {selectedAction === "retry" && (
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/20 space-y-2">
          <p className="text-[11px] font-semibold text-blue-800">{isCreds ? "Credential Renewal" : "Retry Connection"}</p>
          {retryFailed ? (
            autoRetrySet ? (
              <div className="flex items-center gap-2 text-[10px] text-green-700 font-medium">
                <CheckCircle size={11} /> {isCreds ? "Renewal request sent to IT — estimated 30 min" : "Auto-retry scheduled — next attempt in 15m"}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-red-700">
                  <X size={11} /> {isCreds ? "Credentials still expired — manual renewal needed" : "Connection still failed — portal remains unreachable"}
                </div>
                <button onClick={() => setAutoRetrySet(true)} className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                  {isCreds ? "Request Credential Renewal from IT" : "Set Auto-Retry (every 15min)"}
                </button>
              </div>
            )
          ) : retrying ? (
            <div className="flex items-center gap-2 text-[10px] text-blue-600">
              <Loader2 size={11} className="animate-spin" /> {isCreds ? "Attempting credential refresh..." : "Attempting connection..."}
            </div>
          ) : (
            <button
              onClick={() => { setRetrying(true); setTimeout(() => { setRetrying(false); setRetryFailed(true) }, 2000) }}
              className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              {isCreds ? "Attempt Credential Refresh" : "Retry Connection Now"}
            </button>
          )}
        </div>
      )}

      {selectedAction === "switch" && (
        <div className="border border-green-200 rounded-lg p-3 bg-green-50/10 space-y-3">
          <p className="text-[11px] font-semibold text-green-800">Alternate Carrier Selection</p>
          {/* Carrier Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 py-2 text-left text-[10px] font-semibold text-gray-500">Carrier</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Rate</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">Transit</th>
                  <th className="px-2 py-2 text-center text-[10px] font-semibold text-gray-500">Capacity</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">SLA</th>
                  <th className="px-2 py-2 text-right text-[10px] font-semibold text-gray-500">OTP%</th>
                </tr>
              </thead>
              <tbody>
                {shipment.carrierOptions.map((c) => {
                  const isDown = c.carrier === shipment.carrier
                  const isSelected = selectedCarrier === c.carrier
                  return (
                    <tr
                      key={c.carrier}
                      onClick={(e) => { e.stopPropagation(); if (!isDown) { setSelectedCarrier(c.carrier) } }}
                      className={cn(
                        "border-b border-gray-100 transition-colors",
                        isDown ? "opacity-40 cursor-not-allowed bg-red-50/30 line-through" : "cursor-pointer hover:bg-green-50",
                        isSelected && "bg-green-50 border-l-2 border-l-green-500",
                        c.recommended && !isSelected && !isDown && "bg-green-50/30 border-l-2 border-l-green-400"
                      )}
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("font-medium", isDown ? "text-gray-400" : "text-gray-800")}>{c.carrier}</span>
                          {c.recommended && <span className="text-[8px] font-bold bg-green-600 text-white px-1 py-0.5 rounded">AI Pick</span>}
                          {isDown && <span className="text-[8px] font-bold bg-red-500 text-white px-1 py-0.5 rounded">{isCreds ? "Creds Expired" : "Portal Down"}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>${c.rate.toLocaleString()}</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.rate < recommended.rate ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.rate > recommended.rate ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>{c.transitDays}d</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.transitDays < recommended.transitDays ? <ArrowDown size={10} className="inline ml-0.5 text-green-500" /> :
                          c.transitDays > recommended.transitDays ? <ArrowUp size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          isDown ? "bg-gray-100 text-gray-400" :
                          c.capacity === "Available" ? "bg-green-100 text-green-700" :
                          c.capacity === "Limited" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        )}>{c.capacity}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>{c.sla}%</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.sla > recommended.sla ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.sla < recommended.sla ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        <span className={isDown ? "text-gray-400" : "text-gray-700"}>{c.lanePerformance}%</span>
                        {!isDown && recommended && c.carrier !== recommended.carrier && (
                          c.lanePerformance > recommended.lanePerformance ? <ArrowUp size={10} className="inline ml-0.5 text-green-500" /> :
                          c.lanePerformance < recommended.lanePerformance ? <ArrowDown size={10} className="inline ml-0.5 text-red-500" /> : null
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {selectedCarrier && (
            <button onClick={(e) => { e.stopPropagation(); handleApproveSwitch() }} className="w-full py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5">
              <CheckCircle size={12} /> Approve Switch to {selectedCarrier}
            </button>
          )}
          {!selectedCarrier && <p className="text-[9px] text-gray-400 text-center">Click a carrier row to select</p>}
        </div>
      )}

      {selectedAction === "manual" && (
        <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/20 space-y-2">
          <p className="text-[11px] font-semibold text-indigo-800">Manual Booking Request</p>
          <div className="text-[10px] space-y-0.5">
            <p><span className="text-gray-400">To:</span> <span className="font-medium text-gray-700">booking@{shipment.carrier.toLowerCase().replace(/[\s-]/g, "")}.com</span></p>
            <p><span className="text-gray-400">Subject:</span> <span className="font-medium text-gray-700">Manual Booking Request — {shipment.id}</span></p>
          </div>
          <div className="bg-white border border-indigo-100 rounded p-2 text-[10px] text-gray-600 leading-relaxed space-y-1">
            <p>Unable to complete booking via portal — {isCreds ? "API credentials expired" : "portal unreachable"}.</p>
            <p>Shipment: <strong>{shipment.id}</strong> · {shipment.lane} · {shipment.containerType} · Target: {shipment.targetShipDate}</p>
            <p>Please process this booking manually and confirm reference number.</p>
          </div>
          {emailDrafted ? (
            <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-medium">
              <CheckCircle size={11} /> Email sent to {shipment.carrier} booking desk
            </div>
          ) : (
            <button onClick={() => setEmailDrafted(true)} className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5">
              <Send size={11} /> Send Email
            </button>
          )}
        </div>
      )}

      {selectedAction === "notifyIT" && (
        <div className="border border-amber-200 rounded-lg p-3 bg-amber-50/20 space-y-2">
          <p className="text-[11px] font-semibold text-amber-800">IT Alert</p>
          <div className="bg-white border border-amber-100 rounded p-2 text-[10px] text-gray-600 leading-relaxed space-y-1">
            <p><strong>Priority:</strong> High — booking blocked</p>
            <p><strong>Issue:</strong> {isCreds ? `${shipment.carrier} API credentials expired (90+ days)` : `${shipment.carrier} portal unreachable — API timeout`}</p>
            <p><strong>Impact:</strong> Shipment {shipment.id} ({shipment.lane}) cannot proceed</p>
            <p><strong>Action:</strong> {isCreds ? "Renew API credentials and confirm" : "Investigate portal availability and ETA for recovery"}</p>
          </div>
          {itNotified ? (
            <div className="flex items-center gap-1.5 text-[10px] text-green-700 font-medium">
              <CheckCircle size={11} /> IT team notified — Ticket #IT-{itTicket}
            </div>
          ) : (
            <button onClick={() => setItNotified(true)} className="w-full py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-1.5">
              <Bell size={11} /> Send IT Alert
            </button>
          )}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => handleApproveSwitch()}
          disabled={!selectedCarrier && !recommended}
          className={cn(
            "py-2.5 rounded-lg text-[10px] font-semibold transition-colors flex flex-col items-center gap-1",
            selectedCarrier || recommended ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <CheckCircle size={12} /> {selectedCarrier ? `Switch to ${selectedCarrier}` : "Approve Switch"}
        </button>
        <button onClick={() => setEscalated(true)} className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors flex flex-col items-center gap-1">
          <TrendingUp size={12} className="text-red-500" /> Escalate
        </button>
        <button className="py-2.5 rounded-lg bg-white border border-gray-300 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex flex-col items-center gap-1">
          <FileText size={12} className="text-purple-500" /> View Logs
        </button>
      </div>
    </div>
  )
}
