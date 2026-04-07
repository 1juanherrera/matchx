<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEquiposStore, type Equipo } from '@/stores/equipos'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { Users, Plus, Pencil, ShieldAlert, X } from 'lucide-vue-next'

const store = useEquiposStore()

const showModal  = ref(false)
const isEditing  = ref(false)
const editingId  = ref<number | null>(null)
const saveError  = ref('')

// ── Colores dinámicos ───────────────────────────────────────────
// El primero siempre existe; los demás se agregan/quitan
const MAX_COLORS = 4
const colorFields = ['color_principal', 'color_secundario', 'color_terciario', 'color_cuaternario'] as const
type ColorField = typeof colorFields[number]

const colors = ref<string[]>(['#1a56db'])

const addColor    = () => { if (colors.value.length < MAX_COLORS) colors.value.push('#ffffff') }
const removeColor = (i: number) => { if (i > 0) colors.value.splice(i, 1) }

// Convierte array → campos del modelo
const colorsToPayload = (): Pick<Equipo, ColorField> => ({
  color_principal:   colors.value[0] ?? '',
  color_secundario:  colors.value[1] ?? '',
  color_terciario:   colors.value[2] ?? '',
  color_cuaternario: colors.value[3] ?? '',
})

// Construye array desde el equipo (omite vacíos salvo el primero)
const colorsFromEquipo = (equipo: Equipo): string[] => {
  const list = [
    equipo.color_principal   || '#1a56db',
    equipo.color_secundario,
    equipo.color_terciario,
    equipo.color_cuaternario,
  ].filter((c, i) => i === 0 || !!c) as string[]
  return list
}

// Gradiente dinámico para preview
const previewGradient = (cols: string[]) => {
  if (cols.length === 1) return cols[0]
  const pct = 100 / cols.length
  return `linear-gradient(90deg, ${cols.map((c, i) => `${c} ${i * pct}%, ${c} ${(i + 1) * pct}%`).join(', ')})`
}

// ── Form base ───────────────────────────────────────────────────
const formData = ref({
  nombre:        '',
  nombre_corto:  '',
  capitan_nombre:'',
  escudo_url:    '',
  activo:        1,
  torneo_id:     0,
})

onMounted(() => store.fetchEquipos())

const openNew = () => {
  isEditing.value = false
  editingId.value = null
  saveError.value = ''
  colors.value    = ['#1a56db']
  formData.value  = { nombre: '', nombre_corto: '', capitan_nombre: '', escudo_url: '', activo: 1, torneo_id: 0 }
  showModal.value = true
}

const openEdit = (equipo: Equipo) => {
  isEditing.value = true
  editingId.value = equipo.id
  saveError.value = ''
  colors.value    = colorsFromEquipo(equipo)
  formData.value  = {
    nombre:         equipo.nombre,
    nombre_corto:   equipo.nombre_corto,
    capitan_nombre: equipo.capitan_nombre,
    escudo_url:     equipo.escudo_url,
    activo:         equipo.activo,
    torneo_id:      equipo.torneo_id,
  }
  showModal.value = true
}

const saveEquipo = async () => {
  if (!formData.value.nombre.trim()) return
  saveError.value = ''
  const payload = { ...formData.value, ...colorsToPayload() }
  try {
    if (isEditing.value && editingId.value !== null) {
      await store.actualizarEquipo(editingId.value, payload)
    } else {
      await store.crearEquipo(payload)
    }
    showModal.value = false
  } catch (err: any) {
    saveError.value = err.response?.data?.message ?? err.message ?? 'Error al guardar el equipo'
  }
}

const toggleActivo = (equipo: Equipo) => {
  store.actualizarEquipo(equipo.id, { activo: equipo.activo === 1 ? 0 : 1 })
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Equipos</h1>
        <p class="text-matchx-text-muted mt-1">Registro y gestión de equipos</p>
      </div>
      <AppButton variant="primary" @click="openNew">
        <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" />
        Nuevo Equipo
      </AppButton>
    </div>

    <!-- Skeleton -->
    <div v-if="store.loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="i in 4" :key="i" :hover="false">
        <div class="animate-pulse space-y-3">
          <div class="flex gap-3">
            <div class="w-14 h-14 bg-matchx-bg-elevated rounded-lg shrink-0" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-4 bg-matchx-bg-elevated rounded w-3/4" />
              <div class="h-3 bg-matchx-bg-elevated rounded w-1/2" />
            </div>
          </div>
          <div class="h-8 bg-matchx-bg-elevated rounded" />
        </div>
      </AppCard>
    </div>

    <!-- Empty -->
    <div v-else-if="store.equipos.length === 0"
         class="border border-dashed border-matchx-border-base rounded-lg py-16 flex flex-col items-center gap-3">
      <Users class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay equipos registrados</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Crea el primer equipo para poder inscribirlo en torneos</p>
      </div>
      <AppButton variant="primary" size="sm" @click="openNew">
        <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" />
        Nuevo Equipo
      </AppButton>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard v-for="equipo in store.equipos" :key="equipo.id">

        <div class="flex items-center gap-3 mb-4">
          <!-- Avatar -->
          <div
            v-if="equipo.escudo_url"
            class="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-matchx-bg-elevated"
          >
            <img :src="equipo.escudo_url" :alt="equipo.nombre" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-14 h-14 rounded-xl shrink-0 flex items-center justify-center font-bold text-white text-xl select-none"
            :style="{ background: `linear-gradient(135deg, ${equipo.color_principal || '#1a56db'}, ${equipo.color_secundario || '#aaa'})` }"
          >
            {{ equipo.nombre_corto || equipo.nombre.slice(0, 2).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="font-semibold text-matchx-text-primary truncate">{{ equipo.nombre }}</div>
            <div class="text-xs text-matchx-text-muted truncate">
              {{ equipo.nombre_corto || '—' }}
              <span v-if="equipo.capitan_nombre"> · {{ equipo.capitan_nombre }}</span>
            </div>
          </div>
        </div>

        <!-- Colores -->
        <div class="flex items-center gap-1.5 mb-4">
          <template v-for="(cf, i) in colorFields" :key="cf">
            <div
              v-if="equipo[cf]"
              class="w-5 h-5 rounded-full border border-matchx-border-base shrink-0"
              :style="{ backgroundColor: equipo[cf] }"
              :title="['Principal','Secundario','Terciario','Cuaternario'][i]"
            />
          </template>
          <div class="flex-1 h-3 rounded-full ml-1 overflow-hidden">
            <div class="w-full h-full" :style="{ background: previewGradient(colorsFromEquipo(equipo)) }" />
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" size="sm" @click="openEdit(equipo)">
            <Pencil class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
            Editar
          </AppButton>
          <!-- Toggle activo — mismo patrón que el resto del proyecto -->
          <button
            type="button"
            :class="[
              'flex items-center gap-2 px-4 rounded-lg border transition-colors duration-200 cursor-pointer',
              equipo.activo === 1
                ? 'border-matchx-border-base'
                : 'border-matchx-border-base bg-matchx-bg-base/20',
            ]"
            @click="toggleActivo(equipo)"
          >
            <div :class="['relative w-8 h-5 rounded-full transition-colors duration-200 shrink-0', equipo.activo === 1 ? 'bg-matchx-accent-green' : 'bg-matchx-border-base']">
              <span :class="['absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', equipo.activo === 1 ? 'translate-x-3' : 'translate-x-0']" />
            </div>
          </button>
        </div>

      </AppCard>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Equipo' : 'Nuevo Equipo'"
      size="md"
      @update:open="showModal = $event"
    >
      <div class="space-y-3">

        <!-- Nombre + nombre corto -->
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <AppInput v-model="formData.nombre" label="Nombre del equipo" placeholder="ej: Junior FC" required />
          </div>
          <AppInput v-model="formData.nombre_corto" label="Nombre Corto" placeholder="JUN" />
        </div>

        <!-- Capitán -->
        <AppInput v-model="formData.capitan_nombre" label="Capitán" placeholder="ej: Carlos Pérez" />

        <!-- Colores dinámicos -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider">Colores</p>
            <button
              v-if="colors.length < MAX_COLORS"
              type="button"
              class="flex items-center gap-1 text-xs text-matchx-accent-green hover:text-matchx-accent-green/80 transition-colors cursor-pointer"
              @click="addColor"
            >
              <Plus class="w-3 h-3" :stroke-width="2.5" />
              Añadir color
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="(color, i) in colors"
              :key="i"
              class="flex items-center gap-2"
            >
              <span class="text-xs text-matchx-text-muted w-16 shrink-0">
                {{ i === 0 ? 'Principal' : i === 1 ? 'Secundario' : i === 2 ? 'Terciario' : 'Cuaternario' }}
              </span>
              <input
                v-model="colors[i]"
                type="color"
                class="w-8 h-8 rounded-lg border border-matchx-border-base cursor-pointer bg-transparent p-0.5 shrink-0"
              />
              <span class="text-xs font-mono text-matchx-text-muted flex-1">{{ color }}</span>
              <button
                v-if="i > 0"
                type="button"
                class="p-1 rounded text-matchx-text-muted hover:text-matchx-accent-orange hover:bg-matchx-accent-orange/10 transition-colors cursor-pointer shrink-0"
                @click="removeColor(i)"
              >
                <X class="w-3.5 h-3.5" :stroke-width="2" />
              </button>
              <div v-else class="w-[26px] shrink-0" />
            </div>
          </div>

          <!-- Preview banda -->
          <div class="mt-2 h-5 rounded-md overflow-hidden">
            <div class="w-full h-full" :style="{ background: previewGradient(colors) }" />
          </div>
        </div>

        <!-- URL Escudo -->
        <AppInput v-model="formData.escudo_url" label="URL del escudo (opcional)" placeholder="https://..." />

        <p v-if="saveError" class="text-sm text-matchx-accent-orange flex items-center gap-1.5">
          <ShieldAlert class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
          {{ saveError }}
        </p>
      </div>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveEquipo">
            {{ isEditing ? 'Actualizar' : 'Crear Equipo' }}
          </AppButton>
        </div>
      </template>
    </AppModal>

  </div>
</template>
