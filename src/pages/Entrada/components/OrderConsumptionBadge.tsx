import type { Order } from '@/types'
import { isSpecialLaminationOrder, type ConsumptionResult } from '../utils/entradaCalculations'

export interface OrderConsumptionBadgeProps {
    order: Order;
    consumption: ConsumptionResult;
}

export function OrderConsumptionBadge({ order, consumption }: OrderConsumptionBadgeProps) {
    const isSpecial = isSpecialLaminationOrder(order, consumption);

    if (consumption.unit === 'ml') {
        if (isSpecial) {
            return (
                <div
                    className="special-lamination-box"
                    title="⚠️ Paño mayor a 2.93m: Requiere proceso de laminado especial en producción"
                >
                    <div className="special-lamination-val font-mono">
                        <span style={{ fontSize: '0.8rem' }}>⚡</span>
                        <span>{consumption.value.toFixed(2)}</span>
                        <small style={{ color: 'var(--badge-purple-text)', fontWeight: 800 }}>ml</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {consumption.bobina && (
                            <span className="special-lamination-bobina">
                                Rollo {consumption.bobina}m
                            </span>
                        )}
                        <span className="special-lamination-pill">
                            LAMINADO ESP.
                        </span>
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span className="m2-text font-mono" style={{ fontWeight: 700, color: 'var(--metric-cyan)', fontSize: '0.85rem' }}>
                    {consumption.value.toFixed(2)} <small>ml</small>
                </span>
                {consumption.bobina && (
                    <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'rgba(59, 130, 246, 0.18)',
                        color: '#93c5fd',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        whiteSpace: 'nowrap'
                    }}>
                        Rollo {consumption.bobina}m
                    </span>
                )}
            </div>
        );
    }

    if (isSpecial) {
        return (
            <div
                className="special-lamination-box"
                title="⚠️ Paño mayor a 2.93m: Requiere proceso de laminado especial en producción"
            >
                <div className="special-lamination-val font-mono">
                    <span style={{ fontSize: '0.8rem' }}>⚡</span>
                    <span>{consumption.value.toFixed(2)}</span>
                    <small style={{ color: 'var(--badge-purple-text)', fontWeight: 800 }}>{consumption.unit}</small>
                </div>
                <span className="special-lamination-pill">
                    LAMINADO ESP.
                </span>
            </div>
        );
    }

    return (
        <span className="m2-text font-mono text-muted">
            {consumption.value.toFixed(2)} <small>{consumption.unit}</small>
        </span>
    );
}
