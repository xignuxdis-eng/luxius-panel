import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
}

export const SpaceInvadersGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [score, setScore] = useState(0)
    const [lives, setLives] = useState(3)
    const [wave, setWave] = useState(1)
    const [isGameOver, setIsGameOver] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let localScore = 0
        let localLives = 3
        let localWave = 1

        let player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 16, speed: 4, dx: 0 }
        let bullets: { x: number; y: number; dy: number; isPlayer: boolean }[] = []
        
        // Build Invaders
        const createInvaders = () => {
            const list = []
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 8; c++) {
                    list.push({
                        x: 35 + c * 42,
                        y: 40 + r * 30,
                        width: 26,
                        height: 20,
                        alive: true,
                        type: r === 0 ? 30 : r < 3 ? 20 : 10
                    })
                }
            }
            return list
        }

        let invaders = createInvaders()
        let invaderDir = 1
        let invaderSpeed = 0.8

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                // Shoot bullet if less than 3 active player bullets
                const playerBullets = bullets.filter(b => b.isPlayer)
                if (playerBullets.length < 3) {
                    bullets.push({ x: player.x + player.width / 2 - 2, y: player.y, dy: -6, isPlayer: true })
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

            // Move Player
            if (keys['ArrowLeft'] || keys['KeyA']) player.x = Math.max(10, player.x - player.speed)
            if (keys['ArrowRight'] || keys['KeyD']) player.x = Math.min(canvas.width - player.width - 10, player.x + player.speed)

            // Move Bullets
            bullets.forEach((b, idx) => {
                b.y += b.dy
                if (b.y < 0 || b.y > canvas.height) {
                    bullets.splice(idx, 1)
                }
            })

            // Move Invaders
            let hitEdge = false
            const aliveInvaders = invaders.filter(inv => inv.alive)

            if (aliveInvaders.length === 0) {
                // Next Wave
                localWave++
                setWave(localWave)
                invaders = createInvaders()
                invaderSpeed += 0.3
                return
            }

            aliveInvaders.forEach(inv => {
                inv.x += invaderSpeed * invaderDir
                if (inv.x + inv.width >= canvas.width - 10 || inv.x <= 10) {
                    hitEdge = true
                }

                // Random enemy shoot
                if (Math.random() < 0.001) {
                    bullets.push({ x: inv.x + inv.width / 2, y: inv.y + inv.height, dy: 4, isPlayer: false })
                }

                // Hit ground / player
                if (inv.y + inv.height >= player.y) {
                    setIsGameOver(true)
                    onGameOver(localScore, localWave)
                }
            })

            if (hitEdge) {
                invaderDir *= -1
                aliveInvaders.forEach(inv => { inv.y += 12 })
            }

            // Bullet collisions
            bullets.forEach((b, bIdx) => {
                if (b.isPlayer) {
                    aliveInvaders.forEach(inv => {
                        if (b.x >= inv.x && b.x <= inv.x + inv.width && b.y >= inv.y && b.y <= inv.y + inv.height) {
                            inv.alive = false
                            bullets.splice(bIdx, 1)
                            localScore += inv.type
                            setScore(localScore)
                        }
                    })
                } else {
                    // Enemy bullet hits player
                    if (b.x >= player.x && b.x <= player.x + player.width && b.y >= player.y && b.y <= player.y + player.height) {
                        bullets.splice(bIdx, 1)
                        localLives--
                        setLives(localLives)
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localWave)
                        }
                    }
                }
            })
        }

        const draw = () => {
            ctx.fillStyle = '#05030a'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Stars
            ctx.fillStyle = '#ffffff'
            for (let i = 0; i < 30; i++) {
                const sx = (i * 37) % canvas.width
                const sy = (i * 53 + Date.now() / 50) % canvas.height
                ctx.fillRect(sx, sy, 1.5, 1.5)
            }

            // Draw Player Cannon
            ctx.fillStyle = '#00f0ff'
            ctx.fillRect(player.x, player.y + 6, player.width, 10)
            ctx.fillRect(player.x + 10, player.y, 10, 6)

            // Draw Invaders
            invaders.forEach(inv => {
                if (!inv.alive) return
                ctx.fillStyle = inv.type === 30 ? '#ff2a8d' : inv.type === 20 ? '#ffc700' : '#00e676'
                ctx.fillRect(inv.x, inv.y, inv.width, inv.height)
                
                // Invader eyes
                ctx.fillStyle = '#000'
                ctx.fillRect(inv.x + 4, inv.y + 4, 4, 4)
                ctx.fillRect(inv.x + inv.width - 8, inv.y + 4, 4, 4)
            })

            // Draw Bullets
            bullets.forEach(b => {
                ctx.fillStyle = b.isPlayer ? '#00f0ff' : '#ff3366'
                ctx.fillRect(b.x, b.y, 3, 10)
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
                <span>CANNONS: {'🚀'.repeat(lives)}</span>
                <span>WAVE: {wave}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={418}
                height={440}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#05030a' }}
            />
            {isGameOver && (
                <div style={{ color: '#ff3366', fontFamily: 'var(--font-pixel-title)', fontSize: '16px', marginTop: '10px' }}>
                    DEFENSE FAILED - GAME OVER!
                </div>
            )}
        </div>
    )
}
