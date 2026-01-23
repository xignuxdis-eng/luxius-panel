import { useState, useEffect } from "react";
import { apiService } from "../services/api";

export default function DashboardAdminSimple() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testStepByStep = async () => {
      try {
        console.log(`🔄 Paso ${step}: Iniciando...`);
        
        switch (step) {
          case 1:
            // Paso 1: Solo el componente básico
            console.log("✅ Paso 1: Componente básico renderizando");
            setStep(2);
            break;
            
          case 2:
            // Paso 2: Cargar materiales
            const materials = await apiService.getMaterials();
            console.log("✅ Paso 2: Materiales cargados:", materials.length);
            setData(prev => ({ ...prev, materials }));
            setStep(3);
            break;
            
          case 3:
            // Paso 3: Cargar usuarios
            const users = await apiService.getUsers();
            console.log("✅ Paso 3: Usuarios cargados:", users.length);
            setData(prev => ({ ...prev, users }));
            setStep(4);
            break;
            
          case 4:
            // Paso 4: Cargar órdenes
            const orders = await apiService.getOrders();
            console.log("✅ Paso 4: Órdenes cargadas:", orders.orders.length);
            setData(prev => ({ ...prev, orders }));
            setStep(5);
            break;
            
          case 5:
            // Paso 5: Cargar tareas
            const tasks = await apiService.getTasks();
            console.log("✅ Paso 5: Tareas cargadas:", tasks.tasks.length);
            setData(prev => ({ ...prev, tasks }));
            setStep(6);
            break;
            
          case 6:
            // Paso 6: Renderizar estadísticas simples
            console.log("✅ Paso 6: Renderizando estadísticas");
            setStep(7);
            break;
        }
      } catch (err) {
        console.error(`❌ Error en paso ${step}:`, err);
        setError(`Error en paso ${step}: ${err}`);
      }
    };

    testStepByStep();
  }, [step]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <h3 className="font-bold mb-2">Error en Paso {step}</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Panel de Administración Simple 🎛️
        </h1>
        <p className="text-gray-600">
          Paso {step} de 6 - Probando funcionalidad paso a paso
        </p>
        
        {/* Progreso */}
        <div className="mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Progreso</span>
            <span className="text-sm text-gray-600">{step}/6</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(step / 6) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📦 Materiales</h3>
          <p className="text-2xl font-bold text-blue-600">{data.materials?.length || 0}</p>
          <p className="text-sm text-blue-600">Cargados</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">👥 Usuarios</h3>
          <p className="text-2xl font-bold text-green-600">{data.users?.length || 0}</p>
          <p className="text-sm text-green-600">Cargados</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800 mb-2">📋 Órdenes</h3>
          <p className="text-2xl font-bold text-purple-600">{data.orders?.orders?.length || 0}</p>
          <p className="text-sm text-purple-600">Cargadas</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="font-semibold text-orange-800 mb-2">✅ Tareas</h3>
          <p className="text-2xl font-bold text-orange-600">{data.tasks?.tasks?.length || 0}</p>
          <p className="text-sm text-orange-600">Cargadas</p>
        </div>
      </div>

      {/* Detalles de materiales */}
      {data.materials && data.materials.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">📦 Materiales Cargados</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {data.materials.slice(0, 3).map((material: any, index: number) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{material.nombre}</span>
                    <span className="text-sm text-gray-500">
                      Tipo: {material.tipo} | Stock: {material.stock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estado final */}
      {step >= 6 && (
        <div className="bg-green-50 p-6 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-4">✅ Dashboard Completo:</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Todos los datos cargados</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Componente renderizando</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Tailwind funcionando</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>API funcionando</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 