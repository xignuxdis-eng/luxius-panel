export interface HighScoreEntry {
    id: string
    gameId: string
    gameName: string
    username: string
    name: string
    score: number
    level: number
    date: string
}

const DEFAULT_SCORES: HighScoreEntry[] = [
    { id: '1', gameId: 'pacman', gameName: 'Pac-Man', username: 'adrian', name: 'ADRIAN (Admin)', score: 14500, level: 5, date: '2026-07-30' },
    { id: '2', gameId: 'spaceinvaders', gameName: 'Space Invaders', username: 'carlos', name: 'Carlos (Impresión)', score: 8900, level: 4, date: '2026-07-29' },
    { id: '3', gameId: 'galaga', gameName: 'Galaga', username: 'paola', name: 'Paola (Admin)', score: 18200, level: 6, date: '2026-07-31' },
    { id: '4', gameId: 'bomberman', gameName: 'Bomberman', username: 'diseño', name: 'Diseño (Artista)', score: 11200, level: 3, date: '2026-07-28' },
    { id: '5', gameId: 'digger', gameName: 'Digger', username: 'impresion', name: 'IMPRESION (Taller)', score: 9600, level: 4, date: '2026-07-27' },
    { id: '6', gameId: 'donkeykong', gameName: 'Donkey Kong', username: 'sistema', name: 'SISTEMA (Master)', score: 22400, level: 8, date: '2026-07-31' },
]

export function getHighScores(gameId?: string): HighScoreEntry[] {
    try {
        const saved = localStorage.getItem('luxius_arcade_high_scores')
        let scores: HighScoreEntry[] = saved ? JSON.parse(saved) : DEFAULT_SCORES
        if (gameId) {
            scores = scores.filter(s => s.gameId === gameId)
        }
        return scores.sort((a, b) => b.score - a.score)
    } catch {
        return DEFAULT_SCORES
    }
}

export function saveHighScore(gameId: string, gameName: string, username: string, name: string, score: number, level: number): boolean {
    if (score <= 0) return false

    const scores = getHighScores()
    const newEntry: HighScoreEntry = {
        id: Date.now().toString(),
        gameId,
        gameName,
        username,
        name: name || username,
        score,
        level,
        date: new Date().toISOString().split('T')[0]
    }

    scores.push(newEntry)
    scores.sort((a, b) => b.score - a.score)
    
    // Keep top 50 overall
    const topScores = scores.slice(0, 50)

    try {
        localStorage.setItem('luxius_arcade_high_scores', JSON.stringify(topScores))
    } catch (e) {
        console.error('Error saving high score:', e)
    }

    return true
}
