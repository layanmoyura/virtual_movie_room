# Free Hosting Guide: Deploying Virtual Movie Room on Render 🚀

This guide explains how to host **Virtual Movie Room** completely free on the internet using [Render](https://render.com). 

- **Cost**: \$0.00 / month (Free Tier).
- **Credit Card**: None required.
- **Region**: Singapore (Southeast Asia).
- **Features**: Automatic HTTPS/WSS, persistent WebSockets, multi-stage Docker build, and continuous deployment from GitHub.

---

## 📋 Prerequisites

1. Your GitHub repository: [https://github.com/layanmoyura/virtual_movie_room](https://github.com/layanmoyura/virtual_movie_room).
2. A free Render account (sign up via GitHub in 10 seconds).

---

## 🛠️ Step-by-Step Deployment Options

You can deploy using either **Method 1 (1-Click Blueprint)** or **Method 2 (Manual Dashboard)**. Both take less than 2 minutes.

---

### Option 1: 1-Click Blueprint Deployment (Recommended)

Because this repository already contains [render.yaml](file:///c:/Users/acer/Downloads/virtual_movie_room/render.yaml), Render can configure the entire service automatically:

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click the **New +** button in the top navigation bar.
3. Select **Blueprint**.
4. Connect your GitHub account and select repository: **`layanmoyura/virtual_movie_room`**.
5. Render will automatically read `render.yaml` and set:
   - **Service Name**: `virtual-movie-room`
   - **Environment**: `Docker`
   - **Region**: `Singapore`
   - **Plan**: `Free`
   - **Health Check**: `/health`
6. Click **Apply**.
7. Render will build the Docker container and deploy your live app!

---

### Option 2: Manual Web Service Setup

If you prefer to configure it manually through the Render dashboard:

1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Under **Git Provider**, select your GitHub account and choose **`layanmoyura/virtual_movie_room`**.
4. Fill in the following settings:
   - **Name**: `virtual-movie-room` (or your chosen subdomain name).
   - **Region**: **Singapore** (recommended for lowest latency in Asia).
   - **Branch**: `main`.
   - **Runtime**: **Docker**.
   - **Instance Type**: **Free** (\$0/month, 512 MB RAM, shared CPU).
5. Scroll down to **Advanced** and set:
   - **Health Check Path**: `/health`.
   - **Environment Variables**:
     - `NODE_ENV` = `production`
     - `PORT` = `3000`
6. Click **Create Web Service**.

---

## ⏱️ What Happens Next? (Build & Go Live)

1. **Building Container**: Render will fetch the repository, run the multi-stage `Dockerfile`, build the shared workspace, compile the TypeScript backend, and bundle the React SPA.
2. **Health Probe**: Once the container launches, Render pings `/health` to verify that the HTTP and WebSocket servers are healthy.
3. **Public URL Activated**: In the top left of your Render dashboard, you will see your live URL:
   ```
   https://virtual-movie-room-XXXX.onrender.com
   ```
   *(Render automatically generates and attaches a free SSL/TLS certificate, enabling secure HTTPS and WSS connections).*

---

## 🎬 Testing Your Live Watch Party

1. Open your live URL in your browser: `https://virtual-movie-room-XXXX.onrender.com`.
2. Click **Create Room** to start a new watch party.
3. Copy the invite link or 6-character room code (e.g. `MV-7K2X`).
4. Send the link to a friend on another device or network.
5. Paste any direct video URL (`.mp4`, `.webm`) or test YouTube link to enjoy synchronized playback and live chat!

---

## 💡 Free Tier Notes & Behavior

- **750 Free Hours / Month**: Render provides 750 free instance hours every month, which is more than enough to run your service all month long.
- **Inactivity Sleep**: On the free tier, when a room has been inactive with 0 visitors for **15 minutes**, Render puts the container to sleep to conserve resources.
- **Wake-up on Demand**: As soon as anyone visits your URL, Render automatically wakes the container up within **30 to 45 seconds**. Once awake, playback and synchronization are fast and responsive.
- **Continuous Deployment**: Whenever you push changes to your GitHub `main` branch (`git push origin main`), Render automatically detects the commit, rebuilds the Docker container, and updates your live app with zero downtime!
