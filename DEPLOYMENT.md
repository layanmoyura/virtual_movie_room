# Virtual Movie Room --- Hosting, Deployment & CI/CD Guide

This document describes how to deploy, containerize, and configure continuous integration and continuous deployment (CI/CD) for **Virtual Movie Room**.

---

## 1. Deployment Architecture

Virtual Movie Room uses a **unified production container** architecture:
- A single Node.js process handles both the HTTP static asset delivery (React SPA) and persistent WebSocket connections (`ws`).
- This design eliminates CORS cross-origin configuration issues, requires only a single SSL/TLS certificate, and operates on a single exposed port (default: `3000`).

```
Internet (HTTPS / WSS)
         |
   Reverse Proxy / PaaS (Cloudflare / Render / Caddy / Nginx)
         |
  [Port 3000 / Single Container]
  ├── /api, /health, /ws  -> Node.js HTTP & WebSocket Server
  └── /*                  -> Static Client Assets (client/dist) with SPA fallback
```

---

## 2. Environment Variables

Configure these environment variables in your hosting dashboard or `.env` file:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Set to `production` in live environments. |
| `PORT` | `3000` | Port for the HTTP and WebSocket server. |
| `MAX_PARTICIPANTS` | `20` | Maximum participants allowed per room. |
| `ROOM_INACTIVITY_HOURS` | `2` | Number of idle hours before a room is automatically swept. |
| `STUN_SERVERS` | `stun:stun.l.google.com:19302` | Comma-separated list of STUN servers for WebRTC NAT traversal. |
| `TURN_SERVER_URL` | *Optional* | Optional TURN server URL (e.g. `turn:turn.example.com:3478`). |
| `TURN_USERNAME` | *Optional* | Optional TURN authentication username. |
| `TURN_CREDENTIAL` | *Optional* | Optional TURN authentication credential. |
| `RATE_LIMIT_CHATS_PER_SEC`| `5` | Maximum chat messages per 3-second window per user. |

---

## 3. Containerization (Docker)

### 3.1 Multi-Stage Dockerfile

```dockerfile
# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared ./shared
COPY server ./server
COPY client ./client
RUN npm ci
RUN npm run build

# Stage 2: Minimal Production Runtime
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Security: Run as non-root user
USER node

# Copy application assets
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/shared/dist ./shared/dist
COPY --chown=node:node --from=builder /app/server/dist ./server/dist
COPY --chown=node:node --from=builder /app/client/dist ./client/dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server/dist/index.js"]
```

### 3.2 Building and Running Locally

```bash
# Build the Docker image
docker build -t virtual-movie-room:latest .

# Run the container
docker run -d -p 3000:3000 --name vmr virtual-movie-room:latest

# Check health status
docker inspect --format='{{json .State.Health}}' vmr
```

---

## 4. Hosting Platform Guides

### 4.1 Deploying on Render (PaaS)
1. Fork or push your repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Web Service**.
4. Select your `virtual_movie_room` repository.
5. Configure:
   - **Environment**: `Docker`
   - **Instance Type**: Free or Starter
   - **Health Check Path**: `/health`
6. Add environment variable: `NODE_ENV=production`.
7. Click **Deploy Web Service**. Render provides automatic HTTPS, persistent WebSockets, and health checks.

### 4.2 Deploying on Railway (PaaS)
1. Log into [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Railway automatically detects the `Dockerfile`.
4. Under **Variables**, set `NODE_ENV=production` and `PORT=3000`.
5. Under **Settings**, generate a public domain (e.g. `your-app.up.railway.app`).

### 4.3 Deploying on Fly.io
1. Install Fly CLI: `flyctl auth login`.
2. Run `fly launch` in the project root.
3. Verify that `fly.toml` sets internal port to `3000` and configures health checks.
4. Run `fly deploy`.

### 4.4 Self-Hosted VPS with Docker Compose & Caddy

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  app:
    image: virtual-movie-room:latest
    build: .
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    expose:
      - "3000"
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  caddy_data:
  caddy_config:
```

#### `Caddyfile` (Automatic HTTPS with Let's Encrypt)
```caddy
your-domain.com {
    reverse_proxy app:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

---

## 5. Continuous Integration & Deployment (CI/CD)

### 5.1 CI Workflow (`.github/workflows/ci.yml`)
Runs on every Pull Request and push to `main`:
1. **Typecheck & Linting**: Runs `tsc --noEmit` on `shared`, `server`, and `client`.
2. **Automated Tests**: Executes unit and integration test suite.
3. **Security Audit**: Runs `npm audit --audit-level=high`.
4. **Build Verification**: Builds production artifacts to prevent broken deployments.

### 5.2 CD Workflow (`.github/workflows/deploy.yml`)
Runs automatically when CI passes on `main`:
1. Logs into GitHub Container Registry (`ghcr.io`).
2. Builds and tags multi-platform Docker images.
3. Pushes image to registry.
4. Triggers deploy webhook on hosting provider (e.g. Render / Railway).

---

## 6. WebRTC NAT Traversal (STUN/TURN)

- **STUN**: Included by default via Google's public STUN servers (`stun:stun.l.google.com:19302`). Enables direct peer-to-peer media transmission across standard home and mobile NATs.
- **TURN**: When users are behind strict corporate or symmetric firewalls where direct P2P is blocked, a TURN relay server relays the encrypted media stream.
  - To enable, register on [Metered.ca](https://www.metered.ca/tools/openrelay/) or Twilio and supply:
    ```bash
    TURN_SERVER_URL=turn:openrelay.metered.ca:80
    TURN_USERNAME=openrelayproject
    TURN_CREDENTIAL=openrelayproject
    ```
