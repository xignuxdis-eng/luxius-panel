import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
    pauseRef?: React.MutableRefObject<boolean>
}

const GRID_SIZE = 11
const TILE_SIZE = 38

export const BombermanGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver, pauseRef }) => {
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

        const buildGrid = () => {
            const map = []
            for (let r = 0; r < GRID_SIZE; r++) {
                const row = []
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (r === 0 || r === GRID_SIZE - 1 || c === 0 || c === GRID_SIZE - 1 || (r % 2 === 0 && c % 2 === 0)) {
                        row.push(1) // Solid Wall
                    } else if (Math.random() < 0.4 && !(r <= 2 && c <= 2)) {
                        row.push(2) // Destructible Brick
                    } else {
                        row.push(0) // Empty Floor
                    }
                }
                map.push(row)
            }
            return map
        }

        let map = buildGrid()
        const player = { x: TILE_SIZE + 5, y: TILE_SIZE + 5, size: 26, speed: 3, maxBombs: 2, bombRange: 2 }
        let bombs: { r: number; c: number; timer: number; range: number }[] = []
        let explosions: { r: number; c: number; timer: number }[] = []
        let powerups: { r: number; c: number; type: 'bomb' | 'speed' | 'range' }[] = []
        
        let enemies = [
            { x: 7 * TILE_SIZE + 5, y: 7 * TILE_SIZE + 5, dx: 2, dy: 0, alive: true },
            { x: 9 * TILE_SIZE + 5, y: 3 * TILE_SIZE + 5, dx: 0, dy: 2, alive: true },
            { x: 3 * TILE_SIZE + 5, y: 9 * TILE_SIZE + 5, dx: 2, dy: 0, alive: true }
        ]

        const keys: Record<string, boolean> = {}

        const handleKeyDown = (e: KeyboardEvent) => {
            keys[e.code] = true
            if (e.code === 'Space' || e.code === 'KeyB') {
                const r = Math.floor((player.y + player.size / 2) / TILE_SIZE)
                const c = Math.floor((player.x + player.size / 2) / TILE_SIZE)
                if (bombs.length < player.maxBombs && !bombs.some(b => b.r === r && b.c === c)) {
                    bombs.push({ r, c, timer: 110, range: player.bombRange })
                }
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            keys[e.code] = false
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        const canMoveTo = (x: number, y: number) => {
            const r1 = Math.floor((y + 3) / TILE_SIZE)
            const c1 = Math.floor((x + 3) / TILE_SIZE)
            const r2 = Math.floor((y + player.size - 3) / TILE_SIZE)
            const c2 = Math.floor((x + player.size - 3) / TILE_SIZE)

            if (r1 < 0 || r2 >= GRID_SIZE || c1 < 0 || c2 >= GRID_SIZE) return false
            if (map[r1][c1] !== 0 || map[r1][c2] !== 0 || map[r2][c1] !== 0 || map[r2][c2] !== 0) return false
            return true
        }

        const update = () => {
            if (isGameOver) return

            if (invulnerableTimer > 0) invulnerableTimer--

            // Move player: one axis at a time. If a wall blocks us but we are only slightly out of
            // line with the corridor, slide towards its centre (corner assist) instead of stopping dead.
            const left = keys['ArrowLeft'] || keys['KeyA']
            const right = keys['ArrowRight'] || keys['KeyD']
            const up = keys['ArrowUp'] || keys['KeyW']
            const down = keys['ArrowDown'] || keys['KeyS']
            const dirX = (right ? 1 : 0) - (left ? 1 : 0)
            const dirY = (down ? 1 : 0) - (up ? 1 : 0)
            const half = player.size / 2
            const assist = 12

            if (dirX !== 0 && dirY === 0) {
                const nx = player.x + dirX * player.speed
                if (canMoveTo(nx, player.y)) player.x = nx
                else {
                    const target = (Math.floor((player.y + half) / TILE_SIZE) + 0.5) * TILE_SIZE - half
                    const diff = target - player.y
                    if (Math.abs(diff) <= assist && canMoveTo(player.x + dirX * player.speed, target)) {
                        player.y += Math.sign(diff) * Math.min(Math.abs(diff), player.speed)
                    }
                }
            } else if (dirY !== 0 && dirX === 0) {
                const ny = player.y + dirY * player.speed
                if (canMoveTo(player.x, ny)) player.y = ny
                else {
                    const target = (Math.floor((player.x + half) / TILE_SIZE) + 0.5) * TILE_SIZE - half
                    const diff = target - player.x
                    if (Math.abs(diff) <= assist && canMoveTo(target, player.y + dirY * player.speed)) {
                        player.x += Math.sign(diff) * Math.min(Math.abs(diff), player.speed)
                    }
                }
            } else if (dirX !== 0 && dirY !== 0) {
                // Diagonal input: keep speed constant (no faster diagonal) and allow sliding on walls
                const s = player.speed * Math.SQRT1_2
                if (canMoveTo(player.x + dirX * s, player.y)) player.x += dirX * s
                if (canMoveTo(player.x, player.y + dirY * s)) player.y += dirY * s
            }

            // Collect Powerups
            const pr = Math.floor((player.y + player.size / 2) / TILE_SIZE)
            const pc = Math.floor((player.x + player.size / 2) / TILE_SIZE)
            powerups = powerups.filter(pw => {
                if (pw.r === pr && pw.c === pc) {
                    if (pw.type === 'bomb') player.maxBombs++
                    if (pw.type === 'speed') player.speed = Math.min(5, player.speed + 0.5)
                    if (pw.type === 'range') player.bombRange++
                    localScore += 200
                    setScore(localScore)
                    return false
                }
                return true
            })

            // Update Bombs safely
            const activeBombs: typeof bombs = []
            bombs.forEach(b => {
                b.timer--
                if (b.timer <= 0) {
                    // Detonate Bomb & Create Explosion cross
                    explosions.push({ r: b.r, c: b.c, timer: 25 })
                    const directions = [{ r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }]
                    
                    directions.forEach(d => {
                        for (let step = 1; step <= b.range; step++) {
                            const tr = b.r + d.r * step
                            const tc = b.c + d.c * step
                            if (tr < 0 || tr >= GRID_SIZE || tc < 0 || tc >= GRID_SIZE) break
                            
                            if (map[tr][tc] === 1) break // Stop at solid wall
                            
                            explosions.push({ r: tr, c: tc, timer: 25 })
                            // Chain reaction: other bombs caught in the blast go off right away
                            bombs.forEach(o => { if (o !== b && o.r === tr && o.c === tc) o.timer = Math.min(o.timer, 1) })

                            if (map[tr][tc] === 2) {
                                map[tr][tc] = 0 // Destroy brick
                                localScore += 100
                                setScore(localScore)

                                // Spawn random powerup
                                const rand = Math.random()
                                if (rand < 0.25) {
                                    const pType: 'bomb' | 'speed' | 'range' = rand < 0.1 ? 'bomb' : rand < 0.18 ? 'speed' : 'range'
                                    powerups.push({ r: tr, c: tc, type: pType })
                                }
                                break // Stop explosion after destroying brick
                            }
                        }
                    })
                } else {
                    activeBombs.push(b)
                }
            })
            bombs = activeBombs

            // Update Explosions safely
            explosions = explosions.filter(ex => {
                ex.timer--
                return ex.timer > 0
            })

            // Check Explosion hit Player
            if (invulnerableTimer <= 0) {
                const hitByExplosion = explosions.some(ex => ex.r === pr && ex.c === pc)
                if (hitByExplosion) {
                    localLives--
                    setLives(localLives)
                    invulnerableTimer = 90
                    if (localLives <= 0) {
                        setIsGameOver(true)
                        onGameOver(localScore, localStage)
                    } else {
                        player.x = TILE_SIZE + 5
                        player.y = TILE_SIZE + 5
                    }
                }
            }

            // Update Enemies safely & check explosion hit on enemies
            enemies.forEach(en => {
                if (!en.alive) return

                // Check hit by explosion
                const er = Math.floor((en.y + 14) / TILE_SIZE)
                const ec = Math.floor((en.x + 14) / TILE_SIZE)
                if (explosions.some(ex => ex.r === er && ex.c === ec)) {
                    en.alive = false
                    localScore += 300
                    setScore(localScore)
                    return
                }

                // Move Enemy (grid-aligned: enemies decide direction only when centred on a tile)
                const aligned = (en.x - 5) % TILE_SIZE === 0 && (en.y - 5) % TILE_SIZE === 0
                const open = (rr: number, cc: number) => rr >= 0 && rr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE && map[rr][cc] === 0
                if (aligned) {
                    const tr0 = Math.round((en.y - 5) / TILE_SIZE)
                    const tc0 = Math.round((en.x - 5) / TILE_SIZE)
                    if (map[tr0]?.[tc0] === 2) map[tr0][tc0] = 0 // never spawn embedded in a brick
                    const dirs = [{ dx: 2, dy: 0 }, { dx: -2, dy: 0 }, { dx: 0, dy: 2 }, { dx: 0, dy: -2 }]
                        .filter(d => open(tr0 + Math.sign(d.dy), tc0 + Math.sign(d.dx)))
                    const forward = dirs.some(d => d.dx === en.dx && d.dy === en.dy)
                    const noBack = dirs.filter(d => !(d.dx === -en.dx && d.dy === -en.dy))
                    if (dirs.length > 0 && (!forward || (noBack.length > 1 && Math.random() < 0.35))) {
                        const pool = noBack.length > 0 ? noBack : dirs
                        const pick = pool[Math.floor(Math.random() * pool.length)]
                        en.dx = pick.dx
                        en.dy = pick.dy
                    } else if (dirs.length === 0) {
                        en.dx = 0
                        en.dy = 0
                    }
                }
                en.x += en.dx
                en.y += en.dy

                // Hit Player
                if (invulnerableTimer <= 0) {
                    const dist = Math.hypot((player.x + 13) - (en.x + 14), (player.y + 13) - (en.y + 14))
                    if (dist < 22) {
                        localLives--
                        setLives(localLives)
                        invulnerableTimer = 90
                        if (localLives <= 0) {
                            setIsGameOver(true)
                            onGameOver(localScore, localStage)
                        } else {
                            player.x = TILE_SIZE + 5
                            player.y = TILE_SIZE + 5
                        }
                    }
                }
            })

            // Check Stage Clear (All enemies defeated)
            if (!enemies.some(e => e.alive)) {
                localStage++
                setStage(localStage)
                localScore += 500
                setScore(localScore)
                map = buildGrid()
                player.x = TILE_SIZE + 5
                player.y = TILE_SIZE + 5
                enemies = [
                    { x: 7 * TILE_SIZE + 5, y: 7 * TILE_SIZE + 5, dx: 2.2, dy: 0, alive: true },
                    { x: 9 * TILE_SIZE + 5, y: 3 * TILE_SIZE + 5, dx: 0, dy: 2.2, alive: true },
                    { x: 3 * TILE_SIZE + 5, y: 9 * TILE_SIZE + 5, dx: 2.2, dy: 0, alive: true }
                ]
            }
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
                        ctx.strokeStyle = '#111'
                        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    } else if (tile === 2) {
                        ctx.fillStyle = '#b85c14'
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                        ctx.strokeStyle = '#000'
                        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    }
                }
            }

            // Draw Powerups
            powerups.forEach(pw => {
                ctx.fillStyle = pw.type === 'bomb' ? '#ff3366' : pw.type === 'speed' ? '#00f0ff' : '#ffc700'
                ctx.beginPath()
                ctx.arc(pw.c * TILE_SIZE + TILE_SIZE / 2, pw.r * TILE_SIZE + TILE_SIZE / 2, 10, 0, Math.PI * 2)
                ctx.fill()
            })

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

            // Draw Player (Flashing if invulnerable)
            if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(player.x, player.y, player.size, player.size)
                ctx.fillStyle = '#ff2a8d'
                ctx.fillRect(player.x + 4, player.y + 4, player.size - 8, 8)
            }

            // Draw Enemies
            enemies.forEach(en => {
                if (!en.alive) return
                ctx.fillStyle = '#ff3366'
                ctx.beginPath()
                ctx.arc(en.x + 14, en.y + 14, 12, 0, Math.PI * 2)
                ctx.fill()
            })
        }

        // Fixed 60 Hz simulation step: game speed no longer depends on monitor refresh rate.
        const STEP = 1000 / 60
        let lastTs = 0
        let acc = 0
        const loop = (ts: number) => {
            acc += lastTs ? Math.min(ts - lastTs, 100) : STEP
            lastTs = ts
            while (acc >= STEP) {
                if (!pauseRef?.current) update()
                acc -= STEP
            }
            draw()
            animationFrameId = requestAnimationFrame(loop)
        }

        animationFrameId = requestAnimationFrame(loop)

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
