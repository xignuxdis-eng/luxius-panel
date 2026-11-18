import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { initErrorRecorder } from './utils/errorRecorder'
import { initVersionEngine } from './utils/versionCheck'
import { initAuthFetch } from './utils/authFetch'

// Adjuntar el token JWT a todas las llamadas al backend (seguridad)
initAuthFetch()

// Inicializar diagnóstico de errores y motor de versiones anti-caché
initErrorRecorder()
initVersionEngine()

// Initial theme setup (light by default)
const savedTheme = localStorage.getItem('theme') || 'light'
document.documentElement.setAttribute('data-theme', savedTheme)
if (savedTheme === 'pixel') {
    document.body.classList.add('pixel-theme')
} else if (savedTheme === 'light') {
    document.body.classList.add('light-theme')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>,
)

