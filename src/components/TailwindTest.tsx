import React from 'react';

export default function TailwindTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
            🎨 Prueba de Tailwind CSS
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Tarjeta 1 - Colores */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">🌈 Colores</h3>
              <p className="text-blue-100">Gradiente azul a púrpura</p>
            </div>
            
            {/* Tarjeta 2 - Espaciado */}
            <div className="bg-green-500 text-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">📏 Espaciado</h3>
              <p className="text-green-100">Padding y margin automáticos</p>
            </div>
            
            {/* Tarjeta 3 - Tipografía */}
            <div className="bg-red-500 text-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-2">📝 Tipografía</h3>
              <p className="text-red-100">Fuentes y tamaños</p>
            </div>
          </div>
          
          {/* Botones de prueba */}
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
              Botón Azul
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
              Botón Verde
            </button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg">
              Botón Púrpura
            </button>
          </div>
          
          {/* Grid responsivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-100 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">📱</div>
              <p className="text-sm text-gray-600">Móvil</p>
            </div>
            <div className="bg-gray-200 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">💻</div>
              <p className="text-sm text-gray-600">Tablet</p>
            </div>
            <div className="bg-gray-300 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">🖥️</div>
              <p className="text-sm text-gray-600">Desktop</p>
            </div>
            <div className="bg-gray-400 p-4 rounded-lg text-center">
              <div className="text-2xl mb-2">🖥️</div>
              <p className="text-sm text-gray-600">Grande</p>
            </div>
          </div>
          
          {/* Animaciones */}
          <div className="text-center">
            <div className="inline-block animate-bounce bg-yellow-400 text-yellow-900 p-4 rounded-full text-2xl mb-4">
              🎾
            </div>
            <p className="text-gray-600">Animación de rebote</p>
          </div>
          
          {/* Estado del CSS */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Estado de Tailwind CSS:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>✅ Tailwind CSS cargado</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>✅ Clases de utilidad funcionando</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>✅ Responsive design activo</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span>✅ Animaciones disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 