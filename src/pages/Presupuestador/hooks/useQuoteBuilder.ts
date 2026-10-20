// src/pages/Presupuestador/hooks/useQuoteBuilder.ts
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getClientes, getMateriales, getCalidades, saveOrden, getCombos, type ComboData } from '@/data/db';
import { useAuthStore } from '@/store/authStore';
import { downloadPresupuestoPDF, type PresupuestoItem, type PresupuestoData } from '@/utils/presupuestoPdf';
import type { UnidadMedida } from '@/types/orden';
import { isDesignerRole } from '@/types';

export function useQuoteBuilder() {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Data lists
    const clientes = getClientes();
    const combos = useMemo(() => getCombos().filter(c => c.habilitado !== false), []);

    // Unify printable materials filtering
    const printMaterials = useMemo(() => {
        const raw = getMateriales().filter(m =>
            m.habilitado !== false &&
            !['tinta', 'solvente', 'insumo'].includes((m.tipo || '').toLowerCase())
        );
        const seen = new Set<string>();
        return raw
            .filter(m => {
                const desc = m.descripcion || m.codigo;
                if (seen.has(desc)) return false;
                seen.add(desc);
                return true;
            })
            .sort((a, b) => (a.descripcion || a.codigo).localeCompare(b.descripcion || b.codigo));
    }, []);

    const printCalidades = useMemo(() => {
        return getCalidades().filter(c => c.habilitado !== false);
    }, []);

    // Presupuesto Meta State
    const [selectedClientId, setSelectedClientId] = useState<number | ''>(clientes[0]?.id || '');

    // Searchable Client Dropdown State
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const clientDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
                setShowClientDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [validezDias, setValidezDias] = useState<number>(15);
    const [descuento, setDescuento] = useState<number>(0);
    const [observaciones, setObservaciones] = useState<string>('');
    const [numeroPresupuesto, setNumeroPresupuesto] = useState<string>(`P-${Math.floor(1000 + Math.random() * 9000)}`);

    // Item List
    const [items, setItems] = useState<PresupuestoItem[]>([]);

    // Form Tab State: 'catalog' | 'combos' | 'custom'
    const [activeTab, setActiveTab] = useState<'catalog' | 'combos' | 'custom'>('catalog');

    // Combos Form State
    const [selectedComboId, setSelectedComboId] = useState<number | null>(null);
    const [comboSearch, setComboSearch] = useState('');
    const [comboCategoria, setComboCategoria] = useState('Todas');
    const [comboCopias, setComboCopias] = useState<number>(1);
    const [comboCustomPrecio, setComboCustomPrecio] = useState<number | ''>('');

    const comboCategories = useMemo(() => {
        const cats = new Set<string>();
        combos.forEach(c => {
            if (c.categoria) cats.add(c.categoria);
        });
        return ['Todas', ...Array.from(cats)];
    }, [combos]);

    const filteredCombos = useMemo(() => {
        return combos.filter(c => {
            const matchesCat = comboCategoria === 'Todas' || c.categoria === comboCategoria;
            const matchesSearch = !comboSearch ||
                c.nombre.toLowerCase().includes(comboSearch.toLowerCase()) ||
                (c.descripcion || '').toLowerCase().includes(comboSearch.toLowerCase()) ||
                (c.materialCodigo || '').toLowerCase().includes(comboSearch.toLowerCase()) ||
                (c.componentes || []).some(comp => (comp.nombre || '').toLowerCase().includes(comboSearch.toLowerCase()));
            return matchesCat && matchesSearch;
        });
    }, [combos, comboCategoria, comboSearch]);

    // Catalog Form State
    const [catMaterial, setCatMaterial] = useState<string>(() => {
        const initial = printMaterials[0];
        return initial ? (initial.descripcion || initial.codigo) : 'Lona Front Light 13oz';
    });
    const [catCalidad, setCatCalidad] = useState<string>(() => {
        const initial = printCalidades[0];
        return initial ? initial.nombre : 'Estándar 720DPI';
    });
    const [catAncho, setCatAncho] = useState<number>(1);
    const [catAlto, setCatAlto] = useState<number>(1);
    const [catCopias, setCatCopias] = useState<number>(1);
    const [catPrecioM2, setCatPrecioM2] = useState<number>(12000);

    // Custom Item Form State
    const [customConcepto, setCustomConcepto] = useState<string>('');
    const [customUnidad, setCustomUnidad] = useState<UnidadMedida>('u');
    const [customCantidad, setCustomCantidad] = useState<number>(1);
    const [customPrecioUnitario, setCustomPrecioUnitario] = useState<number>(15000);

    // Auto-update Catalog M2 Price based on material selection
    useEffect(() => {
        const allMats = getMateriales();
        const mat = allMats.find(m => (m.descripcion || m.codigo) === catMaterial);
        if (mat && mat.precioM2) {
            setCatPrecioM2(mat.precioM2);
        }
    }, [catMaterial]);

    const handleAddCatalogItem = (e: React.FormEvent) => {
        e.preventDefault();
        const areaM2 = (catAncho || 1) * (catAlto || 1);
        const subtotal = areaM2 * catCopias * catPrecioM2;

        const newItem: PresupuestoItem = {
            id: `item-${Date.now()}`,
            concepto: `${catMaterial} (${catCalidad}) - ${catAncho}x${catAlto}m`,
            unidadMedida: 'm2',
            cantidad: Math.round(areaM2 * catCopias * 100) / 100,
            precioUnitario: catPrecioM2,
            subtotal: subtotal,
            isCustom: false
        };

        setItems(prev => [...prev, newItem]);
    };

    const comboPrecio = (combo: ComboData): number =>
        combo.precioFinal ?? combo.precioSugerido ?? 0;

    const comboMaterial = (combo: ComboData): string =>
        combo.materialCodigo ||
        (combo.componentes || []).find(comp => comp.tipo === 'material')?.nombre ||
        '';

    const comboServicios = (combo: ComboData): string[] =>
        (combo.componentes || [])
            .filter(comp => comp.tipo === 'servicio')
            .map(comp => comp.nombre);

    const handleSelectCombo = (combo: ComboData) => {
        setSelectedComboId(combo.id);
        setComboCustomPrecio(comboPrecio(combo));
    };

    const handleAddComboItem = (e: React.FormEvent) => {
        e.preventDefault();
        const combo = combos.find(c => c.id === selectedComboId);
        if (!combo) {
            alert('Por favor seleccione una promo o combo de la lista.');
            return;
        }

        const unitPrice = typeof comboCustomPrecio === 'number' ? comboCustomPrecio : comboPrecio(combo);
        const qty = comboCopias > 0 ? comboCopias : 1;
        const subtotal = qty * unitPrice;

        const serviciosIncluidos = comboServicios(combo);

        const newItem: PresupuestoItem = {
            id: `item-combo-${Date.now()}`,
            concepto: `[PROMO] ${combo.nombre} (${combo.ancho}x${combo.alto}m - ${comboMaterial(combo)}${serviciosIncluidos.length > 0 ? ' + ' + serviciosIncluidos.join(', ') : ''})`,
            unidadMedida: 'u',
            cantidad: qty,
            precioUnitario: unitPrice,
            subtotal: subtotal,
            isCustom: false
        };

        setItems(prev => [...prev, newItem]);
    };

    const handleAddCustomItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customConcepto.trim()) {
            alert('Por favor ingrese una descripción para el trabajo especial.');
            return;
        }

        const subtotal = (customCantidad || 1) * (customPrecioUnitario || 0);

        const newItem: PresupuestoItem = {
            id: `item-${Date.now()}`,
            concepto: customConcepto.trim(),
            unidadMedida: customUnidad,
            cantidad: customCantidad,
            precioUnitario: customPrecioUnitario,
            subtotal: subtotal,
            isCustom: true
        };

        setItems(prev => [...prev, newItem]);
        setCustomConcepto('');
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // Calculation Totals
    const rawSubtotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const finalTotal = Math.max(0, rawSubtotal - descuento);

    // PDF Export
    const handleExportPDF = () => {
        if (items.length === 0) {
            alert('Agregue al menos un ítem al presupuesto para generar el PDF.');
            return;
        }

        const selectedClient = clientes.find(c => c.id === Number(selectedClientId));

        const data: PresupuestoData = {
            numeroPresupuesto,
            fecha: new Date().toLocaleDateString('es-AR'),
            validezDias,
            clienteNombre: selectedClient?.nombre || 'Cliente General',
            clienteEmpresa: selectedClient?.empresa || '',
            clienteTelefono: selectedClient?.telefono || '',
            clienteEmail: selectedClient?.email || '',
            items,
            subtotal: rawSubtotal,
            descuento,
            total: finalTotal,
            observaciones,
            vendedorNombre: user?.name || 'Ventas'
        };

        downloadPresupuestoPDF(data);
    };

    // Convert to Order (OT)
    const handleConvertToOrders = () => {
        if (items.length === 0) {
            alert('No hay ítems para convertir a Orden de Trabajo.');
            return;
        }

        const selectedClient = clientes.find(c => c.id === Number(selectedClientId));
        const clienteNombre = selectedClient?.nombre || 'Cliente General';

        let createdCount = 0;
        items.forEach((item) => {
            saveOrden({
                clientId: Number(selectedClientId) || 1,
                clienteNombre: clienteNombre,
                status: 'diseno',
                nombreTarea: item.concepto,
                origen: 'web',
                material: item.isCustom ? 'TRABAJO ESPECIAL' : item.concepto.split(' - ')[0],
                calidad: 'Estándar',
                alto: 1,
                ancho: 1,
                copias: item.cantidad,
                subtotal: item.subtotal,
                demasias: 0,
                accesorios: [],
                laminado: false,
                bordado: false,
                panelizado: false,
                portabanners: 0,
                envio: 'retiro',
                emergencia: false,
                fechaCreacion: new Date().toISOString(),
                fechaEntrega: new Date(Date.now() + 86400000 * 3).toISOString(),
                observaciones: `${observaciones} [Cotización: ${numeroPresupuesto}]`,
                observaciones2: '',
                archivos: [],
                vendedorNombre: user?.name || 'Ventas',
                operarioNombre: isDesignerRole(user?.role) ? (user?.name || user?.username) : user?.name,
                artistaId: isDesignerRole(user?.role) ? user?.id : undefined,
                creadoPor: user?.username || (user?.id ? String(user?.id) : undefined),
                usuarioId: user?.id,
                isCustom: item.isCustom,
                conceptoPersonalizado: item.isCustom ? item.concepto : undefined,
                unidadMedida: item.unidadMedida,
                precioUnitarioManual: item.precioUnitario
            });
            createdCount++;
        });

        alert(`✅ ¡Éxito! Se han generado ${createdCount} Órdenes de Trabajo en el sistema.`);
        navigate('/entrada');
    };

    return {
        clientes,
        combos,
        printMaterials,
        printCalidades,
        selectedClientId,
        setSelectedClientId,
        clientSearch,
        setClientSearch,
        showClientDropdown,
        setShowClientDropdown,
        clientDropdownRef,
        validezDias,
        setValidezDias,
        descuento,
        setDescuento,
        observaciones,
        setObservaciones,
        numeroPresupuesto,
        setNumeroPresupuesto,
        items,
        activeTab,
        setActiveTab,
        selectedComboId,
        comboSearch,
        setComboSearch,
        comboCategoria,
        setComboCategoria,
        comboCopias,
        setComboCopias,
        comboCustomPrecio,
        setComboCustomPrecio,
        comboCategories,
        filteredCombos,
        catMaterial,
        setCatMaterial,
        catCalidad,
        setCatCalidad,
        catAncho,
        setCatAncho,
        catAlto,
        setCatAlto,
        catCopias,
        setCatCopias,
        catPrecioM2,
        setCatPrecioM2,
        customConcepto,
        setCustomConcepto,
        customUnidad,
        setCustomUnidad,
        customCantidad,
        setCustomCantidad,
        customPrecioUnitario,
        setCustomPrecioUnitario,
        handleAddCatalogItem,
        comboPrecio,
        comboMaterial,
        comboServicios,
        handleSelectCombo,
        handleAddComboItem,
        handleAddCustomItem,
        handleRemoveItem,
        rawSubtotal,
        finalTotal,
        handleExportPDF,
        handleConvertToOrders
    };
}
