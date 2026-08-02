import { useState } from "react";
import { ChevronDown, Search, User } from "lucide-react";
import { Client, getActiveClients } from "../data/clients";

interface ClientSelectorProps {
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  className?: string;
}

export default function ClientSelector({ selectedClientId, onClientChange, className = "" }: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const clients = getActiveClients();
  const selectedClient = clients.find(client => client.id === selectedClientId);
  
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Cliente * <span className="text-red-500">*</span>
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between ${
            !selectedClientId
              ? "border-red-300 bg-red-50 focus:ring-red-500"
              : "border-gray-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className={selectedClientId ? "text-gray-900" : "text-gray-500"}>
              {selectedClient ? `${selectedClient.name} - ${selectedClient.company || selectedClient.email}` : "Seleccionar cliente..."}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            {/* Barra de búsqueda */}
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Lista de clientes */}
            <div className="max-h-48 overflow-y-auto">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      onClientChange(client.id);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">
                          {client.company || client.email}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  No se encontraron clientes
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {!selectedClientId && (
        <p className="text-red-500 text-xs mt-1">
          Por favor selecciona un cliente
        </p>
      )}
    </div>
  );
} 