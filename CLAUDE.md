# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**matchX** — Sistema gestor de sedes, partidos y torneos de fútbol para el mercado colombiano.

- **Tech Stack**: Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + TypeScript
- **Architecture**: SPA modular con 7 roles y 8 módulos funcionales
- **Status**: Hitos 0–6 completados. Backend real conectado. En fase de integración y bugfixes.
- **Model**: 20 tablas relacionales definidas en `sistema_torneos.mwb`
- **Backend**: API REST real (Laravel). Variable de entorno `VITE_API_BASE_URL` en `.env`.

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

# CLAUDE.md - Token Efficient Rules

1. Think before acting. Read existing files before writing code.
2. Be concise in output but thorough in reasoning.
3. Prefer editing over rewriting whole files.
4. Do not re-read files you have already read unless the file may have changed.
5. Test your code before declaring done.
6. No sycophantic openers or closing fluff.
7. Keep solutions simple and direct.
8. User instructions always override this file.

---

## Project Structure

```
src/
├── main.ts                 ← App entry point
├── App.vue                 ← Root component with RouterView
├── style.css               ← Tailwind + custom styles
├── router/
│   └── index.ts            ← Vue Router con guards por rol
├── services/               ← Capa de API (axios) — BACKEND REAL
│   ├── api.ts              ← Instancia axios + interceptor JWT + redirect 401
│   ├── auth.service.ts     ← /api/login, /api/logout, /api/user
│   ├── sedes.service.ts    ← /api/torneos/sedes + normalizeCancha/normalizeSede
│   ├── torneos.service.ts
│   ├── equipos.service.ts
│   ├── jugadores.service.ts
│   ├── partidos.service.ts
│   ├── modalidades.service.ts
│   ├── usuarios.service.ts
│   └── eventos.service.ts
├── stores/
│   ├── auth.ts             ← Pinia auth store (session, roles, perms, select_profile flow)
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
│   ├── PublicLayout.vue    ✅ Simple navbar público
│   └── DelegadoLayout.vue  ✅ Mobile-first mesa de control
├── views/
│   ├── auth/
│   │   ├── LoginView.vue           ✅ Login real con select_profile flow
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
│   ├── delegado/                   ✅ HITO 3 COMPLETO
│   │   ├── MisPartidosView.vue
│   │   └── EnVivoView.vue
│   └── publico/                    ✅ HITO 6 COMPLETO
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
    └── mocks/                 ← YA NO SE USAN EN PRODUCCIÓN, solo referencia
        ├── usuarios.json
        ├── torneos.json
        ├── equipos.json
        ├── jugadores.json
        ├── partidos.json
        ├── sedes.json
        ├── modalidades.json
        └── configuracion_sistema.json
```

---

## Usuarios de Prueba (Backend Real)

> Login contra `/api/login`. Soporta flujo `select_profile` cuando un usuario tiene múltiples roles.

| Usuario | Correo | Rol | Ruta inicial |
|---------|--------|-----|--------------|
| Carlos Administrador | carlos@matchx.com | superadmin | /admin/dashboard |
| Ana Admin Torneo | ana@matchx.com | admin_torneo | /torneo/dashboard |
| Juan Admin Sede | juan@matchx.com | admin_sede | /sede/dashboard |
| Miguel Delegado | miguel@matchx.com | delegado | /delegado/partidos |
| Pedro Árbitro | pedro@matchx.com | arbitro | /arbitro/dashboard |
| Luis Capitán | luis@matchx.com | capitan | /capitan/dashboard |
| Felipe Jugador | jugador@matchx.com | jugador | /capitan/dashboard |
| Usuario Público | publico@matchx.com | publico | /publico/torneos |

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

/delegado/partidos          → delegado
/delegado/en-vivo/:id       → delegado (DelegadoLayout)

/publico/torneos            → público (sin login)
/publico/posiciones         → público
/publico/fixture            → público
/publico/sedes              → público
/publico/partidos/:id       → público
```

---

## Key Decisions

### Authentication
- **Login real** contra API (`/api/login`). Soporta flujo `select_profile` (2 pasos).
- Session persisted to `localStorage` key: `matchx_session`
- Guards check role on every route transition
- `initSession()` se llama en el redirect de `/` para evitar race condition con localStorage
- **IMPORTANTE**: `handleLogout` debe ser `async/await` — si no, el `router.push('/login')` dispara antes de que `user.value = null` y el guard rebota al usuario de vuelta al dashboard.

### Design System
- **Dark Mode OLED**: `#0f1923` base, `#00d4aa` accent green, `#ff6b35` accent orange
- **Typography**: Fira Code (headings) + Fira Sans (body)
- **Depth**: Borders + minimal shadows (elevation scale)
- **Responsive**: Mobile-first, sidebar collapses on small screens
- **Iconos**: Lucide Vue Next (ya instalado)

### State Management
- **Pinia stores** por dominio — Composition API style (`defineStore(() => { ... })`)
- Getters filtrados usan `computed(() => (param) => filter...)` — se llaman SIN `.value` desde el template
- **Backend real** — los stores consumen `src/services/*.service.ts` vía axios. Los mocks en `src/data/mocks/` ya no se usan en producción.

### Integración con API (patrones críticos)

#### Normalización de respuestas
El backend Laravel usa snake_case con prefijos de tabla (ej: `id_sedes`, `id_canchas`). Cada service tiene funciones `normalize*` que mapean al modelo interno del frontend.

```ts
// sedes.service.ts — el backend devuelve id_sedes, tipo_superficie, estado
function normalizeSede(raw: any): Sede {
  return {
    id:      raw.id_sedes  ?? raw.id,
    activo:  raw.estado    ?? raw.activo ?? 1,
    canchas: (raw.canchas ?? []).map(normalizeCancha),
    // ...
  }
}
```

#### Canchas incluidas solo en getById
`GET /api/torneos/sedes` (lista) NO incluye canchas. Solo `GET /api/torneos/sedes/:id` las trae.
Por eso `fetchSedes` en el store usa `Promise.all` + `getById` para enriquecer cada sede:

```ts
const lista = await sedesService.getAll()
sedes.value = await Promise.all(lista.map(s => sedesService.getById(s.id)))
```

#### Manejo de errores del API en stores
Si el backend responde `{ status: 'error', message: '...' }` con HTTP 200, hay que comprobarlo explícitamente y lanzar un Error — axios no lo detecta como error automáticamente:

```ts
const body = res.data
if (body.status === 'error') throw new Error(body.message)
```

#### Formularios con errores del API
Los formularios deben ser `async`, awaitar la acción del store, y mostrar el mensaje de error dentro del modal si falla:

```ts
const saveSede = async () => {
  if (!validateSedeForm()) return
  saveError.value = ''
  try {
    await store.crearSede({ ... })
    showModal.value = false
  } catch (err: any) {
    saveError.value = err.message ?? 'Error al guardar'
  }
}
```

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

## Offline Architecture (Hito 3 — Implementado)
- **IndexedDB** para cache local de eventos del delegado (`dbAdd/dbGetAll/dbDelete`)
- **localStorage** para sesión + datos simples (`matchx_session`)
- **Cola de sync manual** — delegado registra eventos sin conexión, se sincronizan al reconectar
- **Service Worker** (PWA) — pendiente de implementar

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

### 3. New Service
```ts
// src/services/yourEntity.service.ts
import api from './api'

function normalizeEntity(raw: any): Entity {
  return {
    id:   raw.id_entity ?? raw.id,
    // mapear todos los campos del backend al modelo interno
  }
}

export const yourEntityService = {
  getAll: async () => {
    const { data } = await api.get('/api/your-entity')
    return (data.data ?? data).map(normalizeEntity)
  },
  create: (payload: Partial<Entity>) => api.post('/api/your-entity', payload),
  update: (id: number, payload: Partial<Entity>) => api.put(`/api/your-entity/${id}`, payload),
}
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
2. **Explore domain** — Leer el service y el store del dominio antes de proponer cambios
3. **Verificar el contrato de la API** — el backend puede devolver campos con prefijo (`id_sedes`) o estructura anidada (`ubicacion.ciudad`)

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
- [x] Login real contra API + flujo select_profile
- [x] Capa de servicios axios con interceptors JWT

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

### Hito 3 ✅ COMPLETO — Delegado Mesa de Control
- [x] EnVivoView (mobile-first, 6 botones acción, timeline eventos)
- [x] Cronómetro widget (start/pause/reset) con indicador pulsante
- [x] Marcador en tiempo real (golesLocal / golesVisitante reactivos)
- [x] Cola offline con IndexedDB (dbAdd/dbGetAll/dbDelete + sync automático)
- [x] DelegadoLayout (optimizado teléfono en cancha, indicador online/offline)
- [x] MisPartidosView con botón "Mesa de Control" por partido
- [x] Rutas: /delegado/partidos (AppLayout) + /delegado/en-vivo/:id (DelegadoLayout)

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

### Hito 6 ✅ COMPLETO — Vista Pública
- [x] Tabla de posiciones pública (sin login)
- [x] Fixture y resultados
- [x] Información de sedes
- [x] PublicLayout

### Integración Backend ⚠️ EN CURSO
- [x] Auth: login real + select_profile + logout async
- [x] Sedes: CRUD + canchas (getById para traer canchas incluidas)
- [ ] Torneos: conectar store al service real
- [ ] Equipos: conectar store al service real
- [ ] Jugadores: conectar store al service real
- [ ] Partidos: conectar store al service real
- [ ] Modalidades: conectar store al service real
- [ ] Usuarios: conectar store al service real

### Bugs Resueltos ✅
- **Sedes — campos faltantes en create**: `ciudad`, `departamento`, `capacidad` no se enviaban al API (`stores/sedes.ts`)
- **Sedes — error del API ignorado**: el store hacía push local aunque el backend respondiera `status: error` (`stores/sedes.ts`)
- **Sedes — modal cerraba sin await**: `saveSede` en `SedesView.vue` no era async, cerraba el modal antes de confirmar éxito
- **Sedes — canchas no visibles**: `fetchSedes` usaba solo `getAll()` (sin canchas); corregido con `Promise.all + getById` (`stores/sedes.ts`)
- **Logout doble clic**: `handleLogout` en `AppLayout.vue` no awaita `authStore.logout()`, el guard redirigía al dashboard antes de que `user.value = null`

### Later
- [ ] PWA + Service Worker
- [ ] Reports PDF (jsPDF + html2canvas)
- [ ] WebSocket para tiempo real
- [ ] Tests (Vitest)

---

## Resources

- **API Base URL**: configurar en `.env` → `VITE_API_BASE_URL=http://...`
- **Mock data (referencia)**: `src/data/mocks/*.json` — ya no se usan en producción
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

1. **Backend real conectado** — Laravel REST API via axios. Configurar `VITE_API_BASE_URL` en `.env`.
2. **Normalización obligatoria** — El backend usa `id_sedes`, `id_canchas`, `estado` etc. Siempre pasar por `normalize*` en el service antes de guardar en el store.
3. **Campos lista vs detalle** — Algunos endpoints de lista no retornan relaciones (ej: canchas). Usar `getById` cuando se necesiten datos completos.
4. **Session Storage** — Auth state lives in localStorage key `matchx_session`. Token JWT adjuntado automáticamente por interceptor en `api.ts`.
5. **Dark Mode Default** — All interfaces designed for dark mode, light mode TODO.
6. **Mobile First** — Delegado views optimized for 360px+ phones on cancha.
7. **Offline Critical** — Delegado puede perder conexión; eventos se guardan en IndexedDB y sincronizan al reconectar.

---

**Last Updated**: 2026-04-06
**Completed**: Hitos 0–6. Backend conectado en Auth + Sedes.
**Next Focus**: Conectar stores restantes al backend (Torneos, Equipos, Jugadores, Partidos, Modalidades, Usuarios)
**Skills Used**: interface-design, vue-best-practices, ui-ux-pro-max
