import React, { useEffect, useRef, useState } from 'react'

interface GameProps {
    username: string
    name: string
    onGameOver: (score: number, level: number) => void
    pauseRef?: React.MutableRefObject<boolean>
}

const COLS = 10
const ROWS = 20
const CELL = 22
const BOARD_X = 14
const BOARD_Y = 0
const W = 418
const H = ROWS * CELL // 440

type Matrix = number[][]

// Piece index 1..7 -> color. Shapes are defined in their spawn orientation.
const PIECES: { color: string; shape: Matrix }[] = [
    { color: '#00f0ff', shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] }, // I
    { color: '#ffc700', shape: [[1, 1], [1, 1]] }, // O
    { color: '#b44bff', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] }, // T
    { color: '#00e676', shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] }, // S
    { color: '#ff3366', shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] }, // Z
    { color: '#3d5afe', shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] }, // J
    { color: '#ff7700', shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] }, // L
]

const rotateCW = (m: Matrix): Matrix => m[0].map((_, c) => m.map(row => row[c]).reverse())
const rotateCCW = (m: Matrix): Matrix => m[0].map((_, c) => m.map(row => row[row.length - 1 - c]))

interface Piece { id: number; shape: Matrix; x: number; y: number }

export const TetrisGame: React.FC<GameProps> = ({ username: _username, name: _name, onGameOver, pauseRef }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [score, setScore] = useState(0)
    const [lines, setLines] = useState(0)
    const [level, setLevel] = useState(1)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let raf = 0
        let over = false
        let localScore = 0
        let localLines = 0
        let localLevel = 1
        let dropAcc = 0
        let lastTs = 0
        let flashRows: number[] = []
        let flashTimer = 0

        const board: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
        let bag: number[] = []
        const nextId = () => {
            if (bag.length === 0) {
                bag = [1, 2, 3, 4, 5, 6, 7]
                for (let i = bag.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [bag[i], bag[j]] = [bag[j], bag[i]]
                }
            }
            return bag.pop() as number
        }

        const makePiece = (id: number): Piece => {
            const shape = PIECES[id - 1].shape.map(r => [...r])
            return { id, shape, x: Math.floor((COLS - shape[0].length) / 2), y: id === 1 ? -1 : 0 }
        }

        const collides = (shape: Matrix, px: number, py: number) => {
            for (let r = 0; r < shape.length; r++) {
                for (let c = 0; c < shape[r].length; c++) {
                    if (!shape[r][c]) continue
                    const x = px + c
                    const y = py + r
                    if (x < 0 || x >= COLS || y >= ROWS) return true
                    if (y >= 0 && board[y][x]) return true
                }
            }
            return false
        }

        let nextQueue = nextId()
        let piece = makePiece(nextId())
        const spawn = () => {
            piece = makePiece(nextQueue)
            nextQueue = nextId()
            if (collides(piece.shape, piece.x, piece.y)) {
                over = true
                onGameOver(localScore, localLevel)
            }
        }

        const gravityMs = () => Math.max(70, 800 - (localLevel - 1) * 70)

        const lock = () => {
            piece.shape.forEach((row, r) => row.forEach((v, c) => {
                if (v && piece.y + r >= 0) board[piece.y + r][piece.x + c] = piece.id
            }))
            const full: number[] = []
            for (let r = 0; r < ROWS; r++) if (board[r].every(v => v)) full.push(r)
            if (full.length) {
                const pts = [0, 100, 300, 500, 800][full.length] * localLevel
                localScore += pts
                localLines += full.length
                localLevel = Math.floor(localLines / 10) + 1
                setScore(localScore)
                setLines(localLines)
                setLevel(localLevel)
                flashRows = full
                flashTimer = 180 // ms of flash before rows collapse
                piece = { id: 0, shape: [[0]], x: -5, y: -5 }
            } else {
                spawn()
            }
        }

        const collapse = () => {
            const kept = board.filter((_, r) => !flashRows.includes(r))
            while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0))
            for (let r = 0; r < ROWS; r++) board[r] = kept[r]
            flashRows = []
            spawn()
        }

        const move = (dx: number, dy: number) => {
            if (!collides(piece.shape, piece.x + dx, piece.y + dy)) {
                piece.x += dx
                piece.y += dy
                return true
            }
            return false
        }

        const rotate = (cw: boolean) => {
            if (piece.id === 2) return
            const rotated = cw ? rotateCW(piece.shape) : rotateCCW(piece.shape)
            for (const kick of [0, -1, 1, -2, 2]) {
                if (!collides(rotated, piece.x + kick, piece.y)) {
                    piece.shape = rotated
                    piece.x += kick
                    return
                }
            }
        }

        const hardDrop = () => {
            let dist = 0
            while (move(0, 1)) dist++
            localScore += dist * 2
            setScore(localScore)
            lock()
            dropAcc = 0
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (over || (pauseRef && pauseRef.current) || flashRows.length) return
            switch (e.code) {
                case 'ArrowLeft': case 'KeyA': move(-1, 0); break
                case 'ArrowRight': case 'KeyD': move(1, 0); break
                case 'ArrowDown': case 'KeyS':
                    if (move(0, 1)) { localScore += 1; setScore(localScore) } else if (!e.repeat) lock()
                    dropAcc = 0
                    break
                case 'ArrowUp': case 'KeyW': case 'KeyX': if (!e.repeat) rotate(true); break
                case 'KeyZ': if (!e.repeat) rotate(false); break
                case 'Space': if (!e.repeat) hardDrop(); break
            }
        }
        window.addEventListener('keydown', handleKeyDown)

        const drawCell = (x: number, y: number, color: string, alpha = 1) => {
            ctx.globalAlpha = alpha
            ctx.fillStyle = color
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2)
            ctx.fillStyle = 'rgba(255,255,255,0.28)'
            ctx.fillRect(x + 1, y + 1, CELL - 2, 4)
            ctx.fillStyle = 'rgba(0,0,0,0.25)'
            ctx.fillRect(x + 1, y + CELL - 5, CELL - 2, 4)
            ctx.globalAlpha = 1
        }

        const drawMini = (id: number, ox: number, oy: number) => {
            const p = PIECES[id - 1]
            const size = 16
            const trimmed = p.shape.filter(row => row.some(v => v))
            trimmed.forEach((row, r) => row.forEach((v, c) => {
                if (!v) return
                ctx.fillStyle = p.color
                ctx.fillRect(ox + c * size, oy + r * size, size - 2, size - 2)
            }))
        }

        const draw = () => {
            ctx.fillStyle = '#05030f'
            ctx.fillRect(0, 0, W, H)

            // Board background + grid
            ctx.fillStyle = '#0b0820'
            ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL)
            ctx.strokeStyle = 'rgba(255,255,255,0.05)'
            ctx.lineWidth = 1
            for (let c = 0; c <= COLS; c++) {
                ctx.beginPath(); ctx.moveTo(BOARD_X + c * CELL + 0.5, BOARD_Y); ctx.lineTo(BOARD_X + c * CELL + 0.5, BOARD_Y + H); ctx.stroke()
            }
            for (let r = 0; r <= ROWS; r++) {
                ctx.beginPath(); ctx.moveTo(BOARD_X, BOARD_Y + r * CELL + 0.5); ctx.lineTo(BOARD_X + COLS * CELL, BOARD_Y + r * CELL + 0.5); ctx.stroke()
            }

            // Locked cells
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const id = board[r][c]
                    if (!id) continue
                    const flashing = flashRows.includes(r)
                    drawCell(BOARD_X + c * CELL, BOARD_Y + r * CELL, flashing ? '#ffffff' : PIECES[id - 1].color)
                }
            }

            if (piece.id && !over) {
                // Ghost
                let gy = piece.y
                while (!collides(piece.shape, piece.x, gy + 1)) gy++
                piece.shape.forEach((row, r) => row.forEach((v, c) => {
                    if (v && gy + r >= 0) drawCell(BOARD_X + (piece.x + c) * CELL, BOARD_Y + (gy + r) * CELL, PIECES[piece.id - 1].color, 0.22)
                }))
                // Active piece
                piece.shape.forEach((row, r) => row.forEach((v, c) => {
                    if (v && piece.y + r >= 0) drawCell(BOARD_X + (piece.x + c) * CELL, BOARD_Y + (piece.y + r) * CELL, PIECES[piece.id - 1].color)
                }))
            }

            ctx.strokeStyle = '#b44bff'
            ctx.lineWidth = 2
            ctx.strokeRect(BOARD_X - 1, BOARD_Y + 1, COLS * CELL + 2, ROWS * CELL - 2)

            // Side panel
            const px = BOARD_X + COLS * CELL + 24
            ctx.fillStyle = '#ffc700'
            ctx.font = '12px monospace'
            ctx.fillText('SIGUIENTE', px, 22)
            ctx.strokeStyle = '#2a2250'
            ctx.strokeRect(px, 32, 90, 72)
            drawMini(nextQueue, px + 12, 44)

            ctx.fillStyle = '#e0e0e0'
            ctx.fillText('NIVEL', px, 140)
            ctx.fillText('LÍNEAS', px, 190)
            ctx.fillStyle = '#00f0ff'
            ctx.font = '20px monospace'
            ctx.fillText(String(localLevel), px, 164)
            ctx.fillText(String(localLines), px, 214)
            ctx.font = '11px monospace'
            ctx.fillStyle = '#7a7aa0'
            ;['← → mover', '↑ girar', '↓ bajar', 'Espacio: caída', 'Z: girar ←'].forEach((t, i) => ctx.fillText(t, px, 270 + i * 16))
        }

        const loop = (ts: number) => {
            const dt = lastTs ? Math.min(ts - lastTs, 100) : 0
            lastTs = ts
            if (!over && !(pauseRef && pauseRef.current)) {
                if (flashRows.length) {
                    flashTimer -= dt
                    if (flashTimer <= 0) collapse()
                } else {
                    dropAcc += dt
                    if (dropAcc >= gravityMs()) {
                        dropAcc = 0
                        if (!move(0, 1)) lock()
                    }
                }
            }
            draw()
            raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            cancelAnimationFrame(raf)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onGameOver])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: `${W}px`, fontFamily: 'var(--font-pixel-ui)', color: '#b44bff', fontSize: '13px' }}>
                <span>SCORE: {score}</span>
                <span>LÍNEAS: {lines}</span>
                <span>NIVEL: {level}</span>
            </div>
            <canvas
                ref={canvasRef}
                width={W}
                height={H}
                style={{ border: '4px solid #000', boxShadow: '0 0 10px rgba(180,75,255,0.45)', background: '#05030f' }}
            />
        </div>
    )
}
