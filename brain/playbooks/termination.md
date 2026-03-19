# Termination Event Playbook

## When to Use
Apply this playbook to any event with type `termination` or `involuntary_separation`.

## Analysis Steps

1. **Check state-specific requirements**
   - California: Final pay must be provided on last day of work. Verify `final_pay_date` matches `last_work_date`.
   - Texas: Final pay due within 6 days of termination if involuntary.
   - New York: Final pay due by next regular payday.
   - If state-specific rules are in `brain/rules/`, read them for details.

2. **Check for potential compliance risks**
   - Employee on active FMLA leave → flag as `compliance_risk`
   - Employee filed a complaint within last 90 days → flag as `compliance_risk`
   - Employee is in a protected class and termination reason is "performance" without documented PIP → flag as `needs_review`
   - Mass termination (3+ in same department within 30 days) → check WARN Act applicability

3. **Check for patterns**
   - Read `customer/patterns.md` — is this department or location showing unusual turnover?
   - If this termination fits an existing pattern, note it
   - If this creates a new pattern, flag it

## Classification Guide
- `routine` — Standard termination, all compliance boxes checked
- `needs_review` — Something looks off but not necessarily a violation
- `compliance_risk` — Potential legal/regulatory issue
- `escalate` — Requires immediate human attention
