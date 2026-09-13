# 💬 WhatsApp REST API Gateway

A lightweight, production-grade **Express.js REST API microservice and developer cockpit** to automate WhatsApp messaging from any application (Python backends, SaaS platforms, mobile applications, webhooks, or scripts).

Runs in a **single Docker container** with **zero external database dependencies** (no PostgreSQL, no Redis, no Docker Compose required).

---

## ⚡ Key Capabilities

- **🚀 Single-Container Architecture**: Self-contained with local atomic JSON storage or cloud MongoDB; deploys anywhere in minutes.
- **💾 Flexible Dual Storage (Local Files or MongoDB)**: Works out of the box with zero external database dependencies using local `./data` JSON files. Providing `MONGODB_URI` in `.env` automatically switches to MongoDB (Atlas or self-hosted) with automatic migration of existing local tokens, logs, and sessions.
- **🖥️ Developer Cockpit**: High-density developer dashboard featuring an upper operational deck, an integrated testing console with live response & code generator, and a dedicated full-width paginated audit feed.
- **📱 Dual Pairing Modes**: Connect via high-contrast QR code scan or 8-digit phone pairing code (no camera scan required).
- **🔑 Cryptographic Key Governance**: Generate and revoke `wa_live_...` tokens with timing-safe SHA-256 validation. Supports multiple project keys and strict zero-trust isolation.
- **💬 Rich Dispatch Suite**: Send plain text, bulk messages with anti-spam rate limiting, and rich media (images, PDFs, documents, voice notes, video) via URL or Base64.
- **🔐 One-Time Password (OTP) Engine**: Built-in 6-digit OTP delivery and verification with automated expiration windows and anti-bombing cooldowns.
- **📊 Real-Time Observability Deck**: Complete activity feed with server-side pagination, search filtering, type/status filters, and live auto-polling.
- **🪝 Outbound Webhooks**: Deliver incoming messages and delivery receipts to external endpoints with HMAC-SHA256 signature verification.

---

## 🏁 Quick Start (Local)

### 1. Install & Launch

```bash
# Clone and install dependencies
git clone https://github.com/Abdelrahman0xFF/whatsapp-gateway.git
cd whatsapp-gateway
npm install

# Start the server (default port 7860)
npm start

# Or run with auto-reload in development
npm run dev
```

### 2. Connect Your WhatsApp

1. Open **`http://localhost:7860`** in your browser.
2. Choose your pairing method:
   - **QR Code**: Scan the QR code in WhatsApp (**Settings** &rarr; **Linked Devices** &rarr; **Link a Device**).
   - **Phone Pairing Code**: Click _"Phone Pairing Code"_, input your phone number with country code, and type the 8-character passcode into WhatsApp.

### 3. Dispatch Your First Message

```bash
curl -X POST "http://localhost:7860/api/messages/send" \
  -H "Content-Type: application/json" \
  -d '{"number": "201012345678", "message": "Hello from WhatsApp REST Gateway! 🚀"}'
```

---

## 🖥️ Developer Cockpit Overview

The gateway serves a built-in web cockpit at `http://localhost:7860/` organized into two functional tiers:

### Upper Operational Deck (Two-Column Balanced Grid)

- **WhatsApp Device Link**: Monitor real-time WebSocket connection state, instance JID, session storage, and watchdog health checks. Unlink devices using inline confirmation drawers (no browser modals).
- **API Token Studio**: Generate cryptographically secure `wa_live_...` keys, view masked credentials, copy tokens in one click, and revoke tokens with per-row confirmation.
- **Interactive Testing Studio**:
  - Test Text, Media, and OTP dispatches interactively.
  - **Unified Console Panel**: Toggle between **API Response** (displaying real-time HTTP status, round-trip latency in `ms`, and formatted JSON) and **Integration Code** (live snippets in cURL, Python, Node.js, and Go).

### Lower Observability Deck (Dedicated Full-Width Feed)

- **Live Dispatch & Audit Feed**:
  - **Live Search**: Instant debounced searching by recipient number, preview text, error trace, or message ID.
  - **Filter Controls**: Filter by Type (`TEXT`, `MEDIA`, `OTP_SEND`, `OTP_VERIFY`) and Status (`SENT`, `VERIFIED`, `FAILED`).
  - **Pagination Engine**: Controls for page navigation (`First`, `Prev`, dynamic page numbers, `Next`, `Last`) and configurable page sizes (`10`, `25`, `50` per page).
  - **Live Stream Toggle**: Pulsing live polling indicator with one-click pause and resume.
  - **Record Deletion**: Delete individual audit entries or clear the entire feed using inline confirmations.

---

## ☁️ Deployment Guides

### Option A: Render.com (1-Click Blueprint)

The repository includes a [`render.yaml`](render.yaml) blueprint ready for 1-click deployment:

1. Push your repository to GitHub.
2. Go to [Render.com](https://render.com) and navigate to **Blueprints** &rarr; **New Blueprint Instance**.
3. Connect your repository. Render will automatically detect `render.yaml` and configure the service as a Docker Web Service on the free tier.
4. Open the deployed service URL (`https://<your-service>.onrender.com`), link your WhatsApp, and start sending messages.

> [!TIP]
> **Keep Free Tier Containers Awake (24/7)**:
> Render Free Web Services spin down after 15 minutes of inactivity. Set up a free HTTP monitor at [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org) to ping `GET https://<your-service>.onrender.com/api/health` every 10 minutes to maintain persistent WebSocket connectivity.

---

### Option B: Hugging Face Spaces

1. Create a **New Space** on [Hugging Face Spaces](https://huggingface.co/spaces).
   - **SDK**: `Docker` (Blank).
   - **Port**: `7860` (already configured in [`Dockerfile`](Dockerfile)).
2. Push your code:
   ```bash
   git remote add space https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
   git push -u space main
   ```
3. In Space **Settings** &rarr; **Variables and secrets**, add `ADMIN_API_KEY` (e.g. `adm_live_production_secret_key`).
4. Open your Space URL and enter your `ADMIN_API_KEY` to unlock the Developer Cockpit and link WhatsApp.

---

### Option C: Standalone Docker (`docker run`)

```bash
# Build the production Docker image
docker build -t whatsapp-gateway .

# Run container with persistent data volume and restart policy
docker run -d \
  --name whatsapp-gateway \
  --restart unless-stopped \
  -p 7860:7860 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  whatsapp-gateway
```
*(On Windows PowerShell, replace `$(pwd)` with `${PWD}`)*

---

### Option D: PM2 (Node.js Process Manager for VPS / Bare Metal)

For native Node.js environments on Ubuntu, Debian, or Windows Server:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start the gateway with automatic restarts and memory threshold
pm2 start src/server.js --name whatsapp-gateway --max-memory-restart 500M

# 3. Configure PM2 to start automatically on system reboot
pm2 startup
pm2 save
```

---

## 🔐 Authentication & Zero-Trust Security

The gateway implements a **Dual-Tier Role-Based Security Architecture**:

### 1. Master Admin Role (`ADMIN_API_KEY`)
The Master Admin Key is configured via `ADMIN_API_KEY` in your environment or secrets.
- **Grants Access To**: Developer Cockpit Web UI, Token Generation, Token Revocation, WhatsApp QR & Pairing Code, Instance Controls, Activity Feeds, and Webhook Configuration.
- **Pass via Header**:
  ```http
  x-admin-key: your_admin_api_key
  ```
  _(or `Authorization: Bearer your_admin_api_key`)_
- **Zero-Exposure Default**: If `ADMIN_API_KEY` is not set on startup, the gateway generates a persistent random key (`adm_live_...`), saves it to `data/.admin_secret`, and logs it to container logs. Public unauthenticated access to token management is **never** permitted.

### 2. Client API Role (`wa_live_...`)
Client tokens are generated inside the Developer Cockpit Token Studio for downstream microservices, backends, or CRMs.
- **Grants Access To**: Messaging dispatches (`/api/messages/*`) and OTP operations (`/api/otp/*`).
- **Strictly Prohibited From**: Generating or deleting tokens, viewing QR codes or pairing codes, or reading activity feeds.
- **Pass via Header**:
  ```http
  x-api-key: wa_live_...
  ```
  _(or `Authorization: Bearer wa_live_...`)_

> [!IMPORTANT]
> **Strict Header-Only Authentication**: For production security, passing tokens via URL query parameters (`?api_key=...` or `?admin_key=...`) is rejected with `401 Unauthorized` to prevent credentials from leaking into reverse proxy logs, browser histories, and HTTP Referer headers. Always supply credentials in HTTP headers.


---

## 📡 API Reference

Base URL: `http://localhost:7860` (or your deployed cloud host)

### 1. Messaging Endpoints

#### Single Text Message

`POST /api/messages/send` _(Alias: `POST /api/send-message`)_

**Request Body:**

```json
{
  "number": "201012345678",
  "message": "Your verification code is 492019."
}
```

_Note: Accepts `number`, `phone`, `to`, or `phoneNumber` with country code digits._

**Response (`200 OK`):**

```json
{
  "success": true,
  "message": "WhatsApp message sent successfully.",
  "data": {
    "recipient": "201012345678",
    "messageId": "3EB09F2A9318",
    "status": "SENT",
    "timestamp": "2026-09-12T10:30:00.000Z"
  }
}
```

#### Media & Document Dispatch

`POST /api/messages/send-media`

Supports `image`, `document`, `audio`, and `video` attachments via remote URL or Base64 string.

**Request Body (via URL):**

```json
{
  "number": "201012345678",
  "type": "document",
  "mediaUrl": "https://example.com/invoices/inv_1092.pdf",
  "fileName": "Invoice_1092.pdf",
  "caption": "Monthly statement attached."
}
```

**Request Body (via Base64):**

```json
{
  "number": "201012345678",
  "type": "image",
  "mediaBase64": "data:image/png;base64,iVBORw0KGgo...",
  "caption": "Screenshot preview"
}
```

> [!NOTE]
> **SSRF Protection & Limits**: URLs pointing to loopback (`127.0.0.1`, `localhost`), private network ranges (`10.x`, `172.16-31.x`, `192.168.x`), or cloud metadata endpoints (`169.254.169.254`) are blocked. Maximum media attachment size is 25MB (streamed safely).

#### Bulk Messages

`POST /api/messages/send-bulk`

Dispatches sequentially or in the background with anti-ban jitter delays.

**Request Body (Synchronous Batch):**

```json
{
  "numbers": ["201012345678", "15551234567"],
  "message": "Important service announcement.",
  "delayMs": 1000
}
```

**Request Body (Asynchronous Queue — Recommended for larger batches):**

```json
{
  "messages": [
    { "number": "201012345678", "message": "Notice for Customer A" },
    { "number": "15551234567", "message": "Notice for Customer B" }
  ],
  "async": true,
  "delayMs": 1500
}
```

**Response (`202 Accepted` when `async: true`):**

```json
{
  "success": true,
  "status": "QUEUED",
  "message": "Bulk dispatch accepted and processing asynchronously in background.",
  "batchId": "batch_9f1a2b3c4d5e",
  "total": 2
}
```

---

### 2. Token Governance Endpoints

| Method   | Endpoint               | Description                                                              |
| :------- | :--------------------- | :----------------------------------------------------------------------- |
| `POST`   | `/api/tokens/generate` | Generate a new cryptographically secure bearer token (`{"name": "CRM"}`) |
| `GET`    | `/api/tokens`          | List all active tokens with masked keys and creation timestamps          |
| `DELETE` | `/api/tokens/:id`      | Immediately revoke and invalidate an API token                           |

---

### 3. Activity & Audit Feed Endpoints

#### Get Paginated Activity Logs

`GET /api/activity`

**Query Parameters:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Page number to retrieve (1-indexed) |
| `limit` | `number` | `10` | Records per page (min 1, max 100) |
| `type` | `string` | `ALL` | Filter by type: `ALL`, `TEXT`, `MEDIA`, `OTP_SEND`, `OTP_VERIFY` |
| `status` | `string` | `ALL` | Filter by status: `ALL`, `SENT`, `FAILED`, `VERIFIED` |
| `search` | `string` | `""` | Search query across recipient phone, preview text, error, or message ID |

**Response (`200 OK`):**

```json
{
  "success": true,
  "stats": {
    "total": 42,
    "sent": 39,
    "failed": 3,
    "successRate": "93%"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "data": [
    {
      "id": "act_8a12f3b9c0d1",
      "timestamp": "2026-09-12T10:45:12.000Z",
      "type": "TEXT",
      "recipient": "201012345678",
      "status": "SENT",
      "messageId": "3EB047F19D",
      "preview": "Your package has been delivered.",
      "error": null,
      "durationMs": 42
    }
  ]
}
```

#### Delete Single Activity Record

`DELETE /api/activity/:id`

Deletes a specific activity log record by its ID. Returns `200 OK` on success or `404 Not Found`.

#### Clear Activity Feed

`DELETE /api/activity/clear`

Permanently clears all activity records from storage.

---

### 4. OTP Verification Endpoints

#### Request OTP Passcode

`POST /api/otp/send`

**Request Body:**

```json
{
  "number": "201012345678",
  "appName": "Secure Portal",
  "length": 6,
  "expiresInMinutes": 5
}
```

#### Verify OTP Passcode

`POST /api/otp/verify`

**Request Body:**

```json
{
  "number": "201012345678",
  "code": "839201"
}
```

**Response (`200 OK`):**

```json
{
  "success": true,
  "status": "VERIFIED",
  "message": "Phone number verified successfully!"
}
```

---

### 5. WhatsApp Instance & Device Linking

| Method | Endpoint                     | Description                                                       |
| :----- | :--------------------------- | :---------------------------------------------------------------- |
| `GET`  | `/api/instance/status`       | Get connection status (`open`, `connecting`, `disconnected`)      |
| `GET`  | `/api/instance/qr`           | Get current pairing QR code as base64 Data URL                    |
| `POST` | `/api/instance/pairing-code` | Generate 8-digit phone pairing passcode (`{"number": "2010..."}`) |
| `POST` | `/api/instance/connect`      | Force socket reconnect                                            |
| `POST` | `/api/instance/restart`      | Restart internal Baileys client                                   |
| `POST` | `/api/instance/logout`       | Unlink device and reset session credentials                       |

---

### 6. Outbound Webhooks

| Method | Endpoint                  | Description                                               |
| :----- | :------------------------ | :-------------------------------------------------------- |
| `GET`  | `/api/webhooks/status`    | Check webhook delivery URL and statistics                 |
| `POST` | `/api/webhooks/configure` | Configure external webhook URL (`{"url": "https://..."}`) |
| `POST` | `/api/webhooks/test`      | Dispatch synthetic ping payload to test connectivity      |

---

### 7. Health & Monitoring

| Method | Endpoint      | Description                                                                                     |
| :----- | :------------ | :---------------------------------------------------------------------------------------------- |
| `GET`  | `/api/health` | Public service liveness, uptime, engine mode, socket state, and storage mode (sanitized output) |

---

### 8. Master Admin Endpoints

| Method | Endpoint            | Auth Required | Description                                                                                 |
| :----- | :------------------ | :------------ | :------------------------------------------------------------------------------------------ |
| `POST` | `/api/admin/verify` | None          | Verify Master Admin Key to unlock Cockpit (rate-limited to 30 req / 15 min)                 |
| `GET`  | `/api/admin/status` | Master Admin  | Returns admin session metadata, configured whitelist phone, and detailed storage topology   |

---

## 💻 Integration Code Samples

### Python (`requests`)

```python
import requests

GATEWAY_URL = "http://localhost:7860"
API_KEY = "wa_live_..."

def send_whatsapp_message(recipient_phone: str, text_message: str):
    url = f"{GATEWAY_URL}/api/messages/send"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
    payload = {
        "number": recipient_phone,
        "message": text_message
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Example dispatch:
res = send_whatsapp_message("201012345678", "Hello from Python!")
print(res)
```

### Node.js / TypeScript (`fetch`)

```typescript
const GATEWAY_URL = "http://localhost:7860";
const API_KEY = "wa_live_...";

async function sendWhatsApp(number: string, message: string) {
  const response = await fetch(`${GATEWAY_URL}/api/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
    },
    body: JSON.stringify({ number, message }),
  });

  return await response.json();
}

// Example dispatch:
sendWhatsApp("201012345678", "Hello from Node.js!").then(console.log);
```

### cURL

```bash
curl -X POST "http://localhost:7860/api/messages/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: wa_live_..." \
  -d '{
    "number": "201012345678",
    "message": "Hello from cURL!"
  }'
```

---

## 📮 Postman Collection

The repository includes a ready-to-import Postman Collection:
📄 **[`whatsapp-gateway.postman_collection.json`](./assets/whatsapp-gateway.postman_collection.json)**

### Included Folders:

- **Messages**: Text, media, bulk, and alias endpoints.
- **API Token Governance**: Generate, list, and revoke keys.
- **Activity & Audit Feed**: Paginated logs with query filters, single-record deletion, and clear feed.
- **OTP Verification**: Send and verify one-time passcodes.
- **WhatsApp Instance & Device Linking**: Status, QR code, phone pairing, and disconnect.
- **Webhooks**: Status, configuration, and test dispatch.
- **System & Health**: Liveness check.

---

## ⚙️ Environment Variables

| Variable               | Default                      | Description                                                        |
| :--------------------- | :--------------------------- | :----------------------------------------------------------------- |
| `PORT`                 | `7860`                       | HTTP server listening port                                         |
| `HOST`                 | `0.0.0.0`                    | Bind host address                                                  |
| `NODE_ENV`             | `development`                | Runtime environment (`development`, `production`, `test`)          |
| `WHATSAPP_ENGINE`      | `baileys`                    | Engine mode: `baileys` (embedded) or `evolution` (remote)          |
| `MONGODB_URI`          | _(empty)_                    | MongoDB connection URI. If provided, enables MongoDB storage. If blank, defaults to `./data` local files |
| `MONGODB_DB_NAME`      | `whatsapp_gateway`           | Database name to use in MongoDB (or database specified in URI)    |
| `SESSION_DATA_PATH`    | `./data/auth_info`           | Local fallback directory where WhatsApp session credentials persist|
| `ADMIN_API_KEY`        | _(auto-generated)_           | Master Admin Key for Web Cockpit, key management, QR code, and logs|
| `RATE_LIMIT_MAX`       | `60`                         | Max requests per rate limit window per IP                          |
| `RATE_LIMIT_WINDOW_MS` | `60000`                      | Rate limit window duration in milliseconds (default 1 min)         |
| `WHITELIST_PHONE_NUMBER`| `201012345678`              | Whitelist phone number used in tests and shown as UI placeholder   |
| `RECIPIENT_NUMBER`     | _(empty)_                    | Optional default recipient phone number for testing                |
| `WEBHOOK_URL`          | _(empty)_                    | Outbound webhook URL for incoming messages and delivery receipts   |
| `WEBHOOK_SECRET`       | _(empty)_                    | Secret key used to sign outbound webhook payloads with HMAC-SHA256 |
| `EVOLUTION_API_URL`    | `http://localhost:8080`      | URL of remote Evolution API instance (if using Evolution engine)   |
| `EVOLUTION_API_KEY`    | `my-super-secret-key-123456` | API key for remote Evolution API (if using Evolution engine)       |
| `INSTANCE_NAME`        | `test-bot`                   | Instance identifier (if using Evolution engine)                    |

### 🍃 MongoDB Persistence & Seamless Fallback (`MONGODB_URI`)

The gateway supports dual storage modes with zero breaking changes:

1. **Default Mode (Local JSON Files)**:
   - When `MONGODB_URI` is left blank or unset, the gateway stores all tokens, audit logs, auto-generated admin keys, webhook configuration, and WhatsApp session keys in the local `./data` directory.
   - Ideal for local development, VPS hosting with persistent disks, or Docker setups with attached volumes (`-v $(pwd)/data:/app/data`).

2. **MongoDB Cloud Mode (Zero Disk Dependency)**:
   - When `MONGODB_URI` is set in your environment (e.g. `mongodb+srv://...` or `mongodb://localhost:27017`), the gateway automatically links with MongoDB.
   - **Collections Used**:
     - `tokens`: API client tokens (`wa_live_...`).
     - `activities`: Full activity and dispatch audit trail.
     - `settings`: Master admin key and outbound webhook endpoint configuration.
     - `baileys_auth`: WhatsApp multi-device authentication credentials and Signal ratchet keys.
   - **Automatic Migration**: On initial startup with MongoDB connected, if the MongoDB collections are empty and local data exists in `./data`, the gateway automatically migrates your existing tokens, activity logs, admin secrets, and WhatsApp session credentials directly into MongoDB!
   - **Ideal For Ephemeral Platforms**: Deploy on **Hugging Face Spaces**, **Render.com**, **Fly.io**, or **Railway** without attaching persistent storage volumes. WhatsApp connections survive container restarts, scaling events, and redeployments seamlessly.
   - **Safe Fallback**: If the MongoDB URI is invalid or unreachable at boot, the gateway logs a clear warning and falls back safely to local file storage without crashing.

```ini
# Connect to MongoDB Atlas (Cloud)
MONGODB_URI=mongodb+srv://username:password@cluster0.abcde.mongodb.net/whatsapp_gateway?retryWrites=true&w=majority
MONGODB_DB_NAME=whatsapp_gateway

# Or connect to a local / self-hosted MongoDB
MONGODB_URI=mongodb://localhost:27017/whatsapp_gateway
```

### 📱 Whitelist Phone Number (`WHITELIST_PHONE_NUMBER`)

The gateway supports configuring a dedicated test and display phone number via the environment:

```ini
# Add your verified phone number (digits only with country code):
WHITELIST_PHONE_NUMBER=201012345678
```

- **Environment Fallbacks**: The gateway checks `WHITELIST_PHONE_NUMBER`, `WHITELIST_NUMBER`, and `RECIPIENT_NUMBER`. If none is specified, it defaults safely to `201012345678`.
- **Dynamic App Placeholders**: The backend automatically serves this number to authenticated admin sessions in `GET /api/admin/status` and `GET /api/instance/status` (while keeping public `/api/health` sanitized to protect your privacy). The Developer Cockpit client app dynamically injects it as the placeholder across:
  - Text Message Recipient input (`#text-msg-phone`)
  - Media Message Recipient input (`#media-msg-phone`)
  - OTP Recipient input (`#otp-recipient-phone`)
  - WhatsApp Pairing Code phone input (`#input-pairing-phone`)
  - Interactive code snippets (cURL, Python, Node.js, C#).
- **Automated Test Integration**: The test runner uses this number for all test requests and validations instead of hardcoded numbers.

---

## 🧪 Automated Testing

Run the automated integration test suite:

```bash
# Test with default local file storage
npm test

# Test with MongoDB storage (requires a local or test MongoDB instance)
npm run test:mongo
```

The test suite validates health checks, UI static assets, token lifecycle, auth middlewares, input validation, messaging endpoints, OTP flows, webhooks, instance management, MongoDB storage adapters, and paginated activity feed operations.

### Running Tests with a Custom Whitelist Recipient

You can test with any specific phone number by providing `WHITELIST_PHONE_NUMBER`:

```bash
# Windows PowerShell
$env:WHITELIST_PHONE_NUMBER="201099887766"; npm test

# Linux / macOS / Docker
WHITELIST_PHONE_NUMBER=201099887766 npm test
```

The test runner will confirm that `/api/health` remains sanitized (no private phone numbers or database connection URIs leaked) while `/api/admin/status` and `/api/instance/status` (with Master Admin key) dynamically reflect this whitelist number and will validate all messaging and pairing code flows with it.

---

## 🔒 Production Best Practices & Anti-Ban Safety

1. **Persistent Session Storage (MongoDB or Disk Mount)**: On cloud platforms with ephemeral disks (Render, Hugging Face Spaces, Railway, Fly.io, or container restarts), provide `MONGODB_URI` so your WhatsApp connection, tokens, and logs persist reliably across restarts without needing attached disk volumes. If using local file storage, attach a persistent volume to `./data/`.
2. **Warm Up New Phone Numbers**: When using a newly registered WhatsApp number, ramp up volume gradually (e.g., 20-50 messages per day initially) rather than blasting hundreds of messages on day one.
3. **Use Explicit Opt-In**: Only dispatch messages to users who explicitly opted in to avoid spam reports that trigger WhatsApp automated account restrictions.

---

## 📄 License

MIT License. Designed and engineered for high-performance WhatsApp messaging automation.
