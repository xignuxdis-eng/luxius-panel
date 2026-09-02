import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import { initErrorRecorder } from './utils/errorRecorder'
import { initVersionEngine } from './utils/versionCheck'

// Inicializar diagnóstico de errores y motor de versiones anti-caché
initErrorRecorder()
initVersionEngine()

// Initial theme setup
const savedTheme = localStorage.getItem('theme') || 'pixel'
document.documentElement.setAttribute('data-theme', savedTheme)
if (savedTheme === 'pixel') {
    document.body.classList.add('pixel-theme')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HashRouter>
            <App />
        </HashRouter>
    </React.StrictMode>,
)

