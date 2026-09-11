# 💬 WhatsApp REST API Gateway

A lightweight, standalone **Express.js REST API microservice** to send WhatsApp messages from any application (Python scripts, SaaS backends, mobile apps, webhooks).

Runs inside **1 single Docker container** with **zero external databases** (no PostgreSQL, no Redis, no Docker Compose needed).

---

## ⚡ Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```

1. Open **`http://localhost:7860`** in your browser.
2. Link your WhatsApp:
   - **Option A (QR Code)**: Scan the QR code with WhatsApp (**Settings** &rarr; **Linked Devices** &rarr; **Link a Device**).
   - **Option B (Phone Number)**: Click *"Link with Phone Number"*, enter your number, and type the 8-digit pairing code into WhatsApp.
3. Send your first message:
```bash
curl -X POST "http://localhost:7860/api/messages/send" \
  -H "Content-Type: application/json" \
  -d '{"number": "201012345678", "message": "Hello from my API!"}'
```

---

---

## 🚀 Cloud Deployment

### Option A: Render.com (Recommended Free Cloud Hosting)

The repository includes a `render.yaml` blueprint ready for 1-click deployment.

1. Push this project to your GitHub repository.
2. Sign up at [Render.com](https://render.com) (free).
3. Click **New +** &rarr; **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
   - **Health Check Path**: `/api/health`
6. Under **Environment Variables**, add:
   - `GATEWAY_API_KEY`: *(Your generated API key, e.g. `wa_...`)*
7. Click **Create Web Service**.
8. Once deployed, open your `https://<your-service>.onrender.com` dashboard and link your WhatsApp.

> [!IMPORTANT]
> **Keep Free Tier Awake (24/7)**:
> Render Free Web Services sleep after 15 minutes of inactivity. Set up a free monitor at [UptimeRobot](https://uptimerobot.com) or [cron-job.org](https://cron-job.org) to ping `GET https://<your-service>.onrender.com/api/health` every 10 minutes to keep your container awake 24/7.

---

### Option B: Hugging Face Spaces

1. Create a **New Space** on [Hugging Face](https://huggingface.co/spaces).
   - **SDK**: `Docker` (Blank template).
   - **Port**: `7860` *(already configured in Dockerfile)*.
2. Push this repository:
   ```bash
   git init
   git remote add origin https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
   git add .
   git commit -m "Deploy WhatsApp Gateway"
   git push -u origin main
   ```
3. In Space **Settings** &rarr; **Variables and secrets**, add `GATEWAY_API_KEY`.
4. Open your Space URL, link your WhatsApp, and dispatch messages.

---

## 🔑 API Key Authentication & Generation

Secure your gateway so only your authorized projects can dispatch messages.

### 1. How to Generate an API Key
Generate a cryptographically secure random key with one command:

- **Using Node.js:**
  ```bash
  node -e "console.log('wa_' + crypto.randomBytes(24).toString('hex'))"
  ```
- **Using PowerShell (Windows):**
  ```powershell
  "wa_" + [System.Guid]::NewGuid().ToString("N")
  ```
- **Using Bash / Linux / macOS:**
  ```bash
  openssl rand -hex 24
  ```

### 2. How to Configure the Key
- **Locally:** In your `.env` file:
  ```env
  GATEWAY_API_KEY=wa_9f83a2b1c4e5d6f708192a3b4c5d6e7f8091a2b3c4d5e6f7
  ```
- **On Hugging Face Spaces:** Under Space **Settings** &rarr; **Variables and secrets** &rarr; **New secret**:
  - Name: `GATEWAY_API_KEY`
  - Value: `wa_9f83a2b1c4e5d6f708192a3b4c5d6e7f8091a2b3c4d5e6f7`

### 3. Multiple Project Keys (Comma-Separated)
You can specify multiple keys separated by commas in `GATEWAY_API_KEY` so each project has its own key:
```env
GATEWAY_API_KEY=key_store_app,key_crm_backend,key_python_scripts
```
Requests using any one of these keys will be accepted.

### 4. How to Pass the Key in Requests
The API accepts the key through any of these 3 methods:
1. **`x-api-key` header** *(Recommended)*:
   ```http
   x-api-key: YOUR_KEY
   ```
2. **Bearer Token header**:
   ```http
   Authorization: Bearer YOUR_KEY
   ```
3. **Query Parameter**:
   ```text
   ?api_key=YOUR_KEY
   ```

*(If `GATEWAY_API_KEY` is left blank, authentication is bypassed for easy local development).*

---

## 📡 API Reference

Base URL: `http://localhost:7860` or `https://YOUR_SPACE.hf.space`

### 1. Send Messages

#### Single Message
`POST /api/messages/send` *(or `POST /api/send-message`)*

**Headers:**
```http
Content-Type: application/json
x-api-key: YOUR_GATEWAY_API_KEY
```

**Request Body:**
```json
{
  "number": "201012345678",
  "message": "Your order #1042 has shipped!"
}
```
*Note: Accepts `number`, `phone`, `to`, or `phoneNumber` (digits with country code).*

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "WhatsApp message sent successfully.",
  "data": {
    "recipient": "201012345678",
    "messageId": "3EB09F2A9318",
    "status": "SENT",
    "timestamp": "2026-09-12T01:00:00.000Z"
  }
}
```

#### Bulk Messages
`POST /api/messages/send-bulk`

Sends sequentially with built-in anti-spam delay between dispatches.

**Request Body:**
```json
{
  "numbers": ["201012345678", "15551234567"],
  "message": "Server maintenance scheduled for 10 PM tonight."
}
```

---

### 2. OTP Verification

#### Request OTP
`POST /api/otp/send`

Generates a secure 6-digit numeric OTP and delivers it via WhatsApp.

**Request Body:**
```json
{
  "number": "201012345678",
  "appName": "My App",
  "length": 6,
  "expiresInMinutes": 5
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "OTP code generated and dispatched via WhatsApp.",
  "phoneNumber": "201012345678",
  "expiresInSeconds": 300,
  "messageId": "3EB09F2A9318"
}
```

#### Verify OTP
`POST /api/otp/verify`

Validates user-submitted OTP code (invalidates after 3 wrong attempts or 5 min TTL).

**Request Body:**
```json
{
  "number": "201012345678",
  "code": "481920"
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

### 3. Device & Connection Management

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/instance/status` | Connection status (`open`, `connecting`, `disconnected`) |
| `GET` | `/api/instance/qr` | Get current base64 QR code |
| `POST`| `/api/instance/pairing-code` | Request 8-digit pairing code (`{"number": "2010..."}`) |
| `POST`| `/api/instance/connect` | Force socket reconnect |
| `POST`| `/api/instance/restart` | Restart internal WhatsApp client |
| `POST`| `/api/instance/logout` | Unlink device and reset session |
| `GET` | `/api/health` | Container health and uptime check |

---

## 💻 How to Call from Your Projects

### Python (`requests`)
```python
import requests

GATEWAY_URL = "https://YOUR_SPACE.hf.space"
API_KEY = "wa_9f83a2b1c4e5d6f708192a3b4c5d6e7f8091a2b3c4d5e6f7"

def send_whatsapp(number: str, text: str):
    response = requests.post(
        f"{GATEWAY_URL}/api/messages/send",
        headers={
            "Content-Type": "application/json",
            "x-api-key": API_KEY
        },
        json={
            "number": number,
            "message": text
        }
    )
    return response.json()

# Example:
res = send_whatsapp("201012345678", "Hello from Python!")
print(res)
```

### Node.js / JavaScript (`fetch`)
```javascript
const GATEWAY_URL = "https://YOUR_SPACE.hf.space";
const API_KEY = "wa_9f83a2b1c4e5d6f708192a3b4c5d6e7f8091a2b3c4d5e6f7";

async function sendWhatsApp(number, message) {
  const res = await fetch(`${GATEWAY_URL}/api/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({ number, message })
  });
  return await res.json();
}

// Example:
sendWhatsApp("201012345678", "Hello from Node.js!").then(console.log);
```

### cURL
```bash
curl -X POST "https://YOUR_SPACE.hf.space/api/messages/send" \
  -H "Content-Type: application/json" \
  -H "x-api-key: wa_9f83a2b1c4e5d6f708192a3b4c5d6e7f8091a2b3c4d5e6f7" \
  -d '{"number": "201012345678", "message": "Hello from cURL!"}'
```

---

## 📮 Postman Collection

Import the included file into Postman for ready-to-use requests:
📄 **`whatsapp-gateway.postman_collection.json`**

Set your collection variables under the **Variables** tab:
- `baseUrl`: `http://localhost:7860` or your Space URL
- `apiKey`: Your generated key
- `recipientNumber`: Destination phone number

---

## ⚙️ Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `7860` | Server listening port (HF Spaces default) |
| `HOST` | `0.0.0.0` | Bind host address |
| `GATEWAY_API_KEY` | *(empty)* | API key(s) to secure endpoints. Empty = open mode. Supports comma-separated keys |
| `WHATSAPP_ENGINE` | `baileys` | `baileys` (embedded 1-container) or `evolution` (remote API) |
| `SESSION_DATA_PATH`| `./data/auth_info` | Local directory where WhatsApp session keys persist |
| `RATE_LIMIT_MAX` | `60` | Max requests per minute per IP |

---

## 🔒 Production & Reliability Tips

1. **Keep Free Spaces Awake**:
   Hugging Face Spaces sleep after inactivity on the free tier. Use a free service like [UptimeRobot](https://uptimerobot.com) to ping `GET /api/health` every 10 minutes to keep your container running 24/7.
2. **Session Persistence**:
   Auth keys are stored in `./data/auth_info/`. On Hugging Face Spaces with Persistent Storage attached to `/data`, set `SESSION_DATA_PATH=/data/auth_info` to ensure credentials survive full container rebuilds.
3. **Anti-Ban Safety**:
   - Use a dedicated SIM card for automation.
   - Do not blast hundreds of messages on day one with a new number (warm it up gradually).
   - Only message users who opted in to receive notifications.

---

## 📁 Project Structure

```text
├── Dockerfile                  # Single-container production build
├── package.json                # Dependencies and npm scripts
├── test-api.js                 # Automated API test suite
├── whatsapp-gateway.postman_collection.json # Postman collection
├── src/
│   ├── server.js               # Entry point (port 7860)
│   ├── app.js                  # Express middleware and routes
│   ├── config/env.js           # Configuration loader
│   ├── controllers/            # Route handlers (message, otp, instance, health)
│   ├── middlewares/            # Auth (x-api-key), validation, rate limiter, errors
│   ├── services/               # Baileys engine, OTP store, unified dispatcher
│   └── public/                 # Web dashboard & QR pairing UI
└── data/auth_info/             # WhatsApp session keys (persisted)
```

---

## 🧪 Testing

Run the automated test suite locally:
```bash
npm test
```

---

## License

MIT
