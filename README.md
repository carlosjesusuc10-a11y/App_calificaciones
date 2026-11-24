# Mi Control Académico

Aplicación web progresiva (**PWA**) personal y móvil-primero para registrar, calcular y dar seguimiento a tus calificaciones por ciclos escolares, semestres, materias y evaluaciones, funcionando **100% de forma local y sin conexión**.

---

## ¿Qué hace la aplicación?

- **Organización académica completa:** Crea y administra ciclos escolares, semestres y materias con docente, escala y configuración independiente.
- **Categorías y evaluaciones flexibles:** Incluye categorías predeterminadas (`ADA`, `Proyecto`, `Examen`, `Tarea`, `Práctica`, `Participación`, `Otro`) y permite crear o editar categorías personalizadas.
- **Modos de evaluación y escalas:**
  - **Por puntos:** Suma directa de puntos obtenidos sobre puntos posibles.
  - **Por porcentajes:** Cálculo proporcional por peso de categoría (por ejemplo, ADAs `30%`, Proyecto `20%`, Examen `50%`) o sobre `100%`.
  - **Escalas:** `10`, `100` o cualquier escala personalizada (`20`, `50`, etc.) con calificación mínima configurable.
- **Indicadores visuales de estado:** Semáforo automático (**verde**, **amarillo** configurable en riesgo y **rojo**), barras de progreso, anillos de avance y desglose por categoría.
- **Análisis "¿Cuánto necesito?" y proyecciones:** Calcula si ya aprobaste, cuántos puntos y qué porcentaje necesitas en evaluaciones pendientes, el máximo alcanzable y una proyección basada en tu rendimiento actual.
- **Persistencia local y respaldo JSON:** Guarda automáticamente toda la información en `localStorage` del dispositivo y permite exportar e importar respaldos completos en formato `.json` con validación previa.
- **PWA e interfaz móvil:** Instalable en pantalla de inicio (Android, iOS y escritorio) y utilizable sin conexión mediante Service Worker.

---

## Tecnologías utilizadas

- **React 19** + **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Lucide React** (iconografía)
- **vite-plugin-pwa / Workbox** (manifiesto, precaché y soporte offline)

> No requiere servidores externos, bases de datos en la nube, API keys ni servicios de pago.

---

## Cómo ejecutarla en desarrollo

Requisitos previos: **Node.js 20+** y **npm**.

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo (puerto 3000)
npm run dev
```

Comandos útiles de verificación:

```bash
# Verificar tipos de TypeScript
npm run lint

# Ejecutar pruebas unitarias y de integración
npm test
```

---

## Cómo generar una versión de producción

```bash
# Compilar aplicación optimizada en la carpeta dist/
npm run build

# (Opcional) Previsualizar localmente la compilación de producción
npm run preview
```

La carpeta `dist/` contendrá los archivos estáticos listos para publicarse, incluyendo `index.html`, `manifest.webmanifest`, `sw.js`, los iconos PWA y los recursos compilados con rutas relativas (`./`).

---

## Cómo publicarla (GitHub Pages o hosting estático)

El proyecto está configurado en `vite.config.ts` con `base: './'` y rutas relativas en el manifiesto PWA, por lo que funciona directamente tanto en la raíz de un dominio como en subrutas de **GitHub Pages** (`https://<usuario>.github.io/<repositorio>/`).

### Opción 1: GitHub Actions + GitHub Pages (recomendado)

El repositorio ya incluye el flujo automático en `.github/workflows/deploy.yml`:

1. Sube este repositorio a GitHub en la rama `main`.
2. En tu repositorio ve a **Settings → Pages → Build and deployment** y en **Source** selecciona **GitHub Actions**.
3. El flujo ejecutará automáticamente `npm install`, `npm run lint`, `npm test`, `npm run build` y publicará la carpeta `dist/`.

### Opción 2: Cualquier servidor estático gratuito

Sube el contenido completo generado en `dist/` a **GitHub Pages**, **Cloudflare Pages**, **Netlify** o **Vercel** como sitio estático (comando de build: `npm run build`, directorio de salida: `dist`).

---

## Variables de entorno y privacidad

- La aplicación **no utiliza API keys, contraseñas, tokens ni secretos**.
- Todos los datos académicos se guardan exclusivamente en el navegador del usuario (`localStorage`).
- El archivo `.env.example` documenta únicamente la variable opcional de desarrollo `DISABLE_HMR`. No subas archivos `.env` locales al repositorio.

---

## Estructura general del proyecto

```text
.
├── public/                     # Iconos PWA (SVG, PNG, maskable, apple-touch-icon, favicon)
├── src/
│   ├── components/
│   │   ├── charts/             # Gráficas ligeras SVG/CSS (ScoreRing, ProgressBar, CategoryBreakdownChart)
│   │   ├── cycles/             # Gestión de ciclos escolares y semestres
│   │   ├── dashboard/          # Panel principal, resumen del semestre y tarjetas de materias
│   │   ├── forms/              # Formularios móviles (ciclo, semestre, materia, categoría, evaluación, nota rápida)
│   │   ├── layout/             # AppShell y hojas/modales adaptables (AdaptiveSheet)
│   │   ├── pwa/                # Botón de instalación PWA e indicador de estado sin conexión
│   │   ├── settings/           # Preferencias académicas, zona amarilla y respaldo JSON
│   │   ├── subjects/           # Listado, detalle, evaluaciones, progreso y proyecciones por materia
│   │   └── ui/                 # Primitivas reutilizables (Button, SurfaceCard, FormField, EmptyState)
│   ├── domain/                 # Motor matemático puro, validaciones y valores predeterminados
│   ├── hooks/                  # Hooks de navegación, store académico, estado offline e instalación PWA
│   ├── state/                  # AcademicContext, reducer, acciones y selectores derivados
│   ├── storage/                # Repositorio localStorage, migraciones y exportación/importación JSON
│   ├── types/                  # Contratos TypeScript del dominio académico
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx                # Registro del Service Worker y punto de entrada
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```
