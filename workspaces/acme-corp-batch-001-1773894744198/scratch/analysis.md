# Batch Analysis Notes - acme-corp

## Event 1: evt-001 (Termination - emp-4821)
- **Type**: Involuntary termination, performance reason
- **Location**: CA (strict rules apply)
- **Last work date**: 2026-03-15
- **Final pay date**: 2026-03-22 (7 days AFTER last work date)
- **RED FLAG**: CA requires final pay on SAME DAY for involuntary termination
- **Additional risks**:
  - Has recent complaint (within 90 days likely) + performance termination without documented PIP
  - Engineering department has high turnover pattern
  - This is a potential retaliation flag
- **Classification**: COMPLIANCE_RISK (CA final pay violation + potential retaliation risk)

## Event 2: evt-002 (Termination - emp-5102)
- **Type**: Voluntary resignation
- **Location**: TX
- **Last work date**: 2026-03-29
- **Final pay date**: 2026-03-29 (same day)
- **Notes**: 
  - Tenure 1.1 years (relatively short)
  - No complaints, no FMLA
  - No documented issues
- **Classification**: ROUTINE (voluntary resignation, final pay complies with TX rules)

## Event 3: evt-003 (Termination - emp-3390)
- **Type**: Involuntary termination, performance reason
- **Location**: CA (strict rules apply)
- **Last work date**: 2026-03-16
- **Final pay date**: 2026-03-16 (same day - COMPLIANT)
- **RED FLAG**: Employee has ACTIVE FMLA
  - Terminating someone on active FMLA is a MAJOR compliance risk (interference/retaliation)
  - Even with documented PIP, this needs careful review
- **Additional context**:
  - Engineering department (high turnover area)
  - 5.7 year tenure
  - HAS documented PIP (mitigates some risk, but not FMLA issue)
- **Classification**: COMPLIANCE_RISK (FMLA interference + mass termination pattern)

## Event 4: evt-004 (Benefits Change - emp-2210)
- **Type**: Health benefits modification due to birth (qualifying life event)
- **Effective date**: 2026-04-01
- **Notes**:
  - Life event is birth (within 30 day window from 2026-03-14)
  - Change type is modification to family coverage
  - Not during open enrollment
  - Appears routine
- **Classification**: ROUTINE (standard life event enrollment)

## Cross-Event Pattern Analysis
- **MASS TERMINATION CONCERN**: 
  - 2 involuntary terminations in Engineering department within 24 hours (evt-001 and evt-003)
  - Both performance reasons
  - CA WARN Act: Applies to establishments with 75+ employees
  - Acme has ~2,400 employees across 5 states
  - This could be part of larger layoff - need to check if 50+ people in 30-day window
  - If so: requires 60 days notice (not given here)
  
- **POLICY/PATTERN ISSUES**:
  - Known CA compliance issues in 2024-Q3
  - This batch has 2 CA terminations with potential compliance gaps
  - Pattern of Engineering terminations aligns with known high-turnover department

## Recommended Actions
1. evt-001: Immediate review of final pay calculation; investigate complaint + performance connection
2. evt-003: Legal review of FMLA termination; ensure documented PIP is defensible
3. Both CA cases: Verify no WARN Act trigger (get full termination data for 30-day period)
4. evt-004: No action needed, appears routine
