import Button from '@components/ui/Button'
import { PRESET_ORDER_TAGS, type OrderTagDef } from '@/types/orden'
import type { Order } from '@/types'

export interface EntradaToolbarProps {
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    onClearFilters: () => void;
    displayedOrdersCount: number;
    displayedTotals: { m2: number; ml: number };
    onNewOrder: () => void;
    tagFilter: string;
    setTagFilter: (t: string) => void;
    orders: Order[];
    baseOrders: Order[];
    viewTab: 'active' | 'history' | 'trash';
    setViewTab: (tab: 'active' | 'history' | 'trash') => void;
}

export function EntradaToolbar({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    onClearFilters,
    displayedOrdersCount,
    displayedTotals,
    onNewOrder,
    tagFilter,
    setTagFilter,
    orders,
    baseOrders,
    viewTab,
    setViewTab
}: EntradaToolbarProps) {
    return (
        <>
            {/* ACTION BAR */}
            <div className="filters-bar animate-slide-down" style={{ flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="filter-group">
                        <div className="search-wrapper">
                            <input
                                type="text"
                                placeholder="Buscar por Cliente, OT, ID, Etiqueta..."
                                className="search-input"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => {
                                const val = e.target.value;
                                setStatusFilter(val);
                                if (val === 'entregado') {
                                    setViewTab('history');
                                } else if (val === 'orden' || val === 'preorden') {
                                    setViewTab('active');
                                }
                            }}
                        >
                            <option value="">Todos los Estados</option>
                            <option value="preorden">Pre-Orden (Diseño)</option>
                            <option value="orden">Para Imprimir</option>
                            <option value="impreso">Impreso</option>
                            <option value="entregado">Entregado</option>
                        </select>

                        <Button variant="ghost" onClick={onClearFilters} size="sm">Limpiar</Button>
                    </div>

                    <div className="filter-actions">
                        <div className="results-summary-pills">
                            <span className="summary-pill summary-pill-orders" title="Total de órdenes en la vista actual">
                                <strong>{displayedOrdersCount}</strong> {displayedOrdersCount === 1 ? 'orden' : 'órdenes'}
                            </span>
                            <span className="summary-divider">·</span>
                            <span className="summary-pill summary-pill-m2 font-mono" title="Total de metros cuadrados (m²)">
                                <strong>{displayedTotals.m2.toFixed(2)}</strong> <small>m²</small>
                            </span>
                            <span className="summary-divider">·</span>
                            <span className="summary-pill summary-pill-ml font-mono" title="Total de metros lineales de bobina (ml)">
                                <strong>{displayedTotals.ml.toFixed(2)}</strong> <small>ml</small>
                            </span>
                        </div>
                        <Button variant="primary" onClick={onNewOrder} size="sm" className="btn-glow">
                            + Nuevo Pedido
                        </Button>
                    </div>
                </div>

                {/* TAG FILTER CHIPS */}
                <div className="tag-filter-chips">
                    <button
                        type="button"
                        className={`tag-chip ${tagFilter === '' ? 'is-active' : ''}`}
                        onClick={() => setTagFilter('')}
                    >
                        🏷️ Todas ({orders.length})
                    </button>
                    {PRESET_ORDER_TAGS.map((tag: OrderTagDef) => {
                        const count = orders.filter(o => o.tags && o.tags.includes(tag.id)).length;
                        const isActive = tagFilter === tag.id;
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`tag-chip ${isActive ? 'is-active' : ''}`}
                                style={isActive ? { background: tag.bgColor, borderColor: tag.color, color: tag.color } : {}}
                                onClick={() => setTagFilter(isActive ? '' : tag.id)}
                            >
                                <span>{tag.icon}</span> {tag.label} {count > 0 && <span style={{ opacity: 0.85, fontSize: '0.65rem' }}>({count})</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* VIEW TABS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={() => {
                        setViewTab('active');
                        if (statusFilter === 'entregado') setStatusFilter('');
                    }}
                    style={{
                        padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: viewTab === 'active' ? '700' : '400',
                        background: viewTab === 'active' ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: viewTab === 'active' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    📋 OTs Activas ({baseOrders.filter(o => !['entregado', 'finalizado', 'eliminado'].includes(o.status)).length})
                </button>
                <button
                    onClick={() => {
                        setViewTab('history');
                        if (statusFilter === 'orden' || statusFilter === 'preorden') setStatusFilter('');
                    }}
                    style={{
                        padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: viewTab === 'history' ? '700' : '400',
                        background: viewTab === 'history' ? 'var(--primary-color)' : 'var(--bg-tertiary)',
                        color: viewTab === 'history' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    📜 Historial ({baseOrders.filter(o => ['impreso', 'entregado', 'finalizado', 'completo'].includes(o.status)).length})
                </button>
                <button
                    onClick={() => {
                        setViewTab('trash');
                        setStatusFilter('');
                    }}
                    style={{
                        padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                        fontWeight: viewTab === 'trash' ? '700' : '400',
                        background: viewTab === 'trash' ? '#475569' : 'var(--bg-tertiary)',
                        color: viewTab === 'trash' ? '#fff' : 'var(--text-secondary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🗑️ Papelera ({baseOrders.filter(o => o.status === 'eliminado').length})
                </button>
            </div>
        </>
    );
}
