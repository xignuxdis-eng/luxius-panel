# Luxius UI Refinement Plan

The goal is to make the Luxius interface more compact and professional, reducing "white space" while maintaining clarity and visual appeal. This involves adjusting global tokens and component-specific styles.

## Proposed Changes

### Global Styles
- **[MODIFY] [index.css](file:///C:/Users/Impresion/.gemini/antigravity/scratch/luxius/src/styles/index.css)**
    - Reduce `--radius-sm` (8px -> 6px), `--radius-md` (12px -> 8px), `--radius-lg` (16px -> 10px).
    - Reduce default input/select/textarea padding (10px 14px -> 6px 12px).
- **[MODIFY] [Modal.css](file:///C:/Users/Impresion/.gemini/antigravity/scratch/luxius/src/components/ui/Modal.css)**
    - Reduce header padding (20px 24px -> 12px 16px).
    - Reduce body padding (24px -> 16px).
    - Reduce `.modal-title` font size (18px -> 16px).

### Entrada Page
- **[MODIFY] [Entrada.css](file:///C:/Users/Impresion/.gemini/antigravity/scratch/luxius/src/pages/Entrada/Entrada.css)**
    - Reduce `.filters-bar` padding and gap.
    - Reduce table cell padding (`6px 10px` -> `4px 8px`).
    - Reduce header font size and uppercase letter spacing.
    - Make `.status-badge` and other UI elements more compact.
- **[MODIFY] [Entrada.tsx](file:///C:/Users/Impresion/.gemini/antigravity/scratch/luxius/src/pages/Entrada/Entrada.tsx)**
    - Fix "Filtrar" button: Currently filtering is automatic; either rename button to "Actualizar" or make it manual if preferred. I'll stick to automatic but improve the UI.

### Nuevo Pedido Modal
- **[MODIFY] [NuevoPedidoModal.css](file:///C:/Users/Impresion/.gemini/antigravity/scratch/luxius/src/pages/Entrada/NuevoPedidoModal.css)**
    - Reduce tab padding.
    - Reduce form-section spacing and grid gaps.
    - Reduce padding for IMPGES style file upload components.

### ABM Page
- **[MODIFY] [ABM.css](file:///C:/Users/Impresion/.gemini/antigravity/scratch/luxius/src/pages/ABM/ABM.css)**
    - Reduce padding in actions header and table cells.

## Verification Plan
- **Manual Verification**:
    - Check the `Entrada` page to ensure the table looks dense but readable.
    - Open `Nuevo Pedido` modal and verify the form is compact and fits better on screens.
    - Test the filters (Search, Status, Calidad, Material) to ensure they correctly filter the order list.
    - Verify that adding a new order still works and refreshes the list.
