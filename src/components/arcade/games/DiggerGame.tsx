import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
}

const GRID_SIZE = 11
const TILE_SIZE = 38

export const DiggerGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [score, setScore] = useState(0)
    const [lives, setLives] = useState(3)
    const [stage, setStage] = useState(1)
    const [isGameOver, setIsGameOver] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let localScore = 0
        let localLives = 3
        let localStage = 1

        // Underground dirt map: 1=Dirt, 0=Tunnel, 2=Emerald
        const buildDirt = () => {
            const map = []
            for (let r = 0; r < GRID_SIZE; r++) {
                const row = []
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (r === 0) row.push(0) // Surface
                    else if (Math.random() < 0.2) row.push(2) // Emerald
                    else row.push(1) // Dirt
                }
                map.push(row)
            }
            map[1][1] = 0 // Player spawn
            return map
        }

        let map = buildDirt()
        let digger = { r: 1, c: 1, x: TILE_SIZE + 4, y: TILE_SIZE + 4, dir: 'right', speed: 3 }
        let beam: { x: number; y: number; dx: number; dy: number; timer: number } | null = null
        let enemies = [
            { x: 5 * TILE_SIZE + 4, y: 5 * TILE_SIZE + 4, speed: 1.5, alive: true },
            { x: 9 * TILE_SIZE + 4, y: 8 * TILE_SIZE + 4, speed: 1.5, alive: true }
        ]

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'KeyF') {
                // Shoot pump beam
                let dx = 0, dy = 0
                if (digger.dir === 'left') dx = -8
                if (digger.dir === 'right') dx = 8
                if (digger.dir === 'up') dy = -8
                if (digger.dir === 'down') dy = 8
                beam = { x: digger.x + 14, y: digger.y + 14, dx, dy, timer: 20 }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            keys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        const update = () => {
            if (isGameOver) return

            // Move Digger
            if (keys['ArrowLeft'] || keys['KeyA']) { digger.x -= digger.speed; digger.dir = 'left' }
            if (keys['ArrowRight'] || keys['KeyD']) { digger.x += digger.speed; digger.dir = 'right' }
            if (keys['ArrowUp'] || keys['KeyW']) { digger.y -= digger.speed; digger.dir = 'up' }
            if (keys['ArrowDown'] || keys['KeyS']) { digger.y += digger.speed; digger.dir = 'down' }

            // Clamp bound
            digger.x = Math.max(4, Math.min(canvas.width - TILE_SIZE, digger.x))
            digger.y = Math.max(4, Math.min(canvas.height - TILE_SIZE, digger.y))

            // Dig Dirt & Eat Emeralds
            const r = Math.floor((digger.y + 14) / TILE_SIZE)
            const c = Math.floor((digger.x + 14) / TILE_SIZE)
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                if (map[r][c] === 1) {
                    map[r][c] = 0 // Dig tunnel
                } else if (map[r][c] === 2) {
                    map[r][c] = 0 // Eat emerald
                    localScore += 150
                    setScore(localScore)
                }
            }

            // Beam
            if (beam) {
                beam.x += beam.dx
                beam.y += beam.dy
                beam.timer--
                if (beam.timer <= 0) beam = null
            }

            // Enemies
            let aliveEnemies = enemies.filter(e => e.alive)
            if (aliveEnemies.length === 0) {
                localStage++
                setStage(localStage)
                enemies = [
                    { x: 5 * TILE_SIZE + 4, y: 5 * TILE_SIZE + 4, speed: 1.5 + localStage * 0.2, alive: true },
                    { x: 9 * TILE_SIZE + 4, y: 8 * TILE_SIZE + 4, speed: 1.5 + localStage * 0.2, alive: true }
                ]
                map = buildDirt()
                return
            }

            aliveEnemies.forEach(e => {
                // Seek player
                if (e.x < digger.x) e.x += e.speed
                if (e.x > digger.x) e.x -= e.speed
                if (e.y < digger.y) e.y += e.speed
                if (e.y > digger.y) e.y -= e.speed

                // Beam hits enemy
                if (beam) {
                    const distB = Math.hypot(beam.x - e.x, beam.y - e.y)
                    if (distB < 20) {
                        e.alive = false
                        beam = null
                        localScore += 200
                        setScore(localScore)
                    }
                }

                // Enemy hits digger
                const distD = Math.hypot(digger.x - e.x, digger.y - e.y)
                if (distD < 20) {
                    localLives--
                    setLives(localLives)
                    if (localLives <= 0) {
                        setIsGameOver(true)
                        onGameOver(localScore, localStage)
                    } else {
                        digger.x = TILE_SIZE + 4
                        digger.y = TILE_SIZE + 4
                    }
                }
            })
        }

        const draw = () => {
            ctx.fillStyle = '#2b1b0e'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Dirt & Emeralds
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const tile = map[r][c]
                    if (tile === 1) {
                        ctx.fillStyle = '#6b4423'
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                        ctx.strokeStyle = '#4a2f17'
                        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    } else if (tile === 2) {
                        ctx.fillStyle = '#6b4423'
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                        ctx.fillStyle = '#00f0ff'
                        ctx.beginPath()
                        ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 7, 0, Math.PI * 2)
                        ctx.fill()
                    }
                }
            }

            // Draw Beam
            if (beam) {
                ctx.fillStyle = '#ff3366'
                ctx.beginPath()
                ctx.arc(beam.x, beam.y, 6, 0, Math.PI * 2)
                ctx.fill()
            }

            // Draw Digger Vehicle
            ctx.fillStyle = '#ffc700'
            ctx.fillRect(digger.x, digger.y, 28, 28)
            ctx.fillStyle = '#000'
            ctx.fillRect(digger.x + 6, digger.y + 6, 8, 8)

            // Draw Enemies
            enemies.forEach(e => {
                if (!e.alive) return
                ctx.fillStyle = '#ff2a8d'
                ctx.beginPath()
                ctx.arc(e.x + 14, e.y + 14, 12, 0, Math.PI * 2)
                ctx.fill()
            })
        }

        const loop = () => {
            update()
            draw()
            animationFrameId = requestAnimationFrame(loop)
        }

        loop()

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            cancelAnimationFrame(animationFrameId)
        }
    }, [isGameOver, onGameOver])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '418px', fontFamily: 'var(--font-pixel-ui)', color: '#00f0ff', fontSize: '13px' }}>
                <span>SCORE: {score}</span>
                <span>DIGGERS: {'⛏️'.repeat(lives)}</span>
                <span>DEPTH: {stage}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={418}
                height={418}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#2b1b0e' }}
            />
            {isGameOver && (
                <div style={{ color: '#ff3366', fontFamily: 'var(--font-pixel-title)', fontSize: '16px', marginTop: '10px' }}>
                    CAUGHT IN TUNNEL - GAME OVER!
                </div>
            )}
        </div>
    )
}
