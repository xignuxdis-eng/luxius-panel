// WorkshopCanvasPixi.tsx - High-Fidelity PixiJS v8 Pixel Art Render Loop for XignuX Print Den
// Implements fractional scaling (95%+ container width, 16:9), refined low-contrast concrete floor,
// enlarged stations with short labels, independent hit-areas, diffOrders snapshotting,
// and the COMPLETE PLOTTER with moving carriage, unrolling vinyl, live progress bar, particles, and hover tooltip.

import React, { useRef, useEffect } from 'react';
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
export const BUILD_TAG = 'B0-r4';

const VIRTUAL_W = 480;
const VIRTUAL_H = 270;

export const WorkshopCanvasPixi: React.FC<WorkshopCanvasPixiProps> = ({
    orders,
    onSelectStation,
    onSelectOrder: _onSelectOrder,
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
    const stationsUIRef = useRef<StationUIItem[]>([]);
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

        if (diffs.length > 0) {
            pendingDiffsRef.current.push(...diffs);
        }

        // Update badge counters on all stations
        stationsUIRef.current.forEach((s) => {
            if (!s.badgeCountText || s.badgeCountText.destroyed) return;
            const count = countOrdersForStation(s.id, orders);
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
    }, [orders]);

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
        audioEngine.startAmbient();
        return () => {
            audioEngine.stopAmbient();
        };
    }, []);

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

                    const particlesLayer = new Container();
                    particlesLayer.label = 'ParticlesLayer';

                    const hitAreasLayer = new Container();
                    hitAreasLayer.label = 'HitAreasLayer';

                    worldContainer.addChild(mapLayer);
                    worldContainer.addChild(stationsLayer);
                    worldContainer.addChild(particlesLayer);
                    worldContainer.addChild(hitAreasLayer);

                    const uiLayer = new Container();
                    uiLayer.label = 'UILayer';

                    app.stage.addChild(worldContainer);
                    app.stage.addChild(uiLayer);

                    // 1. Build Refined Low-Contrast Background Map
                    buildBackgroundMap(mapLayer, VIRTUAL_W, VIRTUAL_H);

                    // 2. Build Stations with Full Animated Plotter (Fase 2)
                    buildStations(stationsLayer, hitAreasLayer, particlesLayer, uiLayer);

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

        const updateScale = () => {
            if (!container || !canvas || !app) return;
            const containerW = container.clientWidth || 480;
            const targetW = Math.max(480, Math.floor(containerW * 0.96));
            const maxAllowedH = Math.min(560, Math.floor(window.innerHeight * 0.62));

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

            // Scale world elements (map, stations, particles, hit areas)
            worldContainer.scale.set(finalScale, finalScale);

            // UI layer stays at 1:1 scale (native screen resolution)
            uiLayer.scale.set(1, 1);

            // Re-layout UI elements with coordinates multiplied by scale
            layoutUI(finalScale);

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
                audioEngine.playClick();
                onSelectStation(id);
            });

            hitAreasLayer.addChild(hitArea);
        });

        // ================================================================
        // HOVER TOOLTIP HUD (Pop-over on UI Layer) (B0.2: Native Resolution)
        // ================================================================
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
        let lastSweepSoundTime = 0;
        let prevSweepCos = 0;

        const tickerFn = () => {
            frameCount++;

            try {
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
                            audioEngine.playPrintSweep();
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
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: PALETTE.floorBase,
                borderRadius: '8px',
                overflow: 'hidden',
                padding: '12px',
                boxSizing: 'border-box'
            }}
        >
            <div ref={canvasHostRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
        </div>
    );
};

export default WorkshopCanvasPixi;
