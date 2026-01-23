# 🧪 PRUEBAS DE XANA AI

## 📋 Instrucciones de Prueba

### 1. Abrir el Navegador
- Ve a: `http://localhost:5173`
- Inicia sesión con cualquier rol

### 2. Abrir las Herramientas de Desarrollador
- Presiona `F12` o `Ctrl+Shift+I`
- Ve a la pestaña `Console`

### 3. Probar Xana AI
- Haz clic en el botón "Xana AI" (esquina inferior derecha)
- Escribe diferentes tipos de preguntas

## 🔍 Logs a Buscar

### ✅ Logs de Funcionamiento Correcto:
```
🔍 Xana AI - Procesando mensaje: { input: "...", intent: "...", confidence: 0.9, userContext: {...} }
🤖 Xana AI - Usando OpenAI para respuesta
🔍 Xana AI - Intentando usar OpenAI: { question: "...", context: "...", apiKey: "Configurada" }
✅ Xana AI - Respuesta de OpenAI recibida: { text: "...", usage: {...} }
```

### ⚠️ Logs de Problemas:
```
❌ Xana AI - Error llamando a OpenAI: Error: ...
🔄 Xana AI - Usando respuesta de fallback: ...
```

## 🎯 Preguntas de Prueba

### Preguntas Simples (Respuestas Contextuales):
1. "¿Cuál es el estado de mi pedido?"
2. "¿Qué formatos de archivo aceptan?"
3. "¿Cuánto cuesta un banner de 2x3 metros?"

### Preguntas Complejas (OpenAI):
1. "¿Cómo funciona el proceso de impresión?"
2. "¿Qué materiales son mejores para exteriores?"
3. "¿Puedes explicarme el sistema LuXius?"

## 🔧 Solución de Problemas

### Si ves "⚠️ OpenAI no configurado":
1. Verifica que el archivo `.env` existe
2. Verifica que la API key es correcta
3. Reinicia el servidor: `npm run dev`

### Si las respuestas no son justificadas:
1. Verifica los logs en la consola
2. Asegúrate de que OpenAI esté configurado
3. Las respuestas mejoradas ya están implementadas

### Si hay errores de API:
1. Verifica tu conexión a internet
2. Verifica que tu API key es válida
3. Verifica que tienes créditos en OpenAI

## 📊 Resultados Esperados

### Con OpenAI Configurado:
- ✅ Sin advertencia amarilla
- ✅ Respuestas detalladas y justificadas
- ✅ Logs de OpenAI en consola

### Sin OpenAI:
- ⚠️ Advertencia amarilla visible
- ✅ Respuestas contextuales mejoradas
- ✅ Logs de fallback en consola

## 🎉 Indicadores de Éxito

1. **Respuestas Justificadas**: Las respuestas explican el "por qué"
2. **Logs Informativos**: Console muestra el proceso
3. **Funcionamiento Híbrido**: Combina respuestas contextuales y OpenAI
4. **Personalización por Rol**: Diferentes respuestas según el usuario 