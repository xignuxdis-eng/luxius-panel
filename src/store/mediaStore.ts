import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MediaTrack {
    id: string
    title: string
    artist?: string
    src: string // File URL or web URL
    type: 'audio' | 'video'
    duration?: number
}

interface MediaState {
    // Queue
    queue: MediaTrack[]
    currentIndex: number

    // Playback state
    isPlaying: boolean
    volume: number
    currentTime: number
    duration: number
    repeat: 'none' | 'one' | 'all'
    shuffle: boolean

    // Actions
    addTrack: (track: MediaTrack) => void
    removeTrack: (id: string) => void
    clearQueue: () => void

    play: () => void
    pause: () => void
    togglePlay: () => void

    next: () => void
    previous: () => void
    goToTrack: (index: number) => void

    setVolume: (volume: number) => void
    setCurrentTime: (time: number) => void
    setDuration: (duration: number) => void

    toggleRepeat: () => void
    toggleShuffle: () => void
}

export const useMediaStore = create<MediaState>()(
    persist(
        (set) => ({
            // Initial state
            queue: [],
            currentIndex: 0,
            isPlaying: false,
            volume: 0.7,
            currentTime: 0,
            duration: 0,
            repeat: 'none',
            shuffle: false,

            // Queue actions
            addTrack: (track) => set((state) => ({
                queue: [...state.queue, track]
            })),

            removeTrack: (id) => set((state) => {
                const newQueue = state.queue.filter(t => t.id !== id)
                const currentTrack = state.queue[state.currentIndex]
                let newIndex = state.currentIndex

                if (currentTrack?.id === id) {
                    // Current track removed, stay at same index or go to 0
                    newIndex = Math.min(state.currentIndex, newQueue.length - 1)
                    if (newIndex < 0) newIndex = 0
                } else {
                    // Recalculate index
                    newIndex = newQueue.findIndex(t => t.id === currentTrack?.id)
                    if (newIndex < 0) newIndex = 0
                }

                return { queue: newQueue, currentIndex: newIndex }
            }),

            clearQueue: () => set({ queue: [], currentIndex: 0, isPlaying: false }),

            // Playback actions
            play: () => set({ isPlaying: true }),
            pause: () => set({ isPlaying: false }),
            togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

            next: () => set((state) => {
                if (state.queue.length === 0) return state

                let nextIndex = state.currentIndex + 1
                if (nextIndex >= state.queue.length) {
                    if (state.repeat === 'all') {
                        nextIndex = 0
                    } else {
                        return { isPlaying: false }
                    }
                }

                return { currentIndex: nextIndex, currentTime: 0 }
            }),

            previous: () => set((state) => {
                if (state.queue.length === 0) return state

                // If more than 3 seconds in, restart current track
                if (state.currentTime > 3) {
                    return { currentTime: 0 }
                }

                let prevIndex = state.currentIndex - 1
                if (prevIndex < 0) {
                    prevIndex = state.repeat === 'all' ? state.queue.length - 1 : 0
                }

                return { currentIndex: prevIndex, currentTime: 0 }
            }),

            goToTrack: (index) => set((state) => {
                if (index >= 0 && index < state.queue.length) {
                    return { currentIndex: index, currentTime: 0, isPlaying: true }
                }
                return state
            }),

            // Settings
            setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
            setCurrentTime: (time) => set({ currentTime: time }),
            setDuration: (duration) => set({ duration }),

            toggleRepeat: () => set((state) => {
                const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all']
                const currentIdx = modes.indexOf(state.repeat)
                const nextIdx = (currentIdx + 1) % modes.length
                return { repeat: modes[nextIdx] }
            }),

            toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle }))
        }),
        {
            name: 'luxius-media-player',
            partialize: (state) => ({
                queue: state.queue,
                currentIndex: state.currentIndex,
                volume: state.volume,
                repeat: state.repeat,
                shuffle: state.shuffle
            })
        }
    )
)

// Helper to get current track
export const getCurrentTrack = (state: MediaState): MediaTrack | null => {
    return state.queue[state.currentIndex] || null
}
