# Event Schema

## Common Fields (all events)
- `event_id` — unique identifier
- `event_type` — termination, benefits_change, benefits_enrollment, comp_change, leave_request, etc.
- `customer_id` — which customer this belongs to
- `employee_id` — the employee involved
- `timestamp` — when the event occurred
- `priority` — low, medium, high, critical

## Termination Event
- `termination_type` — voluntary, involuntary, layoff, retirement
- `termination_reason` — performance, restructuring, resignation, etc.
- `last_work_date` — employee's final day
- `final_pay_date` — when final pay was/will be issued
- `state` — employment state (for labor law purposes)
- `department` — employee's department
- `tenure_years` — how long the employee worked there
- `has_active_fmla` — boolean
- `has_recent_complaint` — boolean (complaint filed within 90 days)
- `has_documented_pip` — boolean (performance improvement plan on file)

## Benefits Change Event
- `change_type` — enrollment, modification, cancellation
- `benefit_type` — health, dental, vision, life, 401k
- `coverage_level` — employee_only, employee_spouse, family
- `qualifying_life_event` — marriage, birth, divorce, etc. (nullable)
- `effective_date` — when the change takes effect
- `is_open_enrollment` — boolean
