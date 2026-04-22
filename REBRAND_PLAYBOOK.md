# Rebrand Playbook - RITEX HyperScalper

## 1) Brand Direction

### Brand Name
RITEX HyperScalper

### One-line Positioning
A real-time multi-exchange scalping workstation focused on speed, signal clarity, and execution confidence.

### Brand Pillars
- Precision: Scanner signals and execution tools must feel exact and unambiguous.
- Speed: Every interaction should prioritize low latency and minimal friction.
- Trust: Security-first defaults, transparent state, and reliable alerts.
- Control: Advanced settings without overwhelming the operator.

## 2) Audience and Message

### Primary Audience
- Active crypto scalpers
- Multi-market derivatives traders
- Power users who monitor multiple symbols simultaneously

### Core Value Message
Scan faster, decide faster, execute cleaner.

### Supporting Claims
- 10 integrated scanner strategies
- Realtime signal pipeline with progress and performance metrics
- Multi-exchange operation: Hyperliquid and Binance USD-M

## 3) Brand Voice

### Tone
- Direct
- Technical but clear
- Confident, never hype-heavy

### Copy Rules
- Prefer short action verbs: scan, detect, execute, confirm
- Avoid vague claims: use measurable language when possible
- Keep warnings explicit and actionable

## 4) Visual Identity System

### Color Semantics
- Bullish / Positive: green range
- Bearish / Risk: red range
- Medium warning: yellow range
- Informational / Neutral: primary-muted range

### UI Intent
- Signal states must be visible at a glance
- Warning levels must be tiered consistently across scanner metrics
- Keep dense data readable with strict spacing hierarchy

## 5) Product Naming Map

Use this naming map consistently in UI/docs:

- Scanner Engine
- Signal Feed
- Performance Metrics
- Duration Warnings
- Execution Controls

Strategy names:

- Stochastic Reversal
- Volume Spike
- EMA Alignment
- MACD Reversal
- RSI Reversal
- Channel Detection
- Divergence Detection
- Support Resistance Proximity
- Kalman Trend
- Ritchi Trend

## 6) Rebrand Rollout Checklist

### Phase A - Documentation
- Update README headline and positioning
- Add release summary for scanner upgrades (P0/P1/P2/P3)
- Add security and publishing guidance

### Phase B - UI Copy
- Audit button labels and scanner section titles
- Normalize warning labels: Medium Warning and High Warning
- Keep exchange naming consistent: Binance USD-M Futures

### Phase C - UX Consistency
- Ensure yellow warning means medium everywhere
- Ensure red warning means high/critical everywhere
- Ensure progress stages use same wording in all views

### Phase D - Communication Assets
- Changelog snippet for release announcement
- Internal release notes for operations team
- Social summary (optional)

## 7) Security and Trust Guidelines

- Never embed tokens or secrets in git remotes or source files
- Keep local-only credentials out of version control
- Use example env files for onboarding
- Add pre-push secret scan in CI when possible

## 8) Release Announcement Template

Title:
RITEX HyperScalper Rebrand + Scanner Performance Upgrade

Body:
- Rebranded product messaging and UI naming
- Added scanner progress visibility and runtime metrics
- Added medium/high duration warning thresholds configurable in Settings
- Improved scanner reliability with retry/backoff and concurrency controls
- Hardened repository hygiene before public push

## 9) Done Definition for Rebrand

Rebrand is considered complete when:
- README and launch narrative are updated
- UI terminology follows naming map
- Warning colors and thresholds are consistent
- Security hygiene checks are passed before publish
