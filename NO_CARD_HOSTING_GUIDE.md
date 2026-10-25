# 100% Free Hosting Guide (Zero Credit Card Required) 🚀

Because Render requires card verification and Hugging Face recently made Docker Spaces paid, here are the **verified 100% free alternatives that require absolutely NO credit card, NO debit card, and NO payment holds**.

---

## 🏆 Option 1: Back4App Containers (Best Cloud Choice)

[Back4App Containers](https://www.back4app.com/products/containers) allows deploying custom Docker containers directly from GitHub completely free **without entering any credit card or billing details**.

- **Cost**: \$0.00 / month (Free Tier).
- **Credit Card**: **ZERO / Not Required**.
- **Specs**: 0.25 vCPU, 256 MB RAM, 100 GB free monthly transfer.
- **WebSockets**: Persistent WebSockets fully supported.
- **Public Domain**: Automatic free HTTPS URL (`https://<app-name>.b4a.run`).

### Step-by-Step Instructions:
1. Go to [back4app.com](https://www.back4app.com/) and click **Sign Up** $\rightarrow$ choose **Continue with GitHub** (uses your `layanmoyura` account).
2. On your dashboard, click **Build a new App** $\rightarrow$ select **Containers as a Service (CaaS)**.
3. Click **Connect GitHub** and select your repository: **`layanmoyura/virtual_movie_room`**.
4. Configure the deployment:
   - **App Name**: `virtual-movie-room`
   - **Environment**: `Docker` (it automatically detects your `Dockerfile`)
   - **Port**: `7860`
5. Click **Deploy App**.
6. Back4App will build your container and give you your live public HTTPS URL:
   ```
   https://virtual-movie-room.b4a.run
   ```

---

## 🚀 Option 2: Zeabur (1-Click GitHub Deploy)

[Zeabur](https://zeabur.com) is a modern cloud platform with a **free plan that does not ask for credit card information**.

- **Cost**: \$0.00 / month (Free Plan).
- **Credit Card**: **ZERO / Not Required**.
- **Builds**: Automatically detects and builds your Dockerfile.
- **Domain**: Free `*.zeabur.app` public HTTPS subdomain.

### Step-by-Step Instructions:
1. Go to [zeabur.com](https://zeabur.com) and click **Login** $\rightarrow$ **Continue with GitHub**.
2. Click **Create Project** $\rightarrow$ choose a region (e.g. Asia/Singapore or US).
3. Click **Deploy New Service** $\rightarrow$ select **Git**.
4. Choose **`layanmoyura/virtual_movie_room`** and branch `main`.
5. Zeabur automatically detects the `Dockerfile` and builds it.
6. Once deployed, click **Networking** $\rightarrow$ **Generate Domain** to get your free public URL:
   ```
   https://virtual-movie-room.zeabur.app
   ```

---

## ⚡ Option 3: Cloudflare Quick Tunnel (Instant 1-Command, 0 Cloud Setup)

If you want to watch movies with friends right now from your laptop without deploying to an external cloud provider:

Cloudflare provides free **Quick Tunnels** (`trycloudflare.com`). It securely exposes your local server to Cloudflare's global edge network with **automatic HTTPS, full WebSocket support, and zero signups or credit cards**.

### Step-by-Step Instructions:
1. **Terminal 1**: Start your Virtual Movie Room server locally:
   ```powershell
   npm run build
   npm start
   ```
   *(Server starts listening on `http://localhost:7860`)*

2. **Terminal 2**: Start the secure Cloudflare tunnel:
   ```powershell
   npx untun@latest tunnel http://localhost:7860
   ```

3. It will immediately print a global HTTPS URL:
   ```
   https://random-words-1234.trycloudflare.com
   ```

4. Anyone in the world can open that URL on their mobile browser or computer and join your watch party in real time!
