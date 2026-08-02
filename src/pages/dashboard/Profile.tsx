import { useState, useEffect } from "react";
import { User, apiService } from "../../services/api";
import { User as UserIcon, Mail, Phone, Building, Save, Key } from "lucide-react";

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    empresa: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem('luxius_user');
      if (storedUser) {
          const parsed = JSON.parse(storedUser);
          const response = await apiService.getUsers(); 
          const me = response.users.find((u: User) => u.username === parsed.username);
          
          if (me) {
              setUser(me);
              setFormData({
                  nombre: me.nombre || "",
                  apellido: me.apellido || "",
                  email: me.email || "",
                  telefono: me.telefono || "",
                  empresa: me.empresa || "",
                  password: "",
                  confirmPassword: ""
              });
          } else {
              setError("No se pudo cargar el perfil.");
          }
      }
    } catch (err) {
      setError("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (formData.password && formData.password !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden");
        return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      const updates: any = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        empresa: formData.empresa
      };

      if (formData.password) {
        updates.password = formData.password;
      }

      await apiService.updateUser(user.id, updates);
      setSuccess("Perfil actualizado correctamente");
      
      // Update local storage if name changed
      const storedUser = localStorage.getItem('luxius_user');
      if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.nombre = formData.nombre;
          parsed.apellido = formData.apellido;
          localStorage.setItem('luxius_user', JSON.stringify(parsed));
      }
      
      loadProfile();
      
    } catch (err: any) {
      setError(err.message || "Error al actualizar perfil");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando perfil...</div>;
  if (!user) return <div className="p-8 text-center text-red-500">Sesión inválida. Por favor reconecte.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
                <p className="text-gray-500">Gestiona tu información personal y seguridad</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium uppercase">
                    {user.role}
                </span>
            </div>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
            </div>
        )}
        
        {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                {success}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                     <div className="relative">
                        <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            required
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        />
                     </div>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                     <div className="relative">
                        <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            required
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.apellido}
                            onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                        />
                     </div>
                </div>

                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                     <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="email"
                            required
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                     </div>
                </div>

                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                     <div className="relative">
                        <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.telefono}
                            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                        />
                     </div>
                </div>

                <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                     <div className="relative">
                        <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.empresa}
                            onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                        />
                     </div>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Key size={20} className="text-gray-500"/> Seguridad
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                        <input 
                            type="password"
                            placeholder="Dejar vacía para no cambiar"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                        <input 
                            type="password"
                            placeholder="Repetir nueva contraseña"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                    <Save size={20} />
                    Guardar Cambios
                </button>
            </div>
        </form>
      </div>
    </div>
  );
}
