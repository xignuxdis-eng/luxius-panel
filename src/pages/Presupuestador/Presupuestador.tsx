import './Presupuestador.css';
import { useQuoteBuilder } from './hooks/useQuoteBuilder';
import { ClientSelector } from './subcomponents/ClientSelector';
import { QuoteForm } from './subcomponents/QuoteForm';
import { QuoteItemsTable } from './subcomponents/QuoteItemsTable';
import { QuoteSummary } from './subcomponents/QuoteSummary';

export function Presupuestador() {
    const quote = useQuoteBuilder();

    return (
        <div className="presupuestador-page">
            <div className="presupuestador-header">
                <div className="presupuestador-title">
                    <h1>🧮 Presupuestador & Cotizador de Trabajos</h1>
                    <p>Genere cotizaciones formales para clientes incluyendo ítems de imprenta e ítems especiales / tercerizados.</p>
                </div>
            </div>

            <div className="presupuestador-grid">
                {/* Main Panel */}
                <div>
                    <ClientSelector
                        clientes={quote.clientes}
                        selectedClientId={quote.selectedClientId}
                        setSelectedClientId={quote.setSelectedClientId}
                        clientSearch={quote.clientSearch}
                        setClientSearch={quote.setClientSearch}
                        showClientDropdown={quote.showClientDropdown}
                        setShowClientDropdown={quote.setShowClientDropdown}
                        clientDropdownRef={quote.clientDropdownRef}
                        numeroPresupuesto={quote.numeroPresupuesto}
                        setNumeroPresupuesto={quote.setNumeroPresupuesto}
                        validezDias={quote.validezDias}
                        setValidezDias={quote.setValidezDias}
                    />

                    <QuoteForm
                        activeTab={quote.activeTab}
                        setActiveTab={quote.setActiveTab}
                        combos={quote.combos}
                        printMaterials={quote.printMaterials}
                        printCalidades={quote.printCalidades}
                        catMaterial={quote.catMaterial}
                        setCatMaterial={quote.setCatMaterial}
                        catCalidad={quote.catCalidad}
                        setCatCalidad={quote.setCatCalidad}
                        catAncho={quote.catAncho}
                        setCatAncho={quote.setCatAncho}
                        catAlto={quote.catAlto}
                        setCatAlto={quote.setCatAlto}
                        catCopias={quote.catCopias}
                        setCatCopias={quote.setCatCopias}
                        catPrecioM2={quote.catPrecioM2}
                        setCatPrecioM2={quote.setCatPrecioM2}
                        handleAddCatalogItem={quote.handleAddCatalogItem}
                        comboSearch={quote.comboSearch}
                        setComboSearch={quote.setComboSearch}
                        comboCategories={quote.comboCategories}
                        comboCategoria={quote.comboCategoria}
                        setComboCategoria={quote.setComboCategoria}
                        filteredCombos={quote.filteredCombos}
                        selectedComboId={quote.selectedComboId}
                        handleSelectCombo={quote.handleSelectCombo}
                        comboPrecio={quote.comboPrecio}
                        comboMaterial={quote.comboMaterial}
                        comboServicios={quote.comboServicios}
                        comboCopias={quote.comboCopias}
                        setComboCopias={quote.setComboCopias}
                        comboCustomPrecio={quote.comboCustomPrecio}
                        setComboCustomPrecio={quote.setComboCustomPrecio}
                        handleAddComboItem={quote.handleAddComboItem}
                        customConcepto={quote.customConcepto}
                        setCustomConcepto={quote.setCustomConcepto}
                        customUnidad={quote.customUnidad}
                        setCustomUnidad={quote.setCustomUnidad}
                        customCantidad={quote.customCantidad}
                        setCustomCantidad={quote.setCustomCantidad}
                        customPrecioUnitario={quote.customPrecioUnitario}
                        setCustomPrecioUnitario={quote.setCustomPrecioUnitario}
                        handleAddCustomItem={quote.handleAddCustomItem}
                    />

                    <QuoteItemsTable
                        items={quote.items}
                        onRemoveItem={quote.handleRemoveItem}
                    />
                </div>

                {/* Sidebar Summary Panel */}
                <div>
                    <QuoteSummary
                        rawSubtotal={quote.rawSubtotal}
                        descuento={quote.descuento}
                        setDescuento={quote.setDescuento}
                        finalTotal={quote.finalTotal}
                        observaciones={quote.observaciones}
                        setObservaciones={quote.setObservaciones}
                        handleExportPDF={quote.handleExportPDF}
                        handleConvertToOrders={quote.handleConvertToOrders}
                    />
                </div>
            </div>
        </div>
    );
}

export default Presupuestador;
