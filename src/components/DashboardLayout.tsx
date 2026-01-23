import { useState } from 'react';
import Header from "./Header";
import AppSidebar from "./AppSidebar";
import XanaAssistant from "./XanaAssistant";
import MultimediaWidget from "./MultimediaWidget";

interface DashboardLayoutProps {
    children: React.ReactNode;
    showSidebar?: boolean;
}

export default function DashboardLayout({ children, showSidebar = false }: DashboardLayoutProps) {
    const [multimediaMinimized, setMultimediaMinimized] = useState(() => {
        return localStorage.getItem('multimedia_minimized') === 'true';
    });

    const toggleMinimized = () => {
        const newState = !multimediaMinimized;
        setMultimediaMinimized(newState);
        localStorage.setItem('multimedia_minimized', String(newState));
    };

    if (showSidebar) {
        return (
            <div className="flex min-h-screen bg-gray-100">
                <AppSidebar />
                <main className="flex-1 p-6 relative">
                    <div className="pb-20">
                        {children}
                    </div>

                    {/* Persistent Widgets Container */}
                    <div className={`fixed transition-all duration-500 ease-in-out z-40 ${multimediaMinimized
                            ? 'bottom-24 left-4 w-56 opacity-100' // Docked in Sidebar Area
                            : 'bottom-6 right-24 w-80 shadow-2xl scale-90 origin-bottom-right hover:scale-100' // Restored Floating
                        }`}>
                        <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${multimediaMinimized ? '' : 'bg-white border border-gray-200'}`}>
                            <MultimediaWidget
                                isMinimized={multimediaMinimized}
                                onMinimizeToggle={toggleMinimized}
                            />
                        </div>
                    </div>

                    <XanaAssistant />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />
            <main className="container mx-auto p-6 relative">
                {children}
                <XanaAssistant />
            </main>
        </div>
    );
}
