import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
    pauseRef?: React.MutableRefObject<boolean>
}

const W = 418
const H = 440
const BRICK_COLS = 10
const BRICK_W = 38
const BRICK_H = 16
const BRICK_OFFSET_X = (W - BRICK_COLS * BRICK_W) / 2 // 19
const BRICK_OFFSET_Y = 40
const PADDLE_H = 12
const PADDLE_Y = H - 30
const BALL_R = 5
const BASE_PADDLE_W = 70
const WIDE_PADDLE_W = 110

interface Brick { x: number; y: number; hp: number; maxHp: number; color: string; points: number }
interface Ball { x: number; y: number; vx: number; vy: number }
interface Capsule { x: number; y: number; kind: 'wide' | 'multi' | 'life' | 'slow' }

const ROW_COLORS = ['#ff3366', '#ff7700', '#ffc700', '#00e676', '#00f0ff', '#3d5afe', '#b44bff']
const CAPSULE_INFO: Record<Capsule['kind'], { label: string; color: string }> = {
    wide: { label: 'W', color: '#3d5afe' },
    multi: { label: 'M', color: '#ff2a8d' },
    life: { label: '♥', color: '#00e676' },
    slow: { label: 'S', color: '#ffc700' },
}

// Level layouts: '.' empty, digits = row color index, '#' = armored (2 hits, 3 later).
const LAYOUTS: string[][] = [
    ['0000000000', '1111111111', '2222222222', '3333333333', '4444444444'],
    ['.0.0.0.0.0', '1.1.1.1.1.', '.2.2.2.2.2', '3.3.3.3.3.', '.4.4.4.4.4', '5.5.5.5.5.'],
    ['##########', '1111111111', '2222222222', '3333333333', '##########', '5555555555'],
    ['....00....', '...1111...', '..222222..', '.33333333.', '4444444444', '#.#.#.#.#.', '.#.#.#.#.#'],
    ['#0#0#0#0#0', '1#1#1#1#1#', '#2#2#2#2#2', '3#3#3#3#3#', '#4#4#4#4#4', '5#5#5#5#5#'],
]

const buildBricks = (level: number): Brick[] => {
    const layout = LAYOUTS[(level - 1) % LAYOUTS.length]
    const bricks: Brick[] = []
    layout.forEach((row, r) => {
        for (let c = 0; c < BRICK_COLS; c++) {
            const ch = row[c]
            if (ch === '.') continue
            const armored = ch === '#'
            const hp = armored ? (level > LAYOUTS.length ? 3 : 2) : 1
            const idx = armored ? 0 : Number(ch)
            bricks.push({
                x: BRICK_OFFSET_X + c * BRICK_W,
                y: BRICK_OFFSET_Y + r * BRICK_H,
                hp,
                maxHp: hp,
                color: armored ? '#b8c0cc' : ROW_COLORS[idx % ROW_COLORS.length],
                points: armored ? 120 : 50 + (6 - idx) * 10,
            })
        }
    })
    return bricks
}

export const ArkanoidGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver, pauseRef }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [score, setScore] = useState(0)
    const [lives, setLives] = useState(3)
    const [stage, setStage] = useState(1)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let raf = 0
        let over = false
        let localScore = 0
        let localLives = 3
        let localStage = 1
        let lastTs = 0
        let wideTimer = 0
        let slowTimer = 0
        let banner = 'Pulsa ESPACIO para lanzar'
        let bannerTimer = 0

        const paddle = { x: W / 2 - BASE_PADDLE_W / 2, w: BASE_PADDLE_W }
        let bricks = buildBricks(1)
        let balls: Ball[] = []
        let capsules: Capsule[] = []
        let launched = false
        const keys: Record<string, boolean> = {}

        const baseSpeed = () => 4.2 + (localStage - 1) * 0.35

        const resetBall = () => {
            launched = false
            balls = [{ x: paddle.x + paddle.w / 2, y: PADDLE_Y - BALL_R - 1, vx: 0, vy: 0 }]
        }
        resetBall()

        const launch = () => {
            if (launched || over) return
            launched = true
            const speed = baseSpeed()
            const angle = (-Math.PI / 2) + (Math.random() * 0.6 - 0.3)
            balls[0].vx = Math.cos(angle) * speed
            balls[0].vy = Math.sin(angle) * speed
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (pauseRef && pauseRef.current) return
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') launch()
        }
        const handleKeyUp = (e: KeyboardEvent) => { keys[e.code] = false }
        const handleMouse = (e: MouseEvent) => {
            if (pauseRef && pauseRef.current) return
            const rect = canvas.getBoundingClientRect()
            const mx = (e.clientX - rect.left) * (W / rect.width)
            paddle.x = Math.max(0, Math.min(W - paddle.w, mx - paddle.w / 2))
        }
        const handleClick = () => { if (!(pauseRef && pauseRef.current)) launch() }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        canvas.addEventListener('mousemove', handleMouse)
        canvas.addEventListener('mousedown', handleClick)

        const addScore = (n: number) => { localScore += n; setScore(localScore) }

        const maybeDropCapsule = (b: Brick) => {
            if (Math.random() > 0.18) return
            const r = Math.random()
            const kind: Capsule['kind'] = r < 0.35 ? 'wide' : r < 0.65 ? 'multi' : r < 0.85 ? 'slow' : 'life'
            capsules.push({ x: b.x + BRICK_W / 2, y: b.y + BRICK_H, kind })
        }

        const loseLife = () => {
            localLives--
            setLives(localLives)
            capsules = []
            wideTimer = 0
            slowTimer = 0
            paddle.w = BASE_PADDLE_W
            if (localLives <= 0) {
                over = true
                onGameOver(localScore, localStage)
            } else {
                resetBall()
                banner = 'Pulsa ESPACIO para lanzar'
                bannerTimer = 0
            }
        }

        const nextLevel = () => {
            localStage++
            setStage(localStage)
            bricks = buildBricks(localStage)
            capsules = []
            paddle.w = BASE_PADDLE_W
            wideTimer = 0
            slowTimer = 0
            resetBall()
            banner = `NIVEL ${localStage} — ESPACIO para lanzar`
            bannerTimer = 0
        }

        const hitBrick = (b: Brick) => {
            b.hp--
            if (b.hp <= 0) {
                addScore(b.points)
                maybeDropCapsule(b)
                bricks = bricks.filter(x => x !== b)
            } else {
                addScore(10)
            }
        }

        const brickAt = (x: number, y: number): Brick | undefined =>
            bricks.find(b => x + BALL_R > b.x && x - BALL_R < b.x + BRICK_W && y + BALL_R > b.y && y - BALL_R < b.y + BRICK_H)

        const clampSpeed = (ball: Ball) => {
            const target = baseSpeed() * (slowTimer > 0 ? 0.7 : 1)
            const cur = Math.hypot(ball.vx, ball.vy) || 1
            ball.vx = ball.vx / cur * target
            ball.vy = ball.vy / cur * target
            // Never allow a near-horizontal ball (would stall the game)
            if (Math.abs(ball.vy) < target * 0.25) {
                ball.vy = (ball.vy >= 0 ? 1 : -1) * target * 0.25
                const rest = Math.sqrt(Math.max(0, target * target - ball.vy * ball.vy))
                ball.vx = (ball.vx >= 0 ? 1 : -1) * rest
            }
        }

        const stepBall = (ball: Ball, f: number) => {
            const steps = 2
            for (let s = 0; s < steps; s++) {
                ball.x += (ball.vx * f) / steps
                const bx = brickAt(ball.x, ball.y)
                if (bx) { ball.vx = -ball.vx; ball.x += (ball.vx * f) / steps * 1.5; hitBrick(bx) }

                ball.y += (ball.vy * f) / steps
                const by = brickAt(ball.x, ball.y)
                if (by) { ball.vy = -ball.vy; ball.y += (ball.vy * f) / steps * 1.5; hitBrick(by) }

                if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) }
                if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) }
                if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy) }

                // Paddle
                if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y - BALL_R <= PADDLE_Y + PADDLE_H &&
                    ball.x >= paddle.x - BALL_R && ball.x <= paddle.x + paddle.w + BALL_R) {
                    const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2) // -1..1
                    const angle = rel * (Math.PI / 3) // max 60°
                    const speed = Math.hypot(ball.vx, ball.vy)
                    ball.vx = Math.sin(angle) * speed
                    ball.vy = -Math.cos(angle) * speed
                    ball.y = PADDLE_Y - BALL_R - 0.5
                }
            }
            clampSpeed(ball)
        }

        const update = (dt: number) => {
            const f = Math.min(dt / 16.667, 2.5)
            const pSpeed = 7 * f
            if (keys['ArrowLeft'] || keys['KeyA']) paddle.x -= pSpeed
            if (keys['ArrowRight'] || keys['KeyD']) paddle.x += pSpeed
            paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))

            if (wideTimer > 0) { wideTimer -= dt; if (wideTimer <= 0) paddle.w = BASE_PADDLE_W } 
            if (slowTimer > 0) slowTimer -= dt
            if (bannerTimer > 0) bannerTimer -= dt

            if (!launched) {
                balls[0].x = paddle.x + paddle.w / 2
                balls[0].y = PADDLE_Y - BALL_R - 1
            } else {
                balls.forEach(b => stepBall(b, f))
                balls = balls.filter(b => b.y - BALL_R <= H)
                if (balls.length === 0) loseLife()
            }

            // Capsules
            capsules.forEach(c => { c.y += 2.2 * f })
            capsules = capsules.filter(c => {
                const caught = c.y + 8 >= PADDLE_Y && c.y - 8 <= PADDLE_Y + PADDLE_H && c.x >= paddle.x - 8 && c.x <= paddle.x + paddle.w + 8
                if (caught) {
                    addScore(100)
                    if (c.kind === 'wide') { paddle.w = WIDE_PADDLE_W; wideTimer = 12000; banner = 'PALA ANCHA'; bannerTimer = 1200 }
                    else if (c.kind === 'slow') { slowTimer = 8000; banner = 'BOLA LENTA'; bannerTimer = 1200 }
                    else if (c.kind === 'life') { localLives = Math.min(localLives + 1, 6); setLives(localLives); banner = '+1 VIDA'; bannerTimer = 1200 }
                    else if (c.kind === 'multi' && launched && balls.length) {
                        const src = balls[0]
                        balls.push({ x: src.x, y: src.y, vx: -src.vx, vy: src.vy }, { x: src.x, y: src.y, vx: src.vx * 0.6, vy: -Math.abs(src.vy) })
                        banner = 'MULTIBOLA'; bannerTimer = 1200
                    }
                    return false
                }
                return c.y - 8 <= H
            })

            if (!over && bricks.length === 0) nextLevel()
        }

        const draw = () => {
            const g = ctx.createLinearGradient(0, 0, 0, H)
            g.addColorStop(0, '#07051a')
            g.addColorStop(1, '#120a2e')
            ctx.fillStyle = g
            ctx.fillRect(0, 0, W, H)

            // Bricks
            bricks.forEach(b => {
                ctx.fillStyle = b.color
                ctx.fillRect(b.x + 1, b.y + 1, BRICK_W - 2, BRICK_H - 2)
                ctx.fillStyle = 'rgba(255,255,255,0.3)'
                ctx.fillRect(b.x + 1, b.y + 1, BRICK_W - 2, 3)
                ctx.fillStyle = 'rgba(0,0,0,0.25)'
                ctx.fillRect(b.x + 1, b.y + BRICK_H - 4, BRICK_W - 2, 3)
                if (b.maxHp > 1 && b.hp < b.maxHp) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
                    ctx.beginPath(); ctx.moveTo(b.x + 6, b.y + 3); ctx.lineTo(b.x + 16, b.y + 12); ctx.lineTo(b.x + 24, b.y + 5); ctx.stroke()
                }
            })

            // Capsules
            capsules.forEach(c => {
                const info = CAPSULE_INFO[c.kind]
                ctx.fillStyle = info.color
                ctx.fillRect(c.x - 12, c.y - 7, 24, 14)
                ctx.fillStyle = '#fff'
                ctx.font = 'bold 11px monospace'
                ctx.textAlign = 'center'
                ctx.fillText(info.label, c.x, c.y + 4)
            })

            // Paddle
            ctx.fillStyle = wideTimer > 0 ? '#3d5afe' : '#00f0ff'
            ctx.fillRect(paddle.x, PADDLE_Y, paddle.w, PADDLE_H)
            ctx.fillStyle = '#ff2a8d'
            ctx.fillRect(paddle.x, PADDLE_Y, 8, PADDLE_H)
            ctx.fillRect(paddle.x + paddle.w - 8, PADDLE_Y, 8, PADDLE_H)

            // Balls
            balls.forEach(b => {
                ctx.fillStyle = '#ffffff'
                ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill()
            })

            // HUD hints
            ctx.textAlign = 'center'
            if (!launched && !over) {
                ctx.fillStyle = '#ffc700'
                ctx.font = '13px monospace'
                ctx.fillText(banner, W / 2, H / 2 + 60)
            } else if (bannerTimer > 0) {
                ctx.fillStyle = '#00f0ff'
                ctx.font = '13px monospace'
                ctx.fillText(banner, W / 2, H / 2 + 60)
            }
            ctx.textAlign = 'start'
        }

        const loop = (ts: number) => {
            const dt = lastTs ? Math.min(ts - lastTs, 100) : 0
            lastTs = ts
            if (!over && !(pauseRef && pauseRef.current)) update(dt)
            draw()
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            canvas.removeEventListener('mousemove', handleMouse)
            canvas.removeEventListener('mousedown', handleClick)
            cancelAnimationFrame(raf)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onGameOver])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: `${W}px`, fontFamily: 'var(--font-pixel-ui)', color: '#00f0ff', fontSize: '13px' }}>
                <span>SCORE: {score}</span>
                <span>VIDAS: {'❤️'.repeat(lives)}</span>
                <span>NIVEL: {stage}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#07051a', cursor: 'none' }}
            />
        </div>
    )
}
