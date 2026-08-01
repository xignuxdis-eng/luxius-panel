import { useState, useEffect, useRef, useCallback } from 'react'
import './FloatingAlarm.css'

const STORAGE_KEY = 'luxius-alarm-state'

interface AlarmState {
    endTime: number | null  // Unix timestamp when alarm should end
    title: string
    isPaused: boolean
    pausedSecondsLeft: number
}

function loadAlarmState(): AlarmState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            return JSON.parse(saved)
        }
    } catch (e) {
        console.log('Error loading alarm state')
    }
    return { endTime: null, title: '', isPaused: false, pausedSecondsLeft: 0 }
}

function saveAlarmState(state: AlarmState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
        console.log('Error saving alarm state')
    }
}

function clearAlarmState() {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
        console.log('Error clearing alarm state')
    }
}

export default function FloatingAlarm() {
    const [isMinimized, setIsMinimized] = useState(true)
    const [minutes, setMinutes] = useState('')
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [isRunning, setIsRunning] = useState(false)
    const [alarmTitle, setAlarmTitle] = useState('')
    const [isPaused, setIsPaused] = useState(false)
    const intervalRef = useRef<number | null>(null)
    const endTimeRef = useRef<number | null>(null)

    // Format seconds to mm:ss
    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60)
        const secs = totalSeconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    // Play alarm sound and show notification
    const triggerAlarm = useCallback(() => {
        // Play a beep sound (using Web Audio API)
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800
            oscillator.type = 'sine'
            gainNode.gain.value = 0.3

            oscillator.start()

            // Beep pattern
            let beepCount = 0
            const beepInterval = setInterval(() => {
                beepCount++
                if (beepCount >= 6) {
                    clearInterval(beepInterval)
                    oscillator.stop()
                    audioContext.close()
                } else {
                    gainNode.gain.value = beepCount % 2 === 0 ? 0.3 : 0
                }
            }, 300)
        } catch (e) {
            console.log('Audio not supported')
        }

        // Show notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ ¡Alarma!', {
                body: alarmTitle || '¡Tu temporizador ha terminado!',
                icon: '⏰'
            })
        }

        // Expand widget and reset
        setIsMinimized(false)
        setIsRunning(false)
        setIsPaused(false)
        setSecondsLeft(0)
        endTimeRef.current = null
        clearAlarmState()
    }, [alarmTitle])

    // Start the alarm
    const startAlarm = () => {
        const mins = parseInt(minutes)
        if (isNaN(mins) || mins <= 0) return

        const endTime = Date.now() + mins * 60 * 1000
        endTimeRef.current = endTime
        setSecondsLeft(mins * 60)
        setIsRunning(true)
        setIsPaused(false)

        // Save to localStorage
        saveAlarmState({
            endTime,
            title: alarmTitle,
            isPaused: false,
            pausedSecondsLeft: 0
        })
    }

    // Stop/cancel the alarm
    const stopAlarm = () => {
        setIsRunning(false)
        setIsPaused(false)
        setSecondsLeft(0)
        endTimeRef.current = null
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        clearAlarmState()
    }

    // Pause/resume the alarm
    const togglePause = () => {
        if (isPaused) {
            // Resume: calculate new end time based on remaining seconds
            const endTime = Date.now() + secondsLeft * 1000
            endTimeRef.current = endTime
            setIsPaused(false)
            setIsRunning(true)
            saveAlarmState({
                endTime,
                title: alarmTitle,
                isPaused: false,
                pausedSecondsLeft: 0
            })
        } else {
            // Pause: save current seconds left
            setIsPaused(true)
            setIsRunning(false)
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            saveAlarmState({
                endTime: null,
                title: alarmTitle,
                isPaused: true,
                pausedSecondsLeft: secondsLeft
            })
        }
    }

    // Request notification permission
    const requestNotificationPermission = () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }
    }

    // Timer countdown effect
    useEffect(() => {
        if (isRunning && !isPaused && endTimeRef.current) {
            intervalRef.current = window.setInterval(() => {
                const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000))

                if (remaining <= 0) {
                    triggerAlarm()
                } else {
                    setSecondsLeft(remaining)
                }
            }, 250) // Update more frequently for accuracy
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [isRunning, isPaused, triggerAlarm])

    // Restore alarm state on mount
    useEffect(() => {
        requestNotificationPermission()

        const saved = loadAlarmState()

        if (saved.isPaused && saved.pausedSecondsLeft > 0) {
            // Restore paused state
            setAlarmTitle(saved.title)
            setSecondsLeft(saved.pausedSecondsLeft)
            setIsPaused(true)
            setIsRunning(false)
        } else if (saved.endTime) {
            // Calculate remaining time
            const remaining = Math.ceil((saved.endTime - Date.now()) / 1000)

            if (remaining > 0) {
                // Alarm is still running
                endTimeRef.current = saved.endTime
                setAlarmTitle(saved.title)
                setSecondsLeft(remaining)
                setIsRunning(true)
                setIsPaused(false)
            } else {
                // Alarm should have fired while away - trigger it now
                setAlarmTitle(saved.title)
                clearAlarmState()
                triggerAlarm()
            }
        }
    }, [])

    // Quick time buttons
    const quickTimes = [5, 10, 15, 30, 60]

    const isActive = isRunning || isPaused || secondsLeft > 0

    // Minimized view
    if (isMinimized) {
        return (
            <button
                className={`minimized-alarm ${isActive ? 'running' : ''} ${isPaused ? 'paused' : ''}`}
                onClick={() => setIsMinimized(false)}
                title={isActive ? `Alarma: ${formatTime(secondsLeft)}` : 'Abrir alarma'}
            >
                {isActive ? formatTime(secondsLeft) : '⏰'}
            </button>
        )
    }

    // Expanded view
    return (
        <div className="floating-alarm">
            {/* Header */}
            <div className="alarm-header">
                <span className="alarm-title">⏰ Temporizador</span>
                <button
                    className="alarm-minimize"
                    onClick={() => setIsMinimized(true)}
                    title="Minimizar"
                >
                    ▼
                </button>
            </div>

            {/* Timer Display */}
            {isActive ? (
                <div className="alarm-display">
                    <span className={`alarm-time ${isPaused ? 'paused' : ''}`}>
                        {formatTime(secondsLeft)}
                    </span>
                    {alarmTitle && <span className="alarm-label">{alarmTitle}</span>}
                    {isPaused && <span className="alarm-paused-badge">PAUSADO</span>}
                </div>
            ) : null}

            {/* Controls when running */}
            {isActive && (
                <div className="alarm-controls">
                    <button className="alarm-btn pause" onClick={togglePause}>
                        {isPaused ? '▶️ Continuar' : '⏸️ Pausar'}
                    </button>
                    <button className="alarm-btn cancel" onClick={stopAlarm}>
                        ✕ Cancelar
                    </button>
                </div>
            )}

            {/* Setup when not running */}
            {!isActive && (
                <>
                    <div className="alarm-input-row">
                        <input
                            type="number"
                            className="alarm-minutes-input"
                            placeholder="Minutos"
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            min="1"
                            max="999"
                        />
                        <button className="alarm-start-btn" onClick={startAlarm}>
                            ▶️ Iniciar
                        </button>
                    </div>

                    <div className="alarm-quick-times">
                        {quickTimes.map(time => (
                            <button
                                key={time}
                                className="quick-time-btn"
                                onClick={() => {
                                    const endTime = Date.now() + time * 60 * 1000
                                    endTimeRef.current = endTime
                                    setMinutes(time.toString())
                                    setSecondsLeft(time * 60)
                                    setIsRunning(true)
                                    setIsPaused(false)
                                    saveAlarmState({
                                        endTime,
                                        title: alarmTitle,
                                        isPaused: false,
                                        pausedSecondsLeft: 0
                                    })
                                }}
                            >
                                {time}m
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        className="alarm-title-input"
                        placeholder="Nota (opcional)..."
                        value={alarmTitle}
                        onChange={(e) => setAlarmTitle(e.target.value)}
                    />
                </>
            )}
        </div>
    )
}
