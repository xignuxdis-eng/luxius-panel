// src/pages/Presupuestador/subcomponents/ClientSelector.tsx
import React from 'react';

interface ClientSelectorProps {
    clientes: any[];
    selectedClientId: number | '';
    setSelectedClientId: (id: number) => void;
    clientSearch: string;
    setClientSearch: (val: string) => void;
    showClientDropdown: boolean;
    setShowClientDropdown: (show: boolean) => void;
    clientDropdownRef: React.RefObject<HTMLDivElement>;
    numeroPresupuesto: string;
    setNumeroPresupuesto: (val: string) => void;
    validezDias: number;
    setValidezDias: (val: number) => void;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
    clientes,
    selectedClientId,
    setSelectedClientId,
    clientSearch,
    setClientSearch,
    showClientDropdown,
    setShowClientDropdown,
    clientDropdownRef,
    numeroPresupuesto,
    setNumeroPresupuesto,
    validezDias,
    setValidezDias
}) => {
    return (
        <div className="card-panel">
            <h2>👤 Datos del Cliente y Presupuesto</h2>
            <div className="form-grid-2">
                <div className="form-group">
                    <label>Cliente</label>
                    <div className="relative" ref={clientDropdownRef}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Buscar cliente por nombre o empresa..."
                            value={showClientDropdown ? clientSearch : (() => {
                                const c = clientes.find(cl => String(cl.id) === String(selectedClientId));
                                return c ? `${c.nombre} (${c.empresa || 'Particular'})` : '';
                            })()}
                            onChange={(e) => {
                                setClientSearch(e.target.value);
                                if (!showClientDropdown) setShowClientDropdown(true);
                            }}
                            onFocus={() => {
                                setClientSearch('');
                                setShowClientDropdown(true);
                            }}
                        />
                        {showClientDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md shadow-lg max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
                                {clientes
                                    .filter(c => 
                                        c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || 
                                        (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase())
                                    )
                                    .map(c => (
                                        <div 
                                            key={c.id} 
                                            className="px-3 py-2 cursor-pointer hover:bg-[var(--primary-color)] hover:text-white border-b border-[var(--border-color)] last:border-0"
                                            onClick={() => {
                                                setSelectedClientId(Number(c.id));
                                                setShowClientDropdown(false);
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>{c.nombre}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{c.empresa || 'Particular'}</div>
                                        </div>
                                    ))}
                                {clientes.filter(c => c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) || (c.empresa || '').toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                                    <div className="px-3 py-2 text-sm opacity-50">No se encontraron clientes</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="form-grid-2">
                    <div className="form-group">
                        <label>N° Presupuesto</label>
                        <input
                            type="text"
                            className="form-input"
                            value={numeroPresupuesto}
                            onChange={(e) => setNumeroPresupuesto(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Validez (Días)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={validezDias}
                            onChange={(e) => setValidezDias(Number(e.target.value))}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
