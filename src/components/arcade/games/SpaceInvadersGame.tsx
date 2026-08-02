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
        let invulnerableTimer = 0

        let player = { x: canvas.width / 2 - 15, y: canvas.height - 30, width: 30, height: 16, speed: 4 }
        let bullets: { x: number; y: number; dy: number; isPlayer: boolean }[] = []
        
        let ufo: { x: number; y: number; vx: number; value: number } | null = null
        let ufoTimer = 0

        // Protective Bunkers
        const createBunkers = () => {
            const list = []
            for (let b = 0; b < 4; b++) {
                const startX = 40 + b * 95
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 4; c++) {
                        list.push({ x: startX + c * 8, y: canvas.height - 75 + r * 6, w: 8, h: 6, hp: 3 })
                    }
                }
            }
            return list
        }
        let bunkers = createBunkers()

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
        let baseInvaderSpeed = 0.8

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
                const playerBullets = bullets.filter(b => b.isPlayer)
                if (playerBullets.length < 3) {
                    bullets.push({ x: player.x + player.width / 2 - 1.5, y: player.y, dy: -7, isPlayer: true })
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

            // Move Player
            if (keys['ArrowLeft'] || keys['KeyA']) player.x = Math.max(10, player.x - player.speed)
            if (keys['ArrowRight'] || keys['KeyD']) player.x = Math.min(canvas.width - player.width - 10, player.x + player.speed)

            // Spawn UFO Mystery Ship
            ufoTimer++
            if (!ufo && ufoTimer > 600) {
                ufoTimer = 0
                ufo = { x: -30, y: 20, vx: 2, value: 200 }
            }

            if (ufo) {
                ufo.x += ufo.vx
                if (ufo.x > canvas.width + 30) ufo = null
            }

            // Move Bullets & filter offscreen
            bullets = bullets.filter(b => {
                b.y += b.dy
                return b.y >= 0 && b.y <= canvas.height
            })

            // Check Wave Complete
            const aliveInvaders = invaders.filter(inv => inv.alive)
            if (aliveInvaders.length === 0) {
                localWave++
                setWave(localWave)
                invaders = createInvaders()
                bunkers = createBunkers()
                baseInvaderSpeed += 0.25
                invulnerableTimer = 60
                return
            }

            // Speed up invaders as they decrease
            const speedMultiplier = 1 + (40 - aliveInvaders.length) * 0.04
            const currentSpeed = baseInvaderSpeed * speedMultiplier

            let hitEdge = false
            aliveInvaders.forEach(inv => {
                inv.x += currentSpeed * invaderDir
                if (inv.x + inv.width >= canvas.width - 10 || inv.x <= 10) {
                    hitEdge = true
                }

                // Invader shoot
                if (Math.random() < 0.0015) {
                    bullets.push({ x: inv.x + inv.width / 2, y: inv.y + inv.height, dy: 4, isPlayer: false })
                }

                // Invader hits ground or player
                if (inv.y + inv.height >= player.y) {
                    setIsGameOver(true)
                    onGameOver(localScore, localWave)
                }
            })

            if (hitEdge) {
                invaderDir *= -1
                aliveInvaders.forEach(inv => { inv.y += 10 })
            }

            // Bullet collisions
            bullets = bullets.filter(b => {
                let hit = false

                // Check Bunker Hits
                bunkers.forEach(bk => {
                    if (bk.hp > 0 && b.x >= bk.x && b.x <= bk.x + bk.w && b.y >= bk.y && b.y <= bk.y + bk.h) {
                        bk.hp--
                        hit = true
                    }
                })
                if (hit) return false

                if (b.isPlayer) {
                    // Check hit UFO
                    if (ufo && b.x >= ufo.x && b.x <= ufo.x + 30 && b.y >= ufo.y && b.y <= ufo.y + 14) {
                        localScore += ufo.value
                        setScore(localScore)
                        ufo = null
                        return false
                    }

                    // Check hit Invaders
                    aliveInvaders.forEach(inv => {
                        if (inv.alive && b.x >= inv.x && b.x <= inv.x + inv.width && b.y >= inv.y && b.y <= inv.y + inv.height) {
                            inv.alive = false
                            hit = true
                            localScore += inv.type
                            setScore(localScore)
                        }
                    })
                    if (hit) return false
                } else {
                    // Enemy bullet hits Player Cannon
                    if (invulnerableTimer <= 0 && b.x >= player.x && b.x <= player.x + player.width && b.y >= player.y && b.y <= player.y + player.height) {
                        hit = true
                        localLives--
                        setLives(localLives)
                        invulnerableTimer = 90
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localWave)
                        }
                    }
                    if (hit) return false
                }
                return true
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

            // Draw Bunkers
            bunkers.forEach(bk => {
                if (bk.hp <= 0) return
                ctx.fillStyle = bk.hp === 3 ? '#00e676' : bk.hp === 2 ? '#ffc700' : '#ff3366'
                ctx.fillRect(bk.x, bk.y, bk.w, bk.h)
            })

            // Draw UFO
            if (ufo) {
                ctx.fillStyle = '#ff2a8d'
                ctx.fillRect(ufo.x, ufo.y, 30, 12)
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(ufo.x + 8, ufo.y + 2, 14, 4)
            }

            // Draw Player Cannon (Flashing if invulnerable)
            if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
                ctx.fillStyle = '#00f0ff'
                ctx.fillRect(player.x, player.y + 6, player.width, 10)
                ctx.fillRect(player.x + 10, player.y, 10, 6)
            }

            // Draw Invaders
            invaders.forEach(inv => {
                if (!inv.alive) return
                ctx.fillStyle = inv.type === 30 ? '#ff2a8d' : inv.type === 20 ? '#ffc700' : '#00e676'
                ctx.fillRect(inv.x, inv.y, inv.width, inv.height)
                
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
