import { useState } from 'react'
import './FloatingCalculator.css'

type CalculatorMode = 'basic' | 'meter'

export default function FloatingCalculator() {
    const [isMinimized, setIsMinimized] = useState(true)
    const [mode, setMode] = useState<CalculatorMode>('basic')

    // Basic calculator state
    const [display, setDisplay] = useState('0')
    const [previousValue, setPreviousValue] = useState<number | null>(null)
    const [operation, setOperation] = useState<string | null>(null)
    const [waitingForOperand, setWaitingForOperand] = useState(false)

    // Meter calculator state
    const [width, setWidth] = useState('')
    const [height, setHeight] = useState('')
    const [pricePerLinear, setPricePerLinear] = useState('')
    const [pricePerSquare, setPricePerSquare] = useState('')
    const [quantity, setQuantity] = useState('1')

    // Basic calculator functions
    const inputDigit = (digit: string) => {
        if (waitingForOperand) {
            setDisplay(digit)
            setWaitingForOperand(false)
        } else {
            setDisplay(display === '0' ? digit : display + digit)
        }
    }

    const inputDecimal = () => {
        if (waitingForOperand) {
            setDisplay('0.')
            setWaitingForOperand(false)
            return
        }
        if (!display.includes('.')) {
            setDisplay(display + '.')
        }
    }

    const clear = () => {
        setDisplay('0')
        setPreviousValue(null)
        setOperation(null)
        setWaitingForOperand(false)
    }

    const performOperation = (nextOperation: string) => {
        const inputValue = parseFloat(display)

        if (previousValue === null) {
            setPreviousValue(inputValue)
        } else if (operation) {
            const result = calculate(previousValue, inputValue, operation)
            setDisplay(String(result))
            setPreviousValue(result)
        }

        setWaitingForOperand(true)
        setOperation(nextOperation)
    }

    const calculate = (a: number, b: number, op: string): number => {
        switch (op) {
            case '+': return a + b
            case '-': return a - b
            case '×': return a * b
            case '÷': return b !== 0 ? a / b : 0
            default: return b
        }
    }

    const equals = () => {
        if (operation === null || previousValue === null) return

        const inputValue = parseFloat(display)
        const result = calculate(previousValue, inputValue, operation)

        setDisplay(String(result))
        setPreviousValue(null)
        setOperation(null)
        setWaitingForOperand(true)
    }

    const percentage = () => {
        const value = parseFloat(display)
        setDisplay(String(value / 100))
    }

    const toggleSign = () => {
        const value = parseFloat(display)
        setDisplay(String(-value))
    }

    // Meter calculator functions
    const widthNum = parseFloat(width) || 0
    const heightNum = parseFloat(height) || 0
    const quantityNum = parseInt(quantity) || 1

    // Calculate areas
    const linearMeters = (widthNum / 100) * quantityNum // width in cm to linear meters
    const squareMeters = (widthNum / 100) * (heightNum / 100) * quantityNum // both in cm to m²

    // Calculate prices
    const priceLinearNum = parseFloat(pricePerLinear) || 0
    const priceSquareNum = parseFloat(pricePerSquare) || 0

    const totalFromLinear = linearMeters * priceLinearNum
    const totalFromSquare = squareMeters * priceSquareNum

    // Conversion: price per m² to price per ml (given width)
    const convertSquareToLinear = () => {
        if (priceSquareNum > 0 && widthNum > 0) {
            const mlPrice = priceSquareNum * (widthNum / 100)
            setPricePerLinear(mlPrice.toFixed(2))
        }
    }

    // Conversion: price per ml to price per m² (given width)
    const convertLinearToSquare = () => {
        if (priceLinearNum > 0 && widthNum > 0) {
            const sqPrice = priceLinearNum / (widthNum / 100)
            setPricePerSquare(sqPrice.toFixed(2))
        }
    }

    // Clear all meter calculator data
    const clearMeterData = () => {
        setWidth('')
        setHeight('')
        setQuantity('1')
        setPricePerLinear('')
        setPricePerSquare('')
    }

    // Minimized view
    if (isMinimized) {
        return (
            <button
                className="minimized-calculator"
                onClick={() => setIsMinimized(false)}
                title="Abrir calculadora"
            >
                🧮
            </button>
        )
    }

    // Expanded view
    return (
        <div className="floating-calculator">
            {/* Header */}
            <div className="calc-header">
                <span className="calc-title">🧮 Calculadora</span>
                <div className="calc-tabs">
                    <button
                        className={`calc-tab ${mode === 'basic' ? 'active' : ''}`}
                        onClick={() => setMode('basic')}
                    >
                        Básica
                    </button>
                    <button
                        className={`calc-tab ${mode === 'meter' ? 'active' : ''}`}
                        onClick={() => setMode('meter')}
                    >
                        Metros
                    </button>
                </div>
                <button
                    className="calc-minimize"
                    onClick={() => setIsMinimized(true)}
                    title="Minimizar"
                >
                    ▼
                </button>
            </div>

            {/* Basic Calculator */}
            {mode === 'basic' && (
                <div className="calc-basic">
                    <div className="calc-display">
                        <span className="calc-display-value">{display}</span>
                    </div>
                    <div className="calc-buttons">
                        <button className="calc-btn func" onClick={clear}>C</button>
                        <button className="calc-btn func" onClick={toggleSign}>±</button>
                        <button className="calc-btn func" onClick={percentage}>%</button>
                        <button className="calc-btn op" onClick={() => performOperation('÷')}>÷</button>

                        <button className="calc-btn" onClick={() => inputDigit('7')}>7</button>
                        <button className="calc-btn" onClick={() => inputDigit('8')}>8</button>
                        <button className="calc-btn" onClick={() => inputDigit('9')}>9</button>
                        <button className="calc-btn op" onClick={() => performOperation('×')}>×</button>

                        <button className="calc-btn" onClick={() => inputDigit('4')}>4</button>
                        <button className="calc-btn" onClick={() => inputDigit('5')}>5</button>
                        <button className="calc-btn" onClick={() => inputDigit('6')}>6</button>
                        <button className="calc-btn op" onClick={() => performOperation('-')}>−</button>

                        <button className="calc-btn" onClick={() => inputDigit('1')}>1</button>
                        <button className="calc-btn" onClick={() => inputDigit('2')}>2</button>
                        <button className="calc-btn" onClick={() => inputDigit('3')}>3</button>
                        <button className="calc-btn op" onClick={() => performOperation('+')}>+</button>

                        <button className="calc-btn zero" onClick={() => inputDigit('0')}>0</button>
                        <button className="calc-btn" onClick={inputDecimal}>.</button>
                        <button className="calc-btn equals" onClick={equals}>=</button>
                    </div>
                </div>
            )}

            {/* Meter Calculator */}
            {mode === 'meter' && (
                <div className="calc-meter">
                    <div className="calc-row">
                        <label>Ancho (cm)</label>
                        <input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            placeholder="ej: 100"
                        />
                    </div>
                    <div className="calc-row">
                        <label>Alto (cm)</label>
                        <input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="ej: 150"
                        />
                    </div>
                    <div className="calc-row">
                        <label>Cantidad</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="1"
                            min="1"
                        />
                    </div>

                    <button className="clear-meter-btn" onClick={clearMeterData} title="Limpiar todos los datos">
                        🗑️ Limpiar
                    </button>

                    <div className="calc-divider"></div>

                    <div className="calc-results">
                        <div className="calc-result">
                            <span className="result-label">Metro Lineal:</span>
                            <span className="result-value">{linearMeters.toFixed(2)} ml</span>
                        </div>
                        <div className="calc-result">
                            <span className="result-label">Metro Cuadrado:</span>
                            <span className="result-value">{squareMeters.toFixed(2)} m²</span>
                        </div>
                    </div>

                    <div className="calc-divider"></div>

                    <div className="calc-price-section">
                        <h4>💰 Cálculo de Precio</h4>

                        <div className="calc-price-row">
                            <div className="price-input-group">
                                <label>$/ML</label>
                                <input
                                    type="number"
                                    value={pricePerLinear}
                                    onChange={(e) => setPricePerLinear(e.target.value)}
                                    placeholder="0.00"
                                />
                                <button
                                    className="convert-btn"
                                    onClick={convertLinearToSquare}
                                    title="Convertir a $/m²"
                                >
                                    →
                                </button>
                            </div>
                            <div className="price-input-group">
                                <label>$/M²</label>
                                <input
                                    type="number"
                                    value={pricePerSquare}
                                    onChange={(e) => setPricePerSquare(e.target.value)}
                                    placeholder="0.00"
                                />
                                <button
                                    className="convert-btn"
                                    onClick={convertSquareToLinear}
                                    title="Convertir a $/ml"
                                >
                                    ←
                                </button>
                            </div>
                        </div>

                        <div className="calc-totals">
                            {priceLinearNum > 0 && (
                                <div className="total-row">
                                    <span>Total (ml × $/ml):</span>
                                    <span className="total-value">${totalFromLinear.toFixed(2)}</span>
                                </div>
                            )}
                            {priceSquareNum > 0 && (
                                <div className="total-row">
                                    <span>Total (m² × $/m²):</span>
                                    <span className="total-value">${totalFromSquare.toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
