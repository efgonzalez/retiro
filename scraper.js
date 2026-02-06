const MADRID_API_URL = 'https://sigma.madrid.es/hosted/rest/services/MEDIO_AMBIENTE/ALERTAS_PARQUES/MapServer/0/query?where=1%3D1&outFields=*&f=json';
const MADRID_INFO_URL = 'https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Estado-de-cierre-y-apertura-de-algunos-parques-en-Madrid/';

/**
 * Status codes from Madrid API:
 * 1 = Green (open, no alerts)
 * 2 = Yellow (some restrictions)
 * 3 = Orange (significant restrictions)
 * 6 = Red (closed)
 */
const STATUS_MAP = {
  1: { status: 'open', color: 'green', message: 'The park is OPEN' },
  2: { status: 'restricted', color: 'yellow', message: 'The park has MINOR RESTRICTIONS (yellow alert)' },
  3: { status: 'restricted', color: 'orange', message: 'The park has SIGNIFICANT RESTRICTIONS (orange alert)' },
  4: { status: 'restricted', color: 'orange', message: 'The park has RESTRICTIONS' },
  5: { status: 'closed', color: 'red', message: 'The park is CLOSED' },
  6: { status: 'closed', color: 'red', message: 'The park is CLOSED (red alert)' }
};

/**
 * Fetches Retiro Park status from Madrid's official API
 * @returns {Promise<{status: string, color: string, message: string, ...}>}
 */
async function scrapeRetiroStatus() {
  try {
    const response = await fetch(MADRID_API_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RetiroParkStatus/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('No park data returned from API');
    }

    // Find Retiro Park
    const retiroFeature = data.features.find(f =>
      f.attributes.ZONA_VERDE &&
      f.attributes.ZONA_VERDE.toLowerCase().includes('retiro')
    );

    if (!retiroFeature) {
      throw new Error('Retiro Park not found in API response');
    }

    const attrs = retiroFeature.attributes;
    const statusCode = attrs.ALERTA_DESCRIPCION || 1;
    const statusInfo = STATUS_MAP[statusCode] || STATUS_MAP[1];

    // Parse incident hours
    let schedule = '';
    if (attrs.HORARIO_INCIDENCIA) {
      schedule = attrs.HORARIO_INCIDENCIA;
    }

    // Parse date
    let incidentDate = '';
    if (attrs.FECHA_INCIDENCIA) {
      incidentDate = attrs.FECHA_INCIDENCIA;
    }

    // Check reopening forecast
    let reopening = '';
    if (attrs.PREVISION_APERTURA) {
      reopening = attrs.PREVISION_APERTURA;
    }

    return {
      status: statusInfo.status,
      color: statusInfo.color,
      message: statusInfo.message,
      statusCode: statusCode,
      parkName: attrs.ZONA_VERDE,
      schedule: schedule,
      incidentDate: incidentDate,
      reopening: reopening,
      observations: attrs.OBSERVACIONES || '',
      scraped: true
    };

  } catch (error) {
    console.error('API fetch error:', error.message);

    return {
      status: 'error',
      color: 'gray',
      message: 'Could not fetch status - please check madrid.es directly',
      error: error.message,
      scraped: false
    };
  }
}

module.exports = { scrapeRetiroStatus, MADRID_API_URL, MADRID_INFO_URL };
