# Quest ✦ — landing page

The public landing / voting page. Self-contained: `index.html` (all CSS/JS inline) +
`server.js` (zero-dependency static server that listens on `$PORT`).

## Run locally
```bash
cd pitch
npm start            # → http://localhost:8080
```

## Deploy on Railway
1. New Project → Deploy from the GitHub repo.
2. In the service settings, set **Root Directory** to `pitch`.
3. Railway auto-detects Node and runs `npm start`; the server binds `$PORT`.
4. Add a custom domain in the service's **Networking** tab (Railway issues the TLS cert).

Health check: `GET /health` → `{"ok":true}`.
