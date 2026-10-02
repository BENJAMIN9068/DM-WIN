# DMFirst Full-Stack Gaming & Multi-Gateway Platform

Enterprise-grade full-stack platform featuring interactive gaming engines, centralized wallet balance synchronization, real-time live result prediction engines (WinGo, K3, 5D, TRX WinGo, Aviator crash), admin management console, and 4 standalone UPI payment gateways.

---

## 🚀 Quick Start (Local Run)

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Server:**
   ```bash
   npm start
   ```

3. **Open in Browser:**
   - **Frontend:** [http://localhost:3000](http://localhost:3000)
   - **Admin Console:** [http://localhost:3000/#/FORNTMAN-OG](http://localhost:3000/#/FORNTMAN-OG)

---

## ☁️ Deployment on Render.com

This repository is pre-configured for one-click deployment on **Render.com** (via `render.yaml` or direct Web Service):

1. **Create a New Web Service** on Render.
2. **Connect this GitHub Repository:** `https://github.com/helpingfutureai-eng/myserver`
3. **Configure Settings:**
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_VERSION`: `20.10.0`
     - `PORT`: (Auto-assigned by Render, defaults to `10000`)
4. **Deploy!** The site will automatically build and bind to the public Render domain with full HTTPS and WSS WebSocket support.

---

## 💳 4 Independent UPI Gateways

All gateways feature large QR display, dynamic amount binding, strict 10–12 digit UTR verification, name input, payment proof screenshot upload, and pending review dispatch to the admin console:

- **`/upi-qr`**: Official BHIM / NPCI UPI Gateway
- **`/upixqr`**: UPI-X Cyberpunk Neon Gateway
- **`/wallet-qr`**: FinTech Luxury E-Wallet Gateway
- **`/paytmqr`**: Paytm Soundbox Verified Gateway

*Each gateway can be turned ON/OFF in real-time or have its QR code updated via the Admin Console under the **Gateways** tab.*

---

## 🛡️ Admin Panel (`/#/FORNTMAN-OG`)

- **Route:** `/#/FORNTMAN-OG`
- **Default Credentials:**
  - **Username:** `admin`
  - **Password:** `admin@FORNTMAN2026!`
- **Key Modules:**
  - **Dashboard:** 100% real-time KPIs, transaction activity, and gateway volumes.
  - **Gateways:** Real-time ON/OFF switches and custom QR code image uploads.
  - **Recharges:** Review user UTRs, view full-resolution payment proofs, and approve recharges to credit balances instantly.
  - **Users:** Search, inspect balances, and adjust accounts.
  - **Hack Bots / Engine:** Unified prediction declarations and user-specific result overrides.
  - **Audit Logs:** Full system event telemetry.
