"use client"

import { useState } from "react"
import { TopBar, type ViewTab } from "./top-bar"
import { Dashboard } from "./dashboard"
import { type DynamicActivity } from "./agent-activity-log"
import { AnalyticsPage } from "./analytics-page"
import { EmailInboxPage } from "./email-inbox-page"
import { EmailSentPage, type SentEmailItem } from "./email-sent-page"
import { AIChatPanel } from "./ai-chat-panel"
import { BOOKING_REQUESTS, INBOX_EMAILS, DEMO_SHIPMENT, DEMO_SCENARIO_BOOKING_MAP } from "@/lib/mock-data"
import { AutomationRulesPage } from "./automation-rules"
import { PolicyPage } from "./policy-page"
import { ApiPage } from "./api-page"
import { CarrierScorecardPage } from "./carrier-scorecard-page"
import { ContractsPage } from "./contracts-page"
import { type Persona } from "./login-page"

export function AppShell({ persona }: { persona?: Persona }) {
  const [activeTab, setActiveTab] = useState<ViewTab>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [sentEmails, setSentEmails] = useState<SentEmailItem[]>([])
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [etaApprovedCount, setEtaApprovedCount] = useState(3)
  const [readEmailIds, setReadEmailIds] = useState<Set<string>>(new Set())
  const [resolvedExceptionIds, setResolvedExceptionIds] = useState<Set<string>>(new Set())
  const [dynamicActivities, setDynamicActivities] = useState<DynamicActivity[]>([])

  // ── Demo mode state ──
  const [demoActive, setDemoActive] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoPaused, setDemoPaused] = useState(false)
  const [demoScenario, setDemoScenario] = useState("happy-path")
  const [demoShipmentVisible, setDemoShipmentVisible] = useState(false)
  const [demoExceptionActive, setDemoExceptionActive] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [demoElapsedTime, setDemoElapsedTime] = useState("0s")
  const [dynamicInboxEmails, setDynamicInboxEmails] = useState<Array<{ id: string; from: string; fromName: string; subject: string; body: string; timestamp: string; read: boolean; tag: string; tags: string[]; shipmentId: string; shipmentRef: string }>>([])
  const [sapAutoOpenOrderId, setSapAutoOpenOrderId] = useState<string | null>(null)
  const [emailAutoSelectId, setEmailAutoSelectId] = useState<string | null>(null)
  const [demoReturnedFromInbox, setDemoReturnedFromInbox] = useState(false)
  const [showBackupConnection, setShowBackupConnection] = useState(false)

  const handleAddInboxEmail = (email: typeof dynamicInboxEmails[0]) => {
    setDynamicInboxEmails((prev) => [email, ...prev])
  }

  const handleDemoComplete = (elapsedTime: string) => {
    setDemoElapsedTime(elapsedTime)
    setActiveTab("dashboard")
    setShowCompletionModal(true)
  }

  const handleStartDemo = (scenarioId: string) => {
    setDemoScenario(scenarioId)
    setDemoActive(true)
    setDemoStep(0)
    setDemoPaused(false)
    setDemoShipmentVisible(true)
    setDemoExceptionActive(false)
    setActiveTab("dashboard")
    setSearchQuery("")
    addActivity("Demo mode started — new shipment detected from SAP TM", "ingested", "BKG-NEW-001")
  }

  const handleStopDemo = () => {
    setDemoActive(false)
    setDemoStep(0)
    setDemoPaused(false)
    setDemoShipmentVisible(false)
    setDemoExceptionActive(false)
  }

  const STEP_LABELS = [
    "", "Read Shipment", "Carrier Selection", "Portal Login", "Booking Submission",
    "Document Upload", "Confirmation", "System Update", "Monitoring",
  ]

  const handleDemoStepAdvance = (step: number) => {
    setDemoStep(step)
    if (step >= 1 && step <= 8) {
      addActivity(
        `Step ${step}: ${STEP_LABELS[step]} — completed for BKG-NEW-001`,
        step === 1 ? "ingested" : step === 2 ? "carrier_eval" : step === 3 ? "portal_login" : step === 4 ? "booking_submit" : step === 5 ? "doc_upload" : step === 6 ? "confirmed" : step === 7 ? "notified" : "confirmed",
        "BKG-NEW-001",
      )
    }
  }

  const handleEtaApproved = () => setEtaApprovedCount((prev) => prev + 1)

  const addActivity = (description: string, actionType: DynamicActivity["actionType"], shipmentId?: string) => {
    const now = new Date()
    const ts = `${now.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${now.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })}`
    setDynamicActivities((prev) => [{
      id: `DYN-${Date.now()}`,
      description,
      actionType,
      timestamp: ts,
      shipmentId,
    }, ...prev])
  }

  const handleMarkEmailRead = (emailId: string) => {
    setReadEmailIds((prev) => new Set([...prev, emailId]))
  }

  const handleExceptionResolved = (shipmentId: string) => {
    setResolvedExceptionIds((prev) => new Set([...prev, shipmentId]))
    const booking = BOOKING_REQUESTS.find((b) => b.id === shipmentId)
    if (booking) {
      addActivity(`Exception resolved for ${shipmentId} — ${booking.exceptionType}`, "confirmed", shipmentId)
    }
  }

  const handleResumeWorkflow = (shipmentId: string) => {
    addActivity(`Workflow resumed for ${shipmentId} — agent proceeding to next step`, "booking_submit", shipmentId)
  }

  const handleSendNotification = (email: SentEmailItem) => {
    setSentEmails((prev) => [email, ...prev])
  }

  const exceptionsCount = BOOKING_REQUESTS.filter((s) => s.bookingStatus === "Exception" || s.bookingStatus === "Awaiting Approval").filter((s) => !resolvedExceptionIds.has(s.id)).length
  const unreadInboxCount = INBOX_EMAILS.filter((e) => !e.read && !readEmailIds.has(e.id)).length + dynamicInboxEmails.filter((e) => !e.read && !readEmailIds.has(e.id)).length

  // Navigate between views (simplified from old sidebar-based system)
  const handleNavigateView = (view: string) => {
    if (view === "email-inbox" || view === "email-sent" || view === "analytics" || view === "dashboard" || view === "automation-rules") {
      setActiveTab(view as ViewTab)
    }
    // For views that are now cut, redirect to dashboard
    if (view === "weather-traffic" || view === "tracking-search" || view === "carrier-scorecard" || view === "documents" || view === "timeline" || view === "agent-activity" || view === "sap-tm" || view === "policies") {
      setActiveTab("dashboard")
    }
    // Close panels when navigating
    setSelectedShipmentId(null)
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      <TopBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setSelectedShipmentId(null)
        }}
        onAiToggle={() => setAiChatOpen((prev) => !prev)}
        aiPanelOpen={aiChatOpen}
        persona={persona}
        demoScenario={demoScenario}
        demoActive={demoActive}
        onStartDemo={handleStartDemo}
        unreadInboxCount={unreadInboxCount}
        exceptionsCount={exceptionsCount}
      />

      <div className="flex-1 overflow-y-auto">
        {activeTab === "dashboard" && (
          <Dashboard
            searchQuery={searchQuery}
            onViewChange={handleNavigateView}
            onOpenWeather={() => {}}
            onSendNotification={handleSendNotification}
            autoOpenShipmentId={undefined}
            onEtaApproved={handleEtaApproved}
            etaUpdatedCount={etaApprovedCount}
            demoActive={demoActive}
            demoShipmentVisible={demoShipmentVisible}
            demoStep={demoStep}
            demoPaused={demoPaused}
            demoScenario={demoScenario}
            demoExceptionActive={demoExceptionActive}
            onDemoStepAdvance={handleDemoStepAdvance}
            onDemoPause={() => setDemoPaused(true)}
            onDemoResume={() => setDemoPaused(false)}
            onDemoExceptionResolved={() => {
              setDemoExceptionActive(false)
              const bookingId = DEMO_SCENARIO_BOOKING_MAP[demoScenario]
              if (bookingId) {
                setResolvedExceptionIds((prev) => new Set([...prev, bookingId]))
              }
            }}
            onDemoExceptionTriggered={() => setDemoExceptionActive(true)}
            onDemoShipmentDismiss={() => setDemoShipmentVisible(false)}
            onDemoComplete={handleDemoComplete}
            onAddInboxEmail={handleAddInboxEmail}
            demoReturnedFromInbox={demoReturnedFromInbox}
            onDemoReturnedFromInboxConsumed={() => setDemoReturnedFromInbox(false)}
            showCompletionModal={showCompletionModal}
            onCloseCompletionModal={() => { setShowCompletionModal(false); handleStopDemo() }}
            demoElapsedTime={demoElapsedTime}
          />
        )}

        {activeTab === "analytics" && <AnalyticsPage etaUpdatedCount={etaApprovedCount} />}

        {activeTab === "automation-rules" && <AutomationRulesPage />}

        {activeTab === "policy" && <PolicyPage />}

        {activeTab === "api" && <ApiPage />}

        {activeTab === "carriers" && <CarrierScorecardPage />}

        {activeTab === "contracts" && <ContractsPage />}

        {activeTab === "email-inbox" && (
          <EmailInboxPage
            onOpenTracking={() => {}}
            onMarkRead={handleMarkEmailRead}
            dynamicEmails={dynamicInboxEmails}
            onStartDemo={handleStartDemo}
            onReturnToFlow={() => {
              setDemoReturnedFromInbox(true)
              setActiveTab("dashboard")
              setDemoShipmentVisible(true)
            }}
            onSwitchToSent={() => setActiveTab("email-sent")}
          />
        )}

        {activeTab === "email-sent" && <EmailSentPage dynamicEmails={sentEmails} autoSelectId={emailAutoSelectId ?? undefined} onSwitchToInbox={() => setActiveTab("email-inbox")} />}
      </div>

      {/* AI Chat Panel */}
      {aiChatOpen && (
        <AIChatPanel
            open={aiChatOpen}
            onClose={() => setAiChatOpen(false)}
            onOpenWeather={() => {}}
            onSendNotification={handleSendNotification}
          />
      )}
    </div>
  )
}
