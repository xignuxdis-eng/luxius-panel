/**
 * Declaraciones mínimas para el Web Speech API.
 *
 * La API no está incluida en `lib.dom.d.ts` de TypeScript. El código en
 * `XanaAssistant` ya hace feature-detection en runtime
 * (`window.SpeechRecognition || window.webkitSpeechRecognition`) y solo
 * degrada a entrada de texto si no existe, así que basta con el tipado
 * básico para el `useRef<SpeechRecognition>`.
 */

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

interface Window {
    SpeechRecognition?: {
        new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
        new (): SpeechRecognition;
    };
}