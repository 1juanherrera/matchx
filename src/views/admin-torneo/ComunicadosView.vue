<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useComunicadosStore, type Comunicado, type ComunicadoPayload } from '@/stores/comunicados'
import { useTorneosStore } from '@/stores/torneos'
import AppCard    from '@/components/ui/AppCard.vue'
import AppBadge   from '@/components/ui/AppBadge.vue'
import AppButton  from '@/components/ui/AppButton.vue'
import AppModal   from '@/components/ui/AppModal.vue'
import AppSelect  from '@/components/ui/AppSelect.vue'
import {
  Megaphone, Plus, Pencil, Trash2, AlertTriangle, Info, MessageSquare,
  CheckCircle, Trophy, Newspaper, LayoutList, ImageOff,
} from 'lucide-vue-next'

const comunicadosStore = useComunicadosStore()
const torneosStore     = useTorneosStore()

// ── Vista ──────────────────────────────────────────────────────────────────
const vista = ref<'lista' | 'periodico'>('lista')

// ── Filtros ────────────────────────────────────────────────────────────────
const filtroTipo = ref<'todos' | 'general' | 'urgente' | 'informativo'>('todos')
const tipos = [
  { key: 'todos',       label: 'Todos' },
  { key: 'urgente',     label: 'Urgentes' },
  { key: 'general',     label: 'Generales' },
  { key: 'informativo', label: 'Informativos' },
] as const

// ── Formulario ─────────────────────────────────────────────────────────────
const showModal        = ref(false)
const isEditing        = ref(false)
const editingId        = ref<number | null>(null)
const saveError        = ref('')
const saveLoading      = ref(false)
const saveDone         = ref(false)
const imagePreviewError = ref(false)

const form = ref<ComunicadoPayload>({
  titulo:     '',
  cuerpo:     '',
  tipo:       'general',
  torneo_id:  null,
  imagen_url: null,
})

watch(() => form.value.imagen_url, () => { imagePreviewError.value = false })

const tipoOptions = [
  { value: 'general',     label: 'General' },
  { value: 'urgente',     label: 'Urgente' },
  { value: 'informativo', label: 'Informativo' },
]

const torneoOptions = computed(() => [
  { value: '',  label: 'Todos los torneos' },
  ...torneosStore.torneos.map(t => ({ value: String(t.id), label: t.nombre })),
])

// ── Modal eliminar ─────────────────────────────────────────────────────────
const showConfirmDelete = ref(false)
const deleteTarget      = ref<Comunicado | null>(null)
const deleteLoading     = ref(false)
const deleteError       = ref('')

onMounted(async () => {
  await Promise.all([
    comunicadosStore.fetchComunicados(),
    torneosStore.fetchTorneos(),
  ])
})

// ── Computed ───────────────────────────────────────────────────────────────
const lista = computed(() => {
  if (filtroTipo.value === 'todos') return comunicadosStore.comunicados
  return comunicadosStore.comunicados.filter(c => c.tipo === filtroTipo.value)
})

const conteo = computed(() => ({
  todos:       comunicadosStore.comunicados.length,
  urgente:     comunicadosStore.comunicados.filter(c => c.tipo === 'urgente').length,
  general:     comunicadosStore.comunicados.filter(c => c.tipo === 'general').length,
  informativo: comunicadosStore.comunicados.filter(c => c.tipo === 'informativo').length,
}))

// Newspaper
const hero      = computed(() => lista.value[0] ?? null)
const secondary = computed(() => lista.value[1] ?? null)
const resto     = computed(() => lista.value.slice(2))

// ── Helpers visuales ───────────────────────────────────────────────────────
const tipoBadgeVariant = (tipo: Comunicado['tipo']) =>
  ({ urgente: 'orange', general: 'blue', informativo: 'green' } as const)[tipo]

const tipoIcon = (tipo: Comunicado['tipo']) =>
  ({ urgente: AlertTriangle, general: MessageSquare, informativo: Info } as const)[tipo]

const tipoIconBg = (tipo: Comunicado['tipo']) => ({
  urgente:     'bg-matchx-accent-orange/10 text-matchx-accent-orange',
  general:     'bg-blue-500/10 text-blue-400',
  informativo: 'bg-matchx-accent-green/10 text-matchx-accent-green',
} as const)[tipo]

const tipoAccentBorder = (tipo: Comunicado['tipo']) => ({
  urgente:     'border-l-[3px] border-l-matchx-accent-orange',
  general:     'border-l-[3px] border-l-blue-500',
  informativo: 'border-l-[3px] border-l-matchx-accent-green',
} as const)[tipo]

const tipoQuoteColor = (tipo: Comunicado['tipo']) => ({
  urgente:     'text-matchx-accent-orange',
  general:     'text-blue-400',
  informativo: 'text-matchx-accent-green',
} as const)[tipo]

const formatFecha = (iso: string) => new Date(iso).toLocaleDateString('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const formatFechaCorta = (iso: string) => new Date(iso).toLocaleDateString('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric',
})

const torneoNombre = (torneoId: number | null) => {
  if (!torneoId) return 'Todos los torneos'
  return torneosStore.torneos.find(t => t.id === torneoId)?.nombre ?? `Torneo #${torneoId}`
}

const restoItemClass = (index: number) => {
  const n = resto.value.length
  const classes: string[] = []
  if (n % 2 === 1 && index === n - 1) classes.push('sm:col-span-2')
  if (n % 3 === 1 && index === n - 1) classes.push('lg:col-span-3')
  return classes.join(' ')
}

// ── Acciones ───────────────────────────────────────────────────────────────
const openCrear = () => {
  isEditing.value  = false
  editingId.value  = null
  saveError.value  = ''
  saveDone.value   = false
  imagePreviewError.value = false
  form.value       = { titulo: '', cuerpo: '', tipo: 'general', torneo_id: null, imagen_url: null }
  showModal.value  = true
}

const openEditar = (c: Comunicado) => {
  isEditing.value  = true
  editingId.value  = c.id
  saveError.value  = ''
  saveDone.value   = false
  imagePreviewError.value = false
  form.value       = { titulo: c.titulo, cuerpo: c.cuerpo, tipo: c.tipo, torneo_id: c.torneo_id, imagen_url: c.imagen_url }
  showModal.value  = true
}

const guardar = async () => {
  if (!form.value.titulo.trim() || !form.value.cuerpo.trim()) {
    saveError.value = 'El título y el cuerpo son obligatorios'
    return
  }
  saveLoading.value = true
  saveError.value   = ''
  try {
    if (isEditing.value && editingId.value) {
      await comunicadosStore.actualizarComunicado(editingId.value, form.value)
    } else {
      await comunicadosStore.crearComunicado(form.value)
    }
    saveDone.value = true
  } catch (err: any) {
    saveError.value = err.message ?? 'Error al guardar el comunicado'
  } finally {
    saveLoading.value = false
  }
}

const cerrarModal = () => { showModal.value = false; saveDone.value = false }

const openEliminar = (c: Comunicado) => {
  deleteTarget.value = c
  deleteError.value  = ''
  showConfirmDelete.value = true
}

const confirmarEliminar = async () => {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value   = ''
  try {
    await comunicadosStore.eliminarComunicado(deleteTarget.value.id)
    showConfirmDelete.value = false
  } catch (err: any) {
    deleteError.value = err.message ?? 'Error al eliminar'
  } finally {
    deleteLoading.value = false
  }
}

const onTorneoChange = (val: string) => { form.value.torneo_id = val ? Number(val) : null }
const onImageUrlInput = (e: Event) => {
  form.value.imagen_url = (e.target as HTMLInputElement).value.trim() || null
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Tablón de Comunicados</h1>
        <p class="text-matchx-text-muted mt-1">Publica anuncios para equipos, capitanes y jugadores</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Toggle vista -->
        <div class="flex items-center rounded-lg border border-matchx-border-base overflow-hidden text-sm">
          <button
            :class="['flex items-center gap-1.5 px-3 py-1.5 transition-colors',
              vista === 'lista'
                ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
                : 'text-matchx-text-muted hover:text-matchx-text-primary hover:bg-matchx-bg-elevated']"
            @click="vista = 'lista'"
          >
            <LayoutList class="w-4 h-4" :stroke-width="1.75" />
            Lista
          </button>
          <div class="w-px h-5 bg-matchx-border-base" />
          <button
            :class="['flex items-center gap-1.5 px-3 py-1.5 transition-colors',
              vista === 'periodico'
                ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
                : 'text-matchx-text-muted hover:text-matchx-text-primary hover:bg-matchx-bg-elevated']"
            @click="vista = 'periodico'"
          >
            <Newspaper class="w-4 h-4" :stroke-width="1.75" />
            Periódico
          </button>
        </div>

        <AppButton @click="openCrear">
          <Plus class="w-4 h-4" :stroke-width="2" />
          Nuevo comunicado
        </AppButton>
      </div>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in tipos" :key="t.key"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          filtroTipo === t.key
            ? 'bg-matchx-accent-green/10 text-matchx-accent-green border border-matchx-accent-green/30'
            : 'bg-matchx-bg-surface text-matchx-text-secondary border border-matchx-border-base hover:border-matchx-accent-green/30',
        ]"
        @click="filtroTipo = t.key"
      >
        {{ t.label }} <span class="text-xs opacity-70">({{ conteo[t.key] }})</span>
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="comunicadosStore.loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-matchx-bg-surface animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="lista.length === 0"
         class="flex flex-col items-center gap-3 py-16 text-center">
      <Megaphone class="w-12 h-12 text-matchx-text-muted opacity-25" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">
        {{ filtroTipo === 'todos' ? 'No hay comunicados publicados' : `No hay comunicados de tipo "${filtroTipo}"` }}
      </p>
      <AppButton variant="secondary" size="sm" @click="openCrear">
        <Plus class="w-3.5 h-3.5" :stroke-width="2" />
        Crear el primero
      </AppButton>
    </div>

    <template v-else>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- VISTA LISTA                                                        -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <div v-if="vista === 'lista'" class="space-y-3">
        <AppCard v-for="c in lista" :key="c.id" :hover="false">
          <div class="flex items-start gap-4">

            <!-- Icono tipo -->
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tipoIconBg(c.tipo)]">
              <component :is="tipoIcon(c.tipo)" class="w-5 h-5" :stroke-width="1.75" />
            </div>

            <!-- Contenido -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="font-semibold text-matchx-text-primary">{{ c.titulo }}</span>
              </div>
              <p class="text-sm text-matchx-text-secondary leading-relaxed mb-2 line-clamp-2">{{ c.cuerpo }}</p>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-matchx-text-muted">
                <span class="flex items-center gap-1">
                  <Trophy class="w-3 h-3" :stroke-width="2" />
                  {{ torneoNombre(c.torneo_id) }}
                </span>
                <span>{{ c.creado_por_nombre }}</span>
                <span>{{ formatFecha(c.created_at) }}</span>
              </div>
            </div>

            <!-- Thumbnail imagen (si tiene) -->
            <div v-if="c.imagen_url"
                 class="w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-matchx-border-base">
              <img :src="c.imagen_url" :alt="c.titulo" class="w-full h-full object-cover" />
            </div>

            <!-- Acciones -->
            <div class="flex gap-2 shrink-0 mt-0.5">
              <button
                :aria-label="'Editar ' + c.titulo"
                class="p-2 rounded-lg text-matchx-text-muted hover:text-matchx-accent-green hover:bg-matchx-accent-green/10 transition-colors cursor-pointer"
                @click="openEditar(c)"
              >
                <Pencil class="w-4 h-4" :stroke-width="1.75" />
              </button>
              <button
                :aria-label="'Eliminar ' + c.titulo"
                class="p-2 rounded-lg text-matchx-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                @click="openEliminar(c)"
              >
                <Trash2 class="w-4 h-4" :stroke-width="1.75" />
              </button>
            </div>

          </div>
        </AppCard>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <!-- VISTA PERIÓDICO                                                    -->
      <!-- ═══════════════════════════════════════════════════════════════════ -->
      <div v-else class="space-y-6">

        <!-- Masthead -->
        <div class="border-y border-matchx-border-base py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[10px] font-mono text-matchx-text-muted uppercase tracking-[0.25em] mb-1">
                Comunicados Oficiales
              </p>
              <h2 class="text-3xl font-bold text-matchx-text-primary font-mono leading-none">matchX</h2>
              <p class="text-[10px] font-mono text-matchx-text-muted uppercase tracking-[0.2em] mt-1">
                Vista previa del tablón
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-[10px] font-mono text-matchx-text-muted uppercase tracking-wide">
                {{ new Date().toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' }) }}
              </p>
              <p class="text-[10px] font-mono text-matchx-text-muted mt-0.5">
                Edición N.° {{ comunicadosStore.comunicados.length }}
              </p>
            </div>
          </div>
        </div>

        <!-- Portada: hero + secondary -->
        <div :class="['grid grid-cols-1 gap-5', secondary ? 'lg:grid-cols-3' : '']">

          <!-- HERO -->
          <div class="lg:col-span-2">
            <div class="group relative">
              <!-- Hero CON imagen -->
              <div v-if="hero!.imagen_url"
                   class="rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
                <div class="relative overflow-hidden" style="aspect-ratio:16/7">
                  <img :src="hero!.imagen_url" :alt="hero!.titulo"
                       class="w-full h-full object-cover" />
                  <div :class="['absolute top-0 inset-x-0 h-1',
                    hero!.tipo === 'urgente' ? 'bg-matchx-accent-orange'
                    : hero!.tipo === 'informativo' ? 'bg-matchx-accent-green' : 'bg-blue-500']" />
                </div>
                <div class="p-5 lg:p-7">
                  <AppBadge :variant="tipoBadgeVariant(hero!.tipo)" :dot="hero!.tipo === 'urgente'" :pulse="hero!.tipo === 'urgente'">
                    {{ hero!.tipo }}
                  </AppBadge>
                  <h2 class="text-xl lg:text-2xl font-bold text-matchx-text-primary mt-2.5 leading-tight">{{ hero!.titulo }}</h2>
                  <p class="text-matchx-text-secondary text-sm mt-2 leading-relaxed">{{ hero!.cuerpo }}</p>
                  <p class="text-matchx-text-muted text-xs mt-3 font-mono uppercase tracking-wide">
                    {{ hero!.creado_por_nombre }} · {{ formatFechaCorta(hero!.created_at) }}
                  </p>
                </div>
              </div>
              <!-- Hero SIN imagen -->
              <div v-else
                   :class="['rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden', tipoAccentBorder(hero!.tipo)]">
                <div class="p-7 lg:p-9">
                  <div :class="['text-8xl font-black leading-none font-mono select-none opacity-[0.07]', tipoQuoteColor(hero!.tipo)]">"</div>
                  <AppBadge :variant="tipoBadgeVariant(hero!.tipo)" :dot="hero!.tipo === 'urgente'" :pulse="hero!.tipo === 'urgente'" class="mt-3">
                    {{ hero!.tipo }}
                  </AppBadge>
                  <h2 class="text-xl lg:text-2xl font-bold text-matchx-text-primary mt-3 leading-tight">{{ hero!.titulo }}</h2>
                  <p class="text-matchx-text-secondary text-sm mt-3 leading-relaxed">{{ hero!.cuerpo }}</p>
                  <p class="text-matchx-text-muted text-xs mt-5 font-mono uppercase tracking-wide">
                    {{ hero!.creado_por_nombre }} · {{ formatFechaCorta(hero!.created_at) }}
                  </p>
                </div>
              </div>
              <!-- Acciones hover -->
              <div class="absolute top-3 right-3 hidden group-hover:flex gap-1.5 z-10">
                <button class="p-1.5 rounded-md bg-matchx-bg-elevated/95 backdrop-blur-sm text-matchx-text-muted hover:text-matchx-accent-green transition-colors border border-matchx-border-base cursor-pointer" @click="openEditar(hero!)">
                  <Pencil class="w-3.5 h-3.5" :stroke-width="1.75" />
                </button>
                <button class="p-1.5 rounded-md bg-matchx-bg-elevated/95 backdrop-blur-sm text-matchx-text-muted hover:text-red-400 transition-colors border border-matchx-border-base cursor-pointer" @click="openEliminar(hero!)">
                  <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
                </button>
              </div>
            </div>
          </div>

          <!-- SECONDARY -->
          <div v-if="secondary" class="flex flex-col">
            <div class="group relative h-full">
              <!-- Secondary CON imagen -->
              <div v-if="secondary.imagen_url"
                   class="rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden h-full flex flex-col">
                <div class="overflow-hidden" style="aspect-ratio:16/9">
                  <img :src="secondary.imagen_url" :alt="secondary.titulo" class="w-full h-full object-cover" />
                </div>
                <div class="p-4 flex flex-col flex-1">
                  <AppBadge :variant="tipoBadgeVariant(secondary.tipo)" :dot="secondary.tipo === 'urgente'" :pulse="secondary.tipo === 'urgente'">
                    {{ secondary.tipo }}
                  </AppBadge>
                  <h3 class="font-bold text-matchx-text-primary mt-2.5 leading-snug">{{ secondary.titulo }}</h3>
                  <p class="text-matchx-text-secondary text-sm mt-2 leading-relaxed flex-1">{{ secondary.cuerpo }}</p>
                  <p class="text-matchx-text-muted text-xs mt-3 font-mono uppercase tracking-wide">
                    {{ formatFechaCorta(secondary.created_at) }}
                  </p>
                </div>
              </div>
              <!-- Secondary SIN imagen -->
              <div v-else
                   :class="['rounded-xl bg-matchx-bg-surface border border-matchx-border-base h-full p-5', tipoAccentBorder(secondary.tipo)]">
                <AppBadge :variant="tipoBadgeVariant(secondary.tipo)" :dot="secondary.tipo === 'urgente'" :pulse="secondary.tipo === 'urgente'">
                  {{ secondary.tipo }}
                </AppBadge>
                <h3 class="font-bold text-matchx-text-primary mt-3 text-lg leading-snug">{{ secondary.titulo }}</h3>
                <p class="text-matchx-text-secondary text-sm mt-2.5 leading-relaxed">{{ secondary.cuerpo }}</p>
                <p class="text-matchx-text-muted text-xs mt-4 font-mono uppercase tracking-wide">
                  {{ formatFechaCorta(secondary.created_at) }}
                </p>
              </div>
              <!-- Acciones hover -->
              <div class="absolute top-3 right-3 hidden group-hover:flex gap-1.5 z-10">
                <button class="p-1.5 rounded-md bg-matchx-bg-elevated/95 backdrop-blur-sm text-matchx-text-muted hover:text-matchx-accent-green transition-colors border border-matchx-border-base cursor-pointer" @click="openEditar(secondary)">
                  <Pencil class="w-3.5 h-3.5" :stroke-width="1.75" />
                </button>
                <button class="p-1.5 rounded-md bg-matchx-bg-elevated/95 backdrop-blur-sm text-matchx-text-muted hover:text-red-400 transition-colors border border-matchx-border-base cursor-pointer" @click="openEliminar(secondary)">
                  <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Separador -->
        <div v-if="resto.length > 0" class="flex items-center gap-4">
          <div class="h-px flex-1 bg-matchx-border-base" />
          <span class="text-[10px] font-mono font-bold text-matchx-text-muted uppercase tracking-[0.2em] px-1">
            Más comunicados
          </span>
          <div class="h-px flex-1 bg-matchx-border-base" />
        </div>

        <!-- Grid resto -->
        <div v-if="resto.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(c, index) in resto" :key="c.id" :class="['group relative', restoItemClass(index)]">

            <!-- Small CON imagen -->
            <div v-if="c.imagen_url"
                 class="rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden h-full flex flex-col">
              <div class="overflow-hidden" style="aspect-ratio:16/9">
                <img :src="c.imagen_url" :alt="c.titulo" class="w-full h-full object-cover" />
              </div>
              <div class="p-4 flex flex-col flex-1">
                <AppBadge :variant="tipoBadgeVariant(c.tipo)" :dot="false" class="self-start">{{ c.tipo }}</AppBadge>
                <h4 class="font-semibold text-matchx-text-primary text-sm mt-2 leading-snug">{{ c.titulo }}</h4>
                <p class="text-matchx-text-secondary text-xs mt-1.5 leading-relaxed flex-1">{{ c.cuerpo }}</p>
                <p class="text-matchx-text-muted text-[10px] mt-3 font-mono uppercase tracking-wide">{{ formatFechaCorta(c.created_at) }}</p>
              </div>
            </div>

            <!-- Small SIN imagen -->
            <div v-else
                 :class="['flex gap-3 rounded-xl bg-matchx-bg-surface border border-matchx-border-base p-3.5 h-full', tipoAccentBorder(c.tipo)]">
              <div :class="['w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', tipoIconBg(c.tipo)]">
                <component :is="tipoIcon(c.tipo)" class="w-4 h-4" :stroke-width="1.75" />
              </div>
              <div class="flex-1 min-w-0">
                <AppBadge :variant="tipoBadgeVariant(c.tipo)" :dot="false" class="text-[10px]">{{ c.tipo }}</AppBadge>
                <h4 class="font-semibold text-matchx-text-primary text-sm mt-1.5 leading-snug">{{ c.titulo }}</h4>
                <p class="text-matchx-text-secondary text-xs mt-1 leading-relaxed">{{ c.cuerpo }}</p>
                <p class="text-matchx-text-muted text-[10px] mt-2 font-mono uppercase tracking-wide">{{ formatFechaCorta(c.created_at) }}</p>
              </div>
            </div>

            <!-- Acciones hover -->
            <div class="absolute top-2 right-2 hidden group-hover:flex gap-1.5 z-10">
              <button class="p-1.5 rounded-md bg-matchx-bg-elevated/95 backdrop-blur-sm text-matchx-text-muted hover:text-matchx-accent-green transition-colors border border-matchx-border-base cursor-pointer" @click="openEditar(c)">
                <Pencil class="w-3.5 h-3.5" :stroke-width="1.75" />
              </button>
              <button class="p-1.5 rounded-md bg-matchx-bg-elevated/95 backdrop-blur-sm text-matchx-text-muted hover:text-red-400 transition-colors border border-matchx-border-base cursor-pointer" @click="openEliminar(c)">
                <Trash2 class="w-3.5 h-3.5" :stroke-width="1.75" />
              </button>
            </div>

          </div>
        </div>

      </div>
      <!-- fin v-else (vista periodico) -->

    </template>

  </div>

  <!-- ── Modal crear / editar ───────────────────────────────────────────── -->
  <AppModal v-model:open="showModal" size="lg"
    :title="saveDone ? '' : (isEditing ? 'Editar comunicado' : 'Nuevo comunicado')"
    :close-button="true">

    <div v-if="saveDone" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-matchx-accent-green/10 flex items-center justify-center">
        <CheckCircle class="w-7 h-7 text-matchx-accent-green" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">
          {{ isEditing ? 'Comunicado actualizado' : 'Comunicado publicado' }}
        </p>
        <p class="text-sm text-matchx-text-muted mt-1">Ya es visible para los participantes.</p>
      </div>
    </div>

    <template v-else>
      <div class="space-y-4">

        <!-- Título -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-matchx-text-secondary">
            Título <span class="text-matchx-accent-orange">*</span>
          </label>
          <input v-model="form.titulo" type="text" placeholder="Ej: Cambio de sede — Jornada 5"
            maxlength="120"
            class="w-full px-3 py-2 rounded-lg bg-matchx-bg-base border border-matchx-border-base
                   text-matchx-text-primary placeholder:text-matchx-text-muted text-sm
                   focus:outline-none focus:border-matchx-accent-green transition-colors" />
        </div>

        <!-- Tipo + Torneo -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-matchx-text-secondary">Tipo</label>
            <AppSelect :model-value="form.tipo" :options="tipoOptions"
              @update:model-value="(v) => form.tipo = v as any" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-matchx-text-secondary">Torneo</label>
            <AppSelect :model-value="form.torneo_id ? String(form.torneo_id) : ''"
              :options="torneoOptions" @update:model-value="onTorneoChange" />
          </div>
        </div>

        <!-- Cuerpo -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-matchx-text-secondary">
            Mensaje <span class="text-matchx-accent-orange">*</span>
          </label>
          <textarea v-model="form.cuerpo" rows="4"
            placeholder="Escribe aquí el contenido del comunicado..."
            class="w-full px-3 py-2 rounded-lg bg-matchx-bg-base border border-matchx-border-base
                   text-matchx-text-primary placeholder:text-matchx-text-muted text-sm
                   focus:outline-none focus:border-matchx-accent-green transition-colors resize-none" />
        </div>

        <!-- URL Imagen -->
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-matchx-text-secondary">
            Imagen
            <span class="text-matchx-text-muted font-normal text-xs">(URL, opcional)</span>
          </label>
          <input
            :value="form.imagen_url ?? ''"
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            @input="onImageUrlInput"
            class="w-full px-3 py-2 rounded-lg bg-matchx-bg-base border border-matchx-border-base
                   text-matchx-text-primary placeholder:text-matchx-text-muted text-sm
                   focus:outline-none focus:border-matchx-accent-green transition-colors"
          />
          <!-- Preview imagen -->
          <div v-if="form.imagen_url && !imagePreviewError"
               class="mt-1 rounded-lg overflow-hidden border border-matchx-border-base bg-matchx-bg-base"
               style="aspect-ratio:16/7">
            <img :src="form.imagen_url" class="w-full h-full object-cover"
                 @error="imagePreviewError = true" />
          </div>
          <div v-else-if="form.imagen_url && imagePreviewError"
               class="mt-1 rounded-lg border border-matchx-border-base bg-matchx-bg-base flex items-center justify-center gap-2 py-5">
            <ImageOff class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.75" />
            <p class="text-xs text-matchx-text-muted">No se pudo cargar la imagen</p>
          </div>
        </div>

        <!-- Preview tipo -->
        <div :class="[
          'flex items-start gap-3 rounded-lg border p-3',
          form.tipo === 'urgente'     ? 'bg-matchx-accent-orange/5 border-matchx-accent-orange/20'
          : form.tipo === 'informativo' ? 'bg-matchx-accent-green/5 border-matchx-accent-green/20'
          : 'bg-blue-500/5 border-blue-500/20',
        ]">
          <component :is="tipoIcon(form.tipo)"
            :class="['w-4 h-4 shrink-0 mt-0.5',
              form.tipo === 'urgente' ? 'text-matchx-accent-orange'
              : form.tipo === 'informativo' ? 'text-matchx-accent-green' : 'text-blue-400']"
            :stroke-width="1.75" />
          <p class="text-xs text-matchx-text-muted leading-relaxed">
            <span :class="['font-semibold',
              form.tipo === 'urgente' ? 'text-matchx-accent-orange'
              : form.tipo === 'informativo' ? 'text-matchx-accent-green' : 'text-blue-400']">
              {{ form.tipo === 'urgente' ? 'Urgente' : form.tipo === 'informativo' ? 'Informativo' : 'General' }}:
            </span>
            {{ form.cuerpo || 'Previsualización del mensaje...' }}
          </p>
        </div>

        <p v-if="saveError" class="text-sm text-matchx-accent-orange">{{ saveError }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="cerrarModal">
          {{ saveDone ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton v-if="!saveDone" :loading="saveLoading" @click="guardar">
          <Megaphone class="w-4 h-4" :stroke-width="2" />
          {{ isEditing ? 'Guardar cambios' : 'Publicar' }}
        </AppButton>
      </div>
    </template>
  </AppModal>

  <!-- ── Modal confirmar eliminar ───────────────────────────────────────── -->
  <AppModal v-model:open="showConfirmDelete" size="sm" title="Eliminar comunicado" :close-button="true">
    <p class="text-sm text-matchx-text-muted">
      ¿Seguro que quieres eliminar
      <span class="font-semibold text-matchx-text-primary">{{ deleteTarget?.titulo }}</span>?
      Los participantes ya no podrán verlo.
    </p>
    <p v-if="deleteError" class="mt-3 text-sm text-matchx-accent-orange">{{ deleteError }}</p>
    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showConfirmDelete = false">Cancelar</AppButton>
        <AppButton variant="danger" :loading="deleteLoading" @click="confirmarEliminar">
          <Trash2 class="w-4 h-4" :stroke-width="2" />
          Eliminar
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
