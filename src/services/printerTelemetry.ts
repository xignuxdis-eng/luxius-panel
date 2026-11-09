/**
 * printerTelemetry.ts - Servicio de Telemetría en Vivo de Plotters & RIP
 * Conecta el frontend (Workshop / Print Den) con el endpoint /api/printer/status
 * del backend de LuXius para reflejar en tiempo real la actividad física de las máquinas.
 */

import { API_URL } from '@/data/db'

export interface PrinterJobInfo {
    job_name: string
    event_type: 'PRINTING' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR' | 'START'
    size_str?: string
    area_m2?: number
    ink_ml?: string
    speed_str?: string
    time_str?: string
    error_code?: string
    progress?: number
    timestamp: string
}

export interface PrinterMachineData {
    machine_id: string
    machine_name: string
    status: 'idle' | 'printing' | 'ready' | 'error' | 'offline'
    is_online?: boolean
    last_seen: string | null
    current_job: PrinterJobInfo | null
    last_completed_job?: PrinterJobInfo | null
    recent_events: PrinterJobInfo[]
}

export interface PrinterStatusResponse {
    ok: boolean
    printers?: PrinterMachineData[]
    machines?: Record<string, PrinterMachineData>
    count?: number
    timestamp?: string
}

type TelemetryListener = (machines: Record<string, PrinterMachineData>) => void

class PrinterTelemetryService {
    private static instance: PrinterTelemetryService
    private listeners: Set<TelemetryListener> = new Set()
    private pollingInterval: NodeJS.Timeout | null = null
    private lastData: Record<string, PrinterMachineData> = {}
    private isPolling = false
    private pollIntervalMs = 4000 // 4 segundos para actualización fluida sin sobrecargar red

    private constructor() {}

    public static getInstance(): PrinterTelemetryService {
        if (!PrinterTelemetryService.instance) {
            PrinterTelemetryService.instance = new PrinterTelemetryService()
        }
        return PrinterTelemetryService.instance
    }

    /**
     * Suscribe un componente (ej. WorkshopCanvasPixi) a los datos de telemetría.
     * Retorna función de desuscripción.
     */
    public subscribe(listener: TelemetryListener): () => void {
        this.listeners.add(listener)
        // Entregar último estado conocido de inmediato si existe
        if (Object.keys(this.lastData).length > 0) {
            listener(this.lastData)
        }

        if (this.listeners.size === 1) {
            this.startPolling()
        }

        return () => {
            this.listeners.delete(listener)
            if (this.listeners.size === 0) {
                this.stopPolling()
            }
        }
    }

    /**
     * Obtiene el estado actual de una máquina específica (ej. 'RS-640' o por ID genérico).
     */
    public getMachine(machineId = 'RS-640'): PrinterMachineData | undefined {
        return this.lastData[machineId]
    }

    /**
     * Fuerza una lectura inmediata del estado de las máquinas.
     */
    public async fetchStatus(): Promise<Record<string, PrinterMachineData>> {
        try {
            const token = localStorage.getItem('luxius_auth_token')
            const headers: Record<string, string> = {
                'Cache-Control': 'no-cache',
            }
            if (token) {
                headers['Authorization'] = `Bearer ${token}`
            }

            const res = await fetch(`${API_URL}/printer/status?_t=${Date.now()}`, {
                headers,
                cache: 'no-store',
            })

            if (!res.ok) {
                // Si la sesión no es de operador o backend rechaza, marcar offline silenciosamente
                return this.lastData
            }

            const data: PrinterStatusResponse = await res.json()
            if (data && data.ok) {
                const map: Record<string, PrinterMachineData> = {}
                if (Array.isArray(data.printers)) {
                    data.printers.forEach((p) => {
                        map[p.machine_id] = p
                    })
                } else if (data.machines) {
                    Object.assign(map, data.machines)
                }
                this.lastData = map
                this.notifyListeners()
            }
            return this.lastData
        } catch {
            return this.lastData
        }
    }

    private startPolling(): void {
        if (this.pollingInterval) return
        this.fetchStatus()
        this.pollingInterval = setInterval(async () => {
            if (this.isPolling) return
            this.isPolling = true
            try {
                await this.fetchStatus()
            } finally {
                this.isPolling = false
            }
        }, this.pollIntervalMs)
    }

    private stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval)
            this.pollingInterval = null
        }
    }

    private notifyListeners(): void {
        this.listeners.forEach((listener) => {
            try {
                listener(this.lastData)
            } catch (err) {
                console.error('[PrinterTelemetry] Listener error:', err)
            }
        })
    }
}

export const printerTelemetry = PrinterTelemetryService.getInstance()

