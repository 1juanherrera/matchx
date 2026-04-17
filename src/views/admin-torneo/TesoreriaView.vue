<script setup lang="ts">
import { ref, computed, watch, onMounted, triggerRef } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useAuthStore } from '@/stores/auth'
import {
  inscripcionesService,
  type Inscripcion,
  type MetodoPagoMatricula,
} from '@/services/inscripciones.service'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import {
  Wallet, TrendingUp, Clock, ShieldCheck, CheckCircle, AlertCircle,
  CreditCard, Banknote, Eye, X, AlertTriangle, ReceiptText,
  Smartphone, Landmark, Globe, Zap, CircleDollarSign, RefreshCw,
} from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const authStore    = useAuthStore()

const selectedTorneoId  = ref<number | null>(null)
const inscripciones     = ref<Inscripcion[]>([])
const loading           = ref(false)
const filtro            = ref<'todos' | 'pendiente' | 'en_revision' | 'pagado' | 'exento'>('todos')

// ── Modal pago ──────────────────────────────────────────────────────────────
const showModalPago    = ref(false)
const saveErrorPago    = ref('')
const savingPago       = ref(false)
const inscSeleccionada = ref<Inscripcion | null>(null)
const formPago = ref<{ pago_metodo: MetodoPagoMatricula | null; pago_referencia: string }>({
  pago_metodo: null, pago_referencia: '',
})

const metodosPago: { value: MetodoPagoMatricula; label: string; icon: any; color: string }[] = [
  { value: 'efectivo',    label: 'Efectivo',    icon: Banknote,    color: 'border-matchx-accent-green/40 bg-matchx-accent-green/5 text-matchx-accent-green' },
  { value: 'nequi',       label: 'Transferencia', icon: Smartphone,  color: 'border-purple-500/40 bg-purple-500/5 text-purple-400' },
  { value: 'bancolombia', label: 'Bancolombia', icon: Landmark,    color: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400' },
  { value: 'pse',         label: 'PSE',         icon: Globe,       color: 'border-blue-500/40 bg-blue-500/5 text-blue-400' },
  { value: 'daviplata',   label: 'Daviplata',   icon: Zap,         color: 'border-red-500/40 bg-red-500/5 text-red-400' },
]

const metodoLabel: Record<MetodoPagoMatricula, string> = {
  efectivo: 'Efectivo', nequi: 'Transferencia', bancolombia: 'Bancolombia', pse: 'PSE', daviplata: 'Daviplata',
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

// ── Carga ──────────────────────────────────────────────────────────────────
const cargar = async () => {
  if (!selectedTorneoId.value) return
  loading.value = true
  try {
    inscripciones.value = await inscripcionesService.getByTorneo(selectedTorneoId.value)
  } catch {
    inscripciones.value = []
  } finally {
    loading.value = false
  }
}

watch(selectedTorneoId, cargar)
onMounted(async () => {
  await torneosStore.fetchTorneos()
  if (torneosStore.torneos.length > 0) selectedTorneoId.value = torneosStore.torneos[0].id
})

const torneoSeleccionado = computed(() =>
  selectedTorneoId.value !== null ? torneosStore.obtenerPorId(selectedTorneoId.value) : null,
)
const valorMatricula = computed(() => torneoSeleccionado.value?.valor_matricula ?? 0)
const torneoOptions  = computed(() => torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })))

// ── Métricas ───────────────────────────────────────────────────────────────
const activas      = computed(() => inscripciones.value.filter(i => i.estado !== 'rechazada'))
const totalEsperado = computed(() => activas.value.length * valorMatricula.value)
const listaPagados  = computed(() => activas.value.filter(i => i.pago_estado === 'pagado'))
const listaRevision = computed(() => activas.value.filter(i => i.pago_estado === 'en_revision'))
const listaPendiente = computed(() => activas.value.filter(i => i.pago_estado === 'pendiente'))
const listaExentos  = computed(() => activas.value.filter(i => i.pago_estado === 'exento'))
const totalRecaudado = computed(() => listaPagados.value.length * valorMatricula.value)
const totalPendiente = computed(() => listaPendiente.value.length * valorMatricula.value)

// Breakdown por método
const breakdownMetodos = computed(() => {
  const m: Record<string, number> = {}
  listaPagados.value.forEach(i => {
    const k = i.pago_metodo ?? 'otro'
    m[k] = (m[k] ?? 0) + 1
  })
  return Object.entries(m).map(([metodo, count]) => ({
    metodo, count,
    total: count * valorMatricula.value,
    icon:  metodosPago.find(mp => mp.value === metodo)?.icon ?? CircleDollarSign,
    label: metodoLabel[metodo as MetodoPagoMatricula] ?? metodo,
  }))
})

// ── Tabs ────────────────────────────────────────────────────────────────────
const tabs = [
  { key: 'todos',       label: 'Todos' },
  { key: 'pendiente',   label: 'Sin pagar' },
  { key: 'en_revision', label: 'En revisión' },
  { key: 'pagado',      label: 'Pagados' },
  { key: 'exento',      label: 'Exentos' },
] as const

const tabCount = (key: string) => {
  if (key === 'todos')       return activas.value.length
  if (key === 'pendiente')   return listaPendiente.value.length
  if (key === 'en_revision') return listaRevision.value.length
  if (key === 'pagado')      return listaPagados.value.length
  if (key === 'exento')      return listaExentos.value.length
  return 0
}

const inscFiltradas = computed(() => {
  if (filtro.value === 'todos') return activas.value
  return activas.value.filter(i => i.pago_estado === filtro.value)
})

// ── Generador de referencia ────────────────────────────────────────────────
const prefijos: Record<string, string> = {
  efectivo: 'EFE', nequi: 'TRF', bancolombia: 'BAN', pse: 'PSE', daviplata: 'DVP',
}

const generarReferencia = () => {
  const metodo  = formPago.value.pago_metodo ?? 'efectivo'
  const prefijo = prefijos[metodo] ?? 'MX'
  const fecha   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const seq     = String(Math.floor(Math.random() * 9000) + 1000)
  formPago.value.pago_referencia = `${prefijo}-${fecha}-${seq}`
}

// ── Acciones ────────────────────────────────────────────────────────────────
const openModalPago = (insc: Inscripcion) => {
  inscSeleccionada.value = insc
  formPago.value = {
    pago_metodo:     insc.pago_metodo ?? null,
    pago_referencia: insc.pago_referencia ?? '',
  }
  saveErrorPago.value = ''
  showModalPago.value = true
}

const confirmarPago = async () => {
  if (!inscSeleccionada.value || !formPago.value.pago_metodo) return
  if (formPago.value.pago_metodo !== 'efectivo' && !formPago.value.pago_referencia.trim()) {
    saveErrorPago.value = 'Ingresa el número de referencia o comprobante'
    return
  }
  savingPago.value    = true
  saveErrorPago.value = ''
  try {
    await inscripcionesService.registrarPago(inscSeleccionada.value.id, {
      pago_metodo:     formPago.value.pago_metodo,
      pago_referencia: formPago.value.pago_referencia.trim() || `EFE-${Date.now()}`,
    })
    const idx = inscripciones.value.findIndex(i => i.id === inscSeleccionada.value!.id)
    if (idx !== -1) {
      inscripciones.value[idx] = {
        ...inscripciones.value[idx],
        pago_estado:     'pagado',
        pago_metodo:     formPago.value.pago_metodo,
        pago_referencia: formPago.value.pago_referencia.trim() || `EFE-${Date.now()}`,
        pago_fecha:      new Date().toISOString(),
      }
      triggerRef(inscripciones)
    }
    showModalPago.value = false
  } catch (err: any) {
    saveErrorPago.value = err.response?.data?.message ?? 'Error al confirmar el pago'
  } finally {
    savingPago.value = false
  }
}

const rechazarReferencia = async (insc: Inscripcion) => {
  if (!confirm(`¿Rechazar el comprobante de ${insc.equipo_nombre}? Volverá a estado "Sin pagar".`)) return
  try {
    await inscripcionesService.rechazarReferencia(insc.id)
    const idx = inscripciones.value.findIndex(i => i.id === insc.id)
    if (idx !== -1) {
      inscripciones.value[idx] = {
        ...inscripciones.value[idx],
        pago_estado: 'pendiente', pago_metodo: null, pago_referencia: null, pago_fecha: null,
      }
      triggerRef(inscripciones)
    }
  } catch {}
}

const eximirPago = async (insc: Inscripcion) => {
  try {
    await inscripcionesService.eximirPago(insc.id)
    const idx = inscripciones.value.findIndex(i => i.id === insc.id)
    if (idx !== -1) {
      inscripciones.value[idx] = { ...inscripciones.value[idx], pago_estado: 'exento' }
      triggerRef(inscripciones)
    }
  } catch {}
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Tesorería</h1>
        <p class="text-matchx-text-muted mt-1">Cobros de matrícula por torneo</p>
      </div>
    </div>

    <!-- Selector de torneo -->
    <AppCard :hover="false" class="relative z-20">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div class="flex-1 w-full">
          <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Torneo" />
        </div>
        <div v-if="torneoSeleccionado && valorMatricula > 0" class="text-sm text-matchx-text-muted pb-1 shrink-0">
          Matrícula: <span class="font-semibold text-matchx-text-primary">{{ formatCOP(valorMatricula) }}</span> / equipo
        </div>
        <div v-else-if="torneoSeleccionado" class="text-sm text-matchx-accent-orange pb-1 shrink-0">
          Sin valor de matrícula
        </div>
      </div>
    </AppCard>

    <!-- Métricas financieras -->
    <div v-if="torneoSeleccionado" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <AppCard :hover="false" class="flex flex-col gap-1">
        <div class="flex items-center gap-2 text-matchx-text-muted">
          <Wallet class="w-4 h-4 shrink-0" :stroke-width="1.75" />
          <span class="text-xs font-medium uppercase tracking-wider">Esperado</span>
        </div>
        <p class="text-2xl font-black text-matchx-text-primary mt-1">{{ formatCOP(totalEsperado) }}</p>
        <p class="text-xs text-matchx-text-muted">{{ activas.length }} equipos</p>
      </AppCard>

      <AppCard :hover="false" class="flex flex-col gap-1">
        <div class="flex items-center gap-2 text-matchx-accent-green">
          <TrendingUp class="w-4 h-4 shrink-0" :stroke-width="1.75" />
          <span class="text-xs font-medium uppercase tracking-wider">Recaudado</span>
        </div>
        <p class="text-2xl font-black text-matchx-accent-green mt-1">{{ formatCOP(totalRecaudado) }}</p>
        <p class="text-xs text-matchx-text-muted">{{ listaPagados.length }} pagados</p>
      </AppCard>

      <AppCard :hover="false" class="flex flex-col gap-1">
        <div class="flex items-center gap-2 text-matchx-accent-orange">
          <Clock class="w-4 h-4 shrink-0" :stroke-width="1.75" />
          <span class="text-xs font-medium uppercase tracking-wider">Pendiente</span>
        </div>
        <p class="text-2xl font-black text-matchx-accent-orange mt-1">{{ formatCOP(totalPendiente) }}</p>
        <p class="text-xs text-matchx-text-muted">
          {{ listaPendiente.length }} sin pagar
          <span v-if="listaRevision.length > 0" class="text-yellow-400"> · {{ listaRevision.length }} en revisión</span>
        </p>
      </AppCard>

      <AppCard :hover="false" class="flex flex-col gap-1">
        <div class="flex items-center gap-2 text-blue-400">
          <ShieldCheck class="w-4 h-4 shrink-0" :stroke-width="1.75" />
          <span class="text-xs font-medium uppercase tracking-wider">Exentos</span>
        </div>
        <p class="text-2xl font-black text-blue-400 mt-1">{{ listaExentos.length }}</p>
        <p class="text-xs text-matchx-text-muted">equipos eximidos</p>
      </AppCard>
    </div>

    <!-- Breakdown por método de pago -->
    <div v-if="breakdownMetodos.length > 0">
      <p class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider mb-2">Recaudado por método</p>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="b in breakdownMetodos" :key="b.metodo"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-matchx-bg-surface border border-matchx-border-base text-sm"
        >
          <component :is="b.icon" class="w-4 h-4 shrink-0" :stroke-width="1.75" />
          <span class="font-semibold text-matchx-text-primary">{{ b.label }}</span>
          <span class="text-matchx-text-muted">{{ b.count }} cobros</span>
          <span class="text-matchx-accent-green text-xs">{{ formatCOP(b.total) }}</span>
        </div>
      </div>
    </div>

    <!-- Alerta en revisión -->
    <div
      v-if="listaRevision.length > 0"
      class="flex items-center gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/30 text-yellow-400"
    >
      <AlertTriangle class="w-4 h-4 shrink-0" :stroke-width="2" />
      <span class="text-sm font-medium">
        {{ listaRevision.length }} comprobante{{ listaRevision.length > 1 ? 's' : '' }} enviado{{ listaRevision.length > 1 ? 's' : '' }} por equipos — pendiente de confirmación
      </span>
    </div>

    <!-- Tabs de filtro -->
    <div v-if="activas.length > 0" class="flex gap-1 bg-matchx-bg-surface rounded-xl p-1 border border-matchx-border-base overflow-x-auto">
      <button
        v-for="tab in tabs" :key="tab.key"
        @click="filtro = tab.key"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer"
        :class="filtro === tab.key
          ? 'bg-matchx-bg-elevated text-matchx-text-primary shadow-sm'
          : 'text-matchx-text-muted hover:text-matchx-text-secondary'"
      >
        {{ tab.label }}
        <span
          v-if="tabCount(tab.key) > 0"
          class="text-xs px-1.5 py-0.5 rounded-full font-semibold"
          :class="tab.key === 'pendiente'   ? 'bg-matchx-accent-orange/20 text-matchx-accent-orange'
                : tab.key === 'en_revision' ? 'bg-yellow-500/20 text-yellow-400'
                : tab.key === 'pagado'      ? 'bg-matchx-accent-green/20 text-matchx-accent-green'
                : tab.key === 'exento'      ? 'bg-blue-500/20 text-blue-400'
                : 'bg-matchx-bg-elevated text-matchx-text-muted'"
        >{{ tabCount(tab.key) }}</span>
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 4" :key="i" class="h-16 bg-matchx-bg-surface rounded-xl animate-pulse border border-matchx-border-base" />
    </div>

    <!-- Empty -->
    <div v-else-if="!loading && inscFiltradas.length === 0 && selectedTorneoId" class="flex flex-col items-center gap-2 py-12">
      <Wallet class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-secondary font-medium">No hay inscripciones en esta categoría</p>
    </div>

    <!-- Lista de cobros -->
    <div v-else-if="!loading && inscFiltradas.length > 0" class="space-y-2">
      <div
        v-for="insc in inscFiltradas" :key="insc.id"
        class="rounded-xl border border-matchx-border-base bg-matchx-bg-surface overflow-hidden"
      >
        <!-- Franja de color del equipo -->
        <div
          class="h-0.5 w-full"
          :style="{ background: `linear-gradient(to right, ${insc.equipo_color_principal || '#1a56db'}, ${insc.equipo_color_secundario || '#9ca3af'})` }"
        />

        <div class="flex items-center gap-3 px-4 py-3">
          <!-- Avatar equipo -->
          <div
            class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs select-none overflow-hidden"
            :style="insc.equipo_escudo_url ? '' : `background: linear-gradient(135deg, ${insc.equipo_color_principal || '#1a56db'}, ${insc.equipo_color_secundario || '#9ca3af'})`"
          >
            <img v-if="insc.equipo_escudo_url" :src="insc.equipo_escudo_url" :alt="insc.equipo_nombre" class="w-full h-full object-cover" />
            <span v-else>{{ (insc.equipo_nombre_corto || insc.equipo_nombre).slice(0, 2).toUpperCase() }}</span>
          </div>

          <!-- Nombre + estado inscripción -->
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-matchx-text-primary text-sm truncate">{{ insc.equipo_nombre }}</p>
            <p class="text-xs text-matchx-text-muted">
              {{ insc.fecha_inscripcion ? insc.fecha_inscripcion.slice(0, 10) : '' }}
            </p>
          </div>

          <!-- Estado de pago — solo el badge, sin texto secundario, altura siempre igual -->
          <div class="hidden sm:flex items-center justify-center w-36 shrink-0">
            <template v-if="insc.pago_estado === 'en_revision'">
              <div class="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <Eye class="w-3.5 h-3.5 text-yellow-400 shrink-0" :stroke-width="2" />
                <span class="text-xs font-semibold text-yellow-400">En revisión</span>
              </div>
            </template>
            <template v-else-if="insc.pago_estado === 'pagado'">
              <div class="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-matchx-accent-green/10 border border-matchx-accent-green/30">
                <CheckCircle class="w-3.5 h-3.5 text-matchx-accent-green shrink-0" :stroke-width="2" />
                <span class="text-xs font-semibold text-matchx-accent-green">Pagado</span>
              </div>
            </template>
            <template v-else-if="insc.pago_estado === 'exento'">
              <div class="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <ShieldCheck class="w-3.5 h-3.5 text-blue-400 shrink-0" :stroke-width="2" />
                <span class="text-xs font-semibold text-blue-400">Exento</span>
              </div>
            </template>
            <template v-else>
              <div class="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg bg-matchx-accent-orange/10 border border-matchx-accent-orange/30">
                <Banknote class="w-3.5 h-3.5 text-matchx-accent-orange shrink-0" :stroke-width="2" />
                <span class="text-xs font-semibold text-matchx-accent-orange">Sin pagar</span>
              </div>
            </template>
          </div>

          <!-- Acciones — ancho fijo para que no empujen el badge -->
          <div class="flex items-center justify-end gap-1.5 w-28 shrink-0">
            <template v-if="insc.pago_estado === 'en_revision'">
              <button
                @click="openModalPago(insc)"
                class="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-matchx-accent-green/10 text-matchx-accent-green
                       border border-matchx-accent-green/30 hover:bg-matchx-accent-green/20 transition-colors cursor-pointer"
              >
                Confirmar
              </button>
              <button
                @click="rechazarReferencia(insc)"
                class="p-1.5 rounded-lg text-matchx-accent-orange border border-matchx-accent-orange/30
                       hover:bg-matchx-accent-orange/10 transition-colors cursor-pointer"
                title="Rechazar comprobante"
              >
                <X class="w-3.5 h-3.5" :stroke-width="2.5" />
              </button>
            </template>

            <template v-else-if="insc.pago_estado === 'pendiente'">
              <button
                @click="openModalPago(insc)"
                class="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-matchx-accent-orange/10 text-matchx-accent-orange
                       border border-matchx-accent-orange/30 hover:bg-matchx-accent-orange/20 transition-colors cursor-pointer"
              >
                Cobrar
              </button>
              <button
                @click="eximirPago(insc)"
                class="text-xs font-medium px-2 py-1.5 rounded-lg text-matchx-text-muted
                       hover:text-matchx-text-secondary hover:bg-matchx-bg-elevated transition-colors cursor-pointer"
              >
                Eximir
              </button>
            </template>

            <template v-else-if="insc.pago_estado === 'pagado'">
              <button
                @click="openModalPago(insc)"
                class="p-1.5 rounded-lg text-matchx-text-muted hover:text-matchx-text-secondary
                       hover:bg-matchx-bg-elevated transition-colors cursor-pointer"
                title="Ver comprobante"
              >
                <ReceiptText class="w-4 h-4" :stroke-width="1.75" />
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>


    <!-- ════════════════════════════════════════════════════════════
         MODAL: Confirmar / Registrar pago
    ════════════════════════════════════════════════════════════ -->
    <AppModal
      :open="showModalPago"
      :title="inscSeleccionada?.pago_estado === 'en_revision' ? 'Confirmar comprobante' : 'Registrar pago'"
      size="md"
      @update:open="showModalPago = $event"
    >
      <div v-if="inscSeleccionada" class="space-y-5">

        <!-- Info equipo + monto -->
        <div class="flex items-center gap-3 p-3 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base">
          <div
            class="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-xs overflow-hidden"
            :style="inscSeleccionada.equipo_escudo_url ? '' : `background: linear-gradient(135deg, ${inscSeleccionada.equipo_color_principal || '#1a56db'}, ${inscSeleccionada.equipo_color_secundario || '#9ca3af'})`"
          >
            <img v-if="inscSeleccionada.equipo_escudo_url" :src="inscSeleccionada.equipo_escudo_url" class="w-full h-full object-cover" />
            <span v-else>{{ (inscSeleccionada.equipo_nombre_corto || inscSeleccionada.equipo_nombre).slice(0, 2).toUpperCase() }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-matchx-text-primary text-sm truncate">{{ inscSeleccionada.equipo_nombre }}</p>
            <p class="text-xs text-matchx-text-muted">{{ torneoSeleccionado?.nombre }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-lg font-black text-matchx-text-primary">{{ formatCOP(valorMatricula) }}</p>
            <p class="text-xs text-matchx-text-muted">Matrícula</p>
          </div>
        </div>

        <!-- Comprobante enviado por el capitán (en_revision) -->
        <div
          v-if="inscSeleccionada.pago_estado === 'en_revision' && inscSeleccionada.pago_referencia"
          class="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/30"
        >
          <AlertTriangle class="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" :stroke-width="2" />
          <div>
            <p class="text-xs font-semibold text-yellow-400 mb-0.5">Comprobante enviado por el capitán</p>
            <p class="text-sm  text-matchx-text-primary">{{ inscSeleccionada.pago_referencia }}</p>
            <p v-if="inscSeleccionada.pago_metodo" class="text-xs text-matchx-text-muted mt-0.5">
              Método: {{ metodoLabel[inscSeleccionada.pago_metodo] }}
            </p>
          </div>
        </div>

        <!-- Selector método de pago -->
        <div>
          <p class="text-sm font-semibold text-matchx-text-secondary mb-2.5">Método de pago</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="m in metodosPago" :key="m.value"
              @click="formPago.pago_metodo = m.value"
              class="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer font-medium text-sm"
              :class="formPago.pago_metodo === m.value
                ? m.color + ' border-current ring-2 ring-current/20 scale-105'
                : 'border-matchx-border-base text-matchx-text-muted hover:border-matchx-border-base/70 hover:text-matchx-text-secondary'"
            >
              <component :is="m.icon" class="w-5 h-5 shrink-0" :stroke-width="1.75" />
              {{ m.label }}
              <CheckCircle
                v-if="formPago.pago_metodo === m.value"
                class="absolute top-1.5 right-1.5 w-3.5 h-3.5"
                :stroke-width="2.5"
              />
            </button>
          </div>
        </div>

        <!-- Referencia -->
        <div v-if="formPago.pago_metodo" class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-matchx-text-secondary">
            {{ formPago.pago_metodo === 'efectivo' ? 'Número de recibo (opcional)' : 'Número de referencia / comprobante' }}
          </label>
          <div class="flex gap-2">
            <input
              v-model="formPago.pago_referencia"
              type="text"
              :placeholder="formPago.pago_metodo === 'nequi'       ? 'Ej: TRF-20260415-1234'
                          : formPago.pago_metodo === 'bancolombia' ? 'Ej: BAN-20260415-1234'
                          : formPago.pago_metodo === 'pse'         ? 'Ej: PSE-20260415-1234'
                          : formPago.pago_metodo === 'daviplata'   ? 'Ej: DVP-20260415-1234'
                          : 'Ej: EFE-20260415-1234'"
              class="flex-1 px-3 py-2 rounded-lg text-sm text-matchx-text-primary placeholder-matchx-text-muted
                     bg-matchx-bg-base border border-matchx-border-base
                     focus:border-matchx-accent-green focus:ring-2 focus:ring-matchx-accent-green/20 outline-none transition-colors"
            />
            <button
              type="button"
              @click="generarReferencia"
              title="Generar número automáticamente"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium shrink-0
                     bg-matchx-bg-elevated border border-matchx-border-base text-matchx-text-secondary
                     hover:border-matchx-accent-green/40 hover:text-matchx-accent-green transition-colors cursor-pointer"
            >
              <RefreshCw class="w-3.5 h-3.5" :stroke-width="2" />
              Generar
            </button>
          </div>
        </div>

        <p v-if="saveErrorPago" class="text-sm text-matchx-accent-orange flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> {{ saveErrorPago }}
        </p>
      </div>

      <template #footer>
        <div class="flex items-center gap-3">
          <button
            v-if="inscSeleccionada?.pago_estado === 'pendiente'"
            @click="eximirPago(inscSeleccionada!); showModalPago = false"
            class="text-sm text-matchx-text-muted hover:text-matchx-text-secondary underline underline-offset-2 cursor-pointer mr-auto"
          >
            Eximir de pago
          </button>
          <AppButton variant="secondary" @click="showModalPago = false">Cancelar</AppButton>
          <AppButton
            variant="primary"
            :disabled="!formPago.pago_metodo || savingPago"
            @click="confirmarPago"
          >
            <CreditCard class="w-4 h-4 mr-1.5" :stroke-width="2" />
            {{ savingPago ? 'Guardando...' : inscSeleccionada?.pago_estado === 'en_revision' ? 'Confirmar pago' : 'Registrar pago' }}
          </AppButton>
        </div>
      </template>
    </AppModal>

  </div>
</template>
