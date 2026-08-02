import { useState, useEffect, useRef } from "react";
import { 
  Calculator as CalculatorIcon,
  X,
  Minimize2,
  Maximize2,
  ArrowLeft
} from "lucide-react";

export default function Calculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const calculatorRef = useRef<HTMLDivElement>(null);

  // Manejador de teclas del teclado numérico
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen || isMinimized) return;

      // Números
      if (/^[0-9]$/.test(e.key)) {
        inputDigit(parseInt(e.key));
      }
      // Operadores
      else if (['+', '-', '*', '/'].includes(e.key)) {
        performOperation(e.key);
      }
      // Enter o = para calcular
      else if (e.key === 'Enter' || e.key === '=') {
        calculate();
      }
      // Escape para limpiar
      else if (e.key === 'Escape') {
        clear();
      }
      // Backspace para borrar
      else if (e.key === 'Backspace') {
        backspace();
      }
      // Punto decimal
      else if (e.key === '.') {
        inputDecimal();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, isMinimized, display, previousValue, operation, waitingForOperand]);

  const inputDigit = (digit: number) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const result = calculate();
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    const inputValue = parseFloat(display);

    if (previousValue === null || operation === null) {
      return inputValue;
    }

    let result: number;
    switch (operation) {
      case '+':
        result = previousValue + inputValue;
        break;
      case '-':
        result = previousValue - inputValue;
        break;
      case '*':
        result = previousValue * inputValue;
        break;
      case '/':
        result = previousValue / inputValue;
        break;
      default:
        return inputValue;
    }

    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setDisplay(String(result));
    return result;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (calculatorRef.current) {
      const rect = calculatorRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  // Botón flotante cuando está cerrado
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-0 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
        >
          <CalculatorIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Calc</span>
        </button>
      </div>
    );
  }

  // Versión minimizada
  if (isMinimized) {
    return (
      <div 
        className="fixed z-50 cursor-move"
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
        ref={calculatorRef}
      >
        <div className="bg-purple-500 text-white p-2 rounded-lg shadow-lg flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(false)}
            className="hover:bg-purple-600 p-1 rounded"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium">Calculadora</span>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-purple-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 cursor-move"
      style={{ left: position.x, top: position.y, width: '280px' }}
      onMouseDown={handleMouseDown}
      ref={calculatorRef}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-purple-500 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <CalculatorIcon className="w-5 h-5" />
          <span className="font-medium">Calculadora</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:bg-purple-600 p-1 rounded"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-purple-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Display */}
      <div className="p-4 bg-gray-50">
        <div className="bg-white p-3 rounded border text-right">
          <div className="text-sm text-gray-500 h-4">
            {previousValue !== null && operation && `${previousValue} ${operation}`}
          </div>
          <div className="text-2xl font-mono text-gray-900 truncate">
            {display}
          </div>
        </div>
      </div>

      {/* Keypad */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2">
          {/* Primera fila */}
          <button
            onClick={clear}
            className="bg-red-500 hover:bg-red-600 text-white p-3 rounded font-medium"
          >
            C
          </button>
          <button
            onClick={backspace}
            className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded"
          >
            <ArrowLeft className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={() => performOperation('/')}
            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded font-medium"
          >
            ÷
          </button>
          <button
            onClick={() => performOperation('*')}
            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded font-medium"
          >
            ×
          </button>

          {/* Segunda fila */}
          <button
            onClick={() => inputDigit(7)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            7
          </button>
          <button
            onClick={() => inputDigit(8)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            8
          </button>
          <button
            onClick={() => inputDigit(9)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            9
          </button>
          <button
            onClick={() => performOperation('-')}
            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded font-medium"
          >
            -
          </button>

          {/* Tercera fila */}
          <button
            onClick={() => inputDigit(4)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            4
          </button>
          <button
            onClick={() => inputDigit(5)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            5
          </button>
          <button
            onClick={() => inputDigit(6)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            6
          </button>
          <button
            onClick={() => performOperation('+')}
            className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded font-medium"
          >
            +
          </button>

          {/* Cuarta fila */}
          <button
            onClick={() => inputDigit(1)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            1
          </button>
          <button
            onClick={() => inputDigit(2)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            2
          </button>
          <button
            onClick={() => inputDigit(3)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            3
          </button>
          <button
            onClick={calculate}
            className="bg-green-500 hover:bg-green-600 text-white p-3 rounded font-medium row-span-2"
            style={{ gridRow: 'span 2' }}
          >
            =
          </button>

          {/* Quinta fila */}
          <button
            onClick={() => inputDigit(0)}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium col-span-2"
            style={{ gridColumn: 'span 2' }}
          >
            0
          </button>
          <button
            onClick={inputDecimal}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-3 rounded font-medium"
          >
            .
          </button>
        </div>

        {/* Atajos de teclado */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          <p>Usa el teclado numérico o las teclas: +, -, *, /, Enter, Escape</p>
        </div>
      </div>
    </div>
  );
} 