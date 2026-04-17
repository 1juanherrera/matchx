<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useComunicadosStore, type Comunicado } from '@/stores/comunicados'
import AppBadge from '@/components/ui/AppBadge.vue'
import { Megaphone, AlertTriangle, Info, MessageSquare, Trophy } from 'lucide-vue-next'

const comunicadosStore = useComunicadosStore()

const filtroTipo = ref<'todos' | 'general' | 'urgente' | 'informativo'>('todos')
const tipos = [
  { key: 'todos',       label: 'Todos' },
  { key: 'urgente',     label: 'Urgentes' },
  { key: 'general',     label: 'Generales' },
  { key: 'informativo', label: 'Informativos' },
] as const

onMounted(() => comunicadosStore.fetchComunicados())

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
  day: '2-digit', month: 'short', year: 'numeric',
})

const edicion = computed(() => comunicadosStore.comunicados.length)
const fechaHoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

// Colspan para items del grid resto: si un item queda solo en su fila, ocupa todo el ancho
const restoItemClass = (index: number) => {
  const n = resto.value.length
  const classes: string[] = []
  if (n % 2 === 1 && index === n - 1) classes.push('sm:col-span-2')
  if (n % 3 === 1 && index === n - 1) classes.push('lg:col-span-3')
  return classes.join(' ')
}
</script>

<template>
  <div class="space-y-6">

    <!-- ── Masthead ──────────────────────────────────────────────────────────── -->
    <div class="border-y border-matchx-border-base py-4">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[10px] font-mono text-matchx-text-muted uppercase tracking-[0.25em] mb-1">
            Comunicados Oficiales
          </p>
          <h1 class="text-4xl font-bold text-matchx-text-primary font-mono leading-none">matchX</h1>
          <p class="text-[10px] font-mono text-matchx-text-muted uppercase tracking-[0.2em] mt-1">
            Tablón del Torneo
          </p>
        </div>
        <div class="text-right shrink-0">
          <p class="text-[10px] font-mono text-matchx-text-muted uppercase tracking-wide capitalize">{{ fechaHoy }}</p>
          <p class="text-[10px] font-mono text-matchx-text-muted mt-0.5">Edición N.° {{ edicion }}</p>
          <AppBadge v-if="conteo.urgente > 0" variant="orange" :dot="true" :pulse="true" class="mt-2">
            {{ conteo.urgente }} urgente{{ conteo.urgente !== 1 ? 's' : '' }}
          </AppBadge>
        </div>
      </div>
    </div>

    <!-- ── Filtros ───────────────────────────────────────────────────────────── -->
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
        {{ t.label }} <span class="text-xs opacity-60">({{ conteo[t.key] }})</span>
      </button>
    </div>

    <!-- ── Skeleton ──────────────────────────────────────────────────────────── -->
    <div v-if="comunicadosStore.loading" class="space-y-4">
      <div class="rounded-xl bg-matchx-bg-surface animate-pulse" style="aspect-ratio:16/7" />
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="h-40 rounded-xl bg-matchx-bg-surface animate-pulse" />
      </div>
    </div>

    <!-- ── Empty ─────────────────────────────────────────────────────────────── -->
    <div v-else-if="lista.length === 0"
         class="flex flex-col items-center gap-3 py-16 text-center">
      <Megaphone class="w-12 h-12 text-matchx-text-muted opacity-25" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No hay comunicados disponibles.</p>
    </div>

    <!-- ── Newspaper Layout ──────────────────────────────────────────────────── -->
    <template v-else>

      <!-- Portada: hero + secondary -->
      <!-- lg:grid-cols-3 solo existe cuando hay secondary; si no, el hero llena todo el ancho sin necesitar col-span -->
      <div :class="['grid grid-cols-1 gap-5', secondary ? 'lg:grid-cols-3' : '']">

        <!-- ── HERO ── -->
        <div class="lg:col-span-2">

          <!-- Hero CON imagen -->
          <div v-if="hero!.imagen_url"
               class="rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden">
            <div class="relative overflow-hidden" style="aspect-ratio:16/7">
              <img :src="hero!.imagen_url" :alt="hero!.titulo"
                   class="w-full h-full object-cover" />
              <div :class="[
                'absolute top-0 inset-x-0 h-1',
                hero!.tipo === 'urgente' ? 'bg-matchx-accent-orange'
                : hero!.tipo === 'informativo' ? 'bg-matchx-accent-green'
                : 'bg-blue-500'
              ]" />
            </div>
            <div class="p-5 lg:p-7">
              <AppBadge :variant="tipoBadgeVariant(hero!.tipo)" :dot="hero!.tipo === 'urgente'" :pulse="hero!.tipo === 'urgente'">
                {{ hero!.tipo }}
              </AppBadge>
              <h2 class="text-xl lg:text-2xl font-bold text-matchx-text-primary mt-2.5 leading-tight">
                {{ hero!.titulo }}
              </h2>
              <p class="text-matchx-text-secondary text-sm mt-2 leading-relaxed">{{ hero!.cuerpo }}</p>
              <p class="text-matchx-text-muted text-xs mt-3 font-mono uppercase tracking-wide">
                {{ hero!.creado_por_nombre }} · {{ formatFecha(hero!.created_at) }}
              </p>
            </div>
          </div>

          <!-- Hero SIN imagen -->
          <div v-else
               :class="['rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden', tipoAccentBorder(hero!.tipo)]">
            <div class="p-7 lg:p-9">
              <div :class="['text-8xl font-black leading-none font-mono select-none opacity-[0.07]', tipoQuoteColor(hero!.tipo)]">
                "
              </div>
              <AppBadge :variant="tipoBadgeVariant(hero!.tipo)" :dot="hero!.tipo === 'urgente'" :pulse="hero!.tipo === 'urgente'" class="mt-3">
                {{ hero!.tipo }}
              </AppBadge>
              <h2 class="text-xl lg:text-2xl font-bold text-matchx-text-primary mt-3 leading-tight">
                {{ hero!.titulo }}
              </h2>
              <p class="text-matchx-text-secondary text-sm mt-3 leading-relaxed">
                {{ hero!.cuerpo }}
              </p>
              <p class="text-matchx-text-muted text-xs mt-5 font-mono uppercase tracking-wide">
                {{ hero!.creado_por_nombre }} · {{ formatFecha(hero!.created_at) }}
              </p>
            </div>
          </div>

        </div>

        <!-- ── SECONDARY ── -->
        <div v-if="secondary" class="flex flex-col">

          <!-- Secondary CON imagen -->
          <div v-if="secondary.imagen_url"
               class="rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden h-full flex flex-col">
            <div class="overflow-hidden" style="aspect-ratio:16/9">
              <img :src="secondary.imagen_url" :alt="secondary.titulo"
                   class="w-full h-full object-cover" />
            </div>
            <div class="p-4 flex flex-col flex-1">
              <AppBadge :variant="tipoBadgeVariant(secondary.tipo)" :dot="secondary.tipo === 'urgente'" :pulse="secondary.tipo === 'urgente'">
                {{ secondary.tipo }}
              </AppBadge>
              <h3 class="font-bold text-matchx-text-primary mt-2.5 leading-snug">
                {{ secondary.titulo }}
              </h3>
              <p class="text-matchx-text-secondary text-sm mt-2 leading-relaxed flex-1">
                {{ secondary.cuerpo }}
              </p>
              <p class="text-matchx-text-muted text-xs mt-3 font-mono uppercase tracking-wide">
                {{ secondary.creado_por_nombre }} · {{ formatFecha(secondary.created_at) }}
              </p>
            </div>
          </div>

          <!-- Secondary SIN imagen -->
          <div v-else
               :class="['rounded-xl bg-matchx-bg-surface border border-matchx-border-base h-full p-5', tipoAccentBorder(secondary.tipo)]">
            <AppBadge :variant="tipoBadgeVariant(secondary.tipo)" :dot="secondary.tipo === 'urgente'" :pulse="secondary.tipo === 'urgente'">
              {{ secondary.tipo }}
            </AppBadge>
            <h3 class="font-bold text-matchx-text-primary mt-3 text-lg leading-snug">
              {{ secondary.titulo }}
            </h3>
            <p class="text-matchx-text-secondary text-sm mt-2.5 leading-relaxed">
              {{ secondary.cuerpo }}
            </p>
            <p class="text-matchx-text-muted text-xs mt-4 font-mono uppercase tracking-wide">
              {{ secondary.creado_por_nombre }} · {{ formatFecha(secondary.created_at) }}
            </p>
          </div>

        </div>
      </div>

      <!-- ── Separador "Más comunicados" ───────────────────────────────────── -->
      <div v-if="resto.length > 0" class="flex items-center gap-4 pt-2">
        <div class="h-px flex-1 bg-matchx-border-base" />
        <span class="text-[10px] font-mono font-bold text-matchx-text-muted uppercase tracking-[0.2em] px-1">
          Más comunicados
        </span>
        <div class="h-px flex-1 bg-matchx-border-base" />
      </div>

      <!-- ── Grid "Más noticias" ───────────────────────────────────────────── -->
      <div v-if="resto.length > 0"
           class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="(c, index) in resto" :key="c.id" :class="restoItemClass(index)">

          <!-- Small CON imagen -->
          <div v-if="c.imagen_url"
               class="rounded-xl bg-matchx-bg-surface border border-matchx-border-base overflow-hidden h-full flex flex-col">
            <div class="overflow-hidden" style="aspect-ratio:16/9">
              <img :src="c.imagen_url" :alt="c.titulo" class="w-full h-full object-cover" />
            </div>
            <div class="p-4 flex flex-col flex-1">
              <AppBadge :variant="tipoBadgeVariant(c.tipo)" :dot="false" class="self-start">
                {{ c.tipo }}
              </AppBadge>
              <h4 class="font-semibold text-matchx-text-primary text-sm mt-2 leading-snug">
                {{ c.titulo }}
              </h4>
              <p class="text-matchx-text-secondary text-xs mt-1.5 leading-relaxed flex-1">
                {{ c.cuerpo }}
              </p>
              <p class="text-matchx-text-muted text-[10px] mt-3 font-mono uppercase tracking-wide">
                {{ formatFecha(c.created_at) }}
              </p>
            </div>
          </div>

          <!-- Small SIN imagen -->
          <div v-else
               :class="['flex gap-3 rounded-xl bg-matchx-bg-surface border border-matchx-border-base p-3.5 h-full', tipoAccentBorder(c.tipo)]">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', tipoIconBg(c.tipo)]">
              <component :is="tipoIcon(c.tipo)" class="w-4 h-4" :stroke-width="1.75" />
            </div>
            <div class="flex-1 min-w-0">
              <AppBadge :variant="tipoBadgeVariant(c.tipo)" :dot="false" class="text-[10px]">
                {{ c.tipo }}
              </AppBadge>
              <h4 class="font-semibold text-matchx-text-primary text-sm mt-1.5 leading-snug">
                {{ c.titulo }}
              </h4>
              <p class="text-matchx-text-secondary text-xs mt-1 leading-relaxed">
                {{ c.cuerpo }}
              </p>
              <div class="flex items-center gap-2 mt-2.5 text-[10px] text-matchx-text-muted font-mono uppercase tracking-wide">
                <Trophy class="w-2.5 h-2.5" :stroke-width="2" />
                <span>{{ c.torneo_id ? `Torneo #${c.torneo_id}` : 'General' }}</span>
                <span>· {{ formatFecha(c.created_at) }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </template>
  </div>
</template>
