# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**matchX** — Sistema gestor de sedes, partidos y torneos de fútbol para el mercado colombiano.

- **Tech Stack**: Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + TypeScript
- **Architecture**: SPA modular con 7 roles y 8 módulos funcionales
- **Status**: Hito 0 completado (fundamentos), iniciando Hito 1 (Admin Sistema)
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
│   └── index.ts            ← Vue Router with auth guards
├── stores/
│   └── auth.ts             ← Pinia auth store (session, roles, perms)
├── layouts/
│   ├── AppLayout.vue       ← Sidebar + topbar (admin/operational)
│   ├── AuthLayout.vue      ← Centered login/error layout
│   ├── PublicLayout.vue    ← Simple navbar (público)
│   └── DelegadoLayout.vue  ← Mobile-first mesa de control
├── views/
│   ├── auth/
│   │   ├── LoginView.vue   ← Mock login with 7 users
│   │   └── NoAutorizadoView.vue
│   ├── admin-sistema/
│   │   └── DashboardView.vue
│   ├── admin-torneo/       ← (TODO: Hito 2)
│   ├── delegado/           ← (TODO: Hito 3 — CRITICAL)
│   ├── admin-sede/         ← (TODO: Hito 4)
│   ├── arbitro/            ← (TODO: Hito 5)
│   ├── capitan/            ← (TODO: Hito 5)
│   └── publico/            ← (TODO: Hito 6)
├── components/
│   ├── ui/                 ← Atoms: Button, Input, Badge, Modal, etc.
│   ├── forms/              ← Form components
│   ├── tables/             ← DataTable, TablaposicionesTable
│   ├── partido/            ← Partido-specific: Marcador, Cronometro, EventoButton
│   └── shared/             ← RolBadge, OfflineBanner, SyncIndicator
├── composables/
│   ├── useAuth.ts          ← Auth logic (TODO)
│   ├── usePartidoEnVivo.ts ← Live match logic (TODO)
│   ├── useOfflineQueue.ts  ← Offline events queue (TODO)
│   └── usePDF.ts           ← Report generation (TODO)
├── services/
│   ├── api.ts              ← Mock/real API abstraction
│   ├── storage.ts          ← localStorage + IndexedDB
│   └── sync.ts             ← Offline → online sync
└── data/
    └── mocks/
        ├── usuarios.json           ✅ Created
        ├── torneos.json            (TODO)
        ├── equipos.json            (TODO)
        ├── jugadores.json          (TODO)
        ├── partidos.json           (TODO)
        ├── eventos_partido.json    (TODO)
        ├── ...21 total JSON files  (TODO)
```

---

## Key Decisions

### Authentication
- **Mock login** with 7 predefined users (one per role)
- Session persisted to `localStorage` key: `matchx_session`
- Guards check role on every route transition

### Design System
- **Dark Mode OLED**: `#0f1923` base, `#00d4aa` accent green, `#ff6b35` accent orange
- **Typography**: Fira Code (headings) + Fira Sans (body)
- **Depth**: Borders + minimal shadows (elevation scale)
- **Responsive**: Mobile-first, sidebar collapses on small screens

### State Management
- **Pinia stores** per domain: `auth.ts`, `torneos.ts`, `partidos.ts`, etc.
- **Composables** for feature-specific logic (not yet implemented)
- **API abstraction** in `src/services/api.ts` — single source of truth for mock vs real API

### Offline Architecture (TODO)
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

// In component:
import { useYourFeatureStore } from '@/stores/yourFeature'
const store = useYourFeatureStore()
```

### 3. New JSON Mock
```json
// src/data/mocks/yourEntity.json
[{ id: 1, name: "example", /* ... */ }]

// In src/services/api.ts, add:
export async function getYourData() {
  if (USE_MOCK) {
    const data = await import('@/data/mocks/yourEntity.json')
    return data.default
  }
  return fetch('/api/your-endpoint').then(r => r.json())
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
- **Components**: `src/components/UI/AppButton.vue` (UI atoms with App prefix)
- **Views**: `src/views/role-area/ViewName.vue`
- **Layouts**: `src/layouts/LayoutName.vue`

### TypeScript
- Interfaces: `interface UserRole { ... }`
- Types: `type UserRoleString = 'admin' | 'user'`
- Enums: avoid, use type unions instead

### CSS
- Dark mode → use Tailwind classes: `bg-matchx-bg-base`, `text-matchx-accent-green`
- Custom colors in `tailwind.config.js` theme extend
- Scoped styles for component-specific behavior only

---

## Development Workflow

### Before Coding
1. **Check the plan** → `C:\Users\juans\.claude\plans\fizzy-wandering-prism.md`
2. **Load skills** — `interface-design`, `vue-best-practices`, `ui-ux-pro-max`
3. **Explore domain** — Intent, colors, signature, before proposing UI

### During Coding
1. **Composition API** + `<script setup>` is standard
2. **Props down, events up** — explicit data flow
3. **One responsibility per component** — split if 3+ sections
4. **No hardcoded values** — use composables or stores

### Before Completing
1. **Run `npm run build`** — check for TS errors
2. **Test all routes** — especially role-based access
3. **Check dark mode** — visual consistency
4. **Test on mobile** — 375px viewport minimum

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

## Known Issues & TODOs

### Hito 0 ✅ COMPLETE
- [x] Vite + Vue 3 + TypeScript setup
- [x] Tailwind dark mode configured
- [x] 4 layouts created
- [x] Vue Router with auth guards
- [x] Pinia auth store
- [x] Mock login view (7 users/roles)
- [x] usuarios.json mock data

### Hito 1 (Admin Sistema) — TODO
- [ ] UsuariosView (CRUD)
- [ ] ModalidadesView (F5, F7, F11)
- [ ] SedesView + canchas
- [ ] ConfiguracionView (key-value)
- [ ] DashboardView enhancements (metrics, stats)

### Hito 3 (Delegado Mesa de Control) — CRITICAL
- [ ] EnVivoView (mobile-first, 4 buttons, timeline)
- [ ] Cronómetro widget
- [ ] Marcador widget
- [ ] Offline queue + IndexedDB

### Later
- [ ] PWA + Service Worker
- [ ] Reports PDF (jsPDF + html2canvas)
- [ ] WebSocket for real-time (future backend)
- [ ] Tests (Vitest)

---

## Resources

- **Mockup data**: `src/data/mocks/*.json` (22 files total)
- **Schema reference**: `explorador_tablas_torneos.html` (open in browser)
- **DB Model**: `sistema_torneos.mwb` (MySQL Workbench file)
- **Design specs**: `.claude/skills/ui-ux-pro-max/` (design system database)
- **Plan**: `.claude/plans/fizzy-wandering-prism.md` (detailed architecture)

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
5. **Offline Critical** — Delegado can lose connection, must queue events locally

---

**Last Updated**: 2026-03-30 (Hito 0 complete)
**Next Focus**: Hito 1 — Admin Sistema views
**Skills Used**: interface-design, vue-best-practices, ui-ux-pro-max
