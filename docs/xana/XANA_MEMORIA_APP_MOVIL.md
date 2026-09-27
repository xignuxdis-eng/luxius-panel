# Memoria de Xana: App Móvil (XignuX Workfield Manager)
**Estado:** Auditoría de Seguridad e Integración al Ecosistema LuXius.

## 1. Reporte de Vulnerabilidades Encontradas (Criticidad Alta/Media)

Tras escanear el código fuente de la app híbrida (Vanilla JS + Capacitor), se detectaron las siguientes fallas de seguridad que deben corregirse antes del paso a producción:

### A. Tráfico en Texto Plano (Cleartext) - *Criticidad: ALTA*
- **Ubicación:** `capacitor.config.json` (`"cleartext": true`, `"androidScheme": "http"`).
- **Riesgo:** Permite a la app enviar y recibir datos sin cifrado (HTTP), haciéndola extremadamente vulnerable a ataques MITM (Man in the Middle), robo de credenciales y presupuestos interceptados en redes Wi-Fi públicas.
- **Solución:** Cambiar a `"androidScheme": "https"` y establecer `"cleartext": false` para producción.

### B. Inyección XSS (Cross-Site Scripting) vía innerHTML - *Criticidad: ALTA*
- **Ubicación:** Múltiples archivos (`witnessBot.js`, `reporter.js`, `pdfGenerator.js`).
- **Riesgo:** Al ser una app de Capacitor, un ataque XSS es más grave que en una web estándar, ya que el atacante podría ejecutar código JS malicioso que acceda a los plugins nativos (cámara, archivos locales, GPS). Si algún input de usuario (como un nombre de tarea) no se limpia y se inserta directo en un `innerHTML`, se genera la brecha.
- **Solución:** Sanitizar cualquier variable (ej: nombre de cliente, texto de nota) antes de inyectarlo en `.innerHTML`, o utilizar métodos seguros como `.textContent`.

### C. Almacenamiento Inseguro de Tokens (LocalStorage) - *Criticidad: MEDIA*
- **Ubicación:** `src/js/utils/device.js` y `api.js` (`localStorage.setItem('auth_token', ...)`).
- **Riesgo:** `localStorage` guarda todo en texto plano sin cifrar, accesible para cualquier app con permisos root o volcados de memoria. En una app móvil empresarial, el JWT no debe guardarse así.
- **Solución:** Instalar e implementar el plugin `@capacitor-community/secure-storage` para guardar los tokens en el Android Keystore de forma cifrada, reemplazando el fallback de `localStorage`.

### D. Hardcoding de Tokens de Desarrollo - *Criticidad: BAJA/MEDIA*
- **Ubicación:** `src/js/utils/api.js` (Línea 6: `this.DEV_TOKEN = 'eyJhb...';`).
- **Riesgo:** Aunque diga "DEV", dejar tokens estáticos quemados en el código de producción puede llevar a accesos no autorizados si un atacante descompila la APK y el backend aún los acepta.
- **Solución:** Borrar el token del código de producción e inyectarlo vía variables de entorno (`.env`) sólo en el build de desarrollo.

---

## 2. Roadmap Final: Integración de la APK al Ecosistema LuXius

Para que la app móvil deje de ser un prototipo "mock" y se convierta en una pieza unificada del entorno LuXius, se deben seguir estos pasos:

### Fase A: Blindaje y Saneamiento (Seguridad)
1. Aplicar las soluciones de seguridad mencionadas arriba (HTTPS, SecureStorage, Sanitización HTML).
2. Eliminar el `mockStore.js` por completo de las rutinas de producción.

### Fase B: Conexión Real a la API LuXius
1. Forzar a la app a usar únicamente `https://luxius-backend.onrender.com` (o la IP local temporal si se testea).
2. Validar el flujo real de Auth: Logueo de operarios → Recepción de JWT → Llamada real a `/api/tasks`.
3. Ajustar el mapeo JSON: Asegurar que la app móvil lee el campo `coordenadas` y `clienteId` tal cual los expulsa nuestro backend actual.

### Fase C: Integración Offline (El último eslabón de campo)
1. Reactivar las rutas `/api/sync/push` del backend.
2. Programar la persistencia offline en Capacitor: Si no hay señal, guardar las mediciones del relevamiento temporalmente de manera local.
3. Listener de red: Al volver a detectar conectividad (3G/4G/Wi-Fi), enviar todo el paquete acumulado a `/api/sync/push`.

### Fase D: Expansión de Ecosistema (Xana & Firmas)
1. **Xana en el bolsillo:** Consumir `/api/xana/chat` desde un nuevo botón flotante en la app para que los operarios le pregunten dudas de manuales.
2. **Firmas y Remitos Remotos:** Extraer el "Canvas de firma digital" que tiene la app y enviarlo al backend para que éste arme el PDF final centralizado, en lugar de generarlo localmente en el celular.

### Fase E: Integración Voz a OT (Fase 4 - NUEVO) ⭐
Patrón asíncrono idéntico a `/api/xana/smart-order` (ThreadPoolExecutor + job_id + polling).

**Endpoints disponibles en backend:**
- `POST /api/xana/voice/transcribe` — Inicia transcripción asíncrona (202 + job_id)
- `GET /api/xana/voice/transcribe/status/<job_id>` — Polling estado
- `POST /api/xana/voice/transcribe-and-order` — Flujo completo Voz → Transcripción → Smart Order Draft (síncrono, para móvil)

**Flujo móvil recomendado (end-to-end):**
```
1. Usuario pulsa botón micrófono en app → graba audio (MediaRecorder, webm/opus)
2. POST /api/xana/voice/transcribe con FormData { audio: blob, language: "es-AR" }
3. Recibe 202 + job_id → Poll GET /api/xana/voice/transcribe/status/<job_id> cada 500ms
4. Cuando status="success": muestra transcript en UI, permite editar/confirmar
5. OPCIÓN A: Usuario confirma → POST /api/xana/smart-order con transcript en observaciones
   OPCIÓN B: Flujo directo → POST /api/xana/voice/transcribe-and-order con audio + params
6. Backend devuelve draft_order (interactive card) → App muestra para confirmación final
7. Usuario aprueba → Crea OT real en sistema
```

**Configuración STT (servidor, vía env `XANA_STT_PROVIDER`):**
- `mock` — Desarrollo/testing sin proveedor externo (actual por defecto)
- `google` — Google Cloud Speech-to-Text (requiere `GOOGLE_APPLICATION_CREDENTIALS`)
- `whisper` — openai-whisper local CPU (modelo base ~145MB, primer carga ~3s)

**Notas de implementación móvil:**
- Usar `MediaRecorder` con `mimeType: 'audio/webm;codecs=opus'` (compatible con backend)
- Max 25MB, 60s recomendado por frase
- Manejar permisos micrófono en `AndroidManifest.xml`: `RECORD_AUDIO`
- Para offline: grabar local, subir cuando hay conectividad (patrón Fase C)

### Fase F: Release Final
1. Generar la *Keystore* criptográfica de Android para la empresa XignuX.
2. Compilar el `app-release.aab`.
3. Distribuir a los técnicos.
