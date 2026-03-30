# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**matchX** — Sistema gestor de sedes, partidos y torneos de fútbol para el mercado colombiano.

- **Tech Stack**: Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + TypeScript
- **Architecture**: SPA modular con 7 roles y 8 módulos funcionales
- **Status**: Hitos 0, 1, 2, 4 y 5 completados. Pendiente Hito 3 (Delegado) y Hito 6 (Público)
- **Model**: 20 tablas relacionales definidas en `sistema_torneos.mwb`

---

## Quick Start

### Development
```bash
npm install
npm run dev
# Opens on http://localhost:5173
```

### Build
```bash
npm run build
npm run preview
```

### Testing
```bash
# Tests not yet configured (TODO)
npm run test
```

---

## Project Structure

```
src/
├── main.ts                 ← App entry point
├── App.vue                 ← Root component with RouterView
├── style.css               ← Tailwind + custom styles
├── router/
│   └── index.ts            ← Vue Router con guards por rol
├── stores/
│   ├── auth.ts             ← Pinia auth store (session, roles, perms)
│   ├── torneos.ts          ✅ CRUD torneos + torneosActivos
│   ├── equipos.ts          ✅ CRUD equipos + equiposPorTorneo computed
│   ├── jugadores.ts        ✅ CRUD jugadores + jugadoresPorEquipo computed
│   ├── partidos.ts         ✅ CRUD partidos + proximosPartidos + partidosPorTorneo
│   ├── sedes.ts            ✅ CRUD sedes + canchas (agregarCancha, actualizarCancha, eliminarCancha)
│   ├── modalidades.ts      ✅ Modalidades (F5, F7, F11)
│   ├── usuarios.ts         ✅ CRUD usuarios del sistema
│   └── configuracion.ts   ✅ Key-value configuración global
├── layouts/
│   ├── AppLayout.vue       ✅ Sidebar + topbar con nav por rol (7 roles)
│   ├── AuthLayout.vue      ✅ Centered login/error layout
│   ├── PublicLayout.vue    ← Simple navbar (público — TODO)
│   └── DelegadoLayout.vue  ← Mobile-first mesa de control (TODO)
├── views/
│   ├── auth/
│   │   ├── LoginView.vue           ✅ Mock login con 7 usuarios/roles
│   │   └── NoAutorizadoView.vue   ✅
│   ├── admin-sistema/              ✅ HITO 1 COMPLETO
│   │   ├── DashboardView.vue
│   │   ├── UsuariosView.vue        ← CRUD usuarios
│   │   ├── ModalidadesView.vue     ← CRUD modalidades
│   │   ├── SedesView.vue           ← CRUD sedes + canchas (modal dual)
│   │   └── ConfiguracionView.vue  ← Key-value config
│   ├── admin-torneo/               ✅ HITO 2 COMPLETO
│   │   ├── TorneoDashboardView.vue ← Métricas, torneos, próximos partidos
│   │   ├── TorneosView.vue         ← CRUD torneos (skeleton, empty state, iconos)
│   │   ├── InscripcionesView.vue   ← Equipos por torneo (progress bar cupos)
│   │   ├── PlantillaView.vue       ← Jugadores por equipo (avatares iniciales, búsqueda)
│   │   ├── PartidosView.vue        ← Calendario partidos (escudos, skeleton)
│   │   └── PosicionesView.vue      ← Tabla posiciones (AppDataTable, medallero)
│   ├── admin-sede/                 ✅ HITO 4 COMPLETO
│   │   ├── SedeDashboardView.vue   ← Métricas sede, canchas, próximos partidos
│   │   ├── CanchasView.vue         ← CRUD canchas + toggle disponibilidad
│   │   └── CalendarioView.vue      ← Partidos en la sede por fecha y cancha
│   ├── arbitro/                    ✅ HITO 5 COMPLETO
│   │   ├── ArbitroDashboardView.vue ← Stats árbitro + próximos + resultados
│   │   └── MisPartidosView.vue      ← Partidos asignados filtrable por estado
│   ├── capitan/                    ✅ HITO 5 COMPLETO
│   │   ├── CapitanDashboardView.vue ← Equipo + stats + próximos + resultados
│   │   ├── MiEquipoView.vue         ← Plantilla con avatares, búsqueda, resumen posición
│   │   └── FixtureView.vue          ← Fixture del equipo (filtrable, equipo propio resaltado)
│   ├── delegado/                   ← TODO: HITO 3 — CRITICAL
│   └── publico/                    ← TODO: HITO 6
├── components/
│   └── ui/
│       ├── AppButton.vue      ✅ Variants: primary/secondary/ghost/danger + sizes
│       ├── AppInput.vue       ✅
│       ├── AppSelect.vue      ✅
│       ├── AppCard.vue        ✅ hover prop
│       ├── AppBadge.vue       ✅ dot prop, variants: green/orange/blue/gray
│       ├── AppModal.vue       ✅ size prop (sm/md/lg)
│       └── AppDataTable.vue   ✅ sortable, slots por columna, empty slot
└── data/
    └── mocks/
        ├── usuarios.json           ✅ 7 usuarios (uno por rol)
        ├── torneos.json            ✅ 3 torneos (F5 Bogotá, F7 Medellín, F11 Cali)
        ├── equipos.json            ✅ 8 equipos (capitan_id en equipo 1)
        ├── jugadores.json          ✅ 40 jugadores (5 por equipo, equipos 1-8)
        ├── partidos.json           ✅ 6 partidos torneo 1 (4 finalizados, 2 programados)
        ├── sedes.json              ✅ 3 sedes con canchas
        ├── modalidades.json        ✅
        └── configuracion_sistema.json ✅
```

---

## Usuarios de Prueba (Mock Login)

| Usuario | Correo | Rol | Ruta inicial |
|---------|--------|-----|--------------|
| Carlos Administrador | carlos@matchx.com | superadmin | /admin/dashboard |
| Ana Admin Torneo | ana@matchx.com | admin_torneo | /torneo/dashboard |
| Juan Admin Sede | juan@matchx.com | admin_sede | /sede/dashboard |
| Miguel Delegado | miguel@matchx.com | delegado | /delegado/partidos |
| Pedro Árbitro | pedro@matchx.com | arbitro | /arbitro/dashboard |
| Luis Capitán | luis@matchx.com | capitan | /capitan/dashboard |
| Usuario Público | publico@matchx.com | publico | /admin/dashboard |

**Nota:** Luis Capitán está vinculado a "Águilas FC" (equipo id=1) mediante `capitan_id: 6` en equipos.json.

---

## Rutas Implementadas

```
/login                      → LoginView
/admin/dashboard            → superadmin
/admin/usuarios             → superadmin
/admin/modalidades          → superadmin
/admin/sedes                → superadmin
/admin/configuracion        → superadmin

/torneo/dashboard           → admin_torneo
/torneo/torneos             → admin_torneo
/torneo/inscripciones       → admin_torneo
/torneo/plantilla           → admin_torneo
/torneo/partidos            → admin_torneo
/torneo/posiciones          → admin_torneo

/sede/dashboard             → admin_sede
/sede/canchas               → admin_sede
/sede/calendario            → admin_sede

/arbitro/dashboard          → arbitro
/arbitro/partidos           → arbitro

/capitan/dashboard          → capitan
/capitan/equipo             → capitan
/capitan/fixture            → capitan

/delegado/partidos          → delegado (TODO — placeholder)
```

---

## Key Decisions

### Authentication
- **Mock login** with 7 predefined users (one per role)
- Session persisted to `localStorage` key: `matchx_session`
- Guards check role on every route transition
- `initSession()` se llama en el redirect de `/` para evitar race condition con localStorage

### Design System
- **Dark Mode OLED**: `#0f1923` base, `#00d4aa` accent green, `#ff6b35` accent orange
- **Typography**: Fira Code (headings) + Fira Sans (body)
- **Depth**: Borders + minimal shadows (elevation scale)
- **Responsive**: Mobile-first, sidebar collapses on small screens
- **Iconos**: Lucide Vue Next (ya instalado)

### State Management
- **Pinia stores** por dominio — Composition API style (`defineStore(() => { ... })`)
- Getters filtrados usan `computed(() => (param) => filter...)` — se llaman SIN `.value` desde el template
- **No hay backend** — todos los datos son JSON mockeados cargados con `import()`

### Patterns establecidos

#### Filtered computed en Pinia
```ts
// En el store:
const equiposPorTorneo = computed(() => (torneoId: number) =>
  equipos.value.filter(e => e.torneo_id === torneoId)
)

// En el componente (NO usar .value):
const equipos = equiposStore.equiposPorTorneo(selectedTorneoId.value)
```

#### AppDataTable con slots
```vue
<AppDataTable :columns="columns" :rows="rows" row-key="id">
  <template #cell-nombre="{ row, value }">
    <!-- custom cell -->
  </template>
  <template #empty>
    <!-- custom empty state -->
  </template>
</AppDataTable>
```

#### Jornada divider (patrón visual estándar)
```vue
<div class="flex items-center gap-3 mt-5 mb-2">
  <div class="h-px flex-1 bg-matchx-border-base/50" />
  <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider">
    Jornada {{ jornada }}
  </span>
  <div class="h-px flex-1 bg-matchx-border-base/50" />
</div>
```

#### Avatares con iniciales (patrón en Plantilla/MiEquipo)
```ts
const avatarColors = [
  'bg-matchx-accent-green/20 text-matchx-accent-green',
  'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
]
const avatarColor = (id: number) => avatarColors[id % 4]
const initiales = (nombre: string, apellido: string) =>
  `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()
```

---

## Offline Architecture (TODO — Hito 3)
- **IndexedDB** for local event cache
- **localStorage** for session + simple data
- **Manual sync queue** for delegado registering events without connection
- **Service Worker** (PWA) — NetworkFirst for data, CacheFirst for assets

---

## How to Add a New Feature

### 1. New View
```ts
// 1. Create src/views/your-feature/YourView.vue
// 2. Add route to src/router/index.ts with:
//    - path, name, component
//    - meta: { requiereRol: ['admin_torneo'], title: 'Your Title' }
// 3. Create store if needed: src/stores/yourFeature.ts
// 4. Add link to AppLayout.vue navigation
// 5. Add destination to LoginView.vue roleDestinations map
// 6. Update dashboardRoute in AppLayout.vue if needed
```

### 2. New Store
```ts
// src/stores/yourFeature.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useYourFeatureStore = defineStore('yourFeature', () => {
  const state = ref([])
  const getData = async () => { /* ... */ }
  return { state, getData }
})
```

### 3. New JSON Mock
```ts
// En el store, cargar con:
const data = await import('@/data/mocks/yourEntity.json')
items.value = data.default
```

### 4. New Component
- **UI atoms** → `src/components/ui/AppButton.vue`, etc.
- **Feature components** → `src/components/<feature>/MyComponent.vue`
- Use `<script setup lang="ts">` + TypeScript
- Props/emits explicitly typed with `defineProps`, `defineEmits`

---

## Naming Conventions

### Files
- **Stores**: `src/stores/featureName.ts` → `useFeatureNameStore`
- **Composables**: `src/composables/useFeatureName.ts`
- **Components**: `src/components/ui/AppButton.vue` (UI atoms con prefijo App)
- **Views**: `src/views/role-area/ViewName.vue`
- **Layouts**: `src/layouts/LayoutName.vue`

### TypeScript
- Interfaces: `interface Torneo { ... }`
- Types: `type EstadoTorneo = 'programado' | 'en_curso' | 'finalizado' | 'cancelado'`
- Enums: evitar, usar type unions

### CSS
- Dark mode → usar Tailwind classes: `bg-matchx-bg-base`, `text-matchx-accent-green`
- Custom colors en `tailwind.config.js` theme extend
- Scoped styles solo para comportamiento específico del componente

---

## Development Workflow

### Before Coding
1. **Load skills** — `interface-design`, `vue-best-practices`, `ui-ux-pro-max`
2. **Explore domain** — Leer store y mocks antes de proponer UI

### During Coding
1. **Composition API** + `<script setup>` es el estándar
2. **Props down, events up** — flujo de datos explícito
3. **One responsibility per component** — dividir si tiene 3+ secciones
4. **No hardcoded values** — usar composables o stores

### Before Completing
1. **Verificar TypeScript** — no usar tipos genéricos sin necesidad
2. **Test all routes** — especialmente acceso por rol
3. **Check dark mode** — consistencia visual
4. **Test on mobile** — viewport mínimo 375px

---

## Design System Specs

### Colors (Dark Mode)
| Var | Hex | Use |
|-----|-----|-----|
| `matchx-bg-base` | #0f1923 | Main background |
| `matchx-bg-surface` | #1a2533 | Cards, panels |
| `matchx-bg-elevated` | #243040 | Modals, dropdowns |
| `matchx-accent-green` | #00d4aa | Primary actions |
| `matchx-accent-orange` | #ff6b35 | Alerts, goles |
| `matchx-text-primary` | #f0f4f8 | Main text |
| `matchx-text-secondary` | #b8c5d6 | Secondary text |
| `matchx-text-muted` | #8899aa | Disabled, metadata |
| `matchx-border-base` | #2a3a4a | Standard borders |

### Typography
- **Heading font**: Fira Code (monospace, technical feel)
- **Body font**: Fira Sans (readable, friendly)
- **Base size**: 16px (mobile), 18px (desktop)
- **Line height**: 1.5-1.75 for body text

### Spacing (base unit: 4px)
- `xs`: 4px | `sm`: 8px | `md`: 12px | `lg`: 16px | `xl`: 24px | `2xl`: 32px | `3xl`: 48px

### Border Radius
- `xs`: 4px | `sm`: 6px | `md`: 8px | `lg`: 12px | `xl`: 16px

---

## Hitos

### Hito 0 ✅ COMPLETO
- [x] Vite + Vue 3 + TypeScript setup
- [x] Tailwind dark mode configurado
- [x] 4 layouts creados
- [x] Vue Router con auth guards
- [x] Pinia auth store
- [x] Mock login view (7 usuarios/roles)
- [x] usuarios.json mock data

### Hito 1 ✅ COMPLETO — Admin Sistema
- [x] DashboardView con métricas
- [x] UsuariosView (CRUD completo)
- [x] ModalidadesView (F5, F7, F11)
- [x] SedesView + gestión de canchas (modal dual)
- [x] ConfiguracionView (key-value)

### Hito 2 ✅ COMPLETO — Admin Torneo
- [x] TorneoDashboardView (métricas + iconos)
- [x] TorneosView (CRUD + skeleton + empty state)
- [x] InscripcionesView (equipos + barra de progreso cupos)
- [x] PlantillaView (jugadores + avatares iniciales + búsqueda)
- [x] PartidosView (calendario + escudos equipos)
- [x] PosicionesView (AppDataTable + medallero Trophy/Medal)
- [x] Mejoras visuales: iconos Lucide, empty states, skeleton loaders

### Hito 3 ⏳ PENDIENTE — Delegado Mesa de Control (CRITICAL)
- [ ] EnVivoView (mobile-first, 4 botones, timeline eventos)
- [ ] Cronómetro widget (start/pause/reset)
- [ ] Marcador en tiempo real
- [ ] Cola offline con IndexedDB
- [ ] DelegadoLayout (optimizado teléfono en cancha)

### Hito 4 ✅ COMPLETO — Admin Sede
- [x] SedeDashboardView (métricas sede)
- [x] CanchasView (CRUD + toggle disponibilidad con switch visual)
- [x] CalendarioView (partidos por fecha y cancha)

### Hito 5 ✅ COMPLETO — Árbitro y Capitán
- [x] ArbitroDashboardView (stats + próximos + últimos resultados)
- [x] MisPartidosView (filtrable por estado, agrupado por jornada)
- [x] CapitanDashboardView (header equipo + stats + fixture mini)
- [x] MiEquipoView (plantilla con avatares, búsqueda, resumen posición)
- [x] FixtureView (partidos filtrable, equipo propio resaltado en verde)

### Hito 6 ⏳ PENDIENTE — Vista Pública
- [ ] Tabla de posiciones pública (sin login)
- [ ] Fixture y resultados
- [ ] Información de sedes
- [ ] PublicLayout

### Later
- [ ] PWA + Service Worker
- [ ] Reports PDF (jsPDF + html2canvas)
- [ ] WebSocket para tiempo real (futuro backend)
- [ ] Tests (Vitest)

---

## Resources

- **Mockup data**: `src/data/mocks/*.json`
- **Schema reference**: `explorador_tablas_torneos.html` (abrir en browser)
- **DB Model**: `sistema_torneos.mwb` (MySQL Workbench)
- **Design specs**: `.claude/skills/ui-ux-pro-max/` (design system database)
- **Skills**: `interface-design`, `vue-best-practices`, `ui-ux-pro-max`

---

## Commands Reference

```bash
# Development
npm run dev              # Start dev server on http://localhost:5173

# Production
npm run build            # Build to dist/
npm run preview          # Preview built version locally

# Utils (TODO)
npm run test             # Run tests (not yet configured)
npm run lint             # Check code quality (not yet configured)
npm run type-check       # TypeScript check (not yet configured)
```

---

## Notes

1. **No Backend Yet** — All data is mocked JSON, API calls are simulated
2. **Session Storage** — Auth state lives in localStorage, not a database
3. **Dark Mode Default** — All interfaces designed for dark mode, light mode TODO
4. **Mobile First** — Delegado views optimized for 360px+ phones on cancha
5. **Offline Critical** — Delegado puede perder conexión, debe guardar eventos localmente

---

**Last Updated**: 2026-03-30
**Completed**: Hitos 0, 1, 2, 4, 5
**Next Focus**: Hito 3 — Delegado Mesa de Control (CRITICAL) o Hito 6 — Vista Pública
**Skills Used**: interface-design, vue-best-practices, ui-ux-pro-max
