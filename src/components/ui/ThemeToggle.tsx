import { useState, useEffect } from 'react'

export default function ThemeToggle() {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'pixel')

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)

        if (theme === 'light') {
            document.body.classList.add('light-theme')
            document.body.classList.remove('pixel-theme')
        } else if (theme === 'pixel') {
            document.body.classList.add('pixel-theme')
            document.body.classList.remove('light-theme')
            // Dynamically load pixel fonts if not already loaded (Fase 3 Performance)
            if (!document.querySelector('link[href*="Press+Start+2P"]')) {
                const link = document.createElement('link')
                link.rel = 'stylesheet'
                link.href = 'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=Press+Start+2P&family=Silkscreen:wght@400;700&family=VT323&display=swap'
                document.head.appendChild(link)
            }
        } else {
            document.body.classList.remove('light-theme', 'pixel-theme')
        }
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => {
            if (prev === 'pixel') return 'dark'
            if (prev === 'dark') return 'light'
            return 'pixel'
        })
    }

    const getThemeIcon = () => {
        if (theme === 'pixel') return '👾 16-BIT'
        if (theme === 'dark') return '🌙 DARK'
        return '🌞 LIGHT'
    }

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle pixel-btn"
            title={`Tema actual: ${theme}. Click para cambiar.`}
            aria-label="Alternar tema de interfaz"
            style={{
                fontSize: '11px',
                padding: '4px 8px',
                minWidth: '78px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                border: '2px solid #000'
            }}
        >
            {getThemeIcon()}
        </button>
    )
}

