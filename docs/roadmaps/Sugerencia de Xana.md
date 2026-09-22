# Sugerencia de Xana

## Roadmap de implementación de Xana para LuXius

### Objetivo general

Convertir a Xana progresivamente en la capa inteligente de LuXius: un
asistente capaz de comprender XignuX, consultar y operar el sistema,
analizar archivos y operaciones, detectar problemas, proponer soluciones
y, con controles de seguridad, ejecutar procesos.

------------------------------------------------------------------------

## Fase 0 --- Arquitectura y reglas de seguridad

**Objetivo:** establecer una base segura antes de ampliar las
capacidades.

-   [ ] Definir claramente el rol de Xana dentro de LuXius.
-   [ ] Separar conversación, razonamiento, herramientas, memoria y
    conocimiento.
-   [ ] Definir permisos por herramienta.
-   [ ] Clasificar acciones por riesgo:
    -   Consulta: segura.
    -   Cálculo: segura.
    -   Creación/modificación: controlada.
    -   Cambios sensibles/eliminaciones: autorización explícita.
-   [ ] Registrar las acciones ejecutadas por Xana.
-   [ ] Implementar manejo de errores y posibilidad de cancelar/revertir
    cuando sea viable.

**Resultado:** Xana puede operar sin convertirse en un punto de riesgo
para los datos de LuXius.

------------------------------------------------------------------------

# Fase 1 --- Xana conoce LuXius

**Objetivo:** que Xana pueda consultar el sistema de forma fiable.

### Herramientas iniciales

-   [ ] `buscar_cliente()`
-   [ ] `consultar_cliente()`
-   [ ] `buscar_trabajo()`
-   [ ] `consultar_trabajo()`
-   [ ] `consultar_material()`
-   [ ] `consultar_stock()`
-   [ ] `consultar_precio()`
-   [ ] `consultar_impresion()`
-   [ ] `consultar_relevamiento()`
-   [ ] `buscar_en_luxius()`

### Ejemplos

> "¿Qué trabajos tiene pendientes Juan Pérez?"

> "¿Cuánto vinilo blanco tenemos?"

> "¿Qué trabajos están esperando impresión?"

**Resultado:** Xana deja de depender de información estática y comienza
a consultar la fuente de verdad de LuXius.

------------------------------------------------------------------------

# Fase 2 --- Xana aprende XignuX

**Objetivo:** darle conocimiento específico del negocio sin necesidad de
entrenar el modelo.

### Base de conocimiento

-   [ ] Información general de XignuX.
-   [ ] Materiales.
-   [ ] Máquinas.
-   [ ] Procesos de producción.
-   [ ] Arte.
-   [ ] Relevamientos.
-   [ ] Precios y criterios comerciales.
-   [ ] Procedimientos internos.
-   [ ] Reglas operativas.
-   [ ] Casos históricos relevantes.

### Organización sugerida

``` text
knowledge/
├── empresa/
├── materiales/
├── maquinas/
├── produccion/
├── arte/
├── relevamientos/
├── comercial/
├── procedimientos/
└── reglas/
```

**Resultado:** Xana puede responder y razonar utilizando conocimiento
propio de XignuX.

------------------------------------------------------------------------

# Fase 3 --- Xana calcula

**Objetivo:** evitar que el modelo haga cálculos críticos por su cuenta.

### Herramientas

-   [ ] `calcular_superficie()`
-   [ ] `calcular_metros_lineales()`
-   [ ] `calcular_consumo()`
-   [ ] `calcular_desperdicio()`
-   [ ] `calcular_costo()`
-   [ ] `calcular_precio()`
-   [ ] `calcular_margen()`

Los cálculos deben ejecutarse mediante funciones deterministas y
devolver resultados verificables.

**Resultado:** Xana puede analizar costos, consumos y superficies con
precisión.

------------------------------------------------------------------------

# Fase 4 --- Xana puede modificar LuXius

**Objetivo:** pasar de consultar a operar.

### Clientes

-   [ ] `crear_cliente()`
-   [ ] `actualizar_cliente()`

### Trabajos

-   [ ] `crear_trabajo()`
-   [ ] `modificar_trabajo()`
-   [ ] `asignar_trabajo()`
-   [ ] `cambiar_estado()`
-   [ ] `duplicar_trabajo()`
-   [ ] `cerrar_trabajo()`

### Stock

-   [ ] `registrar_entrada()`
-   [ ] `registrar_salida()`
-   [ ] `reservar_material()`
-   [ ] `liberar_material()`
-   [ ] `ajustar_stock()`

### Producción

-   [ ] `asignar_impresion()`
-   [ ] `registrar_impresion()`
-   [ ] `marcar_impreso()`
-   [ ] `registrar_consumo()`

**Resultado:** Xana puede ejecutar operaciones reales dentro de LuXius,
con autorización cuando corresponda.

------------------------------------------------------------------------

# Fase 5 --- Xana ve y analiza archivos

**Objetivo:** incorporar capacidades multimodales.

### Archivos de impresión

-   [ ] Analizar dimensiones.
-   [ ] Analizar DPI.
-   [ ] Detectar formato.
-   [ ] Detectar orientación.
-   [ ] Analizar color.
-   [ ] Detectar posibles problemas.
-   [ ] Generar diagnóstico.

### Resultado esperado

> "El archivo tiene 58 DPI y está por debajo del mínimo recomendado para
> este trabajo."

### Relevamientos

-   [ ] Analizar fotografías.
-   [ ] Identificar elementos relevantes.
-   [ ] Comparar fotografías con datos cargados.
-   [ ] Detectar información aparentemente faltante.

**Resultado:** Xana puede interpretar información visual además de datos
estructurados.

------------------------------------------------------------------------

# Fase 6 --- Xana analiza trabajos completos

**Objetivo:** crear una herramienta de análisis integral.

### Nueva habilidad

`analizar_trabajo()`

Debe revisar:

-   [ ] Cliente.
-   [ ] Archivos.
-   [ ] Dimensiones.
-   [ ] Material.
-   [ ] Stock.
-   [ ] Precio.
-   [ ] Estado.
-   [ ] Arte.
-   [ ] Producción.
-   [ ] Relevamiento.
-   [ ] Información faltante.

### Ejemplo

``` text
TRABAJO #1842

Cliente ............ OK
Archivos ........... OK
Dimensiones ........ OK
Material ........... OK
Stock .............. ALERTA
Arte ............... OK
Producción ......... Pendiente

Conclusión:
El trabajo no debería pasar todavía a impresión.
Faltan aproximadamente X metros de material.
```

**Resultado:** Xana empieza a razonar sobre procesos completos y no
solamente sobre registros individuales.

------------------------------------------------------------------------

# Fase 7 --- Memoria de Xana

**Objetivo:** que Xana conserve contexto útil.

### Tipos de memoria

-   [ ] Memoria de conversación.
-   [ ] Memoria de usuario.
-   [ ] Memoria de cliente.
-   [ ] Memoria operacional.
-   [ ] Memoria de experiencias.

### Ejemplos

> "Este cliente suele utilizar terminación mate."

> "La última vez que ocurrió este problema de laminado, la solución
> fue..."

La memoria debe guardar información útil y estructurada, evitando
almacenar indiscriminadamente todas las conversaciones.

**Resultado:** Xana comienza a comportarse como una asistente que conoce
el historial operativo de XignuX.

------------------------------------------------------------------------

# Fase 8 --- Procesos y misiones

**Objetivo:** permitir que Xana ejecute secuencias completas de
acciones.

## Misión: preparar trabajo para impresión

``` text
Analizar trabajo
      ↓
Revisar archivos
      ↓
Verificar material
      ↓
Verificar stock
      ↓
Verificar aprobación
      ↓
Detectar problemas
      ↓
Preparar impresión
      ↓
Registrar acción
      ↓
Notificar
```

## Misión: preparar presupuesto

``` text
Cliente
  ↓
Trabajo
  ↓
Material
  ↓
Superficie
  ↓
Consumo
  ↓
Costos
  ↓
Mano de obra
  ↓
Margen
  ↓
Precio
  ↓
Presupuesto
```

## Misión: completar relevamiento

``` text
Trabajo
  ↓
Fotos
  ↓
Medidas
  ↓
Observaciones
  ↓
Análisis
  ↓
Datos faltantes
  ↓
Relevamiento completo
```

**Resultado:** Xana puede ejecutar workflows completos en lugar de
acciones aisladas.

------------------------------------------------------------------------

# Fase 9 --- Xana detecta problemas

**Objetivo:** hacer que Xana sea proactiva.

Crear:

`supervisar_luxius()`

### Revisar trabajos

-   [ ] Atrasados.
-   [ ] Sin archivos.
-   [ ] Sin aprobación.
-   [ ] Sin material.
-   [ ] Estancados.
-   [ ] Con datos inconsistentes.

### Revisar stock

-   [ ] Stock bajo.
-   [ ] Stock crítico.
-   [ ] Consumos anormales.
-   [ ] Material reservado sin utilizar.

### Revisar producción

-   [ ] Trabajos demorados.
-   [ ] Producción no registrada.
-   [ ] Consumos anormales.

### Revisar comercial

-   [ ] Presupuestos pendientes.
-   [ ] Clientes sin seguimiento.
-   [ ] Trabajos sin presupuesto.

**Resultado:** Xana puede detectar situaciones que el usuario todavía no
preguntó.

------------------------------------------------------------------------

# Fase 10 --- Xana propone soluciones

**Objetivo:** pasar de detectar problemas a recomendar acciones.

Ejemplo:

> "El trabajo #1842 necesita 5,3 m adicionales de material. Existe una
> alternativa compatible disponible. ¿Querés que la reserve?"

Xana debe:

-   [ ] Explicar el problema.
-   [ ] Mostrar datos relevantes.
-   [ ] Proponer una solución.
-   [ ] Explicar consecuencias.
-   [ ] Solicitar autorización cuando corresponda.
-   [ ] Ejecutar la acción autorizada.
-   [ ] Registrar la decisión.

**Resultado:** Xana se convierte en asistente de decisión.

------------------------------------------------------------------------

# Fase 11 --- Niveles de autonomía

Implementar progresivamente:

### Nivel 0 --- Responder

Solo conversa.

### Nivel 1 --- Consultar

Puede consultar LuXius.

### Nivel 2 --- Calcular

Puede realizar análisis mediante herramientas deterministas.

### Nivel 3 --- Proponer

Puede recomendar acciones.

### Nivel 4 --- Ejecutar con autorización

Ejecuta acciones después de recibir aprobación.

### Nivel 5 --- Automatizar acciones seguras

Puede ejecutar automáticamente operaciones previamente clasificadas como
seguras.

### Nivel 6 --- Supervisar

Puede revisar periódicamente el estado del negocio y generar alertas.

**Resultado:** autonomía gradual, medible y controlada.

------------------------------------------------------------------------

# Fase 12 --- Especialistas de Xana

**Objetivo:** organizar capacidades complejas sin necesariamente crear
múltiples modelos.

``` text
Xana
├── Comercial
├── Producción
├── Stock
├── Arte
├── Relevamiento
└── Supervisión
```

Cada especialista puede tener:

-   [ ] Herramientas propias.
-   [ ] Conocimiento específico.
-   [ ] Reglas específicas.
-   [ ] Permisos específicos.

**Resultado:** Xana puede adoptar diferentes modos de trabajo según la
tarea.

------------------------------------------------------------------------

# Fase 13 --- Xana Supervisora

**Objetivo final:** convertir a Xana en la capa inteligente de LuXius.

Crear un panel de estado:

``` text
ESTADO DE XIGNuX

Producción       🟢 Normal
Stock            🟡 3 alertas
Trabajos         🔴 2 problemas
Comercial        🟡 4 pendientes
Relevamientos    🟢 Normal

PRIORIDADES

1. Trabajo #1842 — falta material
2. Trabajo #1837 — atrasado
3. Oracal — stock crítico
```

Xana debería poder:

-   [ ] Monitorear.
-   [ ] Detectar.
-   [ ] Priorizar.
-   [ ] Explicar.
-   [ ] Recomendar.
-   [ ] Ejecutar acciones autorizadas.
-   [ ] Registrar resultados.
-   [ ] Aprender de experiencias documentadas.

------------------------------------------------------------------------

# Arquitectura objetivo

``` text
                         XANA
                           │
                  ┌────────┴────────┐
                  │    XANA CORE    │
                  └────────┬────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  Knowledge              Memory              Tools
     RAG                    │                   │
       │                    │                   │
       └────────────────────┼───────────────────┘
                            ▼
                      Agent Runtime
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           Análisis      Workflows      Agentes
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                         LuXius API
                            │
                            ▼
                       PostgreSQL
```

------------------------------------------------------------------------

# Principios de implementación

### 1. No entrenar el modelo innecesariamente

Priorizar:

**Tools + RAG + Memory + Workflows + permisos.**

El modelo razona y decide qué capacidad utilizar; LuXius sigue siendo la
fuente de verdad.

### 2. No permitir que el LLM haga operaciones críticas directamente

Las operaciones deben pasar por herramientas controladas.

### 3. Los cálculos importantes deben ser deterministas

El modelo solicita el cálculo; una función realiza la operación.

### 4. Toda acción importante debe quedar registrada

Xana debería poder explicar:

> "Hice esto porque..."

### 5. Autonomía gradual

Primero consultar → después proponer → después ejecutar con autorización
→ finalmente automatizar acciones seguras.

------------------------------------------------------------------------

# Meta final

La evolución buscada es:

``` text
ASISTENTE
   ↓
ASISTENTE CON HERRAMIENTAS
   ↓
ASISTENTE QUE CONOCE XIGNuX
   ↓
OPERADOR DE LUXIUS
   ↓
ASISTENTE MULTIMODAL
   ↓
ANALISTA
   ↓
SUPERVISOR
   ↓
AGENTE OPERATIVO
```

**Objetivo final de Xana:**

> Que Xana no sea simplemente una IA dentro de LuXius, sino la capa
> inteligente capaz de entender el estado de XignuX, encontrar
> información, analizarla, detectar problemas, proponer soluciones y
> ejecutar acciones controladas dentro del sistema.
