<script setup lang="ts">
import { ref, computed, watch, onMounted, triggerRef } from 'vue'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import {
  inscripcionesService,
  type Inscripcion,
  type EstadoInscripcion,
  type EstadoPagoMatricula,
  type MetodoPagoMatricula,
} from '@/services/inscripciones.service'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import {
  Users, Plus, UserMinus, AlertCircle, CheckCircle, XCircle,
  CreditCard, Banknote, ShieldCheck, ReceiptText, AlertTriangle,
} from 'lucide-vue-next'

const torneosStore = useTorneosStore()
const equiposStore = useEquiposStore()
const authStore    = useAuthStore()

const selectedTorneoId = ref<number | null>(null)
const inscripciones    = ref<Inscripcion[]>([])
const loadingInsc      = ref(false)

// ── Modal inscripción ───────────────────────────────────────────────────────
const showModalInsc = ref(false)
const saveErrorInsc = ref('')
const formInsc = ref({ equipo_id: 0, observaciones: '' })

// ── Modal pago ──────────────────────────────────────────────────────────────
const showModalPago  = ref(false)
const saveErrorPago  = ref('')
const savingPago     = ref(false)
const inscSeleccionada = ref<Inscripcion | null>(null)

const formPago = ref<{
  pago_metodo:     MetodoPagoMatricula | null
  pago_referencia: string
}>({ pago_metodo: null, pago_referencia: '' })

// ── Métodos de pago colombianos ─────────────────────────────────────────────
const metodosPago: { value: MetodoPagoMatricula; label: string; icon: string; color: string }[] = [
  { value: 'efectivo',    label: 'Efectivo',    icon: 'banknote',   color: 'border-matchx-accent-green/40 bg-matchx-accent-green/5 text-matchx-accent-green' },
  { value: 'nequi',       label: 'Nequi',       icon: 'nequi',      color: 'border-purple-500/40 bg-purple-500/5 text-purple-400' },
  { value: 'bancolombia', label: 'Bancolombia', icon: 'bank',       color: 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400' },
  { value: 'pse',         label: 'PSE',         icon: 'pse',        color: 'border-blue-500/40 bg-blue-500/5 text-blue-400' },
  { value: 'daviplata',   label: 'Daviplata',   icon: 'daviplata',  color: 'border-red-500/40 bg-red-500/5 text-red-400' },
]

const metodoLabel: Record<MetodoPagoMatricula, string> = {
  efectivo: 'Efectivo', nequi: 'Nequi', bancolombia: 'Bancolombia',
  pse: 'PSE', daviplata: 'Daviplata',
}

// ── Cargar inscripciones ────────────────────────────────────────────────────
const cargarInscripciones = async () => {
  if (!selectedTorneoId.value) return
  loadingInsc.value = true
  try {
    inscripciones.value = await inscripcionesService.getByTorneo(selectedTorneoId.value)
  } catch {
    inscripciones.value = []
  } finally {
    loadingInsc.value = false
  }
}

watch(selectedTorneoId, cargarInscripciones)

onMounted(async () => {
  await Promise.all([torneosStore.fetchTorneos(), equiposStore.fetchEquipos()])
  if (torneosStore.torneos.length > 0) selectedTorneoId.value = torneosStore.torneos[0].id
})

// ── Computed ────────────────────────────────────────────────────────────────
const torneoOptions = computed(() =>
  torneosStore.torneos.map(t => ({ value: t.id, label: t.nombre })),
)
const torneoSeleccionado = computed(() =>
  selectedTorneoId.value !== null ? torneosStore.obtenerPorId(selectedTorneoId.value) : null,
)
const valorMatricula = computed(() => torneoSeleccionado.value?.valor_matricula ?? 0)

const cuposOcupados  = computed(() => inscripciones.value.filter(i => i.estado !== 'rechazada').length)
const cuposMax       = computed(() => torneoSeleccionado.value?.max_equipos ?? 0)
const estaLleno      = computed(() => cuposMax.value > 0 && cuposOcupados.value >= cuposMax.value)
const porcentajeCupos = computed(() =>
  cuposMax.value > 0 ? Math.min((cuposOcupados.value / cuposMax.value) * 100, 100) : 0,
)
const barColor = computed(() =>
  porcentajeCupos.value >= 100 ? 'bg-matchx-accent-orange'
  : porcentajeCupos.value >= 75 ? 'bg-matchx-accent-orange/70'
  : 'bg-matchx-accent-green',
)

const equiposDisponibles = computed(() => {
  const inscritosIds = new Set(inscripciones.value.map(i => i.equipo_id))
  return equiposStore.equipos
    .filter(e => e.activo === 1 && !inscritosIds.has(e.id))
    .map(e => ({ value: e.id, label: e.nombre }))
})

const pendientesPago = computed(() =>
  inscripciones.value.filter(i => i.pago_estado === 'pendiente' && i.estado !== 'rechazada').length,
)

// ── Helpers ─────────────────────────────────────────────────────────────────
const estadoBadge = (estado: EstadoInscripcion): 'green' | 'orange' | 'gray' =>
  estado === 'aprobada' ? 'green' : estado === 'rechazada' ? 'orange' : 'gray'

const estadoLabel: Record<EstadoInscripcion, string> = {
  pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada',
}

const pagoBadgeVariant = (estado: EstadoPagoMatricula): 'green' | 'orange' | 'gray' =>
  estado === 'pagado' ? 'green' : estado === 'exento' ? 'blue' : 'gray'

const pagoLabel: Record<EstadoPagoMatricula, string> = {
  pagado: 'Pagado', pendiente: 'Sin pagar', exento: 'Exento',
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

// ── Acciones inscripción ────────────────────────────────────────────────────
const openNew = () => {
  formInsc.value = { equipo_id: equiposDisponibles.value[0]?.value ?? 0, observaciones: '' }
  saveErrorInsc.value = ''
  showModalInsc.value = true
}

const saveInscripcion = async () => {
  if (!formInsc.value.equipo_id || !selectedTorneoId.value) return
  saveErrorInsc.value = ''
  try {
    await inscripcionesService.create(selectedTorneoId.value, {
      equipo_id:     formInsc.value.equipo_id,
      observaciones: formInsc.value.observaciones || undefined,
    })
    showModalInsc.value = false
    await cargarInscripciones()
  } catch (err: any) {
    saveErrorInsc.value = err.response?.data?.message ?? 'Error al inscribir el equipo'
  }
}

const cambiarEstado = async (insc: Inscripcion, estado: EstadoInscripcion) => {
  try {
    if (estado === 'aprobada') {
      await inscripcionesService.aprobar(insc.id, authStore.user?.usuario_id ?? 0)
    } else if (estado === 'rechazada') {
      await inscripcionesService.rechazar(insc.id)
    }
    const idx = inscripciones.value.findIndex(i => i.id === insc.id)
    if (idx !== -1) {
      inscripciones.value[idx] = { ...inscripciones.value[idx], estado }
      triggerRef(inscripciones)
    }
  } catch (err: any) {
    console.error('Error cambiando estado:', err)
  }
}

const retirar = async (insc: Inscripcion) => {
  if (!confirm(`¿Retirar a ${insc.equipo_nombre} del torneo?`)) return
  try {
    await inscripcionesService.delete(insc.id)
    inscripciones.value = inscripciones.value.filter(i => i.id !== insc.id)
  } catch { /* silencioso */ }
}

// ── Acciones pago ────────────────────────────────────────────────────────────
const openModalPago = (insc: Inscripcion) => {
  inscSeleccionada.value = insc
  formPago.value = { pago_metodo: null, pago_referencia: '' }
  saveErrorPago.value = ''
  showModalPago.value = true
}

const confirmarPago = async () => {
  if (!inscSeleccionada.value || !formPago.value.pago_metodo) return
  if (formPago.value.pago_metodo !== 'efectivo' && !formPago.value.pago_referencia.trim()) {
    saveErrorPago.value = 'Ingresa el número de referencia o comprobante'
    return
  }
  savingPago.value   = true
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
    saveErrorPago.value = err.response?.data?.message ?? 'Error al registrar el pago'
  } finally {
    savingPago.value = false
  }
}

const eximirPago = async (insc: Inscripcion) => {
  try {
    await inscripcionesService.eximirPago(insc.id)
    const idx = inscripciones.value.findIndex(i => i.id === insc.id)
    if (idx !== -1) {
      inscripciones.value[idx] = { ...inscripciones.value[idx], pago_estado: 'exento' }
      triggerRef(inscripciones)
    }
  } catch { /* silencioso */ }
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Inscripciones</h1>
        <p class="text-matchx-text-muted mt-1">Equipos inscritos y estado de pago de matrícula</p>
      </div>
      <div class="relative group/tooltip">
        <AppButton variant="primary" :disabled="!selectedTorneoId || estaLleno" @click="openNew">
          <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" /> Inscribir Equipo
        </AppButton>
        <div
          v-if="estaLleno && selectedTorneoId"
          class="hidden group-hover/tooltip:flex absolute right-0 top-full mt-2 z-20
                 items-center gap-1.5 whitespace-nowrap
                 bg-matchx-bg-elevated border border-matchx-border-base rounded-lg px-3 py-2
                 text-xs text-matchx-text-secondary shadow-lg"
        >
          <AlertCircle class="w-3.5 h-3.5 text-matchx-accent-orange shrink-0" :stroke-width="2" />
          Torneo completo — máximo {{ cuposMax }} equipos
        </div>
      </div>
    </div>

    <!-- Selector torneo + métricas -->
    <AppCard :hover="false" class="relative z-20">
      <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div class="flex-1 w-full">
          <AppSelect v-model="selectedTorneoId" :options="torneoOptions" label="Selecciona un torneo" />
        </div>
        <div v-if="torneoSeleccionado" class="flex flex-wrap items-center gap-3 pb-1 shrink-0">
          <div class="text-sm text-matchx-text-muted">
            Cupos:
            <span :class="estaLleno ? 'text-matchx-accent-orange' : 'text-matchx-accent-green'" class="font-semibold">
              {{ cuposOcupados }}{{ cuposMax > 0 ? ` / ${cuposMax}` : '' }}
            </span>
          </div>
          <div v-if="valorMatricula > 0" class="text-sm text-matchx-text-muted">
            Matrícula: <span class="font-semibold text-matchx-text-primary">{{ formatCOP(valorMatricula) }}</span>
          </div>
          <!-- Alerta cobros pendientes -->
          <div
            v-if="pendientesPago > 0"
            class="flex items-center gap-1 text-xs font-medium text-matchx-accent-orange bg-matchx-accent-orange/10
                   border border-matchx-accent-orange/30 px-2 py-1 rounded-lg"
          >
            <AlertTriangle class="w-3 h-3 shrink-0" :stroke-width="2.5" />
            {{ pendientesPago }} cobro{{ pendientesPago > 1 ? 's' : '' }} pendiente{{ pendientesPago > 1 ? 's' : '' }}
          </div>
          <AppBadge v-if="estaLleno" variant="orange">Lleno</AppBadge>
        </div>
      </div>

      <div v-if="torneoSeleccionado && cuposMax > 0" class="mt-3">
        <div class="h-2 bg-matchx-bg-elevated rounded-full overflow-hidden">
          <div :class="['h-full rounded-full transition-all duration-500', barColor]" :style="{ width: `${porcentajeCupos}%` }" />
        </div>
      </div>
    </AppCard>

    <!-- Skeleton -->
    <div v-if="loadingInsc" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <AppCard v-for="i in 3" :key="i" :hover="false">
        <div class="animate-pulse space-y-3">
          <div class="flex gap-3">
            <div class="w-12 h-12 bg-matchx-bg-elevated rounded-lg shrink-0" />
            <div class="flex-1 space-y-2 pt-1">
              <div class="h-3.5 bg-matchx-bg-elevated rounded w-3/4" />
              <div class="h-2.5 bg-matchx-bg-elevated rounded w-1/2" />
            </div>
          </div>
          <div class="h-10 bg-matchx-bg-elevated rounded" />
          <div class="h-8 bg-matchx-bg-elevated rounded" />
        </div>
      </AppCard>
    </div>

    <!-- Empty -->
    <div v-else-if="inscripciones.length === 0" class="flex flex-col items-center gap-3 py-16">
      <Users class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay equipos inscritos</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Inscribe el primer equipo en este torneo</p>
      </div>
      <AppButton v-if="!estaLleno && selectedTorneoId" variant="primary" size="sm" @click="openNew">
        <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" /> Inscribir Equipo
      </AppButton>
    </div>

    <!-- Grid inscripciones -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <AppCard v-for="insc in inscripciones" :key="insc.id" class="flex flex-col gap-0 p-0 overflow-hidden">

        <!-- Franja superior de color del equipo -->
        <div
          class="h-1 w-full shrink-0"
          :style="{ background: `linear-gradient(to right, ${insc.equipo_color_principal || '#1a56db'}, ${insc.equipo_color_secundario || '#fff'})` }"
        />

        <div class="p-4 flex flex-col gap-3 flex-1">
          <!-- Avatar + nombre + badge inscripción -->
          <div class="flex items-center gap-3">
            <div
              v-if="insc.equipo_escudo_url"
              class="w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-matchx-bg-elevated"
            >
              <img :src="insc.equipo_escudo_url" :alt="insc.equipo_nombre" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center font-bold text-white text-base select-none"
              :style="{ background: `linear-gradient(135deg, ${insc.equipo_color_principal || '#1a56db'}, ${insc.equipo_color_secundario || '#fff'})` }"
            >
              {{ insc.equipo_nombre_corto || insc.equipo_nombre.slice(0, 2).toUpperCase() }}
            </div>

            <div class="flex-1 min-w-0">
              <div class="font-semibold text-matchx-text-primary truncate text-sm">{{ insc.equipo_nombre }}</div>
              <div class="text-xs text-matchx-text-muted mt-0.5">
                {{ insc.fecha_inscripcion ? insc.fecha_inscripcion.slice(0, 10) : '' }}
              </div>
            </div>

            <AppBadge :variant="estadoBadge(insc.estado)" class="shrink-0 text-xs">
              {{ estadoLabel[insc.estado] }}
            </AppBadge>
          </div>

          <!-- Sección pago matrícula -->
          <div
            class="rounded-lg border px-3 py-2.5 flex items-center justify-between gap-2"
            :class="{
              'border-matchx-accent-green/30 bg-matchx-accent-green/5': insc.pago_estado === 'pagado',
              'border-matchx-accent-orange/30 bg-matchx-accent-orange/5': insc.pago_estado === 'pendiente',
              'border-blue-500/30 bg-blue-500/5': insc.pago_estado === 'exento',
            }"
          >
            <div class="min-w-0">
              <!-- Pagado -->
              <template v-if="insc.pago_estado === 'pagado'">
                <div class="flex items-center gap-1.5">
                  <CheckCircle class="w-3.5 h-3.5 text-matchx-accent-green shrink-0" :stroke-width="2" />
                  <span class="text-xs font-semibold text-matchx-accent-green">Pagado</span>
                  <span v-if="insc.pago_metodo" class="text-xs text-matchx-text-muted">· {{ metodoLabel[insc.pago_metodo] }}</span>
                </div>
                <div v-if="insc.pago_referencia" class="text-xs text-matchx-text-muted mt-0.5 font-mono truncate">
                  Ref: {{ insc.pago_referencia }}
                </div>
              </template>

              <!-- Exento -->
              <template v-else-if="insc.pago_estado === 'exento'">
                <div class="flex items-center gap-1.5">
                  <ShieldCheck class="w-3.5 h-3.5 text-blue-400 shrink-0" :stroke-width="2" />
                  <span class="text-xs font-semibold text-blue-400">Exento de pago</span>
                </div>
              </template>

              <!-- Pendiente -->
              <template v-else>
                <div class="flex items-center gap-1.5">
                  <Banknote class="w-3.5 h-3.5 text-matchx-accent-orange shrink-0" :stroke-width="2" />
                  <span class="text-xs font-semibold text-matchx-accent-orange">Sin pagar</span>
                  <span v-if="valorMatricula > 0" class="text-xs text-matchx-text-muted">
                    · {{ formatCOP(valorMatricula) }}
                  </span>
                </div>
              </template>
            </div>

            <!-- Acción de pago rápida -->
            <div class="shrink-0 flex gap-1.5">
              <button
                v-if="insc.pago_estado === 'pendiente'"
                @click="openModalPago(insc)"
                class="text-xs font-semibold px-2.5 py-1 rounded-md bg-matchx-accent-orange/10 text-matchx-accent-orange
                       border border-matchx-accent-orange/30 hover:bg-matchx-accent-orange/20 transition-colors cursor-pointer"
              >
                Registrar pago
              </button>
              <button
                v-if="insc.pago_estado === 'pendiente'"
                @click="eximirPago(insc)"
                class="text-xs font-medium px-2 py-1 rounded-md text-matchx-text-muted
                       hover:text-matchx-text-secondary hover:bg-matchx-bg-elevated transition-colors cursor-pointer"
                title="Eximir de pago"
              >
                Eximir
              </button>
              <button
                v-if="insc.pago_estado === 'pagado'"
                @click="openModalPago(insc)"
                class="text-xs font-medium px-2 py-1 rounded-md text-matchx-text-muted
                       hover:text-matchx-text-secondary hover:bg-matchx-bg-elevated transition-colors cursor-pointer"
                title="Ver/editar pago"
              >
                <ReceiptText class="w-3.5 h-3.5" :stroke-width="1.75" />
              </button>
            </div>
          </div>

          <!-- Observaciones -->
          <p v-if="insc.observaciones" class="text-xs text-matchx-text-muted line-clamp-2">
            {{ insc.observaciones }}
          </p>

          <!-- Separador -->
          <div class="border-t border-matchx-border-base/50 -mx-4" />

          <!-- Acciones inscripción -->
          <div class="flex gap-2 -mb-1">
            <template v-if="insc.estado === 'pendiente'">
              <!-- Advertencia si falta el pago -->
              <div v-if="insc.pago_estado === 'pendiente'" class="w-full">
                <div class="flex items-center gap-1.5 text-xs text-matchx-accent-orange/80 mb-2">
                  <AlertTriangle class="w-3 h-3 shrink-0" :stroke-width="2" />
                  Pago pendiente — puedes aprobar igualmente
                </div>
                <div class="flex gap-2">
                  <AppButton variant="primary" size="sm" class="flex-1" @click="cambiarEstado(insc, 'aprobada')">
                    <CheckCircle class="w-3.5 h-3.5 mr-1" :stroke-width="2" /> Aprobar
                  </AppButton>
                  <AppButton variant="danger" size="sm" @click="cambiarEstado(insc, 'rechazada')">
                    <XCircle class="w-3.5 h-3.5" :stroke-width="2" />
                  </AppButton>
                </div>
              </div>
              <template v-else>
                <AppButton variant="primary" size="sm" class="flex-1" @click="cambiarEstado(insc, 'aprobada')">
                  <CheckCircle class="w-3.5 h-3.5 mr-1" :stroke-width="2" /> Aprobar
                </AppButton>
                <AppButton variant="danger" size="sm" @click="cambiarEstado(insc, 'rechazada')">
                  <XCircle class="w-3.5 h-3.5" :stroke-width="2" />
                </AppButton>
              </template>
            </template>

            <template v-else-if="insc.estado === 'aprobada'">
              <div class="flex-1 flex items-center gap-1.5 text-xs text-matchx-accent-green font-medium px-1">
                <CheckCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> Inscripción aprobada
              </div>
              <AppButton variant="danger" size="sm" @click="retirar(insc)">
                <UserMinus class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
            </template>

            <template v-else>
              <div class="flex-1 flex items-center gap-1.5 text-xs text-matchx-accent-orange font-medium px-1">
                <XCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> Rechazada
              </div>
              <AppButton variant="danger" size="sm" @click="retirar(insc)">
                <UserMinus class="w-3.5 h-3.5" :stroke-width="2" />
              </AppButton>
            </template>
          </div>
        </div>
      </AppCard>
    </div>


    <!-- ═══════════════════════════════════════════════════════════
         MODAL: Inscribir equipo
    ═══════════════════════════════════════════════════════════ -->
    <AppModal :open="showModalInsc" title="Inscribir Equipo" @update:open="showModalInsc = $event">
      <div class="space-y-4">
        <div v-if="equiposDisponibles.length === 0"
             class="flex items-start gap-2 rounded-lg border border-matchx-accent-orange/30 bg-matchx-accent-orange/10 p-3">
          <AlertCircle class="w-4 h-4 text-matchx-accent-orange shrink-0 mt-0.5" :stroke-width="2" />
          <div class="text-sm text-matchx-text-secondary">
            Todos los equipos registrados ya están inscritos en este torneo.
            <br/>
            <span class="text-matchx-text-muted text-xs">Ve a <strong class="text-matchx-accent-green">Equipos</strong> para crear nuevos.</span>
          </div>
        </div>
        <template v-else>
          <AppSelect v-model="formInsc.equipo_id" :options="equiposDisponibles" label="Equipo" required />
          <div>
            <label class="text-sm font-medium text-matchx-text-secondary block mb-1.5">Observaciones (opcional)</label>
            <textarea
              v-model="formInsc.observaciones" rows="3"
              placeholder="Notas sobre la inscripción..."
              class="w-full px-3 py-2 rounded-lg bg-matchx-bg-base border border-matchx-border-base
                     text-matchx-text-primary text-sm resize-none focus:outline-none
                     focus:border-matchx-accent-green transition-colors"
            />
          </div>
        </template>
        <p v-if="saveErrorInsc" class="text-sm text-matchx-accent-orange flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> {{ saveErrorInsc }}
        </p>
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModalInsc = false">Cancelar</AppButton>
          <AppButton variant="primary" :disabled="!formInsc.equipo_id" @click="saveInscripcion">Inscribir</AppButton>
        </div>
      </template>
    </AppModal>


    <!-- ═══════════════════════════════════════════════════════════
         MODAL: Registrar pago de matrícula
    ═══════════════════════════════════════════════════════════ -->
    <AppModal
      :open="showModalPago"
      title="Registrar Pago de Matrícula"
      size="md"
      @update:open="showModalPago = $event"
    >
      <div v-if="inscSeleccionada" class="space-y-5">

        <!-- Info torneo + equipo -->
        <div class="flex items-center gap-3 p-3 rounded-xl bg-matchx-bg-elevated border border-matchx-border-base">
          <div
            v-if="inscSeleccionada.equipo_escudo_url"
            class="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-matchx-bg-base"
          >
            <img :src="inscSeleccionada.equipo_escudo_url" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-matchx-text-primary text-sm truncate">{{ inscSeleccionada.equipo_nombre }}</p>
            <p class="text-xs text-matchx-text-muted">{{ torneoSeleccionado?.nombre }}</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-lg font-black text-matchx-text-primary">{{ formatCOP(valorMatricula) }}</p>
            <p class="text-xs text-matchx-text-muted">Valor matrícula</p>
          </div>
        </div>

        <!-- Selector de método de pago -->
        <div>
          <p class="text-sm font-semibold text-matchx-text-secondary mb-2.5">Método de pago</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="m in metodosPago"
              :key="m.value"
              @click="formPago.pago_metodo = m.value"
              class="relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 cursor-pointer font-medium text-sm"
              :class="formPago.pago_metodo === m.value
                ? m.color + ' border-current ring-2 ring-current/20 scale-105'
                : 'border-matchx-border-base text-matchx-text-muted hover:border-matchx-border-base/70 hover:text-matchx-text-secondary'"
            >
              <!-- Icono por método -->
              <span class="text-xl leading-none">
                <template v-if="m.value === 'efectivo'">💵</template>
                <template v-else-if="m.value === 'nequi'">💜</template>
                <template v-else-if="m.value === 'bancolombia'">🏦</template>
                <template v-else-if="m.value === 'pse'">🔒</template>
                <template v-else-if="m.value === 'daviplata'">❤️</template>
              </span>
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
        <div v-if="formPago.pago_metodo">
          <AppInput
            v-model="formPago.pago_referencia"
            :label="formPago.pago_metodo === 'efectivo' ? 'Número de recibo (opcional)' : 'Número de referencia / comprobante'"
            :placeholder="formPago.pago_metodo === 'nequi' ? 'Ej: NEQ-20260415-1234'
              : formPago.pago_metodo === 'bancolombia' ? 'Ej: BAN-20260415-CTA'
              : formPago.pago_metodo === 'pse' ? 'Ej: PSE-2026-00123'
              : formPago.pago_metodo === 'daviplata' ? 'Ej: DVP-20260415-5678'
              : 'Ej: REC-001'"
          />
          <!-- Instrucciones por método -->
          <p class="text-xs text-matchx-text-muted mt-1.5">
            <template v-if="formPago.pago_metodo === 'nequi'">
              Ingresa el número de transacción que aparece en el comprobante de Nequi
            </template>
            <template v-else-if="formPago.pago_metodo === 'bancolombia'">
              Número de transacción de la transferencia Bancolombia
            </template>
            <template v-else-if="formPago.pago_metodo === 'pse'">
              Número de aprobación PSE del banco correspondiente
            </template>
            <template v-else-if="formPago.pago_metodo === 'daviplata'">
              Número de transacción Daviplata
            </template>
            <template v-else>
              Puedes dejar en blanco si no tienes recibo físico
            </template>
          </p>
        </div>

        <p v-if="saveErrorPago" class="text-sm text-matchx-accent-orange flex items-center gap-1.5">
          <AlertCircle class="w-3.5 h-3.5 shrink-0" :stroke-width="2" /> {{ saveErrorPago }}
        </p>
      </div>

      <template #footer>
        <div class="flex items-center gap-3">
          <!-- Eximir link -->
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
            {{ savingPago ? 'Guardando...' : 'Confirmar pago' }}
          </AppButton>
        </div>
      </template>
    </AppModal>

  </div>
</template>
