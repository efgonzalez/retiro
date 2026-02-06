# Retiro Park Status

Live status of Parque del Retiro (Madrid) — open, closed, or restricted.

**https://retiroabierto.com**

## What it does

Checks Madrid's official API for park alerts (wind, rain, snow, etc.) and displays the current status in real time. The park closes when weather conditions make it unsafe.

## Stack

- **Node.js / Express** — server and API
- **Cloudflare** — CDN and DDoS protection
- **nginx** — reverse proxy with SSL (Let's Encrypt)
- **pm2** — process manager

## Endpoints

| Endpoint | Description |
|---|---|
| `/` | Web UI |
| `/status.md` | Markdown status (Spanish, for AI crawlers) |
| `/api/status` | JSON API |
| `/api/health` | Health check |
| `/api/refresh` | Force refresh (rate limited) |

## Running locally

```bash
npm install
npm start
```

The server starts at `http://127.0.0.1:3000`.

## Data source

Status data comes from [Madrid.es](https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Estado-de-cierre-y-apertura-de-algunos-parques-en-Madrid/) via their public API.
