// WorkshopCanvasPixi.tsx - High-Fidelity PixiJS v8 Pixel Art Render Loop for XignuX Print Den
// Implements fractional scaling (95%+ container width, 16:9), refined low-contrast concrete floor,
// enlarged stations with short labels, independent hit-areas, diffOrders snapshotting,
// and the COMPLETE PLOTTER with moving carriage, unrolling vinyl, live progress bar, particles, and hover tooltip.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Application, Container, Graphics, Sprite, Text, TextStyle, Rectangle } from 'pixi.js';
import { Order } from '@/types/orden';
import { StationId } from './types';
import { audioEngine } from './AudioEngine';
import {
    diffOrders,
    getPixiStations,
    countOrdersForStation,
    OrderStateSnapshot,
    OrderDiff
} from './workshopPixiUtils';
import {
    getTileLargeConcreteA,
    getTileLargeConcreteB,
    getWallTileTexture,
    getWindowTexture,
    getSignDenTexture,
    getPlotterChassisTexture,
    getPlotterPrintheadTexture,
    getPlotterVinylRollTexture,
    PALETTE
} from './workshopSprites';
import { WorkerCrew, planErrand } from './workshopWorkers';
import { WorkerBubbles } from './workshopBubbles';
import { getUsuarios, getMaquinas, getMateriales } from '@/data/db';
import { createStationProps, StationProps } from './workshopStationProps';
import WorkerSheetCard from './WorkerSheetCard';
import { WorkshopLighting, workshopNow, hourOf } from './workshopLighting';
import { Camera, DEFAULT_CAMERA, clampCamera, zoomAt, MAP_W_LOGICAL, MAP_H_LOGICAL, MAX_ZOOM } from './workshopCamera';
import {
    computeStationAlerts,
    summarizeAlerts,
    computeDaySummary,
    computeStationStats,
    fmtM2,
    orderM2,
    type StationAlert
} from './workshopAlerts';
import { WorkshopFx } from './workshopFx';
import { WorkshopSky } from './workshopSky';
import { GuestManager } from './workshopGuests';
import { PetManager, type PetProfile } from './workshopPet';
import { playAnimalSound } from './workshopAnimalSound';
import { WORKSHOP_CONFIG, DEFAULT_FX as BASE_DEFAULT_FX } from './content/config';
import PetSheetCard from './PetSheetCard';
import WallPanel from './WallPanel';
import { WorkshopEvents } from './workshopEvents';
import { computeLanes } from './workshopWorkers';
import { fetchWeather, WEATHER_REFRESH_MS, type WeatherInfo } from './workshopWeather';
import { computeAchievements, syncUnlocked, loadUnlocked, type Achievement } from './workshopAchievements';
import StationSheetCard from './StationSheetCard';
import AchievementsPanel from './AchievementsPanel';
import WorkshopToolbar, { type FxToggles } from './WorkshopToolbar';

export interface WorkshopCanvasPixiProps {
    orders: Order[];
    onSelectStation: (stationId: StationId) => void;
    onSelectOrder?: (order: Order) => void;
    selectedStation: StationId | null;
    onError?: (err: Error) => void;
}

interface ParticleItem {
    gfx: Graphics;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    active: boolean;
    color: number;
}

// BUILD_TAG temporal para verificar carga viva (se retira en Fase 6)
export const BUILD_TAG = 'F-r1';

/** Pizarra del día en la pared (coordenadas del mapa). */
const BOARD = WORKSHOP_CONFIG.board;
const FX_STORAGE_KEY = 'luxius_print_den_fx';
const DEFAULT_FX: FxToggles = { ...BASE_DEFAULT_FX };

const loadFxToggles = (): FxToggles => {
    try {
        const raw = localStorage.getItem(FX_STORAGE_KEY);
        if (raw) return { ...DEFAULT_FX, ...JSON.parse(raw) };
    } catch (_) {}
    return { ...DEFAULT_FX };
};

const VIRTUAL_W = 480;
const VIRTUAL_H = 270;

export const WorkshopCanvasPixi: React.FC<WorkshopCanvasPixiProps> = ({
    orders,
    onSelectStation,
    onSelectOrder,
    selectedStation,
    onError
}) => {
    useEffect(() => {
        console.log(`[PrintDen] build ${BUILD_TAG}`);
    }, []);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const hoveredStationRef = useRef<StationId | null>(null);

    // Refs for real-time synchronization
    const ordersRef = useRef<Order[]>(orders);
    const selectedStationRef = useRef<StationId | null>(selectedStation);
    const prevOrdersSnapshotRef = useRef<OrderStateSnapshot>({});
    const pendingDiffsRef = useRef<OrderDiff[]>([]);
    const baselineDoneRef = useRef(false);

    // Pixi References
    const appRef = useRef<Application | null>(null);
    const highlightsMapRef = useRef<Map<string, Graphics>>(new Map());
    const badgesMapRef = useRef<Map<string, Text>>(new Map());

    // Plotter Interactive Elements Refs (Fase 2 & B0.2 Legibility)
    interface PlotterStationItem {
        id: StationId;
        carriage: Sprite;
        sheet: Graphics;
        glow: Graphics;
        barFill: Graphics;
        progressText: Text;
        statusLed: Graphics;
        isOffline: boolean;
        maquinaId?: number;
        baseX: number;
        baseY: number;
        width: number;
        barContainer: Container;
        barBg: Graphics;
        nameplate: Container;
        nameplateBg: Graphics;
        nameText: Text;
        plotterOffsetX: number;
        plotterActualW: number;
    }

    interface StationUIItem {
        id: StationId;
        titleText: Text;
        badgeContainer: Container;
        badgeCountText: Text;
        badgeBg: Graphics;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    const plottersListRef = useRef<PlotterStationItem[]>([]);
    const crewRef = useRef<WorkerCrew | null>(null);
    const bubblesRef = useRef<WorkerBubbles | null>(null);
    const stationsUIRef = useRef<StationUIItem[]>([]);
    const stationPropsRef = useRef<Map<string, StationProps>>(new Map());
    // Cámara (Bloque E): zoom con Ctrl+rueda, arrastre con zoom, doble clic para restablecer
    const cameraRef = useRef<Camera>({ ...DEFAULT_CAMERA });
    const baseScaleRef = useRef<number>(1);
    const viewSizeRef = useRef<{ w: number; h: number }>({ w: MAP_W_LOGICAL, h: MAP_H_LOGICAL });
    const dragMovedRef = useRef(false);
    const cameraCleanupRef = useRef<(() => void) | null>(null);
    const lightingRef = useRef<WorkshopLighting | null>(null);
    const prevCountsRef = useRef<Map<string, number>>(new Map());
    const currentScaleRef = useRef<number>(1);
    const tagContainerRef = useRef<Container | null>(null);
    const tagBgRef = useRef<Graphics | null>(null);
    const tagTextRef = useRef<Text | null>(null);
    const plotterProgressFillRef = useRef<Graphics | null>(null);
    const plotterProgressTextRef = useRef<Text | null>(null);
    const plotterCarriageSpriteRef = useRef<Sprite | null>(null);
    const plotterSheetGfxRef = useRef<Graphics | null>(null);
    const plotterGlowGfxRef = useRef<Graphics | null>(null);
    const particlesPoolRef = useRef<ParticleItem[]>([]);
    const tooltipContainerRef = useRef<Container | null>(null);
    const tooltipTextRef = useRef<Text | null>(null);

    // Extras del Bloque F (alertas, pizarra, clima, mascota, eventos, visitas, logros...)
    const fxRef = useRef<WorkshopFx | null>(null);
    const skyRef = useRef<WorkshopSky | null>(null);
    const guestsRef = useRef<GuestManager | null>(null);
    const petRef = useRef<PetManager | null>(null);
    const eventsRef = useRef<WorkshopEvents | null>(null);
    const alertIconsRef = useRef<Map<string, { container: Container; bg: Graphics; text: Text }>>(new Map());
    const alertsRef = useRef<StationAlert[]>([]);
    const alertsKeyRef = useRef('');
    const achKeyRef = useRef('');
    const boardRef = useRef<{ text: Text; late: Text } | null>(null);
    const clockRef = useRef<{ hands: Graphics; minute: number; cx: number; cy: number } | null>(null);
    const applyCameraRef = useRef<(() => void) | null>(null);
    const camTweenRef = useRef<number | null>(null);
    const toastTimerRef = useRef<number | null>(null);
    const [fxToggles, setFxToggles] = useState<FxToggles>(loadFxToggles);
    const fxToggleRef = useRef<FxToggles>(fxToggles);
    fxToggleRef.current = fxToggles;
    const [alerts, setAlerts] = useState<StationAlert[]>([]);
    const [sheetStationId, setSheetStationId] = useState<string | null>(null);
    // Ficha de mascota y paneles de la pizarra / el reloj de pared
    const [sheetPetId, setSheetPetId] = useState<string | null>(null);
    const [wallPanel, setWallPanel] = useState<'board' | 'clock' | null>(null);
    const lastPetCloseRef = useRef<{ id: string; t: number } | null>(null);
    const lastWallCloseRef = useRef<{ kind: string; t: number } | null>(null);
    const wallPanelRef = useRef<'board' | 'clock' | null>(null);
    wallPanelRef.current = wallPanel;
    const lastStationCloseRef = useRef<{ id: string; t: number } | null>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [isFs, setIsFs] = useState(false);
    const [achOpen, setAchOpen] = useState(false);
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    // Mascotas presentes ahora en el taller (para los atajos de la barra)
    const [visiblePets, setVisiblePets] = useState<{ id: string; name: string; emoji: string }[]>([]);
    useEffect(() => {
        const iv = window.setInterval(() => {
            const list = (petRef.current?.visiblePets() ?? []).map((p) => ({ id: p.profile.id, name: p.profile.name, emoji: p.profile.emoji }));
            setVisiblePets((prev) => (prev.map((p) => p.id).join(',') === list.map((p) => p.id).join(',') ? prev : list));
        }, 1000);
        return () => window.clearInterval(iv);
    }, []);
    const weatherRef = useRef<WeatherInfo | null>(null);
    weatherRef.current = weather;
    const onSelectStationRef = useRef(onSelectStation);
    onSelectStationRef.current = onSelectStation;

    // Clic en un operario: abre la orden de su viaje actual; si no tiene viaje, la primera orden que le corresponde
    // por rol (mismas reglas del sistema viejo, WorkshopCanvas.tsx L594-603). Usa solo refs (el efecto de inicio es de una sola vez).
    const onSelectOrderRef = useRef(onSelectOrder);
    onSelectOrderRef.current = onSelectOrder;
    const ROLE_STATUS_MAP: Record<string, string> = {
        disenador: 'diseno',
        impresor: 'orden',
        cortador: 'impreso',
        empaquetador: 'completo'
    };
    const findOrderForWorker = (workerId: string): Order | undefined => {
        const crew = crewRef.current;
        if (!crew || crew.destroyed) return undefined;
        const snap = crew.getWorkers().find((w) => w.id === workerId);
        if (!snap) return undefined;
        let order: Order | undefined;
        if (snap.orderId != null) order = ordersRef.current.find((o) => o.id === snap.orderId);
        if (!order) {
            const needed = ROLE_STATUS_MAP[snap.role];
            if (needed) order = ordersRef.current.find((o) => o.status === needed);
        }
        return order;
    };

    // Ficha técnica del operario seleccionado (clic en el personaje)
    const [sheetWorkerId, setSheetWorkerId] = useState<string | null>(null);
    const getWorkerSnapshot = useCallback(
        (workerId: string) => crewRef.current?.getWorkers().find((w) => w.id === workerId),
        []
    );
    // Clic en un operario: abre su ficha técnica (lo que hace ahora + estadísticas de fantasía).
    const lastOutsideCloseRef = useRef<{ id: string; t: number } | null>(null);
    const sheetIdRef = useRef<string | null>(null);
    sheetIdRef.current = sheetWorkerId;
    const handleWorkerTap = (workerId: string) => {
        if (dragMovedRef.current) return; // arrastre de cámara
        audioEngine.playClick();
        // Si la ficha de este mismo operario acaba de cerrarse por el clic fuera, el clic en el operario no la reabre
        const last = lastOutsideCloseRef.current;
        if (last && last.id === workerId && Date.now() - last.t < 600) {
            lastOutsideCloseRef.current = null;
            return;
        }
        setSheetStationId(null);
        setSheetPetId(null);
        setWallPanel(null);
        setSheetWorkerId(workerId);
    };

    const showToast = (text: string) => {
        setToast(text);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(null), 4500);
    };

    // Clic en una estación o máquina: abre su ficha (el detalle completo se abre desde la ficha).
    const handleStationTap = (id: string) => {
        if (dragMovedRef.current) return;
        audioEngine.playClick();
        const last = lastStationCloseRef.current;
        if (last && last.id === id && Date.now() - last.t < 600) {
            lastStationCloseRef.current = null;
            return;
        }
        setSheetWorkerId(null);
        setSheetPetId(null);
        setWallPanel(null);
        setSheetStationId(id);
    };
    const handleStationTapRef = useRef(handleStationTap);
    handleStationTapRef.current = handleStationTap;

    // Clic en una mascota: suena su sonido, se deja (o no) acariciar y se abre su ficha de fantasía.
    const handlePetTap = (profile: PetProfile, px: number, py: number, petted: boolean) => {
        if (dragMovedRef.current) return;
        if (fxToggleRef.current.petSound) playAnimalSound(profile.sound);
        if (petted) fxRef.current?.hearts(px, py);
        else showToast(`${profile.emoji} ${profile.name} no se dejó acariciar esta vez 💨`);
        const last = lastPetCloseRef.current;
        if (last && last.id === profile.id && Date.now() - last.t < 600) {
            lastPetCloseRef.current = null;
            return;
        }
        setSheetWorkerId(null);
        setSheetStationId(null);
        setWallPanel(null);
        setSheetPetId(profile.id);
    };

    // Clic en la pizarra o en el reloj de pared: abre su panel.
    const handleWallTap = (kind: 'board' | 'clock') => {
        if (dragMovedRef.current) return;
        audioEngine.playClick();
        const last = lastWallCloseRef.current;
        if (last && last.kind === kind && Date.now() - last.t < 600) {
            lastWallCloseRef.current = null;
            return;
        }
        setSheetWorkerId(null);
        setSheetStationId(null);
        setSheetPetId(null);
        setWallPanel(kind);
    };
    const handleWallTapRef = useRef(handleWallTap);
    handleWallTapRef.current = handleWallTap;
    handleStationTapRef.current = handleStationTap;

    const updateBadgeVisual = (badgeBg: Graphics, textNode: Text, count: number) => {
        const text = count > 0 ? `${count}` : '';
        textNode.text = text;
        badgeBg.clear();
        if (count > 0) {
            const isMultiDigit = text.length > 1;
            const w = isMultiDigit ? 26 : 20;
            const h = 20;
            const r = 10;
            badgeBg.roundRect(-w / 2, -h / 2, w, h, r);
            badgeBg.fill({ color: 0xef4444 });
            badgeBg.stroke({ width: 1.5, color: 0xffffff });
        }
    };

    // Update synced refs
    useEffect(() => {
        ordersRef.current = orders;

        // Compute diffs against previous snapshot
        const { diffs, nextSnapshot } = diffOrders(prevOrdersSnapshotRef.current, orders);
        prevOrdersSnapshotRef.current = nextSnapshot;

        // La primera lectura es solo la línea base: no dispara animaciones (evita una ráfaga al abrir el taller).
        if (!baselineDoneRef.current) {
            baselineDoneRef.current = true;
        } else if (diffs.length > 0) {
            // Cola acotada (tope 20): se conserva solo lo más reciente.
            pendingDiffsRef.current = [...pendingDiffsRef.current, ...diffs].slice(-20);
            for (const d of diffs) {
                const errand = planErrand(d);
                if (errand) crewRef.current?.enqueueErrand(errand);
                // Celebración real: una orden pasó a "entregado"
                if (d.changeType === 'status_change' && d.nextStatus === 'entregado') celebrateDelivery(d.order);
            }
        }

        // Update badge counters on all stations
        stationsUIRef.current.forEach((s) => {
            if (!s.badgeCountText || s.badgeCountText.destroyed) return;
            const count = countOrdersForStation(s.id, orders);
            const prevCount = prevCountsRef.current.get(s.id);
            // "Pop" del contador cuando el número real cambia
            if (prevCount !== undefined && prevCount !== count && !s.badgeContainer.destroyed) {
                s.badgeContainer.scale.set(1.5);
            }
            prevCountsRef.current.set(s.id, count);
            stationPropsRef.current.get(s.id)?.setCount(count);
            updateBadgeVisual(s.badgeBg, s.badgeCountText, count);
            s.badgeContainer.visible = count > 0;
        });

        badgesMapRef.current.forEach((textNode, stationId) => {
            if (!textNode || textNode.destroyed) return;
            const count = countOrdersForStation(stationId, orders);
            textNode.text = count > 0 ? `${count}` : '';
            textNode.visible = count > 0;
            if (textNode.parent && !textNode.parent.destroyed) {
                textNode.parent.visible = count > 0;
            }
        });
        // Extras del Bloque F: alertas reales, pizarra del día y logros
        try {
            const now = workshopNow();
            let list: StationAlert[] = [];
            try {
                list = computeStationAlerts(orders, getMateriales(), getMaquinas(), getPixiStations(), now);
            } catch (_) {}
            const key = JSON.stringify(list);
            if (key !== alertsKeyRef.current) {
                alertsKeyRef.current = key;
                setAlerts(list);
            }
            applyAlerts(list);
            updateBoard(orders);
            if (orders.length > 0) {
                const ach = computeAchievements(orders, now, loadUnlocked()?.ids ?? []);
                const achKey = ach.map((a) => `${a.id}:${a.unlocked ? 1 : 0}:${a.progress}`).join('|');
                if (achKey !== achKeyRef.current) {
                    achKeyRef.current = achKey;
                    setAchievements(ach);
                }
                const fresh = syncUnlocked(ach);
                if (fresh.length > 0) {
                    if (fxToggleRef.current.sndAchv) audioEngine.playOrderComplete();
                    showToast(`🏆 ¡Logro desbloqueado: ${fresh[0].title}!${fresh.length > 1 ? ` (+${fresh.length - 1} más)` : ''}`);
                }
            }
        } catch (err) {
            console.warn('[PrintDen] extras del taller:', err);
        }
    }, [orders]);

    // Alertas visibles solo si el usuario no las apagó
    useEffect(() => {
        applyAlerts(alertsRef.current);
    }, [fxToggles.alerts]);

    // Mascota y eventos: encendido/apagado individual (se recuerda en el navegador)
    useEffect(() => {
        petRef.current?.setEnabled(fxToggles.pet);
        eventsRef.current?.setEnabled(fxToggles.events);
        try {
            localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(fxToggles));
        } catch (_) {}
    }, [fxToggles]);

    // Clima real (solo si está encendido); se actualiza cada 30 minutos
    useEffect(() => {
        if (!fxToggles.weather) {
            setWeather(null);
            skyRef.current?.setWeather(null);
            return;
        }
        let cancelled = false;
        const ctrl = new AbortController();
        const load = async () => {
            const w = await fetchWeather(ctrl.signal);
            if (cancelled) return;
            setWeather(w);
            skyRef.current?.setWeather(w ? w.kind : null);
        };
        load();
        const t = window.setInterval(load, WEATHER_REFRESH_MS);
        return () => {
            cancelled = true;
            ctrl.abort();
            window.clearInterval(t);
        };
    }, [fxToggles.weather]);

    // Modo TV (pantalla completa)
    useEffect(() => {
        const onFs = () => setIsFs(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFs);
        return () => {
            document.removeEventListener('fullscreenchange', onFs);
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
            if (camTweenRef.current) cancelAnimationFrame(camTweenRef.current);
        };
    }, []);

    useEffect(() => {
        selectedStationRef.current = selectedStation;
        // Refresh highlight states
        highlightsMapRef.current.forEach((gfx, stationId) => {
            if (!gfx || gfx.destroyed) return;
            const isSelected = selectedStation === stationId;
            const isHovered = hoveredStationRef.current === stationId;
            const isPlotter = stationId === 'plotter1' || stationId === 'plotter2' || stationId.startsWith('maquina_');
            try {
                gfx.clear();
                const parent = gfx.parent as Container;
                const boundsW = parent ? (parent as any)._stationW || 86 : 86;
                const boundsH = parent ? (parent as any)._stationH || 66 : 66;

                if (isSelected) {
                    if (isPlotter) {
                        const plotterW = Math.min(204, boundsW - 4);
                        const offX = Math.floor((boundsW - plotterW) / 2);
                        gfx.roundRect(offX - 2, 24, plotterW + 4, 50, 4);
                    } else {
                        gfx.rect(-2, -2, boundsW + 4, boundsH + 4);
                    }
                    gfx.stroke({ width: 2, color: 0x38bdf8 });
                } else if (isHovered) {
                    if (isPlotter) {
                        const plotterW = Math.min(204, boundsW - 4);
                        const offX = Math.floor((boundsW - plotterW) / 2);
                        gfx.roundRect(offX - 2, 24, plotterW + 4, 50, 4);
                    } else {
                        gfx.rect(-1, -1, boundsW + 2, boundsH + 2);
                    }
                    gfx.stroke({ width: 1.5, color: 0xf59e0b });
                }
            } catch (_) {}
        });
    }, [selectedStation]);

    // Audio Ambient
    useEffect(() => {
        if (!fxToggles.sndAmbient) return;
        audioEngine.startAmbient();
        return () => {
            audioEngine.stopAmbient();
        };
    }, [fxToggles.sndAmbient]);

    // Main PixiJS Application Setup
    useEffect(() => {
        let isCancelled = false;
        let resizeObserver: ResizeObserver | null = null;
        let tickerFn: (() => void) | null = null;
        let activeApp: Application | null = null;


        const initPixi = async () => {
            const app = new Application();
            try {
                await app.init({
                    width: VIRTUAL_W,
                    height: VIRTUAL_H,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                    roundPixels: true,
                    backgroundColor: 0x090714,
                    preference: 'webgl'
                });

                if (isCancelled || !canvasHostRef.current) {
                    try {
                        if (app.renderer) {
                            app.destroy({ removeView: true }, { children: true });
                        }
                    } catch (_) {}
                    return;
                }

                activeApp = app;
                appRef.current = app;

                if (canvasHostRef.current) {
                    canvasHostRef.current.innerHTML = '';
                    const canvas = app.canvas;
                    canvasHostRef.current.appendChild(canvas);

                    // Root scene layers: World Container (scaled) + UI Layer (1:1 native screen resolution)
                    const worldContainer = new Container();
                    worldContainer.label = 'WorldContainer';

                    const mapLayer = new Container();
                    mapLayer.label = 'MapLayer';

                    const stationsLayer = new Container();
                    stationsLayer.label = 'StationsLayer';

                    const workersLayer = new Container();
                    workersLayer.label = 'WorkersLayer';

                    const particlesLayer = new Container();
                    particlesLayer.label = 'ParticlesLayer';

                    const hitAreasLayer = new Container();
                    hitAreasLayer.label = 'HitAreasLayer';

                    const skyLayer = new Container();
                    skyLayer.label = 'SkyLayer';
                    const floorFxLayer = new Container();
                    floorFxLayer.label = 'FloorFxLayer';

                    worldContainer.addChild(mapLayer);
                    worldContainer.addChild(skyLayer);
                    worldContainer.addChild(stationsLayer);
                    worldContainer.addChild(workersLayer);
                    worldContainer.addChild(particlesLayer);
                    // Iluminación y día/noche (Bloque E): por encima del mundo, sin recibir clics
                    const lightLayer = new Container();
                    lightLayer.label = 'LightLayer';
                    worldContainer.addChild(lightLayer);
                    worldContainer.addChild(hitAreasLayer);
                    // Clic en operarios: capa por encima de las áreas de las estaciones (riesgo R5)
                    const workerHitLayer = new Container();
                    workerHitLayer.label = 'WorkerHitLayer';
                    worldContainer.addChild(workerHitLayer);

                    const uiLayer = new Container();
                    uiLayer.label = 'UILayer';

                    app.stage.addChild(worldContainer);
                    app.stage.addChild(uiLayer);

                    // 1. Build Refined Low-Contrast Background Map
                    buildBackgroundMap(mapLayer, VIRTUAL_W, VIRTUAL_H);

                    // 1b. Cielo por las ventanas (hora real + clima real) y pizarra/reloj de pared
                    skyRef.current = new WorkshopSky(skyLayer, WORKSHOP_CONFIG.windows.xs, WORKSHOP_CONFIG.windows.y);
                    buildWallBoard(mapLayer, uiLayer, workerHitLayer);

                    // 2. Build Stations with Full Animated Plotter (Fase 2)
                    buildStations(stationsLayer, hitAreasLayer, particlesLayer, uiLayer);

                    // 2a. Luces del taller (lámparas del pasillo y luz de las máquinas activas)
                    const lighting = new WorkshopLighting(lightLayer, VIRTUAL_W, VIRTUAL_H, [
                        { x: 70, y: 125 },
                        { x: 175, y: 125 },
                        { x: 285, y: 125 },
                        { x: 390, y: 125 }
                    ]);
                    lighting.setPlotterSpots(
                        plottersListRef.current.map((p) => ({
                            id: p.id,
                            x: p.baseX + p.plotterOffsetX,
                            y: p.baseY + 58,
                            w: p.plotterActualW
                        }))
                    );
                    lightingRef.current = lighting;

                    // 2b. Operarios (Fase 3, 4.2)
                    crewRef.current = new WorkerCrew(workersLayer, getUsuarios(), getPixiStations(), {
                        hitLayer: workerHitLayer,
                        onWorkerTap: (workerId) => handleWorkerTap(workerId),
                        // Sonidos: una sola vez por viaje que realmente empieza (nunca en cada actualización)
                        onErrandStart: (errand) => {
                            if (errand.held === 'rebotada') { if (fxToggleRef.current.sndAlerts) audioEngine.playBounceWarning(); }
                            else if (errand.held === 'rollo') { if (fxToggleRef.current.sndMachines) audioEngine.playScissorsCut(); }
                        }
                    });

                    // 2c. Extras (Bloque F): efectos, mascota, visitas y eventos aleatorios (todo decorativo)
                    const hallStations = getPixiStations();
                    const hallLanes = computeLanes(hallStations);
                    fxRef.current = new WorkshopFx(floorFxLayer, particlesLayer);
                    guestsRef.current = new GuestManager(workersLayer, hallStations);
                    petRef.current = new PetManager(workersLayer, workerHitLayer, hallStations, {
                        onWorkerPet: (_p, px, py) => fxRef.current?.hearts(px, py),
                        onTap: (profile, px, py, petted) => handlePetTap(profile, px, py, petted)
                    });
                    petRef.current.setEnabled(fxToggleRef.current.pet);
                    eventsRef.current = new WorkshopEvents({
                        crew: () => crewRef.current,
                        fx: () => fxRef.current,
                        lighting: () => lightingRef.current,
                        guests: () => guestsRef.current,
                        floorSpot: () => ({
                            x: Math.round(40 + Math.random() * 400),
                            y: Math.round(hallLanes.topEdge + 10 + Math.random() * Math.max(4, hallLanes.bottomEdge - hallLanes.topEdge - 16))
                        }),
                        hour: () => hourOf(workshopNow()),
                        onPowerBack: () => petRef.current?.reunion()
                    });
                    eventsRef.current.setEnabled(fxToggleRef.current.events);
                    skyRef.current?.setHour(hourOf(workshopNow()));
                    skyRef.current?.setWeather(fxToggleRef.current.weather && weatherRef.current ? weatherRef.current.kind : null);
                    applyAlerts(alertsRef.current);
                    // Atajos para pruebas (solo en desarrollo): window.__printDen.trigger('blackout') etc.
                    if ((import.meta as any).env?.DEV) {
                        (window as any).__printDen = {
                            trigger: (n: any) => eventsRef.current?.trigger(n),
                            spawn: (k: any) => guestsRef.current?.spawn(k),
                            celebrate: () => celebrateDelivery({ id: 0, ancho: 3, alto: 2, copias: 1 } as Order),
                            reunion: () => petRef.current?.reunion()
                        };
                    }

                    // BUILD_TAG temporal (se retira en Fase 6) - UILayer a resolución real
                    const tagContainer = new Container();
                    const tagBg = new Graphics();
                    tagBg.roundRect(0, 0, 48, 14, 3);
                    tagBg.fill({ color: 0x090d16, alpha: 1.0 });
                    tagBg.stroke({ width: 1, color: 0x334155 });
                    tagContainer.addChild(tagBg);

                    const tagText = new Text({
                        text: BUILD_TAG,
                        style: {
                            fontFamily: 'monospace',
                            fontSize: 9,
                            fontWeight: 'bold',
                            fill: '#38bdf8'
                        }
                    });
                    tagText.x = 6;
                    tagText.y = 1;
                    tagContainer.addChild(tagText);
                    uiLayer.addChild(tagContainer);

                    tagContainerRef.current = tagContainer;
                    tagBgRef.current = tagBg;
                    tagTextRef.current = tagText;

                    // 3. Initialize Particle Pool
                    initParticles(particlesLayer, 18);

                    // 4. Fractional Scaling setup with native resolution UI layout (B0.2)
                    resizeObserver = setupFractionalScaling(canvas, containerRef.current, app, worldContainer, uiLayer);

                    // 4b. Globos de los operarios (encima de todo en la capa de interfaz)
                    const bubblesLayer = new Container();
                    bubblesLayer.label = 'BubblesLayer';
                    uiLayer.addChild(bubblesLayer);
                    bubblesRef.current = new WorkerBubbles(bubblesLayer);

                    // 5. Start Plotter Render Loop Ticker
                    tickerFn = setupPlotterTicker(app);
                }
            } catch (initErr) {
                console.error('Failed to initialize Pixi Application:', initErr);
                onError?.(initErr instanceof Error ? initErr : new Error(String(initErr)));
            }
        };

        initPixi();

        const handleVisibilityChange = () => {
            if (!activeApp || isCancelled) return;
            try {
                if (document.visibilityState === 'hidden') {
                    activeApp.ticker.stop();
                } else {
                    activeApp.ticker.start();
                }
            } catch (_) {}
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isCancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }

            if (activeApp && tickerFn) {
                try {
                    activeApp.ticker.remove(tickerFn);
                } catch (_) {}
                tickerFn = null;
            }

            try { bubblesRef.current?.destroy(); } catch (_) {}
            bubblesRef.current = null;
            try { crewRef.current?.destroy(); } catch (_) {}
            crewRef.current = null;
            try { fxRef.current?.destroy(); } catch (_) {}
            fxRef.current = null;
            try { petRef.current?.destroy(); } catch (_) {}
            petRef.current = null;
            try { guestsRef.current?.destroy(); } catch (_) {}
            guestsRef.current = null;
            try { eventsRef.current?.destroy(); } catch (_) {}
            eventsRef.current = null;
            try { skyRef.current?.destroy(); } catch (_) {}
            skyRef.current = null;
            alertIconsRef.current.clear();
            boardRef.current = null;
            clockRef.current = null;
            applyCameraRef.current = null;
            try {
                if ((window as any).__printDen) delete (window as any).__printDen;
            } catch (_) {}

            // Immediately clear interactive element references to prevent ticker access
            plotterCarriageSpriteRef.current = null;
            plotterSheetGfxRef.current = null;
            plotterGlowGfxRef.current = null;
            plotterProgressFillRef.current = null;
            plotterProgressTextRef.current = null;
            tooltipContainerRef.current = null;
            tooltipTextRef.current = null;
            tagContainerRef.current = null;
            tagBgRef.current = null;
            tagTextRef.current = null;
            highlightsMapRef.current.clear();
            badgesMapRef.current.clear();
            particlesPoolRef.current = [];
            plottersListRef.current = [];
            stationsUIRef.current = [];
            stationPropsRef.current.clear();
            prevCountsRef.current.clear();
            try { cameraCleanupRef.current?.(); } catch (_) {}
            cameraCleanupRef.current = null;
            try { lightingRef.current?.destroy(); } catch (_) {}
            lightingRef.current = null;
            cameraRef.current = { ...DEFAULT_CAMERA };

            if (activeApp) {
                try {
                    if (activeApp.ticker) {
                        activeApp.ticker.stop();
                    }
                    if (activeApp.renderer) {
                        activeApp.destroy({ removeView: true }, { children: true });
                    }
                } catch (err) {
                    console.warn('Safe Pixi destroy notice:', err);
                }
                activeApp = null;
                appRef.current = null;
            }

            if (canvasHostRef.current) {
                canvasHostRef.current.innerHTML = '';
            }
        };
    }, []);

    /**
     * B0.2: Layout UI elements in UILayer at 1:1 screen resolution with coordinates multiplied by scale.
     * All banners have solid dark opaque background (#090d16) and crisp 1px stroke.
     */
    /** Pizarra del día (datos reales) y reloj de pared (hora real del equipo) en la pared del fondo. */
    const buildWallBoard = (mapLayer: Container, uiLayer: Container, hitLayer: Container) => {
        const g = new Graphics();
        g.rect(BOARD.x - 1, BOARD.y - 1, BOARD.w + 2, BOARD.h + 2).fill({ color: 0x5b3a1e });
        g.rect(BOARD.x, BOARD.y, BOARD.w, BOARD.h).fill({ color: 0x13241f });
        g.rect(BOARD.x, BOARD.y + BOARD.h - 2, BOARD.w, 2).fill({ color: 0x0b1713 });
        mapLayer.addChild(g);

        const baseStyle = { fontFamily: 'monospace', fontSize: 10, fontWeight: 'bold' as const, fill: '#e2e8f0' };
        const text = new Text({ text: '', style: { ...baseStyle } });
        const late = new Text({ text: '', style: { ...baseStyle, fill: '#86efac' } });
        uiLayer.addChild(text);
        uiLayer.addChild(late);
        boardRef.current = { text, late };

        const cx = WORKSHOP_CONFIG.clock.cx;
        const cy = WORKSHOP_CONFIG.clock.cy;
        const clock = new Graphics();
        clock.circle(cx, cy, 8.5).fill({ color: 0x5b3a1e });
        clock.circle(cx, cy, 7.5).fill({ color: 0xf1f5f9 });
        for (const [dx, dy] of [[0, -6], [6, 0], [0, 6], [-6, 0]]) {
            clock.rect(cx + dx - 0.5, cy + dy - 0.5, 1, 1).fill({ color: 0x334155 });
        }
        mapLayer.addChild(clock);
        const hands = new Graphics();
        mapLayer.addChild(hands);
        clockRef.current = { hands, minute: -1, cx, cy };
        // Áreas clicables (pizarra y reloj)
        const mkHit = (x: number, y: number, w: number, h: number, kind: 'board' | 'clock') => {
            const c = new Container();
            c.label = `WallHit:${kind}`;
            c.hitArea = new Rectangle(x, y, w, h);
            c.eventMode = 'static';
            c.cursor = 'pointer';
            c.on('pointertap', () => handleWallTapRef.current(kind));
            hitLayer.addChild(c);
        };
        mkHit(BOARD.x - 1, BOARD.y - 1, BOARD.w + 2, BOARD.h + 2, 'board');
        mkHit(cx - 9, cy - 9, 18, 18, 'clock');
        updateClock(true);
        updateBoard(ordersRef.current);
    };

    const updateClock = (force = false) => {
        const c = clockRef.current;
        if (!c || c.hands.destroyed) return;
        const now = workshopNow();
        const minuteOfDay = now.getHours() * 60 + now.getMinutes();
        if (!force && minuteOfDay === c.minute) return;
        c.minute = minuteOfDay;
        const hAng = (((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
        const mAng = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
        c.hands.clear();
        c.hands.moveTo(c.cx, c.cy).lineTo(c.cx + Math.cos(hAng) * 4, c.cy + Math.sin(hAng) * 4).stroke({ width: 1, color: 0x0f172a });
        c.hands.moveTo(c.cx, c.cy).lineTo(c.cx + Math.cos(mAng) * 6, c.cy + Math.sin(mAng) * 6).stroke({ width: 1, color: 0x0f172a });
        c.hands.circle(c.cx, c.cy, 0.9).fill({ color: 0xdc2626 });
    };

    const updateBoard = (list: Order[]) => {
        const b = boardRef.current;
        if (!b || b.text.destroyed || b.late.destroyed) return;
        const s = computeDaySummary(list, workshopNow());
        b.text.text =
            `✔ ${s.entregadasHoy} ${s.entregadasHoy === 1 ? 'entregada' : 'entregadas'}\n` +
            `▣ ${fmtM2(s.m2Hoy)} m² producidos`;
        if (s.atrasadas > 0) {
            b.late.text = `⚠ ${s.atrasadas} ${s.atrasadas === 1 ? 'atrasada' : 'atrasadas'}`;
            b.late.style.fill = '#fca5a5';
        } else {
            b.late.text = '✔ sin atrasos';
            b.late.style.fill = '#86efac';
        }
        layoutBoard(currentScaleRef.current);
    };

    const layoutBoard = (scale: number) => {
        const b = boardRef.current;
        if (!b || b.text.destroyed || b.late.destroyed) return;
        const fs = Math.min(12, Math.floor((BOARD.h * scale - 6) / 3 / 1.2));
        const show = fs >= 7;
        b.text.visible = show;
        b.late.visible = show;
        if (!show) return;
        const lh = Math.round(fs * 1.2);
        b.text.style.fontSize = fs;
        b.late.style.fontSize = fs;
        b.text.style.lineHeight = lh;
        const x = Math.round((BOARD.x + 3) * scale);
        const y = Math.round(BOARD.y * scale) + 3;
        b.text.x = x;
        b.text.y = y;
        b.late.x = x;
        b.late.y = y + lh * 2;
    };

    /** Muestra u oculta los íconos de alerta según las alertas reales y si el usuario las tiene encendidas. */
    const applyAlerts = (list: StationAlert[]) => {
        alertsRef.current = list;
        const sum = summarizeAlerts(list);
        alertIconsRef.current.forEach((ic, id) => {
            if (ic.container.destroyed) return;
            const s = sum.get(id);
            const on = Boolean(s) && fxToggleRef.current.alerts;
            ic.container.visible = on;
            if (!s) return;
            ic.bg.clear();
            ic.bg.circle(0, 0, 10).fill({ color: s.severity === 'danger' ? 0xef4444 : 0xf59e0b });
            ic.bg.stroke({ width: 1.5, color: 0xffffff });
            ic.text.text = s.count > 1 ? String(s.count) : '!';
            ic.text.style.fill = s.severity === 'danger' ? '#ffffff' : '#111827';
        });
    };

    /** Confeti y festejo cuando una orden REAL pasa a "entregado". */
    const celebrateDelivery = (order: Order) => {
        if (fxToggleRef.current.sndAchv) audioEngine.playOrderComplete();
        const st = getPixiStations().find((s) => s.id === 'despacho');
        if (!st) return;
        const big = orderM2(order) >= 5;
        fxRef.current?.confetti(st.x + st.width / 2, st.y + 24, big ? 70 : 36, st.width * 0.6);
        crewRef.current?.announce(
            big
                ? ['¡Entrega grande! 🎉', '¡Eso sí que es un trabajo!', '¡Bravo, equipo! 👏']
                : ['¡Entregada! 🎉', '¡Otra OT en manos del cliente!', '¡Buen trabajo! 👏'],
            big ? 3 : 1,
            'ok'
        );
    };

    /** Atajos: acerca la cámara a una estación (o vuelve a la vista general con null). */
    const focusStation = (id: string | null) => {
        setFocusedId(id);
        const v = viewSizeRef.current;
        const base = baseScaleRef.current;
        let target: Camera;
        if (id === null) {
            target = clampCamera({ ...DEFAULT_CAMERA }, v.w, v.h, base);
        } else {
            const st = getPixiStations().find((s) => s.id === id);
            if (!st) return;
            const z = Math.max(1.4, Math.min(MAX_ZOOM, Math.min(MAP_W_LOGICAL / (st.width + 36), MAP_H_LOGICAL / (st.height + 36))));
            const total = base * z;
            target = clampCamera(
                { zoom: z, panX: v.w / 2 - (st.x + st.width / 2) * total, panY: v.h / 2 - (st.y + st.height / 2) * total },
                v.w,
                v.h,
                base
            );
        }
        const from = { ...cameraRef.current };
        const t0 = performance.now();
        if (camTweenRef.current) cancelAnimationFrame(camTweenRef.current);
        const step = (now: number) => {
            const k = Math.min(1, (now - t0) / 380);
            const e = 1 - Math.pow(1 - k, 3);
            cameraRef.current = {
                zoom: from.zoom + (target.zoom - from.zoom) * e,
                panX: from.panX + (target.panX - from.panX) * e,
                panY: from.panY + (target.panY - from.panY) * e
            };
            applyCameraRef.current?.();
            camTweenRef.current = k < 1 ? requestAnimationFrame(step) : null;
        };
        camTweenRef.current = requestAnimationFrame(step);
    };

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
        } else {
            el.requestFullscreen?.().catch(() => {});
        }
    };

    const layoutUI = (scale: number) => {
        currentScaleRef.current = scale;

        // 1. Layout Plotters UI (Status Bar & Nameplate)
        plottersListRef.current.forEach((p) => {
            const barW = Math.round((p.plotterActualW - 24) * scale);
            const barH = 22; // 22px real screen pixels
            p.barContainer.x = Math.round((p.baseX + p.plotterOffsetX + 12) * scale);
            p.barContainer.y = Math.round((p.baseY + 11) * scale);

            p.barBg.clear();
            p.barBg.roundRect(0, 0, barW, barH, 3);
            p.barBg.fill({ color: 0x090d16, alpha: 1.0 }); // Fondo oscuro sólido opaco
            p.barBg.stroke({ width: 1, color: 0x334155 }); // Borde nítido

            p.progressText.style.fontSize = 12;
            p.progressText.x = Math.floor(barW / 2);
            p.progressText.y = Math.floor(barH / 2);

            // Nameplate
            p.nameplate.x = Math.round((p.baseX + p.plotterOffsetX + 12) * scale);
            p.nameplate.y = Math.round((p.baseY + 0) * scale);
            p.nameplateBg.clear();
            p.nameplateBg.roundRect(0, 0, 104, 22, 3);
            p.nameplateBg.fill({ color: 0x090d16, alpha: 1.0 });
            p.nameplateBg.stroke({ width: 1, color: 0x06b6d4 });
            p.nameText.style.fontSize = 13;
            p.nameText.x = 8;
            p.nameText.y = 3;
        });

        // 2. Layout Station Titles & Badges
        stationsUIRef.current.forEach((s) => {
            const isPlotter = s.id === 'plotter1' || s.id === 'plotter2' || s.id.startsWith('maquina_');
            if (!isPlotter) {
                s.titleText.x = Math.round((s.x + 8) * scale);
                s.titleText.y = Math.round((s.y + 3) * scale);
                s.titleText.style.fontSize = 13;
                s.badgeContainer.x = Math.round((s.x + s.width - 12) * scale);
                s.badgeContainer.y = Math.round((s.y + 10) * scale);
            } else {
                s.badgeContainer.x = Math.round((s.x + s.width - 14) * scale);
                s.badgeContainer.y = Math.round((s.y + 12) * scale);
            }
            updateBadgeVisual(s.badgeBg, s.badgeCountText, countOrdersForStation(s.id, ordersRef.current));
        });

        // 2b. Íconos de alerta y pizarra del día (UI a resolución real)
        alertIconsRef.current.forEach((ic, id) => {
            const s = stationsUIRef.current.find((u) => u.id === id);
            if (!s || ic.container.destroyed) return;
            ic.container.x = s.badgeContainer.x - 26;
            ic.container.y = s.badgeContainer.y;
        });
        layoutBoard(scale);

        // 3. BUILD_TAG
        if (tagContainerRef.current && tagBgRef.current && tagTextRef.current) {
            tagContainerRef.current.x = Math.round(VIRTUAL_W * scale) - 52;
            tagContainerRef.current.y = Math.round(VIRTUAL_H * scale) - 18;
            tagBgRef.current.clear();
            tagBgRef.current.roundRect(0, 0, 48, 14, 3);
            tagBgRef.current.fill({ color: 0x090d16, alpha: 1.0 });
            tagBgRef.current.stroke({ width: 1, color: 0x334155 });
            tagTextRef.current.style.fontSize = 9;
            tagTextRef.current.x = 6;
            tagTextRef.current.y = 1;
        }
    };

    /**
     * FRACTIONAL SCALING & B0.2 LEGIBILITY:
     * Resizes Pixi renderer to exact screen display pixels.
     * Scales worldContainer by finalScale, while keeping UILayer at 1:1 scale with crisp fonts.
     */
    const setupFractionalScaling = (
        canvas: HTMLCanvasElement,
        container: HTMLDivElement | null,
        app: Application,
        worldContainer: Container,
        uiLayer: Container
    ): ResizeObserver | null => {
        if (!container || !canvas) return null;

        let lastW = 0;
        let lastH = 0;
        let rafId: number | null = null;

        const applyCamera = () => {
            const cam = cameraRef.current;
            const total = baseScaleRef.current * cam.zoom;
            worldContainer.scale.set(total, total);
            worldContainer.position.set(cam.panX, cam.panY);
            uiLayer.position.set(cam.panX, cam.panY);
            layoutUI(total);
        };

        applyCameraRef.current = applyCamera;

        const updateScale = () => {
            if (!container || !canvas || !app) return;
            const containerW = container.clientWidth || 480;
            const targetW = Math.max(480, Math.floor(containerW * 0.96));
            // Modo TV: usa casi todo el alto de la pantalla (deja lugar a la barra de arriba)
            const maxAllowedH = document.fullscreenElement
                ? Math.max(270, window.innerHeight - 110)
                : Math.min(560, Math.floor(window.innerHeight * 0.62));

            const scaleByW = targetW / 480;
            const scaleByH = maxAllowedH / 270;
            const finalScale = Math.max(1, Math.min(scaleByW, scaleByH));

            const displayW = Math.round(480 * finalScale);
            const displayH = Math.round(270 * finalScale);

            if (displayW === lastW && displayH === lastH) return;
            lastW = displayW;
            lastH = displayH;

            // Resize Pixi renderer to exact screen display pixels
            app.renderer.resize(displayW, displayH);

            // UI layer stays at 1:1 scale (native screen resolution)
            uiLayer.scale.set(1, 1);

            // Cámara: escala base + zoom/desplazamiento actuales (mundo escalado, UI con posiciones escaladas)
            baseScaleRef.current = finalScale;
            viewSizeRef.current = { w: displayW, h: displayH };
            cameraRef.current = clampCamera(cameraRef.current, displayW, displayH, finalScale);
            applyCamera();

            canvas.style.width = `${displayW}px`;
            canvas.style.height = `${displayH}px`;
            canvas.style.display = 'block';
            canvas.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.7)';
            canvas.style.border = '2px solid #1e293b';
            canvas.style.borderRadius = '8px';
        };

        const ro = new ResizeObserver(() => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(updateScale);
        });
        ro.observe(container);
        updateScale();

        // --- Controles de cámara ---
        const canvasPoint = (e: { clientX: number; clientY: number }) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left - canvas.clientLeft, y: e.clientY - rect.top - canvas.clientTop };
        };
        const onWheel = (e: WheelEvent) => {
            // Zoom solo con Ctrl+rueda: la rueda sola sigue desplazando la página.
            if (!e.ctrlKey) return;
            e.preventDefault();
            setFocusedId(null);
            const { x, y } = canvasPoint(e);
            const v = viewSizeRef.current;
            cameraRef.current = zoomAt(cameraRef.current, e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y, v.w, v.h, baseScaleRef.current);
            applyCamera();
        };
        let drag: { sx: number; sy: number; panX: number; panY: number } | null = null;
        const onDown = (e: PointerEvent) => {
            if (e.button !== 0) return;
            dragMovedRef.current = false;
            drag = { sx: e.clientX, sy: e.clientY, panX: cameraRef.current.panX, panY: cameraRef.current.panY };
        };
        const onMove = (e: PointerEvent) => {
            if (!drag || cameraRef.current.zoom <= 1) return;
            const dx = e.clientX - drag.sx;
            const dy = e.clientY - drag.sy;
            if (!dragMovedRef.current && Math.hypot(dx, dy) < 5) return;
            dragMovedRef.current = true;
            const v = viewSizeRef.current;
            cameraRef.current = clampCamera({ ...cameraRef.current, panX: drag.panX + dx, panY: drag.panY + dy }, v.w, v.h, baseScaleRef.current);
            applyCamera();
        };
        const onUp = () => {
            drag = null;
            // el indicador de arrastre se limpia después de que Pixi procese el clic
            window.setTimeout(() => {
                dragMovedRef.current = false;
            }, 0);
        };
        const onDbl = () => {
            setFocusedId(null);
            cameraRef.current = { ...DEFAULT_CAMERA };
            const v = viewSizeRef.current;
            cameraRef.current = clampCamera(cameraRef.current, v.w, v.h, baseScaleRef.current);
            applyCamera();
        };
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('dblclick', onDbl);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        cameraCleanupRef.current = () => {
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('pointerdown', onDown);
            canvas.removeEventListener('dblclick', onDbl);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        return ro;
    };


    /**
     * BACKGROUND MAP: Large Low-Contrast Concrete Slabs + Fine 2px Guide Line
     */
    const buildBackgroundMap = (layer: Container, mapW: number, mapH: number) => {
        const texConcreteA = getTileLargeConcreteA();
        const texConcreteB = getTileLargeConcreteB();
        const texWall = getWallTileTexture();
        const texWindow = getWindowTexture();
        const texSignDen = getSignDenTexture();

        const wallH = 34;

        // A. Upper Wall & Steel Structure
        for (let x = 0; x < mapW; x += 16) {
            const wallSprite = new Sprite(texWall);
            wallSprite.x = x;
            wallSprite.y = 8;
            layer.addChild(wallSprite);
        }

        // 2 Grandes Ventanas Industriales Translúcidas ampliadas sobre la pared
        const windowPositions = [32, 396];
        windowPositions.forEach(wx => {
            const winSprite = new Sprite(texWindow);
            winSprite.x = wx;
            winSprite.y = 9;
            layer.addChild(winSprite);
        });

        // Cartel "DEN" ampliado, centrado en la pared superior sobre el plotter
        const denSign = new Sprite(texSignDen);
        denSign.x = 217;
        denSign.y = 9;
        layer.addChild(denSign);

        // B. Floor Tiles (32x32 px large slabs, soft slate-blue tone)
        const slabSize = 32;
        for (let y = wallH; y < mapH; y += slabSize) {
            for (let x = 0; x < mapW; x += slabSize) {
                const isAlt = (Math.floor(x / slabSize) + Math.floor(y / slabSize)) % 2 === 0;
                const tileSprite = new Sprite(isAlt ? texConcreteA : texConcreteB);
                tileSprite.x = x;
                tileSprite.y = y;
                layer.addChild(tileSprite);
            }
        }

        // C. Líneas de Guía de Seguridad sutiles en el pasillo entre estaciones (y: 110 a y: 140)
        const guideGfx = new Graphics();
        guideGfx.rect(16, 118, mapW - 32, 2);
        guideGfx.fill({ color: 0x334155, alpha: 0.6 });
        guideGfx.rect(16, 132, mapW - 32, 2);
        guideGfx.fill({ color: 0x334155, alpha: 0.6 });
        layer.addChild(guideGfx);
    };

    /**
     * PARTICLE POOL: Reusable smoke / solvent vapor and VIP golden sparkles (Max 40 items)
     */
    const initParticles = (layer: Container, count: number = 40) => {
        const pool: ParticleItem[] = [];
        for (let i = 0; i < count; i++) {
            const gfx = new Graphics();
            gfx.visible = false;
            layer.addChild(gfx);
            pool.push({
                gfx,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                life: 0,
                maxLife: 14,
                active: false,
                color: 0x38bdf8
            });
        }
        particlesPoolRef.current = pool;
    };

    const emitParticle = (x: number, y: number, isVip: boolean) => {
        const p = particlesPoolRef.current.find(item => !item.active);
        if (!p) return;
        if (!p.gfx || p.gfx.destroyed) return;

        p.active = true;
        // Destellos estrictamente ubicados sobre el cabezal de impresión (variación mínima ±1.5px)
        p.x = x + (Math.random() * 3 - 1.5);
        p.y = y + (Math.random() * 2 - 1);
        p.vx = (Math.random() - 0.5) * 0.15;
        p.vy = -0.15 - Math.random() * 0.15;
        p.life = 0;
        // Vida corta: solo 10 a 14 frames, desaparecen enseguida
        p.maxLife = 10 + Math.floor(Math.random() * 5);
        p.color = isVip ? 0xfbbf24 : (Math.random() > 0.4 ? 0x38bdf8 : 0xffffff);

        try {
            p.gfx.clear();
            // Cuadraditos diminutos de 1 o 2 px
            const sz = Math.random() > 0.5 ? 1 : 2;
            p.gfx.rect(0, 0, sz, sz);
            p.gfx.fill({ color: p.color });
            p.gfx.x = p.x;
            p.gfx.y = p.y;
            p.gfx.scale.set(1);
            p.gfx.alpha = 0.95;
            p.gfx.visible = true;
        } catch (_) {
            p.active = false;
        }
    };

    /**
     * STATIONS & FULL PLOTTER (FASE 2)
     */
    const buildStations = (
        stationsLayer: Container,
        hitAreasLayer: Container,
        _particlesLayer: Container,
        uiLayer: Container
    ) => {
        const stations = getPixiStations();
        stationsUIRef.current = [];
        plottersListRef.current = [];

        stations.forEach(station => {
            const { id, x, y, width, height, title, icon, color } = station;

            // Visual Container (Platforms, machines, chassis, vinyl)
            const visualContainer = new Container();
            visualContainer.x = x;
            visualContainer.y = y;
            (visualContainer as any)._stationW = width;
            (visualContainer as any)._stationH = height;

            const isPlotter = id === 'plotter1' || id === 'plotter2' || id.startsWith('maquina_');

            if (!isPlotter) {
                // Base Floor Platform for normal workshop stations
                const baseGfx = new Graphics();
                baseGfx.rect(0.5, 0.5, width - 1, height - 1);
                baseGfx.fill({ color: 0x161c24, alpha: 0.96 });
                baseGfx.stroke({ width: 1.5, color: parseInt(color.replace('#', '0x'), 16) || 0x334155 });
                visualContainer.addChild(baseGfx);

                // Title Bar Header Platform Background
                const headerGfx = new Graphics();
                headerGfx.rect(0, 0, width, 16);
                headerGfx.fill({ color: parseInt(color.replace('#', '0x'), 16) || 0x334155 });
                visualContainer.addChild(headerGfx);

                // Station Title Text in UILayer (B0.2: Native resolution 13px)
                const titleStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                const titleText = new Text({
                    text: `${icon} ${title}`,
                    style: titleStyle
                });
                uiLayer.addChild(titleText);

                // Notification Badge (Counter) in UILayer (B0.2: 12px)
                const badgeContainer = new Container();
                const badgeBg = new Graphics();
                badgeContainer.addChild(badgeBg);

                const badgeStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                const badgeCountText = new Text({ text: '', style: badgeStyle });
                badgeCountText.anchor.set(0.5);
                badgeContainer.addChild(badgeCountText);
                badgesMapRef.current.set(id, badgeCountText);

                const count = countOrdersForStation(id, ordersRef.current);
                updateBadgeVisual(badgeBg, badgeCountText, count);
                badgeContainer.visible = count > 0;
                uiLayer.addChild(badgeContainer);

                stationsUIRef.current.push({
                    id,
                    titleText,
                    badgeContainer,
                    badgeCountText,
                    badgeBg,
                    x,
                    y,
                    width,
                    height
                });
            }

            // Objetos de la estación (Bloque D): escritorio, estantes, mesa de corte, cajas, portón, mostrador
            if (!isPlotter) {
                const props = createStationProps(id, width, height);
                if (props) {
                    visualContainer.addChild(props.container);
                    props.setCount(countOrdersForStation(id, ordersRef.current));
                    stationPropsRef.current.set(id, props);
                }
            }

            // Selection / Hover Highlight Frame
            const highlightGfx = new Graphics();
            visualContainer.addChild(highlightGfx);
            highlightsMapRef.current.set(id, highlightGfx);

            // ================================================================
            // FASE 2: DETAILED GRAND FORMAT PLOTTER STATION (Sin marco de tarjeta)
            // ================================================================
            let plotterOffsetX = 0;
            let plotterOffsetY = 26;
            let plotterActualW = 204;

            if (isPlotter) {
                const isOffline = station.estado === 'offline';
                plotterActualW = Math.min(204, width - 4);
                plotterOffsetX = Math.floor((width - plotterActualW) / 2);
                plotterOffsetY = 26;

                // 1. Cartel con el nombre "Plotter" en UILayer (B0.2: Native resolution, fondo oscuro opaco)
                const nameplate = new Container();
                const nameplateBg = new Graphics();
                nameplateBg.roundRect(0, 0, 104, 22, 3);
                nameplateBg.fill({ color: 0x090d16, alpha: 1.0 }); // fondo oscuro sólido
                nameplateBg.stroke({ width: 1, color: isOffline ? 0x64748b : 0x06b6d4 });
                nameplate.addChild(nameplateBg);

                const nameStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 13,
                    fontWeight: 'bold',
                    fill: isOffline ? '#94a3b8' : '#ffffff'
                });
                const nameText = new Text({ text: `${icon} ${title}`, style: nameStyle });
                nameText.x = 8;
                nameText.y = 3;
                nameplate.addChild(nameText);
                uiLayer.addChild(nameplate);

                // 2. Cartel con el texto "SIGUIENTE EN COLA" en UILayer (B0.2: Native resolution, fondo oscuro opaco, borde nítido)
                const barContainer = new Container();
                const barBg = new Graphics();
                barBg.roundRect(0, 0, 200, 20, 3);
                barBg.fill({ color: 0x090d16, alpha: 1.0 }); // Fondo oscuro sólido
                barBg.stroke({ width: 1, color: 0x334155 });
                barContainer.addChild(barBg);

                const barFill = new Graphics();
                barFill.alpha = 0;
                barContainer.addChild(barFill);

                const progressStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fill: '#f8fafc'
                });
                const progressText = new Text({ text: isOffline ? 'OFFLINE' : 'STANDBY (LISTO)', style: progressStyle });
                progressText.anchor.set(0.5);
                barContainer.addChild(progressText);
                uiLayer.addChild(barContainer);

                plotterProgressFillRef.current = barFill;
                plotterProgressTextRef.current = progressText;

                // Badge contador para plotter en UILayer (B0.2: 12px)
                const plotterBadgeContainer = new Container();
                const plotterBadgeBg = new Graphics();
                plotterBadgeContainer.addChild(plotterBadgeBg);

                const plotterBadgeStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                const plotterBadgeCountText = new Text({ text: '', style: plotterBadgeStyle });
                plotterBadgeCountText.anchor.set(0.5);
                plotterBadgeContainer.addChild(plotterBadgeCountText);
                badgesMapRef.current.set(id, plotterBadgeCountText);

                const pCount = countOrdersForStation(id, ordersRef.current);
                updateBadgeVisual(plotterBadgeBg, plotterBadgeCountText, pCount);
                plotterBadgeContainer.visible = pCount > 0;
                uiLayer.addChild(plotterBadgeContainer);

                // 4. Bobina de vinilo trasera ancha
                const rollSprite = new Sprite(getPlotterVinylRollTexture());
                rollSprite.x = plotterOffsetX + 28;
                rollSprite.y = plotterOffsetY + 2;
                visualContainer.addChild(rollSprite);

                // 5. Hoja impresa en bandeja delantera (Unrolling Printed Vinyl Sheet)
                const sheetGfx = new Graphics();
                sheetGfx.x = plotterOffsetX + 32;
                sheetGfx.y = plotterOffsetY + 22;
                sheetGfx.alpha = 0;
                visualContainer.addChild(sheetGfx);

                // 6. Chasis Roland VG2 Gran Formato (204x48 px)
                const chassisSprite = new Sprite(getPlotterChassisTexture(isOffline));
                chassisSprite.x = plotterOffsetX;
                chassisSprite.y = plotterOffsetY;
                visualContainer.addChild(chassisSprite);

                // 7. Carro de cabezales móvil
                const carriageSprite = new Sprite(getPlotterPrintheadTexture());
                carriageSprite.x = plotterOffsetX + 32;
                carriageSprite.y = plotterOffsetY + 14;
                visualContainer.addChild(carriageSprite);

                // 8. Destello cuadrado centrado sobre el cabezal (baja opacidad)
                const glowGfx = new Graphics();
                glowGfx.blendMode = 'normal';
                glowGfx.alpha = 0;
                visualContainer.addChild(glowGfx);

                // 9. LED de estado en tiempo real en panel de control
                const statusLed = new Graphics();
                statusLed.x = plotterOffsetX + plotterActualW - 32;
                statusLed.y = plotterOffsetY + 17;
                statusLed.rect(0, 0, 4, 4);
                statusLed.fill({ color: isOffline ? 0x334155 : 0x22c55e });
                visualContainer.addChild(statusLed);

                // Register plotter item in synchronized list
                plottersListRef.current.push({
                    id,
                    carriage: carriageSprite,
                    sheet: sheetGfx,
                    glow: glowGfx,
                    barFill,
                    progressText,
                    statusLed,
                    isOffline,
                    maquinaId: station.maquinaId,
                    baseX: x,
                    baseY: y,
                    width: plotterActualW,
                    barContainer,
                    barBg,
                    nameplate,
                    nameplateBg,
                    nameText,
                    plotterOffsetX,
                    plotterActualW
                });

                stationsUIRef.current.push({
                    id,
                    titleText: nameText,
                    badgeContainer: plotterBadgeContainer,
                    badgeCountText: plotterBadgeCountText,
                    badgeBg: plotterBadgeBg,
                    x: x + plotterOffsetX,
                    y,
                    width: plotterActualW,
                    height
                });

                if (id === 'plotter1') {
                    plotterCarriageSpriteRef.current = carriageSprite;
                    plotterSheetGfxRef.current = sheetGfx;
                    plotterGlowGfxRef.current = glowGfx;
                    plotterProgressFillRef.current = barFill;
                    plotterProgressTextRef.current = progressText;
                }
            }

            stationsLayer.addChild(visualContainer);

            // ================================================================
            // INDEPENDENT HIT AREA (Cubre la estación completa, de borde a borde)
            // ================================================================
            const hitArea = new Container();
            hitArea.x = x;
            hitArea.y = y;
            hitArea.eventMode = 'static';
            hitArea.cursor = 'pointer';
            hitArea.hitArea = new Rectangle(0, -2, width, height + 4);

            hitArea.on('pointerover', () => {
                hoveredStationRef.current = id;
                highlightGfx.clear();
                if (isPlotter) {
                    highlightGfx.roundRect(plotterOffsetX - 2, plotterOffsetY - 2, plotterActualW + 4, 50, 4);
                    highlightGfx.stroke({ width: 1.5, color: 0xf59e0b });
                } else {
                    highlightGfx.rect(-1, -1, width + 2, height + 2);
                    highlightGfx.stroke({ width: 1.5, color: 0xf59e0b });
                }

                // If hovering Plotter, display rich Hover HUD Tooltip inside canvas
                if (isPlotter && tooltipContainerRef.current) {
                    updatePlotterTooltip(id);
                    tooltipContainerRef.current.visible = true;
                }
            });

            hitArea.on('pointerout', () => {
                hoveredStationRef.current = null;
                highlightGfx.clear();
                if (selectedStationRef.current === id) {
                    if (isPlotter) {
                        highlightGfx.roundRect(plotterOffsetX - 2, plotterOffsetY - 2, plotterActualW + 4, 50, 4);
                        highlightGfx.stroke({ width: 2, color: 0x38bdf8 });
                    } else {
                        highlightGfx.rect(-2, -2, width + 4, height + 4);
                        highlightGfx.stroke({ width: 2, color: 0x38bdf8 });
                    }
                }

                if (isPlotter && tooltipContainerRef.current) {
                    tooltipContainerRef.current.visible = false;
                }
            });

            hitArea.on('pointertap', () => {
                // Abre la ficha de la estación (el detalle completo se abre desde ahí)
                handleStationTapRef.current(id);
            });

            hitAreasLayer.addChild(hitArea);
        });

        // ================================================================
        // HOVER TOOLTIP HUD (Pop-over on UI Layer) (B0.2: Native Resolution)
        // ================================================================
        // Íconos de alerta sobre cada estación (se muestran/ocultan según las alertas reales)
        alertIconsRef.current.clear();
        stationsUIRef.current.forEach((s) => {
            const c = new Container();
            const bg = new Graphics();
            const t = new Text({
                text: '!',
                style: new TextStyle({ fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold', fill: '#111827' })
            });
            t.anchor.set(0.5);
            c.addChild(bg);
            c.addChild(t);
            c.visible = false;
            uiLayer.addChild(c);
            alertIconsRef.current.set(s.id, { container: c, bg, text: t });
        });

        const tooltip = new Container();
        tooltip.x = 112;
        tooltip.y = 118;
        tooltip.visible = false;

        const tipBg = new Graphics();
        tipBg.roundRect(0, 0, 240, 72, 4);
        tipBg.fill({ color: 0x090d16, alpha: 1.0 }); // Fondo oscuro sólido opaco
        tipBg.stroke({ width: 1, color: 0x38bdf8 });
        tooltip.addChild(tipBg);

        const tipStyle = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 11,
            fill: '#f8fafc',
            lineHeight: 14
        });
        const tipText = new Text({ text: '', style: tipStyle });
        tipText.x = 8;
        tipText.y = 6;
        tooltip.addChild(tipText);

        tooltipContainerRef.current = tooltip;
        tooltipTextRef.current = tipText;
        uiLayer.addChild(tooltip);
    };

    /**
     * Updates Plotter Tooltip HUD with real active order data (B0.2: Coordinates scaled)
     */
    const updatePlotterTooltip = (stationId: StationId = 'plotter1') => {
        if (!tooltipTextRef.current || !tooltipContainerRef.current) return;
        const stations = getPixiStations();
        const station = stations.find(s => s.id === stationId);
        const isOffline = station?.estado === 'offline';
        const title = station?.title || 'Plotter';

        if (station) {
            tooltipContainerRef.current.x = Math.round(Math.max(10, Math.min(270, station.x + 20)) * currentScaleRef.current);
            tooltipContainerRef.current.y = Math.round((station.y + station.height + 4) * currentScaleRef.current);
        }

        if (isOffline) {
            tooltipTextRef.current.text =
                `🖨️ ${title.toUpperCase()}\n` +
                'Estado: DESCONECTADO (OFFLINE)\n' +
                'Sin comunicación de red\n' +
                'Click para configuración';
            return;
        }

        const printingOrders = ordersRef.current.filter(o => o.status === 'orden');
        if (printingOrders.length === 0) {
            tooltipTextRef.current.text =
                `🖨️ ${title.toUpperCase()}\n` +
                'Estado: EN ESPERA (STANDBY)\n' +
                'Cola: 0 órdenes pendientes\n' +
                'Click para ver historial';
            return;
        }

        const current = printingOrders[0];
        const m2 = (Number(current.ancho || 1) * Number(current.alto || 1)).toFixed(2);
        tooltipTextRef.current.text =
            `🖨️ SIGUIENTE EN COLA: OT #${current.ot || current.id}\n` +
            `Cliente: ${current.clienteNombre || 'Sin Cliente'}\n` +
            `Medidas: ${current.ancho}x${current.alto}m (${m2} m²)\n` +
            `Material: ${current.material || 'Vinilo'}\n` +
            `Cola: ${printingOrders.length} orden${printingOrders.length === 1 ? '' : 'es'} en espera`;
    };

    /**
     * Plotter Animation & Ticker Loop (Fase 2)
     */
    const setupPlotterTicker = (app: Application): (() => void) => {
        let frameCount = 0;
        let elapsedMs = 0;
        let lastSweepSoundTime = 0;
        let prevSweepCos = 0;

        const tickerFn = () => {
            frameCount++;

            try {
                elapsedMs += app.ticker.deltaMS;
                stationPropsRef.current.forEach((p) => p.update(elapsedMs));
                // El "pop" de los contadores vuelve a su tamaño normal
                stationsUIRef.current.forEach((s) => {
                    const bc = s.badgeContainer;
                    if (!bc || bc.destroyed || bc.scale.x === 1) return;
                    const next = bc.scale.x + (1 - bc.scale.x) * 0.18;
                    bc.scale.set(Math.abs(next - 1) < 0.01 ? 1 : next);
                });
                const dtMs = app.ticker.deltaMS;
                crewRef.current?.update(dtMs);
                // Extras del Bloque F
                fxRef.current?.update(dtMs);
                petRef.current?.update(dtMs, crewRef.current);
                guestsRef.current?.update(dtMs, crewRef.current?.isSpeaking() ?? false);
                eventsRef.current?.update(dtMs);
                skyRef.current?.update(dtMs, elapsedMs);
                if (frameCount % 120 === 0) skyRef.current?.setHour(hourOf(workshopNow()));
                if (frameCount % 60 === 0) updateClock();
                const pulse = 1 + 0.12 * Math.sin(elapsedMs / 260);
                alertIconsRef.current.forEach((ic) => {
                    if (ic.container.destroyed || !ic.container.visible) return;
                    ic.container.scale.set(pulse);
                });
                if (crewRef.current && bubblesRef.current) {
                    bubblesRef.current.sync(
                        [...crewRef.current.getWorkers(), ...(guestsRef.current?.getSnapshots() ?? [])],
                        currentScaleRef.current,
                        app.screen.width
                    );
                }

                // Refresh offline state periodically (~3s)
                if (frameCount % 180 === 0) {
                    try {
                        const currentStations = getPixiStations();
                        plottersListRef.current.forEach(p => {
                            const found = currentStations.find(s => s.id === p.id);
                            if (found) p.isOffline = found.estado === 'offline';
                        });
                    } catch (_) {}
                }

                const allPrintingOrders = ordersRef.current.filter(o => o.status === 'orden');

                plottersListRef.current.forEach((plotter, pIdx) => {
                    const { carriage, sheet, glow, barFill, progressText, statusLed, isOffline, width: plotterW } = plotter;
                    if (!carriage || carriage.destroyed ||
                        !sheet || sheet.destroyed ||
                        !glow || glow.destroyed ||
                        !barFill || barFill.destroyed ||
                        !progressText || progressText.destroyed ||
                        !statusLed || statusLed.destroyed) {
                        return;
                    }

                    const railMinX = plotter.plotterOffsetX + 32;
                    const railRange = plotter.plotterActualW - 74;

                    // Distribute orders: plotter 0 takes first, plotter 1 takes second, or standby
                    const assignedOrder = allPrintingOrders[pIdx] || (pIdx === 0 ? allPrintingOrders[0] : undefined);
                    const isPlotterPrinting = Boolean(assignedOrder) && !isOffline;
                    const isVip = Boolean(assignedOrder && (String(assignedOrder.batchId || '').includes('VIP') || String(assignedOrder.ot || '').includes('URG')));

                    if (isPlotterPrinting && assignedOrder) {
                        // 1. Carriage sweep
                        const sweepSpeed = 0.05;
                        const cosVal = Math.cos((frameCount + pIdx * 30) * sweepSpeed);
                        const sweepRatio = (Math.sin((frameCount + pIdx * 30) * sweepSpeed) + 1) / 2;

                        // Audio sweep trigger on new stroke pass with 2.5s cooldown
                        if (pIdx === 0 && cosVal >= 0 && prevSweepCos < 0 && Date.now() - lastSweepSoundTime > 2500) {
                            if (fxToggleRef.current.sndMachines) audioEngine.playPrintSweep();
                            lastSweepSoundTime = Date.now();
                        }
                        if (pIdx === 0) prevSweepCos = cosVal;

                        const targetCarriageX = railMinX + sweepRatio * railRange;
                        carriage.x += (targetCarriageX - carriage.x) * 0.2;

                        // 2. Destello cuadrado centrado con precisión sobre el carro (6-8 px, baja opacidad)
                        glow.clear();
                        const flashSize = 7;
                        const flashX = Math.round(carriage.x + 6 - flashSize / 2);
                        const flashY = Math.round(carriage.y + 4 - flashSize / 2);
                        glow.rect(flashX, flashY, flashSize, flashSize);
                        glow.fill({ color: isVip ? 0xfbbf24 : 0x38bdf8, alpha: 0.22 });
                        glow.alpha += (1 - glow.alpha) * 0.1;

                        // 3. Unrolling printed sheet (adaptado a la mesa ancha con bandas CMYK decorativas)
                        const sheetW = plotterW - 66;
                        const cycleProgress = ((frameCount / 2.5 + pIdx * 30) % 120) / 120;
                        const sheetH = 4 + Math.floor(cycleProgress * 10);

                        sheet.clear();
                        sheet.roundRect(0, 0, sheetW, sheetH, 1);
                        sheet.fill({ color: 0xf8fafc });
                        sheet.stroke({ width: 0.5, color: 0x94a3b8 });

                        // Bandas decorativas CMYK (Cian, Magenta, Amarillo, Negro)
                        const bandH = Math.min(3, Math.max(1, sheetH - 3));
                        const bandY = sheetH - bandH;
                        const colW = Math.floor((sheetW - 16) / 4);

                        // C (Cian)
                        sheet.rect(4, bandY, colW - 2, bandH);
                        sheet.fill({ color: 0x06b6d4 });
                        // M (Magenta)
                        sheet.rect(4 + colW, bandY, colW - 2, bandH);
                        sheet.fill({ color: 0xec4899 });
                        // Y (Amarillo)
                        sheet.rect(4 + colW * 2, bandY, colW - 2, bandH);
                        sheet.fill({ color: 0xeab308 });
                        // K (Negro)
                        sheet.rect(4 + colW * 3, bandY, colW - 2, bandH);
                        sheet.fill({ color: 0x0f172a });

                        // Fade suave al terminar cada ciclo antes de reiniciar
                        if (cycleProgress > 0.88) {
                            sheet.alpha = Math.max(0, 1 - (cycleProgress - 0.88) / 0.12);
                        } else {
                            sheet.alpha += (1 - sheet.alpha) * 0.1;
                        }

                        // NOTA TÉCNICA: En Luxius, el estado 'orden' representa una orden ingresada/enviada a taller
                        // que se encuentra "en cola" de espera para impresión en máquina, no un estado de impresión en tiempo real.
                        // No se calculan porcentajes ni progresos simulados hasta contar con telemetría directa de hardware.
                        // 4. Barra de actividad indeterminada animada con fondo oscuro sólido (sin números ni porcentajes inventados)
                        const barWidth = Math.round((plotter.plotterActualW - 24) * currentScaleRef.current);
                        const barH = 20;
                        barFill.clear();

                        // Haz de luz en la base de la barra como línea fina de actividad (no tapa el texto)
                        const beamW = Math.floor(barWidth * 0.35);
                        const beamOffset = ((frameCount * 2.5 + pIdx * 25) % (barWidth + beamW)) - beamW;
                        const beamStart = Math.max(0, beamOffset);
                        const beamEnd = Math.min(barWidth, beamOffset + beamW);
                        if (beamEnd > beamStart) {
                            barFill.roundRect(beamStart, barH - 3, beamEnd - beamStart, 2, 1);
                            barFill.fill({ color: isVip ? 0xfbbf24 : 0x38bdf8, alpha: 0.85 });
                        }
                        barFill.alpha += (1 - barFill.alpha) * 0.08;

                        const targetProgressText = assignedOrder
                            ? `SIGUIENTE EN COLA: OT #${assignedOrder.ot || assignedOrder.id}`
                            : 'STANDBY (LISTO)';
                        if (progressText.text !== targetProgressText) {
                            progressText.text = targetProgressText;
                        }

                        // 5. LED azul activo durante proceso
                        statusLed.clear();
                        statusLed.rect(0, 0, 4, 4);
                        statusLed.fill({ color: 0x38bdf8 });

                        // 6. Destellos diminutos sobre el cabezal de impresión
                        if (frameCount % 4 === 0) {
                            emitParticle(plotter.baseX + carriage.x + 6, plotter.baseY + carriage.y + 6, isVip);
                        }
                    } else if (isOffline) {
                        // Offline: grises, sin luz ni movimiento, carriage quieto en posición de reposo
                        carriage.x += (railMinX - carriage.x) * 0.06;
                        glow.alpha += (0 - glow.alpha) * 0.08;
                        sheet.alpha += (0 - sheet.alpha) * 0.08;
                        barFill.alpha += (0 - barFill.alpha) * 0.08;

                        if (progressText.text !== 'OFFLINE') {
                            progressText.text = 'OFFLINE';
                        }
                        statusLed.clear();
                        statusLed.rect(0, 0, 4, 4);
                        statusLed.fill({ color: 0x334155 }); // Sin luz (gris apagado)
                    } else {
                        // Standby (0 órdenes): quieto y LED verde
                        carriage.x += (railMinX - carriage.x) * 0.06;
                        glow.alpha += (0 - glow.alpha) * 0.08;
                        sheet.alpha += (0 - sheet.alpha) * 0.08;
                        barFill.alpha += (0 - barFill.alpha) * 0.08;

                        if (progressText.text !== 'STANDBY (LISTO)') {
                            progressText.text = 'STANDBY (LISTO)';
                        }
                        statusLed.clear();
                        statusLed.rect(0, 0, 4, 4);
                        statusLed.fill({ color: 0x22c55e }); // LED verde encendido
                    }
                });

                // Iluminación: luz cian bajo las máquinas en línea con trabajo en cola
                if (lightingRef.current) {
                    const active: Record<string, boolean> = {};
                    plottersListRef.current.forEach((p, i) => {
                        active[p.id] = Boolean(allPrintingOrders[i] || (i === 0 && allPrintingOrders[0])) && !p.isOffline;
                    });
                    lightingRef.current.update(elapsedMs, active);
                }

                // Update particles pool (max 40 items)
                particlesPoolRef.current.forEach(p => {
                    if (p.active && p.gfx && !p.gfx.destroyed) {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.life++;
                        p.gfx.x = p.x;
                        p.gfx.y = p.y;
                        p.gfx.alpha = Math.max(0, 1 - p.life / p.maxLife);

                        if (p.life >= p.maxLife) {
                            p.active = false;
                            p.gfx.visible = false;
                        }
                    }
                });
            } catch (frameErr) {
                console.warn('Plotter ticker frame skipped:', frameErr);
            }
        };

        app.ticker.add(tickerFn);
        return tickerFn;
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                minHeight: '420px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: PALETTE.floorBase,
                borderRadius: '8px',
                overflow: 'hidden',
                padding: '12px',
                boxSizing: 'border-box'
            }}
        >
            <WorkshopToolbar
                stations={getPixiStations().map((s) => ({ id: s.id, title: s.title, icon: s.icon }))}
                focusedId={focusedId}
                onFocus={focusStation}
                isFullscreen={isFs}
                onToggleFullscreen={toggleFullscreen}
                fx={fxToggles}
                onToggleFx={(k) => setFxToggles((prev) => ({ ...prev, [k]: !prev[k] }))}
                achievementsUnlocked={achievements.filter((a) => a.unlocked).length}
                achievementsTotal={achievements.length}
                achievementsOpen={achOpen}
                onToggleAchievements={() => setAchOpen((v) => !v)}
                pets={visiblePets}
                onOpenPet={(id) => {
                    const prof = petRef.current?.getPet(id)?.profile;
                    if (!prof) return;
                    if (fxToggleRef.current.petSound) playAnimalSound(prof.sound);
                    setSheetWorkerId(null);
                    setSheetStationId(null);
                    setWallPanel(null);
                    setSheetPetId(id);
                }}
                weatherText={
                    weather
                        ? `${weather.label} ${weather.tempC}°C · ${weather.place}${weather.isDefaultPlace ? ' (ubicación por defecto)' : ''}`
                        : null
                }
            />
            <div ref={canvasHostRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
            {sheetWorkerId && (() => {
                const snap = getWorkerSnapshot(sheetWorkerId);
                if (!snap) return null;
                const needed = ROLE_STATUS_MAP[snap.role];
                const waiting = needed ? orders.filter((o) => o.status === needed).length : 0;
                const orderToOpen = findOrderForWorker(sheetWorkerId);
                return (
                    <WorkerSheetCard
                        workerId={sheetWorkerId}
                        getSnapshot={getWorkerSnapshot}
                        waitingOrders={waiting}
                        onOpenOrder={
                            orderToOpen && onSelectOrderRef.current
                                ? () => {
                                      audioEngine.playClick();
                                      onSelectOrderRef.current?.(orderToOpen);
                                  }
                                : undefined
                        }
                        onClose={() => setSheetWorkerId(null)}
                        onOutsideClose={() => {
                            lastOutsideCloseRef.current = { id: sheetWorkerId, t: Date.now() };
                        }}
                    />
                );
            })()}
            {sheetStationId && (() => {
                const st = getPixiStations().find((s) => s.id === sheetStationId);
                if (!st) return null;
                const isMachine = st.id.startsWith('plotter') || st.id.startsWith('maquina_');
                return (
                    <StationSheetCard
                        station={st}
                        stats={computeStationStats(st, orders, workshopNow())}
                        alerts={alerts.filter((a) => a.stationId === st.id)}
                        isMachine={isMachine}
                        canOpenDetail={!isFs}
                        onOpenDetail={() => {
                            audioEngine.playClick();
                            setSheetStationId(null);
                            onSelectStationRef.current(st.id);
                        }}
                        onOpenOrder={onSelectOrderRef.current ? (o) => onSelectOrderRef.current?.(o) : undefined}
                        onClose={() => setSheetStationId(null)}
                        onOutsideClose={() => {
                            lastStationCloseRef.current = { id: st.id, t: Date.now() };
                        }}
                    />
                );
            })()}
            {sheetPetId && (() => {
                const pet = petRef.current?.getPet(sheetPetId);
                if (!pet) return null;
                return (
                    <PetSheetCard
                        profile={pet.profile}
                        getActivity={() => pet.getActivity()}
                        soundOn={fxToggles.petSound}
                        onPlaySound={() => playAnimalSound(pet.profile.sound)}
                        onClose={() => setSheetPetId(null)}
                        onOutsideClose={() => {
                            lastPetCloseRef.current = { id: pet.profile.id, t: Date.now() };
                        }}
                    />
                );
            })()}
            {wallPanel && (
                <WallPanel
                    mode={wallPanel}
                    orders={orders}
                    alerts={alerts}
                    stationTitle={(id) => getPixiStations().find((s) => s.id === id)?.title ?? id}
                    getNow={workshopNow}
                    onOpenOrder={onSelectOrderRef.current ? (o) => onSelectOrderRef.current?.(o) : undefined}
                    onFocusStation={(id) => {
                        audioEngine.playClick();
                        setWallPanel(null);
                        focusStation(id);
                        setSheetStationId(id);
                    }}
                    onClose={() => setWallPanel(null)}
                    onOutsideClose={() => {
                        lastWallCloseRef.current = { kind: wallPanel, t: Date.now() };
                    }}
                />
            )}
            {achOpen && <AchievementsPanel list={achievements} onClose={() => setAchOpen(false)} />}
            {toast && (
                <div
                    role="status"
                    style={{
                        position: 'absolute',
                        bottom: 18,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 30,
                        background: 'rgba(9,13,22,0.96)',
                        border: '1px solid #c8a24a',
                        color: '#fde68a',
                        padding: '8px 14px',
                        borderRadius: 8,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 700,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        pointerEvents: 'none'
                    }}
                >
                    {toast}
                </div>
            )}
        </div>
    );
};

export default WorkshopCanvasPixi;
