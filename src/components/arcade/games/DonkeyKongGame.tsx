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
        let invulnerableTimer = 0

        let mario = {
            x: 30,
            y: canvas.height - 40,
            width: 20,
            height: 24,
            vx: 0,
            vy: 0,
            isJumping: false,
            isClimbing: false,
            facing: 'right' as 'left' | 'right'
        }

        let barrels: { x: number; y: number; vx: number; vy: number; radius: number }[] = []
        let barrelTimer = 0

        // Girders (Platforms) - Sloped slightly for classic arcade feel
        const platforms = [
            { x: 0, y: canvas.height - 14, w: canvas.width, h: 14, slope: 0 },
            { x: 30, y: 330, w: canvas.width - 30, h: 12, slope: -0.04 }, // Tier 1: slopes left
            { x: 0, y: 240, w: canvas.width - 30, h: 12, slope: 0.04 },  // Tier 2: slopes right
            { x: 30, y: 140, w: canvas.width - 30, h: 12, slope: -0.04 }, // Tier 3: slopes left
            { x: 100, y: 54, w: 140, h: 12, slope: 0 }                  // Pauline top platform
        ]

        // Ladders connecting tiers
        const ladders = [
            { x: 350, y: 316, h: 90 },
            { x: 50, y: 226, h: 90 },
            { x: 330, y: 126, h: 100 },
            { x: 140, y: 54, h: 72 }
        ]

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'KeyK') {
                if (!mario.isJumping && !mario.isClimbing) {
                    mario.vy = -7.2
                    mario.isJumping = true
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            keys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Helper to calculate platform Y at given X
        const getPlatformY = (plat: typeof platforms[0], x: number) => {
            return plat.y + (x - plat.x) * plat.slope
        }

        const update = () => {
            if (isGameOver) return

            if (invulnerableTimer > 0) invulnerableTimer--

            // Check Ladder Alignment
            let onLadder: typeof ladders[0] | null = null
            for (const l of ladders) {
                const cx = mario.x + mario.width / 2
                if (Math.abs(cx - (l.x + 7)) < 12 && mario.y + mario.height >= l.y - 4 && mario.y <= l.y + l.h + 4) {
                    onLadder = l
                    break
                }
            }

            // Climbing Controls
            const upPressed = keys['ArrowUp'] || keys['KeyW']
            const downPressed = keys['ArrowDown'] || keys['KeyS']

            if (onLadder && (upPressed || downPressed)) {
                mario.isClimbing = true
                mario.isJumping = false
                mario.vx = 0
                mario.vy = 0
                mario.x = onLadder.x + 7 - mario.width / 2
            } else if (!onLadder) {
                mario.isClimbing = false
            }

            if (mario.isClimbing) {
                if (upPressed) mario.y -= 2.5
                if (downPressed) mario.y += 2.5
            } else {
                // Horizontal Movement
                mario.vx = 0
                if (keys['ArrowLeft'] || keys['KeyA']) {
                    mario.vx = -3.2
                    mario.facing = 'left'
                }
                if (keys['ArrowRight'] || keys['KeyD']) {
                    mario.vx = 3.2
                    mario.facing = 'right'
                }

                mario.x += mario.vx
                mario.x = Math.max(0, Math.min(canvas.width - mario.width, mario.x))

                // Gravity & Falling
                mario.vy += 0.38
                mario.y += mario.vy

                // Platform Collisions
                for (const p of platforms) {
                    const cx = mario.x + mario.width / 2
                    if (cx >= p.x && cx <= p.x + p.w) {
                        const platY = getPlatformY(p, cx)
                        if (mario.y + mario.height >= platY && mario.y + mario.height <= platY + 12 && mario.vy >= 0) {
                            mario.y = platY - mario.height
                            mario.vy = 0
                            mario.isJumping = false
                            break
                        }
                    }
                }
            }

            // Check Win (Reach Top Pauline Platform)
            if (mario.y <= 56 && mario.x >= 100 && mario.x <= 220) {
                localScore += 1000 + localLevel * 200
                setScore(localScore)
                localLevel++
                setLevel(localLevel)
                mario.x = 30
                mario.y = canvas.height - 40
                mario.vy = 0
                mario.isClimbing = false
                barrels = []
                invulnerableTimer = 60
                return
            }

            // Spawn Barrels
            barrelTimer++
            if (barrelTimer > Math.max(60, 130 - localLevel * 15)) {
                barrelTimer = 0
                barrels.push({ x: 180, y: 50, vx: 2.5 + localLevel * 0.3, vy: 0, radius: 9 })
            }

            // Update Barrels safely
            const nextBarrels: typeof barrels = []
            for (const b of barrels) {
                b.vy += 0.35
                b.x += b.vx
                b.y += b.vy

                // Platform collision for barrels
                let grounded = false
                for (const p of platforms) {
                    if (b.x + b.radius >= p.x && b.x - b.radius <= p.x + p.w) {
                        const platY = getPlatformY(p, b.x)
                        if (b.y + b.radius >= platY && b.y + b.radius <= platY + 14 && b.vy >= 0) {
                            b.y = platY - b.radius
                            b.vy = 0
                            grounded = true
                            // Accelerate down platform slope
                            if (p.slope < 0 && b.vx > 0) b.vx = -Math.abs(b.vx)
                            if (p.slope > 0 && b.vx < 0) b.vx = Math.abs(b.vx)
                            break
                        }
                    }
                }

                // Reverse at canvas edges if grounded
                if (grounded && (b.x > canvas.width - 15 || b.x < 15)) {
                    b.vx = -b.vx
                }

                // Keep inside screen bounds / remove if off bottom
                if (b.y < canvas.height + 20) {
                    nextBarrels.push(b)
                }

                // Hit Mario collision check
                if (invulnerableTimer <= 0) {
                    const dx = (mario.x + mario.width / 2) - b.x
                    const dy = (mario.y + mario.height / 2) - b.y
                    const dist = Math.hypot(dx, dy)
                    if (dist < b.radius + 8) {
                        localLives--
                        setLives(localLives)
                        invulnerableTimer = 90 // 1.5 seconds of invulnerability
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localLevel)
                        } else {
                            mario.x = 30
                            mario.y = canvas.height - 40
                            mario.vy = 0
                            mario.isClimbing = false
                        }
                    }
                }
            }
            barrels = nextBarrels
        }

        const draw = () => {
            ctx.fillStyle = '#05020a'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Steel Girders with structural lines
            platforms.forEach(p => {
                ctx.fillStyle = '#ff2a8d'
                ctx.beginPath()
                const y1 = getPlatformY(p, p.x)
                const y2 = getPlatformY(p, p.x + p.w)
                ctx.moveTo(p.x, y1)
                ctx.lineTo(p.x + p.w, y2)
                ctx.lineTo(p.x + p.w, y2 + p.h)
                ctx.lineTo(p.x, y1 + p.h)
                ctx.closePath()
                ctx.fill()
                ctx.strokeStyle = '#ffc700'
                ctx.lineWidth = 1.5
                ctx.stroke()
            })

            // Draw Ladders
            ladders.forEach(l => {
                ctx.fillStyle = '#00f0ff'
                ctx.fillRect(l.x, l.y, 14, l.h)
                ctx.fillStyle = '#05020a'
                for (let ry = l.y + 6; ry < l.y + l.h; ry += 10) {
                    ctx.fillRect(l.x + 3, ry, 8, 4)
                }
            })

            // Draw Donkey Kong
            ctx.fillStyle = '#8b4513'
            ctx.fillRect(150, 20, 40, 34)
            ctx.fillStyle = '#ffc700'
            ctx.fillRect(160, 26, 20, 14)
            ctx.fillStyle = '#000'
            ctx.fillRect(164, 30, 4, 4)
            ctx.fillRect(172, 30, 4, 4)

            // Draw Pauline (Princess)
            ctx.fillStyle = '#ffb8ff'
            ctx.fillRect(115, 26, 18, 28)
            ctx.fillStyle = '#ffff00'
            ctx.fillRect(117, 20, 14, 8)

            // Draw Mario / Jumpman (Flashing if invulnerable)
            if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
                ctx.fillStyle = '#ff0000' // Cap & Shirt
                ctx.fillRect(mario.x, mario.y, mario.width, mario.height)
                ctx.fillStyle = '#00f0ff' // Overalls
                ctx.fillRect(mario.x + 2, mario.y + 10, mario.width - 4, 12)
                ctx.fillStyle = '#ffc700' // Face
                const faceX = mario.facing === 'right' ? mario.x + 10 : mario.x + 2
                ctx.fillRect(faceX, mario.y + 2, 8, 6)
            }

            // Draw Barrels
            barrels.forEach(b => {
                ctx.fillStyle = '#b85c14'
                ctx.beginPath()
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
                ctx.fill()
                ctx.strokeStyle = '#ffc700'
                ctx.lineWidth = 2
                ctx.stroke()
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
