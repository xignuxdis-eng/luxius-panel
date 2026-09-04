import StockManager from "../../../components/StockManager";
import PrinterMetricsReader from "../../../components/PrinterMetricsReader";

export default function StockManagementPage() {
    const handleStockUpdate = (material: string, type: string, newStock: number) => {
        console.log(`Updated stock for ${material} (${type}): ${newStock}`);
    };

    return (
        <div className="space-y-12 pb-20">
            {/* Header Premium */}
            <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 to-indigo-950 rounded-[40px] p-10 shadow-2xl text-white">
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">Gestión de Producción</h1>
                        <p className="text-indigo-200 mt-2 text-lg font-medium italic">Control de inventario y análisis de maquinaria</p>
                    </div>
                    <div className="hidden md:flex gap-4">
                        <div className="px-6 py-4 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Estado Sistema</p>
                            <p className="text-xl font-black mt-1">OPTIMIZADO</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            </div>

            {/* Secciones de la página */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <StockManager onStockUpdate={handleStockUpdate} />

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <h3 className="text-lg font-black text-gray-900 mb-4 uppercase tracking-tighter">Resumen Logístico</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 uppercase">Alertas Stock</p>
                                <p className="text-2xl font-black text-blue-700 mt-1">SANO</p>
                            </div>
                            <div className="p-6 bg-purple-50 rounded-3xl border border-purple-100">
                                <p className="text-[10px] font-black text-purple-400 uppercase">Eficiencia</p>
                                <p className="text-2xl font-black text-purple-700 mt-1">94%</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <PrinterMetricsReader />

                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-[40px] p-8 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-4">Optimización de IA</h3>
                            <p className="text-gray-400 text-sm leading-relaxed italic">
                                Xana analiza tus logs de impresora para detectar fallos térmicos y prever falta de material antes de que ocurra.
                            </p>
                            <button className="mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                Configurar Xana
                            </button>
                        </div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl -mb-10 -mr-10"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
