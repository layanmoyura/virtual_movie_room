# Virtual Movie Room --- Infrastructure & Operating Cost Estimation

This document provides a comprehensive financial model, traffic formulas, infrastructure pricing tiers, and cost-reduction strategies for hosting and operating **Virtual Movie Room**.

---

## 1. Architectural Cost Advantages

The Virtual Movie Room architecture is uniquely cost-efficient because of three core design decisions:

1. **Zero Video Proxying**:
   - The backend server **never** streams, proxies, or transcodes media files.
   - Direct MP4/WebM videos are fetched directly by client browsers from source servers.
   - Embeds (YouTube, Vimeo) are delivered directly by their native global CDNs.
   - **Cost to Virtual Movie Room: \$0.00**.
2. **P2P WebRTC Mesh for Screen Sharing**:
   - Screen and tab video streams travel directly from peer to peer using WebRTC.
   - The backend server acts only as a signaling relay for lightweight SDP offers and ICE candidates.
   - **Cost to Virtual Movie Room: \$0.00** for all direct P2P connections.
3. **Ultra-Lightweight In-Memory State**:
   - The WebSocket server manages room presence, heartbeats, and chat messages in volatile RAM.
   - Total network footprint per participant is $\approx 1 \text{ KB/s}$ ($\le 4 \text{ MB/hour}$).
   - A single 512 MB RAM container easily supports hundreds of concurrent rooms.

---

## 2. Bandwidth & Traffic Mathematics

### 2.1 WebSocket Data Transfer
- **Sync Heartbeat**: 1 event every 2.5 seconds $= 80 \text{ bytes/s}$.
- **Chat & Presence**: $\approx 500 \text{ bytes/min} \approx 8 \text{ bytes/s}$.
- **Average Participant Bandwidth**: $\approx 100 \text{ bytes/s} \approx 0.1 \text{ KB/s}$ (idle) to $1.2 \text{ KB/s}$ (active chat & sync).
- **Hourly Consumption**: $1 \text{ KB/s} \times 3,600 \text{ s} = 3.6 \text{ MB / participant / hour}$.
- **1,000 participant hours** $= 3.6 \text{ GB}$ of bandwidth.

### 2.2 WebRTC STUN vs TURN Bandwidth
- **STUN (Direct P2P)**: Google STUN (`stun:stun.l.google.com:19302`) is 100% free and unlimited. Over 80–85% of home/mobile connections connect directly.
- **TURN (Relay for Symmetric Firewalls)**: $\sim 15\%$ of sessions require relay.
  - 720p 30fps screen share stream: $\approx 1.5 \text{ Mbps} = 675 \text{ MB/hour}$.
  - Metered.ca Free Tier provides **50 GB/month** free TURN relay.
  - Free quota capacity: $\frac{50,000 \text{ MB}}{675 \text{ MB}} \approx 74 \text{ hours}$ of relayed screen sharing every month at **\$0.00**.
  - Overage rate (if quota exceeded): $\$0.04 \text{ per GB}$ ($\approx \$0.027 \text{ per hour}$).

---

## 3. Cost Projection by Tier

### Tier 0: Free / Hobby (0 – 500 Monthly Active Users)
*Best for MVP launch, personal rooms, development, and testing.*
- **Backend & WebSocket**: Render Free Tier (512 MB RAM, shared CPU) or Fly.io free tier: **\$0.00/mo**
- **Frontend Delivery**: Unified container or Cloudflare Pages: **\$0.00/mo**
- **WebRTC STUN**: Google Public STUN: **\$0.00/mo**
- **WebRTC TURN**: Metered.ca (50 GB free/mo): **\$0.00/mo**
- **CI/CD**: GitHub Actions (Free public / 2,000 free private mins): **\$0.00/mo**
- **Domain & SSL**: Platform subdomain (`*.onrender.com` / `*.up.railway.app`): **\$0.00/mo**
- **Total Estimated Cost**: **\$0.00 / month**

---

### Tier 1: Starter Production (500 – 2,000 Monthly Active Users)
*Best for reliable 24/7 watch parties with no server sleeping, custom domain, and fast response times.*
- **Backend & WebSocket**: Render Starter (\$7/mo) or Railway Hobby (\$5/mo) or Hetzner VPS (\$4.50/mo): **\$7.00/mo**
- **Frontend Delivery**: Cloudflare Free CDN & SSL: **\$0.00/mo**
- **WebRTC STUN & TURN**: Google STUN (\$0) + Metered.ca free tier: **\$0.00/mo**
- **Custom Domain**: Annual domain registration (\$12/year): **\$1.00/mo**
- **CI/CD**: GitHub Actions: **\$0.00/mo**
- **Total Estimated Cost**: **\$8.00 / month**

---

### Tier 2: Growth Stage (10,000 – 50,000 Monthly Active Users)
*Best for public community parties with concurrent rooms across different regions.*
- **Backend Compute**: 3x 512 MB load-balanced containers: **\$21.00/mo**
- **State Coordination**: Serverless Upstash Redis (pub/sub for multi-node sync): **\$10.00/mo**
- **WebRTC TURN Relay**: Paid TURN bandwidth (~375 GB relay @ \$0.04/GB): **\$15.00/mo**
- **CDN & Security**: Cloudflare Free or Pro: **\$0.00 - \$20.00/mo**
- **Custom Domain & SSL**: **\$1.00/mo**
- **Total Estimated Cost**: **\$47.00 – \$67.00 / month**

---

### Tier 3: Scale (100,000+ Monthly Active Users)
*High-traffic deployment with enterprise-grade availability.*
- **Compute Cluster**: Kubernetes or ECS cluster (4–8 nodes): **\$70.00 – \$120.00/mo**
- **Managed Redis Cluster**: Redis ElastiCache / Redis Cloud: **\$30.00/mo**
- **TURN Relay Network**: Dedicated Coturn VPS or 1,500 GB metered relay: **\$60.00/mo**
- **Cloudflare Pro / Enterprise**: **\$20.00/mo**
- **CI/CD & Monitoring**: Sentry + extra GitHub Actions runner minutes: **\$20.00/mo**
- **Total Estimated Cost**: **\$200.00 – \$250.00 / month**

---

## 4. Cost Optimization & Monitoring Strategies

1. **Ephemeral Room Auto-Cleanup**: The 2-hour inactivity sweep ensures memory is immediately freed, preventing memory bloat and eliminating the need for expensive larger RAM instances.
2. **Heartbeat Throttling**: Restrict host sync heartbeat to 1 event every 2.5 seconds rather than every frame (60fps), reducing WebSocket network traffic by 98%.
3. **P2P STUN Prioritization**: Configure WebRTC ICE candidates to always attempt direct host-to-host and STUN connections first, falling back to TURN relay only when direct connection times out.
4. **Single-Port Unified Container**: Serving static assets directly from Node.js or Caddy prevents multi-service routing fees and eliminates complex cross-cloud egress charges.
