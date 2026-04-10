<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore } from '@/stores/jugadores'
import { useTorneosStore } from '@/stores/torneos'
import { useMultasEquipoStore } from '@/stores/multas-equipo'
import { pagosPendientesMock } from '@/services/sanciones.service'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  CircleDollarSign, CheckCircle2, Users, BookOpen,
  Plus, Check, Ban, Coins, ShieldOff,
} from 'lucide-vue-next'

const router         = useRouter()
const auth           = useAuthStore()
const equiposStore   = useEquiposStore()
const jugadoresStore = useJugadoresStore()
const torneosStore   = useTorneosStore()
const multasStore    = useMultasEquipoStore()

// ── Guard ────────────────────────────────────────────────────────────────────
if (!auth.isCapitan) router.replace('/capitan/dashboard')

// ── Datos base ───────────────────────────────────────────────────────────────

const miEquipo = computed(() =>
  equiposStore.equipos.find(e =>
    (auth.user?.equipo_id != null && e.id === auth.user.equipo_id) ||
    (import.meta.env.VITE_MOCK_API === 'true' && e.id === 1),
  ) ?? null,
)

const torneoActivo = computed(() => torneosStore.torneosActivos[0] ?? null)

const jugadores = computed(() =>
  miEquipo.value ? jugadoresStore.jugadoresPorEquipo(miEquipo.value.id) : [],
)

/** True solo si el torneo tiene precio asignado a alguna tarjeta */
const torneoCobraTarjetas = computed(() =>
  (torneoActivo.value?.valor_tarjeta_amarilla ?? 0) > 0
  || (torneoActivo.value?.valor_tarjeta_roja ?? 0) > 0,
)

// ── Carga ─────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
    torneosStore.fetchTorneos(),
  ])
  if (!miEquipo.value) return
  await multasStore.fetchMultas(miEquipo.value.id, jugadores.value.map(j => j.id))
})

// ── Pagos pendientes por tarjetas (mock → reemplazar con pagos.service) ──────

const pagosPendientes = computed(() => {
  if (!torneoActivo.value || !torneoCobraTarjetas.value) return []
  return pagosPendientesMock(
    torneoActivo.value.id,
    jugadores.value.map(j => j.id),
    torneoActivo.value.valor_tarjeta_amarilla,
    torneoActivo.value.valor_tarjeta_roja,
  )
})

const pagoJugador = (jugadorId: number) =>
  pagosPendientes.value.find(p => p.jugador_id === jugadorId) ?? null

// ── Resumen ───────────────────────────────────────────────────────────────────

const resumen = computed(() => ({
  pagosTorneo:  pagosPendientes.value.length,
  multasEquipo: miEquipo.value ? multasStore.getMultasPendientes(miEquipo.value.id).length : 0,
}))

// ── Ordenamiento: jugadores con deuda primero ─────────────────────────────────

const jugadoresOrdenados = computed(() =>
  [...jugadores.value].sort((a, b) => {
    const score = (id: number) =>
      (pagoJugador(id) ? 2 : 0)
      + (miEquipo.value && multasStore.getMultasJugador(miEquipo.value.id, id).some(m => m.estado === 'pendiente') ? 1 : 0)
    return score(b.id) - score(a.id)
  }),
)

// ── Modal: nueva multa ────────────────────────────────────────────────────────

const showNuevaMulta  = ref(false)
const nuevaMultaError = ref('')
const guardando       = ref(false)

const formMulta = ref({ jugador_id: 0, motivo: '', valor: '' })

const jugadorOptions = computed(() =>
  jugadores.value.map(j => ({
    value: j.id,
    label: `${j.nombre} ${j.apellido} (#${j.numero_camiseta})`,
  })),
)

const abrirNuevaMulta = () => {
  formMulta.value = { jugador_id: 0, motivo: '', valor: '' }
  nuevaMultaError.value = ''
  showNuevaMulta.value = true
}

const guardarMulta = async () => {
  nuevaMultaError.value = ''
  if (!formMulta.value.jugador_id) { nuevaMultaError.value = 'Selecciona un jugador'; return }
  if (!formMulta.value.motivo.trim()) { nuevaMultaError.value = 'El motivo es obligatorio'; return }
  const valor = Number(formMulta.value.valor)
  if (!valor || valor <= 0) { nuevaMultaError.value = 'El monto debe ser mayor a 0'; return }
  guardando.value = true
  try {
    await multasStore.crearMulta(miEquipo.value!.id, {
      jugador_id: formMulta.value.jugador_id,
      motivo:     formMulta.value.motivo.trim(),
      valor,
    })
    showNuevaMulta.value = false
  } catch (err: any) {
    nuevaMultaError.value = err.message ?? 'Error al guardar'
  } finally {
    guardando.value = false
  }
}

const marcarPagada = (multaId: number) => {
  if (miEquipo.value) multasStore.actualizarEstado(miEquipo.value.id, multaId, 'pagada')
}

const condonar = (multaId: number) => {
  if (miEquipo.value) multasStore.actualizarEstado(miEquipo.value.id, multaId, 'condonada')
}

// ── Visual ────────────────────────────────────────────────────────────────────

const formatPesos = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor)

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
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Sanciones</h1>
      <p class="text-matchx-text-muted mt-1">
        Multas y pagos de tu plantilla
        <span v-if="torneoActivo" class="text-matchx-text-secondary">
          · {{ torneoActivo.nombre }}
        </span>
      </p>
    </div>

    <!-- Sin datos -->
    <div v-if="!miEquipo || !torneoActivo" class="flex flex-col items-center gap-3 py-16">
      <ShieldOff class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted text-sm">No hay equipo o torneo activo asignado</p>
    </div>

    <template v-else>

      <!-- ── Resumen ──────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Pagos al torneo — solo si cobra tarjetas -->
        <AppCard v-if="torneoCobraTarjetas" :hover="false" class="!p-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Coins class="w-5 h-5 text-blue-400" :stroke-width="1.75" />
            </div>
            <div>
              <div class="text-2xl font-bold text-blue-400">{{ resumen.pagosTorneo }}</div>
              <div class="text-[11px] text-matchx-text-muted leading-tight">Pagos al torneo</div>
            </div>
          </div>
        </AppCard>

        <!-- Multas del equipo -->
        <AppCard :hover="false" class="!p-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-matchx-accent-orange/10 flex items-center justify-center shrink-0">
              <CircleDollarSign class="w-5 h-5 text-matchx-accent-orange" :stroke-width="1.75" />
            </div>
            <div>
              <div class="text-2xl font-bold text-matchx-accent-orange">{{ resumen.multasEquipo }}</div>
              <div class="text-[11px] text-matchx-text-muted leading-tight">Multas equipo</div>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════
           SECCIÓN 1: Pagos al torneo por tarjetas
           Solo se muestra si el torneo tiene precios configurados
      ══════════════════════════════════════════════════════════════════ -->
      <div v-if="torneoCobraTarjetas">
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1 bg-matchx-border-base/50" />
          <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Coins class="w-3.5 h-3.5" :stroke-width="2" />
            Pagos al torneo
          </span>
          <div class="h-px flex-1 bg-matchx-border-base/50" />
        </div>

        <!-- Precio de tarjetas -->
        <AppCard :hover="false" class="mb-3">
          <div class="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <div class="flex items-center gap-1.5">
              <BookOpen class="w-3.5 h-3.5 text-matchx-text-muted shrink-0" :stroke-width="1.75" />
              <span class="text-matchx-text-muted">Tarifa por tarjeta:</span>
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

        <!-- Jugadores con pago pendiente -->
        <div class="space-y-2">
          <AppCard
            v-for="jugador in jugadoresOrdenados.filter(j => pagoJugador(j.id))"
            :key="jugador.id"
            :hover="false"
            class="!p-3"
          >
            <div class="flex items-center gap-3">
              <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(jugador.id)]">
                {{ jugador.nombre[0] }}{{ jugador.apellido[0] }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-sm text-matchx-text-primary">
                    {{ jugador.nombre }} {{ jugador.apellido }}
                  </span>
                  <span class="text-xs text-matchx-text-muted">#{{ jugador.numero_camiseta }}</span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span class="w-3 h-3 rounded-sm shrink-0"
                    :class="pagoJugador(jugador.id)!.tipo === 'tarjeta_amarilla' ? 'bg-yellow-400' : 'bg-red-400'" />
                  <span class="text-xs text-matchx-text-secondary">
                    Tarjeta {{ pagoJugador(jugador.id)!.tipo === 'tarjeta_amarilla' ? 'amarilla' : 'roja' }}
                    — debe pagarse al admin del torneo para habilitarse
                  </span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="text-sm font-bold text-blue-400">
                  {{ formatPesos(pagoJugador(jugador.id)!.valor) }}
                </div>
                <AppBadge variant="blue" :dot="false" class="mt-1">Sin pagar</AppBadge>
              </div>
            </div>
          </AppCard>

          <!-- Sin pagos pendientes -->
          <AppCard v-if="pagosPendientes.length === 0" :hover="false" class="!p-5">
            <div class="flex items-center gap-3">
              <CheckCircle2 class="w-7 h-7 text-matchx-accent-green/50 shrink-0" :stroke-width="1.5" />
              <p class="text-sm text-matchx-text-muted">Ningún jugador tiene pagos pendientes al torneo</p>
            </div>
          </AppCard>
        </div>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════
           SECCIÓN 2: Multas internas del equipo
      ══════════════════════════════════════════════════════════════════ -->
      <div>
        <div class="flex items-center gap-3 mb-3">
          <div class="h-px flex-1 bg-matchx-border-base/50" />
          <span class="text-xs font-semibold text-matchx-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <CircleDollarSign class="w-3.5 h-3.5" :stroke-width="2" />
            Multas internas del equipo
          </span>
          <div class="h-px flex-1 bg-matchx-border-base/50" />
        </div>

        <div class="flex items-center justify-between mb-3">
          <p class="text-xs text-matchx-text-muted">
            Multas creadas por el capitán. No afectan la habilitación en el torneo.
          </p>
          <AppButton variant="primary" size="sm" @click="abrirNuevaMulta">
            <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
            Nueva multa
          </AppButton>
        </div>

        <div class="space-y-2">
          <template v-for="jugador in jugadoresOrdenados" :key="jugador.id">
            <AppCard
              v-for="multa in multasStore.getMultasJugador(miEquipo!.id, jugador.id).filter(m => m.estado === 'pendiente')"
              :key="multa.id"
              :hover="false"
              class="!p-3"
            >
              <div class="flex items-center gap-3">
                <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(jugador.id)]">
                  {{ jugador.nombre[0] }}{{ jugador.apellido[0] }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-0.5">
                    <span class="font-semibold text-sm text-matchx-text-primary">
                      {{ jugador.nombre }} {{ jugador.apellido }}
                    </span>
                    <span class="text-xs text-matchx-text-muted">#{{ jugador.numero_camiseta }}</span>
                  </div>
                  <div class="text-xs text-matchx-text-secondary">{{ multa.motivo }}</div>
                </div>
                <div class="shrink-0 text-right">
                  <div class="text-sm font-bold text-matchx-accent-orange">
                    {{ formatPesos(multa.valor) }}
                  </div>
                  <div class="flex items-center gap-1.5 mt-1.5 justify-end">
                    <button
                      class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                             bg-matchx-accent-green/10 text-matchx-accent-green border border-matchx-accent-green/20
                             hover:bg-matchx-accent-green/20 transition-colors"
                      @click="marcarPagada(multa.id)"
                    >
                      <Check class="w-3 h-3" :stroke-width="2.5" />
                      Pagada
                    </button>
                    <button
                      class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                             bg-matchx-bg-elevated text-matchx-text-muted border border-matchx-border-base
                             hover:text-matchx-text-primary transition-colors"
                      @click="condonar(multa.id)"
                    >
                      <Ban class="w-3 h-3" :stroke-width="2" />
                      Condonar
                    </button>
                  </div>
                </div>
              </div>
            </AppCard>
          </template>

          <!-- Empty multas equipo -->
          <AppCard
            v-if="!multasStore.getMultasPendientes(miEquipo!.id).length"
            :hover="false"
            class="!p-5"
          >
            <div class="flex items-center gap-3">
              <CheckCircle2 class="w-7 h-7 text-matchx-accent-green/50 shrink-0" :stroke-width="1.5" />
              <p class="text-sm text-matchx-text-muted">No hay multas internas pendientes</p>
            </div>
          </AppCard>
        </div>
      </div>

    </template>
  </div>

  <!-- ── Modal: nueva multa ─────────────────────────────────────────────────── -->
  <AppModal v-model:open="showNuevaMulta" size="sm" title="Nueva multa interna" :close-button="true">
    <div class="space-y-4">
      <AppSelect
        v-model="formMulta.jugador_id"
        :options="jugadorOptions"
        label="Jugador"
        placeholder="Selecciona un jugador"
      />
      <AppInput
        v-model="formMulta.motivo"
        label="Motivo"
        placeholder="Ej: Inasistencia al entrenamiento del martes"
      />
      <AppInput
        v-model="formMulta.valor"
        type="number"
        label="Monto (COP)"
        placeholder="Ej: 30000"
      />
      <p v-if="nuevaMultaError" class="text-sm text-red-400">{{ nuevaMultaError }}</p>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showNuevaMulta = false">Cancelar</AppButton>
        <AppButton variant="primary" :disabled="guardando" @click="guardarMulta">
          {{ guardando ? 'Guardando…' : 'Crear multa' }}
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
