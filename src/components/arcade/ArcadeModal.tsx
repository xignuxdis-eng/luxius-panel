import React, { useState } from 'react'
import Modal from '@components/ui/Modal'
import { useAuthStore } from '@store/authStore'
import { getHighScores, saveHighScore, HighScoreEntry } from './arcadeStore'

import { PacmanGame } from './games/PacmanGame'
import { SpaceInvadersGame } from './games/SpaceInvadersGame'
import { GalagaGame } from './games/GalagaGame'
import { BombermanGame } from './games/BombermanGame'
import { DiggerGame } from './games/DiggerGame'
import { DonkeyKongGame } from './games/DonkeyKongGame'

interface ArcadeModalProps {
    isOpen: boolean
    onClose: () => void
}

interface GameInfo {
    id: string
    name: string
    icon: string
    year: string
    genre: string
    color: string
}

const GAMES: GameInfo[] = [
    { id: 'pacman', name: 'Pac-Man', icon: '🟡', year: '1980', genre: 'Maze / Action', color: '#ffc700' },
    { id: 'spaceinvaders', name: 'Space Invaders', icon: '👾', year: '1978', genre: 'Space Shooter', color: '#00f0ff' },
    { id: 'galaga', name: 'Galaga', icon: '🚀', year: '1981', genre: 'Space Shooter', color: '#ff2a8d' },
    { id: 'bomberman', name: 'Bomberman', icon: '💣', year: '1983', genre: 'Action / Maze', color: '#ff7700' },
    { id: 'digger', name: 'Digger / Dig Dug', icon: '⛏️', year: '1982', genre: 'Digging / Action', color: '#00e676' },
    { id: 'donkeykong', name: 'Donkey Kong', icon: '🦍', year: '1981', genre: 'Platformer', color: '#3d5afe' },
]

export const ArcadeModal: React.FC<ArcadeModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuthStore()
    const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null)
    const [activeTab, setActiveTab] = useState<'gallery' | 'scores'>('gallery')
    const [scores, setScores] = useState<HighScoreEntry[]>(getHighScores())
    const [lastScoreNotice, setLastScoreNotice] = useState<string | null>(null)

    if (!isOpen) return null

    const handleGameOver = (score: number, level: number) => {
        if (!selectedGame || score <= 0) return

        const username = user?.username || 'invitado'
        const name = user?.name || user?.username || 'Operario'

        const isSaved = saveHighScore(selectedGame.id, selectedGame.name, username, name, score, level)
        if (isSaved) {
            setScores(getHighScores())
            setLastScoreNotice(`🏆 ¡NUEVO RÉCORD REGISTRADO! ${name}: ${score} pts en ${selectedGame.name}!`)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setSelectedGame(null); onClose() }}
            title="🎮 LUXIUS ARCADE CENTER 16-BIT"
            size="lg"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Top Nav Tabs */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '3px solid #000', paddingBottom: '10px' }}>
                    <button
                        className={`pixel-btn ${activeTab === 'gallery' ? 'pixel-btn-primary' : ''}`}
                        onClick={() => { setSelectedGame(null); setActiveTab('gallery') }}
                    >
                        👾 Galería de Juegos
                    </button>
                    <button
                        className={`pixel-btn ${activeTab === 'scores' ? 'pixel-btn-warning' : ''}`}
                        onClick={() => { setScores(getHighScores()); setActiveTab('scores') }}
                    >
                        🏆 Hall of Fame (Récords)
                    </button>
                </div>

                {lastScoreNotice && (
                    <div style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 199, 0, 0.2)',
                        border: '2px solid var(--pixel-gold-coin)',
                        color: 'var(--pixel-gold-coin)',
                        fontFamily: 'var(--font-pixel-ui)',
                        fontSize: '12px',
                        textAlign: 'center'
                    }}>
                        {lastScoreNotice}
                    </div>
                )}

                {/* Tab Content */}
                {activeTab === 'gallery' && !selectedGame && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                        {GAMES.map(game => (
                            <div
                                key={game.id}
                                className="pixel-box"
                                onClick={() => setSelectedGame(game)}
                                style={{
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    borderColor: game.color,
                                    transition: 'transform 0.1s ease'
                                }}
                            >
                                <span style={{ fontSize: '40px' }}>{game.icon}</span>
                                <span style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '13px', color: game.color }}>
                                    {game.name}
                                </span>
                                <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '10px', color: 'var(--pixel-text-dim)' }}>
                                    {game.year} • {game.genre}
                                </span>
                                <button className="pixel-btn pixel-btn-primary" style={{ fontSize: '10px', marginTop: '6px' }}>
                                    ► JUGAR
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Active Game Canvas View */}
                {selectedGame && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <button
                                className="pixel-btn"
                                onClick={() => setSelectedGame(null)}
                                style={{ fontSize: '11px' }}
                            >
                                ◄ Volver a Galería
                            </button>
                            <span style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '14px', color: selectedGame.color }}>
                                {selectedGame.icon} {selectedGame.name}
                            </span>
                            <span style={{ fontFamily: 'var(--font-pixel-ui)', fontSize: '11px', color: 'var(--pixel-text-dim)' }}>
                                Operario: {user?.name || user?.username || 'Invitado'}
                            </span>
                        </div>

                        {selectedGame.id === 'pacman' && <PacmanGame username={user?.username || 'guest'} name={user?.name || 'Operario'} onGameOver={handleGameOver} />}
                        {selectedGame.id === 'spaceinvaders' && <SpaceInvadersGame username={user?.username || 'guest'} name={user?.name || 'Operario'} onGameOver={handleGameOver} />}
                        {selectedGame.id === 'galaga' && <GalagaGame username={user?.username || 'guest'} name={user?.name || 'Operario'} onGameOver={handleGameOver} />}
                        {selectedGame.id === 'bomberman' && <BombermanGame username={user?.username || 'guest'} name={user?.name || 'Operario'} onGameOver={handleGameOver} />}
                        {selectedGame.id === 'digger' && <DiggerGame username={user?.username || 'guest'} name={user?.name || 'Operario'} onGameOver={handleGameOver} />}
                        {selectedGame.id === 'donkeykong' && <DonkeyKongGame username={user?.username || 'guest'} name={user?.name || 'Operario'} onGameOver={handleGameOver} />}

                        <div style={{ fontFamily: 'var(--font-pixel-body)', fontSize: '12px', color: 'var(--pixel-text-dim)', textAlign: 'center' }}>
                            🎮 Controles: Flechas o WASD para mover | Barra espaciadora para disparar / bomba / saltar.
                        </div>
                    </div>
                )}

                {/* Leaderboard Tab */}
                {activeTab === 'scores' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <h4 style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '14px', color: 'var(--pixel-gold-coin)', textAlign: 'center' }}>
                            🏆 RANKING DE OPERARIOS Y RÉCORDS ARCADE 🏆
                        </h4>

                        <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>RANK</th>
                                        <th>JUEGO</th>
                                        <th>JUGADOR / OPERARIO</th>
                                        <th>SCORE</th>
                                        <th>NIVEL</th>
                                        <th>FECHA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scores.map((s, idx) => (
                                        <tr key={s.id || idx}>
                                            <td style={{ fontWeight: 'bold', color: idx === 0 ? 'var(--pixel-gold-coin)' : idx === 1 ? '#e0e0e0' : idx === 2 ? '#cd7f32' : 'inherit' }}>
                                                #{idx + 1}
                                            </td>
                                            <td style={{ color: 'var(--pixel-neon-cyan)', fontFamily: 'var(--font-pixel-ui)' }}>
                                                {s.gameName}
                                            </td>
                                            <td>{s.name}</td>
                                            <td style={{ fontFamily: 'var(--font-pixel-title)', fontSize: '12px', color: 'var(--pixel-gold-coin)' }}>
                                                {s.score.toLocaleString()}
                                            </td>
                                            <td>LVL {s.level}</td>
                                            <td style={{ fontSize: '12px', color: 'var(--pixel-text-dim)' }}>{s.date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        </Modal>
    )
}
