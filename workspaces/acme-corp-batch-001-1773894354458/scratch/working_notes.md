# Working Notes — Acme Corp Batch Analysis

## Batch context
- 4 events: 3 terminations, 1 benefits change
- Processing date reference: ~2026-03-16

---

## evt-001 — Termination, emp-4821, CA, Engineering (Involuntary/Performance)

**Final pay check (CA):** Last work date = 2026-03-15, final pay date = 2026-03-22.
→ CA law requires final pay ON the last day for involuntary terminations. This is 7 days late. VIOLATION.

**Complaint check:** has_recent_complaint = true, no documented PIP, termination_reason = performance.
→ Retaliation risk. Termination for performance with a recent complaint but no PIP is a major red flag.

**FMLA:** Not active. OK.

**Pattern match:** Engineering department, involuntary. Acme Engineering already has high turnover (18%). This is Q1, which historically spikes. Fits known pattern but adds to it.

**Classification: escalate**
- CA final pay violation
- Recent complaint + no PIP = retaliation exposure
- Both issues simultaneously = immediate human attention needed

---

## evt-002 — Termination, emp-5102, TX, Sales (Voluntary/Resignation)

**Final pay check (TX):** Voluntary resignation in TX → next regular payday. Final pay date = last work date (2026-03-29). Pay dates are biweekly; this appears same-day which satisfies the TX rule.
→ No issue.

**Complaint check:** None. PIP: N/A (voluntary). FMLA: None. Clean.

**Pattern:** Sales dept, voluntary. Not a known elevated-turnover pattern.

**Classification: routine**
- Straightforward voluntary resignation
- TX compliance appears satisfied

---

## evt-003 — Termination, emp-3390, CA, Engineering (Involuntary/Performance)

**Final pay check (CA):** Last work date = 2026-03-16, final pay date = 2026-03-16.
→ MATCHES. CA final pay requirement satisfied.

**FMLA check:** has_active_fmla = TRUE.
→ Terminating an employee on active FMLA is a significant compliance risk / potential FMLA interference/retaliation claim.

**PIP:** Documented. Complaint: None.
→ PIP presence is good, but FMLA status overrides — this still needs escalation.

**Pattern:**
- Second Engineering involuntary termination in 2 days (evt-001 was also Engineering, CA, involuntary, 2026-03-15).
- Total Engineering terminations this batch: 2 involuntary within 1 day — not yet 3 (WARN Act threshold) but trending. Watch closely.
- Acme has prior CA final pay issue history (2024-Q3).

**Classification: escalate**
- Active FMLA at time of termination = high legal exposure
- Second CA Engineering involuntary termination in consecutive days

---

## evt-004 — Benefits Change, emp-2210, Health/Family (Birth QLR)

**Eligibility:** Change_type = modification (not triggered by termination), employee assumed active. OK.

**Qualifying life event:** Birth → 30-day enrollment window from the birth. Effective date 2026-04-01. Need to confirm birth was within 30 days of the change request (timestamp 2026-03-14). No birth date provided explicitly, but the event was submitted normally — we'll note this is unverifiable without birth date but appears in order.

**Open enrollment:** No, but QLR (birth) justifies an off-cycle change. Valid.

**Anomalies:** Adding family coverage for newborn is textbook QLR. No coverage downgrade. No bulk dependent changes. Normal.

**COBRA:** No termination involved here. N/A.

**Cost note:** Moving to family coverage will increase employer cost. Routine for a birth event.

**Classification: routine**
- Standard birth QLR benefits modification
- No anomalies

---

## Cross-Batch Observations
1. Two involuntary Engineering terminations in CA in consecutive days. If one more Engineering termination occurs within the next 28 days, WARN Act applicability must be assessed.
2. Acme's Engineering high-turnover pattern is continuing into Q1 2026 as historically expected.
3. evt-001 is the most urgent item: dual-risk (CA pay timing + retaliation exposure).
