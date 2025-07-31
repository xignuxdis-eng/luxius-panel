import Header from "./Header";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export default function DashboardLayout({ children, showSidebar = false }: DashboardLayoutProps) {
  if (showSidebar) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6">
        {children}
      </main>
    </div>
  );
}