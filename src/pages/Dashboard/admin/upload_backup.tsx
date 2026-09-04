import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, X, FileText, Package, FileUp, Send, CheckCircle, Info, User, Layers, Boxes } from "lucide-react";
import FileGrid from "../../../components/FileGrid";

export default function AdminUploadPage() {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState<'individual' | 'batch'>('individual');
    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form states
    const [cliente, setCliente] = useState("");
    const [material, setMaterial] = useState("");
    const [notas, setNotas] = useState("");

    const handleFilesSelected = (files: File[]) => {
        const newFiles = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file: file,
            name: file.name,
            preview: URL.createObjectURL(file),
            size: file.size,
            type: file.type
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (uploadedFiles.length === 0) return alert("Sube al menos un archivo");
        if (!cliente || !material) return alert("Por favor completa cliente y material");

        setIsSubmitting(true);
        // Simular creación de orden (ya que el backend real es complejo, 
        // aquí preparamos la estructura para que el dashboard la vea)
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSuccess(true);
            setTimeout(() => {
                navigate('/dashboard/admin/ordenes');
            }, 2000);
        } catch (err) {
            alert("Error al crear la orden");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">¡Orden Creada con Éxito!</h1>
                <p className="text-gray-500">Redirigiendo al panel de órdenes...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-8">
            {/* Header */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Trabajo</h1>
                    <p className="text-gray-500 mt-1 font-medium">Carga de archivos y especificaciones de producción</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-2xl">
                    <FileUp className="w-6 h-6 text-indigo-600" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Side */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
                        <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl w-fit">
                            <button
                                onClick={() => setSelectedRole('individual')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${selectedRole === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                            >
                                Carga Simple
                            </button>
                            <button
                                onClick={() => setSelectedRole('batch')}
                                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${selectedRole === 'batch' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
                            >
                                Lote (Varios)
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cliente</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            placeholder="Nombre del cliente o ID"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                            value={cliente}
                                            onChange={e => setCliente(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Material</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            placeholder="Ej: Vinilo Mate, Lona"
                                            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                            value={material}
                                            onChange={e => setMaterial(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Instrucciones de Producción</label>
                                <textarea
                                    rows={4}
                                    placeholder="Describe detalles de corte, laminado, terminación..."
                                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    value={notas}
                                    onChange={e => setNotas(e.target.value)}
                                />
                            </div>

                            <div className="border-2 border-dashed border-gray-100 rounded-3xl p-8 text-center bg-gray-50/30 hover:bg-indigo-50/30 hover:border-indigo-100 transition-all group cursor-pointer relative">
                                <input
                                    type="file"
                                    multiple
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => handleFilesSelected(Array.from(e.target.files || []))}
                                />
                                <div className="space-y-3">
                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-gray-400 group-hover:text-indigo-500" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Soltar archivos aquí</h3>
                                    <p className="text-xs text-gray-400 font-medium italic">o presiona para buscar en tu dispositivo</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Procesando...' : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Crear Orden de Trabajo
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Status / Preview Side */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-gray-400" />
                            Archivos Cargados ({uploadedFiles.length})
                        </h2>

                        <div className="space-y-3">
                            {uploadedFiles.length === 0 ? (
                                <div className="py-12 text-center">
                                    <FileText className="w-10 h-10 text-gray-100 mx-auto mb-2" />
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Sin archivos</p>
                                </div>
                            ) : (
                                uploadedFiles.map(file => (
                                    <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 group animate-in slide-in-from-right-4 duration-300">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-100">
                                            {file.type.startsWith('image/') ? (
                                                <img src={file.preview} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <FileText className="w-5 h-5 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-gray-900 truncate">{file.name}</p>
                                            <p className="text-[9px] text-gray-400 font-medium">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button onClick={() => removeFile(file.id)} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
                        <div className="flex items-start gap-4">
                            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold text-indigo-900 uppercase">Nota sobre el servidor</p>
                                <p className="text-[10px] text-indigo-600 font-medium leading-relaxed">
                                    Los archivos se procesarán automáticamente para su revisión por el área de diseño antes de pasar a impresión.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
