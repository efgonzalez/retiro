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

Status data comes from [Madrid.es](https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Estado-de-cierre-y-apertura-de-algunos-parques-en-Madrid/) via their public ArcGIS REST API:

```
https://sigma.madrid.es/hosted/rest/services/MEDIO_AMBIENTE/ALERTAS_PARQUES/MapServer/0/query?where=1%3D1&outFields=*&f=json
```

### API fields

| Field | Type | Alias | Description |
|---|---|---|---|
| `ZONA_VERDE` | string (50) | Nombre parque | Park name |
| `ALERTA_DESCRIPCION` | smallInt | Estado | Status code (1–6) |
| `FECHA_INCIDENCIA` | string (100) | Fecha incidencia | Incident date (dd/mm/yyyy) |
| `HORARIO_INCIDENCIA` | string (50) | Horario incidencia | Incident hours |
| `PREVISION_APERTURA` | smallInt | Previsión reapertura | Reopening forecast |
| `OBSERVACIONES` | string (500) | Observaciones | Observations / notes |
| `OBJECTID` | OID | Id | Object ID |

### Status code mappings

| Code | Status | Color | Description (ES) |
|---|---|---|---|
| 1 | open | green | El parque está abierto. No hay previsiones de alertas próximas |
| 2 | restricted | yellow | Previsión de alerta amarilla. Habrá restricciones en algunas zonas según el horario de incidencia |
| 3 | restricted | yellow | Previsión de alerta amarilla. Habrá restricciones en zonas y eventos según el horario de incidencia |
| 4 | restricted | orange | Previsión de alerta naranja. Habrá restricciones en zonas y eventos según el horario de incidencia |
| 5 | closed | red | Previsión de alerta roja. Se cerrarán los parques con vallado perimetral según el horario de incidencia |
| 6 | closed | red | Alerta roja activa. El parque está cerrado |

### Parks tracked by the API

1. Jardines del Buen Retiro
2. Parque Juan Pablo II
3. Parque Quinta de los Molinos
4. Parque Quinta de Torre Arias
5. Parque Juan Carlos I
6. Jardín del Capricho de la Alameda de Osuna
7. Rosaleda del Parque del Oeste
8. Parque Quinta Fuente del Berro
9. Parque Lineal del Manzanares
