import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
}

const MAZE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,2,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,3,1,3,1,1,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,4,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,3,1,1,4,1,1,3,1,0,1,1,1,1],
    [3,3,3,3,0,3,3,1,4,4,4,1,3,3,0,3,3,3,3],
    [1,1,1,1,0,1,3,1,1,1,1,1,3,1,0,1,1,1,1],
    [3,3,3,1,0,1,3,3,3,3,3,3,3,1,0,1,3,3,3],
    [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
    [1,2,0,1,0,0,0,0,0,3,0,0,0,0,0,1,0,2,1],
    [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
    [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
]

const TILE_SIZE = 22

export const PacmanGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver }) => {
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
        let frightenedTimer = 0
        let invulnerableTimer = 0

        // Map copy
        let grid = MAZE.map(row => [...row])

        const resetPositions = () => {
            pacman.x = 9 * TILE_SIZE + TILE_SIZE / 2
            pacman.y = 14 * TILE_SIZE + TILE_SIZE / 2
            pacman.dx = 0
            pacman.dy = 0
            pacman.nextDx = 0
            pacman.nextDy = 0

            ghosts[0].x = 9 * TILE_SIZE + TILE_SIZE / 2; ghosts[0].y = 8 * TILE_SIZE + TILE_SIZE / 2; ghosts[0].dx = 2; ghosts[0].dy = 0
            ghosts[1].x = 8 * TILE_SIZE + TILE_SIZE / 2; ghosts[1].y = 10 * TILE_SIZE + TILE_SIZE / 2; ghosts[1].dx = -2; ghosts[1].dy = 0
            ghosts[2].x = 9 * TILE_SIZE + TILE_SIZE / 2; ghosts[2].y = 10 * TILE_SIZE + TILE_SIZE / 2; ghosts[2].dx = 0; ghosts[2].dy = -2
            ghosts[3].x = 10 * TILE_SIZE + TILE_SIZE / 2; ghosts[3].y = 10 * TILE_SIZE + TILE_SIZE / 2; ghosts[3].dx = 2; ghosts[3].dy = 0
        }

        // Player
        let pacman = { x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 14 * TILE_SIZE + TILE_SIZE / 2, dx: 0, dy: 0, nextDx: 0, nextDy: 0, radius: 9 }

        // Ghosts
        const ghosts = [
            { x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 8 * TILE_SIZE + TILE_SIZE / 2, color: '#ff0000', dx: 2, dy: 0, name: 'Blinky' },
            { x: 8 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE + TILE_SIZE / 2, color: '#ffb8ff', dx: -2, dy: 0, name: 'Pinky' },
            { x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE + TILE_SIZE / 2, color: '#00ffff', dx: 0, dy: -2, name: 'Inky' },
            { x: 10 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE + TILE_SIZE / 2, color: '#ffb852', dx: 2, dy: 0, name: 'Clyde' }
        ]

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { pacman.nextDx = -2; pacman.nextDy = 0 }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { pacman.nextDx = 2; pacman.nextDy = 0 }
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { pacman.nextDx = 0; pacman.nextDy = -2 }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { pacman.nextDx = 0; pacman.nextDy = 2 }
        }

        window.addEventListener('keydown', handleKeyDown)

        const canMove = (x: number, y: number, r: number = 8) => {
            const points = [
                { x: x - r, y: y - r },
                { x: x + r, y: y - r },
                { x: x - r, y: y + r },
                { x: x + r, y: y + r }
            ]
            for (const p of points) {
                const tx = Math.floor(p.x / TILE_SIZE)
                const ty = Math.floor(p.y / TILE_SIZE)
                if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) continue
                if (grid[ty][tx] === 1) return false
            }
            return true
        }

        const update = () => {
            if (isGameOver) return

            if (invulnerableTimer > 0) invulnerableTimer--

            // Try change direction
            if (pacman.nextDx !== 0 || pacman.nextDy !== 0) {
                if (canMove(pacman.x + pacman.nextDx, pacman.y + pacman.nextDy, pacman.radius - 1)) {
                    pacman.dx = pacman.nextDx
                    pacman.dy = pacman.nextDy
                }
            }

            // Move pacman
            if (canMove(pacman.x + pacman.dx, pacman.y + pacman.dy, pacman.radius - 1)) {
                pacman.x += pacman.dx
                pacman.y += pacman.dy
            }

            // Tunnel wraparound
            if (pacman.x < 0) pacman.x = canvas.width
            if (pacman.x > canvas.width) pacman.x = 0

            // Eat pellets
            const tileX = Math.floor(pacman.x / TILE_SIZE)
            const tileY = Math.floor(pacman.y / TILE_SIZE)
            if (tileY >= 0 && tileY < grid.length && tileX >= 0 && tileX < grid[0].length) {
                if (grid[tileY][tileX] === 0) {
                    grid[tileY][tileX] = 3
                    localScore += 10
                    setScore(localScore)
                } else if (grid[tileY][tileX] === 2) {
                    grid[tileY][tileX] = 3
                    localScore += 50
                    setScore(localScore)
                    frightenedTimer = 300 // 5 seconds
                }
            }

            // Check Stage Clear (All pellets eaten)
            let pelletsLeft = 0
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    if (grid[r][c] === 0 || grid[r][c] === 2) pelletsLeft++
                }
            }

            if (pelletsLeft === 0) {
                localLevel++
                setLevel(localLevel)
                localScore += 500
                setScore(localScore)
                grid = MAZE.map(row => [...row])
                resetPositions()
                invulnerableTimer = 60
                return
            }

            if (frightenedTimer > 0) frightenedTimer--

            // Update Ghosts
            ghosts.forEach(ghost => {
                const gSpeed = frightenedTimer > 0 ? 1 : 2
                const nextX = ghost.x + (ghost.dx > 0 ? gSpeed : ghost.dx < 0 ? -gSpeed : 0)
                const nextY = ghost.y + (ghost.dy > 0 ? gSpeed : ghost.dy < 0 ? -gSpeed : 0)

                if (!canMove(nextX, nextY, 7) || Math.random() < 0.03) {
                    const dirs = [
                        { dx: 2, dy: 0 },
                        { dx: -2, dy: 0 },
                        { dx: 0, dy: 2 },
                        { dx: 0, dy: -2 }
                    ]
                    const validDirs = dirs.filter(d => canMove(ghost.x + d.dx * 3, ghost.y + d.dy * 3, 7))
                    if (validDirs.length > 0) {
                        const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)]
                        ghost.dx = randomDir.dx
                        ghost.dy = randomDir.dy
                    }
                } else {
                    ghost.x = nextX
                    ghost.y = nextY
                }

                // Collision with Pacman
                if (invulnerableTimer <= 0) {
                    const dist = Math.hypot(pacman.x - ghost.x, pacman.y - ghost.y)
                    if (dist < pacman.radius + 7) {
                        if (frightenedTimer > 0) {
                            localScore += 200
                            setScore(localScore)
                            ghost.x = 9 * TILE_SIZE + TILE_SIZE / 2
                            ghost.y = 9 * TILE_SIZE + TILE_SIZE / 2
                        } else {
                            localLives--
                            setLives(localLives)
                            invulnerableTimer = 90
                            if (localLives <= 0) {
                                setIsGameOver(true)
                                onGameOver(localScore, localLevel)
                            } else {
                                resetPositions()
                            }
                        }
                    }
                }
            })
        }

        const draw = () => {
            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Draw Maze
            for (let r = 0; r < grid.length; r++) {
                for (let c = 0; c < grid[r].length; c++) {
                    const cell = grid[r][c]
                    if (cell === 1) {
                        ctx.fillStyle = '#1919b3'
                        ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                        ctx.strokeStyle = '#0000ff'
                        ctx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                    } else if (cell === 0) {
                        ctx.fillStyle = '#ffb8ae'
                        ctx.beginPath()
                        ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 3, 0, Math.PI * 2)
                        ctx.fill()
                    } else if (cell === 2) {
                        ctx.fillStyle = '#ffb8ae'
                        ctx.beginPath()
                        ctx.arc(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2, 7, 0, Math.PI * 2)
                        ctx.fill()
                    }
                }
            }

            // Draw Pacman (Flashing if invulnerable)
            if (invulnerableTimer === 0 || Math.floor(invulnerableTimer / 4) % 2 === 0) {
                ctx.fillStyle = '#ffff00'
                ctx.beginPath()
                const angle = (Math.sin(Date.now() / 80) + 1) * 0.15
                let rotation = 0
                if (pacman.dx > 0) rotation = 0
                if (pacman.dx < 0) rotation = Math.PI
                if (pacman.dy > 0) rotation = Math.PI / 2
                if (pacman.dy < 0) rotation = -Math.PI / 2

                ctx.arc(pacman.x, pacman.y, pacman.radius, rotation + angle, rotation + Math.PI * 2 - angle)
                ctx.lineTo(pacman.x, pacman.y)
                ctx.fill()
            }

            // Draw Ghosts
            ghosts.forEach(ghost => {
                ctx.fillStyle = frightenedTimer > 0 ? (frightenedTimer < 60 && Math.floor(frightenedTimer / 6) % 2 === 0 ? '#ffffff' : '#0000ff') : ghost.color
                ctx.beginPath()
                ctx.arc(ghost.x, ghost.y - 2, 8, Math.PI, 0, false)
                ctx.lineTo(ghost.x + 8, ghost.y + 8)
                ctx.lineTo(ghost.x - 8, ghost.y + 8)
                ctx.closePath()
                ctx.fill()

                ctx.fillStyle = '#fff'
                ctx.beginPath()
                ctx.arc(ghost.x - 3, ghost.y - 3, 2.5, 0, Math.PI * 2)
                ctx.arc(ghost.x + 3, ghost.y - 3, 2.5, 0, Math.PI * 2)
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
            cancelAnimationFrame(animationFrameId)
        }
    }, [isGameOver, onGameOver])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '418px', fontFamily: 'var(--font-pixel-ui)', color: '#00f0ff', fontSize: '13px' }}>
                <span>SCORE: {score}</span>
                <span>LIVES: {'💛'.repeat(lives)}</span>
                <span>STAGE: {level}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={418}
                height={440}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(0,240,255,0.4)', background: '#000' }}
            />
            {isGameOver && (
                <div style={{ color: '#ff3366', fontFamily: 'var(--font-pixel-title)', fontSize: '16px', marginTop: '10px' }}>
                    GAME OVER!
                </div>
            )}
        </div>
    )
}
