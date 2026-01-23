import React from 'react';

export default function UltraSimpleAdmin() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🧪 Ultra Simple Admin Test
          </h1>
          
          <div className="bg-green-50 p-6 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Funcionando</h3>
            <p className="text-green-600">Si ves esto, el routing funciona correctamente</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">🎨 Tailwind CSS</h4>
              <p className="text-blue-600">Colores y estilos aplicados</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">📱 Responsive</h4>
              <p className="text-purple-600">Grid responsivo funcionando</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">🔍 Diagnóstico:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Routing funcionando</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Componente renderizando</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>Tailwind CSS aplicado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 