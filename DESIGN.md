---
name: WhatsApp REST Gateway Cockpit
description: Modern developer cockpit and microservice command center for WhatsApp automation
colors:
  canvas: "#080c14"
  surface: "#0e1522"
  card: "#121b2b"
  card-hover: "#162237"
  terminal: "#060910"
  border-subtle: "#1b263b"
  border-active: "#2a3b5c"
  primary: "#10b981"
  primary-hover: "#059669"
  sky: "#38bdf8"
  sky-hover: "#0ea5e9"
  rose: "#f43f5e"
  amber: "#f59e0b"
  text-primary: "#f8fafc"
  text-secondary: "#cbd5e1"
  text-muted: "#94a3b8"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  code:
    fontFamily: "'JetBrains Mono', monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  pill: "9999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#020617"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  code-terminal:
    backgroundColor: "{colors.terminal}"
    textColor: "{colors.sky}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
---

## Overview

WhatsApp REST Gateway Developer Cockpit provides a unified, high-density command interface for software engineers to monitor WhatsApp multi-device socket connections, generate and revoke API authentication tokens, test text and media dispatches interactively, and audit real-time gateway activity logs.

## Colors

The cockpit utilizes an intentional dark mode palette optimized for prolonged developer operations and contrast fidelity (meeting WCAG AA contrast ratio >= 4.5:1 across all text hierarchies):
- **Canvas (`#080c14`) & Surfaces (`#0e1522`, `#121b2b`)**: Deep slate foundations that eliminate eye strain and establish clear visual depth.
- **Primary Emerald (`#10b981`)**: WhatsApp brand green accent utilized for active connection beacons, successful deliveries, and primary call-to-actions.
- **Sky Accent (`#38bdf8`)**: Represents API transactions, interactive endpoints, and JSON code output.
- **Rose (`#f43f5e`)**: Danger and revocation indicators (unlinking devices, deleting tokens, failed dispatches).
- **Amber (`#f59e0b`)**: Transient states (QR scanning, reconnecting).

## Typography

- **Interface Body & Headings**: Native system stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) providing zero-latency rendering, clean legibility, and native platform integration.
- **Technical Symbols & Tokens**: `JetBrains Mono` for code snippets, JSON payloads, masked tokens, and hexadecimal hashes.
- **Numerals**: Tabular numerals (`font-variant-numeric: tabular-nums`) applied across timestamps, latencies, and uptime badges to prevent layout jitter.

## Layout

- **Asymmetric Operational Grid**: Two-column layout (`1fr 1.15fr`) separating device management and security governance (left) from live API testing and real-time audit feeds (right).
- **Responsive Stacking**: Seamlessly collapses into a single-column flow on viewports below 980px.
- **Content Measure**: Focused cards with max-width bounding (1280px overall container) to maintain optimal reading measure (65–75 characters per line).

## Elevation & Depth

- **Tonal Layering**: Depth is achieved through tonal contrast between canvas (`#080c14`), surface trays (`#0e1522`), and card surfaces (`#121b2b`).
- **Subtle Elevation**: Cards employ a soft, low-radius elevation shadow (`0 4px 12px rgba(0, 0, 0, 0.25)`) with a defined hairline border (`#1b263b`). Zero-offset glowing halos are strictly avoided.

## Shapes

- Consistent border radius hierarchy:
  - `6px` for small chips, badges, and inline buttons.
  - `10px` for form inputs, action buttons, and segmented control containers.
  - `14px` for primary cockpit cards and global telemetry banners.
  - `9999px` (pill) for status beacons and count badges.

## Components

- **Telemetry Header**: Real-time status bar with heartbeat pulse, uptime monitor, and engine indicator.
- **API Token Studio**: Inline generator with instant one-click copy, token masking, and revocation controls.
- **Pairing Hub**: Dual-tab switcher between high-contrast QR code display and 8-digit phone pairing codes.
- **API Playground**: Live multi-language code generator (cURL, Python, Node.js, Go) updating dynamically as users configure parameters.
- **Toast System**: Non-blocking accessible toast notifications replacing modal alert dialogs.

## Do's and Don'ts

### Do's
- Do preserve tabular numerals on timestamps, latencies, and token counters.
- Do provide instant feedback via toast alerts upon copying keys or dispatching messages.
- Do keep API keys masked in tables until explicitly copied or viewed in active sessions.
- Do ensure all interactive controls have accessible keyboard focus rings.

### Don'ts
- Don't use browser `alert()` or `confirm()` modals; use inline confirmations or toasts.
- Don't introduce zero-blur glowing colored drop shadows.
- Don't nest cards with competing borders inside existing cards.
- Don't allow text contrast to dip below 4.5:1 on dark surfaces.
