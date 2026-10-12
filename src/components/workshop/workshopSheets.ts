// workshopSheets.ts - Fichas técnicas "estilo WoW" de los operarios del Print Den
//
// IMPORTANTE (regla de datos): las estadísticas, fortalezas y debilidades son de FANTASÍA y divertidas.
// Se generan de forma determinista a partir del rol y del nombre/ID del operario (siempre la misma ficha para la misma persona)
// y la pantalla lo aclara. Los datos REALES de la ficha son: nombre, rol, qué está haciendo ahora y cuántas órdenes
// hay esperando a su rol (se calculan fuera de este archivo con las órdenes del sistema).

import type { WorkerRole } from './types';
import type { WorkerSnapshot } from './workshopWorkers';

export interface WorkerStat {
    key: string;
    label: string;
    icon: string;
    value: number; // 1..100
    color: string;
}

export interface WorkerSheet {
    className: string;
    title: string;
    level: number;
    rarity: 'Raro' | 'Épico' | 'Legendario';
    rarityColor: string;
    stats: WorkerStat[];
    strengths: string[];
    weaknesses: string[];
    quote: string;
    gear: string;
}

/** Hash simple y estable de un texto (no criptográfico). */
export function hashString(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Generador pseudoaleatorio estable a partir de una semilla (mulberry32). */
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface RoleProfile {
    className: string;
    titles: string[];
    /** Base de cada estadística (1..100) para el rol. */
    base: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    quotes: string[];
    gear: string[];
}

export const STAT_DEFS: Array<{ key: string; label: string; icon: string; color: string }> = [
    { key: 'creatividad', label: 'Creatividad', icon: '🎨', color: '#a78bfa' },
    { key: 'precision', label: 'Precisión', icon: '🎯', color: '#38bdf8' },
    { key: 'velocidad', label: 'Velocidad', icon: '⚡', color: '#facc15' },
    { key: 'aguante', label: 'Aguante', icon: '🛡️', color: '#4ade80' },
    { key: 'paciencia', label: 'Paciencia', icon: '🧘', color: '#f472b6' },
    { key: 'cafe', label: 'Maná de café', icon: '☕', color: '#fb923c' }
];

const PROFILES: Record<WorkerRole, RoleProfile> = {
    disenador: {
        className: 'Mago Arcano del Píxel',
        titles: ['Hechicero de las Capas', 'Señor del Degradé', 'Tejedor de Vectores', 'Archimago del Kerning'],
        base: { creatividad: 88, precision: 70, velocidad: 62, aguante: 48, paciencia: 56, cafe: 82 },
        strengths: [
            'Convierte un boceto borroso en arte legendario.',
            'Detecta una fuente mal elegida a diez metros.',
            'Lanza degradés con daño crítico a los ojos del cliente.',
            'Atajos de teclado a nivel Grand Maestro.',
            'Mana infinito mientras haya café.'
        ],
        weaknesses: [
            'Pierde 2 de vida cuando le piden "el logo más grande".',
            'Se debilita ante archivos JPG de 20 KB.',
            'Vulnerable al comentario "dejalo como estaba".',
            'Cada cambio de último momento le cuesta un punto de cordura.',
            'Se distrae con tipografías nuevas.'
        ],
        quotes: ['Un poco más de contraste y es épico.', 'Eso no es amarillo, es oro legendario.', 'Dame cinco minutos más de render.'],
        gear: ['Tableta Gráfica de las Mil Capas', 'Monitor Calibrado del Destino', 'Teclado de Atajos Prohibidos']
    },
    impresor: {
        className: 'Maestro de la Forja de Tinta',
        titles: ['Domador del Plotter', 'Guardián del Cabezal', 'Alquimista CMYK', 'Señor del Banding Cero'],
        base: { creatividad: 58, precision: 86, velocidad: 66, aguante: 78, paciencia: 74, cafe: 64 },
        strengths: [
            'Calibra el plotter con los ojos cerrados.',
            'Detecta un cabezal sucio por el sonido.',
            'Aguante épico en turnos de lotes interminables.',
            'Sus negros son más profundos que Dark Souls.',
            'Sabe cuánto vinilo queda sin mirar el rollo.'
        ],
        weaknesses: [
            'Sufre un debuff al ver líneas de banding.',
            'Pierde la calma si falta tinta cian a mitad de lote.',
            'Vulnerable a los archivos en RGB sin perfil.',
            'Se paraliza con "es urgente, para ya".',
            'Hablarle del ancho de bobina lo deja hablando una hora.'
        ],
        quotes: ['Esto sale en una sola pasada.', 'Cero banding, cero drama.', 'El plotter y yo tenemos un trato.'],
        gear: ['Espátula Sagrada de Calibración', 'Guantes de Nitrilo +5', 'Lupa de Detección de Banding']
    },
    cortador: {
        className: 'Pícaro del Filo',
        titles: ['Sombra del Cutter', 'Maestro del Refilado', 'Cuchilla Silenciosa', 'Verdugo del Sangrado'],
        base: { creatividad: 46, precision: 92, velocidad: 78, aguante: 66, paciencia: 60, cafe: 58 },
        strengths: [
            'Corta al milímetro sin dejar una sola rebaba.',
            'Sabe cuánto sangrado dejar sin medirlo.',
            'Esquiva el desperdicio de material con agilidad felina.',
            'Críticos garantizados en bordes rectos.',
            'Mano firme incluso de madrugada.'
        ],
        weaknesses: [
            'Pierde puntos de vida ante cortes sin guías.',
            'Lo desespera que le pidan esquinas redondeadas a último momento.',
            'Vulnerable a lonas con pliegues.',
            'Se estresa con cutters sin filo.',
            'Siempre pierde la regla justo cuando la necesita.'
        ],
        quotes: ['Un milímetro de más es un mundo.', 'Este corte queda de manual.', 'Cuchilla afilada, mente tranquila.'],
        gear: ['Cutter de Hoja Quebrada', 'Regla Metálica del Destino', 'Tabla de Corte Verde +10']
    },
    empaquetador: {
        className: 'Paladín del Embalaje',
        titles: ['Escudo del Despacho', 'Caballero de la Cinta', 'Guardián de los Rollos', 'Rey del Nylon Burbuja'],
        base: { creatividad: 52, precision: 72, velocidad: 70, aguante: 90, paciencia: 80, cafe: 60 },
        strengths: [
            'Ningún rollo llega roto bajo su protección.',
            'Arma cajas más rápido que un speedrunner.',
            'Aguante inagotable cargando pedidos pesados.',
            'Sabe pegar la cinta recta al primer intento.',
            'Defensa total contra golpes de transporte.'
        ],
        weaknesses: [
            'Pierde vida si la caja es medio centímetro más chica.',
            'Odia que falte una etiqueta de envío.',
            'Se debilita ante pedidos sin dirección.',
            'Vulnerable a quedarse sin cinta justo al final.',
            'Un pallet mal apilado lo saca de quicio.'
        ],
        quotes: ['Acá no se rompe nada.', 'Entrega segura, cliente feliz.', 'Cinta recta, vida recta.'],
        gear: ['Pistola de Cinta Legendaria', 'Rollo de Nylon Burbuja Épico', 'Carretilla de la Ligereza']
    }
};

function feminize(text: string): string {
    return text
        .replace(/\bMago Arcano\b/g, 'Maga Arcana')
        .replace(/\bHechicero\b/g, 'Hechicera')
        .replace(/\bSeñor\b/g, 'Señora')
        .replace(/\bArchimago\b/g, 'Archimaga')
        .replace(/\bMaestro\b/g, 'Maestra')
        .replace(/\bDomador\b/g, 'Domadora')
        .replace(/\bGuardián\b/g, 'Guardiana')
        .replace(/\bPícaro\b/g, 'Pícara')
        .replace(/\bPaladín\b/g, 'Paladinesa')
        .replace(/\bCaballero\b/g, 'Dama')
        .replace(/\bRey\b/g, 'Reina')
        .replace(/\bVerdugo\b/g, 'Verduga');
}

/** Fichas de ejemplo para pruebas y para mostrar en pantalla. Siempre la misma ficha para el mismo operario. */
export function buildWorkerSheet(snapshot: Pick<WorkerSnapshot, 'id' | 'name' | 'role' | 'workshopRole'> & { gender?: 'f' | 'm' }): WorkerSheet {
    const profile = PROFILES[snapshot.role] ?? PROFILES.disenador;
    const seed = hashString(`${snapshot.id}|${snapshot.name}|${snapshot.role}`);
    const rnd = seeded(seed);

    const stats: WorkerStat[] = STAT_DEFS.map((d) => {
        const jitter = Math.round((rnd() - 0.5) * 24); // ±12
        const value = Math.max(18, Math.min(99, (profile.base[d.key] ?? 50) + jitter));
        return { key: d.key, label: d.label, icon: d.icon, value, color: d.color };
    });

    const pick = <T,>(arr: T[], n: number): T[] => {
        const pool = [...arr];
        const out: T[] = [];
        while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
        return out;
    };

    const level = 52 + Math.floor(rnd() * 14); // 52..65
    const avg = stats.reduce((a, s) => a + s.value, 0) / stats.length;
    const rarity: WorkerSheet['rarity'] = avg >= 78 ? 'Legendario' : avg >= 68 ? 'Épico' : 'Raro';
    const rarityColor = rarity === 'Legendario' ? '#ff8000' : rarity === 'Épico' ? '#a335ee' : '#0070dd';

    const rawClassName = profile.className || 'Especialista Gráfico';
    const rawTitle = pick(profile.titles, 1)[0] || 'Maestro del Taller';
    const className = snapshot.gender === 'f' ? feminize(rawClassName) : rawClassName;
    const title = snapshot.gender === 'f' ? feminize(rawTitle) : rawTitle;

    const isAdrian = Boolean(snapshot.name && /adrian/i.test(snapshot.name));
    const isCarlos = Boolean(snapshot.name && /carlos/i.test(snapshot.name));
    const isMirta = Boolean(snapshot.name && /mirta|admin/i.test(snapshot.name));
    const isAgustin = Boolean(snapshot.name && /agustin/i.test(snapshot.name));

    if (isAdrian) {
        return {
            className: 'Arquitecto de Sistemas & Soluciones',
            title: pick(['Guardián del Backend', 'Optimizador de Algoritmos', 'Señor de la Alta Disponibilidad', 'Archimago de la Infraestructura'], 1)[0] || 'Guardián del Backend',
            level: 65,
            rarity: 'Legendario',
            rarityColor: '#ff8000',
            stats: [
                { key: 'logica', label: 'Lógica & Código', icon: '💻', value: 96, color: '#38bdf8' },
                { key: 'incidentes', label: 'Resolución Rápida', icon: '⚡', value: 94, color: '#facc15' },
                { key: 'precision', label: 'Precisión Lógica', icon: '🎯', value: 91, color: '#a78bfa' },
                { key: 'aguante', label: 'Resistencia a Caídas', icon: '🛡️', value: 88, color: '#4ade80' },
                { key: 'cafe', label: 'Maná de Café', icon: '☕', value: 98, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia Debug', icon: '🧘', value: 85, color: '#f472b6' }
            ],
            strengths: pick([
                'Resuelve caídas de base de datos y migraciones complejas en tiempo récord.',
                'Automatiza procesos repetitivos para que el taller no se detenga jamás.',
                'Detecta y extermina cuellos de botella antes de que afecten la producción.',
                'Mantiene la infraestructura en la nube funcionando con estabilidad del 99.9%.'
            ], 2),
            weaknesses: pick([
                'Sufre daño crítico cuando un proveedor en la nube bloquea una cuota sin avisar.',
                'Vulnerable a que se le enfríe el café mientras depura código.',
                'Alergia a procesos manuales que podrían ser un script de tres líneas.'
            ], 2),
            quote: 'Si compila en local y pasa las pruebas, va directo a producción.',
            gear: 'MacBook Pro M-Series + Terminal SSL de Alta Disponibilidad'
        };
    }

    if (isCarlos) {
        return {
            className: 'Maestro de la Forja de Tinta',
            title: pick(['Domador del Plotter', 'Guardián del Cabezal', 'Alquimista CMYK', 'Señor del Banding Cero'], 1)[0] || 'Domador del Plotter',
            level: 62,
            rarity: 'Épico',
            rarityColor: '#a335ee',
            stats: [
                { key: 'calibracion', label: 'Calibración Plotters', icon: '🖨️', value: 95, color: '#38bdf8' },
                { key: 'color', label: 'Ojo Clínico CMYK', icon: '🎨', value: 92, color: '#a78bfa' },
                { key: 'velocidad', label: 'Velocidad de Tirada', icon: '⚡', value: 86, color: '#facc15' },
                { key: 'aguante', label: 'Aguante en Pie', icon: '🛡️', value: 88, color: '#4ade80' },
                { key: 'cafe', label: 'Maná de Café', icon: '☕', value: 82, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia Bobinas', icon: '🧘', value: 80, color: '#f472b6' }
            ],
            strengths: pick([
                'Detecta banding o falta de un inyector a veinte metros de distancia.',
                'Calibra tensiones de bobinas pesadas con tacto milimétrico.',
                'Aprovecha cada centímetro de vinilo y lona sin desperdiciar material.',
                'Sincroniza pasadas bidireccionales con precisión absoluta.'
            ], 2),
            weaknesses: pick([
                'Sufre daño moral cuando se traba un pliego de 4 metros al 95% de avance.',
                'Alergia a archivos con perfiles de color RGB descalibrados.',
                'Odia que alguien toque el sensor de carga mientras el plotter está tirando.'
            ], 2),
            quote: 'El pliego sale nítido en alta resolución o no sale del taller.',
            gear: 'Lupa de Inyectores + Espátula de Calibración Legendaria'
        };
    }

    if (isAgustin) {
        return {
            className: 'Maestro del Filo y Refilado',
            title: pick(['Cuchilla Milimétrica', 'Señor de la Escuadra', 'Verdugo del Sangrado', 'Cirujano del Corte'], 1)[0] || 'Cuchilla Milimétrica',
            level: 60,
            rarity: 'Épico',
            rarityColor: '#a335ee',
            stats: [
                { key: 'corte', label: 'Precisión de Corte', icon: '✂️', value: 96, color: '#ec4899' },
                { key: 'velocidad', label: 'Velocidad de Refilado', icon: '⚡', value: 92, color: '#facc15' },
                { key: 'escuadra', label: 'Escuadrado Pliegos', icon: '📐', value: 94, color: '#38bdf8' },
                { key: 'aguante', label: 'Resistencia Muñeca', icon: '🛡️', value: 89, color: '#4ade80' },
                { key: 'cafe', label: 'Maná de Café', icon: '☕', value: 78, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia con Lonas', icon: '🧘', value: 82, color: '#f472b6' }
            ],
            strengths: pick([
                'Refila vinilos y lonas a escuadra perfecta a mano alzada sin titubear.',
                'Jamás deja una rebaba o desvío en el corte de un pliego.',
                'Velocidad supersónica para despejar la mesa de corte en picos de entrega.',
                'Conoce el ángulo de corte ideal para cada sustrato (brillante, mate, microperforado).'
            ], 2),
            weaknesses: pick([
                'Odio mortal hacia las reglas metálicas con muescas o melladuras.',
                'Vulnerable al dolor de muñeca tras refilar 300 carteles en una sola jornada.',
                'Se descontrola si le piden "dejale un filetito blanco de un milímetro".'
            ], 2),
            quote: 'Medir dos veces, cortar una sola y que quede al milímetro.',
            gear: 'Cutter Olfa Profesional + Regla Metálica Antideslizante de 2 Metros'
        };
    }

    if (isMirta) {
        return {
            className: 'Paladinesa de la Administración & Finanzas',
            title: pick(['Guardiana de la Caja Chica', 'Señora de la Conciliación', 'Archimaga de las Facturas', 'Defensora del Orden'], 1)[0] || 'Guardiana de la Caja Chica',
            level: 63,
            rarity: 'Épico',
            rarityColor: '#a335ee',
            stats: [
                { key: 'caja', label: 'Cuadre Caja & Bancos', icon: '📑', value: 99, color: '#38bdf8' },
                { key: 'pagos', label: 'Rastreo Transferencias', icon: '🔍', value: 95, color: '#facc15' },
                { key: 'mopa', label: 'Destreza con Mopa', icon: '🧹', value: 93, color: '#4ade80' },
                { key: 'firmeza', label: 'Cobranzas Firmes', icon: '🛡️', value: 90, color: '#ec4899' },
                { key: 'cafe', label: 'Maná de Café', icon: '☕', value: 88, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia Clientes', icon: '🧘', value: 78, color: '#f472b6' }
            ],
            strengths: pick([
                'Cuadra la caja al centavo sin titubear jamás.',
                'Detecta transferencias sin comprobante a kilómetros.',
                'Manejo impecable del balde centrífugo con rueditas y la mopa.',
                'Paciencia de titanio para conciliar presupuestos y bancos.'
            ], 2),
            weaknesses: pick([
                'Sufre eternamente por limpiar los orines de Teo y Muchi en los rincones del taller.',
                'Sufre daño crítico cuando le dicen "te hago una transferencia mañana".',
                'Se le eriza la piel ante comprobantes de pago borrosos o incompletos.'
            ], 2),
        };
    }

    const isCliente = Boolean(snapshot.workshopRole === 'Cliente' || (snapshot.name && /cliente/i.test(snapshot.name)));
    if (isCliente) {
        const isAxis = Boolean(snapshot.name && /axis|zacco/i.test(snapshot.name));
        return {
            className: 'Socio Comercial / Cliente del Taller',
            title: isAxis ? 'Cliente VIP Gran Formato · Axis' : (pick(['Fiel Cliente de XignuX', 'Cliente VIP de Gran Formato', 'Comprador Frecuente', 'Entusiasta del Buen Impreso'], 1)[0] || 'Fiel Cliente de XignuX'),
            level: isAxis ? 89 : 50,
            rarity: isAxis ? 'Legendario' : 'Épico',
            rarityColor: isAxis ? '#f59e0b' : '#0ea5e9',
            stats: [
                { key: 'fidelidad', label: 'Fidelidad de Marca', icon: '⭐', value: isAxis ? 99 : 95, color: '#facc15' },
                { key: 'calidad', label: 'Exigencia de Calidad', icon: '🎯', value: isAxis ? 96 : 92, color: '#38bdf8' },
                { key: 'puntualidad', label: 'Puntualidad en Pagos', icon: '💳', value: isAxis ? 98 : 90, color: '#4ade80' },
                { key: 'volumen', label: 'Metros Impresos', icon: '📦', value: isAxis ? 99 : 85, color: '#a78bfa' },
                { key: 'cafe', label: 'Degustación de Café', icon: '☕', value: 88, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia en Mostrador', icon: '⏳', value: isAxis ? 85 : 82, color: '#f472b6' }
            ],
            strengths: isAxis ? [
                'Cliente insignia #1 en metros impresos de lonas y vinilos en el taller.',
                'Prioridad en cola de impresión por volumen continuo y fidelidad histórica.'
            ] : pick([
                'Confía plenamente en la calidad de impresión y acabados de XignuX.',
                'Envía los archivos vectorizados y listos con sangrado para tirada rápida.',
                'Abona sus órdenes a tiempo y valora el trabajo artesanal del taller.',
                'Recomienda el taller a colegas y agencias de la zona.'
            ], 2),
            weaknesses: pick([
                'Sufre ansiedad cuando necesita un cartel o banner urgente para el mismo día.',
                'A veces pide "un retoquecito rápido de color" cuando la máquina ya está tirando.',
                'Le cuesta decidirse entre lona mate y vinilo brillante en cartelería.'
            ], 2),
            quote: isAxis ? '¡Excelente nitidez en los vinilos de Axis! Siempre confío en este taller.' : '¡Qué buena calidad tienen estos impresos! Siempre vuelvo acá.',
            gear: isAxis ? '89 Órdenes Impresas + 416 m² de Lonas y Vinilos para Axis' : 'Muestrario de Materiales XignuX + Comprobante de Transferencia Aprobado'
        };
    }

    const isVendedor = Boolean(snapshot.workshopRole === 'Vendedor' || (snapshot.name && /vendedor/i.test(snapshot.name)));
    if (isVendedor) {
        return {
            className: 'Estratega de Cuentas & Ventas',
            title: pick(['Asesor Comercial de Taller', 'Cerrador de Cotizaciones', 'Domador del Metro Lineal', 'Defensor del Presupuesto'], 1)[0] || 'Asesor Comercial de Taller',
            level: 58,
            rarity: 'Épico',
            rarityColor: '#f59e0b',
            stats: [
                { key: 'negociacion', label: 'Cierre de Cotizaciones', icon: '💼', value: 94, color: '#f59e0b' },
                { key: 'presupuestos', label: 'Velocidad de Cotización', icon: '⚡', value: 95, color: '#facc15' },
                { key: 'metro_lineal', label: 'Cálculo de Metros', icon: '📐', value: 91, color: '#38bdf8' },
                { key: 'fidelizacion', label: 'Fidelización Clientes', icon: '🤝', value: 93, color: '#4ade80' },
                { key: 'cafe', label: 'Maná de Café', icon: '☕', value: 89, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia en Objeciones', icon: '🧘', value: 84, color: '#f472b6' }
            ],
            strengths: pick([
                'Cotiza en el acto al mejor valor de metro lineal optimizando el pliego.',
                'Trae clientes de alto volumen y cuida cada cuenta como propia.',
                'Excelente empatía para entender exactamente qué material necesita el cliente.',
                'Conoce al dedillo las tarifas oficiales y los márgenes de ganancia.'
            ], 2),
            weaknesses: pick([
                'Promete tiempos de entrega récord que hacen transpirar al impresor y al refilador.',
                'Insiste con meter un pedido más en la cola de impresión de las 18:00 hs.',
                'Sufre cuando el cliente pide descuento sobre el precio de costo.'
            ], 2),
            quote: 'Te preparo la cotización al instante con el mejor precio y en la mejor calidad.',
            gear: 'Lista Oficial de Precios XignuX + Calculadora de Bobinas de Alta Precisión'
        };
    }

    const isDisenador = Boolean((snapshot.workshopRole === 'Diseñador' || snapshot.workshopRole === 'Diseñadora' || snapshot.role === 'disenador') && !isAdrian);
    if (isDisenador) {
        return {
            className: snapshot.gender === 'f' ? 'Hechicera de las Capas & Vectores' : 'Hechicero de las Capas & Vectores',
            title: pick(['Diseñador Gráfico de Producción', 'Vectores Infinitos', 'Curador de Tipografías', 'Alquimista del Sangrado'], 1)[0] || 'Diseñador Gráfico de Producción',
            level: 59,
            rarity: 'Épico',
            rarityColor: '#a855f7',
            stats: [
                { key: 'vectores', label: 'Trazado y Curvas', icon: '🎨', value: 95, color: '#a855f7' },
                { key: 'cmyk', label: 'Ajuste de Perfiles CMYK', icon: '👁️', value: 92, color: '#38bdf8' },
                { key: 'resolucion', label: 'Limpieza de DPI & Sangrado', icon: '📐', value: 93, color: '#4ade80' },
                { key: 'creatividad', label: 'Composición Visual', icon: '✨', value: 91, color: '#facc15' },
                { key: 'cafe', label: 'Maná de Café', icon: '☕', value: 90, color: '#fb923c' },
                { key: 'paciencia', label: 'Paciencia con Fuentes', icon: '🧘', value: 79, color: '#f472b6' }
            ],
            strengths: pick([
                'Detecta fuentes sin incrustar o imágenes en baja resolución antes de mandar al RIP.',
                'Prepara originales, sangrados y montajes en minutos.',
                'Calibra curvas de color para que lo que se ve en pantalla coincida con el impreso.',
                'Manejo virtuoso de Illustrator, Corel y Photoshop con atajos de teclado.'
            ], 2),
            weaknesses: pick([
                'Le sangran los ojos cuando el cliente manda el logo incrustado en un documento Word.',
                'Alergia severa a archivos RGB enviados por WhatsApp comprimidos al 10%.',
                'Odia que le digan "agrandame un poquito el logo".'
            ], 2),
            quote: 'Un poco más de contraste, perfil Fogra 39 y el original queda perfecto para tirada.',
            gear: 'Tableta Gráfica Wacom + Calibrador Pantone de Bolsillo'
        };
    }

    return {
        className,
        title,
        level,
        rarity,
        rarityColor,
        stats,
        strengths: pick(profile.strengths, 2),
        weaknesses: pick(profile.weaknesses, 2),
        quote: pick(profile.quotes, 1)[0] || '¡Siempre listos para producir!',
        gear: pick(profile.gear, 1)[0] || 'Herramienta de precisión del taller'
    };
}

/** Estación o área del taller donde se ubica el operario. */
export function getStationName(role: WorkerRole, name?: string, workshopRole?: string): string {
    if (workshopRole === 'Cliente') return 'Mostrador de Clientes y Retiro';
    if (workshopRole === 'Vendedor') return 'Mostrador Comercial y Ventas';
    if (workshopRole === 'Diseñador' || workshopRole === 'Diseñadora') return 'Estación de Diseño Gráfico';
    if (workshopRole === 'Sistema') return 'Sistemas y Diseño';
    if (workshopRole === 'Impresor') return 'Plotter de Impresión';
    if (workshopRole === 'Refilador') return 'Mesa de Refilado';
    if (workshopRole === 'Administración') return 'Administración y Finanzas';

    const n = (name || '').toLowerCase();
    if (n.includes('adrian')) return 'Sistemas y Diseño';
    if (n.includes('carlos')) return 'Plotter de Impresión';
    if (n.includes('agustin')) return 'Mesa de Refilado';
    if (n.includes('mirta') || /admin/i.test(n)) return 'Administración y Mostrador';
    if (role === 'disenador') return 'Diseño y Preparación';
    if (role === 'impresor') return 'Plotter de Impresión';
    if (role === 'cortador') return 'Mesa de Refilado';
    if (role === 'empaquetador') return 'Empaque y Despacho';
    return 'Taller Gráfico';
}

/** Qué está haciendo el operario ahora mismo, en texto (datos reales del movimiento del taller). */
export function describeActivity(w: Pick<WorkerSnapshot, 'errand' | 'chatting' | 'stroll' | 'mode' | 'visiting' | 'errandText' | 'role'> & { onBreak?: boolean; gender?: 'f' | 'm'; name?: string; workshopRole?: string }): string {
    const isAdrian = Boolean(w.name && /adrian/i.test(w.name));
    const isCarlos = Boolean(w.name && /carlos/i.test(w.name));
    const isMirta = Boolean(w.name && /mirta|admin/i.test(w.name));
    const isAgustin = Boolean(w.name && /agustin/i.test(w.name));
    const isCliente = Boolean(w.workshopRole === 'Cliente');
    const isVendedor = Boolean(w.workshopRole === 'Vendedor');
    const isDisenador = Boolean((w.workshopRole === 'Diseñador' || w.workshopRole === 'Diseñadora') && !isAdrian);

    const stationLabel = getStationName(w.role, w.name, w.workshopRole);

    if (w.errand === 'going') {
        if (isAdrian) return `Llevando especificaciones de orden al taller${w.errandText ? ` (${w.errandText})` : ''}`;
        if (isCarlos) return `Llevando pliegos impresos a la mesa de refilado${w.errandText ? ` (${w.errandText})` : ''}`;
        if (isAgustin) return `Llevando materiales refilados a empaque${w.errandText ? ` (${w.errandText})` : ''}`;
        if (isMirta) return `Supervisando orden lista en mostrador${w.errandText ? ` (${w.errandText})` : ''}`;
        if (isCliente) return `Acercándose al mostrador a consultar por su pedido${w.errandText ? ` (${w.errandText})` : ''}`;
        if (isVendedor) return `Llevando cotización al sector de producción${w.errandText ? ` (${w.errandText})` : ''}`;
        return `Llevando una orden${w.errandText ? ` (${w.errandText})` : ''}`;
    }
    if (w.errand === 'dwell') {
        if (isAdrian) return `Sincronizando detalles técnicos con producción`;
        if (isCarlos) return `Entregando el rollo impreso para corte y refile`;
        if (isAgustin) return `Entregando pliegos cortados a escuadra`;
        if (isMirta) return `Verificando el pedido y comprobante de despacho`;
        if (isCliente) return `Revisando los pliegos impresos en el mostrador`;
        if (isVendedor) return `Coordinando fecha y hora de entrega`;
        return `Entregando una orden${w.errandText ? ` (${w.errandText})` : ''}`;
    }
    if (w.errand === 'returning') return `Volviendo a su puesto con la tarea cumplida`;
    if (w.chatting) return w.gender === 'f' ? 'Charlando con un compañero o compañera' : 'Charlando con un compañero';
    if (w.onBreak) return 'De descanso en Refrigerios (café, algo rico y a pensar un rato)';
    if (w.visiting) return 'Trabajando un rato en otra estación';
    if (w.stroll === 'out') return 'Dando una vuelta por el taller';
    if (w.stroll === 'back') return 'Volviendo a su puesto';
    if (w.mode === 'walk') return 'Caminando por el taller';
    
    if (isAdrian) return 'En su estación de Sistemas, optimizando la plataforma y monitoreando el flujo de órdenes';
    if (isCarlos) return 'En el Plotter de Impresión, supervisando calibración y avance de tirada';
    if (isAgustin) return 'En la mesa de Refilado, preparando cuchillas y verificando cortes milimétricos';
    if (isMirta) return 'En Administración, cuadrando caja y supervisando comprobantes y entregas';
    if (isCliente) return 'En el mostrador de retiro, esperando la entrega de su pedido';
    if (isVendedor) return 'En el sector comercial, cotizando órdenes y asesorando cuentas';
    if (isDisenador) return 'En la estación de diseño, ajustando originales y perfiles de color';

    return `En su puesto de ${stationLabel}, ${w.gender === 'f' ? 'atenta' : 'atento'} a nuevas órdenes`;
}

export const ROLE_LABEL: Record<string, string> = {
    disenador: 'Diseñador',
    impresor: 'Impresor',
    cortador: 'Refilador',
    empaquetador: 'Administración'
};

export function getRoleLabel(role: WorkerRole, gender?: 'f' | 'm', name?: string, workshopRole?: string): string {
    if (workshopRole) return workshopRole;
    const n = (name || '').toLowerCase();
    if (n.includes('adrian')) return 'Sistema';
    if (n.includes('carlos')) return 'Impresor';
    if (n.includes('mirta') || /admin/i.test(n)) return 'Administración';
    if (n.includes('agustin')) return 'Refilador';

    if (gender === 'f') {
        const femaleLabels: Record<string, string> = {
            disenador: 'Diseñadora',
            impresor: 'Impresora',
            cortador: 'Refiladora',
            empaquetador: 'Administradora',
            administrador: 'Administradora',
            admin: 'Administradora',
            vendedor: 'Vendedora',
            cliente: 'Cliente',
            principal: 'Jefa de Taller'
        };
        return femaleLabels[role] || 'Operaria';
    }
    const maleLabels: Record<string, string> = {
        disenador: 'Diseñador',
        impresor: 'Impresor',
        cortador: 'Refilador',
        empaquetador: 'Administrador',
        administrador: 'Administrador',
        admin: 'Administrador',
        vendedor: 'Vendedor',
        cliente: 'Cliente',
        principal: 'Jefe de Sistemas'
    };
    return maleLabels[role] || ROLE_LABEL[role] || 'Operario';
}

