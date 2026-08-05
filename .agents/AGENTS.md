# Reglas de Flujo de Trabajo - Luxius System

- **Desarrollo Local y Despliegue Inmediato**: Cada modificación, corrección de bugs o nueva funcionalidad debe realizarse localmente en el código, verificarse y compilarse (`npm run build`), y subirse inmediatamente (`git push`) a sus respectivos repositorios en GitHub (`luxius-panel`, `luXius-Backend`, `xignux-landing`) para que los cambios se reflejen instantáneamente en la web y servidores.
- **Compilación gh-pages**: Para el frontend `luxius-panel`, al actualizar el código fuente se debe mantener sincronizada la rama `gh-pages` con el contenido de `dist/` para actualizar la versión web pública (`https://xignuxdis-eng.github.io/luxius-panel/`).
- **Autonomía y Auto-Aprobación**: Ejecutar directamente todas las tareas, comandos de terminal, compilaciones y despliegues sin detenerse a solicitar confirmaciones al usuario. Proceder de inicio a fin resolviendo cualquier tarea de forma autónoma.
