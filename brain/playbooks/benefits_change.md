# Benefits Change Event Playbook

## When to Use
Apply to events with type `benefits_enrollment`, `benefits_change`, or `benefits_termination`.

## Analysis Steps

1. **Validate eligibility**
   - Employee must be active status (not on unpaid leave, not terminated)
   - Qualifying life event must be within 30-day enrollment window
   - Check if change is during open enrollment period

2. **Check for anomalies**
   - Coverage level downgrade right before known medical procedure → flag
   - Dependents added/removed in bulk → verify against life event
   - Cost to employer changes significantly → note in findings

3. **COBRA triggers**
   - If employee is being terminated, COBRA notification is required
   - Check state mini-COBRA laws for small employers
   - Verify COBRA notice timeline compliance

## Classification Guide
- `routine` — Standard enrollment/change within normal parameters
- `needs_review` — Timing or pattern looks unusual
- `compliance_risk` — COBRA or eligibility violation
- `escalate` — Potential fraud indicator
