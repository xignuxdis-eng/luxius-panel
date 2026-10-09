// WorkshopCanvasPixi.tsx - High-Fidelity PixiJS v8 Pixel Art Render Loop for XignuX Print Den
// Implements fractional scaling (95%+ container width, 16:9), refined low-contrast concrete floor,
// enlarged stations with short labels, independent hit-areas, diffOrders snapshotting,
// and the COMPLETE PLOTTER with moving carriage, unrolling vinyl, live progress bar, particles, and hover tooltip.

import React, { useRef, useEffect, useState } from 'react';
import { Application, Container, Graphics, Sprite, Text, TextStyle, Rectangle } from 'pixi.js';
import { Order, OrderStatus } from '@/types/orden';
import { StationId, StationConfig } from './types';
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
    destroyTextureCache,
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

export const WorkshopCanvasPixi: React.FC<WorkshopCanvasPixiProps> = ({
    orders,
    onSelectStation,
    onSelectOrder: _onSelectOrder,
    selectedStation,
    onError
}) => {
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

    // Plotter Interactive Elements Refs (Fase 2)
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
    }
    const plottersListRef = useRef<PlotterStationItem[]>([]);
    const plotterProgressFillRef = useRef<Graphics | null>(null);
    const plotterProgressTextRef = useRef<Text | null>(null);
    const plotterCarriageSpriteRef = useRef<Sprite | null>(null);
    const plotterSheetGfxRef = useRef<Graphics | null>(null);
    const plotterGlowGfxRef = useRef<Graphics | null>(null);
    const particlesPoolRef = useRef<ParticleItem[]>([]);
    const tooltipContainerRef = useRef<Container | null>(null);
    const tooltipTextRef = useRef<Text | null>(null);

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
                        const plotterW = Math.min(116, boundsW - 6);
                        const offX = Math.floor((boundsW - plotterW) / 2);
                        gfx.roundRect(offX - 2, 10, plotterW + 4, 52, 4);
                    } else {
                        gfx.rect(-2, -2, boundsW + 4, boundsH + 4);
                    }
                    gfx.stroke({ width: 2, color: 0x38bdf8 });
                } else if (isHovered) {
                    if (isPlotter) {
                        const plotterW = Math.min(116, boundsW - 6);
                        const offX = Math.floor((boundsW - plotterW) / 2);
                        gfx.roundRect(offX - 2, 10, plotterW + 4, 52, 4);
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

        const VIRTUAL_W = 480;
        const VIRTUAL_H = 270;

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
                        if (app.renderer && !app.renderer.destroyed) {
                            app.destroy({ removeView: true }, { children: true });
                        }
                    } catch (_) {}
                    return;
                }

                activeApp = app;
                appRef.current = app;
                if (typeof window !== 'undefined') {
                    (window as any).__PIXI_APP__ = app;
                }

                if (canvasHostRef.current) {
                    canvasHostRef.current.innerHTML = '';
                    const canvas = app.canvas;
                    canvasHostRef.current.appendChild(canvas);

                    // Root scene layers
                    const mapLayer = new Container();
                    mapLayer.label = 'MapLayer';

                    const stationsLayer = new Container();
                    stationsLayer.label = 'StationsLayer';

                    const particlesLayer = new Container();
                    particlesLayer.label = 'ParticlesLayer';

                    const hitAreasLayer = new Container();
                    hitAreasLayer.label = 'HitAreasLayer';

                    const uiLayer = new Container();
                    uiLayer.label = 'UILayer';

                    app.stage.addChild(mapLayer);
                    app.stage.addChild(stationsLayer);
                    app.stage.addChild(particlesLayer);
                    app.stage.addChild(hitAreasLayer);
                    app.stage.addChild(uiLayer);

                    // 1. Build Refined Low-Contrast Background Map
                    buildBackgroundMap(mapLayer, VIRTUAL_W, VIRTUAL_H);

                    // 2. Build Stations with Full Animated Plotter (Fase 2)
                    buildStations(stationsLayer, hitAreasLayer, particlesLayer, uiLayer);

                    // 3. Initialize Particle Pool
                    initParticles(particlesLayer, 18);

                    // 4. Fractional Scaling setup
                    resizeObserver = setupFractionalScaling(canvas, containerRef.current);

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
            highlightsMapRef.current.clear();
            badgesMapRef.current.clear();
            particlesPoolRef.current = [];
            plottersListRef.current = [];

            if (activeApp) {
                try {
                    if (activeApp.ticker) {
                        activeApp.ticker.stop();
                    }
                    if (activeApp.renderer && !activeApp.renderer.destroyed) {
                        activeApp.destroy({ removeView: true }, { children: true });
                    }
                } catch (err) {
                    console.warn('Safe Pixi destroy notice:', err);
                }
                activeApp = null;
                appRef.current = null;
                if (typeof window !== 'undefined') {
                    (window as any).__PIXI_APP__ = null;
                }
            }

            if (canvasHostRef.current) {
                canvasHostRef.current.innerHTML = '';
            }
        };
    }, []);

    /**
     * FRACTIONAL SCALING: Fills 96% of container width, maintaining 16:9 ratio.
     * Prevents ResizeObserver loop and layout thrashing.
     */
    const setupFractionalScaling = (canvas: HTMLCanvasElement, container: HTMLDivElement | null): ResizeObserver | null => {
        if (!container || !canvas) return null;

        let lastW = 0;
        let lastH = 0;
        let rafId: number | null = null;

        const updateScale = () => {
            if (!container || !canvas) return;
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

            canvas.style.width = `${displayW}px`;
            canvas.style.height = `${displayH}px`;
            canvas.style.imageRendering = 'pixelated';
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

        const wallH = 38;

        // A. Upper Wall & Steel Structure
        for (let x = 0; x < mapW; x += 16) {
            const wallSprite = new Sprite(texWall);
            wallSprite.x = x;
            wallSprite.y = 8;
            layer.addChild(wallSprite);
        }

        // 3 Large Low-glare industrial windows (enlarged)
        const windowPositions = [36, 176, 356];
        windowPositions.forEach(wx => {
            const winSprite = new Sprite(texWindow);
            winSprite.x = wx;
            winSprite.y = 11;
            layer.addChild(winSprite);
        });

        // "DEN" Sign (enlarged, centered above workshop core)
        const denSign = new Sprite(texSignDen);
        denSign.x = 226;
        denSign.y = 11;
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

        // C. Clean, Muted 2px Safety Guide Lines (Replaces distracting hazard blocks)
        const guideGfx = new Graphics();
        // Top guide line
        guideGfx.rect(14, 118, mapW - 28, 2);
        guideGfx.fill({ color: 0x334155, alpha: 0.6 });
        // Bottom guide line
        guideGfx.rect(14, 144, mapW - 28, 2);
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
                maxLife: 30,
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
        p.x = x + (Math.random() * 8 - 4);
        p.y = y + (Math.random() * 4 - 2);
        p.vx = (Math.random() - 0.5) * 0.4;
        p.vy = -0.3 - Math.random() * 0.4;
        p.life = 0;
        p.maxLife = 24 + Math.floor(Math.random() * 16);
        p.color = isVip ? 0xfbbf24 : (Math.random() > 0.4 ? 0x38bdf8 : 0xffffff);

        try {
            p.gfx.clear();
            p.gfx.rect(0, 0, isVip ? 2 : 1.5, isVip ? 2 : 1.5);
            p.gfx.fill({ color: p.color });
            p.gfx.x = p.x;
            p.gfx.y = p.y;
            p.gfx.alpha = 0.9;
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

        stations.forEach(station => {
            const { id, x, y, width, height, title, icon, color } = station;

            // Visual Container
            const visualContainer = new Container();
            visualContainer.x = x;
            visualContainer.y = y;
            (visualContainer as any)._stationW = width;
            (visualContainer as any)._stationH = height;

            const isPlotter = id === 'plotter1' || id === 'plotter2' || id.startsWith('maquina_');

            if (!isPlotter) {
                // Base Floor Platform for normal workshop stations
                const baseGfx = new Graphics();
                baseGfx.rect(0, 0, width, height);
                baseGfx.fill({ color: 0x161c24, alpha: 0.96 });
                baseGfx.stroke({ width: 1, color: parseInt(color.replace('#', '0x'), 16) || 0x334155 });
                visualContainer.addChild(baseGfx);

                // Title Bar
                const headerGfx = new Graphics();
                headerGfx.rect(0, 0, width, 14);
                headerGfx.fill({ color: parseInt(color.replace('#', '0x'), 16) || 0x334155 });
                visualContainer.addChild(headerGfx);

                // Station Title Text (Concise: "Diseño", "Insumos", etc.)
                const titleStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 9,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                const titleText = new Text({
                    text: `${icon} ${title}`,
                    style: titleStyle
                });
                titleText.x = 4;
                titleText.y = 1;
                visualContainer.addChild(titleText);
            }

            // Selection / Hover Highlight Frame
            const highlightGfx = new Graphics();
            visualContainer.addChild(highlightGfx);
            highlightsMapRef.current.set(id, highlightGfx);

            // Notification Badge (Counter)
            const badgeContainer = new Container();
            const badgeBg = new Graphics();
            badgeBg.circle(0, 0, 7.5);
            badgeBg.fill({ color: 0xef4444 });
            badgeBg.stroke({ width: 1, color: 0xffffff });
            badgeContainer.addChild(badgeBg);

            const badgeStyle = new TextStyle({
                fontFamily: 'monospace',
                fontSize: 8,
                fontWeight: 'bold',
                fill: '#ffffff'
            });
            const badgeCountText = new Text({ text: '', style: badgeStyle });
            badgeCountText.anchor.set(0.5);
            badgeContainer.addChild(badgeCountText);
            badgesMapRef.current.set(id, badgeCountText);

            const count = countOrdersForStation(id, ordersRef.current);
            badgeCountText.text = count > 0 ? `${count}` : '';
            badgeContainer.visible = count > 0;
            visualContainer.addChild(badgeContainer);

            // ================================================================
            // FASE 2: DETAILED GRAND FORMAT PLOTTER STATION (Sin marco de tarjeta)
            // ================================================================
            let plotterOffsetX = 0;
            let plotterOffsetY = 14;
            let plotterActualW = 110;

            if (isPlotter) {
                const isOffline = station.estado === 'offline';
                plotterActualW = Math.min(116, width - 6);
                plotterOffsetX = Math.floor((width - plotterActualW) / 2);
                plotterOffsetY = 14;

                // Cartel pequeño de nombre exclusivo para la máquina
                const nameplate = new Container();
                const nameplateBg = new Graphics();
                nameplateBg.roundRect(0, 0, 78, 11, 2);
                nameplateBg.fill({ color: 0x0f172a, alpha: 0.9 });
                nameplateBg.stroke({ width: 1, color: isOffline ? 0x64748b : 0x38bdf8 });
                nameplate.addChild(nameplateBg);

                const nameStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 7,
                    fontWeight: 'bold',
                    fill: isOffline ? '#94a3b8' : '#ffffff'
                });
                const nameText = new Text({ text: `${icon} ${title}`, style: nameStyle });
                nameText.x = 4;
                nameText.y = 1;
                nameplate.addChild(nameText);
                nameplate.x = plotterOffsetX;
                nameplate.y = plotterOffsetY - 13;
                visualContainer.addChild(nameplate);

                // Badge posicionado en la esquina superior derecha del plotter
                badgeContainer.x = plotterOffsetX + plotterActualW - 4;
                badgeContainer.y = plotterOffsetY - 7;

                // 1. Rear Vinyl Roll
                const rollSprite = new Sprite(getPlotterVinylRollTexture());
                rollSprite.x = plotterOffsetX + 17;
                rollSprite.y = plotterOffsetY + 3;
                visualContainer.addChild(rollSprite);

                // 2. Unrolling Printed Vinyl Sheet (Front catch tray)
                const sheetGfx = new Graphics();
                sheetGfx.x = plotterOffsetX + 20;
                sheetGfx.y = plotterOffsetY + 24;
                sheetGfx.alpha = 0;
                visualContainer.addChild(sheetGfx);

                // 3. Main Plotter Roland Chassis
                const chassisSprite = new Sprite(getPlotterChassisTexture(isOffline));
                chassisSprite.x = plotterOffsetX;
                chassisSprite.y = plotterOffsetY;
                visualContainer.addChild(chassisSprite);

                // 4. Moving Printhead Carriage
                const carriageSprite = new Sprite(getPlotterPrintheadTexture());
                carriageSprite.x = plotterOffsetX + 24;
                carriageSprite.y = plotterOffsetY + 15;
                visualContainer.addChild(carriageSprite);

                // 5. Printing Light / Glow (anclado en cabezal sin doble offset)
                const glowGfx = new Graphics();
                glowGfx.blendMode = 'add';
                glowGfx.alpha = 0;
                visualContainer.addChild(glowGfx);

                // 6. Real-time Status LED on control panel
                const statusLed = new Graphics();
                statusLed.x = plotterOffsetX + plotterActualW - 22;
                statusLed.y = plotterOffsetY + 19;
                statusLed.rect(0, 0, 3, 3);
                statusLed.fill({ color: isOffline ? 0x334155 : 0x22c55e });
                visualContainer.addChild(statusLed);

                // 7. Floating Progress / Activity Bar anclada justo sobre la máquina
                const barContainer = new Container();
                barContainer.x = plotterOffsetX + 6;
                barContainer.y = plotterOffsetY - 2;

                const barBg = new Graphics();
                barBg.rect(0, 0, plotterActualW - 12, 6);
                barBg.fill({ color: 0x0f172a, alpha: 0.9 });
                barBg.stroke({ width: 1, color: 0x334155 });
                barContainer.addChild(barBg);

                const barFill = new Graphics();
                barFill.alpha = 0;
                barContainer.addChild(barFill);

                const progressStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 5.5,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                const progressText = new Text({ text: isOffline ? 'OFFLINE' : 'STANDBY (LISTO)', style: progressStyle });
                progressText.x = (plotterActualW - 12) / 2;
                progressText.y = 3;
                progressText.anchor.set(0.5);
                barContainer.addChild(progressText);

                visualContainer.addChild(barContainer);

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
                    width: plotterActualW
                });

                if (id === 'plotter1') {
                    plotterCarriageSpriteRef.current = carriageSprite;
                    plotterSheetGfxRef.current = sheetGfx;
                    plotterGlowGfxRef.current = glowGfx;
                    plotterProgressFillRef.current = barFill;
                    plotterProgressTextRef.current = progressText;
                }
            } else {
                badgeContainer.x = width - 8;
                badgeContainer.y = -2;
            }

            stationsLayer.addChild(visualContainer);

            // ================================================================
            // INDEPENDENT HIT AREA (Decoupled from visual sprites)
            // ================================================================
            const hitArea = new Container();
            hitArea.x = x;
            hitArea.y = y;
            hitArea.eventMode = 'static';
            hitArea.cursor = 'pointer';
            hitArea.hitArea = new Rectangle(0, 0, width, height);

            hitArea.on('pointerover', () => {
                hoveredStationRef.current = id;
                highlightGfx.clear();
                if (isPlotter) {
                    highlightGfx.roundRect(plotterOffsetX - 2, plotterOffsetY - 4, plotterActualW + 4, 52, 4);
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
                        highlightGfx.roundRect(plotterOffsetX - 2, plotterOffsetY - 4, plotterActualW + 4, 52, 4);
                    } else {
                        highlightGfx.rect(-2, -2, width + 4, height + 4);
                    }
                    highlightGfx.stroke({ width: 2, color: 0x38bdf8 });
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
        // HOVER TOOLTIP HUD (Pop-over on UI Layer)
        // ================================================================
        const tooltip = new Container();
        tooltip.x = 112;
        tooltip.y = 118;
        tooltip.visible = false;

        const tipBg = new Graphics();
        tipBg.rect(0, 0, 150, 48);
        tipBg.fill({ color: 0x0f172a, alpha: 0.95 });
        tipBg.stroke({ width: 1, color: 0x38bdf8 });
        tooltip.addChild(tipBg);

        const tipStyle = new TextStyle({
            fontFamily: 'monospace',
            fontSize: 7,
            fill: '#f8fafc',
            lineHeight: 9
        });
        const tipText = new Text({ text: '', style: tipStyle });
        tipText.x = 6;
        tipText.y = 4;
        tooltip.addChild(tipText);

        tooltipContainerRef.current = tooltip;
        tooltipTextRef.current = tipText;
        uiLayer.addChild(tooltip);
    };

    /**
     * Updates Plotter Tooltip HUD with real active order data
     */
    /**
     * Updates Plotter Tooltip HUD with real active order data
     */
    const updatePlotterTooltip = (stationId: StationId = 'plotter1') => {
        if (!tooltipTextRef.current || !tooltipContainerRef.current) return;
        const stations = getPixiStations();
        const station = stations.find(s => s.id === stationId);
        const isOffline = station?.estado === 'offline';
        const title = station?.title || 'Plotter';

        if (station) {
            tooltipContainerRef.current.x = Math.max(10, Math.min(310, station.x - 10));
            tooltipContainerRef.current.y = station.y + station.height + 4;
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

                    const railMinX = Math.floor((plotterW - 110) / 2) + 24;
                    const railRange = 56;

                    // Distribute orders: plotter 0 takes first, plotter 1 takes second, or standby
                    const assignedOrder = allPrintingOrders[pIdx] || (pIdx === 0 ? allPrintingOrders[0] : undefined);
                    const isPlotterPrinting = Boolean(assignedOrder) && !isOffline;
                    const isVip = Boolean(assignedOrder && (String(assignedOrder.batchId || '').includes('VIP') || String(assignedOrder.ot || '').includes('URG')));

                    if (isPlotterPrinting && assignedOrder) {
                        // 1. Carriage sweep
                        const sweepSpeed = 0.06;
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

                        // 2. Glow (centrado con precisión en el cabezal de impresión, sin desfasajes)
                        glow.clear();
                        glow.circle(carriage.x + 6, carriage.y + 4, 6);
                        glow.fill({ color: isVip ? 0xfbbf24 : 0x38bdf8, alpha: 0.35 });
                        glow.alpha += (1 - glow.alpha) * 0.08;

                        // 3. Unrolling printed sheet (estable, sin reinicio ni bucles artificiales)
                        const sheetH = 14;
                        sheet.clear();
                        sheet.rect(0, 0, 70, sheetH);
                        sheet.fill({ color: 0xf8fafc });
                        sheet.stroke({ width: 0.5, color: 0x94a3b8 });
                        sheet.rect(4, Math.max(0, sheetH - 4), 62, 3);
                        sheet.fill({ color: 0x06b6d4 });
                        sheet.rect(20, Math.max(0, sheetH - 4), 24, 3);
                        sheet.fill({ color: 0xec4899 });
                        sheet.rect(36, Math.max(0, sheetH - 4), 16, 3);
                        sheet.fill({ color: 0xeab308 });
                        sheet.alpha += (1 - sheet.alpha) * 0.08;

                        // NOTA TÉCNICA: En Luxius, el estado 'orden' representa una orden ingresada/enviada a taller
                        // que se encuentra "en cola" de espera para impresión en máquina, no un estado de impresión en tiempo real.
                        // No se calculan porcentajes ni progresos simulados hasta contar con telemetría directa de hardware.
                        // 4. Barra de actividad indeterminada animada (sin números ni porcentajes inventados)
                        const barWidth = plotterW - 12;
                        const barH = 6;
                        barFill.clear();
                        barFill.rect(0, 0, barWidth, barH);
                        barFill.fill({ color: 0x0f172a, alpha: 0.85 });
                        // Haz de luz en movimiento horizontal continuo (estilo barra indeterminada)
                        const beamW = Math.floor(barWidth * 0.35);
                        const beamOffset = ((frameCount * 1.5 + pIdx * 25) % (barWidth + beamW)) - beamW;
                        const beamStart = Math.max(0, beamOffset);
                        const beamEnd = Math.min(barWidth, beamOffset + beamW);
                        if (beamEnd > beamStart) {
                            barFill.rect(beamStart, 0, beamEnd - beamStart, barH);
                            barFill.fill({ color: isVip ? 0xfbbf24 : 0x0ea5e9 });
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
                        statusLed.rect(0, 0, 3, 3);
                        statusLed.fill({ color: 0x38bdf8 });

                        // 6. Particles
                        if (frameCount % 4 === 0) {
                            emitParticle(plotter.baseX + carriage.x + 6, plotter.baseY + carriage.y + 10, isVip);
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
                        statusLed.rect(0, 0, 3, 3);
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
                        statusLed.rect(0, 0, 3, 3);
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
