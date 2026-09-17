# Instrucciones para continuar en casa / con cualquier IDE

Para seguir con el mismo hilo y contexto en otra computadora o con otro IDE (Cursor, VS Code, Windsurf, Claude Dev, Antigravity):

1. **Memoria y Contexto Maestro**:
   - Consulta y referencia siempre: **[`XANA_MEMORIA_SISTEMA.md`](file:///f:/Sitio%20XignuX/XANA_MEMORIA_SISTEMA.md)**. Contiene la arquitectura completa, bitácora de bugs resueltos, repositorios y reglas de despliegue.
   - Reglas de agentes IA: **[`.agents/rules/xana_agent.md`](file:///f:/Sitio%20XignuX/.agents/rules/xana_agent.md)** y **[`.agents/AGENTS.md`](file:///f:/Sitio%20XignuX/.agents/AGENTS.md)**.
   - Memoria de la App Móvil: **[`XANA_MEMORIA_APP_MOVIL.md`](file:///f:/Sitio%20XignuX/XANA_MEMORIA_APP_MOVIL.md)**.

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Iniciar desarrollo**:
   ```bash
   npm run dev
   ```

4. **Compilar y Desplegar (Regla obligatoria)**:
   - Compilar: `npm run build`
   - Git push master: `git push origin master`
   - Git push gh-pages: `$split = git subtree split --prefix dist master; git push origin "${split}:gh-pages" --force`
   - Si estás en la PC del taller, sincronizar Nginx local:
     `Copy-Item -Path "f:\Sitio XignuX\dist\*" -Destination "D:\XignuX\luxius-panel\dist\" -Recurse -Force`

¡Todo el contexto del sistema está al día y listo para continuar!
