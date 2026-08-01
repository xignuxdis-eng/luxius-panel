import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
}

export const DonkeyKongGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [score, setScore] = useState(0)
    const [lives, setLives] = useState(3)
    const [level, setLevel] = useState(1)
    const [isGameOver, setIsGameOver] = useState(false)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationFrameId: number
        let localScore = 0
        let localLives = 3
        let localLevel = 1

        let mario = { x: 30, y: canvas.height - 40, width: 20, height: 26, vx: 0, vy: 0, isJumping: false, isClimbing: false }
        let barrels: { x: number; y: number; vx: number; vy: number; tier: number }[] = []
        let barrelTimer = 0

        // Girders (Platforms)
        const platforms = [
            { x: 0, y: canvas.height - 14, w: canvas.width, h: 14 },
            { x: 30, y: 320, w: canvas.width - 30, h: 12 },
            { x: 0, y: 220, w: canvas.width - 30, h: 12 },
            { x: 30, y: 120, w: canvas.width - 30, h: 12 },
            { x: 80, y: 50, w: 120, h: 12 } // Kong platform
        ]

        // Ladders
        const ladders = [
            { x: 340, y: 320, h: 86 },
            { x: 60, y: 220, h: 100 },
            { x: 320, y: 120, h: 100 },
            { x: 120, y: 50, h: 70 }
        ]

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !mario.isJumping) {
                mario.vy = -7.5
                mario.isJumping = true
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            keys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        const update = () => {
            if (isGameOver) return

            // Mario Horizontal Move
            mario.vx = 0
            if (keys['ArrowLeft'] || keys['KeyA']) mario.vx = -3.5
            if (keys['ArrowRight'] || keys['KeyD']) mario.vx = 3.5

            mario.x += mario.vx
            mario.x = Math.max(0, Math.min(canvas.width - mario.width, mario.x))

            // Gravity
            mario.vy += 0.4
            mario.y += mario.vy

            // Platform Collisions
            platforms.forEach(p => {
                if (mario.x + mario.width > p.x && mario.x < p.x + p.w && mario.y + mario.height >= p.y && mario.y + mario.height <= p.y + p.h + 10 && mario.vy >= 0) {
                    mario.y = p.y - mario.height
                    mario.vy = 0
                    mario.isJumping = false
                }
            })

            // Check Win (Reach Top Pauline Platform)
            if (mario.y <= 50 && mario.x >= 80 && mario.x <= 200) {
                localScore += 1000
                setScore(localScore)
                localLevel++
                setLevel(localLevel)
                mario.x = 30
                mario.y = canvas.height - 40
                barrels = []
                return
            }

            // Spawn Barrels
            barrelTimer++
            if (barrelTimer > 120 - Math.min(60, localLevel * 10)) {
                barrelTimer = 0
                barrels.push({ x: 180, y: 50, vx: 3.5, vy: 0, tier: 3 })
            }

            // Move Barrels
            barrels.forEach((b, idx) => {
                b.x += b.vx
                b.vy += 0.3
                b.y += b.vy

                platforms.forEach(p => {
                    if (b.x + 16 > p.x && b.x < p.x + p.w && b.y + 16 >= p.y && b.y + 16 <= p.y + p.h + 10 && b.vy >= 0) {
                        b.y = p.y - 16
                        b.vy = 0
                    }
                })

                // Reverse at edges
                if (b.x > canvas.width - 25 || b.x < 10) {
                    b.vx = -b.vx
                }

                if (b.y > canvas.height) {
                    barrels.splice(idx, 1)
                }

                // Hit Mario
                const dist = Math.hypot(mario.x + mario.width / 2 - (b.x + 8), mario.y + mario.height / 2 - (b.y + 8))
                if (dist < 18) {
                    localLives--
                    setLives(localLives)
                    if (localLives <= 0) {
                        setIsGameOver(true)
                        onGameOver(localScore, localLevel)
                    } else {
                        mario.x = 30
                        mario.y = canvas.height - 40
                        barrels = []
                    }
                }
            })
        }

        const draw = () => {
            ctx.fillStyle = '#05020a'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Steel Girders
            ctx.fillStyle = '#ff2a8d'
            platforms.forEach(p => {
                ctx.fillRect(p.x, p.y, p.w, p.h)
                ctx.strokeStyle = '#000'
                ctx.strokeRect(p.x, p.y, p.w, p.h)
            })

            // Draw Ladders
            ctx.fillStyle = '#00f0ff'
            ladders.forEach(l => {
                ctx.fillRect(l.x, l.y, 14, l.h)
            })

            // Draw Donkey Kong
            ctx.fillStyle = '#8b4513'
            ctx.fillRect(140, 18, 36, 32)
            ctx.fillStyle = '#ffc700'
            ctx.fillRect(150, 24, 16, 12)

            // Draw Pauline (Princess)
            ctx.fillStyle = '#ffb8ff'
            ctx.fillRect(100, 24, 16, 26)

            // Draw Mario / Jumpman
            ctx.fillStyle = '#ff0000'
            ctx.fillRect(mario.x, mario.y, mario.width, mario.height)
            ctx.fillStyle = '#0000ff'
            ctx.fillRect(mario.x + 2, mario.y + 12, mario.width - 4, 12)

            // Draw Barrels
            ctx.fillStyle = '#b85c14'
            barrels.forEach(b => {
                ctx.beginPath()
                ctx.arc(b.x + 8, b.y + 8, 8, 0, Math.PI * 2)
                ctx.fill()
                ctx.strokeStyle = '#ffc700'
                ctx.strokeRect(b.x, b.y, 16, 16)
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
                <span>MARIOS: {'👨‍🔧'.repeat(lives)}</span>
                <span>LEVEL: {level}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={418}
                height={440}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#05020a' }}
            />
            {isGameOver && (
                <div style={{ color: '#ff3366', fontFamily: 'var(--font-pixel-title)', fontSize: '16px', marginTop: '10px' }}>
                    BARREL CRASH - GAME OVER!
                </div>
            )}
        </div>
    )
}
