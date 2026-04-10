<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTorneosStore } from '@/stores/torneos'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { usePagosStore, type Pago } from '@/stores/pagos'
import type { MetodoPago } from '@/services/pagos.service'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  Coins, CheckCircle2, Clock, Check, Ban,
  BookOpen, Users, History, Wand2,
} from 'lucide-vue-next'

const auth           = useAuthStore()
const torneosStore   = useTorneosStore()
const equiposStore   = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const pagosStore     = usePagosStore()

// ── Selección de torneo ───────────────────────────────────────────────────────

const torneoSeleccionadoId = ref<number | null>(null)

const torneoActivo = computed(() =>
  torneoSeleccionadoId.value
    ? torneosStore.torneos.find(t => t.id === torneoSeleccionadoId.value) ?? null
    : torneosStore.torneosActivos[0] ?? null,
)

const torneoOptions = computed(() =>
  torneosStore.torneosActivos.map(t => ({ value: t.id, label: t.nombre })),
)

// ── Datos del torneo ──────────────────────────────────────────────────────────

const equiposDelTorneo = computed(() =>
  torneoActivo.value
    ? equiposStore.equipos.filter(e => /* placeholder — filtrar por torneo cuando haya campo */ e.id > 0)
    : [],
)

const nombreEquipo = (id: number) =>
  equiposStore.obtenerPorId(id)?.nombre ?? `Equipo ${id}`

const nombreJugador = (id: number) => {
  const j = jugadoresStore.jugadores.find(jug => jug.id === id)
  return j ? `${j.nombre} ${j.apellido}` : `Jugador ${id}`
}

const camisetaJugador = (id: number) =>
  jugadoresStore.jugadores.find(j => j.id === id)?.numero_camiseta ?? '–'

// ── Carga ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    torneosStore.fetchTorneos(),
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
  ])
  await cargarPagos()
})

const cargarPagos = async () => {
  if (!torneoActivo.value) return
  const equipos = equiposDelTorneo.value.map(e => ({
    equipo_id:   e.id,
    jugador_ids: jugadoresStore.jugadoresPorEquipo(e.id).map(j => j.id),
  }))
  await pagosStore.fetchPagos(
    torneoActivo.value.id,
    equipos,
    torneoActivo.value.valor_tarjeta_amarilla,
    torneoActivo.value.valor_tarjeta_roja,
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const tabActiva = ref<'pendientes' | 'historial'>('pendientes')

const pagosMostrados = computed(() =>
  tabActiva.value === 'pendientes'
    ? pagosStore.getPendientes(torneoActivo.value?.id ?? 0)
    : pagosStore.getHistorial(torneoActivo.value?.id ?? 0),
)

// Agrupados por equipo para la vista
const pagosPorEquipo = computed(() => {
  const mapa: Record<number, Pago[]> = {}
  pagosMostrados.value.forEach(p => {
    if (!mapa[p.equipo_id]) mapa[p.equipo_id] = []
    mapa[p.equipo_id].push(p)
  })
  return mapa
})

const equiposConPagos = computed(() =>
  Object.keys(pagosPorEquipo.value).map(Number),
)

// ── Resumen ───────────────────────────────────────────────────────────────────

const resumen = computed(() => {
  const torneoId = torneoActivo.value?.id ?? 0
  const pendientes = pagosStore.getPendientes(torneoId)
  return {
    pendientes: pendientes.length,
    totalDeuda: pendientes.reduce((acc, p) => acc + p.valor, 0),
    confirmados: pagosStore.getHistorial(torneoId).filter(p => p.estado === 'pagado').length,
  }
})

// ── Modal: confirmar pago ─────────────────────────────────────────────────────

const showConfirmar  = ref(false)
const pagoSeleccionado = ref<Pago | null>(null)
const confirmError   = ref('')
const confirmando    = ref(false)

const metodosOptions = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'nequi',         label: 'Nequi' },
  { value: 'daviplata',     label: 'Daviplata' },
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'otro',          label: 'Otro' },
]

const formConfirmar = ref<{ metodo: MetodoPago; recibo: string }>({
  metodo: 'efectivo',
  recibo: '',
})

const abrirConfirmar = (pago: Pago) => {
  pagoSeleccionado.value = pago
  formConfirmar.value = { metodo: 'efectivo', recibo: '' }
  confirmError.value = ''
  showConfirmar.value = true
}

const guardarConfirmacion = async () => {
  confirmError.value = ''
  if (!formConfirmar.value.recibo.trim()) {
    confirmError.value = 'El número de recibo es obligatorio'
    return
  }
  confirmando.value = true
  try {
    await pagosStore.confirmarPago(
      torneoActivo.value!.id,
      pagoSeleccionado.value!.id,
      { metodo_pago: formConfirmar.value.metodo, numero_recibo: formConfirmar.value.recibo.trim() },
      auth.user?.id ?? 0,
    )
    showConfirmar.value = false
  } catch (err: any) {
    confirmError.value = err.message ?? 'Error al confirmar'
  } finally {
    confirmando.value = false
  }
}

const condonarPago = (pago: Pago) => {
  if (!torneoActivo.value) return
  pagosStore.condonarPago(torneoActivo.value.id, pago.id)
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Genera un código de recibo único: REC-YYYYMMDD-XXXXXX
 * Usa caracteres sin ambigüedad (sin 0/O, 1/I) para facilitar la lectura.
 */
const generarCodigoRecibo = () => {
  const fecha  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const chars  = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  formConfirmar.value.recibo = `REC-${fecha}-${random}`
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v)

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

const avatarColors = [
  'bg-matchx-accent-green/20 text-matchx-accent-green',
  'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
]
const avatarColor = (id: number) => avatarColors[id % 4]
</script>

<template>
  <div class="space-y-6">

    <!-- Encabezado -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Sanciones</h1>
        <p class="text-matchx-text-muted mt-1">Pagos de tarjetas pendientes de confirmación</p>
      </div>
      <!-- Selector de torneo (si hay varios activos) -->
      <div v-if="torneoOptions.length > 1" class="w-56">
        <AppSelect
          v-model="torneoSeleccionadoId"
          :options="torneoOptions"
          label="Torneo"
        />
      </div>
    </div>

    <!-- Sin torneo activo -->
    <div v-if="!torneoActivo" class="flex flex-col items-center gap-3 py-16">
      <Coins class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted text-sm">No hay torneos activos</p>
    </div>

    <template v-else>

      <!-- Torneo no cobra tarjetas -->
      <AppCard v-if="!torneoActivo.valor_tarjeta_amarilla && !torneoActivo.valor_tarjeta_roja" :hover="false">
        <div class="flex items-center gap-3 py-2">
          <BookOpen class="w-5 h-5 text-matchx-text-muted shrink-0" :stroke-width="1.75" />
          <p class="text-sm text-matchx-text-muted">
            El torneo <span class="text-matchx-text-secondary font-medium">{{ torneoActivo.nombre }}</span>
            no tiene tarifas de tarjetas configuradas.
          </p>
        </div>
      </AppCard>

      <template v-else>

        <!-- ── Resumen ─────────────────────────────────────────────────────── -->
        <div class="grid grid-cols-3 gap-3">
          <AppCard :hover="false" class="!p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-matchx-accent-orange/10 flex items-center justify-center shrink-0">
                <Clock class="w-5 h-5 text-matchx-accent-orange" :stroke-width="1.75" />
              </div>
              <div>
                <div class="text-2xl font-bold text-matchx-accent-orange">{{ resumen.pendientes }}</div>
                <div class="text-[11px] text-matchx-text-muted leading-tight">Pendientes</div>
              </div>
            </div>
          </AppCard>

          <AppCard :hover="false" class="!p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Coins class="w-5 h-5 text-red-400" :stroke-width="1.75" />
              </div>
              <div>
                <div class="text-lg font-bold text-red-400 leading-tight">{{ formatPesos(resumen.totalDeuda) }}</div>
                <div class="text-[11px] text-matchx-text-muted leading-tight">Por cobrar</div>
              </div>
            </div>
          </AppCard>

          <AppCard :hover="false" class="!p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-matchx-accent-green/10 flex items-center justify-center shrink-0">
                <CheckCircle2 class="w-5 h-5 text-matchx-accent-green" :stroke-width="1.75" />
              </div>
              <div>
                <div class="text-2xl font-bold text-matchx-accent-green">{{ resumen.confirmados }}</div>
                <div class="text-[11px] text-matchx-text-muted leading-tight">Confirmados</div>
              </div>
            </div>
          </AppCard>
        </div>

        <!-- Tarifas del torneo -->
        <AppCard :hover="false">
          <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div class="flex items-center gap-1.5">
              <BookOpen class="w-3.5 h-3.5 text-matchx-text-muted" :stroke-width="1.75" />
              <span class="text-matchx-text-muted">{{ torneoActivo.nombre }}</span>
            </div>
            <div v-if="torneoActivo.valor_tarjeta_amarilla > 0" class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-sm bg-yellow-400 shrink-0" />
              <span class="text-matchx-text-muted">Amarilla:</span>
              <span class="text-yellow-400 font-semibold">{{ formatPesos(torneoActivo.valor_tarjeta_amarilla) }}</span>
            </div>
            <div v-if="torneoActivo.valor_tarjeta_roja > 0" class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-sm bg-red-400 shrink-0" />
              <span class="text-matchx-text-muted">Roja:</span>
              <span class="text-red-400 font-semibold">{{ formatPesos(torneoActivo.valor_tarjeta_roja) }}</span>
            </div>
          </div>
        </AppCard>

        <!-- ── Tabs ──────────────────────────────────────────────────────── -->
        <div class="flex gap-1 p-1 bg-matchx-bg-surface rounded-xl border border-matchx-border-base w-fit">
          <button
            :class="[
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tabActiva === 'pendientes'
                ? 'bg-matchx-accent-orange/15 text-matchx-accent-orange'
                : 'text-matchx-text-muted hover:text-matchx-text-primary',
            ]"
            @click="tabActiva = 'pendientes'"
          >
            <Clock class="w-3.5 h-3.5" :stroke-width="2" />
            Pendientes
            <span v-if="resumen.pendientes > 0"
                  class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                         bg-matchx-accent-orange text-matchx-bg-base">
              {{ resumen.pendientes }}
            </span>
          </button>
          <button
            :class="[
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tabActiva === 'historial'
                ? 'bg-matchx-accent-green/15 text-matchx-accent-green'
                : 'text-matchx-text-muted hover:text-matchx-text-primary',
            ]"
            @click="tabActiva = 'historial'"
          >
            <History class="w-3.5 h-3.5" :stroke-width="2" />
            Historial
          </button>
        </div>

        <!-- ── Lista de pagos agrupada por equipo ────────────────────────── -->
        <div v-if="equiposConPagos.length === 0" class="flex flex-col items-center gap-3 py-16">
          <CheckCircle2 class="w-12 h-12 text-matchx-accent-green/30" :stroke-width="1.5" />
          <p class="text-matchx-text-muted text-sm">
            {{ tabActiva === 'pendientes' ? 'No hay pagos pendientes' : 'Sin historial de pagos' }}
          </p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="equipoId in equiposConPagos" :key="equipoId">

            <!-- Header del equipo -->
            <div class="flex items-center gap-2 mb-2">
              <Users class="w-4 h-4 text-matchx-text-muted" :stroke-width="1.75" />
              <span class="text-sm font-semibold text-matchx-text-primary">{{ nombreEquipo(equipoId) }}</span>
              <span class="text-xs text-matchx-text-muted">
                · {{ pagosPorEquipo[equipoId].length }} pago{{ pagosPorEquipo[equipoId].length !== 1 ? 's' : '' }}
              </span>
            </div>

            <!-- Filas de pagos -->
            <div class="space-y-2 ml-2">
              <AppCard
                v-for="pago in pagosPorEquipo[equipoId]"
                :key="pago.id"
                :hover="false"
                class="!p-3"
              >
                <div class="flex items-center gap-3">
                  <!-- Avatar -->
                  <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(pago.jugador_id)]">
                    {{ nombreJugador(pago.jugador_id).split(' ').map(w => w[0]).slice(0,2).join('') }}
                  </div>

                  <!-- Info jugador -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-semibold text-sm text-matchx-text-primary">
                        {{ nombreJugador(pago.jugador_id) }}
                      </span>
                      <span class="text-xs text-matchx-text-muted">#{{ camisetaJugador(pago.jugador_id) }}</span>
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span :class="['w-3 h-3 rounded-sm shrink-0', pago.tipo_pago === 'tarjeta_amarilla' ? 'bg-yellow-400' : 'bg-red-400']" />
                      <span class="text-xs text-matchx-text-muted">
                        Tarjeta {{ pago.tipo_pago === 'tarjeta_amarilla' ? 'amarilla' : 'roja' }}
                        · {{ formatFecha(pago.creado_en) }}
                      </span>
                    </div>
                    <!-- Historial: info de pago -->
                    <div v-if="pago.estado !== 'pendiente'" class="flex items-center gap-2 mt-0.5 text-[11px] text-matchx-text-muted">
                      <span v-if="pago.estado === 'pagado'">
                        Recibido: {{ pago.metodo_pago }} · Recibo #{{ pago.numero_recibo }}
                      </span>
                      <span v-else>Condonado</span>
                    </div>
                  </div>

                  <!-- Monto + estado/acciones -->
                  <div class="shrink-0 text-right">
                    <div class="text-sm font-bold"
                         :class="pago.tipo_pago === 'tarjeta_amarilla' ? 'text-yellow-400' : 'text-red-400'">
                      {{ formatPesos(pago.valor) }}
                    </div>

                    <!-- Pendiente: botones de acción -->
                    <div v-if="pago.estado === 'pendiente'" class="flex items-center gap-1.5 mt-1.5 justify-end">
                      <button
                        class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                               bg-matchx-accent-green/10 text-matchx-accent-green border border-matchx-accent-green/20
                               hover:bg-matchx-accent-green/20 transition-colors"
                        @click="abrirConfirmar(pago)"
                      >
                        <Check class="w-3 h-3" :stroke-width="2.5" />
                        Confirmar
                      </button>
                      <button
                        class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                               bg-matchx-bg-elevated text-matchx-text-muted border border-matchx-border-base
                               hover:text-matchx-text-primary transition-colors"
                        @click="condonarPago(pago)"
                      >
                        <Ban class="w-3 h-3" :stroke-width="2" />
                        Condonar
                      </button>
                    </div>

                    <!-- Historial: badge de estado -->
                    <div v-else class="mt-1.5 flex justify-end">
                      <AppBadge
                        :variant="pago.estado === 'pagado' ? 'green' : 'gray'"
                        :dot="false"
                      >
                        {{ pago.estado === 'pagado' ? 'Pagado' : 'Condonado' }}
                      </AppBadge>
                    </div>
                  </div>
                </div>
              </AppCard>
            </div>

          </div>
        </div>

      </template>
    </template>
  </div>

  <!-- ── Modal: confirmar pago ──────────────────────────────────────────────── -->
  <AppModal
    v-if="pagoSeleccionado"
    v-model:open="showConfirmar"
    size="sm"
    title="Confirmar pago recibido"
    :close-button="true"
  >
    <div class="space-y-4">
      <!-- Resumen del pago -->
      <div class="flex items-center gap-3 p-3 rounded-lg bg-matchx-bg-elevated border border-matchx-border-base">
        <span :class="['w-4 h-4 rounded-sm shrink-0', pagoSeleccionado.tipo_pago === 'tarjeta_amarilla' ? 'bg-yellow-400' : 'bg-red-400']" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-matchx-text-primary">
            {{ nombreJugador(pagoSeleccionado.jugador_id) }}
          </div>
          <div class="text-xs text-matchx-text-muted">
            Tarjeta {{ pagoSeleccionado.tipo_pago === 'tarjeta_amarilla' ? 'amarilla' : 'roja' }}
            · {{ nombreEquipo(pagoSeleccionado.equipo_id) }}
          </div>
        </div>
        <div class="text-base font-bold"
             :class="pagoSeleccionado.tipo_pago === 'tarjeta_amarilla' ? 'text-yellow-400' : 'text-red-400'">
          {{ formatPesos(pagoSeleccionado.valor) }}
        </div>
      </div>

      <AppSelect
        v-model="formConfirmar.metodo"
        :options="metodosOptions"
        label="Método de pago"
      />
      <!-- Recibo con generador automático -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-matchx-text-secondary">
          Número de recibo / comprobante
        </label>
        <div class="flex items-center gap-0 rounded-lg border border-matchx-border-base
                    bg-matchx-bg-base focus-within:border-matchx-accent-green
                    focus-within:ring-2 focus-within:ring-matchx-accent-green/20 overflow-hidden">
          <input
            v-model="formConfirmar.recibo"
            type="text"
            placeholder="Ej: 0042 o REC-20260410-A3F7K2"
            class="flex-1 px-3 py-2 bg-transparent text-matchx-text-primary
                   placeholder-matchx-text-muted text-sm outline-none font-body"
          />
          <button
            type="button"
            title="Generar código único"
            class="flex items-center gap-1.5 px-3 py-2 shrink-0 border-l border-matchx-border-base
                   text-matchx-text-muted hover:text-matchx-accent-green hover:bg-matchx-accent-green/5
                   transition-colors text-xs font-medium"
            @click="generarCodigoRecibo"
          >
            <Wand2 class="w-3.5 h-3.5" :stroke-width="2" />
            Generar
          </button>
        </div>
      </div>
      <p v-if="confirmError" class="text-sm text-red-400">{{ confirmError }}</p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showConfirmar = false">Cancelar</AppButton>
        <AppButton variant="primary" :disabled="confirmando" @click="guardarConfirmacion">
          {{ confirmando ? 'Guardando…' : 'Confirmar pago' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
