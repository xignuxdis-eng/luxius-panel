import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
}

// 11x11 Grid: 1=Solid Wall, 2=Brick, 0=Empty
const GRID_SIZE = 11
const TILE_SIZE = 38

export const BombermanGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [score, setScore] = useState(0)
    const [lives, setLives] = useState(3)
    const [stage] = useState(1)
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

        const buildGrid = () => {
            const map = []
            for (let r = 0; r < GRID_SIZE; r++) {
                const row = []
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (r === 0 || r === GRID_SIZE - 1 || c === 0 || c === GRID_SIZE - 1 || (r % 2 === 0 && c % 2 === 0)) {
                        row.push(1) // Solid
                    } else if (Math.random() < 0.4 && !(r <= 2 && c <= 2)) {
                        row.push(2) // Brick
                    } else {
                        row.push(0) // Empty
                    }
                }
                map.push(row)
            }
            return map
        }

        let map = buildGrid()
        let player = { x: TILE_SIZE + 4, y: TILE_SIZE + 4, size: 28, speed: 3 }
        let bombs: { r: number; c: number; timer: number }[] = []
        let explosions: { r: number; c: number; timer: number }[] = []
        let enemies = [
            { x: 7 * TILE_SIZE + 4, y: 7 * TILE_SIZE + 4, dx: 2, dy: 0 },
            { x: 9 * TILE_SIZE + 4, y: 3 * TILE_SIZE + 4, dx: 0, dy: 2 }
        ]

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'KeyB') {
                const r = Math.floor((player.y + player.size / 2) / TILE_SIZE)
                const c = Math.floor((player.x + player.size / 2) / TILE_SIZE)
                if (!bombs.some(b => b.r === r && b.c === c)) {
                    bombs.push({ r, c, timer: 120 }) // 2 seconds
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            keys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        const canMoveTo = (x: number, y: number) => {
            const r1 = Math.floor((y + 2) / TILE_SIZE)
            const c1 = Math.floor((x + 2) / TILE_SIZE)
            const r2 = Math.floor((y + player.size - 2) / TILE_SIZE)
            const c2 = Math.floor((x + player.size - 2) / TILE_SIZE)

            if (map[r1][c1] !== 0 || map[r1][c2] !== 0 || map[r2][c1] !== 0 || map[r2][c2] !== 0) return false
            return true
        }

        const update = () => {
            if (isGameOver) return

            // Move Player
            let nextX = player.x
            let nextY = player.y
            if (keys['ArrowLeft'] || keys['KeyA']) nextX -= player.speed
            if (keys['ArrowRight'] || keys['KeyD']) nextX += player.speed
            if (keys['ArrowUp'] || keys['KeyW']) nextY -= player.speed
            if (keys['ArrowDown'] || keys['KeyS']) nextY += player.speed

            if (canMoveTo(nextX, player.y)) player.x = nextX
            if (canMoveTo(player.x, nextY)) player.y = nextY

            // Update Bombs
            bombs.forEach((b, idx) => {
                b.timer--
                if (b.timer <= 0) {
                    // Detonate
                    bombs.splice(idx, 1)
                    const dirs = [{ r: 0, c: 0 }, { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]
                    dirs.forEach(d => {
                        const tr = b.r + d.r
                        const tc = b.c + d.c
                        if (tr >= 0 && tr < GRID_SIZE && tc >= 0 && tc < GRID_SIZE) {
                            if (map[tr][tc] === 2) {
                                map[tr][tc] = 0 // Destroy brick
                                localScore += 100
                                setScore(localScore)
                            }
                            if (map[tr][tc] !== 1) {
                                explosions.push({ r: tr, c: tc, timer: 30 })
                            }
                        }
                    })
                }
            })

            // Update Explosions
            explosions.forEach((ex, idx) => {
                ex.timer--
                if (ex.timer <= 0) explosions.splice(idx, 1)

                // Check hit player
                const pr = Math.floor((player.y + player.size / 2) / TILE_SIZE)
                const pc = Math.floor((player.x + player.size / 2) / TILE_SIZE)
                if (ex.r === pr && ex.c === pc) {
                    localLives--
                    setLives(localLives)
                    if (localLives <= 0) {
                        setIsGameOver(true)
                        onGameOver(localScore, localStage)
                    } else {
                        player.x = TILE_SIZE + 4
                        player.y = TILE_SIZE + 4
                    }
                }
            })

            // Move Enemies
            enemies.forEach(en => {
                const nextX = en.x + en.dx
                const nextY = en.y + en.dy
                const r = Math.floor((nextY + 14) / TILE_SIZE)
                const c = Math.floor((nextX + 14) / TILE_SIZE)

                if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && map[r][c] === 0) {
                    en.x = nextX
                    en.y = nextY
                } else {
                    en.dx = -en.dx
                    en.dy = -en.dy
                }

                // Enemy hits player
                const dist = Math.hypot(player.x - en.x, player.y - en.y)
                if (dist < 24) {
                    localLives--
                    setLives(localLives)
                    if (localLives <= 0) {
                        setIsGameOver(true)
                        onGameOver(localScore, localStage)
                    } else {
                        player.x = TILE_SIZE + 4
                        player.y = TILE_SIZE + 4
                    }
                }
            })
        }

        const draw = () => {
            ctx.fillStyle = '#112211'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Grid
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const tile = map[r][c]
                    if (tile === 1) {
                        ctx.fillStyle = '#333344'
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                        ctx.strokeStyle = '#000'
                        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    } else if (tile === 2) {
                        ctx.fillStyle = '#b85c14'
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                        ctx.strokeStyle = '#000'
                        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    }
                }
            }

            // Draw Bombs
            bombs.forEach(b => {
                ctx.fillStyle = '#000'
                ctx.beginPath()
                ctx.arc(b.c * TILE_SIZE + TILE_SIZE / 2, b.r * TILE_SIZE + TILE_SIZE / 2, 14, 0, Math.PI * 2)
                ctx.fill()
                ctx.fillStyle = '#ffcc00'
                ctx.fillRect(b.c * TILE_SIZE + TILE_SIZE / 2 - 2, b.r * TILE_SIZE + 4, 4, 6)
            })

            // Draw Explosions
            explosions.forEach(ex => {
                ctx.fillStyle = '#ff3300'
                ctx.fillRect(ex.c * TILE_SIZE, ex.r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                ctx.fillStyle = '#ffcc00'
                ctx.fillRect(ex.c * TILE_SIZE + 6, ex.r * TILE_SIZE + 6, TILE_SIZE - 12, TILE_SIZE - 12)
            })

            // Draw Player Bomberman
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(player.x, player.y, player.size, player.size)
            ctx.fillStyle = '#ff2a8d'
            ctx.fillRect(player.x + 4, player.y + 4, player.size - 8, 8)

            // Draw Enemies
            enemies.forEach(en => {
                ctx.fillStyle = '#ff3366'
                ctx.beginPath()
                ctx.arc(en.x + 14, en.y + 14, 12, 0, Math.PI * 2)
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
                <span>BOMBERS: {'💣'.repeat(lives)}</span>
                <span>STAGE: {stage}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={418}
                height={418}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#112211' }}
            />
            {isGameOver && (
                <div style={{ color: '#ff3366', fontFamily: 'var(--font-pixel-title)', fontSize: '16px', marginTop: '10px' }}>
                    BLOWN UP - GAME OVER!
                </div>
            )}
        </div>
    )
}
