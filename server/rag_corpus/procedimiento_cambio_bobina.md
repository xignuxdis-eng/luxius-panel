# Procedimiento de Cambio de Bobina - Taller de Impresión

## Pasos para Cambio Seguro y Eficiente

### 1. Preparación (Antes de Parar la Impresión)
- [ ] Verificar orden de trabajo actual y material requerido
- [ ] Confirmar ancho de bobina necesario (consultar OT o ficha técnica)
- [ ] Localizar bobina en stock (ubicación: estantería A-Z por código)
- [ ] Preparar herramientas: llave de 13mm, cutter, guantes antiestáticos

### 2. Parada Controlada
1. Pausar cola de impresión en RIP (VersaWorks/PhotoPrint)
2. Esperar que la cabeza termine el pasaje actual (no cortar en medio)
3. Activar "Modo Cambio Bobina" en panel de impresora (si disponible)
4. Bajar tensor de bobina (lever de tensión)

### 3. Retiro de Bobina Actual
1. Soltar freno de bobina (girar sentido antihorario)
2. Cortar material entre bobina y entrada de impresora (dejar 20cm en impresora)
3. Retirar bobina usada con cuidado (peso: 15-45kg según ancho)
4. Registrar metros restantes en stock si > 10m

### 4. Instalación Nueva Bobina
1. Colocar nueva bobina en portabobinas (eje expandible)
2. Asegurar que gire libremente (sentido horario = desenrollar)
3. Ajustar freno: tensión mínima para evitar rebobinado
4. Alinear material: bordes paralelos a guías (±2mm)

### 5. Enhebrado y Tensado
1. Pasar material por: rodillo tensor → barra antiestática → entrada cabeza
2. Usar función "Auto Load" de impresora si disponible
3. Verificar: sin arrugas, sin burbujas, tensión uniforme
4. Imprimir test de alineación (10cm línea recta)

### 6. Reanudación
1. Reanudar cola en RIP
2. Monitorear primeros 2 metros (verificar registro, color, secado)
3. Confirmar con operador: "Bobina cambiada OK - OT-XXXX reanudada"

---

## Checklist Rápido (Post-It en Impresora)

☐ Ancho correcto  ☐ Código material coincide OT  
☐ Tensión OK  ☐ Alineación OK  
☐ Test impreso OK  ☐ Stock actualizado  

---

## Problemas Frecuentes

| Problema | Causa | Solución |
|----------|-------|----------|
| Material se arruga | Tensión desigual / bobina torcida | Reajustar freno, realinear |
| Desviación lateral | Guías sucias / bobina descentrada | Limpiar guías, centrar bobina |
| Fin de bobina no detectado | Sensor sucio / material transparente | Limpiar sensor, usar marcadores |
| Ruido excesivo | Rodamientos desgastados | Mantenimiento preventivo |

---

## Seguridad
- **NUNCA** meter manos cerca de rodillos en movimiento
- Usar guantes antiestáticos (evita polvo y descargas)
- Bobinas > 25kg: solicitar ayuda (2 personas)
- Área despejada: 1m radio alrededor de portabobinas

---

## Registro Obligatorio
Actualizar en sistema LuXius:
- Stock bobina anterior (metros restantes)
- Stock bobina nueva (metros totales - consumidos)
- Movimiento de stock tipo "EGRESO" (bobina anterior) / "INGRESO" (nueva)
- Responsable: operador de turno