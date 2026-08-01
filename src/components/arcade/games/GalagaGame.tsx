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

        let ship = { x: canvas.width / 2 - 14, y: canvas.height - 35, width: 28, height: 24, speed: 5 }
        let bullets: { x: number; y: number; dy: number }[] = []
        
        // Enemies
        const createEnemies = () => {
            const list = []
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 7; c++) {
                    list.push({
                        x: 45 + c * 48,
                        y: 35 + r * 32,
                        width: 24,
                        height: 20,
                        alive: true,
                        angle: 0,
                        diving: false,
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
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                if (bullets.length < 4) {
                    bullets.push({ x: ship.x + 4, y: ship.y, dy: -8 })
                    bullets.push({ x: ship.x + ship.width - 7, y: ship.y, dy: -8 })
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

            // Move Ship
            if (keys['ArrowLeft'] || keys['KeyA']) ship.x = Math.max(10, ship.x - ship.speed)
            if (keys['ArrowRight'] || keys['KeyD']) ship.x = Math.min(canvas.width - ship.width - 10, ship.x + ship.speed)

            // Move Bullets
            bullets.forEach((b, idx) => {
                b.y += b.dy
                if (b.y < 0) bullets.splice(idx, 1)
            })

            // Check Wave Complete
            const alive = enemies.filter(e => e.alive)
            if (alive.length === 0) {
                localStage++
                setStage(localStage)
                enemies = createEnemies()
                return
            }

            // Update Enemies
            enemies.forEach(e => {
                if (!e.alive) return
                if (!e.diving && Math.random() < 0.002) {
                    e.diving = true
                }

                if (e.diving) {
                    e.y += 3
                    e.x += Math.sin(e.y / 20) * 4
                    if (e.y > canvas.height) {
                        e.y = -20
                        e.diving = false
                    }
                }

                // Bullet hits enemy
                bullets.forEach((b, bIdx) => {
                    if (b.x >= e.x && b.x <= e.x + e.width && b.y >= e.y && b.y <= e.y + e.height) {
                        e.alive = false
                        bullets.splice(bIdx, 1)
                        localScore += e.type
                        setScore(localScore)
                    }
                })

                // Enemy collides with ship
                const dist = Math.hypot(ship.x + ship.width / 2 - (e.x + e.width / 2), ship.y + ship.height / 2 - (e.y + e.height / 2))
                if (dist < 20) {
                    e.alive = false
                    localLives--
                    setLives(localLives)
                    if (localLives <= 0) {
                        setIsGameOver(true)
                        onGameOver(localScore, localStage)
                    }
                }
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

            // Draw Ship
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.moveTo(ship.x + ship.width / 2, ship.y)
            ctx.lineTo(ship.x + ship.width, ship.y + ship.height)
            ctx.lineTo(ship.x, ship.y + ship.height)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = '#ff2a8d'
            ctx.fillRect(ship.x + ship.width / 2 - 2, ship.y + 4, 4, 12)

            // Draw Enemies
            enemies.forEach(e => {
                if (!e.alive) return
                ctx.fillStyle = e.type === 150 ? '#ffc700' : e.type === 80 ? '#00f0ff' : '#ff3366'
                ctx.beginPath()
                ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2)
                ctx.fill()
            })

            // Draw Bullets
            ctx.fillStyle = '#ffc700'
            bullets.forEach(b => {
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
