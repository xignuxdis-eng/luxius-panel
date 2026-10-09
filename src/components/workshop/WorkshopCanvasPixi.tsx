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
    selectedStation
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const [hoveredStation, setHoveredStation] = useState<StationId | null>(null);

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
            const count = countOrdersForStation(stationId, orders);
            textNode.text = count > 0 ? `${count}` : '';
            textNode.visible = count > 0;
            if (textNode.parent) {
                textNode.parent.visible = count > 0;
            }
        });
    }, [orders]);

    useEffect(() => {
        selectedStationRef.current = selectedStation;
        // Refresh highlight states
        highlightsMapRef.current.forEach((gfx, stationId) => {
            const isSelected = selectedStation === stationId;
            const isHovered = hoveredStation === stationId;
            gfx.clear();
            const parent = gfx.parent as Container;
            const boundsW = parent ? (parent as any)._stationW || 86 : 86;
            const boundsH = parent ? (parent as any)._stationH || 66 : 66;

            if (isSelected) {
                gfx.rect(-2, -2, boundsW + 4, boundsH + 4);
                gfx.stroke({ width: 2, color: 0x38bdf8 });
            } else if (isHovered) {
                gfx.rect(-1, -1, boundsW + 2, boundsH + 2);
                gfx.stroke({ width: 1.5, color: 0xf59e0b });
            }
        });
    }, [selectedStation, hoveredStation]);

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
        const app = new Application();
        (app as any)._cancelResize = () => {};
        appRef.current = app;

        const VIRTUAL_W = 480;
        const VIRTUAL_H = 270;

        const safeDestroy = (targetApp: Application | null) => {
            if (!targetApp) return;
            try {
                if (typeof (targetApp as any)._cancelResize !== 'function') {
                    (targetApp as any)._cancelResize = () => {};
                }
                targetApp.destroy(true, { children: true });
            } catch (err) {
                console.warn('Safe Pixi destroy notice:', err);
            }
        };

        const initPixi = async () => {
            try {
                await app.init({
                    width: VIRTUAL_W,
                    height: VIRTUAL_H,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                    roundPixels: true,
                    backgroundColor: 0x090714
                });

                if (isCancelled || !canvasHostRef.current) {
                    safeDestroy(app);
                    return;
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
                    setupPlotterTicker(app);
                }
            } catch (initErr) {
                console.error('Failed to initialize Pixi Application:', initErr);
            }
        };

        initPixi();

        const handleVisibilityChange = () => {
            if (!appRef.current) return;
            if (document.visibilityState === 'hidden') {
                appRef.current.ticker.stop();
            } else {
                appRef.current.ticker.start();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isCancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            destroyTextureCache();
            if (appRef.current) {
                safeDestroy(appRef.current);
                appRef.current = null;
            }
            if (canvasHostRef.current) {
                canvasHostRef.current.innerHTML = '';
            }
            highlightsMapRef.current.clear();
            badgesMapRef.current.clear();
            particlesPoolRef.current = [];
        };
    }, []);

    /**
     * FRACTIONAL SCALING: Fills 96% of container width, maintaining 16:9 ratio.
     * Allows large, commanding presentation on 1080p, 2K and 4K displays while preserving nearest pixel art.
     */
    const setupFractionalScaling = (canvas: HTMLCanvasElement, container: HTMLDivElement | null): ResizeObserver | null => {
        if (!container) return null;

        const updateScale = () => {
            const containerW = container.clientWidth || 480;
            // Target 96% container width to fill comfortably with slight breathing margin
            const targetW = Math.max(480, Math.floor(containerW * 0.96));
            const maxAllowedH = Math.min(560, Math.floor(window.innerHeight * 0.62));

            // Scale to fill width, but respect max-height
            const scaleByW = targetW / 480;
            const scaleByH = maxAllowedH / 270;
            const finalScale = Math.max(1, Math.min(scaleByW, scaleByH));

            const displayW = Math.round(480 * finalScale);
            const displayH = Math.round(270 * finalScale);

            canvas.style.width = `${displayW}px`;
            canvas.style.height = `${displayH}px`;
            canvas.style.imageRendering = 'pixelated';
            canvas.style.display = 'block';
            canvas.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.7)';
            canvas.style.border = '2px solid #1e293b';
            canvas.style.borderRadius = '8px';
        };

        const ro = new ResizeObserver(() => updateScale());
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

        // 3 Low-glare industrial windows
        const windowPositions = [48, 208, 368];
        windowPositions.forEach(wx => {
            const winSprite = new Sprite(texWindow);
            winSprite.x = wx;
            winSprite.y = 12;
            layer.addChild(winSprite);
        });

        // "DEN" Sign
        const denSign = new Sprite(texSignDen);
        denSign.x = 228;
        denSign.y = 14;
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

        p.active = true;
        p.x = x + (Math.random() * 8 - 4);
        p.y = y + (Math.random() * 4 - 2);
        p.vx = (Math.random() - 0.5) * 0.4;
        p.vy = -0.3 - Math.random() * 0.4;
        p.life = 0;
        p.maxLife = 24 + Math.floor(Math.random() * 16);
        p.color = isVip ? 0xfbbf24 : (Math.random() > 0.4 ? 0x38bdf8 : 0xffffff);

        p.gfx.clear();
        p.gfx.rect(0, 0, isVip ? 2 : 1.5, isVip ? 2 : 1.5);
        p.gfx.fill({ color: p.color });
        p.gfx.x = p.x;
        p.gfx.y = p.y;
        p.gfx.alpha = 0.9;
        p.gfx.visible = true;
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

            // Base Floor Platform
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

            // Station Title Text (Concise: "Diseño", "Plotter", "Insumos", etc.)
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

            // Selection / Hover Highlight Frame
            const highlightGfx = new Graphics();
            visualContainer.addChild(highlightGfx);
            highlightsMapRef.current.set(id, highlightGfx);

            // Notification Badge (Counter)
            const badgeContainer = new Container();
            badgeContainer.x = width - 8;
            badgeContainer.y = -2;

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
            // FASE 2: DETAILED GRAND FORMAT PLOTTER STATION
            // ================================================================
            if (id === 'plotter1' || id === 'plotter2') {
                const isOffline = station.estado === 'offline';
                const plotterW = 110;
                const offsetX = Math.floor((width - plotterW) / 2);
                const offsetY = 16;

                // 1. Rear Vinyl Roll
                const rollSprite = new Sprite(getPlotterVinylRollTexture());
                rollSprite.x = offsetX + 17;
                rollSprite.y = offsetY + 3;
                visualContainer.addChild(rollSprite);

                // 2. Unrolling Printed Vinyl Sheet (Front catch tray)
                const sheetGfx = new Graphics();
                sheetGfx.x = offsetX + 20;
                sheetGfx.y = offsetY + 24;
                visualContainer.addChild(sheetGfx);
                plotterSheetGfxRef.current = sheetGfx;

                // 3. Main Plotter Roland Chassis
                const chassisSprite = new Sprite(getPlotterChassisTexture(isOffline));
                chassisSprite.x = offsetX;
                chassisSprite.y = offsetY;
                visualContainer.addChild(chassisSprite);

                // 4. Moving Printhead Carriage
                const carriageSprite = new Sprite(getPlotterPrintheadTexture());
                carriageSprite.x = offsetX + 24;
                carriageSprite.y = offsetY + 15;
                visualContainer.addChild(carriageSprite);
                plotterCarriageSpriteRef.current = carriageSprite;

                // 5. Printing Light / Glow (blendMode add)
                const glowGfx = new Graphics();
                glowGfx.blendMode = 'add';
                glowGfx.x = offsetX + 24;
                glowGfx.y = offsetY + 20;
                visualContainer.addChild(glowGfx);
                plotterGlowGfxRef.current = glowGfx;

                // 6. Floating Progress Bar (Top of plotter)
                const barContainer = new Container();
                barContainer.x = offsetX + 6;
                barContainer.y = -9;

                const barBg = new Graphics();
                barBg.rect(0, 0, plotterW - 12, 7);
                barBg.fill({ color: 0x0f172a, alpha: 0.9 });
                barBg.stroke({ width: 1, color: 0x334155 });
                barContainer.addChild(barBg);

                const barFill = new Graphics();
                barContainer.addChild(barFill);
                plotterProgressFillRef.current = barFill;

                const progressStyle = new TextStyle({
                    fontFamily: 'monospace',
                    fontSize: 6,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                });
                const progressText = new Text({ text: 'PRINTING 0%', style: progressStyle });
                progressText.x = (plotterW - 12) / 2;
                progressText.y = 3.5;
                progressText.anchor.set(0.5);
                barContainer.addChild(progressText);
                plotterProgressTextRef.current = progressText;

                visualContainer.addChild(barContainer);
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
                setHoveredStation(id);
                highlightGfx.clear();
                highlightGfx.rect(-1, -1, width + 2, height + 2);
                highlightGfx.stroke({ width: 1.5, color: 0xf59e0b });

                // If hovering Plotter, display rich Hover HUD Tooltip
                if (id.startsWith('plotter') && tooltipContainerRef.current) {
                    updatePlotterTooltip();
                    tooltipContainerRef.current.visible = true;
                }
            });

            hitArea.on('pointerout', () => {
                setHoveredStation(null);
                highlightGfx.clear();
                if (selectedStationRef.current === id) {
                    highlightGfx.rect(-2, -2, width + 4, height + 4);
                    highlightGfx.stroke({ width: 2, color: 0x38bdf8 });
                }

                if (id.startsWith('plotter') && tooltipContainerRef.current) {
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
    const updatePlotterTooltip = () => {
        if (!tooltipTextRef.current) return;
        const printingOrders = ordersRef.current.filter(o => o.status === 'orden');
        if (printingOrders.length === 0) {
            tooltipTextRef.current.text =
                '🖨️ PLOTTER PRINCIPAL\n' +
                'Estado: EN ESPERA (STANDBY)\n' +
                'Cola: 0 órdenes pendientes\n' +
                'Click para ver historial';
            return;
        }

        const current = printingOrders[0];
        const m2 = (Number(current.ancho || 1) * Number(current.alto || 1)).toFixed(2);
        tooltipTextRef.current.text =
            `🖨️ EN PRODUCCIÓN: OT #${current.ot || current.id}\n` +
            `Cliente: ${current.clienteNombre || 'Sin Cliente'}\n` +
            `Medidas: ${current.ancho}x${current.alto}m (${m2} m²)\n` +
            `Material: ${current.material || 'Vinilo'}\n` +
            `Cola: ${printingOrders.length} ordenes listas`;
    };

    /**
     * Plotter Animation & Ticker Loop (Fase 2)
     */
    const setupPlotterTicker = (app: Application) => {
        let frameCount = 0;
        let lastSweepSoundTime = 0;
        let prevSweepCos = 0;

        app.ticker.add(() => {
            frameCount++;
            const printingOrders = ordersRef.current.filter(o => o.status === 'orden');
            const isPrinting = printingOrders.length > 0;
            const currentJob = printingOrders[0];
            const isVip = Boolean(currentJob && (String(currentJob.batchId || '').includes('VIP') || String(currentJob.ot || '').includes('URG')));

            const carriage = plotterCarriageSpriteRef.current;
            const sheet = plotterSheetGfxRef.current;
            const glow = plotterGlowGfxRef.current;
            const progressFill = plotterProgressFillRef.current;
            const progressText = plotterProgressTextRef.current;

            if (!carriage || !sheet || !glow || !progressFill || !progressText) return;

            const stations = getPixiStations();
            const plotterStation = stations.find(s => s.id === 'plotter1');
            const isOffline = plotterStation?.estado === 'offline';

            const railMinX = Math.floor((154 - 110) / 2) + 16;
            const railRange = 66;

            if (isPrinting && !isOffline) {
                // 1. Animate Printhead Carriage across the rail
                const sweepSpeed = 0.06;
                const cosVal = Math.cos(frameCount * sweepSpeed);
                const sweepRatio = (Math.sin(frameCount * sweepSpeed) + 1) / 2; // 0..1

                // Audio sweep trigger on new stroke pass with 2.5s cooldown
                if (cosVal >= 0 && prevSweepCos < 0 && Date.now() - lastSweepSoundTime > 2500) {
                    audioEngine.playPrintSweep();
                    lastSweepSoundTime = Date.now();
                }
                prevSweepCos = cosVal;

                const targetCarriageX = railMinX + sweepRatio * railRange;
                carriage.x += (targetCarriageX - carriage.x) * 0.2;

                // 2. Animate Printhead Glow with fade-in
                glow.clear();
                glow.circle(carriage.x + 6, carriage.y + 4, 8 + Math.sin(frameCount * 0.2) * 2);
                glow.fill({ color: isVip ? 0xfbbf24 : 0x38bdf8, alpha: 0.35 });
                glow.alpha += (1 - glow.alpha) * 0.08;

                // 3. Animate Unrolling Printed Sheet with fade-in
                const cycleProgress = ((frameCount / 3) % 100) / 100;
                const sheetH = 4 + Math.floor(cycleProgress * 11);
                sheet.clear();
                sheet.rect(0, 0, 70, sheetH);
                sheet.fill({ color: 0xf8fafc });
                sheet.stroke({ width: 0.5, color: 0x94a3b8 });
                // CMYK ink bands
                sheet.rect(4, Math.max(0, sheetH - 4), 62, 3);
                sheet.fill({ color: 0x06b6d4 });
                sheet.rect(20, Math.max(0, sheetH - 4), 24, 3);
                sheet.fill({ color: 0xec4899 });
                sheet.rect(36, Math.max(0, sheetH - 4), 16, 3);
                sheet.fill({ color: 0xeab308 });
                sheet.alpha += (1 - sheet.alpha) * 0.08;

                // 4. Update Floating Progress Bar
                const percent = Math.floor(cycleProgress * 100);
                const barWidth = 98;
                progressFill.clear();
                progressFill.rect(0, 0, Math.max(2, (barWidth * percent) / 100), 7);
                progressFill.fill({ color: isVip ? 0xfbbf24 : 0x22c55e });
                progressFill.alpha += (1 - progressFill.alpha) * 0.08;
                progressText.text = `OT #${currentJob.ot || currentJob.id} · ${percent}%`;

                // 5. Emit particles at carriage position
                if (frameCount % 4 === 0) {
                    emitParticle(108 + carriage.x + 6, 42 + carriage.y + 10, isVip);
                }
            } else {
                // Standby / Offline State with Smooth Lerp Fades
                // Smoothly park carriage at home position
                carriage.x += (railMinX - carriage.x) * 0.06;

                // Fade out glow, sheet, and progress fill
                glow.alpha += (0 - glow.alpha) * 0.08;
                sheet.alpha += (0 - sheet.alpha) * 0.08;
                progressFill.alpha += (0 - progressFill.alpha) * 0.08;

                if (isOffline) {
                    progressText.text = 'OFFLINE';
                } else {
                    progressText.text = 'STANDBY (LISTO)';
                }
            }

            // Update particles pool (max 40 items)
            particlesPoolRef.current.forEach(p => {
                if (p.active) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life++;
                    p.gfx.x = p.x;
                    p.gfx.y = p.y;
                    p.gfx.alpha = 1 - p.life / p.maxLife;

                    if (p.life >= p.maxLife) {
                        p.active = false;
                        p.gfx.visible = false;
                    }
                }
            });
        });
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
