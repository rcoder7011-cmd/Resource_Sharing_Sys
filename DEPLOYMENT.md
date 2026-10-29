# Production Deployment & Security Hardening Guide

This document outlines the production deployment procedure for the **Resource Sharing Platform — “Unlock Underused Equipment and Spaces”**.

---

## 1. Production Architecture Overview

```
                      +-----------------------------+
                      |      Client Application      |
                      |  React 19 + Vite (Vercel)   |
                      +--------------+--------------+
                                     |
               HTTPS (REST API)      |  WSS (Socket.IO Real-Time)
                                     v
                      +-----------------------------+
                      |       Backend Service       |
                      |     Node.js / Express       |
                      |       (Render.com)          |
                      +--------------+--------------+
                                     |
                         TLS / SRV Connection
                                     v
                      +-----------------------------+
                      |     MongoDB Atlas Cluster   |
                      |      ResourceSharingDb      |
                      +-----------------------------+
```

- **Frontend Hosting**: [Vercel](https://vercel.com) (Static Edge CDN with SPA routing rewrites via `vercel.json`)
- **Backend Hosting**: [Render](https://render.com) (Node.js Web Service with automatic SSL and persistent WebSockets)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Managed M8/Serverless M0 Cluster with TLS 1.3)
- **Real-Time Communication**: Socket.IO attached to existing HTTP server with JWT authentication handshake

---

## 2. Step 1: MongoDB Atlas Configuration

### A. Network Access / IP Access List
1. In the MongoDB Atlas Dashboard, navigate to **Security** → **Network Access**.
2. **Do NOT leave access permanently open to `0.0.0.0/0` in production.**
3. Add the outbound IP addresses provided by your backend host (e.g., Render Outbound Static IPs for your region), or temporarily authorize your administrative deployment IP during setup.
4. If using Render Free tier without dedicated outbound IPs, restrict access to the specific CIDR block of the cloud region (e.g. AWS `us-east-1` or `us-west-2` blocks).

### B. Database User Privileges
1. In **Security** → **Database Access**, create an application database user (e.g., `app_service_prod`).
2. Grant **Least-Privilege** permissions:
   - Role: `readWrite` on the database `ResourceSharingDb` only.
   - Do NOT grant `atlasAdmin` or cluster-wide privileges.
3. Obtain the connection string in SRV format:
   ```text
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/ResourceSharingDb?retryWrites=true&w=majority
   ```

---

## 3. Step 2: Backend Deployment on Render

### A. Create Web Service
1. Connect your Git repository in the [Render Dashboard](https://dashboard.render.com).
2. Choose **New Web Service** and select your repository.
3. Configure the following build & runtime settings:
   - **Name**: `resource-sharing-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

### B. Configure Environment Variables
Set the following environment variables in the Render dashboard (**Environment** tab):

| Variable Name | Required | Description / Value |
|---|---|---|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | `10000` (Render provides and binds this automatically) |
| `CLIENT_URL` | Yes | URL of your deployed Vercel frontend, e.g. `https://your-platform.vercel.app` (comma-separated if multiple) |
| `MONGODB_URI` | Yes | Your MongoDB Atlas connection URI with strong credentials |
| `JWT_SECRET` | Yes | Cryptographically secure random string (min 32 characters). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Yes | `1d` or `7d` |
| `ENABLE_CUSTOM_DNS` | No | `false` (Cloud Linux containers should use platform DNS) |

---

## 4. Step 3: Frontend Deployment on Vercel

### A. Import Project
1. Log in to [Vercel](https://vercel.com) and click **Add New...** → **Project**.
2. Select your Git repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### B. Configure Environment Variables
In the Vercel project settings, set:

| Variable Name | Value |
|---|---|
| `VITE_API_URL` | `https://your-backend.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://your-backend.onrender.com` |

*(Note: `VITE_SOCKET_URL` points to the root of the backend server without `/api`).*

### C. SPA Routing Rewrites
The project includes [`client/vercel.json`](file:///c:/Users/Asus/Desktop/Hackathons/Resourcce%20sharing%20platform/client/vercel.json) to ensure deep routes (such as `/resources/:id`, `/dashboard`, and `/admin`) resolve to `index.html` on refresh without 404 errors.

---

## 5. Step 4: Initial Administrator Provisioning

Never create an administrator account through public registration or expose administrative credentials in client code.

To provision the first institutional administrator in production:
1. Open the Render Web Service dashboard and access the **Shell** console.
2. Run the secure administrative provisioning script:
   ```bash
   node src/scripts/seedAdmin.js --email admin@institution.edu --password "SecureAdminPassword123!" --name "Lead Administrator"
   ```
3. The script hashes the password with bcrypt, sets `role: 'admin'`, marks `status: 'active'`, and records an `ADMIN_INITIALIZED` event in the immutable `AuditLog`.

---

## 6. Post-Deployment Verification Checklist

Once deployed, verify the system using these exact endpoints:

1. **Liveness Probe**:
   ```bash
   curl -I https://your-backend.onrender.com/api/health
   # Expected: HTTP 200 OK
   ```
2. **Readiness Probe**:
   ```bash
   curl -I https://your-backend.onrender.com/api/health/ready
   # Expected: HTTP 200 OK (or 503 if database is disconnected)
   ```
3. **Security Headers**:
   ```bash
   curl -I https://your-backend.onrender.com/
   # Verify absence of X-Powered-By
   # Verify presence of X-Content-Type-Options: nosniff
   # Verify presence of X-Frame-Options: SAMEORIGIN
   # Verify presence of Strict-Transport-Security
   ```
4. **CORS Restrictions**:
   ```bash
   curl -H "Origin: https://malicious-site.com" -I https://your-backend.onrender.com/api/health
   # Expected: HTTP 403 Forbidden (Blocked by CORS policy)
   ```
5. **Rate Limiting**:
   Attempt rapid repeated POSTs to `/api/auth/login`. Verify that `429 Too Many Requests` is returned with a `Retry-After` header after threshold is reached.

