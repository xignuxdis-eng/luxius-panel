// workshopWeather.ts - Clima real para las ventanas del Print Den (Bloque F8)
// Usa Open-Meteo (gratis, sin clave). La ubicación se puede configurar en el navegador con
//   localStorage.setItem('luxius_print_den_geo', 'latitud,longitud,Nombre del lugar')
// Si no hay ubicación configurada se usa Córdoba (donde está el taller). Si no hay internet
// o el servicio falla, simplemente no se muestra clima (nunca se inventa).

export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm';

export interface WeatherInfo {
    kind: WeatherKind;
    code: number;
    tempC: number;
    isDay: boolean;
    label: string;
    place: string;
    isDefaultPlace: boolean;
    fetchedAt: number;
}

const DEFAULT_GEO = { lat: -31.4201, lon: -64.1888, name: 'Córdoba' };
const GEO_KEY = 'luxius_print_den_geo';
export const WEATHER_REFRESH_MS = 30 * 60 * 1000;

export function weatherKindFromCode(code: number): WeatherKind {
    if (code === 0) return 'clear';
    if (code >= 1 && code <= 3) return 'cloudy';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code >= 95) return 'storm';
    return 'cloudy';
}

export function weatherLabel(code: number): string {
    if (code === 0) return 'Despejado';
    if (code === 1) return 'Mayormente despejado';
    if (code === 2) return 'Parcialmente nublado';
    if (code === 3) return 'Nublado';
    if (code === 45 || code === 48) return 'Niebla';
    if (code >= 51 && code <= 57) return 'Llovizna';
    if (code >= 61 && code <= 67) return 'Lluvia';
    if (code >= 71 && code <= 77) return 'Nieve';
    if (code >= 80 && code <= 82) return 'Chubascos';
    if (code === 85 || code === 86) return 'Nevada';
    if (code >= 95) return 'Tormenta';
    return 'Variable';
}

function readGeo(): { lat: number; lon: number; name: string; isDefault: boolean } {
    try {
        const raw = localStorage.getItem(GEO_KEY);
        if (raw) {
            const [la, lo, ...rest] = raw.split(',');
            const lat = parseFloat(la);
            const lon = parseFloat(lo);
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
                return { lat, lon, name: rest.join(',').trim() || 'Ubicación configurada', isDefault: false };
            }
        }
    } catch (_) {}
    return { ...DEFAULT_GEO, isDefault: false }; // Córdoba es donde está el taller: no hace falta aclararlo
}

/** Pide el clima actual. Devuelve null si no se pudo obtener. */
export async function fetchWeather(signal?: AbortSignal): Promise<WeatherInfo | null> {
    const geo = readGeo();
    try {
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}` +
            '&current=temperature_2m,weather_code,is_day&timezone=auto';
        const res = await fetch(url, { signal });
        if (!res.ok) return null;
        const json = await res.json();
        const cur = json?.current;
        if (!cur || typeof cur.weather_code !== 'number') return null;
        const code = cur.weather_code as number;
        return {
            kind: weatherKindFromCode(code),
            code,
            tempC: Math.round(Number(cur.temperature_2m)),
            isDay: cur.is_day === 1,
            label: weatherLabel(code),
            place: geo.name,
            isDefaultPlace: geo.isDefault,
            fetchedAt: Date.now()
        };
    } catch (_) {
        return null;
    }
}
