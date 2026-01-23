import { useState, useEffect } from 'react';
import { Upload, FileText, BarChart, CheckCircle, AlertCircle, Trash2, Eye } from 'lucide-react';

interface FileInfo {
    filename: string;
    size: number;
    uploaded_at: string;
}

export default function PrinterMetricsReader() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState<any>(null);
    const [activeFile, setActiveFile] = useState<string | null>(null);

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/printer-metrics/files');
            const data = await response.json();
            if (data.success) {
                setFiles(data.data);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:5000/api/admin/printer-metrics/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (data.success) {
                setAnalysis(data.data);
                setFile(null);
                fetchFiles();
            } else {
                alert(data.error);
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error al subir el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleAnalyze = async (filename: string) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/printer-metrics/analyze/${filename}`);
            const data = await response.json();
            if (data.success) {
                setAnalysis(data.data);
                setActiveFile(filename);
            }
        } catch (error) {
            console.error('Error analyzing file:', error);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <BarChart className="w-8 h-8 text-indigo-600" />
                    Métricas de Impresora (CSV)
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-4">
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-[32px] hover:border-indigo-400 transition-colors flex flex-col items-center justify-center bg-gray-50/50">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-sm font-bold text-gray-500 text-center mb-4">
                            {file ? file.name : 'Arrastra tu archivo .csv aquí o haz click para seleccionar'}
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="bg-white border border-gray-200 px-6 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer transition-all active:scale-95"
                        >
                            Seleccionar Archivo
                        </label>
                    </div>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`w-full py-4 rounded-2xl font-black text-white transition-all ${!file || uploading ? 'bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                            }`}
                    >
                        {uploading ? 'Procesando...' : 'Cargar y Analizar'}
                    </button>
                </div>

                {/* Recent Files List */}
                <div className="space-y-4">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Cargas Recientes</h3>
                    <div className="bg-gray-50 rounded-[32px] p-4 max-h-[250px] overflow-y-auto custom-scrollbar border border-gray-100">
                        {loading ? (
                            <p className="text-gray-400 text-xs text-center py-8">Cargando archivos...</p>
                        ) : files.length === 0 ? (
                            <p className="text-gray-400 text-xs text-center py-8 italic font-medium">No hay archivos cargados aún.</p>
                        ) : (
                            <div className="space-y-2">
                                {files.map((f, i) => (
                                    <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${activeFile === f.filename ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent'}`}>
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <div>
                                                <p className="text-[11px] font-black text-gray-800 max-w-[150px] truncate">{f.filename.split('_').slice(2).join('_') || f.filename}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{(f.size / 1024).toFixed(1)} KB • {new Date(f.uploaded_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleAnalyze(f.filename)} className="p-2 hover:bg-indigo-100 rounded-xl text-indigo-600 transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Analysis Results View */}
            {analysis && (
                <div className="pt-8 border-t border-gray-100 space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black text-gray-900">Análisis: {analysis.filename?.split('_').slice(2).join('_') || 'Archivo Actual'}</h3>
                        <span className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3" />
                            Procesado: {analysis.total_rows} registros
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {analysis.numeric_stats && Object.entries(analysis.numeric_stats).map(([col, stats]: [string, any]) => (
                            <div key={col} className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-3xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 truncate">{col}</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-bold uppercase tracking-tighter">Media:</span>
                                        <span className="text-gray-900 font-black">{stats.mean.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-500 font-bold uppercase tracking-tighter">Máx:</span>
                                        <span className="text-gray-900 font-black">{stats.max.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-900 rounded-[32px] p-6 overflow-x-auto shadow-xl">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-800">
                                    {analysis.columns.slice(0, 6).map((col: string) => (
                                        <th key={col} className="py-4 px-4 text-gray-500 font-black uppercase tracking-widest">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-gray-300">
                                {analysis.preview && analysis.preview.map((row: any, i: number) => (
                                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                        {analysis.columns.slice(0, 6).map((col: string) => (
                                            <td key={col} className="py-4 px-4 font-medium truncate max-w-[120px]">{String(row[col])}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="text-[10px] text-gray-600 mt-4 text-center font-bold uppercase tracking-widest">Mostrando primeros registros del dataset</p>
                    </div>
                </div>
            )}
        </div>
    );
}
