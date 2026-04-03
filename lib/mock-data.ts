export type TransportMode = "Ocean" | "Road" | "Air"
export type Severity = "Critical" | "High" | "Medium" | "Low"

export type BookingStatus =
  | "Pending"
  | "In Progress"
  | "Carrier Selected"
  | "Portal Login"
  | "Booking Submitted"
  | "Docs Uploaded"
  | "Confirmed"
  | "Notified"
  | "Exception"
  | "Awaiting Approval"

export type BookingExceptionType =
  | "Missing Allocation"
  | "Portal Unavailable"
  | "Rate Mismatch"
  | "Missing Booking Fields"
  | "Carrier Rejection"
  | "Credentials Expired"
  | "None"

export type ApprovalType =
  | "Carrier Override"
  | "Booking Rejection"
  | "Spot Booking"
  | "None"

// Keep these aliases for backward compatibility with components
export type ExceptionType = BookingExceptionType
export type SignalSource = "SAP TM" | "OTM" | "Maersk Portal" | "MSC Portal" | "Hapag-Lloyd Portal" | "CMA-CGM Portal" | "RPA Bot" | "Email" | "EDI" | "API Gateway" | "Agent" | "System Alert" | "Rate Engine" | "Document System"

export interface ReasonChip {
  label: string
  type: "carrier" | "rate" | "capacity" | "portal" | "document" | "approval" | "sap" | "booking"
}

export interface BookingWorkflowStep {
  step: number
  title: string
  status: "completed" | "active" | "pending" | "failed"
  timestamp?: string
  detail?: string
  system?: string
}

export interface CarrierOption {
  carrier: string
  logo?: string
  rate: number
  contractRate: number
  transitDays: number
  capacity: "Available" | "Limited" | "Full"
  sla: number
  lanePerformance: number
  recommended: boolean
  reason?: string
  // Contract-aware fields
  contractId?: string
  hasActiveContract?: boolean
  volumeCommitted?: number      // carrier-level TEU
  volumeUsed?: number           // carrier-level TEU
  laneVolumeCommitted?: number  // lane-level TEU
  laneVolumeUsed?: number       // lane-level TEU
}

export interface TimelineEvent {
  timestamp: string
  event: string
  location: string
  source: SignalSource
  status: "ok" | "warning" | "critical" | "info" | "agent"
  anomaly?: string
}

export interface SourceSignal {
  source: SignalSource
  status: string
  timestamp: string
  freshness: string
  aligned: boolean | null
  fresh: boolean
}

export interface MissingField {
  field: string
  label: string
  required: boolean
  type: "text" | "number" | "date"
  mockValue?: string
}

export interface AlternateOption {
  label: string          // "Option 2", "Option 3", etc.
  carrier: string
  lane: string
  via?: string           // "via Colombo", "via Singapore"
  transitDays: number
  rate: number
  capacity: "Available" | "Limited"
  sla: number
  score: number
}

export interface BookingRequest {
  id: string
  mode: TransportMode
  carrier: string
  bookingRef?: string
  vesselSchedule?: string
  containerType: string
  origin: string
  destination: string
  plant: string
  bookingStatus: BookingStatus
  requestedDate: string
  targetShipDate: string
  confirmedShipDate?: string
  severity: Severity
  exceptionType: BookingExceptionType
  approvalType: ApprovalType
  lane: string
  sapOrderRef: string
  agentSummary: string
  workflowSteps: BookingWorkflowStep[]
  carrierOptions: CarrierOption[]
  reasonChips: ReasonChip[]
  timeline: TimelineEvent[]
  sources: SourceSignal[]
  lat: number
  lng: number
  missingFields?: MissingField[]
  alternateOptions?: AlternateOption[]
  rejectionReason?: string
  rejectionCategory?: "capacity" | "equipment" | "policy" | "schedule"
  // Compatibility fields used by existing component patterns
  currentStatus: string
  recommendedAction: string
  notificationStatus: "Sent" | "Not Yet Sent" | "Escalated"
  otmStatus: "Synced" | "Pending Update" | "Needs Review"
  etaConfidence: number
  delayHours: number
  trackingRef: string
  plannedETA: string
  revisedETA: string
  lastSignal: string
  lastSignalSource: SignalSource
}

// Alias for backward compat — all components import Shipment
export type Shipment = BookingRequest

// ── Workflow Step Templates ──────────────────────────────────────────────

function makeWorkflowSteps(completedUpTo: number, failedAt?: number): BookingWorkflowStep[] {
  const STEP_DEFS = [
    { step: 1, title: "Read Shipment Requirement", system: "SAP TM / OTM" },
    { step: 2, title: "Identify Best-Fit Carrier", system: "AI Routing Engine" },
    { step: 3, title: "Log into Carrier Portal", system: "RPA / API" },
    { step: 4, title: "Complete Booking Request", system: "Carrier Portal" },
    { step: 5, title: "Upload Supporting Documents", system: "Document System" },
    { step: 6, title: "Retrieve Booking Confirmation", system: "Carrier Portal" },
    { step: 7, title: "Notify Plant / SCM & Update SAP", system: "SAP TM / Email" },
    { step: 8, title: "Track Booking Status & Alerts", system: "Booking Monitor" },
  ]
  return STEP_DEFS.map((d) => {
    let status: BookingWorkflowStep["status"] = "pending"
    if (failedAt && d.step === failedAt) status = "failed"
    else if (d.step < completedUpTo) status = "completed"
    else if (d.step === completedUpTo) status = "active"
    return {
      ...d,
      status,
      timestamp: d.step <= completedUpTo ? `Mar 13, ${String(7 + d.step).padStart(2, "0")}:${String(d.step * 7).padStart(2, "0")}` : undefined,
      detail: d.step <= completedUpTo ? `Step ${d.step} processed successfully` : undefined,
    }
  })
}

// ── Carrier Options ──────────────────────────────────────────────────────

const CARRIER_OPTIONS_SHA_LAX: CarrierOption[] = [
  { carrier: "Maersk", rate: 2850, contractRate: 2800, transitDays: 14, capacity: "Available", sla: 92, lanePerformance: 94, recommended: true, reason: "Contracted carrier — best SLA and capacity on SHA→LAX lane", contractId: "CTR-2024-001", hasActiveContract: true, volumeCommitted: 12000, volumeUsed: 8160, laneVolumeCommitted: 4000, laneVolumeUsed: 2720 },
  { carrier: "MSC", rate: 2720, contractRate: 2750, transitDays: 16, capacity: "Available", sla: 87, lanePerformance: 89, recommended: false, reason: "Lower rate but 2 extra transit days", contractId: "CTR-2024-002", hasActiveContract: true, volumeCommitted: 8000, volumeUsed: 7280, laneVolumeCommitted: 4000, laneVolumeUsed: 3640 },
  { carrier: "CMA-CGM", rate: 3100, contractRate: 3000, transitDays: 13, capacity: "Limited", sla: 90, lanePerformance: 91, recommended: false, reason: "Fastest transit but premium rate", contractId: "CTR-2024-004", hasActiveContract: true, volumeCommitted: 10000, volumeUsed: 4200, laneVolumeCommitted: 5000, laneVolumeUsed: 2100 },
  { carrier: "Hapag-Lloyd", rate: 2900, contractRate: 2850, transitDays: 15, capacity: "Available", sla: 88, lanePerformance: 86, recommended: false, hasActiveContract: false },
]

const CARRIER_OPTIONS_SZX_ORD: CarrierOption[] = [
  { carrier: "MSC", rate: 3200, contractRate: 3150, transitDays: 18, capacity: "Available", sla: 89, lanePerformance: 91, recommended: true, reason: "Contracted carrier — best value for SZX→ORD with strong SLA", contractId: "CTR-2024-002", hasActiveContract: true, volumeCommitted: 8000, volumeUsed: 7280, laneVolumeCommitted: 4000, laneVolumeUsed: 3640 },
  { carrier: "Maersk", rate: 3350, contractRate: 3300, transitDays: 17, capacity: "Limited", sla: 93, lanePerformance: 95, recommended: false, contractId: "CTR-2024-001", hasActiveContract: true, volumeCommitted: 12000, volumeUsed: 8160, laneVolumeCommitted: 3000, laneVolumeUsed: 2040 },
  { carrier: "Hapag-Lloyd", rate: 3180, contractRate: 3200, transitDays: 19, capacity: "Available", sla: 86, lanePerformance: 88, recommended: false, hasActiveContract: false },
  { carrier: "CMA-CGM", rate: 3500, contractRate: 3400, transitDays: 16, capacity: "Available", sla: 91, lanePerformance: 90, recommended: false, contractId: "CTR-2024-004", hasActiveContract: true, volumeCommitted: 10000, volumeUsed: 4200 },
]

const CARRIER_OPTIONS_BOM_RTM: CarrierOption[] = [
  { carrier: "Maersk", rate: 2200, contractRate: 2150, transitDays: 21, capacity: "Full", sla: 90, lanePerformance: 92, recommended: false, reason: "No capacity on current sailing", contractId: "CTR-2024-001", hasActiveContract: true, volumeCommitted: 12000, volumeUsed: 8160 },
  { carrier: "MSC", rate: 2100, contractRate: 2100, transitDays: 23, capacity: "Full", sla: 85, lanePerformance: 87, recommended: false, reason: "Fully booked through end of month", contractId: "CTR-2024-002", hasActiveContract: true, volumeCommitted: 8000, volumeUsed: 7280 },
  { carrier: "Hapag-Lloyd", rate: 2350, contractRate: 2300, transitDays: 20, capacity: "Full", sla: 88, lanePerformance: 89, recommended: false, reason: "No available slots", contractId: "CTR-2023-003", hasActiveContract: true, volumeCommitted: 6000, volumeUsed: 5220, laneVolumeCommitted: 2500, laneVolumeUsed: 2175 },
  { carrier: "CMA-CGM", rate: 2450, contractRate: 2400, transitDays: 22, capacity: "Full", sla: 87, lanePerformance: 85, recommended: false, reason: "All carriers at full capacity on this lane", hasActiveContract: false },
]

const CARRIER_OPTIONS_YYZ_DTW: CarrierOption[] = [
  { carrier: "DHL Freight", rate: 1800, contractRate: 1750, transitDays: 2, capacity: "Available", sla: 94, lanePerformance: 96, recommended: false, hasActiveContract: false },
  { carrier: "Hapag-Lloyd", rate: 1650, contractRate: 1700, transitDays: 2, capacity: "Available", sla: 91, lanePerformance: 93, recommended: true, reason: "AI selected: below-contract rate with strong on-time performance", hasActiveContract: false },
  { carrier: "XPO Logistics", rate: 1900, contractRate: 1850, transitDays: 1, capacity: "Available", sla: 89, lanePerformance: 90, recommended: false, hasActiveContract: false },
]

const CARRIER_OPTIONS_MAA_IAH: CarrierOption[] = [
  { carrier: "Maersk", rate: 2600, contractRate: 2550, transitDays: 25, capacity: "Available", sla: 90, lanePerformance: 88, recommended: true, reason: "Contracted carrier — optimal rate-to-transit ratio for MAA→IAH", contractId: "CTR-2024-001", hasActiveContract: true, volumeCommitted: 12000, volumeUsed: 8160 },
  { carrier: "MSC", rate: 2500, contractRate: 2500, transitDays: 27, capacity: "Available", sla: 86, lanePerformance: 84, recommended: false, contractId: "CTR-2024-002", hasActiveContract: true, volumeCommitted: 8000, volumeUsed: 7280 },
  { carrier: "CMA-CGM", rate: 2750, contractRate: 2700, transitDays: 23, capacity: "Limited", sla: 89, lanePerformance: 91, recommended: false, hasActiveContract: false },
]

const CARRIER_OPTIONS_MEM_ORD: CarrierOption[] = [
  { carrier: "FedEx Freight", rate: 850, contractRate: 800, transitDays: 1, capacity: "Available", sla: 96, lanePerformance: 97, recommended: true, reason: "Contracted carrier — best domestic rate with same-day capacity", contractId: "CTR-2024-005", hasActiveContract: true, volumeCommitted: 5000, volumeUsed: 3300, laneVolumeCommitted: 2500, laneVolumeUsed: 1650 },
  { carrier: "XPO Logistics", rate: 920, contractRate: 900, transitDays: 1, capacity: "Available", sla: 93, lanePerformance: 94, recommended: false, hasActiveContract: false },
  { carrier: "J.B. Hunt", rate: 880, contractRate: 850, transitDays: 1, capacity: "Limited", sla: 91, lanePerformance: 92, recommended: false, hasActiveContract: false },
]

const CARRIER_OPTIONS_BOM_LAX: CarrierOption[] = [
  { carrier: "CMA-CGM", rate: 3800, contractRate: 3200, transitDays: 22, capacity: "Available", sla: 88, lanePerformance: 86, recommended: false, reason: "Spot rate 19% above contract — requires planner approval", contractId: "CTR-2024-004", hasActiveContract: true, volumeCommitted: 10000, volumeUsed: 4200 },
  { carrier: "Maersk", rate: 3500, contractRate: 3400, transitDays: 24, capacity: "Limited", sla: 91, lanePerformance: 90, recommended: true, reason: "Contracted carrier — closer to contract rate", contractId: "CTR-2024-001", hasActiveContract: true, volumeCommitted: 12000, volumeUsed: 8160 },
  { carrier: "MSC", rate: 3600, contractRate: 3300, transitDays: 23, capacity: "Available", sla: 87, lanePerformance: 85, recommended: false, contractId: "CTR-2024-002", hasActiveContract: true, volumeCommitted: 8000, volumeUsed: 7280 },
]

const CARRIER_OPTIONS_HKG_RTM: CarrierOption[] = [
  { carrier: "Hapag-Lloyd", rate: 2950, contractRate: 2900, transitDays: 20, capacity: "Available", sla: 91, lanePerformance: 93, recommended: true, reason: "Contracted carrier — strong SLA within contract tolerance", contractId: "CTR-2023-003", hasActiveContract: true, volumeCommitted: 6000, volumeUsed: 5220, laneVolumeCommitted: 3500, laneVolumeUsed: 3045 },
  { carrier: "Maersk", rate: 3050, contractRate: 3000, transitDays: 19, capacity: "Available", sla: 93, lanePerformance: 95, recommended: false, contractId: "CTR-2024-001", hasActiveContract: true, volumeCommitted: 12000, volumeUsed: 8160, laneVolumeCommitted: 5000, laneVolumeUsed: 3400 },
  { carrier: "MSC", rate: 2800, contractRate: 2850, transitDays: 22, capacity: "Available", sla: 86, lanePerformance: 88, recommended: false, hasActiveContract: false },
]

// ── 8 Booking Requests ───────────────────────────────────────────────────

export const BOOKING_REQUESTS: BookingRequest[] = [
  {
    id: "BKG-10421",
    mode: "Ocean",
    carrier: "Maersk",
    bookingRef: "MAEU2450891",
    vesselSchedule: "Maersk Elba — Sailing Mar 15",
    containerType: "40' HC",
    origin: "Shanghai, CN",
    destination: "Los Angeles, US",
    plant: "LAX Distribution Center",
    bookingStatus: "Confirmed",
    requestedDate: "Mar 12, 2025 09:00",
    targetShipDate: "Mar 15, 2025",
    confirmedShipDate: "Mar 15, 2025",
    severity: "Low",
    exceptionType: "None",
    approvalType: "None",
    lane: "SHA→LAX",
    sapOrderRef: "SAP-TM-44821",
    agentSummary: "Booking completed autonomously. Maersk selected as best-fit carrier based on rate ($2,850), 92% SLA score, and available capacity. Booking confirmed within 23 minutes of SAP requirement ingestion. Plant team notified, OTM updated.",
    workflowSteps: makeWorkflowSteps(8).map((s) => ({ ...s, status: "completed" as const, timestamp: `Mar 12, ${String(9 + Math.floor(s.step * 0.3)).padStart(2, "0")}:${String((s.step * 3) % 60).padStart(2, "0")}`, detail: s.step === 2 ? "Maersk selected — $2,850/40'HC, 14d transit, 92% SLA" : s.step === 6 ? "Confirmation MAEU2450891 received" : `Step ${s.step} completed` })),
    carrierOptions: CARRIER_OPTIONS_SHA_LAX,
    reasonChips: [
      { label: "Auto-Booked", type: "booking" },
      { label: "On Contract", type: "rate" },
      { label: "Capacity OK", type: "capacity" },
    ],
    timeline: [
      { timestamp: "Mar 12 09:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 12 09:05", event: "Carrier evaluation completed — Maersk recommended", location: "AI Engine", source: "Agent", status: "agent" },
      { timestamp: "Mar 12 09:08", event: "Logged into Maersk booking portal via API", location: "Maersk Portal", source: "API Gateway", status: "ok" },
      { timestamp: "Mar 12 09:12", event: "Booking request submitted — 40' HC, Sailing Mar 15", location: "Maersk Portal", source: "RPA Bot", status: "ok" },
      { timestamp: "Mar 12 09:15", event: "Supporting documents uploaded (SLI, packing list)", location: "Document System", source: "Document System", status: "ok" },
      { timestamp: "Mar 12 09:18", event: "Booking confirmed — Ref MAEU2450891", location: "Maersk Portal", source: "Maersk Portal", status: "ok" },
      { timestamp: "Mar 12 09:20", event: "Plant team notified — LAX DC ops updated", location: "Email / SAP", source: "Email", status: "ok" },
      { timestamp: "Mar 12 09:23", event: "SAP TM & OTM updated with booking confirmation", location: "SAP TM", source: "SAP TM", status: "ok" },
    ],
    sources: [
      { source: "SAP TM", status: "Booking Confirmed", timestamp: "Mar 12 09:23", freshness: "4h ago", aligned: true, fresh: true },
      { source: "Maersk Portal", status: "Confirmed — MAEU2450891", timestamp: "Mar 12 09:18", freshness: "4h ago", aligned: true, fresh: true },
      { source: "OTM", status: "Synced", timestamp: "Mar 12 09:23", freshness: "4h ago", aligned: true, fresh: true },
    ],
    currentStatus: "Booking Confirmed",
    recommendedAction: "No action required — booking complete",
    notificationStatus: "Sent",
    otmStatus: "Synced",
    etaConfidence: 95,
    delayHours: 0,
    trackingRef: "MAEU2450891",
    plannedETA: "Mar 15, 2025",
    revisedETA: "Mar 15, 2025",
    lastSignal: "4h ago",
    lastSignalSource: "Maersk Portal",
    lat: 31.23,
    lng: 121.47,
  },
  {
    id: "BKG-20334",
    mode: "Ocean",
    carrier: "MSC",
    bookingRef: undefined,
    vesselSchedule: "MSC Gulsun — Sailing Mar 18",
    containerType: "40' STD",
    origin: "Shenzhen, CN",
    destination: "Chicago, US",
    plant: "ORD Warehouse Hub",
    bookingStatus: "In Progress",
    requestedDate: "Mar 13, 2025 07:30",
    targetShipDate: "Mar 18, 2025",
    severity: "Low",
    exceptionType: "None",
    approvalType: "None",
    lane: "SZX→ORD",
    sapOrderRef: "SAP-TM-44835",
    agentSummary: "Booking in progress — currently filling booking form on MSC portal. MSC selected for optimal rate ($3,200) and capacity. Vessel MSC Gulsun sailing Mar 18. Agent at step 4 of 8.",
    workflowSteps: makeWorkflowSteps(4).map((s, i) => ({
      ...s,
      timestamp: i < 4 ? `Mar 13, 0${7 + Math.floor(i * 0.25)}:${String(30 + i * 8).padStart(2, "0")}` : undefined,
      detail: s.step === 2 ? "MSC selected — $3,200/40'STD, 18d transit, 89% SLA" : s.step === 4 ? "Filling booking form — vessel schedule & container allocation" : s.detail,
    })),
    carrierOptions: CARRIER_OPTIONS_SZX_ORD,
    reasonChips: [
      { label: "In Progress", type: "booking" },
      { label: "Step 4/8", type: "booking" },
      { label: "On Contract", type: "rate" },
    ],
    timeline: [
      { timestamp: "Mar 13 07:30", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 13 07:35", event: "Carrier evaluation — MSC recommended for SZX→ORD", location: "AI Engine", source: "Agent", status: "agent" },
      { timestamp: "Mar 13 07:38", event: "Logged into MSC booking portal", location: "MSC Portal", source: "API Gateway", status: "ok" },
      { timestamp: "Mar 13 07:42", event: "Completing booking form — vessel & container details", location: "MSC Portal", source: "RPA Bot", status: "info" },
    ],
    sources: [
      { source: "SAP TM", status: "Booking In Progress", timestamp: "Mar 13 07:30", freshness: "1h ago", aligned: true, fresh: true },
      { source: "MSC Portal", status: "Form submission in progress", timestamp: "Mar 13 07:42", freshness: "30m ago", aligned: true, fresh: true },
    ],
    currentStatus: "Completing Booking Form",
    recommendedAction: "Monitor — agent completing booking on MSC portal",
    notificationStatus: "Not Yet Sent",
    otmStatus: "Pending Update",
    etaConfidence: 80,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 18, 2025",
    revisedETA: "Mar 18, 2025",
    lastSignal: "30m ago",
    lastSignalSource: "MSC Portal",
    lat: 22.54,
    lng: 114.06,
  },
  {
    id: "BKG-30188",
    mode: "Ocean",
    carrier: "—",
    containerType: "20' STD",
    origin: "Mumbai, IN",
    destination: "Rotterdam, NL",
    plant: "RTM Euro Hub",
    bookingStatus: "Exception",
    requestedDate: "Mar 12, 2025 14:00",
    targetShipDate: "Mar 17, 2025",
    severity: "High",
    exceptionType: "Missing Allocation",
    approvalType: "None",
    lane: "BOM→RTM",
    sapOrderRef: "SAP-TM-44802",
    agentSummary: "All 4 contracted carriers at full capacity on BOM→RTM for Mar 17–19 sailing window. Agent checked Maersk, MSC, Hapag-Lloyd, and CMA-CGM — zero available slots. AI identified 3 alternate routing options. Awaiting planner decision to retry, reroute, or authorize spot booking.",
    workflowSteps: makeWorkflowSteps(2, 2).map((s) => ({
      ...s,
      status: s.step === 1 ? "completed" as const : s.step === 2 ? "failed" as const : "pending" as const,
      timestamp: s.step === 1 ? "Mar 12, 14:00" : s.step === 2 ? "Mar 12, 14:08" : undefined,
      detail: s.step === 1 ? "SAP TM requirement ingested — BOM→RTM, 20' STD, target Mar 17"
        : s.step === 2 ? "FAILED: Carrier capacity check — Maersk FULL · MSC FULL · Hapag-Lloyd FULL · CMA-CGM FULL"
        : s.detail,
    })),
    alternateOptions: [
      { label: "Option 2", carrier: "Maersk", lane: "BOM→FRA", via: "Direct to Frankfurt", transitDays: 19, rate: 2250, capacity: "Available", sla: 90, score: 88 },
      { label: "Option 3", carrier: "MSC", lane: "BOM→RTM", via: "via Colombo (transship)", transitDays: 27, rate: 2100, capacity: "Available", sla: 84, score: 79 },
      { label: "Option 4", carrier: "CMA-CGM", lane: "BOM→AMS", via: "via Singapore", transitDays: 24, rate: 2600, capacity: "Limited", sla: 87, score: 82 },
    ],
    carrierOptions: CARRIER_OPTIONS_BOM_RTM,
    reasonChips: [
      { label: "No Capacity", type: "capacity" },
      { label: "All Carriers Full", type: "carrier" },
      { label: "Spot Market", type: "rate" },
    ],
    timeline: [
      { timestamp: "Mar 12 14:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 12 14:05", event: "Carrier evaluation started — checking 4 carriers", location: "AI Engine", source: "Agent", status: "info" },
      { timestamp: "Mar 12 14:08", event: "EXCEPTION: All carriers at full capacity on BOM→RTM", location: "AI Engine", source: "Agent", status: "critical", anomaly: "No available capacity from Maersk, MSC, Hapag-Lloyd, or CMA-CGM" },
      { timestamp: "Mar 12 14:09", event: "Agent recommends: check spot market or Colombo transshipment", location: "AI Engine", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "SAP TM", status: "Booking Exception", timestamp: "Mar 12 14:08", freshness: "10h ago", aligned: true, fresh: false },
      { source: "Maersk Portal", status: "Full — no allocation", timestamp: "Mar 12 14:06", freshness: "10h ago", aligned: true, fresh: false },
      { source: "MSC Portal", status: "Full — no allocation", timestamp: "Mar 12 14:07", freshness: "10h ago", aligned: true, fresh: false },
    ],
    currentStatus: "Exception — Missing Allocation",
    recommendedAction: "Check spot market or approve Colombo transshipment",
    notificationStatus: "Escalated",
    otmStatus: "Needs Review",
    etaConfidence: 20,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 17, 2025",
    revisedETA: "TBD",
    lastSignal: "10h ago",
    lastSignalSource: "Agent",
    lat: 19.08,
    lng: 72.88,
  },
  {
    id: "BKG-40672",
    mode: "Road",
    carrier: "Hapag-Lloyd",
    containerType: "Flatbed",
    origin: "Toronto, CA",
    destination: "Detroit, US",
    plant: "DTW Assembly Plant",
    bookingStatus: "Confirmed",
    requestedDate: "Mar 13, 2025 06:00",
    targetShipDate: "Mar 14, 2025",
    confirmedShipDate: "Mar 14, 2025",
    severity: "Low",
    exceptionType: "None",
    approvalType: "None",
    lane: "YYZ→DTW",
    sapOrderRef: "SAP-TM-44840",
    agentSummary: "AI selected Hapag-Lloyd ($1,650, below contract) but historical preference for DHL Freight on this lane. Awaiting router confirmation to proceed with AI recommendation or override to DHL Freight ($1,800).",
    workflowSteps: makeWorkflowSteps(2).map((s) => ({
      ...s,
      timestamp: s.step <= 2 ? `Mar 13, 06:0${s.step * 3}` : undefined,
      detail: s.step === 2 ? "Hapag-Lloyd selected — AWAITING APPROVAL for carrier override" : s.detail,
    })),
    carrierOptions: CARRIER_OPTIONS_YYZ_DTW,
    reasonChips: [
      { label: "Carrier Override", type: "approval" },
      { label: "Below Contract", type: "rate" },
      { label: "Needs Approval", type: "approval" },
    ],
    timeline: [
      { timestamp: "Mar 13 06:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 13 06:03", event: "AI selected Hapag-Lloyd — $1,650, below contract rate", location: "AI Engine", source: "Agent", status: "agent" },
      { timestamp: "Mar 13 06:04", event: "HOLD: Router approval requested — carrier override check", location: "System", source: "System Alert", status: "warning", anomaly: "Historical preference for DHL Freight on YYZ→DTW lane" },
    ],
    sources: [
      { source: "SAP TM", status: "Awaiting Approval", timestamp: "Mar 13 06:04", freshness: "2h ago", aligned: true, fresh: true },
      { source: "Hapag-Lloyd Portal", status: "Ready for booking", timestamp: "Mar 13 06:03", freshness: "2h ago", aligned: true, fresh: true },
    ],
    currentStatus: "Awaiting Carrier Override Approval",
    recommendedAction: "Approve Hapag-Lloyd or override to DHL Freight",
    notificationStatus: "Not Yet Sent",
    otmStatus: "Pending Update",
    etaConfidence: 75,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 14, 2025",
    revisedETA: "Mar 14, 2025",
    lastSignal: "2h ago",
    lastSignalSource: "System Alert",
    lat: 43.65,
    lng: -79.38,
  },
  {
    id: "BKG-50219",
    mode: "Ocean",
    carrier: "Maersk",
    containerType: "40' HC",
    origin: "Chennai, IN",
    destination: "Houston, US",
    plant: "IAH Petrochem Hub",
    bookingStatus: "Exception",
    requestedDate: "Mar 11, 2025 11:00",
    targetShipDate: "Mar 16, 2025",
    severity: "Critical",
    exceptionType: "Carrier Rejection",
    approvalType: "Booking Rejection",
    lane: "MAA→IAH",
    sapOrderRef: "SAP-TM-44788",
    rejectionReason: "Vessel fully allocated after booking submission deadline — capacity exhausted 3h 15m before agent submitted request",
    rejectionCategory: "capacity",
    agentSummary: "Maersk rejected booking at Step 6 (Confirmation) — vessel fully allocated after deadline. Steps 1–5 completed successfully (portal login, form submitted, docs uploaded). AI identified MSC as next best carrier but next sailing is Mar 20 (+4 days). Critical: IAH production line at risk. Router approval required to reroute or escalate.",
    workflowSteps: makeWorkflowSteps(6, 6).map((s) => ({
      ...s,
      status: s.step <= 5 ? "completed" as const : s.step === 6 ? "failed" as const : "pending" as const,
      timestamp: s.step <= 6 ? `Mar 11, ${String(11 + Math.floor(s.step * 0.6)).padStart(2, "0")}:${String((s.step * 8) % 60).padStart(2, "0")}` : undefined,
      detail: s.step === 2 ? "Maersk selected — $2,600/40'HC, 25d transit, 90% SLA (best for MAA→IAH)"
        : s.step === 3 ? "Logged into Maersk booking portal via API gateway"
        : s.step === 4 ? "Booking form submitted — Ref MAEU-PEND-0219, Sailing Mar 16"
        : s.step === 5 ? "Commercial invoice, packing list & B/L draft uploaded"
        : s.step === 6 ? "FAILED: Maersk rejected — vessel 98.2% allocated, booking accepted past cut-off"
        : s.detail,
    })),
    carrierOptions: CARRIER_OPTIONS_MAA_IAH,
    reasonChips: [
      { label: "Carrier Rejected", type: "carrier" },
      { label: "Re-routing Needed", type: "booking" },
      { label: "Production Impact", type: "approval" },
    ],
    timeline: [
      { timestamp: "Mar 11 11:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 11 11:06", event: "Maersk selected — best rate for MAA→IAH", location: "AI Engine", source: "Agent", status: "agent" },
      { timestamp: "Mar 11 11:10", event: "Logged into Maersk booking portal", location: "Maersk Portal", source: "API Gateway", status: "ok" },
      { timestamp: "Mar 11 11:15", event: "Booking submitted to Maersk", location: "Maersk Portal", source: "RPA Bot", status: "ok" },
      { timestamp: "Mar 11 14:30", event: "REJECTION: Maersk declined — vessel fully allocated", location: "Maersk Portal", source: "Maersk Portal", status: "critical", anomaly: "Vessel capacity exhausted after booking deadline" },
      { timestamp: "Mar 11 14:32", event: "Agent checking fallback carriers — MSC next sailing Mar 20", location: "AI Engine", source: "Agent", status: "warning" },
      { timestamp: "Mar 11 14:33", event: "Escalated to router — re-routing approval required", location: "System", source: "System Alert", status: "critical" },
    ],
    sources: [
      { source: "SAP TM", status: "Booking Exception — Carrier Rejection", timestamp: "Mar 11 14:33", freshness: "1d ago", aligned: true, fresh: false },
      { source: "Maersk Portal", status: "Rejected — vessel full", timestamp: "Mar 11 14:30", freshness: "1d ago", aligned: true, fresh: false },
    ],
    currentStatus: "Exception — Carrier Rejection",
    recommendedAction: "Approve alternate carrier (MSC Mar 20) or authorize expedited option",
    notificationStatus: "Escalated",
    otmStatus: "Needs Review",
    etaConfidence: 15,
    delayHours: 4,
    trackingRef: "—",
    plannedETA: "Mar 16, 2025",
    revisedETA: "Mar 20, 2025",
    lastSignal: "1d ago",
    lastSignalSource: "Maersk Portal",
    lat: 13.08,
    lng: 80.27,
  },
  {
    id: "BKG-60441",
    mode: "Road",
    carrier: "CMA-CGM",
    containerType: "53' Dry Van",
    origin: "Memphis, US",
    destination: "Chicago, US",
    plant: "ORD Midwest DC",
    bookingStatus: "Exception",
    requestedDate: "Mar 13, 2025 08:00",
    targetShipDate: "Mar 15, 2025",
    severity: "High",
    exceptionType: "Portal Unavailable",
    approvalType: "None",
    lane: "MEM→ORD",
    sapOrderRef: "SAP-TM-44850",
    agentSummary: "Booking agent could not connect to CMA-CGM eBusiness portal. API returned timeout after 3 retries. RPA fallback also failed — portal appears to be undergoing maintenance. Recommend switching to FedEx Freight (available, $850) or XPO Logistics ($920).",
    workflowSteps: makeWorkflowSteps(3, 3).map((s) => ({
      ...s,
      status: s.step <= 2 ? "completed" as const : s.step === 3 ? "failed" as const : "pending" as const,
      timestamp: s.step === 1 ? "Mar 13, 08:00" : s.step === 2 ? "Mar 13, 08:04" : s.step === 3 ? "Mar 13, 08:06" : undefined,
      detail: s.step === 1 ? "Shipment requirement ingested from SAP TM"
        : s.step === 2 ? "CMA-CGM selected — $920/53' Dry Van, 1d transit, 87% SLA"
        : s.step === 3 ? "FAILED: CMA-CGM eBusiness portal unreachable — API timeout after 3 retries, RPA fallback failed"
        : undefined,
    })),
    carrierOptions: [
      { carrier: "CMA-CGM", rate: 920, contractRate: 900, transitDays: 1, capacity: "Available", sla: 87, lanePerformance: 85, recommended: false, reason: "Portal unavailable — cannot complete booking" },
      { carrier: "FedEx Freight", rate: 850, contractRate: 800, transitDays: 1, capacity: "Available", sla: 96, lanePerformance: 97, recommended: true, reason: "Best alternate — reliable portal, strong SLA" },
      { carrier: "XPO Logistics", rate: 920, contractRate: 900, transitDays: 1, capacity: "Available", sla: 93, lanePerformance: 94, recommended: false },
      { carrier: "J.B. Hunt", rate: 880, contractRate: 850, transitDays: 1, capacity: "Limited", sla: 91, lanePerformance: 92, recommended: false },
    ],
    reasonChips: [
      { label: "Portal Down", type: "portal" },
      { label: "API Timeout", type: "portal" },
      { label: "Switch Carrier", type: "carrier" },
    ],
    timeline: [
      { timestamp: "Mar 13 08:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 13 08:04", event: "Carrier evaluation — CMA-CGM selected for MEM→ORD", location: "AI Engine", source: "Agent", status: "agent" },
      { timestamp: "Mar 13 08:05", event: "Attempting connection to CMA-CGM eBusiness portal...", location: "CMA-CGM Portal", source: "API Gateway", status: "info" },
      { timestamp: "Mar 13 08:05", event: "API attempt 1/3 — timeout (30s)", location: "CMA-CGM Portal", source: "API Gateway", status: "warning" },
      { timestamp: "Mar 13 08:06", event: "API attempt 2/3 — timeout (30s)", location: "CMA-CGM Portal", source: "API Gateway", status: "warning" },
      { timestamp: "Mar 13 08:06", event: "API attempt 3/3 — timeout (30s)", location: "CMA-CGM Portal", source: "API Gateway", status: "critical", anomaly: "CMA-CGM portal unreachable after 3 attempts" },
      { timestamp: "Mar 13 08:07", event: "RPA fallback attempted — portal login page unresponsive", location: "CMA-CGM Portal", source: "RPA Bot", status: "critical" },
      { timestamp: "Mar 13 08:07", event: "EXCEPTION: Portal unavailable — agent recommends carrier switch", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "SAP TM", status: "Booking Exception", timestamp: "Mar 13 08:07", freshness: "20m ago", aligned: true, fresh: true },
      { source: "CMA-CGM Portal", status: "Unreachable — API timeout", timestamp: "Mar 13 08:06", freshness: "20m ago", aligned: false, fresh: false },
      { source: "RPA Bot", status: "Portal login failed", timestamp: "Mar 13 08:07", freshness: "20m ago", aligned: false, fresh: false },
    ],
    currentStatus: "Exception — Portal Unavailable",
    recommendedAction: "Switch to FedEx Freight or XPO Logistics; notify IT for CMA-CGM portal investigation",
    notificationStatus: "Escalated",
    otmStatus: "Needs Review",
    etaConfidence: 30,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 15, 2025",
    revisedETA: "TBD",
    lastSignal: "20m ago",
    lastSignalSource: "Agent",
    lat: 35.15,
    lng: -90.05,
  },
  {
    id: "BKG-70991",
    mode: "Ocean",
    carrier: "CMA-CGM",
    containerType: "40' Reefer",
    origin: "Mumbai, IN",
    destination: "Los Angeles, US",
    plant: "LAX Cold Chain DC",
    bookingStatus: "Exception",
    requestedDate: "Mar 12, 2025 16:00",
    targetShipDate: "Mar 19, 2025",
    severity: "High",
    exceptionType: "Rate Mismatch",
    approvalType: "Spot Booking",
    lane: "BOM→LAX",
    sapOrderRef: "SAP-TM-44815",
    agentSummary: "CMA-CGM spot rate ($3,800) is 19% above contract rate ($3,200). Agent flagged for planner approval. Reefer container type limits carrier options. Maersk alternative at $3,500 with limited capacity — also above contract.",
    workflowSteps: makeWorkflowSteps(3, 3).map((s) => ({
      ...s,
      status: s.step <= 2 ? "completed" as const : s.step === 3 ? "failed" as const : "pending" as const,
      timestamp: s.step <= 3 ? `Mar 12, ${16 + Math.floor(s.step * 0.15)}:${String(s.step * 5).padStart(2, "0")}` : undefined,
      detail: s.step === 3 ? "HOLD: Rate mismatch — $3,800 spot vs $3,200 contract (19% premium)" : s.detail,
    })),
    carrierOptions: CARRIER_OPTIONS_BOM_LAX,
    reasonChips: [
      { label: "Rate Mismatch", type: "rate" },
      { label: "Spot Premium 19%", type: "rate" },
      { label: "Needs Approval", type: "approval" },
    ],
    timeline: [
      { timestamp: "Mar 12 16:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 12 16:05", event: "Carrier evaluation — CMA-CGM best capacity for reefer", location: "AI Engine", source: "Agent", status: "agent" },
      { timestamp: "Mar 12 16:08", event: "RATE ALERT: CMA-CGM $3,800 vs contract $3,200 (+19%)", location: "Rate Engine", source: "Rate Engine", status: "critical", anomaly: "Spot rate exceeds contract by 19% — approval required" },
      { timestamp: "Mar 12 16:09", event: "Escalated to planner — spot booking authorization needed", location: "System", source: "System Alert", status: "warning" },
    ],
    sources: [
      { source: "SAP TM", status: "Awaiting Rate Approval", timestamp: "Mar 12 16:09", freshness: "16h ago", aligned: true, fresh: false },
      { source: "CMA-CGM Portal", status: "Rate quoted — $3,800", timestamp: "Mar 12 16:07", freshness: "16h ago", aligned: true, fresh: false },
      { source: "Rate Engine", status: "Contract rate: $3,200", timestamp: "Mar 12 16:08", freshness: "16h ago", aligned: true, fresh: false },
    ],
    currentStatus: "Exception — Rate Mismatch",
    recommendedAction: "Authorize spot booking at $3,800 or negotiate with carrier",
    notificationStatus: "Escalated",
    otmStatus: "Needs Review",
    etaConfidence: 35,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 19, 2025",
    revisedETA: "TBD",
    lastSignal: "16h ago",
    lastSignalSource: "Rate Engine",
    lat: 19.08,
    lng: 72.88,
  },
  {
    id: "BKG-88442",
    mode: "Ocean",
    carrier: "Hapag-Lloyd",
    bookingRef: undefined,
    vesselSchedule: "Hapag-Lloyd Express — Sailing Mar 17",
    containerType: "40' HC",
    origin: "Hong Kong, CN",
    destination: "Rotterdam, NL",
    plant: "RTM Euro Hub",
    bookingStatus: "Exception",
    requestedDate: "Mar 13, 2025 05:00",
    targetShipDate: "Mar 17, 2025",
    severity: "Medium",
    exceptionType: "Missing Booking Fields",
    approvalType: "None",
    lane: "HKG→RTM",
    sapOrderRef: "SAP-TM-44855",
    agentSummary: "SAP TM record for HKG→RTM is incomplete — missing cargo weight, HS commodity code, and cargo ready date. Agent cannot proceed with carrier portal booking until mandatory fields are populated. Recommend pulling data from SAP master or requesting from shipment planner.",
    missingFields: [
      { field: "cargo_weight", label: "Cargo Weight (kg)", required: true, type: "number", mockValue: "18500" },
      { field: "commodity_code", label: "HS Commodity Code", required: true, type: "text", mockValue: "8471.30" },
      { field: "ready_date", label: "Cargo Ready Date", required: true, type: "date", mockValue: "2025-03-16" },
      { field: "shipper_ref", label: "Shipper Reference No.", required: false, type: "text", mockValue: "SHIP-HK-2025-0442" },
    ],
    workflowSteps: makeWorkflowSteps(1, 1).map((s) => ({
      ...s,
      status: s.step === 1 ? "failed" as const : "pending" as const,
      timestamp: s.step === 1 ? "Mar 13, 05:02" : undefined,
      detail: s.step === 1 ? "FAILED: Mandatory fields validation — missing cargo_weight, commodity_code, ready_date" : undefined,
    })),
    carrierOptions: CARRIER_OPTIONS_HKG_RTM,
    reasonChips: [
      { label: "Missing Fields", type: "document" },
      { label: "SAP Incomplete", type: "sap" },
      { label: "Blocked", type: "booking" },
    ],
    timeline: [
      { timestamp: "Mar 13 05:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM", status: "ok" },
      { timestamp: "Mar 13 05:01", event: "Agent validation: checking mandatory booking fields...", location: "System", source: "Agent", status: "info" },
      { timestamp: "Mar 13 05:02", event: "VALIDATION FAILED: 3 mandatory fields missing (cargo_weight, commodity_code, ready_date)", location: "SAP TM", source: "Agent", status: "critical", anomaly: "SAP TM record incomplete — cannot proceed with booking" },
      { timestamp: "Mar 13 05:02", event: "Agent recommends: pull from SAP master data or request from planner", location: "System", source: "Agent", status: "agent" },
    ],
    sources: [
      { source: "SAP TM", status: "Record Incomplete", timestamp: "Mar 13 05:02", freshness: "3h ago", aligned: false, fresh: false },
      { source: "Agent", status: "Awaiting field completion", timestamp: "Mar 13 05:02", freshness: "3h ago", aligned: true, fresh: true },
    ],
    currentStatus: "Exception — Missing Booking Fields",
    recommendedAction: "Complete missing fields in SAP TM or provide via planner email",
    notificationStatus: "Escalated",
    otmStatus: "Needs Review",
    etaConfidence: 40,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 17, 2025",
    revisedETA: "TBD",
    lastSignal: "3h ago",
    lastSignalSource: "Agent",
    lat: 22.32,
    lng: 114.17,
  },
  // ── Additional bookings for richer dashboard ──────────────────────────────
  {
    id: "BKG-91003",
    mode: "Road" as TransportMode,
    carrier: "FedEx Freight",
    bookingRef: "FXF-20250313-0901",
    containerType: "53' Dry Van",
    origin: "Memphis, US",
    destination: "Chicago, US",
    plant: "ORD Warehouse Hub",
    bookingStatus: "Confirmed" as BookingStatus,
    requestedDate: "Mar 11, 2025 06:00",
    targetShipDate: "Mar 12, 2025",
    confirmedShipDate: "Mar 12, 2025",
    severity: "Low" as Severity,
    exceptionType: "None" as BookingExceptionType,
    approvalType: "None" as ApprovalType,
    lane: "MEM→ORD",
    sapOrderRef: "SAP-TM-44790",
    agentSummary: "Booking completed autonomously in 8 minutes. FedEx Freight selected — best rate ($820) on this lane with 98% SLA. Carrier portal confirmed instantly. Zero-touch booking.",
    workflowSteps: makeWorkflowSteps(8).map((s) => ({ ...s, status: "completed" as const, timestamp: `Mar 11, 0${6 + Math.floor(s.step * 0.1)}:${String(s.step * 2).padStart(2, "0")}`, detail: `Step ${s.step} completed` })),
    carrierOptions: CARRIER_OPTIONS_MEM_ORD,
    reasonChips: [{ label: "Auto-Booked", type: "booking" as const }, { label: "On Contract", type: "rate" as const }],
    timeline: [
      { timestamp: "Mar 11 06:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
      { timestamp: "Mar 11 06:03", event: "FedEx Freight selected — $820, 2d transit, 98% SLA", location: "AI Engine", source: "Agent" as SignalSource, status: "agent" },
      { timestamp: "Mar 11 06:05", event: "Booking confirmed — FXF-20250313-0901", location: "FedEx Portal", source: "API Gateway" as SignalSource, status: "ok" },
      { timestamp: "Mar 11 06:08", event: "Plant team notified, SAP TM updated", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
    ],
    sources: [
      { source: "SAP TM" as SignalSource, status: "Booking Confirmed", timestamp: "Mar 11 06:08", freshness: "2d ago", aligned: true, fresh: true },
      { source: "API Gateway" as SignalSource, status: "Confirmed", timestamp: "Mar 11 06:05", freshness: "2d ago", aligned: true, fresh: true },
    ],
    currentStatus: "Booking Confirmed",
    recommendedAction: "No action required — booking complete",
    notificationStatus: "Sent",
    otmStatus: "Synced",
    etaConfidence: 98,
    delayHours: 0,
    trackingRef: "FXF-20250313-0901",
    plannedETA: "Mar 12, 2025",
    revisedETA: "Mar 12, 2025",
    lastSignal: "2d ago",
    lastSignalSource: "API Gateway" as SignalSource,
    lat: 35.15,
    lng: -90.05,
  },
  {
    id: "BKG-91204",
    mode: "Ocean" as TransportMode,
    carrier: "Maersk",
    bookingRef: "MAEU2451102",
    vesselSchedule: "Maersk Seletar — Sailing Mar 14",
    containerType: "40' HC",
    origin: "Shanghai, CN",
    destination: "Los Angeles, US",
    plant: "LAX Distribution Center",
    bookingStatus: "Confirmed" as BookingStatus,
    requestedDate: "Mar 10, 2025 11:00",
    targetShipDate: "Mar 14, 2025",
    confirmedShipDate: "Mar 14, 2025",
    severity: "Low" as Severity,
    exceptionType: "None" as BookingExceptionType,
    approvalType: "None" as ApprovalType,
    lane: "SHA→LAX",
    sapOrderRef: "SAP-TM-44775",
    agentSummary: "Standard recurring booking on SHA→LAX lane. Maersk selected per contract terms. Confirmed in 31 minutes — zero-touch, fully automated.",
    workflowSteps: makeWorkflowSteps(8).map((s) => ({ ...s, status: "completed" as const, timestamp: `Mar 10, 1${1 + Math.floor(s.step * 0.05)}:${String(s.step * 4).padStart(2, "0")}` })),
    carrierOptions: CARRIER_OPTIONS_SHA_LAX,
    reasonChips: [{ label: "Auto-Booked", type: "booking" as const }, { label: "Recurring", type: "booking" as const }],
    timeline: [
      { timestamp: "Mar 10 11:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
      { timestamp: "Mar 10 11:10", event: "Maersk selected — recurring lane, contract rate", location: "AI Engine", source: "Agent" as SignalSource, status: "agent" },
      { timestamp: "Mar 10 11:25", event: "Booking confirmed — MAEU2451102", location: "Maersk Portal", source: "Maersk Portal" as SignalSource, status: "ok" },
      { timestamp: "Mar 10 11:31", event: "SAP TM & plant team updated", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
    ],
    sources: [
      { source: "SAP TM" as SignalSource, status: "Booking Confirmed", timestamp: "Mar 10 11:31", freshness: "3d ago", aligned: true, fresh: true },
    ],
    currentStatus: "Booking Confirmed",
    recommendedAction: "No action required",
    notificationStatus: "Sent",
    otmStatus: "Synced",
    etaConfidence: 94,
    delayHours: 0,
    trackingRef: "MAEU2451102",
    plannedETA: "Mar 14, 2025",
    revisedETA: "Mar 14, 2025",
    lastSignal: "3d ago",
    lastSignalSource: "Maersk Portal" as SignalSource,
    lat: 31.23,
    lng: 121.47,
  },
  {
    id: "BKG-91587",
    mode: "Road" as TransportMode,
    carrier: "DHL Freight",
    bookingRef: undefined,
    containerType: "Flatbed",
    origin: "Toronto, CA",
    destination: "Detroit, US",
    plant: "DTW Assembly Plant",
    bookingStatus: "In Progress" as BookingStatus,
    requestedDate: "Mar 13, 2025 07:15",
    targetShipDate: "Mar 14, 2025",
    severity: "Low" as Severity,
    exceptionType: "None" as BookingExceptionType,
    approvalType: "None" as ApprovalType,
    lane: "YYZ→DTW",
    sapOrderRef: "SAP-TM-44862",
    agentSummary: "DHL Freight selected for YYZ→DTW lane. Currently completing booking form on DHL portal. Expected confirmation within 15 minutes.",
    workflowSteps: makeWorkflowSteps(4).map((s) => ({ ...s, timestamp: s.step <= 4 ? `Mar 13, 07:${String(15 + s.step * 3).padStart(2, "0")}` : undefined })),
    carrierOptions: CARRIER_OPTIONS_YYZ_DTW,
    reasonChips: [{ label: "In Progress", type: "booking" as const }, { label: "Step 4/8", type: "booking" as const }],
    timeline: [
      { timestamp: "Mar 13 07:15", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
      { timestamp: "Mar 13 07:18", event: "DHL Freight selected — $1,780, 2d transit", location: "AI Engine", source: "Agent" as SignalSource, status: "agent" },
      { timestamp: "Mar 13 07:22", event: "Logged into DHL booking portal", location: "DHL Portal", source: "API Gateway" as SignalSource, status: "ok" },
      { timestamp: "Mar 13 07:24", event: "Completing booking form...", location: "DHL Portal", source: "RPA Bot" as SignalSource, status: "info" },
    ],
    sources: [
      { source: "SAP TM" as SignalSource, status: "In Progress", timestamp: "Mar 13 07:15", freshness: "1h ago", aligned: true, fresh: true },
    ],
    currentStatus: "Completing Booking Form",
    recommendedAction: "Monitor — agent completing booking",
    notificationStatus: "Not Yet Sent",
    otmStatus: "Pending Update",
    etaConfidence: 85,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 14, 2025",
    revisedETA: "Mar 14, 2025",
    lastSignal: "1h ago",
    lastSignalSource: "RPA Bot" as SignalSource,
    lat: 43.65,
    lng: -79.38,
  },
  {
    id: "BKG-92015",
    mode: "Ocean" as TransportMode,
    carrier: "MSC",
    bookingRef: "MSCU9022341",
    vesselSchedule: "MSC Fantasia — Sailing Mar 16",
    containerType: "20' STD",
    origin: "Shenzhen, CN",
    destination: "Chicago, US",
    plant: "ORD Warehouse Hub",
    bookingStatus: "Docs Uploaded" as BookingStatus,
    requestedDate: "Mar 12, 2025 22:00",
    targetShipDate: "Mar 16, 2025",
    severity: "Low" as Severity,
    exceptionType: "None" as BookingExceptionType,
    approvalType: "None" as ApprovalType,
    lane: "SZX→ORD",
    sapOrderRef: "SAP-TM-44810",
    agentSummary: "MSC booking confirmed, documents uploaded. Awaiting final tracking status update. Vessel sailing Mar 16.",
    workflowSteps: makeWorkflowSteps(6).map((s) => ({ ...s, status: s.step <= 5 ? "completed" as const : s.step === 6 ? "active" as const : "pending" as const, timestamp: s.step <= 5 ? `Mar 12, ${String(22 + Math.floor(s.step * 0.1)).padStart(2, "0")}:${String(s.step * 5).padStart(2, "0")}` : undefined })),
    carrierOptions: CARRIER_OPTIONS_SZX_ORD,
    reasonChips: [{ label: "Docs Uploaded", type: "document" as const }, { label: "On Track", type: "booking" as const }],
    timeline: [
      { timestamp: "Mar 12 22:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
      { timestamp: "Mar 12 22:10", event: "MSC selected — $3,200, 18d transit", location: "AI Engine", source: "Agent" as SignalSource, status: "agent" },
      { timestamp: "Mar 12 22:20", event: "Booking confirmed — MSCU9022341", location: "MSC Portal", source: "MSC Portal" as SignalSource, status: "ok" },
      { timestamp: "Mar 12 22:25", event: "Documents uploaded — SLI, packing list", location: "Document System", source: "Document System" as SignalSource, status: "ok" },
    ],
    sources: [
      { source: "SAP TM" as SignalSource, status: "Booking Confirmed", timestamp: "Mar 12 22:20", freshness: "10h ago", aligned: true, fresh: true },
      { source: "MSC Portal" as SignalSource, status: "Confirmed — MSCU9022341", timestamp: "Mar 12 22:20", freshness: "10h ago", aligned: true, fresh: true },
    ],
    currentStatus: "Documents Uploaded — Awaiting Confirmation",
    recommendedAction: "Monitor — docs uploaded, tracking pending",
    notificationStatus: "Not Yet Sent",
    otmStatus: "Pending Update",
    etaConfidence: 88,
    delayHours: 0,
    trackingRef: "MSCU9022341",
    plannedETA: "Mar 16, 2025",
    revisedETA: "Mar 16, 2025",
    lastSignal: "10h ago",
    lastSignalSource: "MSC Portal" as SignalSource,
    lat: 22.54,
    lng: 114.06,
  },
  {
    id: "BKG-92410",
    mode: "Ocean" as TransportMode,
    carrier: "CMA-CGM",
    bookingRef: undefined,
    containerType: "40' HC",
    origin: "Mumbai, IN",
    destination: "Los Angeles, US",
    plant: "LAX Distribution Center",
    bookingStatus: "Confirmed" as BookingStatus,
    requestedDate: "Mar 13, 2025 04:00",
    targetShipDate: "Mar 19, 2025",
    severity: "Low" as Severity,
    exceptionType: "None" as BookingExceptionType,
    approvalType: "None" as ApprovalType,
    lane: "BOM→LAX",
    sapOrderRef: "SAP-TM-44870",
    agentSummary: "CMA-CGM portal login failed — API credentials expired. Agent attempted RPA fallback but portal session expired mid-form. Credential refresh required before booking can proceed.",
    workflowSteps: makeWorkflowSteps(3, 3).map((s) => ({
      ...s,
      status: s.step < 3 ? "completed" as const : s.step === 3 ? "failed" as const : "pending" as const,
      timestamp: s.step <= 3 ? `Mar 13, 04:0${s.step * 2}` : undefined,
      detail: s.step === 3 ? "FAILED: CMA-CGM API credentials expired" : s.detail,
    })),
    carrierOptions: CARRIER_OPTIONS_BOM_LAX,
    reasonChips: [{ label: "Creds Expired", type: "portal" as const }, { label: "Login Failed", type: "portal" as const }],
    timeline: [
      { timestamp: "Mar 13 04:00", event: "Shipment requirement ingested from SAP TM", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
      { timestamp: "Mar 13 04:04", event: "CMA-CGM selected — best rate for BOM→LAX", location: "AI Engine", source: "Agent" as SignalSource, status: "agent" },
      { timestamp: "Mar 13 04:06", event: "EXCEPTION: CMA-CGM API credentials expired", location: "CMA-CGM Portal", source: "API Gateway" as SignalSource, status: "critical", anomaly: "API credentials expired — last renewed 90 days ago" },
    ],
    sources: [
      { source: "SAP TM" as SignalSource, status: "Exception", timestamp: "Mar 13 04:06", freshness: "4h ago", aligned: true, fresh: false },
    ],
    currentStatus: "Exception — Credentials Expired",
    recommendedAction: "Renew CMA-CGM API credentials or switch carrier",
    notificationStatus: "Escalated",
    otmStatus: "Needs Review",
    etaConfidence: 30,
    delayHours: 0,
    trackingRef: "—",
    plannedETA: "Mar 19, 2025",
    revisedETA: "TBD",
    lastSignal: "4h ago",
    lastSignalSource: "API Gateway" as SignalSource,
    lat: 19.08,
    lng: 72.88,
  },
  {
    id: "BKG-93001",
    mode: "Road" as TransportMode,
    carrier: "XPO Logistics",
    bookingRef: "XPO-2025-08821",
    containerType: "53' Dry Van",
    origin: "Memphis, US",
    destination: "Chicago, US",
    plant: "ORD Warehouse Hub",
    bookingStatus: "Notified" as BookingStatus,
    requestedDate: "Mar 10, 2025 15:00",
    targetShipDate: "Mar 11, 2025",
    confirmedShipDate: "Mar 11, 2025",
    severity: "Low" as Severity,
    exceptionType: "None" as BookingExceptionType,
    approvalType: "None" as ApprovalType,
    lane: "MEM→ORD",
    sapOrderRef: "SAP-TM-44760",
    agentSummary: "Booking completed and all stakeholders notified. XPO Logistics selected for best availability. Delivered on schedule.",
    workflowSteps: makeWorkflowSteps(8).map((s) => ({ ...s, status: "completed" as const, timestamp: `Mar 10, 1${5 + Math.floor(s.step * 0.1)}:${String(s.step * 3).padStart(2, "0")}` })),
    carrierOptions: CARRIER_OPTIONS_MEM_ORD,
    reasonChips: [{ label: "Auto-Booked", type: "booking" as const }, { label: "Delivered", type: "booking" as const }],
    timeline: [
      { timestamp: "Mar 10 15:00", event: "Shipment requirement ingested", location: "SAP TM", source: "SAP TM" as SignalSource, status: "ok" },
      { timestamp: "Mar 10 15:05", event: "XPO Logistics selected — $900, 1d transit", location: "AI Engine", source: "Agent" as SignalSource, status: "agent" },
      { timestamp: "Mar 10 15:10", event: "Booking confirmed — XPO-2025-08821", location: "XPO Portal", source: "API Gateway" as SignalSource, status: "ok" },
      { timestamp: "Mar 10 15:15", event: "Plant team notified, SAP TM synced", location: "SAP TM", source: "Email" as SignalSource, status: "ok" },
    ],
    sources: [
      { source: "SAP TM" as SignalSource, status: "Complete", timestamp: "Mar 10 15:15", freshness: "3d ago", aligned: true, fresh: true },
    ],
    currentStatus: "Booking Complete — Delivered",
    recommendedAction: "No action required",
    notificationStatus: "Sent",
    otmStatus: "Synced",
    etaConfidence: 100,
    delayHours: 0,
    trackingRef: "XPO-2025-08821",
    plannedETA: "Mar 11, 2025",
    revisedETA: "Mar 11, 2025",
    lastSignal: "3d ago",
    lastSignalSource: "API Gateway" as SignalSource,
    lat: 35.15,
    lng: -90.05,
  },
]

// Backward compat alias
export const SHIPMENTS = BOOKING_REQUESTS

// ── Agent Activities ─────────────────────────────────────────────────────

export type AgentActionType =
  | "ingested"
  | "carrier_eval"
  | "portal_login"
  | "booking_submit"
  | "doc_upload"
  | "confirmed"
  | "notified"
  | "flagged"
  | "recommended"

export interface AgentActivity {
  id: string
  timestamp: string
  actionType: AgentActionType
  description: string
  shipmentId?: string
  lane?: string
}

export const AGENT_ACTIVITIES: AgentActivity[] = [
  { id: "AA-013", timestamp: "Mar 13, 08:07", actionType: "flagged", description: "Portal exception — CMA-CGM eBusiness unreachable after 3 API retries + RPA fallback. Recommending carrier switch for BKG-60441.", shipmentId: "BKG-60441", lane: "MEM→ORD" },
  { id: "AA-014", timestamp: "Mar 13, 05:02", actionType: "flagged", description: "Validation failed — 3 mandatory fields missing (cargo_weight, commodity_code, ready_date) for BKG-88442. Booking blocked.", shipmentId: "BKG-88442", lane: "HKG→RTM" },
  { id: "AA-001", timestamp: "Mar 13, 08:01", actionType: "ingested", description: "Ingested shipment requirement from SAP TM — BKG-60441 (MEM→ORD, Road, 53' Dry Van)", shipmentId: "BKG-60441", lane: "MEM→ORD" },
  { id: "AA-002", timestamp: "Mar 13, 07:42", actionType: "booking_submit", description: "Completing booking form on MSC portal — BKG-20334 (40' STD, MSC Gulsun sailing Mar 18)", shipmentId: "BKG-20334", lane: "SZX→ORD" },
  { id: "AA-003", timestamp: "Mar 13, 06:04", actionType: "flagged", description: "Carrier override approval requested — Hapag-Lloyd vs DHL Freight preference on YYZ→DTW", shipmentId: "BKG-40672", lane: "YYZ→DTW" },
  { id: "AA-004", timestamp: "Mar 13, 05:24", actionType: "doc_upload", description: "Documents uploaded for BKG-88442 — SLI, certificate of origin sent to Hapag-Lloyd portal", shipmentId: "BKG-88442", lane: "HKG→RTM" },
  { id: "AA-005", timestamp: "Mar 13, 05:04", actionType: "carrier_eval", description: "Carrier evaluation: Hapag-Lloyd selected for HKG→RTM — $2,950, 91% SLA, available capacity", shipmentId: "BKG-88442", lane: "HKG→RTM" },
  { id: "AA-006", timestamp: "Mar 12, 16:08", actionType: "flagged", description: "Rate mismatch flagged — CMA-CGM spot $3,800 vs contract $3,200 (+19%) on BOM→LAX", shipmentId: "BKG-70991", lane: "BOM→LAX" },
  { id: "AA-007", timestamp: "Mar 12, 14:33", actionType: "flagged", description: "Exception: All 4 carriers at full capacity on BOM→RTM — spot market check recommended", shipmentId: "BKG-30188", lane: "BOM→RTM" },
  { id: "AA-008", timestamp: "Mar 12, 09:23", actionType: "notified", description: "Plant team & SAP TM updated — BKG-10421 confirmed (Maersk MAEU2450891, sailing Mar 15)", shipmentId: "BKG-10421", lane: "SHA→LAX" },
  { id: "AA-009", timestamp: "Mar 12, 09:18", actionType: "confirmed", description: "Booking confirmed — Maersk ref MAEU2450891 for SHA→LAX, 40' HC", shipmentId: "BKG-10421", lane: "SHA→LAX" },
  { id: "AA-010", timestamp: "Mar 12, 09:05", actionType: "carrier_eval", description: "Carrier evaluation: Maersk selected for SHA→LAX — $2,850, 92% SLA, best rate-to-SLA ratio", shipmentId: "BKG-10421", lane: "SHA→LAX" },
  { id: "AA-011", timestamp: "Mar 11, 14:33", actionType: "recommended", description: "Re-routing recommended — Maersk rejected BKG-50219, MSC next sailing Mar 20 (+4d)", shipmentId: "BKG-50219", lane: "MAA→IAH" },
  { id: "AA-012", timestamp: "Mar 11, 11:10", actionType: "portal_login", description: "RPA logged into Maersk booking portal for BKG-50219 (MAA→IAH)", shipmentId: "BKG-50219", lane: "MAA→IAH" },
  { id: "AA-015", timestamp: "Mar 13, 07:24", actionType: "booking_submit", description: "Completing booking form on DHL portal — BKG-91587 (Flatbed, YYZ→DTW, priority standard)", shipmentId: "BKG-91587", lane: "YYZ→DTW" },
  { id: "AA-016", timestamp: "Mar 13, 04:06", actionType: "flagged", description: "Credential exception — CMA-CGM API token expired. Booking BKG-92410 (BOM→LAX) blocked at portal login.", shipmentId: "BKG-92410", lane: "BOM→LAX" },
  { id: "AA-017", timestamp: "Mar 12, 22:25", actionType: "doc_upload", description: "Documents uploaded for BKG-92015 — SLI + packing list sent to MSC portal (SZX→ORD)", shipmentId: "BKG-92015", lane: "SZX→ORD" },
  { id: "AA-018", timestamp: "Mar 11, 06:08", actionType: "confirmed", description: "Zero-touch booking complete — FedEx Freight BKG-91003 confirmed in 8 min (MEM→ORD, $820)", shipmentId: "BKG-91003", lane: "MEM→ORD" },
  { id: "AA-019", timestamp: "Mar 10, 15:15", actionType: "notified", description: "All stakeholders notified — BKG-93001 delivered on schedule (XPO Logistics, MEM→ORD)", shipmentId: "BKG-93001", lane: "MEM→ORD" },
  { id: "AA-020", timestamp: "Mar 10, 11:31", actionType: "confirmed", description: "Recurring booking confirmed — Maersk MAEU2451102 for SHA→LAX (40' HC, sailing Mar 14)", shipmentId: "BKG-91204", lane: "SHA→LAX" },
]

// ── Booking Exception Distribution ───────────────────────────────────────

export const EXCEPTION_DISTRIBUTION = [
  { type: "Portal Unavailable", count: 1, color: "#0000B3" },
  { type: "Missing Allocation", count: 1, color: "#F59E0B" },
  { type: "Rate Mismatch", count: 1, color: "#3333E0" },
  { type: "Carrier Rejection", count: 1, color: "#EF4444" },
  { type: "Missing Booking Fields", count: 1, color: "#6666F5" },
]

// ── Booking Pipeline Stages (replaces CORRIDORS) ─────────────────────────

export const CORRIDORS = [
  {
    label: "Pending / Queued",
    shipments: BOOKING_REQUESTS.filter((b) => b.bookingStatus === "Pending"),
    color: "blue",
    metric: "Awaiting agent processing",
  },
  {
    label: "In Progress",
    shipments: BOOKING_REQUESTS.filter((b) => b.bookingStatus === "In Progress" || b.bookingStatus === "Confirmed" || b.bookingStatus === "Notified"),
    color: "green",
    metric: "Agent executing / completed",
  },
  {
    label: "Exceptions / Approvals",
    shipments: BOOKING_REQUESTS.filter((b) => b.bookingStatus === "Exception" || b.bookingStatus === "Awaiting Approval"),
    color: "amber",
    metric: "Needs human input",
  },
]

// ── Carrier Scorecards ───────────────────────────────────────────────────

export interface CarrierScorecard {
  carrier: string
  modes: TransportMode[]
  contractRate: string
  spotRate: string
  avgTransitDays: number
  capacity: "Available" | "Limited" | "Full"
  slaScore: number
  bookingSuccessRate: number
  laneCoverage: number
  rating: "Preferred" | "Standard" | "Monitor"
  trend: "up" | "down" | "stable"
  otpHistory: number[]
}

// ── Carrier Contracts ──────────────────────────────────────────────────────

export type ContractStatus = "Active" | "Expiring Soon" | "Expired" | "Under Review"

export interface ContractLane {
  lane: string
  mode: TransportMode
  contractRate: number
  currentSpotRate: number
  volumeCommitted: number   // TEU
  volumeUsed: number        // TEU
}

export interface CarrierContract {
  id: string
  carrier: string
  status: ContractStatus
  effectiveDate: string
  expiryDate: string
  totalVolumeCommitted: number  // TEU
  totalVolumeUsed: number       // TEU
  lanes: ContractLane[]
  renegotiationFlag: boolean
  aiRecommendation: string
}

export const CONTRACT_DATA: CarrierContract[] = [
  {
    id: "CTR-2024-001", carrier: "Maersk", status: "Active",
    effectiveDate: "Jan 1, 2024", expiryDate: "Dec 31, 2025",
    totalVolumeCommitted: 12000, totalVolumeUsed: 8160,
    lanes: [
      { lane: "SHA → LAX", mode: "Ocean", contractRate: 2800, currentSpotRate: 2850, volumeCommitted: 4000, volumeUsed: 2720 },
      { lane: "SHA → ORD", mode: "Ocean", contractRate: 3200, currentSpotRate: 3100, volumeCommitted: 3000, volumeUsed: 2040 },
      { lane: "HKG → RTM", mode: "Ocean", contractRate: 2600, currentSpotRate: 2750, volumeCommitted: 5000, volumeUsed: 3400 },
    ],
    renegotiationFlag: false,
    aiRecommendation: "Contract performing well. SHA→ORD spot rate 3% below contract — consider spot booking for non-committed volume.",
  },
  {
    id: "CTR-2024-002", carrier: "MSC", status: "Active",
    effectiveDate: "Mar 1, 2024", expiryDate: "Feb 28, 2026",
    totalVolumeCommitted: 8000, totalVolumeUsed: 7280,
    lanes: [
      { lane: "SZX → ORD", mode: "Ocean", contractRate: 3150, currentSpotRate: 3400, volumeCommitted: 4000, volumeUsed: 3640 },
      { lane: "SHA → LAX", mode: "Ocean", contractRate: 2900, currentSpotRate: 2850, volumeCommitted: 4000, volumeUsed: 3640 },
    ],
    renegotiationFlag: true,
    aiRecommendation: "Volume utilization at 91% — approaching cap. Recommend initiating volume extension negotiation before Q4 peak season.",
  },
  {
    id: "CTR-2023-003", carrier: "Hapag-Lloyd", status: "Expiring Soon",
    effectiveDate: "Jun 1, 2023", expiryDate: "May 15, 2025",
    totalVolumeCommitted: 6000, totalVolumeUsed: 5220,
    lanes: [
      { lane: "HKG → RTM", mode: "Ocean", contractRate: 2500, currentSpotRate: 2750, volumeCommitted: 3500, volumeUsed: 3045 },
      { lane: "BOM → RTM", mode: "Ocean", contractRate: 1800, currentSpotRate: 1950, volumeCommitted: 2500, volumeUsed: 2175 },
    ],
    renegotiationFlag: true,
    aiRecommendation: "Contract expires in 45 days. Current spot rates 8-10% above contract. Strong position for renewal — recommend locking 2-year term at current rates.",
  },
  {
    id: "CTR-2024-004", carrier: "CMA-CGM", status: "Under Review",
    effectiveDate: "Apr 1, 2024", expiryDate: "Mar 31, 2026",
    totalVolumeCommitted: 10000, totalVolumeUsed: 4200,
    lanes: [
      { lane: "SHA → LAX", mode: "Ocean", contractRate: 2750, currentSpotRate: 2850, volumeCommitted: 5000, volumeUsed: 2100 },
      { lane: "MEM → ORD", mode: "Road", contractRate: 850, currentSpotRate: 920, volumeCommitted: 5000, volumeUsed: 2100 },
    ],
    renegotiationFlag: true,
    aiRecommendation: "Volume utilization only 42%. Consider renegotiating minimum commitment downward or redistributing to higher-demand lanes.",
  },
  {
    id: "CTR-2024-005", carrier: "FedEx Freight", status: "Active",
    effectiveDate: "Jan 15, 2024", expiryDate: "Jan 14, 2026",
    totalVolumeCommitted: 5000, totalVolumeUsed: 3300,
    lanes: [
      { lane: "MEM → ORD", mode: "Road", contractRate: 780, currentSpotRate: 850, volumeCommitted: 2500, volumeUsed: 1650 },
      { lane: "YYZ → DTW", mode: "Road", contractRate: 620, currentSpotRate: 680, volumeCommitted: 2500, volumeUsed: 1650 },
    ],
    renegotiationFlag: false,
    aiRecommendation: "Contract on track. Utilization at 66%. Rates competitive vs spot market. No action needed.",
  },
  {
    id: "CTR-2023-006", carrier: "DHL Freight", status: "Expired",
    effectiveDate: "Jan 1, 2023", expiryDate: "Dec 31, 2024",
    totalVolumeCommitted: 4000, totalVolumeUsed: 3880,
    lanes: [
      { lane: "MEM → ORD", mode: "Road", contractRate: 800, currentSpotRate: 920, volumeCommitted: 2000, volumeUsed: 1940 },
      { lane: "YYZ → DTW", mode: "Road", contractRate: 650, currentSpotRate: 680, volumeCommitted: 2000, volumeUsed: 1940 },
    ],
    renegotiationFlag: true,
    aiRecommendation: "Contract expired. DHL rates were competitive — spot now 9-15% higher. Recommend renewal with 5% volume increase to lock in better terms.",
  },
]

export interface ContractComplianceRule {
  id: string
  label: string
  description: string
  category: "selection" | "volume" | "expiry" | "compliance"
  enabled: boolean
  triggerCount30d: number
}

export const CONTRACT_COMPLIANCE_RULES: ContractComplianceRule[] = [
  { id: "CCR-01", label: "Prefer contracted carrier", description: "Select contracted carrier for committed lanes unless spot rate is >15% lower than contract rate", category: "selection", enabled: true, triggerCount30d: 142 },
  { id: "CCR-02", label: "Volume utilization alert", description: "Alert procurement team when carrier volume commitment utilization exceeds 90%", category: "volume", enabled: true, triggerCount30d: 3 },
  { id: "CCR-03", label: "Contract expiry escalation", description: "Auto-escalate to procurement when carrier contract expires within 30 days", category: "expiry", enabled: true, triggerCount30d: 1 },
  { id: "CCR-04", label: "Block non-contracted carriers", description: "Prevent booking with non-contracted carriers on lanes with active volume commitments", category: "compliance", enabled: false, triggerCount30d: 0 },
]

export const CARRIER_SCORECARDS: CarrierScorecard[] = [
  { carrier: "Maersk", modes: ["Ocean"], contractRate: "$2,800–3,400", spotRate: "$2,850–3,500", avgTransitDays: 17, capacity: "Available", slaScore: 92, bookingSuccessRate: 96, laneCoverage: 85, rating: "Preferred", trend: "stable", otpHistory: [94, 93, 95, 92, 94, 96] },
  { carrier: "MSC", modes: ["Ocean"], contractRate: "$2,100–3,150", spotRate: "$2,100–3,200", avgTransitDays: 20, capacity: "Available", slaScore: 87, bookingSuccessRate: 91, laneCoverage: 80, rating: "Standard", trend: "up", otpHistory: [85, 87, 86, 89, 91, 91] },
  { carrier: "Hapag-Lloyd", modes: ["Ocean", "Road"], contractRate: "$1,700–2,900", spotRate: "$1,650–2,950", avgTransitDays: 18, capacity: "Available", slaScore: 89, bookingSuccessRate: 93, laneCoverage: 72, rating: "Preferred", trend: "up", otpHistory: [86, 88, 89, 90, 91, 93] },
  { carrier: "CMA-CGM", modes: ["Ocean"], contractRate: "$2,400–3,400", spotRate: "$2,450–3,800", avgTransitDays: 19, capacity: "Limited", slaScore: 88, bookingSuccessRate: 89, laneCoverage: 78, rating: "Standard", trend: "down", otpHistory: [91, 90, 88, 87, 89, 86] },
  { carrier: "FedEx Freight", modes: ["Road", "Air"], contractRate: "$800–1,200", spotRate: "$850–1,300", avgTransitDays: 2, capacity: "Available", slaScore: 96, bookingSuccessRate: 98, laneCoverage: 45, rating: "Preferred", trend: "stable", otpHistory: [97, 96, 97, 96, 98, 97] },
  { carrier: "XPO Logistics", modes: ["Road"], contractRate: "$850–1,900", spotRate: "$920–2,000", avgTransitDays: 2, capacity: "Available", slaScore: 91, bookingSuccessRate: 94, laneCoverage: 38, rating: "Standard", trend: "stable", otpHistory: [92, 91, 93, 90, 94, 93] },
  { carrier: "DHL Freight", modes: ["Road", "Air"], contractRate: "$1,100–1,800", spotRate: "$1,200–1,900", avgTransitDays: 2, capacity: "Available", slaScore: 94, bookingSuccessRate: 96, laneCoverage: 55, rating: "Preferred", trend: "stable", otpHistory: [95, 94, 95, 93, 96, 94] },
]

// ── Inbox Emails ─────────────────────────────────────────────────────────

export type EmailTag = "sap" | "carrier" | "booking" | "rejection" | "rate" | "agent"

export interface InboxEmail {
  id: string
  from: string
  fromName: string
  subject: string
  body: string
  timestamp: string
  read: boolean
  tag: EmailTag
  tags: EmailTag[]
  shipmentId?: string
  shipmentRef?: string
  scenarioId?: string
  attachments?: string[]
}

// Helper to derive fromName from email
function emailName(email: string) {
  return email.split("@")[0].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export const DEMO_TRIGGER_EMAILS: InboxEmail[] = [
  {
    id: "DEMO-TRIG-HP", from: "li.wei@suzhou-plant.com", fromName: "Li Wei (Suzhou Plant)",
    subject: "Booking Request — 240 cartons electronics to LAX, ship by Mar 23",
    body: "Hi Booking Team,\n\nWe need to arrange ocean freight for our next shipment from Suzhou Plant.\n\nShipment Details:\n  PO Reference: SR-87234\n  Origin: Shanghai (SHA) — Suzhou Plant\n  Destination: Los Angeles (LAX)\n  Cargo: Electronics — Consumer Goods (240 cartons)\n  Equipment: 2×40' HC\n  Target Ship Date: Mar 23, 2025\n  Incoterms: FOB Shanghai\n  Weight: 18,400 kg gross\n\nPlease book with our contracted carrier and confirm vessel allocation. The production team needs delivery confirmation by end of week.\n\nThanks,\nLi Wei\nExport Manager, Suzhou Plant\n+86 512 6688 7799",
    timestamp: "Today, 09:15", read: false, tag: "booking", tags: ["booking"],
    scenarioId: "happy-path", attachments: ["Shipment_Requirement_SR-87234.pdf"],
  },
  {
    id: "DEMO-TRIG-CR", from: "r.patel@houston-hub.com", fromName: "Rajesh Patel (Houston Hub)",
    subject: "Urgent: Need MAA → IAH shipment rebooked — vessel rejected",
    body: "Hi Team,\n\nOur Chennai → Houston booking just got rejected by Maersk. The production line at IAH depends on this cargo.\n\nOriginal Booking:\n  Booking Ref: MAEU-2024-SHA-78432\n  Route: Chennai (MAA) → Houston (IAH)\n  Equipment: 40' HC\n  Original Vessel: AE-1234 (sailing Mar 22)\n  Rejection Reason: Equipment type not available on this vessel\n\nThis is time-critical — the IAH Petrochem Hub production impact is estimated at $45K/day if delayed. Please rebook on an alternative carrier ASAP.\n\nRegards,\nRajesh Patel\nSupply Chain Manager, Houston Hub",
    timestamp: "Today, 08:42", read: false, tag: "booking", tags: ["booking"],
    scenarioId: "carrier-rejection", attachments: ["Rejection_Notice_MAEU-2024-SHA-78432.pdf"],
  },
  {
    id: "DEMO-TRIG-NC", from: "m.van.berg@rotterdam-dc.com", fromName: "Martin van Berg (Rotterdam DC)",
    subject: "Booking Request — Chemicals BOM → RTM, need allocation urgently",
    body: "Dear Booking Team,\n\nWe need to move a chemical shipment from Mumbai to Rotterdam. Our warehouse is running low on inventory.\n\nShipment Details:\n  Route: Mumbai (BOM) → Rotterdam (RTM)\n  Cargo: Industrial chemicals — 20' STD container\n  Target Ship Date: Mar 17, 2025\n  Priority: High — Rotterdam DC inventory below safety stock\n\nI understand capacity on this lane has been tight recently. Please check all contracted carriers and let me know what options we have, even if it means transshipment routing.\n\nBest regards,\nMartin van Berg\nWarehouse Manager, Rotterdam DC",
    timestamp: "Today, 08:30", read: false, tag: "booking", tags: ["booking"],
    scenarioId: "no-capacity", attachments: ["Capacity_Report_BOM-RTM_Mar2025.pdf"],
  },
  {
    id: "DEMO-TRIG-PF", from: "j.martinez@memphis-ops.com", fromName: "Jennifer Martinez (Memphis Ops)",
    subject: "Booking Request — Domestic MEM → ORD, 53' Dry Van needed",
    body: "Hi Team,\n\nPlease arrange a domestic road shipment from our Memphis facility to Chicago.\n\nShipment Details:\n  Route: Memphis (MEM) → Chicago (ORD)\n  Mode: Road — 53' Dry Van\n  Cargo: Consumer electronics, palletized\n  Target Pickup: Mar 15, 2025\n  Preferred Carrier: CMA-CGM (per our contract)\n\nThis is a standard weekly shipment. Please book through the carrier portal as usual.\n\nThanks,\nJennifer Martinez\nOperations Coordinator, Memphis Facility",
    timestamp: "Today, 08:15", read: false, tag: "booking", tags: ["booking"],
    scenarioId: "portal-failure", attachments: ["Shipment_Requirement_MEM-ORD.pdf"],
  },
  {
    id: "DEMO-TRIG-RM", from: "s.chen@procurement.co", fromName: "Sarah Chen (Procurement)",
    subject: "Booking Request — SHA → LAX ocean freight, 2×40' HC",
    body: "Hi Booking Team,\n\nPlease arrange ocean freight from Shanghai to Los Angeles for our Q1 electronics shipment.\n\nShipment Details:\n  Route: Shanghai (SHA) → Los Angeles (LAX)\n  Equipment: 2×40' HC\n  Cargo: Laptop components and assemblies\n  Target Ship Date: Mar 19, 2025\n  Estimated Value: $284,000\n\nPlease use our Maersk contract (CTR-2024-001) if possible. Let me know the rate and vessel allocation.\n\nBest,\nSarah Chen\nSenior Procurement Manager",
    timestamp: "Today, 07:58", read: false, tag: "booking", tags: ["booking"],
    scenarioId: "rate-mismatch", attachments: ["Shipment_Requirement_SHA-LAX.pdf"],
  },
  {
    id: "DEMO-TRIG-MD", from: "k.wong@hongkong-plant.com", fromName: "Kevin Wong (Hong Kong Plant)",
    subject: "Booking Request — HKG → RTM, Hapag-Lloyd preferred",
    body: "Dear Team,\n\nWe have a shipment ready for booking from our Hong Kong facility to Rotterdam.\n\nShipment Details:\n  Route: Hong Kong (HKG) → Rotterdam (RTM)\n  Mode: Ocean\n  Preferred Carrier: Hapag-Lloyd (contract CTR-2023-003)\n  Container: 40' HC\n  Target Ship Date: Mar 17, 2025\n\nNote: I've attached the shipment requirement form but some fields may be incomplete — our new logistics coordinator is still getting up to speed. Please flag anything that's missing.\n\nRegards,\nKevin Wong\nPlant Manager, Hong Kong",
    timestamp: "Today, 07:45", read: false, tag: "booking", tags: ["booking"],
    scenarioId: "missing-data", attachments: ["Shipment_Requirement_HKG-RTM.pdf"],
  },
]

export const INBOX_EMAILS: InboxEmail[] = [
  {
    id: "EM-001",
    from: "sap-workflow@company.com",
    fromName: emailName("sap-workflow@company.com"),
    subject: "New Shipment Requirement — SAP-TM-44850 (MEM→ORD)",
    body: "A new shipment requirement has been created in SAP TM.\n\nOrder: SAP-TM-44850\nOrigin: Memphis, US\nDestination: Chicago, US\nMode: Road\nTarget Ship Date: Mar 15, 2025\nContainer: 53' Dry Van\nPriority: Standard\n\nPlease ensure booking is completed before target date.",
    timestamp: "Mar 13, 08:00",
    read: false,
    tag: "sap",
    tags: ["sap"],
    shipmentId: "BKG-60441",
    shipmentRef: "BKG-60441",
  },
  {
    id: "EM-002",
    from: "bookings@maersk.com",
    fromName: "Maersk Bookings",
    subject: "Booking Confirmation — MAEU2450891 (Shanghai → Los Angeles)",
    body: "Dear Customer,\n\nYour booking has been confirmed.\n\nBooking Ref: MAEU2450891\nVessel: Maersk Elba\nSailing: Mar 15, 2025\nOrigin: Shanghai, CN\nDestination: Los Angeles, US\nContainer: 40' HC\n\nPlease ensure cargo is available at terminal by Mar 14, 2025 12:00.",
    timestamp: "Mar 12, 09:18",
    read: true,
    tag: "carrier",
    tags: ["carrier", "booking"],
    shipmentId: "BKG-10421",
    shipmentRef: "BKG-10421",
  },
  {
    id: "EM-003",
    from: "bookings@maersk.com",
    fromName: "Maersk Bookings",
    subject: "Booking Request Declined — MAA→IAH (Vessel Full)",
    body: "Dear Customer,\n\nWe regret to inform you that your booking request for the following shipment has been declined due to vessel capacity constraints.\n\nRoute: Chennai → Houston\nRequested Sailing: Mar 16, 2025\nReason: Vessel fully allocated\n\nPlease consider our next available sailing on Mar 20, 2025 or contact our booking desk for alternatives.",
    timestamp: "Mar 11, 14:30",
    read: true,
    tag: "rejection",
    tags: ["carrier", "rejection"],
    shipmentId: "BKG-50219",
    shipmentRef: "BKG-50219",
  },
  {
    id: "EM-004",
    from: "rates@cmacgm.com",
    fromName: "CMA-CGM Rates",
    subject: "Rate Advisory — BOM→LAX Spot Rates Updated",
    body: "Dear Valued Customer,\n\nPlease note that spot rates for Mumbai → Los Angeles have been updated effective immediately.\n\n40' Reefer: $3,800 (prev: $3,400)\n40' HC: $3,200 (prev: $2,900)\n20' STD: $2,100 (prev: $1,900)\n\nThese rates are valid until Mar 20, 2025. Contract rates remain unchanged.\n\nFor booking inquiries, please contact your account manager.",
    timestamp: "Mar 12, 15:45",
    read: false,
    tag: "rate",
    tags: ["carrier", "rate"],
    shipmentId: "BKG-70991",
    shipmentRef: "BKG-70991",
  },
  {
    id: "EM-005",
    from: "sap-workflow@company.com",
    fromName: emailName("sap-workflow@company.com"),
    subject: "New Shipment Requirement — SAP-TM-44855 (HKG→RTM)",
    body: "A new shipment requirement has been created in SAP TM.\n\nOrder: SAP-TM-44855\nOrigin: Hong Kong, CN\nDestination: Rotterdam, NL\nMode: Ocean\nTarget Ship Date: Mar 17, 2025\nContainer: 40' HC\nPriority: Standard\n\nPlease ensure booking is completed before target date.",
    timestamp: "Mar 13, 05:00",
    read: true,
    tag: "sap",
    tags: ["sap"],
    shipmentId: "BKG-88442",
    shipmentRef: "BKG-88442",
  },
  {
    id: "EM-006",
    from: "agent-noreply@company.com",
    fromName: "Booking Agent",
    subject: "Agent Alert — Capacity Exception on BOM→RTM",
    body: "Zero Touch Booking Agent has flagged an exception:\n\nBooking: BKG-30188\nRoute: Mumbai → Rotterdam\nIssue: All 4 carriers (Maersk, MSC, Hapag-Lloyd, CMA-CGM) report full capacity for target sailing window.\n\nRecommended Actions:\n1. Check spot market for available capacity\n2. Consider Colombo transshipment routing\n3. Defer to next sailing window (Mar 24)\n\nPlease review in the Exception Workbench.",
    timestamp: "Mar 12, 14:10",
    read: false,
    tag: "agent",
    tags: ["agent"],
    shipmentId: "BKG-30188",
    shipmentRef: "BKG-30188",
  },
  {
    id: "EM-007",
    from: "edi-gateway@company.com",
    fromName: emailName("edi-gateway@company.com"),
    subject: "EDI 315 — Booking Status Update from Hapag-Lloyd",
    body: "EDI Transaction received:\n\nType: 315 (Booking Status)\nCarrier: Hapag-Lloyd\nBooking: BKG-88442\nStatus: Documents received, confirmation pending\nTimestamp: Mar 13 05:20 UTC\n\nThis is an automated message from the EDI gateway.",
    timestamp: "Mar 13, 05:20",
    read: true,
    tag: "carrier",
    tags: ["carrier", "booking"],
    shipmentId: "BKG-88442",
    shipmentRef: "BKG-88442",
  },
  {
    id: "EM-008",
    from: "planner@company.com",
    fromName: "Sarah Kim",
    subject: "RE: Urgent — IAH Production Needs MAA Shipment",
    body: "Team,\n\nThe IAH Petrochem Hub production line depends on the Chennai shipment (BKG-50219). The Maersk rejection puts us at risk of a 4-day delay.\n\nCan we authorize an expedited booking with MSC or explore air freight as a backup? Production impact estimated at $45K/day.\n\nPlease prioritize resolution.\n\nRegards,\nSarah Kim\nSupply Chain Planning",
    timestamp: "Mar 11, 16:00",
    read: true,
    tag: "booking",
    tags: ["booking"],
    shipmentId: "BKG-50219",
    shipmentRef: "BKG-50219",
  },
  {
    id: "EM-009",
    from: "sap-workflow@company.com",
    fromName: emailName("sap-workflow@company.com"),
    subject: "New Shipment Requirement — SAP-TM-44840 (YYZ→DTW)",
    body: "A new shipment requirement has been created in SAP TM.\n\nOrder: SAP-TM-44840\nOrigin: Toronto, CA\nDestination: Detroit, US\nMode: Road\nTarget Ship Date: Mar 14, 2025\nContainer: Flatbed\nPriority: Medium\n\nNote: Historical carrier preference — DHL Freight on this lane.",
    timestamp: "Mar 13, 06:00",
    read: true,
    tag: "sap",
    tags: ["sap"],
    shipmentId: "BKG-40672",
    shipmentRef: "BKG-40672",
  },
  {
    id: "EM-010",
    from: "agent-noreply@company.com",
    fromName: "Booking Agent",
    subject: "Booking Completed — BKG-10421 (SHA→LAX) — Zero Touch",
    body: "Zero Touch Booking Agent completed a booking autonomously:\n\nBooking: BKG-10421\nRoute: Shanghai → Los Angeles\nCarrier: Maersk\nRef: MAEU2450891\nVessel: Maersk Elba, Sailing Mar 15\nContainer: 40' HC\nRate: $2,850 (within contract)\n\nTotal time: 23 minutes (SAP ingestion to confirmation)\nHuman interventions: 0\n\nPlant team notified. SAP TM & OTM updated.",
    timestamp: "Mar 12, 09:25",
    read: true,
    tag: "agent",
    tags: ["agent", "booking"],
    shipmentId: "BKG-10421",
    shipmentRef: "BKG-10421",
  },
  {
    id: "EM-011",
    from: "msc-bookings@msc.com",
    fromName: "MSC Bookings",
    subject: "Booking Acknowledgment — SZX→ORD (Processing)",
    body: "Dear Customer,\n\nWe have received your booking request for the following:\n\nRoute: Shenzhen → Chicago (via transpacific service)\nVessel: MSC Gulsun\nSailing: Mar 18, 2025\nContainer: 40' STD\n\nYour booking is currently being processed. Confirmation will follow within 24 hours.\n\nMSC Booking Desk",
    timestamp: "Mar 13, 07:45",
    read: false,
    tag: "carrier",
    tags: ["carrier", "booking"],
    shipmentId: "BKG-20334",
    shipmentRef: "BKG-20334",
  },
  {
    id: "EM-012",
    from: "agent-noreply@company.com",
    fromName: "Booking Agent",
    subject: "Approval Required — Carrier Override (BKG-40672)",
    body: "Zero Touch Booking Agent requires your approval:\n\nBooking: BKG-40672\nRoute: Toronto → Detroit\nAI Selection: Hapag-Lloyd ($1,650 — below contract)\nHistorical Preference: DHL Freight ($1,800)\n\nReason for hold: Historical carrier preference differs from AI recommendation.\n\nPlease approve or override in the Booking Dashboard.",
    timestamp: "Mar 13, 06:05",
    read: false,
    tag: "agent",
    tags: ["agent"],
    shipmentId: "BKG-40672",
    shipmentRef: "BKG-40672",
  },
  {
    id: "EM-013",
    from: "agent-noreply@company.com",
    fromName: "Booking Agent",
    subject: "Portal Exception — CMA-CGM Unreachable (BKG-60441)",
    body: "Zero Touch Booking Agent has encountered a portal exception:\n\nBooking: BKG-60441\nRoute: Memphis → Chicago\nCarrier: CMA-CGM\n\nIssue: CMA-CGM eBusiness portal is unreachable.\n- API timeout after 3 attempts (30s each)\n- RPA fallback: portal login page unresponsive\n\nRecommended Actions:\n1. Switch to FedEx Freight ($850, 96% SLA)\n2. Contact IT for CMA-CGM portal investigation\n3. Retry after portal maintenance window\n\nPlease review in the Exception Workbench.",
    timestamp: "Mar 13, 08:08",
    read: false,
    tag: "agent",
    tags: ["agent"],
    shipmentId: "BKG-60441",
    shipmentRef: "BKG-60441",
  },
  {
    id: "EM-014",
    from: "agent-noreply@company.com",
    fromName: "Booking Agent",
    subject: "Data Exception — Missing Mandatory Fields (BKG-88442)",
    body: "Zero Touch Booking Agent has blocked a booking due to incomplete data:\n\nBooking: BKG-88442\nRoute: Hong Kong → Rotterdam\nCarrier: Hapag-Lloyd\n\nMissing mandatory fields:\n- Cargo Weight (kg)\n- HS Commodity Code\n- Cargo Ready Date\n\nBooking cannot proceed until these fields are populated.\n\nRecommended Actions:\n1. Pull data from SAP Master Data\n2. Contact shipment planner for manual entry\n3. Use Agent auto-fill with estimated values\n\nPlease complete the fields in the Exception Workbench.",
    timestamp: "Mar 13, 05:03",
    read: false,
    tag: "agent",
    tags: ["agent"],
    shipmentId: "BKG-88442",
    shipmentRef: "BKG-88442",
  },
]

// ── Booking Documents ────────────────────────────────────────────────────

export type DocumentStatus = "verified" | "received" | "pending" | "missing" | "na"

export interface BookingDocument {
  name: string
  status: DocumentStatus
  uploadDate?: string
  ref?: string
}

export interface BookingDocSet {
  bookingId: string
  carrier: string
  lane: string
  documents: BookingDocument[]
}

export const BOOKING_DOCUMENTS: BookingDocSet[] = [
  {
    bookingId: "BKG-10421",
    carrier: "Maersk",
    lane: "SHA→LAX",
    documents: [
      { name: "Booking Confirmation", status: "verified", uploadDate: "Mar 12", ref: "MAEU2450891" },
      { name: "Vessel Schedule", status: "verified", uploadDate: "Mar 12", ref: "Maersk Elba — Mar 15" },
      { name: "Container Allocation", status: "verified", uploadDate: "Mar 12", ref: "40' HC — MSKU1234567" },
      { name: "Shipper's Letter of Instruction", status: "verified", uploadDate: "Mar 12" },
      { name: "Packing List", status: "verified", uploadDate: "Mar 12" },
      { name: "Rate Sheet", status: "verified", uploadDate: "Mar 12", ref: "$2,850/40'HC" },
    ],
  },
  {
    bookingId: "BKG-20334",
    carrier: "MSC",
    lane: "SZX→ORD",
    documents: [
      { name: "Booking Confirmation", status: "pending" },
      { name: "Vessel Schedule", status: "received", uploadDate: "Mar 13", ref: "MSC Gulsun — Mar 18" },
      { name: "Container Allocation", status: "pending" },
      { name: "Shipper's Letter of Instruction", status: "received", uploadDate: "Mar 13" },
      { name: "Packing List", status: "pending" },
      { name: "Rate Sheet", status: "verified", uploadDate: "Mar 13", ref: "$3,200/40'STD" },
    ],
  },
  {
    bookingId: "BKG-30188",
    carrier: "—",
    lane: "BOM→RTM",
    documents: [
      { name: "Booking Confirmation", status: "missing" },
      { name: "Vessel Schedule", status: "missing" },
      { name: "Container Allocation", status: "missing" },
      { name: "Shipper's Letter of Instruction", status: "received", uploadDate: "Mar 12" },
      { name: "Packing List", status: "received", uploadDate: "Mar 12" },
      { name: "Rate Sheet", status: "na" },
    ],
  },
  {
    bookingId: "BKG-50219",
    carrier: "Maersk (Rejected)",
    lane: "MAA→IAH",
    documents: [
      { name: "Booking Confirmation", status: "missing" },
      { name: "Rejection Notice", status: "verified", uploadDate: "Mar 11", ref: "Vessel fully allocated" },
      { name: "Container Allocation", status: "missing" },
      { name: "Shipper's Letter of Instruction", status: "received", uploadDate: "Mar 11" },
      { name: "Packing List", status: "received", uploadDate: "Mar 11" },
      { name: "Rate Sheet", status: "verified", uploadDate: "Mar 11", ref: "$2,600/40'HC" },
    ],
  },
  {
    bookingId: "BKG-88442",
    carrier: "Hapag-Lloyd",
    lane: "HKG→RTM",
    documents: [
      { name: "Booking Confirmation", status: "pending" },
      { name: "Vessel Schedule", status: "received", uploadDate: "Mar 13", ref: "Hapag-Lloyd Express — Mar 17" },
      { name: "Container Allocation", status: "received", uploadDate: "Mar 13", ref: "40' HC" },
      { name: "Shipper's Letter of Instruction", status: "verified", uploadDate: "Mar 13" },
      { name: "Certificate of Origin", status: "verified", uploadDate: "Mar 13" },
      { name: "Rate Sheet", status: "verified", uploadDate: "Mar 13", ref: "$2,950/40'HC" },
    ],
  },
]

// ── Carrier Portal Status (replaces weather/port data) ───────────────────

export interface PortalStatus {
  portal: string
  carrier: string
  status: "Online" | "Degraded" | "Offline"
  apiAvailable: boolean
  rpaAvailable: boolean
  lastChecked: string
  credentialStatus: "Valid" | "Expiring Soon" | "Expired"
  uptime: number
  notes?: string
}

export const PORTAL_STATUSES: PortalStatus[] = [
  { portal: "Maersk Booking Portal", carrier: "Maersk", status: "Online", apiAvailable: true, rpaAvailable: true, lastChecked: "2m ago", credentialStatus: "Valid", uptime: 99.8 },
  { portal: "MSC Online Booking", carrier: "MSC", status: "Online", apiAvailable: true, rpaAvailable: true, lastChecked: "3m ago", credentialStatus: "Valid", uptime: 99.2 },
  { portal: "Hapag-Lloyd Portal", carrier: "Hapag-Lloyd", status: "Online", apiAvailable: true, rpaAvailable: true, lastChecked: "1m ago", credentialStatus: "Expiring Soon", uptime: 98.5, notes: "API credentials expire in 5 days — renewal initiated" },
  { portal: "CMA-CGM eBusiness", carrier: "CMA-CGM", status: "Degraded", apiAvailable: false, rpaAvailable: false, lastChecked: "2m ago", credentialStatus: "Valid", uptime: 94.2, notes: "Portal experiencing intermittent outages — API endpoints returning timeouts. Maintenance window expected." },
  { portal: "SAP TM Gateway", carrier: "SAP", status: "Online", apiAvailable: true, rpaAvailable: false, lastChecked: "1m ago", credentialStatus: "Valid", uptime: 99.9 },
  { portal: "OTM Integration", carrier: "OTM", status: "Online", apiAvailable: true, rpaAvailable: false, lastChecked: "1m ago", credentialStatus: "Valid", uptime: 99.7 },
]

// ── D&D Risk (repurposed as Pending Approval summary) ────────────────────

export interface DDRisk {
  shipmentId: string
  type: string
  status: "pending" | "approved" | "resolved"
  detail: string
  urgency: "High" | "Medium" | "Low"
}

export const DD_RISKS: DDRisk[] = [
  { shipmentId: "BKG-50219", type: "Booking Rejection", status: "pending", detail: "Maersk rejected — re-routing to MSC (+4d) or expedite", urgency: "High" },
  { shipmentId: "BKG-70991", type: "Spot Booking", status: "pending", detail: "CMA-CGM $3,800 vs contract $3,200 — planner approval", urgency: "High" },
]

// ── Reroute / Alternate Carrier Options ──────────────────────────────────

export interface RerouteOption {
  id: string
  carrier: string
  route: string
  transitDays: number
  rate: number
  savings: string
  available: boolean
  transportMode: TransportMode
  sla: number
  capacity: "Available" | "Limited" | "Full"
  recommended?: boolean
}

export const REROUTE_OPTIONS: Record<string, RerouteOption[]> = {
  "BKG-50219": [
    { id: "R1", carrier: "MSC", route: "MAA→IAH (direct)", transitDays: 27, rate: 2500, savings: "-4% vs contract", available: true, transportMode: "Ocean", sla: 87, capacity: "Available", recommended: true },
    { id: "R2", carrier: "CMA-CGM", route: "MAA→IAH via Colombo", transitDays: 30, rate: 2750, savings: "+8% vs contract", available: true, transportMode: "Ocean", sla: 85, capacity: "Available" },
    { id: "R3", carrier: "FedEx Express", route: "MAA→IAH (air expedite)", transitDays: 3, rate: 12500, savings: "Premium — $12.5K", available: true, transportMode: "Air", sla: 98, capacity: "Available" },
  ],
  "BKG-30188": [
    { id: "R4", carrier: "Spot Market", route: "BOM→RTM (spot vessel)", transitDays: 24, rate: 3200, savings: "+40% above contract", available: true, transportMode: "Ocean", sla: 82, capacity: "Limited" },
    { id: "R5", carrier: "Maersk", route: "BOM→CMB→RTM (transshipment)", transitDays: 28, rate: 2800, savings: "+27% above contract", available: true, transportMode: "Ocean", sla: 92, capacity: "Available", recommended: true },
    { id: "R6", carrier: "Defer", route: "BOM→RTM (next sailing Mar 24)", transitDays: 21, rate: 2200, savings: "On contract", available: true, transportMode: "Ocean", sla: 90, capacity: "Available" },
  ],
  "BKG-60441": [
    { id: "R7", carrier: "FedEx Freight", route: "MEM→ORD (direct)", transitDays: 1, rate: 850, savings: "-6% vs CMA-CGM quote", available: true, transportMode: "Road", sla: 96, capacity: "Available", recommended: true },
    { id: "R8", carrier: "XPO Logistics", route: "MEM→ORD (direct)", transitDays: 1, rate: 920, savings: "Same as CMA-CGM quote", available: true, transportMode: "Road", sla: 93, capacity: "Available" },
    { id: "R9", carrier: "J.B. Hunt", route: "MEM→ORD (direct)", transitDays: 1, rate: 880, savings: "-4% vs CMA-CGM quote", available: true, transportMode: "Road", sla: 91, capacity: "Limited" },
  ],
  "BKG-70991": [
    { id: "R10", carrier: "Maersk", route: "BOM→LAX (direct)", transitDays: 24, rate: 3500, savings: "+3% vs contract", available: true, transportMode: "Ocean", sla: 92, capacity: "Available", recommended: true },
    { id: "R11", carrier: "MSC", route: "BOM→LAX (via Singapore)", transitDays: 26, rate: 3600, savings: "+9% vs contract", available: false, transportMode: "Ocean", sla: 87, capacity: "Full" },
    { id: "R12", carrier: "Accept CMA-CGM Spot", route: "BOM→LAX (direct)", transitDays: 22, rate: 3800, savings: "+19% vs contract", available: true, transportMode: "Ocean", sla: 88, capacity: "Available" },
  ],
}

// ── Sent Emails ──────────────────────────────────────────────────────────

export interface SentEmailItem {
  id: string
  to: string
  subject: string
  body: string
  timestamp: string
  type: "plant" | "carrier" | "escalation" | "sap"
}

export const STATIC_SENT_EMAILS: SentEmailItem[] = [
  {
    id: "SE-001",
    to: "lax-dc-ops@company.com",
    subject: "Booking Confirmed — BKG-10421 (SHA→LAX, Maersk)",
    body: "Booking BKG-10421 has been confirmed.\n\nCarrier: Maersk\nVessel: Maersk Elba\nSailing: Mar 15, 2025\nContainer: 40' HC — MSKU1234567\nBooking Ref: MAEU2450891\n\nPlease ensure receiving dock is prepared.\n\nThis notification was sent by the Zero Touch Booking Agent.",
    timestamp: "Mar 12, 09:20",
    type: "plant",
  },
  {
    id: "SE-002",
    to: "sap-integration@company.com",
    subject: "SAP TM Update — BKG-10421 Booking Confirmed",
    body: "SAP TM order SAP-TM-44821 has been updated with booking confirmation.\n\nBooking Ref: MAEU2450891\nCarrier: Maersk\nSailing: Mar 15, 2025\nStatus: Confirmed\n\nOTM record updated simultaneously.",
    timestamp: "Mar 12, 09:23",
    type: "sap",
  },
  {
    id: "SE-003",
    to: "vp-ops@company.com",
    subject: "ESCALATION — BKG-50219 Carrier Rejection (MAA→IAH)",
    body: "Escalation: Maersk has rejected booking BKG-50219 (Chennai → Houston) due to vessel capacity.\n\nImpact: IAH Petrochem Hub production line — estimated $45K/day delay cost.\nFallback: MSC next sailing Mar 20 (+4 days) at $2,500\nExpedited: Air freight via FedEx at $12,500\n\nRouter approval required for alternate carrier selection.\n\nZero Touch Booking Agent",
    timestamp: "Mar 11, 14:35",
    type: "escalation",
  },
  {
    id: "SE-004",
    to: "bookings@maersk.com",
    subject: "Booking Inquiry — MAA→IAH Alternate Sailing",
    body: "Dear Maersk Booking Desk,\n\nFollowing the rejection of our booking for Chennai → Houston (ref: BKG-50219), we would like to inquire about:\n\n1. Next available sailing with capacity on MAA→IAH\n2. Any upcoming vessel additions on this route\n3. Alternative routing options (e.g., via Colombo)\n\nPlease advise at your earliest convenience.\n\nRegards,\nZero Touch Booking Agent\nOn behalf of Routing Team",
    timestamp: "Mar 11, 14:40",
    type: "carrier",
  },
]

// ── Lane Performance (for analytics) ─────────────────────────────────────

export interface LanePerformance {
  lane: string
  mode: TransportMode
  bookingsPerMonth: number
  avgTurnaroundHrs: number
  zeroTouchRate: number
  preferredCarrier: string
  contractRate: string
}

export const LANE_PERFORMANCE: LanePerformance[] = [
  { lane: "SHA→LAX", mode: "Ocean", bookingsPerMonth: 24, avgTurnaroundHrs: 0.4, zeroTouchRate: 92, preferredCarrier: "Maersk", contractRate: "$2,800" },
  { lane: "SZX→ORD", mode: "Ocean", bookingsPerMonth: 18, avgTurnaroundHrs: 0.5, zeroTouchRate: 88, preferredCarrier: "MSC", contractRate: "$3,150" },
  { lane: "BOM→RTM", mode: "Ocean", bookingsPerMonth: 12, avgTurnaroundHrs: 1.2, zeroTouchRate: 75, preferredCarrier: "Hapag-Lloyd", contractRate: "$2,300" },
  { lane: "HKG→RTM", mode: "Ocean", bookingsPerMonth: 15, avgTurnaroundHrs: 0.6, zeroTouchRate: 87, preferredCarrier: "Hapag-Lloyd", contractRate: "$2,900" },
  { lane: "BOM→LAX", mode: "Ocean", bookingsPerMonth: 8, avgTurnaroundHrs: 2.1, zeroTouchRate: 62, preferredCarrier: "Maersk", contractRate: "$3,400" },
  { lane: "MAA→IAH", mode: "Ocean", bookingsPerMonth: 10, avgTurnaroundHrs: 1.5, zeroTouchRate: 70, preferredCarrier: "Maersk", contractRate: "$2,550" },
  { lane: "MEM→ORD", mode: "Road", bookingsPerMonth: 30, avgTurnaroundHrs: 0.2, zeroTouchRate: 96, preferredCarrier: "FedEx Freight", contractRate: "$800" },
  { lane: "YYZ→DTW", mode: "Road", bookingsPerMonth: 20, avgTurnaroundHrs: 0.3, zeroTouchRate: 85, preferredCarrier: "DHL Freight", contractRate: "$1,750" },
]

// ── Carrier Policies (for exception workbench) ────────────────────────

export interface CarrierPolicy {
  carrier: string
  maxWeightKg: number
  equipmentTypes: string[]
  prohibitedCargo: string[]
  bookingCutoffHours: number
  specialNotes?: string
}

export const CARRIER_POLICIES: Record<string, CarrierPolicy> = {
  "Maersk": {
    carrier: "Maersk",
    maxWeightKg: 28000,
    equipmentTypes: ["20' STD", "40' STD", "40' HC", "40' Reefer", "45' HC"],
    prohibitedCargo: ["Lithium batteries (Class 9 restricted)", "Loose scrap metal", "Personal effects (non-commercial)"],
    bookingCutoffHours: 48,
    specialNotes: "VGM submission required 24h before vessel cutoff. Hazmat requires separate DG booking form.",
  },
  "MSC": {
    carrier: "MSC",
    maxWeightKg: 30480,
    equipmentTypes: ["20' STD", "40' STD", "40' HC", "40' Reefer", "Open Top"],
    prohibitedCargo: ["Weapons/ammunition", "Radioactive materials", "Unmarked chemicals"],
    bookingCutoffHours: 72,
    specialNotes: "Transhipment bookings require minimum 7-day advance notice. Late bookings incur 15% surcharge.",
  },
  "Hapag-Lloyd": {
    carrier: "Hapag-Lloyd",
    maxWeightKg: 32500,
    equipmentTypes: ["20' STD", "40' STD", "40' HC", "40' Reefer", "Flat Rack", "Open Top"],
    prohibitedCargo: ["Ivory products", "Counterfeit goods", "Sanctioned country cargo"],
    bookingCutoffHours: 48,
    specialNotes: "Quick Quotes available for spot bookings. Equipment guarantee available at premium rate.",
  },
  "CMA-CGM": {
    carrier: "CMA-CGM",
    maxWeightKg: 30000,
    equipmentTypes: ["20' STD", "40' STD", "40' HC", "40' Reefer"],
    prohibitedCargo: ["Asbestos", "Used tires (non-processed)", "E-waste without certification"],
    bookingCutoffHours: 48,
    specialNotes: "eSolutions API available for automated bookings. Reefer monitoring included for pharma grade containers.",
  },
  "FedEx Freight": {
    carrier: "FedEx Freight",
    maxWeightKg: 20000,
    equipmentTypes: ["53' Dry Van", "Flatbed", "LTL", "Temperature Controlled"],
    prohibitedCargo: ["Explosives", "Compressed gases (without DOT certification)", "Live animals"],
    bookingCutoffHours: 24,
    specialNotes: "Same-day pickup available for Priority Freight. Guaranteed delivery windows for Premium service.",
  },
}

// ── Backward-compat aliases used by various components ────────────────

export type DocStatus = DocumentStatus
export type CarrierRating = CarrierScorecard["rating"]
export type PerformanceTrend = CarrierScorecard["trend"]

// LANE_INSIGHTS used by lane-insight-banner.tsx
export const LANE_INSIGHTS = [
  { insight: "SHA→LAX lane has 92% zero-touch booking rate — highest in the portfolio. Maersk contract rate $2,800 is 3% below spot market." },
  { insight: "BOM→RTM lane experiencing allocation shortages. Recommend pre-booking 2 weeks ahead or diversifying to Hapag-Lloyd as backup." },
  { insight: "MEM→ORD domestic route achieving 96% zero-touch rate with FedEx Freight — ideal candidate for full autonomous mode." },
  { insight: "BOM→LAX lane has highest manual intervention rate (38%) due to frequent rate mismatches. Consider renegotiating CMA-CGM contract." },
]

// SHIPMENT_DOCUMENTS alias for components using old name
export const SHIPMENT_DOCUMENTS = BOOKING_DOCUMENTS.map((d) => ({
  shipmentId: d.bookingId,
  docs: d.documents.map((doc) => ({
    docType: doc.name,
    status: doc.status,
    source: d.carrier,
    receivedAt: doc.uploadDate,
    notes: doc.ref ?? "",
  })),
}))

// ── Dashboard & Analytics Charts ─────────────────────────────────────────

// Booking workflow funnel — shows how bookings flow through the agent pipeline
export const BOOKING_FUNNEL = [
  { stage: "Ingested", count: 8, color: "#3B82F6" },
  { stage: "Carrier Selected", count: 6, color: "#6366F1" },
  { stage: "Booking Submitted", count: 4, color: "#8B5CF6" },
  { stage: "Confirmed", count: 3, color: "#22C55E" },
  { stage: "Exception", count: 5, color: "#EF4444" },
]

// 7-day exception resolution trend
export const EXCEPTION_TREND = [
  { day: "Mon", raised: 3, resolved: 2 },
  { day: "Tue", raised: 1, resolved: 3 },
  { day: "Wed", raised: 4, resolved: 2 },
  { day: "Thu", raised: 2, resolved: 4 },
  { day: "Fri", raised: 1, resolved: 1 },
  { day: "Sat", raised: 0, resolved: 1 },
  { day: "Sun", raised: 2, resolved: 0 },
]

// Agent vs Human handling split
export const AGENT_HANDLING = [
  { name: "Zero-Touch (Agent)", value: 3, color: "#22C55E" },
  { name: "Human Override", value: 2, color: "#F59E0B" },
  { name: "Exception (Pending)", value: 3, color: "#EF4444" },
]

// SLA compliance per exception type (aligned to 5 requirement categories)
export const EXCEPTION_SLA = [
  { type: "Missing Allocation",  sla: 85, target: 90, color: "#F59E0B" },
  { type: "Portal/API Unavail.", sla: 92, target: 90, color: "#8B5CF6" },
  { type: "Rate Mismatch",       sla: 78, target: 90, color: "#EF4444" },
  { type: "Missing Fields",      sla: 95, target: 90, color: "#6366F1" },
  { type: "Carrier Rejection",   sla: 88, target: 90, color: "#DC2626" },
]

// ── Dashboard AI Insight Cards ──────────────────────────────────────────

// Critical exceptions needing human attention
export const CRITICAL_EXCEPTIONS = [
  { id: "BKG-50219", lane: "MAA→IAH", type: "Carrier Rejection", severity: "Critical" as Severity, carrier: "Maersk", summary: "Vessel capacity exceeded — reroute to alternate carrier or split shipment" },
  { id: "BKG-60441", lane: "MEM→ORD", type: "Portal Unavailable", severity: "High" as Severity, carrier: "CMA-CGM", summary: "API timeout after 3 retries — manual booking or fallback carrier needed" },
  { id: "BKG-70991", lane: "BOM→LAX", type: "Rate Mismatch", severity: "High" as Severity, carrier: "CMA-CGM", summary: "Spot rate 19% above contract — requires approval or rate negotiation" },
  { id: "BKG-30188", lane: "BOM→HAM", type: "Missing Allocation", severity: "High" as Severity, carrier: "Hapag-Lloyd", summary: "No capacity available on lane — 3 alternate routes identified, awaiting approval" },
  { id: "BKG-88442", lane: "BOM→FRA", type: "Missing Booking Fields", severity: "Medium" as Severity, carrier: "Maersk", summary: "3 mandatory fields missing from SAP export — booking blocked pending data correction" },
]

// Most frequently booked routes (rolling 30 days)
export const FREQUENT_ROUTES = [
  { lane: "MEM→ORD", mode: "Road" as TransportMode, bookings: 34, carrier: "FedEx Freight", zeroTouch: 96, avgCost: "$820" },
  { lane: "SHA→LAX", mode: "Ocean" as TransportMode, bookings: 28, carrier: "Maersk", zeroTouch: 92, avgCost: "$2,850" },
  { lane: "SZX→ORD", mode: "Ocean" as TransportMode, bookings: 22, carrier: "MSC", zeroTouch: 88, avgCost: "$3,200" },
  { lane: "YYZ→DTW", mode: "Road" as TransportMode, bookings: 20, carrier: "DHL Freight", zeroTouch: 85, avgCost: "$1,780" },
  { lane: "BOM→RTM", mode: "Ocean" as TransportMode, bookings: 15, carrier: "Hapag-Lloyd", zeroTouch: 78, avgCost: "$2,400" },
  { lane: "GRU→MIA", mode: "Air" as TransportMode, bookings: 18, carrier: "LATAM Cargo", zeroTouch: 72, avgCost: "$4,200" },
  { lane: "PVG→LAX", mode: "Ocean" as TransportMode, bookings: 16, carrier: "COSCO", zeroTouch: 85, avgCost: "$3,050" },
]

// AI-suggested upcoming bookings based on historical patterns
export const SUGGESTED_BOOKINGS = [
  { lane: "SHA→LAX", mode: "Ocean" as TransportMode, reason: "Weekly recurring — last booking Mar 6, next due Mar 13", carrier: "Maersk", estRate: "$2,800", confidence: 94 },
  { lane: "BOM→RTM", mode: "Ocean" as TransportMode, reason: "Bi-weekly pattern detected — allocation window closing in 48h", carrier: "Hapag-Lloyd", estRate: "$2,350", confidence: 87 },
  { lane: "SZX→ORD", mode: "Ocean" as TransportMode, reason: "Q1 volume spike predicted — pre-book to lock contract rate", carrier: "MSC", estRate: "$3,100", confidence: 82 },
  { lane: "MEM→ORD", mode: "Road" as TransportMode, reason: "Daily recurring — next window opens tomorrow 06:00 CST", carrier: "FedEx Freight", estRate: "$840", confidence: 98 },
  { lane: "YYZ→DTW", mode: "Road" as TransportMode, reason: "Monthly contract renewal — current booking expires Mar 20", carrier: "DHL Freight", estRate: "$1,750", confidence: 79 },
]

// Extended booking funnel with more granular stages
export const BOOKING_FUNNEL_EXTENDED = [
  { stage: "SAP Ingested", count: 14, color: "#0000B3" },
  { stage: "Validated", count: 13, color: "#1A1ACD" },
  { stage: "Carrier Selected", count: 12, color: "#2929D6" },
  { stage: "Portal Login", count: 10, color: "#3838E0" },
  { stage: "Submitted", count: 8, color: "#4747E9" },
  { stage: "Confirmed", count: 6, color: "#5656F2" },
  { stage: "Exception", count: 6, color: "#6565FA" },
]

// ══════════════════════════════════════════════════════════════════════════════
// DEMO MODE — Live Booking Flow Data
// ══════════════════════════════════════════════════════════════════════════════

export interface DemoScenario {
  id: string
  label: string
  description: string
  exceptionAtStep: number | null // which step triggers exception (null = happy path)
  exceptionType: BookingExceptionType
  severity: Severity
}

// Map demo scenario IDs to their corresponding booking IDs in the workbench
export const DEMO_SCENARIO_BOOKING_MAP: Record<string, string> = {
  "carrier-rejection": "BKG-50219",
  "no-capacity": "BKG-30188",
  "portal-failure": "BKG-60441",
  "rate-mismatch": "BKG-70991",
  "missing-data": "BKG-88442",
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: "happy-path", label: "Happy Path", description: "Full zero-touch booking — no exceptions", exceptionAtStep: null, exceptionType: "None", severity: "Low" },
  { id: "carrier-rejection", label: "Carrier Rejection", description: "Carrier rejects; re-routing needed", exceptionAtStep: 6, exceptionType: "Carrier Rejection", severity: "Critical" },
  { id: "no-capacity", label: "No Carrier Capacity", description: "No capacity available on lane", exceptionAtStep: 2, exceptionType: "Missing Allocation", severity: "High" },
  { id: "portal-failure", label: "Portal Failure", description: "Carrier portal down or credentials expired", exceptionAtStep: 3, exceptionType: "Portal Unavailable", severity: "High" },
  { id: "rate-mismatch", label: "Rate Mismatch", description: "Quoted rate differs from system rate", exceptionAtStep: 4, exceptionType: "Rate Mismatch", severity: "High" },
  { id: "missing-data", label: "Missing Data", description: "Incomplete shipment data in SAP/OTM", exceptionAtStep: 1, exceptionType: "Missing Booking Fields", severity: "Medium" },
]

export interface DemoStepDetail {
  duration: number // ms for thinking animation
  thinkingLabel: string
  completionLabel: string
  subItems: string[]
  aiReasoning: string
  aiConfidence: number
  aiSources: string[]
  processingTime: string
}

export const DEMO_STEP_DETAILS: DemoStepDetail[] = [
  {
    duration: 2500,
    thinkingLabel: "Reading shipment from SAP TM...",
    completionLabel: "Shipment parsed. 12 fields extracted, all validated.",
    subItems: ["SAP TM Gateway connected", "Order SAP-TM-87234 loaded", "OTM routing rules pulled", "Commodity & HS code verified"],
    aiReasoning: "Parsed SAP TM order SAP-TM-87234. Cross-referenced with OTM routing rules. All 12 required fields present and validated against carrier requirements.",
    aiConfidence: 99,
    aiSources: ["SAP TM", "OTM"],
    processingTime: "1.2s",
  },
  {
    duration: 3000,
    thinkingLabel: "Checking contract commitments on SHA→LAX...",
    completionLabel: "Maersk selected — contract CTR-2024-001 active, 68% volume used.",
    subItems: ["Contract CTR-2024-001 verified (Active)", "Volume: 2,720 / 4,000 TEU used (68%)", "Contract rate $2,800 vs spot $2,850 (+1.8%)", "CCR-01 applied: prefer contracted carrier"],
    aiReasoning: "Checked contract commitments per rule CCR-01. Maersk contract CTR-2024-001 is active on SHA→LAX with 68% volume utilization (2,720 of 4,000 TEU). Contract rate $2,800 vs current spot $2,850 — contract saves 1.8%. SLA 92%, capacity available. Selected Maersk as contracted carrier with best compliance score.",
    aiConfidence: 96,
    aiSources: ["Contract Registry", "Rate Engine", "Maersk Portal", "MSC Portal"],
    processingTime: "2.4s",
  },
  {
    duration: 2000,
    thinkingLabel: "Connecting to Maersk carrier portal...",
    completionLabel: "Portal authenticated. Session established.",
    subItems: ["API Gateway initialized", "Credentials validated", "Session token received", "Booking form loaded"],
    aiReasoning: "Connected to Maersk portal via API Gateway. Response time 240ms. Session authenticated with stored credentials (last rotated 3 days ago). Booking form endpoint available.",
    aiConfidence: 98,
    aiSources: ["API Gateway", "Maersk Portal"],
    processingTime: "0.8s",
  },
  {
    duration: 2500,
    thinkingLabel: "Submitting booking request...",
    completionLabel: "Booking submitted. Awaiting carrier confirmation.",
    subItems: ["Vessel AE-1234 selected (Mar 22)", "Container 2×40' HC allocated", "Rate $2,850 confirmed", "Booking parameters validated"],
    aiReasoning: "Selected vessel AE-1234 departing Mar 22 — optimal match for target ship date Mar 23 (1 day buffer). Rate $2,850 matches carrier quote, within 2% of contract rate. Container type 40' HC available.",
    aiConfidence: 96,
    aiSources: ["Maersk Portal", "Rate Engine"],
    processingTime: "1.8s",
  },
  {
    duration: 2000,
    thinkingLabel: "Uploading shipping documents...",
    completionLabel: "3 of 3 documents uploaded and verified.",
    subItems: ["Shipper's Letter of Instruction ✓", "Commercial Packing List ✓", "Customs Declaration Form ✓"],
    aiReasoning: "Uploaded 3 required documents to carrier portal. SLI auto-generated from SAP data. Packing list cross-referenced with order quantities. Customs declaration pre-filled from HS codes.",
    aiConfidence: 99,
    aiSources: ["Document System", "SAP TM"],
    processingTime: "1.4s",
  },
  {
    duration: 2500,
    thinkingLabel: "Retrieving booking confirmation...",
    completionLabel: "Confirmed — Booking ref MAEU-2024-SHA-78432.",
    subItems: ["Carrier acknowledgement received", "Booking ref MAEU-2024-SHA-78432", "Vessel AE-1234 / Mar 22 sailing", "Container release order issued"],
    aiReasoning: "Booking confirmed by Maersk in 45 seconds. Reference MAEU-2024-SHA-78432 cross-validated with carrier API response. Vessel schedule and container allocation match submitted parameters.",
    aiConfidence: 100,
    aiSources: ["Maersk Portal", "API Gateway"],
    processingTime: "0.6s",
  },
  {
    duration: 1800,
    thinkingLabel: "Updating SAP TM & notifying stakeholders...",
    completionLabel: "SAP updated. Plant team & SCM notified via email.",
    subItems: ["SAP TM order updated", "OTM booking record synced", "Plant Suzhou notified", "SCM team email sent"],
    aiReasoning: "Updated SAP TM order SAP-TM-87234 with booking confirmation. OTM record synced. Sent notification emails to plant logistics team (Suzhou) and SCM planner. All systems reflect confirmed status.",
    aiConfidence: 99,
    aiSources: ["SAP TM", "OTM", "Email"],
    processingTime: "1.1s",
  },
  {
    duration: 1500,
    thinkingLabel: "Activating booking monitor...",
    completionLabel: "Monitoring active. Next check in 30 minutes.",
    subItems: ["Tracking feed subscribed", "ETA monitor configured", "Exception alerts armed", "Status: Zero Touch Complete"],
    aiReasoning: "Booking monitor activated for MAEU-2024-SHA-78432. Subscribed to Maersk tracking API, AIS vessel data, and port congestion feeds. No anomalies detected. Next automated check in 30 minutes.",
    aiConfidence: 100,
    aiSources: ["Agent", "API Gateway"],
    processingTime: "0.3s",
  },
]

// Exception resolution data shown during demo exception flows
export interface DemoExceptionResolution {
  scenarioId: string
  title: string
  description: string
  impact: string
  aiRecommendation: string
  alternatives: Array<{ label: string; description: string }>
  resolveLabel: string
}

export const DEMO_EXCEPTION_RESOLUTIONS: Record<string, DemoExceptionResolution> = {
  "missing-data": {
    scenarioId: "missing-data",
    title: "Missing Booking Fields",
    description: "SAP TM order SAP-TM-87234 is missing 3 required fields for carrier booking submission.",
    impact: "Booking cannot proceed without: Commodity HS Code, Package Dimensions, Shipper Contact.",
    aiRecommendation: "Auto-fill from SAP master data. HS code 8471.30 (laptop parts) matches commodity description. Dimensions from last 3 shipments on this lane. Shipper contact from plant directory.",
    alternatives: [
      { label: "Request from Planner", description: "Send email to planner requesting missing data" },
      { label: "Use Defaults", description: "Apply lane-standard defaults from historical bookings" },
    ],
    resolveLabel: "Auto-Fill from SAP",
  },
  "no-capacity": {
    scenarioId: "no-capacity",
    title: "No Carrier Capacity",
    description: "All 4 preferred carriers report full allocation on SHA→LAX for target ship date Mar 23.",
    impact: "Maersk, MSC, Hapag-Lloyd, CMA-CGM — all fully booked. Next available sailing is Mar 28 (+5 days).",
    aiRecommendation: "Reroute via SHA→Long Beach (LGB). Maersk has capacity on vessel AE-1240, sailing Mar 23. Transit adds 1 day but meets SLA. Rate $2,920 (+2.5%).",
    alternatives: [
      { label: "Wait for Mar 28", description: "Book next available sailing on original lane (+5 days)" },
      { label: "Check Spot Market", description: "Query spot rates from non-contracted carriers" },
    ],
    resolveLabel: "Reroute via Long Beach",
  },
  "portal-failure": {
    scenarioId: "portal-failure",
    title: "Carrier Portal Unavailable",
    description: "Maersk carrier portal returned HTTP 503 — service temporarily unavailable.",
    impact: "Booking submission blocked. Portal health check shows Maersk API down since 14:23 UTC.",
    aiRecommendation: "Switch to MSC — second-ranked carrier. Rate $2,720 (5% lower), 2 extra transit days but within SLA window. Portal health: operational.",
    alternatives: [
      { label: "Retry in 5 min", description: "Wait for Maersk portal recovery (avg downtime: 12 min)" },
      { label: "Manual Escalation", description: "Escalate to carrier relationship manager" },
    ],
    resolveLabel: "Switch to MSC",
  },
  "rate-mismatch": {
    scenarioId: "rate-mismatch",
    title: "Contract Rate Violation — CCR-01",
    description: "Maersk quoted $3,340 — exceeds contract CTR-2024-001 ceiling of $2,800 by 19%. Contract compliance rule CCR-01 triggered.",
    impact: "Estimated overspend: $540/container ($1,080 total for 2×40' HC). Exceeds auto-approval threshold. Contract volume at 68% — sufficient room for renegotiation leverage.",
    aiRecommendation: "Flag for contract rate enforcement. Per CTR-2024-001, committed rate is $2,800. Historical data shows Maersk adjusts within 24h when contract is referenced. Alternatively, MSC (CTR-2024-002) offers $2,900 on SHA→LAX.",
    alternatives: [
      { label: "Enforce Contract Rate", description: "Reference CTR-2024-001 and request $2,800 rate" },
      { label: "Book with MSC (Contract)", description: "Switch to MSC CTR-2024-002 at $2,900" },
    ],
    resolveLabel: "Enforce Contract Rate",
  },
  "carrier-rejection": {
    scenarioId: "carrier-rejection",
    title: "Booking Rejected by Carrier",
    description: "Maersk rejected booking MAEU-2024-SHA-78432 — equipment type 40' HC not available on vessel AE-1234.",
    impact: "Booking cancelled. Vessel AE-1234 sailing Mar 22 is no longer an option for high-cube containers.",
    aiRecommendation: "Re-book with MSC on vessel MSC-ANNA, sailing Mar 23. 40' HC confirmed available. Rate $2,720, transit 16 days. Auto-rebook to minimize delay.",
    alternatives: [
      { label: "Try Standard 40'", description: "Rebook with Maersk using standard 40' container" },
      { label: "Escalate to Manager", description: "Alert routing manager for manual intervention" },
    ],
    resolveLabel: "Re-book with MSC",
  },
}

// The demo shipment — fresh from SAP, not yet booked
export const DEMO_SHIPMENT: BookingRequest = {
  id: "BKG-NEW-001",
  mode: "Ocean",
  carrier: "—",
  containerType: "2×40' HC",
  origin: "Shanghai (SHA)",
  destination: "Los Angeles (LAX)",
  plant: "Suzhou Plant",
  bookingStatus: "Pending",
  requestedDate: "Mar 20, 2024",
  targetShipDate: "Mar 23, 2024",
  severity: "Low",
  exceptionType: "None",
  approvalType: "None",
  lane: "SHA → LAX",
  sapOrderRef: "SAP-TM-87234",
  agentSummary: "New shipment requirement detected from SAP TM. Ready for automated booking.",
  workflowSteps: makeWorkflowSteps(0), // all pending
  carrierOptions: CARRIER_OPTIONS_SHA_LAX,
  reasonChips: [],
  timeline: [
    { timestamp: "Mar 20, 09:14", event: "Shipment requirement received from SAP TM", location: "Shanghai", source: "SAP TM", status: "info" },
    { timestamp: "Mar 20, 09:14", event: "Agent ingested order SAP-TM-87234", location: "System", source: "Agent", status: "agent" },
  ],
  sources: [
    { source: "SAP TM", status: "Order received", timestamp: "Mar 20, 09:14", freshness: "Just now", aligned: true, fresh: true },
    { source: "OTM", status: "Routing rules loaded", timestamp: "Mar 20, 09:14", freshness: "Just now", aligned: true, fresh: true },
  ],
  lat: 31.2304,
  lng: 121.4737,
  currentStatus: "New — awaiting automated booking",
  recommendedAction: "Execute zero-touch booking flow",
  notificationStatus: "Not Yet Sent",
  otmStatus: "Pending Update",
  etaConfidence: 0,
  delayHours: 0,
  trackingRef: "—",
  plannedETA: "Apr 06, 2024",
  revisedETA: "Apr 06, 2024",
  lastSignal: "SAP TM order received",
  lastSignalSource: "SAP TM",
}

// ── Policy / Automation Rules Constants ─────────────────────────────────────

export const CARRIER_SELECTION_WEIGHTS = [
  { factor: "Rate Competitiveness", description: "Contract vs spot rate deviation, total cost per container", weight: 35 },
  { factor: "SLA Compliance", description: "On-time delivery %, claim resolution speed, reliability score", weight: 30 },
  { factor: "Capacity Availability", description: "Equipment availability, booking acceptance rate, allocation", weight: 20 },
  { factor: "Transit Efficiency", description: "Door-to-door transit days, transshipment count, routing", weight: 15 },
]

export const AUTO_APPROVAL_THRESHOLDS = [
  { rule: "Rate deviation within contract tolerance", threshold: "≤ 5%", currentValue: "3.2% avg", enabled: true },
  { rule: "Carrier SLA meets minimum benchmark", threshold: "≥ 88%", currentValue: "91% avg", enabled: true },
  { rule: "Transit time within acceptable range", threshold: "≤ 18 days", currentValue: "14.5 days avg", enabled: true },
  { rule: "Booking value below auto-approval ceiling", threshold: "≤ $15,000", currentValue: "$6,200 avg", enabled: true },
  { rule: "Equipment type matches shipment requirements", threshold: "Exact match", currentValue: "96% match rate", enabled: true },
  { rule: "No hazardous / restricted cargo flags", threshold: "None flagged", currentValue: "Clean", enabled: false },
]

// ── SLA Rules (from TCS operational KPIs) ────────────────────────────────
export interface SlaRule {
  id: string
  name: string
  description: string
  target: string
  currentValue: string
  numericCurrent: number
  numericTarget: number
  unit: string
  direction: "max" | "min" // "max" = higher is better, "min" = lower is better
  category: "cost" | "performance" | "compliance" | "volume" | "sourcing"
  enabled: boolean
}

export const SLA_RULES: SlaRule[] = [
  { id: "SLA-01", name: "Spot Buy Ratio", description: "Spend through spot buy vs contracted lanes", target: "≤ 6%", currentValue: "4.2%", numericCurrent: 4.2, numericTarget: 6, unit: "%", direction: "min", category: "cost", enabled: true },
  { id: "SLA-02", name: "On-Time Delivery", description: "Shipments delivered by target date", target: "≥ 95%", currentValue: "92%", numericCurrent: 92, numericTarget: 95, unit: "%", direction: "max", category: "performance", enabled: true },
  { id: "SLA-03", name: "Data Entry Compliance", description: "System record updated within 24h of receipt", target: "≤ 24h", currentValue: "98%", numericCurrent: 98, numericTarget: 100, unit: "%", direction: "max", category: "compliance", enabled: true },
  { id: "SLA-04", name: "Critical Shipment SLA", description: "Critical shipments processed within 4 hours", target: "≤ 4h", currentValue: "3.2h", numericCurrent: 3.2, numericTarget: 4, unit: "h", direction: "min", category: "performance", enabled: true },
  { id: "SLA-05", name: "Contracted Lane Utilization", description: "Bookings using contracted vs spot carriers", target: "≥ 92%", currentValue: "89%", numericCurrent: 89, numericTarget: 92, unit: "%", direction: "max", category: "volume", enabled: true },
  { id: "SLA-06", name: "RFQ Completion Time", description: "Complete RFQs within target business days", target: "≤ 5 days", currentValue: "3.8 days", numericCurrent: 3.8, numericTarget: 5, unit: "days", direction: "min", category: "sourcing", enabled: true },
]

// ── Results Delivered (Before/After metrics) ─────────────────────────────
export const RESULTS_DELIVERED = [
  { metric: "Contracted Lane Usage", before: "78%", after: "95%+", improvement: "+17%", direction: "up" as const },
  { metric: "Governance Accuracy", before: "<80%", after: "92%+", improvement: "+12%", direction: "up" as const },
  { metric: "On-Time Delivery", before: "70%", after: "95%", improvement: "+25%", direction: "up" as const },
  { metric: "Spot Buy Ratio", before: "22%", after: "4.2%", improvement: "-18%", direction: "down" as const },
  { metric: "Automation", before: "0", after: "5+ implemented", improvement: "Digitally Enabled", direction: "up" as const },
  { metric: "Documentation Compliance", before: "SOPs not updated", after: "100% weekly", improvement: "Fully Compliant", direction: "up" as const },
]

export type TransportMode = "Ocean" | "Air" | "Road"

export const LANE_PREFERENCES = [
  { lane: "SHA→LAX", mode: "Ocean" as TransportMode, preferredCarrier: "Maersk", fallbackCarrier: "MSC", maxAcceptableRate: 3200, autoApprove: true },
  { lane: "SZX→ORD", mode: "Ocean" as TransportMode, preferredCarrier: "MSC", fallbackCarrier: "Hapag-Lloyd", maxAcceptableRate: 3600, autoApprove: true },
  { lane: "BOM→RTM", mode: "Ocean" as TransportMode, preferredCarrier: "Hapag-Lloyd", fallbackCarrier: "CMA-CGM", maxAcceptableRate: 2800, autoApprove: false },
  { lane: "HKG→RTM", mode: "Ocean" as TransportMode, preferredCarrier: "Hapag-Lloyd", fallbackCarrier: "Maersk", maxAcceptableRate: 3300, autoApprove: true },
  { lane: "BOM→LAX", mode: "Ocean" as TransportMode, preferredCarrier: "Maersk", fallbackCarrier: "CMA-CGM", maxAcceptableRate: 3800, autoApprove: false },
  { lane: "MEM→ORD", mode: "Road" as TransportMode, preferredCarrier: "FedEx Freight", fallbackCarrier: "DHL Freight", maxAcceptableRate: 1200, autoApprove: true },
  { lane: "YYZ→DTW", mode: "Road" as TransportMode, preferredCarrier: "DHL Freight", fallbackCarrier: "FedEx Freight", maxAcceptableRate: 2200, autoApprove: true },
]

export const ESCALATION_RULES = [
  { id: "ESC-01", condition: "Rate deviation exceeds 5% above contract", action: "Auto-generate counter-offer email to carrier rate desk, propose contract + 8% market adjustment", severity: "High" as const, enabled: true, triggerCount30d: 4 },
  { id: "ESC-02", condition: "Carrier rejects booking (equipment/capacity)", action: "Auto-select next-best alternative carrier from pre-approved list, re-submit booking", severity: "High" as const, enabled: true, triggerCount30d: 2 },
  { id: "ESC-03", condition: "Missing mandatory booking fields (≥1 field)", action: "Attempt AI auto-fill from SAP master data and historical bookings. Email shipper for unresolved fields", severity: "Medium" as const, enabled: true, triggerCount30d: 3 },
  { id: "ESC-04", condition: "Carrier portal unreachable after 3 retries", action: "Switch to INTTRA EDI backup channel, resubmit booking via alternate protocol", severity: "Critical" as const, enabled: true, triggerCount30d: 1 },
  { id: "ESC-05", condition: "No allocation available on preferred vessel", action: "Search alternative sailings within ±3 day window, escalate to procurement if none found", severity: "High" as const, enabled: true, triggerCount30d: 2 },
  { id: "ESC-06", condition: "Booking not confirmed within 4 hours", action: "Send follow-up to carrier, notify logistics coordinator, flag on exception dashboard", severity: "Medium" as const, enabled: true, triggerCount30d: 1 },
  { id: "ESC-07", condition: "Carrier portal credentials expired or revoked", action: "Alert IT support, switch to backup credentials or EDI channel", severity: "Critical" as const, enabled: false, triggerCount30d: 0 },
]

// ── Hard Policy Constraints ─────────────────────────────────────────────────

export const HARD_CONSTRAINTS = [
  { id: "HC-01", label: "Must-Arrive-By Deadline", type: "date" as const, value: "2024-04-15", description: "Shipment must arrive at destination by this date — carriers failing to meet this are excluded", icon: "calendar", enabled: true },
  { id: "HC-02", label: "Maximum Budget per Shipment", type: "currency" as const, value: 12000, description: "Total booking cost cannot exceed this amount — auto-reject quotes above ceiling", icon: "dollar", enabled: true },
  { id: "HC-03", label: "Minimum Carrier SLA", type: "percent" as const, value: 85, description: "Carriers below this SLA score are excluded from selection regardless of price", icon: "shield", enabled: true },
  { id: "HC-04", label: "Maximum Transit Days", type: "number" as const, value: 21, description: "Bookings exceeding this transit time require manual approval", icon: "clock", enabled: true },
  { id: "HC-05", label: "Prohibited Carriers", type: "list" as const, value: "Yang Ming, PIL", description: "These carriers are blacklisted — never included in carrier evaluation", icon: "ban", enabled: false },
  { id: "HC-06", label: "Required Insurance Coverage", type: "currency" as const, value: 50000, description: "All shipments must have minimum cargo insurance coverage", icon: "shield", enabled: true },
]

// ── AI Policy Recommendations ───────────────────────────────────────────────

export const AI_POLICY_RECOMMENDATIONS = [
  {
    id: "REC-01",
    title: "Increase SHA→LAX auto-approval rate threshold to $3,400",
    reason: "30-day spot market avg is $3,480. Current max $3,200 triggers manual review on 34% of bookings. Raising to $3,400 would reduce manual interventions by 28% while staying 2.3% below market.",
    impact: "Projected: +28% zero-touch rate, -$0 cost increase (still below market)",
    confidence: 94,
    category: "rate" as const,
    status: "pending" as const,
  },
  {
    id: "REC-02",
    title: "Add CMA-CGM as backup carrier for SZX→ORD lane",
    reason: "MSC capacity on this lane dropped 18% in last 60 days. CMA-CGM has consistent availability at -2% vs MSC rates. Adding as fallback prevents allocation exceptions.",
    impact: "Projected: -40% allocation exceptions on this lane",
    confidence: 89,
    category: "carrier" as const,
    status: "pending" as const,
  },
  {
    id: "REC-03",
    title: "Reduce BOM→LAX transit threshold from 21 to 18 days",
    reason: "Historical data shows 92% of BOM→LAX bookings complete within 17 days. The current 21-day threshold allows underperforming carriers. Tightening improves delivery reliability.",
    impact: "Projected: +8% on-time delivery, excludes 1 carrier (CMA-CGM slow vessel)",
    confidence: 87,
    category: "transit" as const,
    status: "pending" as const,
  },
  {
    id: "REC-04",
    title: "Enable hazardous cargo screening rule (HC-06 disabled)",
    reason: "2 bookings in the last 30 days contained items flagged by customs. Enabling auto-screening prevents compliance violations and potential fines ($5K-$50K per incident).",
    impact: "Projected: 100% compliance coverage, ~2 min added per booking",
    confidence: 96,
    category: "compliance" as const,
    status: "pending" as const,
  },
  {
    id: "REC-05",
    title: "Switch YYZ→DTW preferred carrier to FedEx Freight",
    reason: "DHL Freight SLA on this lane dropped from 91% to 82% over 90 days. FedEx Freight maintains 96% SLA with comparable rates ($1,750 vs $1,800). Performance trend is deteriorating.",
    impact: "Projected: +14% SLA improvement, +$50 avg cost per booking",
    confidence: 91,
    category: "carrier" as const,
    status: "pending" as const,
  },
]
