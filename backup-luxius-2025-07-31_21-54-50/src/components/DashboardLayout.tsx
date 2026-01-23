import Header from "./Header";
import Sidebar from "./Sidebar";
import WeatherTimeWidget from "./WeatherTimeWidget";
import FloatingPlayer from "./FloatingPlayer";
import XanaAIChat from "./XanaAIChat";
import QuickNotes from "./QuickNotes";
import Calculator from "./Calculator";

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function DashboardLayout({ children, showSidebar = false }: DashboardLayoutProps) {
  if (showSidebar) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 relative">
          {/* Widgets en esquina superior derecha */}
          <div className="absolute top-6 right-6 z-30 flex space-x-3">
            <FloatingPlayer />
            <WeatherTimeWidget />
          </div>
          
          {/* Contenido principal con margen superior para los widgets */}
          <div className="pt-32">
            {children}
          </div>
          
          {/* Componentes flotantes globales */}
          <XanaAIChat />
          <QuickNotes />
          <Calculator />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Header />
      <main className="container mx-auto p-6 relative">
        {/* Widgets en esquina superior derecha */}
        <div className="absolute top-6 right-6 z-30 flex space-x-3">
          <FloatingPlayer />
          <WeatherTimeWidget />
        </div>
        
        {/* Contenido principal con margen superior para los widgets */}
        <div className="pt-32">
          {children}
        </div>
        
        {/* Componentes flotantes globales */}
        <XanaAIChat />
        <QuickNotes />
        <Calculator />
      </main>
    </div>
  );
}