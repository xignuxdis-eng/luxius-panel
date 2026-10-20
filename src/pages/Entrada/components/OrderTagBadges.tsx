import type { Order } from '@/types'
import { PRESET_ORDER_TAGS, getOrderTag, type OrderTagDef } from '@/types/orden'

export interface OrderTagBadgesProps {
    order: Order;
    tagPopoverOrderId: number | string | null;
    setTagPopoverOrderId: (id: number | string | null) => void;
    onToggleTag: (order: Order, tagId: string, e?: React.MouseEvent) => void;
}

export function OrderTagBadges({ order, tagPopoverOrderId, setTagPopoverOrderId, onToggleTag }: OrderTagBadgesProps) {
    const orderKey = order.id || order.ot;
    const isPopoverOpen = tagPopoverOrderId === orderKey;
    const tags = order.tags || [];

    return (
        <div className="order-tags-container" onClick={(e) => e.stopPropagation()}>
            <div className="order-tags-list">
                {tags.map(tId => {
                    const tag = getOrderTag(tId);
                    if (!tag) return null;
                    return (
                        <span
                            key={tId}
                            className="order-tag-badge"
                            style={{
                                color: tag.color,
                                backgroundColor: tag.bgColor,
                                borderColor: tag.borderColor
                            }}
                            title={`Etiqueta: ${tag.label}. Clic para editar`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setTagPopoverOrderId(isPopoverOpen ? null : orderKey);
                            }}
                        >
                            <span className="tag-icon">{tag.icon}</span>
                            <span className="tag-label">{tag.label}</span>
                        </span>
                    );
                })}
                <button
                    type="button"
                    className="order-tag-add-btn"
                    title="Asignar o editar etiquetas operativas"
                    onClick={(e) => {
                        e.stopPropagation();
                        setTagPopoverOrderId(isPopoverOpen ? null : orderKey);
                    }}
                >
                    🏷️{tags.length === 0 ? ' +' : ''}
                </button>
            </div>

            {isPopoverOpen && (
                <div className="tag-picker-popover animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="tag-picker-header">
                        <span>🏷️ Etiquetas ({order.ot || `OT-${order.id}`})</span>
                        <button type="button" className="tag-picker-close" onClick={() => setTagPopoverOrderId(null)}>×</button>
                    </div>
                    <div className="tag-picker-grid">
                        {PRESET_ORDER_TAGS.map((pt: OrderTagDef) => {
                            const isSelected = tags.includes(pt.id);
                            return (
                                <button
                                    key={pt.id}
                                    type="button"
                                    className={`tag-picker-option ${isSelected ? 'is-selected' : ''}`}
                                    style={isSelected ? { borderColor: pt.color, backgroundColor: pt.bgColor, color: pt.color } : {}}
                                    onClick={(e) => onToggleTag(order, pt.id, e)}
                                >
                                    <span className="option-icon">{pt.icon}</span>
                                    <span className="option-label">{pt.label}</span>
                                    <span className="option-check">{isSelected ? '✓' : '+'}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
