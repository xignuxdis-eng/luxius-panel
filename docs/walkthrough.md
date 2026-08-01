# Walkthrough de Luxius: Replicación de IMPGESV2

He completado la recreación del sistema **IMPGESV2** como una aplicación web moderna llamada **Luxius**. A continuación, presento las características y funcionalidades implementadas.

---

## 1. Autenticación y Roles

Luxius implementa un sistema de seguridad basado en roles (6 niveles) idéntico al original.

| Usuario | Password | Rol | Nivel |
|---------|----------|-----|-------|
| `paola` | `pgof123` | Admin | 3 |
| `adrian.dis` | `mejico` | Diseño | 6 |
| `adrian.imp` | `mejico` | Impresión | 5 |

> [!NOTE]
> El sistema utiliza **RBAC (Role-Based Access Control)** para filtrar el menú lateral y proteger las rutas, asegurando que un diseñador solo vea herramientas de diseño y un impresor solo su cola de producción.

![Final Upload View](C:/Users/Impresion/.gemini/antigravity/brain/46931fd1-15f6-4389-ad37-32705a9110b5/final_modal_filename_updated_1769529650377.png)

### Video de Verificación de Carga
![File Upload Interaction Flow](C:/Users/Impresion/.gemini/antigravity/brain/46931fd1-15f6-4389-ad37-32705a9110b5/verify_upload_luxius_demo_1769529052035.webp)

---

## 2. Módulos Core (Producción)

### 📥 Entrada (Gestión de Pedidos)
Recreada la tabla de órdenes con todos los campos técnicos de IMPGESV2.
- **Nuevo Pedido**: Modal avanzado con pestañas (Trabajos/Promos).
- **Campos Técnicos**: Alto, Ancho, Material, Calidad, Demasías, Accesorios, Urgencia.
- **Logística**: Integrada gestión de envíos (Retira, Moto, Terminal).

### 🎨 Diseño (Cola de Producción)
Visualización moderna en formato de tarjetas ("Cards").
- **Workflow**: Estados visuales (Orden → Diseño → Previa).
- **Acciones**: Descarga de planos originales y subida de previews.

### 🖨️ Impresión (Producción Final)
Gestión de máquinas y estados de impresión.
- **Barras de Estado**: Monitoreo de máquinas (Online/Offline).
- **Asignación**: Selector de máquinas ("Anidado") para cada OT.
- **Registro**: Botón "OK Impreso" para completar el flujo.

---

## 3. Administración y Soporte

### ⚙️ ABM (Configuración)
Gestión centralizada de todas las entidades:
- **Clientes**: Lista detallada con indicadores VIP y estados.
- **Materiales/Calidades**: Gestión de sustratos y niveles de acabado.

### 📊 Reportes
Generador de informes dinámico:
- **Categorías**: Financiero, Ventas, Stock, Producción.
- **Parámetros**: Filtros por fecha y formato de salida (Web/PDF/Excel).

### 🔧 Sistema
Mantenimiento y seguridad:
- **Permisos**: Auditoría de roles activos.
- **Utilidades DB**: Simuladores de Backup, Limpieza de Base y Normalización.

---

## 4. Diseño y UX Premium

He aplicado un sistema de diseño "Glassmorphism" con temática oscura para una experiencia profesional y moderna:
- **Estética**: Gradientes suaves, bordes brillantes y desenfoque de fondo.
- **Micro-animaciones**: Transiciones suaves al navegar y estados de carga.
- **Responsividad**: El layout se adapta a diferentes tamaños de pantalla.

---

## 5. Estructura del Proyecto

```
luxius/
├── src/
│   ├── components/ui/       # Componentes atómicos (Button, Input, Modal)
│   ├── store/               # Estado global (Zustand)
│   ├── types/               # Definiciones TS estrictas
│   └── data/                # Datos simulados basados en IMPGESV2
```

---

## Paquete Portable (ZIP) ✅
Este es el paquete completo del proyecto Luxius.

### Contenido:
- **Código Fuente**: Aplicación React completa.
- **Demo Interactiva**: `preview.html` para visualización inmediata.
- **Base de Datos**: `src/data/clientes_db.json` con 120 clientes extraídos.
- **Documentación**: Todos los análisis y guías con imágenes integradas en la carpeta `docs`.

### Instrucciones de Uso:
1. **Visualización Rápida**: Abrir `preview.html` directamente en cualquier navegador.
2. **Ambiente de Desarrollo**:
   - Abrir una terminal en la carpeta del proyecto.
   - Ejecutar `npm install`.
   - Ejecutar `npm run dev`.
   - Credenciales: `paola` / `pgof123`.
