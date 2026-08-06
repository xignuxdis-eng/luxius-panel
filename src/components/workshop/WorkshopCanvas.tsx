// WorkshopCanvas.tsx - Rock-Solid 60 FPS Canvas Render Loop (Zero Freeze, Instant Navigation)
import React, { useRef, useEffect, useState } from 'react';
import { Order } from '@/types/orden';
import { StationId, StationConfig, WorkshopWorker, WorkerRole } from './types';
import { audioEngine } from './AudioEngine';
import { getUsuarios, getMaquinas } from '@/data/db';

interface WorkshopCanvasProps {
    orders: Order[];
    onSelectStation: (stationId: StationId) => void;
    onSelectOrder?: (order: Order) => void;
    selectedStation: StationId | null;
}

const getDynamicStations = (): StationConfig[] => {
    const maquinas = getMaquinas();

    const baseStations: StationConfig[] = [
        {
            id: 'diseno',
            title: 'Área de Diseño',
            description: 'Mesa de pre-prensa y validación de artes.',
            x: 70,
            y: 80,
            width: 150,
            height: 105,
            color: '#8b5cf6',
            icon: '🖥️'
        }
    ];

    if (maquinas.length === 0) {
        baseStations.push({
            id: 'plotter1',
            title: 'Plotter Principal',
            description: 'Impresora de gran formato.',
            x: 350,
            y: 80,
            width: 170,
            height: 120,
            color: '#22c55e',
            icon: '🖨️'
        });
    } else {
        const startX = 240;
        const availableW = 420;
        const stepX = Math.min(180, Math.floor(availableW / Math.max(1, maquinas.length)));

        maquinas.forEach((m, idx) => {
            const colors = ['#22c55e', '#06b6d4', '#ec4899', '#eab308', '#3b82f6'];
            const color = colors[idx % colors.length];
            const stationId = idx === 0 ? 'plotter1' : idx === 1 ? 'plotter2' : `maquina_${m.id}`;

            baseStations.push({
                id: stationId,
                title: m.nombre,
                description: `${m.tipo || 'Impresora'} (${m.anchoMaximo || 1.6}m) - Status: ${(m.estado || 'online').toUpperCase()}`,
                x: startX + idx * stepX,
                y: 80,
                width: Math.max(120, Math.min(160, stepX - 10)),
                height: 120,
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
            title: 'Depósito de Insumos',
            description: 'Insumos de impresión y stock de bobinas.',
            x: 680,
            y: 80,
            width: 140,
            height: 120,
            color: '#eab308',
            icon: '🎨'
        },
        {
            id: 'corte',
            title: 'Mesa de Refilado',
            description: 'Mesa de corte, refilado y trillado.',
            x: 470,
            y: 270,
            width: 170,
            height: 110,
            color: '#ec4899',
            icon: '✂️'
        },
        {
            id: 'empaque',
            title: 'Mesa de Empaquetado',
            description: 'Doblado, ojalillos y empaque final.',
            x: 260,
            y: 270,
            width: 170,
            height: 110,
            color: '#a855f7',
            icon: '📦'
        },
        {
            id: 'despacho',
            title: 'Muelle de Despacho',
            description: 'Zona de salida de paquetes y flete.',
            x: 70,
            y: 270,
            width: 150,
            height: 110,
            color: '#64748b',
            icon: '🚚'
        },
        {
            id: 'caja',
            title: 'Caja & Mostrador',
            description: 'Ventas, cobros y entregas del día.',
            x: 680,
            y: 270,
            width: 140,
            height: 110,
            color: '#f59e0b',
            icon: '🪙'
        }
    );

    return baseStations;
};

export const WorkshopCanvas: React.FC<WorkshopCanvasProps> = ({
    orders,
    onSelectStation,
    onSelectOrder,
    selectedStation
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hoveredStation, setHoveredStation] = useState<StationId | null>(null);

    const workersRef = useRef<WorkshopWorker[]>([]);
    const ordersRef = useRef<Order[]>(orders);
    const hoveredStationRef = useRef<StationId | null>(hoveredStation);
    const selectedStationRef = useRef<StationId | null>(selectedStation);

    useEffect(() => {
        ordersRef.current = orders;
    }, [orders]);

    useEffect(() => {
        hoveredStationRef.current = hoveredStation;
    }, [hoveredStation]);

    useEffect(() => {
        selectedStationRef.current = selectedStation;
    }, [selectedStation]);

    useEffect(() => {
        const dbUsers = getUsuarios();
        const activeUsers = dbUsers.filter(u => u.habilitado !== false);

        const workerRoles: Array<{ role: WorkerRole; color: string; posX: number; posY: number }> = [
            { role: 'disenador', color: '#8b5cf6', posX: 135, posY: 135 },
            { role: 'impresor', color: '#22c55e', posX: 345, posY: 145 },
            { role: 'cortador', color: '#ec4899', posX: 555, posY: 325 },
            { role: 'empaquetador', color: '#0284c7', posX: 310, posY: 325 }
        ];

        const skins = ['#fca5a5', '#fdba74', '#fde047', '#fed7aa', '#cbd5e1'];

        const mappedWorkers: WorkshopWorker[] = activeUsers.slice(0, 4).map((u, idx) => {
            const roleConfig = workerRoles[idx % workerRoles.length];
            return {
                id: `w-${u.id}`,
                name: u.nombre || u.username,
                role: roleConfig.role,
                x: roleConfig.posX,
                y: roleConfig.posY,
                targetX: roleConfig.posX,
                targetY: roleConfig.posY,
                speed: 2.1 + (idx * 0.1),
                animFrame: 0,
                direction: 'down',
                heldItem: null,
                skinColor: skins[idx % skins.length],
                shirtColor: roleConfig.color
            };
        });

        if (mappedWorkers.length > 0) {
            workersRef.current = mappedWorkers;
        }
    }, []);

    // Handle order event triggers
    useEffect(() => {
        audioEngine.startAmbient();

        const bounced = orders.find(o => o.status === 'rebotado' || o.status === 'standby');
        if (bounced) {
            audioEngine.playBounceWarning();
            workersRef.current = workersRef.current.map(w => {
                if (w.role === 'impresor') {
                    return {
                        ...w,
                        targetX: 175,
                        targetY: 135,
                        heldItem: 'Carpeta Rebotada',
                        speechBubble: {
                            text: '⚠️ OT REBOTADA',
                            color: '#ef4444',
                            timer: 180
                        }
                    };
                }
                return w;
            });
        }

        const readyToPrint = orders.find(o => o.status === 'orden');
        if (readyToPrint) {
            workersRef.current = workersRef.current.map(w => {
                if (w.role === 'disenador') {
                    return {
                        ...w,
                        targetX: 310,
                        targetY: 135,
                        heldItem: `OT #${readyToPrint.ot || readyToPrint.id}`,
                        speechBubble: {
                            text: `OT #${readyToPrint.ot || readyToPrint.id} [Printing]`,
                            color: '#22c55e',
                            timer: 140
                        }
                    };
                }
                return w;
            });
        }

        const printed = orders.find(o => o.status === 'impreso');
        if (printed) {
            audioEngine.playScissorsCut();
            workersRef.current = workersRef.current.map(w => {
                if (w.role === 'impresor') {
                    return {
                        ...w,
                        targetX: 520,
                        targetY: 310,
                        heldItem: 'Rollo Impreso',
                        speechBubble: {
                            text: '✂️ [Trillar / Refilar]',
                            color: '#ec4899',
                            timer: 140
                        }
                    };
                }
                return w;
            });
        }

        return () => {
            audioEngine.stopAmbient();
        };
    }, [orders]);

    // Single Animation Frame Loop (Zero React State Setters inside Render loop)
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear Canvas
            ctx.fillStyle = '#1e1b18';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 1. Draw Floor & Wall
            drawIsometricFloor(ctx, canvas.width, canvas.height);
            drawWorkshopWall(ctx, canvas.width);
            drawWorkshopDecor(ctx);

            // 2. Draw Stations
            const currentStations = getDynamicStations();
            currentStations.forEach(station => {
                const isHovered = hoveredStationRef.current === station.id;
                const isSelected = selectedStationRef.current === station.id;
                drawIsometricStation(ctx, station, isHovered, isSelected, ordersRef.current);
            });

            // 3. Update & Draw Workers in Memory Ref
            workersRef.current.forEach(worker => {
                let { x, y, targetX, targetY, speed, animFrame } = worker;

                const dx = targetX - x;
                const dy = targetY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > speed) {
                    worker.x += (dx / dist) * speed;
                    worker.y += (dy / dist) * speed;
                    worker.animFrame = (animFrame + 0.18) % 4;
                } else {
                    worker.x = targetX;
                    worker.y = targetY;
                    if (worker.heldItem && (!worker.speechBubble || worker.speechBubble.timer <= 0)) {
                        if (worker.role === 'disenador') { worker.targetX = 135; worker.targetY = 135; }
                        if (worker.role === 'impresor') { worker.targetX = 345; worker.targetY = 145; }
                        if (worker.role === 'cortador') { worker.targetX = 555; worker.targetY = 325; }
                        worker.heldItem = null;
                    }
                }

                if (worker.speechBubble) {
                    if (worker.speechBubble.timer > 0) {
                        worker.speechBubble.timer -= 1;
                    } else {
                        worker.speechBubble = undefined;
                    }
                }

                drawIsometricWorker(ctx, worker);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, []); // Empty dependency array ensures loop starts once and cleans up cleanly on unmount!

    const drawIsometricFloor = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.fillStyle = '#292524';
        ctx.fillRect(0, 60, width, height - 60);

        ctx.strokeStyle = '#3d3835';
        ctx.lineWidth = 1;
        const tileSize = 32;

        for (let x = 0; x < width; x += tileSize) {
            for (let y = 60; y < height; y += tileSize) {
                ctx.strokeRect(x, y, tileSize, tileSize);
            }
        }
    };

    const drawWorkshopWall = (ctx: CanvasRenderingContext2D, width: number) => {
        ctx.fillStyle = '#443731';
        ctx.fillRect(0, 0, width, 60);

        ctx.strokeStyle = '#57463f';
        ctx.lineWidth = 2;
        for (let y = 0; y < 60; y += 15) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const windowW = 85;
        for (let windowX = 50; windowX < width; windowX += 210) {
            ctx.fillStyle = '#fef08a22';
            ctx.fillRect(windowX, 6, windowW, 44);
            ctx.strokeStyle = '#eab308';
            ctx.strokeRect(windowX, 6, windowW, 44);

            ctx.fillStyle = 'rgba(254, 240, 138, 0.05)';
            ctx.beginPath();
            ctx.moveTo(windowX, 50);
            ctx.lineTo(windowX + windowW, 50);
            ctx.lineTo(windowX + windowW + 50, 440);
            ctx.lineTo(windowX - 30, 440);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(400, 10, 40, 30);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(404, 14, 32, 22);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText('DEN', 412, 28);
    };

    const drawWorkshopDecor = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(225, 405, 38, 25);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(255, 398, 8, 32);
        ctx.fillRect(220, 423, 14, 14);
        ctx.fillRect(250, 423, 14, 14);

        ctx.fillStyle = '#334155';
        ctx.fillRect(425, 405, 42, 26);
        ctx.fillRect(478, 405, 42, 26);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px monospace';
        ctx.fillText('SCRAPS', 428, 422);
        ctx.fillText('VINYL', 482, 422);
    };

    const drawIsometricStation = (
        ctx: CanvasRenderingContext2D,
        station: StationConfig,
        isHovered: boolean,
        isSelected: boolean,
        ordersList: Order[]
    ) => {
        const { x, y, width, height, color, title, icon, id } = station;

        ctx.fillStyle = isSelected ? '#334155' : (isHovered ? '#262c3a' : '#1c1e26');
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = isSelected ? '#38bdf8' : (isHovered ? '#f59e0b' : color);
        ctx.lineWidth = isHovered || isSelected ? 3 : 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, 22);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${icon} ${title}`, x + 6, y + 15);

        if (id === 'plotter1' || id === 'plotter2') {
            ctx.fillStyle = '#475569';
            ctx.fillRect(x + 12, y + 34, width - 24, 44);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 22, y + 44, width - 44, 24);

            const isPrinting = ordersList.some(o => o.status === 'orden');
            if (isPrinting) {
                ctx.fillStyle = '#ef4444';
                const rollW = ((Date.now() / 18) % (width - 50));
                ctx.fillRect(x + 25, y + 48, rollW, 16);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + 25, y + 50, Math.min(rollW, 30), 4);

                ctx.fillStyle = '#1e293b';
                ctx.fillRect(x + 20, y - 12, width - 40, 10);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(x + 22, y - 10, (width - 44) * 0.65, 6);
                ctx.strokeStyle = '#ffffff';
                ctx.strokeRect(x + 20, y - 12, width - 40, 10);
            } else {
                ctx.fillStyle = '#eab308';
                ctx.beginPath();
                ctx.arc(x + width - 20, y + 38, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (id === 'diseno') {
            ctx.fillStyle = '#64748b';
            ctx.fillRect(x + 18, y + 34, 48, 32);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(x + 21, y + 37, 42, 26);
        } else if (id === 'corte') {
            ctx.fillStyle = '#065f46';
            ctx.fillRect(x + 15, y + 34, width - 30, 52);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 20, y + 38, width - 40, 44);
        } else if (id === 'insumos') {
            const cmyk = ['#00ffff', '#ff00ff', '#ffff00', '#000000'];
            cmyk.forEach((c, idx) => {
                ctx.fillStyle = c;
                ctx.fillRect(x + 18 + idx * 26, y + 38, 20, 36);
            });
        }

        const stationOrderCount = countOrdersForStation(id, ordersList);
        if (stationOrderCount > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x + width - 10, y + 10, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${stationOrderCount}`, x + width - 10, y + 13);
            ctx.textAlign = 'left';
        }
    };

    const countOrdersForStation = (stationId: StationId, ordersList: Order[]): number => {
        if (stationId === 'diseno') return ordersList.filter(o => o.status === 'diseno' || o.status === 'rebotado').length;
        if (stationId === 'plotter1' || stationId === 'plotter2') return ordersList.filter(o => o.status === 'orden').length;
        if (stationId === 'corte') return ordersList.filter(o => o.status === 'impreso' || o.status === 'post').length;
        if (stationId === 'empaque') return ordersList.filter(o => o.status === 'completo').length;
        if (stationId === 'despacho') return ordersList.filter(o => o.status === 'entregado').length;
        return 0;
    };

    const drawIsometricWorker = (ctx: CanvasRenderingContext2D, worker: WorkshopWorker) => {
        const { x, y, skinColor, shirtColor, name, speechBubble, heldItem } = worker;

        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(x, y + 18, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = skinColor;
        ctx.fillRect(x - 8, y - 18, 16, 14);

        ctx.fillStyle = '#451a03';
        ctx.fillRect(x - 9, y - 22, 18, 6);

        ctx.fillStyle = shirtColor;
        ctx.fillRect(x - 10, y - 4, 20, 16);

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 8, y + 12, 6, 8);
        ctx.fillRect(x + 2, y + 12, 6, 8);

        if (heldItem) {
            ctx.fillStyle = heldItem.includes('Rebotada') ? '#ef4444' : '#f59e0b';
            ctx.fillRect(x - 14, y + 2, 10, 12);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(x - 14, y + 2, 10, 12);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name.split(' ')[0], x, y + 30);

        if (speechBubble) {
            const bubbleW = ctx.measureText(speechBubble.text).width + 16;
            ctx.fillStyle = speechBubble.color;
            ctx.fillRect(x - bubbleW / 2, y - 45, bubbleW, 20);
            ctx.strokeStyle = '#ffffff';
            ctx.strokeRect(x - bubbleW / 2, y - 45, bubbleW, 20);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(speechBubble.text, x, y - 31);
        }

        ctx.textAlign = 'left';
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentStations = getDynamicStations();
        const found = currentStations.find(s =>
            mouseX >= s.x && mouseX <= s.x + s.width &&
            mouseY >= s.y && mouseY <= s.y + s.height
        );

        setHoveredStation(found ? found.id : null);
    };

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 1. Check worker clicks
        const clickedWorker = workersRef.current.find(w => {
            const dx = mouseX - w.x;
            const dy = mouseY - w.y;
            return Math.sqrt(dx * dx + dy * dy) < 25;
        });

        if (clickedWorker && onSelectOrder) {
            const heldText = clickedWorker.heldItem || clickedWorker.speechBubble?.text || '';
            const otMatch = heldText.match(/OT\s*#?(\d+)/i);
            let matchedOrder: Order | undefined;
            if (otMatch) {
                const idOrOt = otMatch[1];
                matchedOrder = ordersRef.current.find(o => String(o.id) === idOrOt || String(o.ot) === idOrOt);
            }
            if (!matchedOrder) {
                const roleStatusMap: Record<string, string> = {
                    disenador: 'diseno',
                    impresor: 'orden',
                    cortador: 'impreso',
                    empaquetador: 'completo'
                };
                const statusNeeded = roleStatusMap[clickedWorker.role];
                if (statusNeeded) {
                    matchedOrder = ordersRef.current.find(o => o.status === statusNeeded);
                }
            }
            if (matchedOrder) {
                audioEngine.playClick();
                onSelectOrder(matchedOrder);
                return;
            }
        }

        // 2. Check station clicks
        const currentStations = getDynamicStations();
        const found = currentStations.find(s =>
            mouseX >= s.x && mouseX <= s.x + s.width &&
            mouseY >= s.y && mouseY <= s.y + s.height
        );

        if (found) {
            audioEngine.playClick();
            onSelectStation(found.id);
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <canvas
                ref={canvasRef}
                width={860}
                height={460}
                onMouseMove={handleMouseMove}
                onClick={handleClick}
                style={{
                    border: '3px solid #374151',
                    borderRadius: '8px',
                    cursor: hoveredStation ? 'pointer' : 'default',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                    backgroundColor: '#1e1b18',
                    imageRendering: 'pixelated'
                }}
            />
        </div>
    );
};
