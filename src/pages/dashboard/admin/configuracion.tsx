import { useState } from 'react';
import { Settings, Shield, Bell, Palette, Database, Smartphone, Globe, Save, CheckCircle2 } from 'lucide-react';

export default function ConfiguracionPage() {
    const [activeTab, setActiveTab] = useState('General');
    const [darkMode, setDarkMode] = useState(false);
    const [sync, setSync] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }, 1200);
    };

    return (
        <div className="space-y-6 pb-20 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h1>
                    <p className="text-gray-500 mt-1 text-sm font-medium">Control centralizado de parámetros y seguridad</p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Sidebar Menu Interno */}
                <div className="space-y-2">
                    {[
                        { label: 'General', icon: Globe },
                        { label: 'Apariencia', icon: Palette },
                        { label: 'Notificaciones', icon: Bell },
                        { label: 'Seguridad', icon: Shield },
                        { label: 'Data', icon: Database }
                    ].map((item) => (
                        <button
                            key={item.label}
                            onClick={() => setActiveTab(item.label)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.15em] ${activeTab === item.label
                                ? 'bg-gray-900 text-white shadow-xl shadow-gray-200'
                                : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100'}`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Main Settings Panel */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm animate-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-500" />
                                Preferencias: {activeTab}
                            </h2>
                            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-widest">v2.4.0</span>
                        </div>

                        <div className="space-y-8">
                            <div className="flex items-center justify-between p-6 bg-gray-50/30 rounded-3xl border border-gray-50 hover:bg-white hover:border-indigo-100 transition-all group">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Nombre de la Empresa</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Identidad visual en documentos</p>
                                </div>
                                <input
                                    type="text"
                                    defaultValue="LuXius Pro Digital"
                                    className="bg-white border border-gray-200 px-4 py-3 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-56 text-gray-700 shadow-sm"
                                />
                            </div>

                            <div className="flex items-center justify-between p-6 bg-gray-50/30 rounded-3xl border border-gray-50 hover:bg-white hover:border-indigo-100 transition-all group">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Modo Visual</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Alternar tema del dashboard</p>
                                </div>
                                <div className="flex bg-gray-200 p-1 rounded-xl shadow-inner border border-gray-300">
                                    <button
                                        onClick={() => setDarkMode(false)}
                                        className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${!darkMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Light
                                    </button>
                                    <button
                                        onClick={() => setDarkMode(true)}
                                        className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${darkMode ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Dark
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-6 bg-gray-50/30 rounded-3xl border border-gray-50 hover:bg-white hover:border-indigo-100 transition-all group">
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Sincronización Inteligente</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Actualización automática de métricas</p>
                                </div>
                                <button
                                    onClick={() => setSync(!sync)}
                                    className={`w-14 h-7 rounded-full relative transition-all duration-300 ${sync ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-sm ${sync ? 'left-8' : 'left-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        <div className="mt-12 flex items-center justify-end gap-4 border-t border-gray-50 pt-8">
                            <button className="px-6 py-3 text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Cancelar</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-8 py-4 bg-gray-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-100 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <span className="animate-spin border-2 border-white/20 border-t-white rounded-full w-4 h-4"></span> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Sincronizando...' : 'Guardar Preferencias'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {showToast && (
                <div className="fixed bottom-10 right-10 z-50 bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-500">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-bold tracking-tight">Cambios guardados correctamente</span>
                </div>
            )}
        </div>
    );
}
