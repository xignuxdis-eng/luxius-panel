// content/remote.ts - CONTENIDO DESDE LA NUBE: frases, personajes y ajustes del Print Den editables sin recompilar.
//
// Cómo funciona:
//   1. Al abrir el taller se lee el archivo  public/workshop-content.json  (o la dirección guardada en
//      localStorage 'luxius_print_den_content_url', por si lo querés alojar en otro lado).
//   2. Lo que diga ese archivo PISA los valores de fábrica (config, frases, visitas, mascotas, camisas...).
//      Lo que no esté en el archivo queda como está. Claves o tipos desconocidos se ignoran: nunca rompe el taller.
//   3. La última versión buena se guarda en el navegador (localStorage 'luxius_print_den_content_cache') y se aplica
//      al instante la próxima vez, así incluso lo que se lee al arrancar (ej. tamaño del plotter) ya viene actualizado.
//      Resultado: un cambio se ve completo a la segunda recarga y casi todo (frases, tiempos de eventos) ya a la primera.
//   Si no hay archivo, no hay internet o falla algo: se usa lo de fábrica sin avisar.
//
// Qué se puede cambiar (ver ejemplo en public/workshop-content.json):
//   config      -> mismos nombres que WORKSHOP_CONFIG (content/config.ts). Ej: { "dailyGoal": { "deliveries": 12 } }
//   texts       -> frases de eventos (content/texts.ts). Cada lista se reemplaza completa.
//   orderTalk   -> plantillas de la charla con datos de pedidos ({n}, {m2}, {dias}).
//   guests      -> visitas (colores, frases, tiempos) por tipo: repartidor, tecnico, cliente, pizzero.
//   pets        -> ajustes por id de mascota: { "frijol": { "petChance": 0.9 } } (solo valores que ya existen).
//   roleShirt   -> color de camisa por rol.
//   lookOverrides -> rasgos fijos por nombre de operario: { "ana": { "hairStyle": "long", "accessory": "glasses" } }

import { WORKSHOP_CONFIG } from './config';
import { EVENT_TEXTS, ORDER_TALK } from './texts';
import { GUEST_KINDS } from './guests';
import { PET_PROFILES } from './pets';
import { ROLE_SHIRT, LOOK_OVERRIDES, HAIR_STYLES, ACCESSORIES } from './characters';

const CACHE_KEY = 'luxius_print_den_content_cache';
const URL_KEY = 'luxius_print_den_content_url';
const base: string = (import.meta as any).env?.BASE_URL ?? '/';

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Mezcla `src` dentro de `target` EN SITIO (así quien ya guardó una referencia a la lista/objeto ve el cambio). */
function mergeInto(target: any, src: unknown): void {
    if (!isObj(src) || !target) return;
    for (const k of Object.keys(src)) {
        if (k === '__proto__' || k === 'constructor' || !own(target, k)) continue;
        const tv = target[k];
        const sv = src[k];
        if (Array.isArray(tv)) {
            if (Array.isArray(sv) && sv.length > 0 && tv.length > 0 && sv.every((x) => typeof x === typeof tv[0])) tv.splice(0, tv.length, ...sv);
        } else if (isObj(tv)) {
            mergeInto(tv, sv);
        } else if (typeof sv === typeof tv && (typeof sv !== 'number' || Number.isFinite(sv))) {
            target[k] = sv;
        }
    }
}

/** Aplica un documento de contenido remoto. Devuelve true si tenía la forma esperada. */
export function applyRemoteContent(doc: unknown): boolean {
    if (!isObj(doc)) return false;
    mergeInto(WORKSHOP_CONFIG, doc.config);
    mergeInto(EVENT_TEXTS, doc.texts);
    mergeInto(ORDER_TALK, doc.orderTalk);
    mergeInto(GUEST_KINDS, doc.guests);
    mergeInto(ROLE_SHIRT, doc.roleShirt);
    if (isObj(doc.pets)) {
        for (const p of PET_PROFILES) if (own(doc.pets, p.id)) mergeInto(p, (doc.pets as any)[p.id]);
    }
    if (isObj(doc.lookOverrides)) {
        for (const [name, v] of Object.entries(doc.lookOverrides)) {
            if (!isObj(v)) continue;
            const o: Record<string, string> = {};
            if (typeof v.hairColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.hairColor)) o.hairColor = v.hairColor;
            if (typeof v.hairStyle === 'string' && (HAIR_STYLES as string[]).includes(v.hairStyle)) o.hairStyle = v.hairStyle;
            if (typeof v.accessory === 'string' && (ACCESSORIES as string[]).includes(v.accessory)) o.accessory = v.accessory;
            if (Object.keys(o).length) LOOK_OVERRIDES[name.trim().toLowerCase()] = o as any;
        }
    }
    return true;
}

function contentUrl(): string {
    try {
        const u = localStorage.getItem(URL_KEY);
        if (u) return u;
    } catch (_) {}
    return `${base}workshop-content.json`;
}

/** Descarga el archivo de contenido, lo aplica y lo guarda para la próxima vez. Nunca lanza errores. */
export async function loadRemoteContent(): Promise<boolean> {
    try {
        const url = contentUrl();
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
        if (!res.ok) return false;
        const doc = await res.json();
        if (!applyRemoteContent(doc)) return false;
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(doc));
        } catch (_) {}
        return true;
    } catch (_) {
        return false;
    }
}

// Al importar: 1) aplica al instante la última versión guardada, 2) busca una nueva en segundo plano.
if (typeof window !== 'undefined') {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) applyRemoteContent(JSON.parse(cached));
    } catch (_) {}
    void loadRemoteContent();
}
