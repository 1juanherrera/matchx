# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**matchX** — Sistema gestor de sedes, partidos y torneos de fútbol para el mercado colombiano.

- **Tech Stack**: Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + TypeScript
- **Architecture**: SPA modular con 8 roles y 12+ módulos funcionales
- **Status**: Hitos 0–7 completados. MSW implementado para desarrollo. Backend real conectado solo en Auth + Sedes.
- **Model**: 20 tablas relacionales definidas en `sistema_torneos.mwb`
- **Backend**: API REST real (Laravel). Variable de entorno `VITE_API_BASE_URL` en `.env`.
- **Mock layer**: MSW (Mock Service Worker) en `src/mocks/` — intercepta todas las llamadas API para desarrollo.

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

# Token Efficient Rules

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
├── main.ts                 ← App entry point (inicializa MSW en dev)
├── App.vue                 ← Root component con RouterView
├── style.css               ← Tailwind + custom styles
├── router/
│   └── index.ts            ← Vue Router con guards por rol
├── mocks/                  ← MSW — intercepta llamadas API en desarrollo
│   ├── browser.ts          ← Setup del service worker
│   ├── index.ts            ← Exporta setupMocks()
│   ├── db/
│   │   └── index.ts        ← In-memory DB seeded desde data/mocks/*.json
│   ├── handlers/           ← Un handler por dominio
│   │   ├── index.ts        ← Spread de todos los handlers
│   │   ├── auth.handlers.ts
│   │   ├── comunicados.handlers.ts
│   │   ├── equipos.handlers.ts
│   │   ├── eventos.handlers.ts
│   │   ├── inscripciones.handlers.ts
│   │   ├── jugadores.handlers.ts
│   │   ├── modalidades.handlers.ts
│   │   ├── partidos.handlers.ts
│   │   ├── sedes.handlers.ts
│   │   ├── solicitudes.handlers.ts
│   │   ├── torneos.handlers.ts
│   │   └── usuarios.handlers.ts
│   └── utils/
│       ├── response.ts     ← mockOk / mockCreated / mockNotFound / mockError
│       └── routes.ts       ← Prepend VITE_API_BASE_URL a rutas
├── services/               ← Capa de API (axios) — apunta al backend real o MSW
│   ├── api.ts              ← Instancia axios + interceptor JWT + redirect 401
│   ├── auth.service.ts
│   ├── asistencias.service.ts
│   ├── comunicados.service.ts
│   ├── equipos.service.ts
│   ├── eventos.service.ts
│   ├── inscripciones.service.ts
│   ├── jugadores.service.ts
│   ├── modalidades.service.ts
│   ├── multas-equipo.service.ts
│   ├── pagos.service.ts
│   ├── partidos.service.ts
│   ├── sanciones.service.ts
│   ├── sedes.service.ts
│   ├── torneos.service.ts
│   └── usuarios.service.ts
├── stores/
│   ├── auth.ts             ← Pinia auth store (session, roles, perms, select_profile)
│   ├── asistencias.ts      ← Asistencias a partidos
│   ├── comunicados.ts      ← Comunicados del tablón (sort urgentes+fecha)
│   ├── configuracion.ts    ← Key-value configuración global
│   ├── delegado.ts         ← Estado offline/sync del delegado
│   ├── equipos.ts          ← CRUD equipos + equiposPorTorneo computed
│   ├── jugadores.ts        ← CRUD jugadores + jugadoresPorEquipo computed
│   ├── modalidades.ts      ← Modalidades (F5, F7, F11)
│   ├── multas-equipo.ts    ← Multas por equipo
│   ├── pagos.ts            ← Pagos / tesorería
│   ├── partidos.ts         ← CRUD partidos + proximosPartidos + partidosPorTorneo
│   ├── sanciones.ts        ← Sanciones a jugadores
│   ├── sedes.ts            ← CRUD sedes + canchas
│   ├── torneos.ts          ← CRUD torneos + torneosActivos
│   └── usuarios.ts         ← CRUD usuarios del sistema
├── composables/
│   ├── useArbitrosDisponibilidad.ts
│   └── useTheme.ts         ← Dark/light toggle
├── layouts/
│   ├── AppLayout.vue       ← Sidebar + topbar con nav por rol (8 roles)
│   ├── AuthLayout.vue      ← Centered login/error layout
│   ├── PublicLayout.vue    ← Simple navbar público
│   └── DelegadoLayout.vue  ← Mobile-first mesa de control
├── views/
│   ├── auth/
│   │   ├── LoginView.vue           ← Login real con select_profile flow
│   │   └── NoAutorizadoView.vue
│   ├── admin-sistema/              ✅ HITO 1 COMPLETO
│   │   ├── DashboardView.vue
│   │   ├── UsuariosView.vue        ← CRUD usuarios
│   │   ├── ModalidadesView.vue     ← CRUD modalidades
│   │   ├── SedesView.vue           ← CRUD sedes + canchas (modal dual)
│   │   └── ConfiguracionView.vue  ← Key-value config
│   ├── admin-torneo/               ✅ HITO 2+ COMPLETO
│   │   ├── TorneoDashboardView.vue ← Métricas, torneos, próximos partidos
│   │   ├── TorneosView.vue         ← CRUD torneos
│   │   ├── EquiposView.vue         ← Gestión de equipos
│   │   ├── InscripcionesView.vue   ← Inscripciones por torneo (progress bar cupos)
│   │   ├── PlantillaView.vue       ← Jugadores por equipo
│   │   ├── PartidosView.vue        ← Calendario partidos
│   │   ├── ActaPartidoView.vue     ← Acta de partido (/torneo/partidos/:id/acta)
│   │   ├── EstadisticasView.vue    ← Estadísticas y goleadores
│   │   ├── SolicitudesView.vue     ← Solicitudes de inscripción/transferencia
│   │   ├── SancionesView.vue       ← Sanciones a jugadores
│   │   ├── ComunicadosView.vue     ← Tablón (lista + periódico toggle, CRUD)
│   │   └── TesoreriaView.vue       ⚠️ ARCHIVO EXISTE pero SIN RUTA en router
│   ├── admin-sede/                 ✅ HITO 4 COMPLETO
│   │   ├── SedeDashboardView.vue
│   │   ├── CanchasView.vue
│   │   └── CalendarioView.vue
│   ├── arbitro/                    ✅ HITO 5 COMPLETO
│   │   ├── ArbitroDashboardView.vue
│   │   └── MisPartidosView.vue
│   ├── capitan/                    ✅ HITO 5+ COMPLETO
│   │   ├── CapitanDashboardView.vue
│   │   ├── MiEquipoView.vue
│   │   ├── FixtureView.vue
│   │   ├── PosicionesView.vue      ← Tabla de posiciones del torneo
│   │   ├── GoleadoresView.vue      ← Tabla de goleadores
│   │   ├── SancionesView.vue       ← Sanciones del equipo (solo capitán)
│   │   ├── PerfilView.vue          ← Perfil del jugador/capitán
│   │   └── ComunicadosView.vue     ← Tablón periódico (solo lectura)
│   ├── delegado/                   ✅ HITO 3 COMPLETO
│   │   ├── MisPartidosView.vue
│   │   └── EnVivoView.vue
│   └── publico/                    ✅ HITO 6 COMPLETO
│       ├── TorneosPublicoView.vue
│       ├── PosicionesPublicoView.vue
│       ├── FixturePublicoView.vue
│       ├── GoleadoresPublicoView.vue
│       ├── SedesPublicoView.vue
│       └── PartidoDetallePublicoView.vue
├── components/
│   ├── auth/               ← Componentes del flujo de login
│   │   ├── LoginForm.vue
│   │   ├── ProfileSelector.vue
│   │   ├── RoleSelector.vue
│   │   ├── FieldCard.vue
│   │   └── PlayerCard.vue
│   └── ui/
│       ├── AppButton.vue      ← Variants: primary/secondary/ghost/danger + sizes
│       ├── AppInput.vue
│       ├── AppSelect.vue
│       ├── AppCard.vue        ← hover prop
│       ├── AppBadge.vue       ← dot/pulse props, variants: green/orange/blue/gray
│       ├── AppModal.vue       ← size prop (sm/md/lg)
│       ├── AppDataTable.vue   ← sortable, slots por columna, empty slot
│       └── PartidoCard.vue    ← Card reutilizable para partido
└── data/
    └── mocks/              ← JSON seed data para MSW (YA NO SON MOCK DIRECTOS)
        ├── comunicados.json
        ├── configuracion_sistema.json
        ├── equipos.json
        ├── eventos.json
        ├── inscripciones.json
        ├── jugadores.json
        ├── modalidades.json
        ├── partidos.json
        ├── sedes.json
        ├── solicitudes.json
        ├── torneos.json
        └── usuarios.json
```

---

## Usuarios de Prueba

> Login contra `/api/login`. Soporta flujo `select_profile` cuando un usuario tiene múltiples roles.

| Usuario | Correo | Rol | Ruta inicial |
|---------|--------|-----|--------------|
| Carlos Administrador | carlos@matchx.com | superadmin | /admin/dashboard |
| Ana Admin Torneo | ana@matchx.com | admin_torneo | /torneo/dashboard |
| Juan Admin Sede | juan@matchx.com | admin_sede | /sede/dashboard |
| Miguel Delegado | miguel@matchx.com | delegado | /delegado/partidos |
| Pedro Árbitro | pedro@matchx.com | arbitro | /arbitro/dashboard |
| Luis Capitán | luis@matchx.com | jugador (isCapitan=true) | /capitan/dashboard |
| Felipe Jugador | jugador@matchx.com | jugador | /capitan/dashboard |
| Usuario Público | publico@matchx.com | publico | /publico/torneos |

> **Nota**: No existe un rol separado `capitan`. Los capitanes tienen `rol = 'jugador'` con `isCapitan = true`. Las rutas `/capitan/*` usan `requiereRol: ['jugador']`.

---

## Rutas Implementadas

```
/login                            → LoginView
/no-autorizado                    → NoAutorizadoView

/admin/dashboard                  → superadmin
/admin/usuarios
/admin/modalidades
/admin/sedes
/admin/configuracion

/torneo/dashboard                 → admin_torneo
/torneo/torneos
/torneo/equipos
/torneo/inscripciones
/torneo/plantilla
/torneo/partidos
/torneo/partidos/:id/acta         → ActaPartidoView
/torneo/estadisticas              → EstadisticasView (goleadores + stats)
/torneo/solicitudes
/torneo/sanciones
/torneo/comunicados

/sede/dashboard                   → admin_sede
/sede/canchas
/sede/calendario

/arbitro/dashboard                → arbitro
/arbitro/partidos

/capitan/dashboard                → jugador (+ capitan)
/capitan/equipo
/capitan/fixture
/capitan/posiciones
/capitan/goleadores
/capitan/sanciones                → solo capitan (isCapitan=true)
/capitan/perfil
/capitan/comunicados
/capitan/partidos/:id             → PartidoDetallePublicoView reutilizado

/delegado/partidos                → delegado
/delegado/en-vivo/:id            → DelegadoLayout

/publico/torneos                  → público (sin login)
/publico/posiciones
/publico/fixture
/publico/goleadores
/publico/sedes
/publico/partidos/:id
```

---

## ⚠️ Gaps Conocidos

Cosas que existen en código pero están incompletas o rotas:

| Problema | Detalle |
|----------|---------|
| `TesoreriaView.vue` sin ruta | El archivo existe en `admin-torneo/` pero no tiene entrada en el router ni en el nav |
| Stores sin MSW handler | `sanciones`, `pagos`, `multas-equipo`, `asistencias` tienen store y service pero **no tienen handler en `src/mocks/handlers/`** — las vistas que los usen devuelven error 404 en dev |
| Backend pendiente | Solo Auth + Sedes apuntan al backend real. El resto usa MSW |
| Light mode | TODO — todo el sistema está diseñado para dark mode |
| PWA / Service Worker | Pendiente de implementar |
| Tests | Vitest no configurado |
| `PosicionesView.vue` admin_torneo | Eliminada (era redundante con EstadisticasView). El nav del admin_torneo apunta correctamente a `/torneo/estadisticas` |

---

## MSW Architecture

MSW intercepta **todas** las llamadas en desarrollo. El flujo es:

```
Componente → store → service (axios) → MSW handler → in-memory DB → response
```

### In-memory DB (`src/mocks/db/index.ts`)
- Seeded desde `src/data/mocks/*.json` al arrancar
- Contador autoincremental por entidad (`nextId('comunicados')`)
- Mutaciones persistentes durante la sesión (se resetea al recargar)

### Response helpers (`src/mocks/utils/response.ts`)
```ts
mockOk(data)         // 200
mockCreated(data)    // 201
mockNotFound()       // 404
mockError(msg, 500)  // 5xx
```

### Rutas (`src/mocks/utils/routes.ts`)
Prepend automático de `VITE_API_BASE_URL` a todos los paths del handler.

### Agregar un nuevo handler
```ts
// src/mocks/handlers/miEntidad.handlers.ts
import { http } from 'msw'
import { db, nextId } from '@/mocks/db'
import { route } from '@/mocks/utils/routes'
import { mockOk, mockCreated } from '@/mocks/utils/response'

export const miEntidadHandlers = [
  http.get(route('/api/mi-entidad'), () => mockOk(db.miEntidad)),
  http.post(route('/api/mi-entidad'), async ({ request }) => {
    const body = await request.json() as any
    const nuevo = { id: nextId('miEntidad'), ...body }
    db.miEntidad.push(nuevo)
    return mockCreated(nuevo)
  }),
]
// Luego agregar ...miEntidadHandlers en src/mocks/handlers/index.ts
```

---

## Key Decisions

### Authentication
- Login real contra API (`/api/login`). Soporta flujo `select_profile` (2 pasos).
- Session persisted en localStorage: `matchx_session`
- Guards revisan rol en cada transición de ruta
- `initSession()` solo se llama en rutas protegidas para evitar race conditions
- **CRÍTICO**: `handleLogout` debe ser `async/await` — si no, `router.push('/login')` dispara antes de que `user.value = null` y el guard rebota al dashboard.

### Roles y permisos
- `capitan` NO es un rol separado. Es `rol = 'jugador'` con `authStore.isCapitan === true`
- Las rutas `/capitan/*` usan `requiereRol: ['jugador']`
- El nav en AppLayout muestra `Sanciones` solo cuando `authStore.isCapitan`

### Design System
- **Dark Mode OLED**: `#0f1923` base, `#00d4aa` accent green, `#ff6b35` accent orange
- **Typography**: Fira Code (headings mono) + Fira Sans (body)
- **Depth**: Borders + minimal shadows (elevation scale)
- **Responsive**: Mobile-first, sidebar collapses en pantallas pequeñas
- **Iconos**: Lucide Vue Next (ya instalado)

### Comunicados — sort rule
```ts
// Urgentes primero, dentro de cada grupo más recientes primero
(a, b) => {
  if (a.tipo === 'urgente' && b.tipo !== 'urgente') return -1
  if (a.tipo !== 'urgente' && b.tipo === 'urgente') return 1
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
}
```
Se aplica tanto en `fetchComunicados` como en `crearComunicado`.

### Newspaper layout (Comunicados)
```
lista[0] → hero      (lg:col-span-2 cuando hay secondary, full-width si no)
lista[1] → secondary (lg:col-span-1)
lista[2+] → grid 3-col
```
- El grid portada recibe `lg:grid-cols-3` SOLO cuando `secondary !== null`
- Items solos en su fila del grid resto usan `restoItemClass(index)`:
  - Último en fila de 3 → `lg:col-span-3`
  - Último en fila de 2 (sm) → `sm:col-span-2`

### State Management
- **Pinia stores** por dominio — Composition API style (`defineStore(() => { ... })`)
- Getters filtrados usan `computed(() => (param) => filter...)` — se llaman SIN `.value` desde el template
- Los stores consumen `src/services/*.service.ts` vía axios → MSW lo intercepta en dev

### Integración con API (patrones críticos)

#### Normalización de respuestas
El backend Laravel usa snake_case con prefijos de tabla (`id_sedes`, `id_canchas`). Cada service tiene `normalize*` que mapea al modelo interno.

```ts
function normalizeSede(raw: any): Sede {
  return {
    id:      raw.id_sedes  ?? raw.id,
    activo:  raw.estado    ?? raw.activo ?? 1,
    canchas: (raw.canchas ?? []).map(normalizeCancha),
  }
}
```

#### Canchas incluidas solo en getById
`GET /api/torneos/sedes` (lista) NO incluye canchas. `fetchSedes` usa `Promise.all` + `getById`:
```ts
const lista = await sedesService.getAll()
sedes.value = await Promise.all(lista.map(s => sedesService.getById(s.id)))
```

#### Manejo de errores del API
Si el backend responde `{ status: 'error', message: '...' }` con HTTP 200, verificar explícitamente:
```ts
const body = res.data
if (body.status === 'error') throw new Error(body.message)
```

#### Formularios con errores del API
```ts
const saveSede = async () => {
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
  <template #cell-nombre="{ row, value }"><!-- custom cell --></template>
  <template #empty><!-- custom empty state --></template>
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

#### Avatares con iniciales
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

## Offline Architecture (Hito 3)
- **IndexedDB** para cache local de eventos del delegado (`dbAdd/dbGetAll/dbDelete`)
- **localStorage** para sesión + datos simples (`matchx_session`)
- **Cola de sync manual** — delegado registra eventos offline, se sincronizan al reconectar
- **Service Worker** (PWA) — pendiente

---

## How to Add a New Feature

### 1. New View
```ts
// 1. Crear src/views/role-area/YourView.vue
// 2. Agregar ruta en src/router/index.ts:
//    meta: { requiereRol: ['admin_torneo'], title: 'Título' }
// 3. Crear store si necesario: src/stores/yourFeature.ts
// 4. Crear service: src/services/yourFeature.service.ts
// 5. Crear handler MSW: src/mocks/handlers/yourFeature.handlers.ts
// 6. Agregar handler en src/mocks/handlers/index.ts
// 7. Agregar seed data en src/data/mocks/yourFeature.json
// 8. Agregar al db en src/mocks/db/index.ts
// 9. Agregar al nav en src/layouts/AppLayout.vue
```

### 2. New Store
```ts
// src/stores/yourFeature.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useYourFeatureStore = defineStore('yourFeature', () => {
  const items = ref<Item[]>([])
  const loading = ref(false)
  const fetchItems = async () => {
    loading.value = true
    try { items.value = await yourService.getAll() }
    finally { loading.value = false }
  }
  return { items, loading, fetchItems }
})
```

### 3. New Service
```ts
// src/services/yourEntity.service.ts
import api from './api'

function normalize(raw: any): Entity {
  return { id: raw.id_entity ?? raw.id, /* ... */ }
}

export const yourEntityService = {
  getAll:  async ()               => { const { data } = await api.get('/api/entity'); return (data.data ?? data).map(normalize) },
  create:  async (p: Payload)     => { const { data } = await api.post('/api/entity', p); return normalize(data.data ?? data) },
  update:  async (id: number, p)  => { const { data } = await api.put(`/api/entity/${id}`, p); return normalize(data.data ?? data) },
  delete:  async (id: number)     => api.delete(`/api/entity/${id}`),
}
```

---

## Naming Conventions

- **Stores**: `src/stores/featureName.ts` → `useFeatureNameStore`
- **Services**: `src/services/featureName.service.ts`
- **Composables**: `src/composables/useFeatureName.ts`
- **Components**: `src/components/ui/AppButton.vue` (UI atoms con prefijo `App`)
- **Views**: `src/views/role-area/ViewName.vue`
- **TypeScript**: interfaces > enums. Preferir type unions (`type Estado = 'a' | 'b'`).
- **CSS**: usar tokens `bg-matchx-bg-base`, `text-matchx-accent-green`. Sin hex hardcodeados.

---

## Development Workflow

### Before Coding
1. **Load skills** — `interface-design`, `vue-best-practices`, `ui-ux-pro-max`
2. **Read the service + store** del dominio antes de proponer cambios
3. **Verificar el handler MSW** — si no existe, crearlo antes de la vista

### During Coding
1. **Composition API** + `<script setup lang="ts">` es el estándar
2. **Props down, events up** — flujo de datos explícito
3. **One responsibility per component** — dividir si tiene 3+ secciones

### Before Completing
1. `npm run build` — debe pasar sin errores
2. **Verificar rutas** — que la ruta exista en router, que el nav apunte correctamente
3. **Check dark mode** — consistencia visual
4. **Test mobile** — viewport mínimo 375px

---

## Design System Specs

### Colors (Dark Mode)
| Var | Hex | Use |
|-----|-----|-----|
| `matchx-bg-base` | #0f1923 | Main background |
| `matchx-bg-surface` | #1a2533 | Cards, panels |
| `matchx-bg-elevated` | #243040 | Modals, dropdowns |
| `matchx-accent-green` | #00d4aa | Primary actions |
| `matchx-accent-orange` | #ff6b35 | Alerts, urgentes |
| `matchx-text-primary` | #f0f4f8 | Main text |
| `matchx-text-secondary` | #b8c5d6 | Secondary text |
| `matchx-text-muted` | #8899aa | Disabled, metadata |
| `matchx-border-base` | #2a3a4a | Standard borders |

### Typography
- **Heading**: Fira Code (monospace, technical feel)
- **Body**: Fira Sans (readable, friendly)
- **Line height**: 1.5–1.75 body text

### Spacing (base 4px)
`xs`:4 | `sm`:8 | `md`:12 | `lg`:16 | `xl`:24 | `2xl`:32 | `3xl`:48

### Border Radius
`xs`:4 | `sm`:6 | `md`:8 | `lg`:12 | `xl`:16

---

## Roadmap / Pendientes

- [ ] **Agregar MSW handlers faltantes**: `sanciones`, `pagos`, `multas-equipo`, `asistencias`
- [ ] **Rutear TesoreriaView**: agregar `/torneo/tesoreria` en router + nav
- [ ] **Conectar stores al backend real**: Torneos, Equipos, Jugadores, Partidos, etc.
- [ ] **PWA + Service Worker**
- [ ] **Reports PDF** (jsPDF + html2canvas)
- [ ] **WebSocket** para tiempo real en EnVivoView
- [ ] **Light mode**
- [ ] **Tests** (Vitest)

---

## Resources

- **API Base URL**: `.env` → `VITE_API_BASE_URL=http://...`
- **Schema reference**: `explorador_tablas_torneos.html`
- **DB Model**: `sistema_torneos.mwb` (MySQL Workbench)
- **Design specs**: `.claude/skills/ui-ux-pro-max/`
- **Skills**: `interface-design`, `vue-best-practices`, `ui-ux-pro-max`

---

**Last Updated**: 2026-04-16
**Completed**: Hitos 0–7. MSW completo (excepto sanciones/pagos/multas). Auth + Sedes en backend real.
**Skills Used**: interface-design, vue-best-practices, ui-ux-pro-max
