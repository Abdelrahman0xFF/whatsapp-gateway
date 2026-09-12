# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are software developers, technical founders, indie hackers, and system administrators running microservices, web apps, CRM platforms, or automation workflows that require automated WhatsApp notifications, one-time passwords (OTP), and two-way messaging without complex multi-container Docker setups or vendor lock-in.

## Product Purpose

WhatsApp REST Gateway provides a lightweight, standalone, single-container REST API gateway and developer command center that bridges external backends (Python, Node.js, PHP, Go, cURL, webhooks) with WhatsApp. Success means zero-friction deployment (local, Render, Docker, Hugging Face Spaces), resilient connection management with Baileys, complete API key lifecycle governance, and an intuitive, production-grade developer cockpit.

## Positioning

Unlike heavy WhatsApp enterprise solutions that require separate databases (PostgreSQL, Redis) and multi-container Docker Compose stacks, WhatsApp REST Gateway is self-contained in a single lightweight process/container, persists sessions reliably to disk, offers a built-in cryptographic API token manager, and serves an integrated real-time Developer Cockpit with zero external dependencies.

## Operating Context

- Used in local developer environments (`localhost:7860`) and cloud containers (Render.com, Hugging Face Spaces, Fly.io, Railway, VPS Docker).
- Interacts with Baileys WebSocket protocol connected to WhatsApp mobile devices via QR code or 8-digit pairing code.
- Consumed via standard HTTP REST requests (`POST /api/messages/send`, `POST /api/otp/send`, `POST /api/otp/verify`, etc.) with `x-api-key` or `Authorization: Bearer <token>`.

## Capabilities and Constraints

### Capabilities
- **Zero-Trust Master Admin Security**: Dual-tier privilege architecture where Master Admin Key (`ADMIN_API_KEY`) protects session pairing (QR and 8-digit codes), token governance, activity audit logs, and webhooks; glassmorphic UI Security Gate modal prevents unauthorized dashboard access.
- **Token & Key Lifecycle Management**: Built-in cryptographic API key generation (`wa_live_...`), metadata labeling, revoking, persistent local key storage, timing-safe auth verification, and `.env` fallback.
- **Whitelist Recipient & Dynamic UI Placeholders**: Configurable test and display recipient (`WHITELIST_PHONE_NUMBER`) powering automated integration test suites and dynamically populating Cockpit form placeholders and code examples.
- **Messaging**: Single message dispatch, bulk message queues, media messages (images, documents, audio), delivery status feedback.
- **OTP Engine**: Cryptographically random 6-digit passcodes, in-memory expiration tracking, rate-limiting per phone number, configurable expiry windows, and verification.
- **Webhooks**: Outbound event delivery for incoming messages and delivery receipts.
- **Developer Cockpit**: High-contrast dark dashboard with live connection telemetry, interactive API playground with instant cURL/Python/Node/Go snippet generation, token manager, and live activity feed.

### Constraints
- Must remain zero-dependency regarding external databases (uses local file system/JSON storage with atomic writes).
- Must adhere strictly to WhatsApp anti-spam safeguards (configurable rate limiting, throttled bulk dispatches).
- Express.js 5.x ES modules architecture running on Node 20+.

## Brand Commitments

- Product Name: **WhatsApp REST Gateway**
- Voice: Direct, technical, transparent, developer-first, reliable.
- Tone: No marketing fluff; clear error messages, concrete status codes, and instant actionable diagnostics.

## Evidence on Hand

- Runnable Express server at [src/server.js](file:///D:/vs-code/whatsapp-gateway/src/server.js) and [src/app.js](file:///D:/vs-code/whatsapp-gateway/src/app.js).
- Embedded Baileys implementation at [src/services/baileys.service.js](file:///D:/vs-code/whatsapp-gateway/src/services/baileys.service.js).
- Existing test suite at [test-api.js](file:///D:/vs-code/whatsapp-gateway/test-api.js).
- Current HTML/CSS/JS frontend in `src/public/`.

## Product Principles

1. **Zero External Dependencies**: Keep deployment to a single container or node process without mandating Redis or relational databases.
2. **Fail Securely & Explicitly**: Timing-safe authentication, strict validation, granular HTTP error codes, and helpful remediation messages.
3. **Developer Ergonomics First**: Make onboarding take under 2 minutes with instant copy-paste code snippets, one-click token generation, and real-time status feedback.
4. **Resilient Session Lifecycle**: Protect against sudden WhatsApp disconnects with automatic socket recovery, watchdog health checks, and state transparency.

## Accessibility & Inclusion

- WCAG 2.1 AA compliant contrast ratios throughout the developer cockpit.
- Full keyboard navigability for forms, tabs, modal dialogs, and token management tables.
- Accessible ARIA status announcements for dynamic connection state changes.
