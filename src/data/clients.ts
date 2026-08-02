export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  isActive: boolean;
}

export const clientsData: Client[] = [
  {
    id: "cli_001",
    name: "María González",
    email: "maria.gonzalez@empresa.com",
    phone: "+54 11 1234-5678",
    company: "Empresa ABC",
    isActive: true
  },
  {
    id: "cli_002",
    name: "Carlos Rodríguez",
    email: "carlos.rodriguez@gmail.com",
    phone: "+54 11 9876-5432",
    company: "Estudio Creativo XYZ",
    isActive: true
  },
  {
    id: "cli_003",
    name: "Ana Martínez",
    email: "ana.martinez@hotmail.com",
    phone: "+54 11 5555-1234",
    company: "Eventos Profesionales",
    isActive: true
  },
  {
    id: "cli_004",
    name: "Luis Fernández",
    email: "luis.fernandez@outlook.com",
    phone: "+54 11 4444-5678",
    company: "Marketing Digital Plus",
    isActive: true
  },
  {
    id: "cli_005",
    name: "Sofia López",
    email: "sofia.lopez@yahoo.com",
    phone: "+54 11 3333-9999",
    company: "Publicidad Express",
    isActive: true
  }
];

export const getActiveClients = (): Client[] => {
  return clientsData.filter(client => client.isActive);
};

export const getClientById = (id: string): Client | undefined => {
  return clientsData.find(client => client.id === id);
}; 