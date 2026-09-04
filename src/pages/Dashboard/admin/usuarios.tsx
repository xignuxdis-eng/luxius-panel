import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Trash2,
  Edit2,
  Plus,
  X,
  CheckCircle,
  XCircle,
  Shield,
  ShieldAlert,
  Key,
  ShoppingBag,
  AlertTriangle
} from "lucide-react";
import { apiService, User } from "../../../services/api";

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null); // For Delete Modal

  // Form states
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "cliente",
    nombre: "",
    apellido: ""
  });

  // Edit Password state
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      setUsuarios(response.users);
    } catch (err) {
      setError("Error al cargar usuarios");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Creando usuario con datos:", newUser);
      await apiService.createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        rol: newUser.role
      });
      fetchUsuarios();
      setShowCreateModal(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "cliente",
        nombre: "",
        apellido: ""
      });
    } catch (err: any) {
      console.error("Error creating user:", err);
      // Try to extract detailed error from response if available
      const msg = err.response?.data?.error || err.message || "Error al crear usuario";
      alert(msg);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updates: any = {
        nombre: editingUser.nombre,
        apellido: editingUser.apellido,
        email: editingUser.email,
        rol: editingUser.role, // Mapping back to rol property if needed, but state uses 'role'
        activo: editingUser.activo // Send usage of active
      };

      // Only send password if provided
      if (newPassword.trim()) {
        updates.password = newPassword;
      }

      await apiService.updateUser(editingUser.id, updates);
      fetchUsuarios();
      setEditingUser(null);
      setNewPassword("");
    } catch (err: any) {
      alert(err.message || "Error al actualizar usuario");
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await apiService.deleteUser(userToDelete.id);
      if (res.success) {
        // alert("Usuario eliminado correctamente"); // Removed alert for smoother UX or use toast
        setUsuarios(prev => prev.filter(u => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        alert("Error: " + (res.message || "No se pudo eliminar"));
      }
    } catch (err: any) {
      console.error(err);
      alert("Error al eliminar: " + (err.response?.data?.error || err.message || "Error desconocido"));
    }
  };

  const filteredUsers = usuarios.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: "bg-purple-100 text-purple-700",
      cliente: "bg-blue-100 text-blue-700",
      artista: "bg-pink-100 text-pink-700",
      taller: "bg-orange-100 text-orange-700",
      impresor: "bg-cyan-100 text-cyan-700"
    };
    // Normalize logic
    const normalizedRole = role.toLowerCase() as keyof typeof styles;
    return styles[normalizedRole] || "bg-gray-100 text-gray-700";
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra los accesos y roles del sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <ShieldAlert size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o email..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.nombre} {user.apellido}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(user.rol || 'cliente')}`}>
                      {(user.rol || 'cliente').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.activo ? (
                      <span className="inline-flex items-center gap-1 text-green-600 px-2 py-1 rounded-full bg-green-50 text-xs font-medium">
                        <CheckCircle size={12} /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 px-2 py-1 rounded-full bg-red-50 text-xs font-medium">
                        <XCircle size={12} /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => {
                        // Navigate to orders passing client ID (Assuming logic exists, or just to orders page)
                        // For now, let's just use window.location or navigate hook if available.
                        // Actually, I need `useNavigate`.
                        window.location.href = `/dashboard/admin/upload?client_id=${user.id}`;
                      }}
                      className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                      title="Crear Pedido"
                    >
                      <ShoppingBag size={18} />
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {
        showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Crear Nuevo Usuario</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newUser.nombre}
                      onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newUser.apellido}
                      onChange={(e) => setNewUser({ ...newUser, apellido: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <input
                      type="password"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="artista">Artista</option>
                      <option value="impresor">Impresor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mt-4"
                >
                  Crear Usuario
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Modal */}
      {
        editingUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Editar Usuario</h2>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setNewPassword("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                {/* Activo Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <Shield size={20} className="text-gray-500" />
                    <span className="font-medium text-gray-700">Usuario Activo</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={editingUser.activo ?? true}
                      onChange={(e) => setEditingUser({ ...editingUser, activo: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editingUser.nombre}
                      onChange={(e) => setEditingUser({ ...editingUser, nombre: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editingUser.apellido}
                      onChange={(e) => setEditingUser({ ...editingUser, apellido: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="artista">Artista</option>
                      <option value="impresor">Impresor</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                {/* Password Reset Section */}
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Key size={16} /> Cambiar Contraseña (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Nueva contraseña..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-yellow-50/50"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Dejar en blanco para mantener la contraseña actual.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium mt-4"
                >
                  Guardar Cambios
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        userToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={32} />
                <h2 className="text-xl font-bold">Confirmar Eliminación</h2>
              </div>

              <p className="text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar al usuario <strong>{userToDelete.username}</strong>?
              </p>

              <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Advertencia: Esta acción eliminará permanentemente:
                </p>
                <ul className="list-disc list-inside text-sm text-red-600 mt-2 space-y-1">
                  <li>El perfil del usuario</li>
                  <li>Todos sus pedidos asociados</li>
                  <li>Historial de presupuestos</li>
                  <li>Archivos subidos</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Eliminar Definitivamente
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}
