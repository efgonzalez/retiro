const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { scrapeRetiroStatus, MADRID_INFO_URL } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // Bind to localhost, use reverse proxy for external access

// Trust proxy (required for Cloudflare/nginx to get real client IP)
app.set('trust proxy', 1);

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow embedding if needed
}));

// Rate limiting - general
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

// Rate limiting - stricter for refresh endpoint (prevents abuse)
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 refresh requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh requests, please wait before trying again' }
});

app.use(generalLimiter);

// Cache configuration - 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

// In-memory cache
let cache = {
  data: null,
  timestamp: null
};

/**
 * Get status from cache or fetch if expired
 */
async function getStatus() {
  const now = Date.now();

  if (cache.data && cache.timestamp && (now - cache.timestamp) < CACHE_DURATION_MS) {
    return {
      ...cache.data,
      cached: true,
      cachedAt: new Date(cache.timestamp).toISOString(),
      cacheAge: Math.round((now - cache.timestamp) / 1000)
    };
  }

  const status = await scrapeRetiroStatus();

  if (status.scraped) {
    cache.data = status;
    cache.timestamp = now;
  }

  return {
    ...status,
    cached: false,
    fetchedAt: new Date(now).toISOString()
  };
}

// Serve static files with caching headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true
}));

// API endpoint for status
app.get('/api/status', async (req, res) => {
  try {
    const status = await getStatus();
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 min at CDN
    res.json({
      park: 'Retiro Park',
      parkSpanish: 'Parque del Retiro',
      ...status,
      sourceUrl: MADRID_INFO_URL,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      park: 'Retiro Park',
      status: 'error',
      color: 'gray',
      message: 'Server error - please try again later',
      sourceUrl: MADRID_INFO_URL
    });
  }
});

// Markdown status page for AI crawlers (in Spanish)
app.get('/status.md', async (req, res) => {
  try {
    const status = await getStatus();
    const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    const STATUS_ES = {
      open: { title: 'PARQUE RETIRO ABIERTO', desc: 'El Parque del Retiro está ABIERTO.' },
      closed: { title: 'PARQUE RETIRO CERRADO', desc: 'El Parque del Retiro está CERRADO.' },
      restricted: { title: 'PARQUE RETIRO CON RESTRICCIONES', desc: 'El Parque del Retiro tiene RESTRICCIONES de acceso.' },
      error: { title: 'ESTADO DESCONOCIDO', desc: 'No se ha podido obtener el estado del parque.' },
      unknown: { title: 'ESTADO DESCONOCIDO', desc: 'No se ha podido obtener el estado del parque.' }
    };

    const info = STATUS_ES[status.status] || STATUS_ES.unknown;

    let md = `# ${info.title}\n\n`;
    md += `${info.desc}\n\n`;
    md += `**Parque:** Parque del Retiro, Madrid\n`;
    md += `**Estado actual:** ${info.title.toLowerCase()}\n`;
    md += `**Fecha de consulta:** ${now}\n`;

    if (status.schedule) {
      md += `**Horario incidencia:** ${status.schedule}\n`;
    }
    if (status.reopening) {
      md += `**Previsión de apertura:** ${status.reopening}\n`;
    }
    if (status.observations) {
      md += `**Observaciones:** ${status.observations}\n`;
    }

    md += `\n---\n\n`;
    md += `Esta página muestra en tiempo real si el Parque del Retiro de Madrid está abierto o cerrado. `;
    md += `Cuando el parque retiro abierto, los visitantes pueden acceder libremente. `;
    md += `Cuando el parque retiro cerrado, el acceso está restringido por motivos de seguridad (viento, lluvia, nieve u otras alertas meteorológicas).\n\n`;
    md += `Fuente oficial: [Madrid.es](${MADRID_INFO_URL})\n`;
    md += `Más información: [retiroabierto.com](https://retiroabierto.com)\n`;

    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(md);
  } catch (error) {
    console.error('Markdown endpoint error:', error);
    res.status(500).set('Content-Type', 'text/markdown; charset=utf-8').send('# Error\n\nNo se pudo obtener el estado del parque.\n');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Force refresh endpoint (rate limited)
app.get('/api/refresh', refreshLimiter, async (req, res) => {
  try {
    const status = await scrapeRetiroStatus();

    if (status.scraped) {
      cache.data = status;
      cache.timestamp = Date.now();
    }

    res.json({
      park: 'Retiro Park',
      ...status,
      cached: false,
      sourceUrl: MADRID_INFO_URL,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      park: 'Retiro Park',
      status: 'error',
      message: 'Could not refresh status'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Retiro Park Status server running at http://${HOST}:${PORT}`);
});
