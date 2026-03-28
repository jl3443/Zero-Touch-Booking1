# Zero Touch Booking Agent — Workflow

```mermaid
flowchart TD
    Title["<b>With AI — Zero Touch Booking Agent</b>\n<i>Autonomous, API-driven, human-in-the-loop on exceptions only</i>"]
    style Title fill:none,stroke:none,color:#333

    Title ~~~ S1

    %% ─── Main Autonomous Flow ───

    S1["<b>Auto-read shipment requirement</b>\nAgent pulls data from SAP TM / OTM via API trigger"]
    S2["<b>AI carrier selection</b>\nScores carriers on rate + SLA + capacity + transit time"]
    S3["<b>Autonomous booking execution</b>\nRPA / API login to carrier portal, auto-fills & submits"]
    S4["<b>Auto document upload</b>\nRetrieves & uploads SLI, packing list, LOI automatically"]
    S5["<b>Retrieve confirmation & schedule</b>\nAgent captures booking number, vessel, ETD / ETA"]
    S6["<b>Auto-update SAP / OTM & notify</b>\nWrites booking ref, auto-notifies plant & SCM planners"]
    S7["<b>Continuous status tracking</b>\nProactive alerts for delays, schedule changes, rollover risk"]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7

    %% ─── AI Agents (mapped to steps) ───

    A1["🤖 <b>Booking Execution Agent</b>\nEnd-to-end booking without\nhuman input"]
    A2["🤖 <b>Carrier Selection Agent</b>\nSelects best carrier on\nrate + SLA + capacity"]
    A3["🤖 <b>Negotiation Assistant Agent</b>\nFlags rate reduction opportunities\nvs contracted rates"]
    A4["🤖 <b>Document & Tracking Agent</b>\nAuto-uploads docs & monitors\ncarrier acceptance status"]

    A1 --- S1
    A1 --- S3
    A2 --- S2
    A3 --- S5
    A4 --- S4
    A4 --- S7

    %% ─── Human Checkpoints ───

    H1["<b>Human checkpoint</b>\nApprove carrier\noverride / rate issue"]
    H2["<b>Human checkpoint</b>\nResolve rejection\nor re-route carrier"]
    H3["<b>Human checkpoint</b>\nAuthorize expedited\nor spot booking"]

    S2 -. "exception" .-> H1
    S5 -. "exception" .-> H2
    S7 -. "exception" .-> H3

    H1 -. "resolved" .-> S3
    H2 -. "resolved" .-> S6
    H3 -. "resolved" .-> S7

    %% ─── Time Annotations ───

    T1(["⏱ Seconds"])
    T2(["⏱ Minutes"])
    T3(["⏱ Continuous"])

    T1 ~~~ S1
    T2 ~~~ S4
    T3 ~~~ S7

    %% ─── Summary Footer ───

    S7 --> Summary

    Summary["🟢 <b>Total cycle: minutes per booking end-to-end</b>"]

    Benefits["<b>Key Benefits vs Manual</b>\nZero manual entry  |  Data-driven carrier selection  |  Real-time proactive alerts\nHuman only involved on exceptions: override, rejection, spot booking"]

    Summary --> Benefits

    %% ─── Styling ───

    classDef agent fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    classDef aiagent fill:#dbeafe,stroke:#2563eb,color:#1e3a5f,stroke-width:2px
    classDef human fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef time fill:none,stroke:none,color:#dc2626,font-weight:bold
    classDef summary fill:#d1fae5,stroke:#059669,color:#064e3b
    classDef benefits fill:#f0fdf4,stroke:#86efac,color:#166534

    class S1,S2,S3,S4,S5,S6,S7 agent
    class A1,A2,A3,A4 aiagent
    class H1,H2,H3 human
    class T1,T2,T3 time
    class Summary summary
    class Benefits benefits
```

---

## Legend

| Color | Meaning |
|-------|---------|
| 🟦 Light blue | Workflow step (autonomous) |
| 🔵 Blue border | AI Agent (drives one or more steps) |
| 🟨 Yellow | Human checkpoint (exception only) |
| 🟩 Green | Summary / benefits |
| Solid lines | Normal flow |
| Dashed lines | Exception path (only when triggered) |

---

## AI Agents → Workflow Step Mapping

| AI Agent | Steps Driven | Responsibility |
|----------|-------------|----------------|
| **Booking Execution Agent** | 1, 3 | Reads shipment from SAP, executes portal booking via RPA/API |
| **Carrier Selection Agent** | 2 | Evaluates carriers on rate, SLA, capacity; recommends optimal |
| **Negotiation Assistant Agent** | 5 | Flags rate discrepancies, drafts counter-offers to carriers |
| **Document & Tracking Agent** | 4, 7 | Uploads SLI/packing list, monitors acceptance & proactive alerts |

---

## System Integrations

```
SAP TM / OTM ←→ Agent ←→ Carrier Portals (Maersk, MSC, Hapag-Lloyd, CMA-CGM)
                  ↓
        Email / EDI / API triggers
                  ↓
    Notifications → Plant, SCM Planners
```
