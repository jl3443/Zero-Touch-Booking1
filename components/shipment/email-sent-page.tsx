"use client"

import { useState, useEffect } from "react"
import { STATIC_SENT_EMAILS, type SentEmailItem } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { Send, Clock, ChevronLeft, Mail, Paperclip, Sparkles } from "lucide-react"

export type { SentEmailItem }

const TYPE_CONFIG: Record<SentEmailItem["type"], { label: string; color: string }> = {
  plant:      { label: "Plant Notification", color: "bg-green-50 border-green-200 text-green-700" },
  carrier:    { label: "Carrier Inquiry",    color: "bg-blue-50 border-blue-200 text-blue-700" },
  escalation: { label: "Escalation",         color: "bg-red-50 border-red-200 text-red-700" },
  sap:        { label: "SAP Update",         color: "bg-violet-50 border-violet-200 text-violet-700" },
}

function extractBookingId(text: string): string | null {
  const match = text.match(/BKG-\d+/)
  return match ? match[0] : null
}

interface EmailSentPageProps {
  dynamicEmails?: SentEmailItem[]
  autoSelectId?: string
  onSwitchToInbox?: () => void
}

export function EmailSentPage({ dynamicEmails = [], autoSelectId, onSwitchToInbox }: EmailSentPageProps) {
  const allEmails = [...dynamicEmails, ...STATIC_SENT_EMAILS]
  const [selected, setSelected] = useState<SentEmailItem | null>(null)

  useEffect(() => {
    if (autoSelectId === "latest" && allEmails.length > 0) {
      setSelected(allEmails[0])
    } else if (autoSelectId) {
      const email = allEmails.find((e) => e.id === autoSelectId)
      if (email) setSelected(email)
    }
  }, [autoSelectId])

  return (
    <div className="flex-1 overflow-hidden bg-[#F8F9FA] flex h-full">
      {/* Left sidebar — FOLDERS */}
      <div className="w-[140px] shrink-0 border-r border-gray-200 bg-white py-5 px-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Folders</p>
        <button
          onClick={onSwitchToInbox}
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors mb-1 text-gray-600 hover:bg-gray-50"
        >
          <Mail size={14} /> Inbox
        </button>
        <button
          className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors bg-blue-50 text-blue-700"
        >
          <Send size={14} /> Sent
        </button>
      </div>

      {/* Email list */}
      <div className="w-[340px] flex flex-col border-r border-gray-200 bg-white shrink-0 overflow-hidden">
        {/* List header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send size={15} className="text-gray-500" />
            <span className="text-[14px] font-semibold text-gray-800">Sent</span>
          </div>
          <span className="text-[12px] text-gray-400">{allEmails.length} messages</span>
        </div>

        {/* Email items */}
        <div className="overflow-y-auto flex-1">
          {allEmails.map((email) => {
            const isSelected = selected?.id === email.id
            const typeCfg = TYPE_CONFIG[email.type]
            const initial = email.to.charAt(0).toUpperCase()
            const bookingId = extractBookingId(email.subject) || extractBookingId(email.body)

            return (
              <button
                key={email.id}
                onClick={() => setSelected(isSelected ? null : email)}
                className={cn(
                  "w-full text-left px-4 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  isSelected && "bg-blue-50 border-l-[3px] border-l-blue-500",
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar circle */}
                  <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[12px] font-bold text-white">{initial}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Recipient + date */}
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-gray-600 truncate">
                        To: {email.to}
                      </span>
                      <span className="text-[11px] text-gray-400 shrink-0">{email.timestamp}</span>
                    </div>

                    {/* Subject */}
                    <div className="text-[12px] text-gray-800 font-medium truncate mb-0.5">
                      {email.subject}
                    </div>

                    {/* Bottom row: type badge + booking ID */}
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-semibold border rounded-full px-1.5 py-0.5", typeCfg.color)}>
                        {typeCfg.label}
                      </span>
                      {bookingId && (
                        <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                          {bookingId}
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

      {/* Right panel: email detail or empty state */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="px-6 py-5 border-b border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 mb-3 transition-colors"
              >
                <ChevronLeft size={12} /> Back
              </button>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-2 leading-snug">{selected.subject}</h3>
              <div className="flex items-center gap-3 text-[12px] text-gray-400">
                <span>To: <span className="text-gray-700 font-medium">{selected.to}</span></span>
                <span className="flex items-center gap-1"><Clock size={11} /> {selected.timestamp}</span>
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TYPE_CONFIG[selected.type].color)}>
                  {TYPE_CONFIG[selected.type].label}
                </span>
                {(() => {
                  const bid = extractBookingId(selected.subject) || extractBookingId(selected.body)
                  return bid ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                      {bid}
                    </span>
                  ) : null
                })()}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <pre className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                {selected.body}
              </pre>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                <Send size={24} className="text-gray-300" />
              </div>
              <p className="text-[14px] text-gray-400">Select a sent email to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
