import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface ShellGameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
    /** Mutable flag: when true the game must freeze its simulation. */
    pauseRef?: React.MutableRefObject<boolean>
}

interface GameShellProps {
    title: string
    color: string
    objective: string
    controls: string[]
    onBack: () => void
    onGameOver: (score: number, level: number) => void
    children: (props: { onGameOver: (score: number, level: number) => void; pauseRef: React.MutableRefObject<boolean> }) => React.ReactNode
}

type Phase = 'intro' | 'playing' | 'paused' | 'over'

// Keys the games use; we stop the browser/modal from scrolling or clicking buttons with them.
const GAME_KEYS = new Set([
    'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyK', 'KeyB', 'KeyF',
])

const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(2, 1, 8, 0.86)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    textAlign: 'center',
    zIndex: 5,
    fontFamily: 'var(--font-pixel-ui)',
    color: '#e0e0e0',
}

export const GameShell: React.FC<GameShellProps> = ({ title, color, objective, controls, onBack, onGameOver, children }) => {
    const [phase, setPhase] = useState<Phase>('intro')
    const [runId, setRunId] = useState(0)
    const [finalScore, setFinalScore] = useState<{ score: number; level: number } | null>(null)
    const pauseRef = useRef(true)
    const phaseRef = useRef<Phase>('intro')
    const onGameOverRef = useRef(onGameOver)
    const reportedRef = useRef(false)

    useEffect(() => { onGameOverRef.current = onGameOver }, [onGameOver])

    const changePhase = useCallback((p: Phase) => {
        phaseRef.current = p
        pauseRef.current = p !== 'playing'
        setPhase(p)
    }, [])

    // Stable callback: games list it as an effect dependency, so it must never change identity.
    const handleGameOver = useCallback((score: number, level: number) => {
        if (reportedRef.current) return
        reportedRef.current = true
        setFinalScore({ score, level })
        onGameOverRef.current(score, level)
        changePhase('over')
    }, [changePhase])

    const start = useCallback(() => {
        reportedRef.current = false
        setFinalScore(null)
        setRunId(r => r + 1)
        ;(document.activeElement as HTMLElement | null)?.blur?.()
        changePhase('playing')
    }, [changePhase])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const p = phaseRef.current
            const target = e.target as HTMLElement | null
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (p === 'playing') { changePhase('paused'); e.preventDefault(); e.stopImmediatePropagation() }
                else if (p === 'paused') { changePhase('playing'); e.preventDefault(); e.stopImmediatePropagation() }
                return
            }
            if (p === 'intro' || p === 'over') {
                if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) start() }
                return
            }
            if (p === 'paused') {
                if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); changePhase('playing') }
                else if (GAME_KEYS.has(e.code)) { e.preventDefault(); e.stopImmediatePropagation() }
                return
            }
            if (GAME_KEYS.has(e.code)) e.preventDefault()
        }
        // Capture phase so we run before the games' own window listeners.
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [changePhase, start])

    // Auto-pause when the tab loses focus.
    useEffect(() => {
        const onHide = () => { if (phaseRef.current === 'playing') changePhase('paused') }
        window.addEventListener('blur', onHide)
        document.addEventListener('visibilitychange', onHide)
        return () => {
            window.removeEventListener('blur', onHide)
            document.removeEventListener('visibilitychange', onHide)
        }
    }, [changePhase])

    const btn = (label: string, onClick: () => void, cls = 'pixel-btn-primary') => (
        <button className={`pixel-btn ${cls}`} onClick={onClick} style={{ fontSize: '11px' }}>{label}</button>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ position: 'relative', minWidth: '440px', minHeight: '520px', display: 'flex', justifyContent: 'center' }}>
                {phase !== 'intro' && <div key={runId}>{children({ onGameOver: handleGameOver, pauseRef })}</div>}

                {phase === 'intro' && (
                    <div style={{ ...overlayStyle, background: 'rgba(2, 1, 8, 0.6)', border: `3px solid ${color}` }}>
                        <div style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '18px', color }}>{title}</div>
                        <div style={{ fontSize: '12px', maxWidth: '360px' }}>{objective}</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', lineHeight: 1.7, color: 'var(--pixel-text-dim)' }}>
                            {controls.map(c => <li key={c}>{c}</li>)}
                            <li>P / Esc: pausa</li>
                        </ul>
                        {btn('▶ JUGAR (Enter)', start)}
                        {btn('◄ Volver a la galería', onBack, '')}
                    </div>
                )}

                {phase === 'paused' && (
                    <div style={overlayStyle}>
                        <div style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '18px', color }}>⏸ PAUSA</div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', lineHeight: 1.7, color: 'var(--pixel-text-dim)' }}>
                            {controls.map(c => <li key={c}>{c}</li>)}
                        </ul>
                        {btn('▶ Continuar (P / Enter)', () => changePhase('playing'))}
                        {btn('↻ Reiniciar', start, 'pixel-btn-warning')}
                        {btn('◄ Volver a la galería', onBack, '')}
                    </div>
                )}

                {phase === 'over' && (
                    <div style={{ ...overlayStyle, background: 'rgba(2, 1, 8, 0.78)' }}>
                        <div style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '18px', color: '#ff3366' }}>GAME OVER</div>
                        {finalScore && (
                            <div style={{ fontSize: '13px', color: '#ffc700' }}>
                                {finalScore.score.toLocaleString()} pts · Nivel {finalScore.level}
                            </div>
                        )}
                        {btn('↻ Jugar de nuevo (Enter)', start)}
                        {btn('◄ Volver a la galería', onBack, '')}
                    </div>
                )}
            </div>
            {phase === 'playing' && (
                <div style={{ fontFamily: 'var(--font-pixel-body)', fontSize: '12px', color: 'var(--pixel-text-dim)', textAlign: 'center' }}>
                    🎯 {controls.join(' · ')} · P/Esc: pausa
                </div>
            )}
        </div>
    )
}
