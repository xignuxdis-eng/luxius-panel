// src/pages/Presupuestador/subcomponents/QuoteItemsTable.tsx
import React from 'react';
import type { PresupuestoItem } from '@/utils/presupuestoPdf';

interface QuoteItemsTableProps {
    items: PresupuestoItem[];
    onRemoveItem: (id: string) => void;
}

export const QuoteItemsTable: React.FC<QuoteItemsTableProps> = ({
    items,
    onRemoveItem
}) => {
    return (
        <div className="card-panel">
            <h2>📋 Renglones del Presupuesto ({items.length})</h2>
            {items.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
                    No hay ítems agregados a la cotización todavía. Use el formulario superior para añadir productos.
                </p>
            ) : (
                <table className="items-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Tipo</th>
                            <th>Concepto</th>
                            <th>Cant. / Unidad</th>
                            <th>P. Unitario</th>
                            <th>Subtotal</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.id}>
                                <td>{index + 1}</td>
                                <td>
                                    {item.concepto.startsWith('[PROMO]') ? (
                                        <span style={{ background: '#ec4899', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>PROMO</span>
                                    ) : item.isCustom ? (
                                        <span style={{ background: '#f59e0b', color: '#000', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>ESPECIAL</span>
                                    ) : (
                                        <span style={{ background: '#6366f1', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>CATÁLOGO</span>
                                    )}
                                </td>
                                <td><strong>{item.concepto}</strong></td>
                                <td>{item.cantidad} {item.unidadMedida}</td>
                                <td>${item.precioUnitario.toLocaleString('es-AR')}</td>
                                <td><strong>${item.subtotal.toLocaleString('es-AR')}</strong></td>
                                <td>
                                    <button
                                        type="button"
                                        className="btn-danger-outline"
                                        onClick={() => onRemoveItem(item.id)}
                                    >
                                        ✕ Quitar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};
