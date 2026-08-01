# Instrucciones para continuar en casa

Para seguir con el mismo "hilo" y contexto en tu otra computadora, sigue estos pasos:

1.  **Extraer el ZIP**: Descomprime `luxius_project.zip` en una carpeta.
2.  **Instalar dependencias**: Abre una terminal en esa carpeta y ejecuta `npm install`.
3.  **Iniciar Antigravity**: Cuando abras el proyecto con Antigravity, puedes referenciar los archivos en `docs/brain/` para que la IA entienda qué estuvimos haciendo.
    - `implementation_plan.md`: El plan de lo que se hizo hoy.
    - `walkthrough.md`: El resumen de los cambios.
    - `task.md`: La lista de tareas que seguimos.

### ¿Qué hay dentro?
- **Código Fuente**: Todo lo que ves en el explorador de archivos actual.
- **Base de Datos**: Los archivos en `src/data/db/` (clientes, materiales, calidades, etc.).
- **Estilos**: Todos los cambios de compactación que aplicamos hoy.

### ⚠️ Nota sobre datos temporales
Los pedidos que creas "en vivo" se guardan en el `localStorage` del navegador. Si creaste pedidos de prueba hoy, esos no estarán en el ZIP. Sin embargo, los pedidos definitivos que están en `src/data/db/ordenes.json` sí están incluidos.

¡Listo para seguir trabajando!
