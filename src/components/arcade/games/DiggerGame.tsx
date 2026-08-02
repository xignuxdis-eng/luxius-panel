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
        let invulnerableTimer = 0

        const buildDirt = () => {
            const map = []
            for (let r = 0; r < GRID_SIZE; r++) {
                const row = []
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (r === 0) row.push(0) // Surface
                    else if (Math.random() < 0.22) row.push(2) // Emerald
                    else row.push(1) // Dirt
                }
                map.push(row)
            }
            map[1][1] = 0 // Player spawn
            return map
        }

        let map = buildDirt()
        let digger = { x: TILE_SIZE + 5, y: TILE_SIZE + 5, size: 26, dir: 'right', speed: 3.2 }
        let beam: { x: number; y: number; dx: number; dy: number; timer: number } | null = null
        
        let enemies = [
            { x: 5 * TILE_SIZE + 5, y: 5 * TILE_SIZE + 5, speed: 1.5, alive: true },
            { x: 9 * TILE_SIZE + 5, y: 8 * TILE_SIZE + 5, speed: 1.5, alive: true },
            { x: 2 * TILE_SIZE + 5, y: 9 * TILE_SIZE + 5, speed: 1.5, alive: true }
        ]

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if ((e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyK') && !beam) {
                let dx = 0, dy = 0
                if (digger.dir === 'left') dx = -9
                if (digger.dir === 'right') dx = 9
                if (digger.dir === 'up') dy = -9
                if (digger.dir === 'down') dy = 9
                beam = { x: digger.x + 13, y: digger.y + 13, dx, dy, timer: 22 }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            keys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        const update = () => {
            if (isGameOver) return

            if (invulnerableTimer > 0) invulnerableTimer--

            // Move Digger
            let nextX = digger.x
            let nextY = digger.y

            if (keys['ArrowLeft'] || keys['KeyA']) { nextX -= digger.speed; digger.dir = 'left' }
            if (keys['ArrowRight'] || keys['KeyD']) { nextX += digger.speed; digger.dir = 'right' }
            if (keys['ArrowUp'] || keys['KeyW']) { nextY -= digger.speed; digger.dir = 'up' }
            if (keys['ArrowDown'] || keys['KeyS']) { nextY += digger.speed; digger.dir = 'down' }

            digger.x = Math.max(5, Math.min(canvas.width - TILE_SIZE + 5, nextX))
            digger.y = Math.max(5, Math.min(canvas.height - TILE_SIZE + 5, nextY))

            // Dig Dirt & Eat Emeralds
            const r = Math.floor((digger.y + 13) / TILE_SIZE)
            const c = Math.floor((digger.x + 13) / TILE_SIZE)
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                if (map[r][c] === 1) {
                    map[r][c] = 0 // Dig tunnel
                } else if (map[r][c] === 2) {
                    map[r][c] = 0 // Eat emerald
                    localScore += 150
                    setScore(localScore)
                }
            }

            // Fire Beam Update
            if (beam) {
                beam.x += beam.dx
                beam.y += beam.dy
                beam.timer--
                
                // Destroy dirt hit by beam
                const br = Math.floor(beam.y / TILE_SIZE)
                const bc = Math.floor(beam.x / TILE_SIZE)
                if (br >= 0 && br < GRID_SIZE && bc >= 0 && bc < GRID_SIZE && map[br][bc] === 1) {
                    map[br][bc] = 0
                    beam = null
                } else if (beam.timer <= 0) {
                    beam = null
                }
            }

            // Check Stage Clear (All emeralds or all enemies cleared)
            let emeraldsLeft = 0
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    if (map[row][col] === 2) emeraldsLeft++
                }
            }

            const aliveEnemies = enemies.filter(e => e.alive)
            if (emeraldsLeft === 0 || aliveEnemies.length === 0) {
                localStage++
                setStage(localStage)
                localScore += 500
                setScore(localScore)
                map = buildDirt()
                digger.x = TILE_SIZE + 5
                digger.y = TILE_SIZE + 5
                enemies = [
                    { x: 5 * TILE_SIZE + 5, y: 5 * TILE_SIZE + 5, speed: 1.5 + localStage * 0.2, alive: true },
                    { x: 9 * TILE_SIZE + 5, y: 8 * TILE_SIZE + 5, speed: 1.5 + localStage * 0.2, alive: true },
                    { x: 2 * TILE_SIZE + 5, y: 9 * TILE_SIZE + 5, speed: 1.5 + localStage * 0.2, alive: true }
                ]
                invulnerableTimer = 60
                return
            }

            // Update Enemies safely
            aliveEnemies.forEach(e => {
                // Seek player
                if (e.x < digger.x) e.x += e.speed
                if (e.x > digger.x) e.x -= e.speed
                if (e.y < digger.y) e.y += e.speed
                if (e.y > digger.y) e.y -= e.speed

                // Beam hits enemy
                if (beam) {
                    const distB = Math.hypot(beam.x - (e.x + 13), beam.y - (e.y + 13))
                    if (distB < 20) {
                        e.alive = false
                        beam = null
                        localScore += 250
                        setScore(localScore)
                    }
                }

                // Enemy collides with Digger
                if (invulnerableTimer <= 0) {
                    const distD = Math.hypot(digger.x - e.x, digger.y - e.y)
                    if (distD < 22) {
                        localLives--
                        setLives(localLives)
                        invulnerableTimer = 90
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localStage)
                        } else {
                            digger.x = TILE_SIZE + 5
                            digger.y = TILE_SIZE + 5
                        }
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

            // Draw Digger Vehicle (Flashing if invulnerable)
            if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
                ctx.fillStyle = '#ffc700'
                ctx.fillRect(digger.x, digger.y, digger.size, digger.size)
                ctx.fillStyle = '#000'
                ctx.fillRect(digger.x + 6, digger.y + 6, 8, 8)
            }

            // Draw Enemies
            enemies.forEach(e => {
                if (!e.alive) return
                ctx.fillStyle = '#ff2a8d'
                ctx.beginPath()
                ctx.arc(e.x + 13, e.y + 13, 12, 0, Math.PI * 2)
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
