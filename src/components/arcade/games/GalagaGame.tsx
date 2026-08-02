import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
}

export const GalagaGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver }) => {
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

        let ship = { x: canvas.width / 2 - 14, y: canvas.height - 35, width: 28, height: 24, speed: 5 }
        let bullets: { x: number; y: number; dy: number; isPlayer: boolean }[] = []
        
        const createEnemies = () => {
            const list = []
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 7; c++) {
                    const startX = 45 + c * 48
                    const startY = 35 + r * 32
                    list.push({
                        x: startX,
                        y: startY,
                        homeX: startX,
                        homeY: startY,
                        width: 24,
                        height: 20,
                        alive: true,
                        diving: false,
                        diveTime: 0,
                        type: r === 0 ? 150 : r === 1 ? 80 : 50
                    })
                }
            }
            return list
        }

        let enemies = createEnemies()
        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
                const playerBullets = bullets.filter(b => b.isPlayer)
                if (playerBullets.length < 6) {
                    bullets.push({ x: ship.x + 4, y: ship.y, dy: -8, isPlayer: true })
                    bullets.push({ x: ship.x + ship.width - 7, y: ship.y, dy: -8, isPlayer: true })
                }
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

            // Move Ship
            if (keys['ArrowLeft'] || keys['KeyA']) ship.x = Math.max(10, ship.x - ship.speed)
            if (keys['ArrowRight'] || keys['KeyD']) ship.x = Math.min(canvas.width - ship.width - 10, ship.x + ship.speed)

            // Move Bullets & filter offscreen
            bullets = bullets.filter(b => {
                b.y += b.dy
                return b.y >= 0 && b.y <= canvas.height
            })

            // Check Wave Complete
            const aliveEnemies = enemies.filter(e => e.alive)
            if (aliveEnemies.length === 0) {
                localStage++
                setStage(localStage)
                enemies = createEnemies()
                invulnerableTimer = 60
                return
            }

            // Update Enemies & Diving Attacks
            enemies.forEach(e => {
                if (!e.alive) return

                if (!e.diving && Math.random() < 0.003 + localStage * 0.0005) {
                    e.diving = true
                    e.diveTime = 0
                }

                if (e.diving) {
                    e.diveTime += 0.05
                    e.y += 3.2
                    e.x = e.homeX + Math.sin(e.diveTime * 2) * 50

                    // Enemy shoot during dive
                    if (Math.random() < 0.02) {
                        bullets.push({ x: e.x + e.width / 2, y: e.y + e.height, dy: 5, isPlayer: false })
                    }

                    if (e.y > canvas.height + 20) {
                        e.y = -30
                        e.x = e.homeX
                        e.diving = false
                    }
                } else {
                    // Slight formation sway
                    e.x = e.homeX + Math.sin(Date.now() / 400) * 8
                }

                // Enemy ship collides with Galaga Fighter
                if (invulnerableTimer <= 0) {
                    const dist = Math.hypot((ship.x + ship.width / 2) - (e.x + e.width / 2), (ship.y + ship.height / 2) - (e.y + e.height / 2))
                    if (dist < 22) {
                        e.alive = false
                        localLives--
                        setLives(localLives)
                        invulnerableTimer = 90
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localStage)
                        }
                    }
                }
            })

            // Bullet Collisions
            bullets = bullets.filter(b => {
                let hit = false
                if (b.isPlayer) {
                    aliveEnemies.forEach(e => {
                        if (e.alive && b.x >= e.x && b.x <= e.x + e.width && b.y >= e.y && b.y <= e.y + e.height) {
                            e.alive = false
                            hit = true
                            localScore += e.type
                            setScore(localScore)
                        }
                    })
                } else {
                    // Enemy bullet hits Galaga Fighter
                    if (invulnerableTimer <= 0 && b.x >= ship.x && b.x <= ship.x + ship.width && b.y >= ship.y && b.y <= ship.y + ship.height) {
                        hit = true
                        localLives--
                        setLives(localLives)
                        invulnerableTimer = 90
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localStage)
                        }
                    }
                }
                return !hit
            })
        }

        const draw = () => {
            ctx.fillStyle = '#020108'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Dynamic Starfield
            ctx.fillStyle = '#ffffff'
            for (let i = 0; i < 40; i++) {
                const sx = (i * 47) % canvas.width
                const sy = (i * 61 + Date.now() / 20) % canvas.height
                ctx.fillRect(sx, sy, (i % 3) + 1, (i % 3) + 1)
            }

            // Draw Galaga Fighter (Flashing if invulnerable)
            if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
                ctx.fillStyle = '#ffffff'
                ctx.beginPath()
                ctx.moveTo(ship.x + ship.width / 2, ship.y)
                ctx.lineTo(ship.x + ship.width, ship.y + ship.height)
                ctx.lineTo(ship.x, ship.y + ship.height)
                ctx.closePath()
                ctx.fill()
                ctx.fillStyle = '#ff2a8d'
                ctx.fillRect(ship.x + ship.width / 2 - 2, ship.y + 4, 4, 12)
            }

            // Draw Enemies
            enemies.forEach(e => {
                if (!e.alive) return
                ctx.fillStyle = e.type === 150 ? '#ffc700' : e.type === 80 ? '#00f0ff' : '#ff3366'
                ctx.beginPath()
                ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2)
                ctx.fill()
            })

            // Draw Bullets
            bullets.forEach(b => {
                ctx.fillStyle = b.isPlayer ? '#ffc700' : '#ff3366'
                ctx.fillRect(b.x, b.y, 3, 8)
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
                <span>SHIPS: {'🛸'.repeat(lives)}</span>
                <span>STAGE: {stage}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={418}
                height={440}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#020108' }}
            />
            {isGameOver && (
                <div style={{ color: '#ff3366', fontFamily: 'var(--font-pixel-title)', fontSize: '16px', marginTop: '10px' }}>
                    GALAGA DESTROYED - GAME OVER!
                </div>
            )}
        </div>
    )
}
