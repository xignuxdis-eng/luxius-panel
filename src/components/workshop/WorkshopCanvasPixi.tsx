// WorkshopCanvasPixi.tsx - High-Fidelity PixiJS v8 Pixel Art Render Loop for XignuX Print Den
// Implements integer scaling (480x270 native), independent station hit-areas,
// snapshot-based order diff tracking, and robust cleanup.

import React, { useRef, useEffect, useState } from 'react';
import { Application, Container, Graphics, Sprite, Text, TextStyle, Rectangle } from 'pixi.js';
import { Order, OrderStatus } from '@/types/orden';
import { StationId, StationConfig } from './types';
import { audioEngine } from './AudioEngine';
import { getMaquinas } from '@/data/db';
import {
    getTileTextureConcreteA,
    getTileTextureConcreteB,
    getTileTextureHazard,
    getWallTileTexture,
    getWindowTexture,
    getSignDenTexture,
    destroyTextureCache,
    PALETTE
} from './workshopSprites';

export interface WorkshopCanvasPixiProps {
    orders: Order[];
    onSelectStation: (stationId: StationId) => void;
    onSelectOrder?: (order: Order) => void;
    selectedStation: StationId | null;
}

export interface OrderStateSnapshot {
    [orderId: number]: OrderStatus;
}

export interface OrderDiff {
    orderId: number;
    prevStatus: OrderStatus | undefined;
    nextStatus: OrderStatus;
    order: Order;
    changeType: 'new' | 'status_change' | 'removed';
}

/**
 * Calculates diffs between previous order state and incoming orders.
 * Foundation for event-driven animations in Fase 3.
 */
export function diffOrders(
    prevSnapshot: OrderStateSnapshot,
    nextOrders: Order[]
): { diffs: OrderDiff[]; nextSnapshot: OrderStateSnapshot } {
    const nextSnapshot: OrderStateSnapshot = {};
    const diffs: OrderDiff[] = [];
    const seenIds = new Set<number>();

    for (const order of nextOrders) {
        seenIds.add(order.id);
        nextSnapshot[order.id] = order.status;
        const prevStatus = prevSnapshot[order.id];

        if (prevStatus === undefined) {
            diffs.push({
                orderId: order.id,
                prevStatus: undefined,
                nextStatus: order.status,
                order,
                changeType: 'new'
            });
        } else if (prevStatus !== order.status) {
            diffs.push({
                orderId: order.id,
                prevStatus,
                nextStatus: order.status,
                order,
                changeType: 'status_change'
            });
        }
    }

    // Check for removed orders
    for (const idStr of Object.keys(prevSnapshot)) {
        const id = Number(idStr);
        if (!seenIds.has(id)) {
            diffs.push({
                orderId: id,
                prevStatus: prevSnapshot[id],
                nextStatus: 'entregado', // fallback or purged
                order: { id } as Order,
                changeType: 'removed'
            });
        }
    }

    return { diffs, nextSnapshot };
}

/**
 * Native 480x270 Top-down Workshop Stations Layout
 * Proportioned and pixel-aligned for crisp 16-bit presentation.
 */
export const getPixiStations = (): StationConfig[] => {
    const maquinas = getMaquinas();

    const baseStations: StationConfig[] = [
        {
            id: 'diseno',
            title: 'Diseño & Preprensa',
            description: 'Mesa de pre-prensa y validación de artes.',
            x: 18,
            y: 50,
            width: 78,
            height: 60,
            color: '#8b5cf6',
            icon: '🖥️'
        }
    ];

    if (maquinas.length === 0) {
        baseStations.push({
            id: 'plotter1',
            title: 'Plotter Principal',
            description: 'Impresora de gran formato.',
            x: 110,
            y: 46,
            width: 110,
            height: 64,
            color: '#22c55e',
            icon: '🖨️'
        });
    } else {
        const startX = 106;
        const availableW = 260;
        const count = maquinas.length;
        const stepX = Math.min(125, Math.floor(availableW / Math.max(1, count)));

        maquinas.forEach((m, idx) => {
            const colors = ['#22c55e', '#06b6d4', '#ec4899', '#eab308', '#3b82f6'];
            const color = colors[idx % colors.length];
            const stationId = idx === 0 ? 'plotter1' : idx === 1 ? 'plotter2' : `maquina_${m.id}`;

            baseStations.push({
                id: stationId,
                title: m.nombre,
                description: `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m)`,
                x: startX + idx * stepX,
                y: 46,
                width: Math.max(84, Math.min(115, stepX - 8)),
                height: 64,
                color: m.estado === 'offline' ? '#64748b' : color,
                icon: '🖨️',
                maquinaId: m.id,
                estado: m.estado
            });
        });
    }

    baseStations.push(
        {
            id: 'insumos',
            title: 'Depósito Insumos',
            description: 'Tintas CMYK y bobinas en stock.',
            x: 378,
            y: 48,
            width: 84,
            height: 62,
            color: '#eab308',
            icon: '🎨'
        },
        {
            id: 'despacho',
            title: 'Muelle Despacho',
            description: 'Salida de paquetes y flete.',
            x: 18,
            y: 154,
            width: 84,
            height: 68,
            color: '#64748b',
            icon: '🚚'
        },
        {
            id: 'empaque',
            title: 'Empaquetado',
            description: 'Doblado, ojalillos y embalaje.',
            x: 114,
            y: 154,
            width: 86,
            height: 68,
            color: '#a855f7',
            icon: '📦'
        },
        {
            id: 'corte',
            title: 'Mesa de Refilado',
            description: 'Corte, refilado y trillado.',
            x: 212,
            y: 154,
            width: 88,
            height: 68,
            color: '#ec4899',
            icon: '✂️'
        },
        {
            id: 'caja',
            title: 'Caja & Mostrador',
            description: 'Ventas, cobros y mostrador.',
            x: 378,
            y: 154,
            width: 84,
            height: 68,
            color: '#f59e0b',
            icon: '🪙'
        }
    );

    return baseStations;
};

export const countOrdersForStation = (stationId: StationId, ordersList: Order[]): number => {
    if (stationId === 'diseno') return ordersList.filter(o => o.status === 'diseno' || o.status === 'rebotado').length;
    if (stationId === 'plotter1' || stationId === 'plotter2' || stationId.startsWith('maquina_')) {
        return ordersList.filter(o => o.status === 'orden').length;
    }
    if (stationId === 'corte') return ordersList.filter(o => o.status === 'impreso' || o.status === 'post').length;
    if (stationId === 'empaque') return ordersList.filter(o => o.status === 'completo').length;
    if (stationId === 'despacho') return ordersList.filter(o => o.status === 'entregado').length;
    return 0;
};

export const WorkshopCanvasPixi: React.FC<WorkshopCanvasPixiProps> = ({
    orders,
    onSelectStation,
    onSelectOrder: _onSelectOrder,
    selectedStation
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasHostRef = useRef<HTMLDivElement | null>(null);
    const [hoveredStation, setHoveredStation] = useState<StationId | null>(null);

    // Refs for synchronization
    const ordersRef = useRef<Order[]>(orders);
    const selectedStationRef = useRef<StationId | null>(selectedStation);
    const prevOrdersSnapshotRef = useRef<OrderStateSnapshot>({});
    const pendingDiffsRef = useRef<OrderDiff[]>([]);

    // Pixi References
    const appRef = useRef<Application | null>(null);
    const stationsLayerRef = useRef<Container | null>(null);
    const highlightsMapRef = useRef<Map<string, Graphics>>(new Map());
    const badgesMapRef = useRef<Map<string, Text>>(new Map());

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
            if (isSelected) {
                gfx.rect(-2, -2, gfx.width ? gfx.width + 4 : 80, gfx.height ? gfx.height + 4 : 64);
                gfx.stroke({ width: 2, color: 0x38bdf8 });
            } else if (isHovered) {
                gfx.rect(-1, -1, gfx.width ? gfx.width + 2 : 80, gfx.height ? gfx.height + 2 : 64);
                gfx.stroke({ width: 1, color: 0xf59e0b });
            }
        });
    }, [selectedStation, hoveredStation]);

    // Initialize Audio Ambient on mount
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
        // PixiJS v8 guard: prevents TypeError: this._cancelResize is not a function when resizeTo is not used
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

                // Clean previous canvas if any
                if (canvasHostRef.current) {
                    canvasHostRef.current.innerHTML = '';
                    const canvas = app.canvas;
                    canvasHostRef.current.appendChild(canvas);

                    // Setup root layers
                    const mapLayer = new Container();
                    mapLayer.label = 'MapLayer';

                    const stationsLayer = new Container();
                    stationsLayer.label = 'StationsLayer';
                    stationsLayerRef.current = stationsLayer;

                    const hitAreasLayer = new Container();
                    hitAreasLayer.label = 'HitAreasLayer';

                    const uiLayer = new Container();
                    uiLayer.label = 'UILayer';

                    app.stage.addChild(mapLayer);
                    app.stage.addChild(stationsLayer);
                    app.stage.addChild(hitAreasLayer);
                    app.stage.addChild(uiLayer);

                    // 1. Build Background Map (Tiles & Wall)
                    buildBackgroundMap(mapLayer, VIRTUAL_W, VIRTUAL_H);

                    // 2. Build Stations & Independent Hit Areas
                    buildStations(stationsLayer, hitAreasLayer);

                    // 3. Setup Integer Scaling via ResizeObserver
                    resizeObserver = setupIntegerScaling(canvas, containerRef.current);
                }
            } catch (initErr) {
                console.error('Failed to initialize Pixi Application:', initErr);
            }
        };

        initPixi();

        // Handle page visibility to pause ticker and prevent CPU/GPU waste
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
        };
    }, []);

    // ResizeObserver: Computes exact integer scale (1x, 2x, 3x) and centers with bars
    const setupIntegerScaling = (canvas: HTMLCanvasElement, container: HTMLDivElement | null): ResizeObserver | null => {
        if (!container) return null;

        const updateScale = () => {
            const containerW = container.clientWidth || 480;
            // Target height based on container aspect or client height
            const containerH = container.clientHeight > 100 ? container.clientHeight : Math.floor(containerW * (270 / 480));

            const scaleX = Math.floor(containerW / 480);
            const scaleY = Math.floor(containerH / 270);
            const intScale = Math.max(1, Math.min(scaleX, scaleY || scaleX));

            const displayW = 480 * intScale;
            const displayH = 270 * intScale;

            canvas.style.width = `${displayW}px`;
            canvas.style.height = `${displayH}px`;
            canvas.style.imageRendering = 'pixelated';
            canvas.style.display = 'block';
            canvas.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.8)';
            canvas.style.border = '2px solid #1e293b';
            canvas.style.borderRadius = '6px';
        };

        const ro = new ResizeObserver(() => updateScale());
        ro.observe(container);
        updateScale();
        return ro;
    };

    // 1. Build Background Map
    const buildBackgroundMap = (layer: Container, mapW: number, mapH: number) => {
        const texConcreteA = getTileTextureConcreteA();
        const texConcreteB = getTileTextureConcreteB();
        const texHazard = getTileTextureHazard();
        const texWall = getWallTileTexture();
        const texWindow = getWindowTexture();
        const texSignDen = getSignDenTexture();

        const tileSize = 16;
        const wallH = 40;

        // A. Wall & Windows
        for (let x = 0; x < mapW; x += tileSize) {
            const wallSprite = new Sprite(texWall);
            wallSprite.x = x;
            wallSprite.y = 8;
            layer.addChild(wallSprite);
        }

        // Add 3 Workshop Windows with light spill
        const windowPositions = [48, 208, 368];
        windowPositions.forEach(wx => {
            const winSprite = new Sprite(texWindow);
            winSprite.x = wx;
            winSprite.y = 12;
            layer.addChild(winSprite);
        });

        // Add "DEN" neon industrial sign
        const denSign = new Sprite(texSignDen);
        denSign.x = 228;
        denSign.y = 16;
        layer.addChild(denSign);

        // B. Floor Tiles (varied textures)
        for (let y = wallH; y < mapH; y += tileSize) {
            for (let x = 0; x < mapW; x += tileSize) {
                const isHallway = y >= 120 && y < 144;
                const isHazardBorder = y === 120 || y === 136;

                let tileSprite: Sprite;
                if (isHazardBorder && (x % 32 === 0)) {
                    tileSprite = new Sprite(texHazard);
                } else if ((x + y) % 32 === 0) {
                    tileSprite = new Sprite(texConcreteB);
                } else {
                    tileSprite = new Sprite(texConcreteA);
                }

                tileSprite.x = x;
                tileSprite.y = y;
                layer.addChild(tileSprite);
            }
        }
    };

    // 2. Build Stations and Independent Hit Areas
    const buildStations = (stationsLayer: Container, hitAreasLayer: Container) => {
        const stations = getPixiStations();

        stations.forEach(station => {
            const { id, x, y, width, height, title, icon, color } = station;

            // A. Visual Container (Will be upgraded in Fase 2 & Fase 4)
            const visualContainer = new Container();
            visualContainer.x = x;
            visualContainer.y = y;

            // Station Base Floor Mat / Platform
            const baseGfx = new Graphics();
            baseGfx.rect(0, 0, width, height);
            baseGfx.fill({ color: 0x1e1b18, alpha: 0.95 });
            baseGfx.stroke({ width: 1, color: parseInt(color.replace('#', '0x'), 16) || 0x475569 });
            visualContainer.addChild(baseGfx);

            // Title Strip
            const headerGfx = new Graphics();
            headerGfx.rect(0, 0, width, 14);
            headerGfx.fill({ color: parseInt(color.replace('#', '0x'), 16) || 0x334155 });
            visualContainer.addChild(headerGfx);

            // Title Text
            const titleStyle = new TextStyle({
                fontFamily: 'monospace',
                fontSize: 8,
                fontWeight: 'bold',
                fill: '#ffffff'
            });
            const titleText = new Text({
                text: `${icon} ${title.length > 13 ? title.substring(0, 11) + '..' : title}`,
                style: titleStyle
            });
            titleText.x = 4;
            titleText.y = 2;
            visualContainer.addChild(titleText);

            // Selection / Hover Highlight Frame
            const highlightGfx = new Graphics();
            visualContainer.addChild(highlightGfx);
            highlightsMapRef.current.set(id, highlightGfx);

            // Counter Badge Container
            const badgeContainer = new Container();
            badgeContainer.x = width - 8;
            badgeContainer.y = -2;

            const badgeBg = new Graphics();
            badgeBg.circle(0, 0, 7);
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

            // Initial count visibility
            const count = countOrdersForStation(id, ordersRef.current);
            badgeCountText.text = count > 0 ? `${count}` : '';
            badgeContainer.visible = count > 0;
            visualContainer.addChild(badgeContainer);

            stationsLayer.addChild(visualContainer);

            // B. Independent Hit Area (Decoupled from visual sprite)
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
                highlightGfx.stroke({ width: 1, color: 0xf59e0b });
            });

            hitArea.on('pointerout', () => {
                setHoveredStation(null);
                highlightGfx.clear();
                if (selectedStationRef.current === id) {
                    highlightGfx.rect(-2, -2, width + 4, height + 4);
                    highlightGfx.stroke({ width: 2, color: 0x38bdf8 });
                }
            });

            hitArea.on('pointertap', () => {
                audioEngine.playClick();
                onSelectStation(id);
            });

            hitAreasLayer.addChild(hitArea);
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                minHeight: '290px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: PALETTE.floorDark,
                borderRadius: '8px',
                overflow: 'hidden',
                padding: '8px',
                boxSizing: 'border-box'
            }}
        >
            <div ref={canvasHostRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }} />
        </div>
    );
};

export default WorkshopCanvasPixi;
