import Sidebar from './Sidebar'
import MediaPlayer from '@components/ui/MediaPlayer'
import FloatingCalculator from '@components/ui/FloatingCalculator'
import FloatingAlarm from '@components/ui/FloatingAlarm'
import FloatingWhatsApp from '@components/ui/FloatingWhatsApp'
import XanaAssistant from '@components/XanaAssistant'
import './MainLayout.css'

interface MainLayoutProps {
    children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="main-layout">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
            <XanaAssistant />
            <FloatingWhatsApp />
            <FloatingAlarm />
            <FloatingCalculator />
            <MediaPlayer />
        </div>
    )
}



