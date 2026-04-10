<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUsuariosStore } from '@/stores/usuarios'
import { usePartidosStore } from '@/stores/partidos'
import { useArbitrosDisponibilidad } from '@/composables/useArbitrosDisponibilidad'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { Inbox, UserPlus, UserMinus, CheckCircle, XCircle, Clock, Users, ChevronRight, UserRoundCog, Flag } from 'lucide-vue-next'
import api from '@/services/api'

// ── Tipos ──────────────────────────────────────────────────────────────────
interface DatoAlta {
  nombre: string
  apellido: string
  numero_camiseta: number
  posicion: string
  tipo_documento?: string | null
  numero_documento?: string | null
}

interface Solicitud {
  id: number
  tipo: 'alta_jugador' | 'baja_jugador' | 'reasignacion_arbitro'
  equipo_id: number
  equipo_nombre: string
  partido_id?: number | null
  partido_descripcion?: string | null
  arbitro_id?: number | null
  arbitro_nombre?: string | null
  jugador_id: number | null
  jugador_nombre: string | null
  datos: DatoAlta | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  solicitado_por_nombre: string | null
  motivo_rechazo: string | null
  created_at: string
}

const usuariosStore = useUsuariosStore()
const partidosStore = usePartidosStore()

// ── Estado ─────────────────────────────────────────────────────────────────
const solicitudes  = ref<Solicitud[]>([])
const loading      = ref(false)
const filtro       = ref<'todas' | 'pendiente' | 'aprobado' | 'rechazado'>('todas')

const filtros = [
  { key: 'todas',     label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'aprobado',  label: 'Aprobadas' },
  { key: 'rechazado', label: 'Rechazadas' },
] as const

// ── Modal aprobar ──────────────────────────────────────────────────────────
const showAprobar     = ref(false)
const targetAprobar   = ref<Solicitud | null>(null)
const aprobarLoading  = ref(false)
const aprobarError    = ref('')
const aprobarDone     = ref(false)
const nuevoArbitroId  = ref<number>(0)

const { arbitrosConDisponibilidad } = useArbitrosDisponibilidad(
  () => {
    if (!targetAprobar.value?.partido_id) return null
    return partidosStore.obtenerPorId(targetAprobar.value.partido_id)?.fecha_hora ?? null
  },
  () => targetAprobar.value?.partido_id ?? null,
  () => targetAprobar.value?.arbitro_id ?? null,  // excluir al árbitro que solicita reemplazo
)

// ── Modal rechazar ─────────────────────────────────────────────────────────
const showRechazar   = ref(false)
const targetRechazar = ref<Solicitud | null>(null)
const motivoRechazo  = ref('')
const rechazarLoading = ref(false)
const rechazarError   = ref('')
const rechazarDone    = ref(false)

// ── Solicitud ficticia (dev) — remover cuando el backend soporte reasignacion_arbitro
const MOCK_REASIGNACION: Solicitud = {
  id: 9999,
  tipo: 'reasignacion_arbitro',
  equipo_id: 0,
  equipo_nombre: '',
  partido_id: 1,
  partido_descripcion: 'Jornada 1 — Atletico FC vs Real Bogotá',
  arbitro_id: 5,
  arbitro_nombre: 'Pedro Árbitro',
  jugador_id: null,
  jugador_nombre: null,
  datos: null,
  estado: 'pendiente',
  solicitado_por_nombre: 'Pedro Árbitro',
  motivo_rechazo: null,
  created_at: new Date().toISOString(),
}

// ── Fetch ──────────────────────────────────────────────────────────────────
const fetchSolicitudes = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/api/torneos/solicitudes')
    solicitudes.value = [MOCK_REASIGNACION, ...(data.data ?? data) as Solicitud[]]
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    fetchSolicitudes(),
    usuariosStore.fetchUsuarios(),
    partidosStore.fetchPartidos(),
  ])
})

// ── Computed ───────────────────────────────────────────────────────────────
const lista = computed(() => {
  if (filtro.value === 'todas') return solicitudes.value
  return solicitudes.value.filter(s => s.estado === filtro.value)
})

const pendienteCount = computed(() =>
  solicitudes.value.filter(s => s.estado === 'pendiente').length
)

const conteo = computed(() => ({
  todas:     solicitudes.value.length,
  pendiente: solicitudes.value.filter(s => s.estado === 'pendiente').length,
  aprobado:  solicitudes.value.filter(s => s.estado === 'aprobado').length,
  rechazado: solicitudes.value.filter(s => s.estado === 'rechazado').length,
}))

// ── Helpers visuales ───────────────────────────────────────────────────────
const estadoBadge = (estado: Solicitud['estado']) => ({
  pendiente: 'orange', aprobado: 'green', rechazado: 'red',
} as const)[estado]

const formatFecha = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Acciones ───────────────────────────────────────────────────────────────
const openAprobar = (s: Solicitud) => {
  targetAprobar.value  = s
  aprobarError.value   = ''
  aprobarDone.value    = false
  nuevoArbitroId.value = 0
  showAprobar.value    = true
}

const confirmarAprobar = async () => {
  if (!targetAprobar.value) return
  aprobarLoading.value = true
  aprobarError.value   = ''
  try {
    if (targetAprobar.value.tipo === 'reasignacion_arbitro') {
      if (!nuevoArbitroId.value) {
        aprobarError.value   = 'Selecciona el nuevo árbitro'
        aprobarLoading.value = false
        return
      }
      // Actualizar el partido con el nuevo árbitro
      if (targetAprobar.value.partido_id) {
        await partidosStore.actualizarPartido(targetAprobar.value.partido_id, {
          arbitro_id: nuevoArbitroId.value,
        })
      }
      // Marcar solicitud como aprobada (si el backend lo soporta; si no, solo actualizamos local)
      try {
        await api.put(`/api/torneos/solicitudes/${targetAprobar.value.id}/aprobar`, {})
      } catch { /* mock — ignorar si el backend no conoce este id */ }
    } else {
      await api.put(`/api/torneos/solicitudes/${targetAprobar.value.id}/aprobar`, {})
    }
    const idx = solicitudes.value.findIndex(s => s.id === targetAprobar.value!.id)
    if (idx !== -1) solicitudes.value[idx] = { ...solicitudes.value[idx], estado: 'aprobado' }
    aprobarDone.value = true
  } catch (err: any) {
    aprobarError.value = err.response?.data?.message ?? 'Error al aprobar'
  } finally {
    aprobarLoading.value = false
  }
}

const openRechazar = (s: Solicitud) => {
  targetRechazar.value = s
  motivoRechazo.value  = ''
  rechazarError.value  = ''
  rechazarDone.value   = false
  showRechazar.value   = true
}

const confirmarRechazar = async () => {
  if (!targetRechazar.value) return
  rechazarLoading.value = true
  rechazarError.value   = ''
  try {
    await api.put(`/api/torneos/solicitudes/${targetRechazar.value.id}/rechazar`, {
      motivo: motivoRechazo.value.trim() || undefined,
    })
    const idx = solicitudes.value.findIndex(s => s.id === targetRechazar.value!.id)
    if (idx !== -1) solicitudes.value[idx] = {
      ...solicitudes.value[idx],
      estado: 'rechazado',
      motivo_rechazo: motivoRechazo.value.trim() || null,
    }
    rechazarDone.value = true
  } catch (err: any) {
    rechazarError.value = err.response?.data?.message ?? 'Error al rechazar'
  } finally {
    rechazarLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Solicitudes</h1>
        <p class="text-matchx-text-muted mt-1">Altas y bajas de jugadores solicitadas por capitanes</p>
      </div>
      <AppBadge v-if="pendienteCount > 0" variant="orange" :dot="true" :pulse="true">
        {{ pendienteCount }} pendiente{{ pendienteCount !== 1 ? 's' : '' }}
      </AppBadge>
    </div>

    <!-- Filtros -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="f in filtros"
        :key="f.key"
        :class="[
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
          filtro === f.key
            ? 'bg-matchx-accent-green/10 text-matchx-accent-green border border-matchx-accent-green/30'
            : 'bg-matchx-bg-surface text-matchx-text-secondary border border-matchx-border-base hover:border-matchx-accent-green/30',
        ]"
        @click="filtro = f.key"
      >
        {{ f.label }}
        <span class="text-xs opacity-70">({{ conteo[f.key] }})</span>
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 rounded-xl bg-matchx-bg-surface animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="lista.length === 0"
         class="flex flex-col items-center gap-3 py-16 text-center">
      <Inbox class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">
        {{ filtro === 'todas' ? 'No hay solicitudes registradas' : `No hay solicitudes ${filtro === 'pendiente' ? 'pendientes' : filtro === 'aprobado' ? 'aprobadas' : 'rechazadas'}` }}
      </p>
    </div>

    <!-- Lista -->
    <div v-else class="space-y-3">
      <AppCard
        v-for="s in lista"
        :key="s.id"
        :hover="false"
      >
        <div class="flex items-start gap-4">

          <!-- Icono tipo -->
          <div :class="[
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            s.tipo === 'alta_jugador'       ? 'bg-matchx-accent-green/10 text-matchx-accent-green'
            : s.tipo === 'reasignacion_arbitro' ? 'bg-blue-500/10 text-blue-400'
            : 'bg-matchx-accent-orange/10 text-matchx-accent-orange',
          ]">
            <UserPlus      v-if="s.tipo === 'alta_jugador'"          class="w-5 h-5" :stroke-width="1.75" />
            <UserRoundCog  v-else-if="s.tipo === 'reasignacion_arbitro'" class="w-5 h-5" :stroke-width="1.75" />
            <UserMinus     v-else                                     class="w-5 h-5" :stroke-width="1.75" />
          </div>

          <!-- Contenido -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="font-semibold text-matchx-text-primary text-sm">
                {{ s.tipo === 'alta_jugador' ? 'Alta de jugador'
                   : s.tipo === 'reasignacion_arbitro' ? 'Reasignación de árbitro'
                   : 'Baja de jugador' }}
              </span>
              <AppBadge :variant="estadoBadge(s.estado)" :dot="false" class="text-xs capitalize">
                {{ s.estado }}
              </AppBadge>
            </div>

            <!-- Reasignación: partido + árbitro que no puede -->
            <template v-if="s.tipo === 'reasignacion_arbitro'">
              <div class="flex items-center gap-1 text-xs text-matchx-text-muted mb-1">
                <Flag class="w-3 h-3 shrink-0" :stroke-width="2" />
                <span>{{ s.partido_descripcion ?? `Partido #${s.partido_id}` }}</span>
              </div>
              <div class="flex items-center gap-1 text-xs text-matchx-text-muted mb-2">
                <UserRoundCog class="w-3 h-3 shrink-0" :stroke-width="2" />
                <span>Solicitado por: <span class="text-matchx-text-secondary">{{ s.arbitro_nombre ?? s.solicitado_por_nombre }}</span></span>
              </div>
            </template>

            <!-- Alta/Baja: equipo -->
            <template v-else>
              <div class="flex items-center gap-1 text-xs text-matchx-text-muted mb-2">
                <Users class="w-3 h-3 shrink-0" :stroke-width="2" />
                <span>{{ s.equipo_nombre }}</span>
                <ChevronRight class="w-3 h-3 opacity-50" :stroke-width="2" />
                <span>{{ s.solicitado_por_nombre ?? 'Capitán' }}</span>
              </div>
            </template>

            <!-- Datos del jugador (alta) -->
            <div v-if="s.tipo === 'alta_jugador' && s.datos"
                 class="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
              <span class="text-matchx-text-primary font-medium">
                {{ s.datos.nombre }} {{ s.datos.apellido }}
              </span>
              <span class="text-matchx-text-muted">#{{ s.datos.numero_camiseta }}</span>
              <span class="text-matchx-text-muted capitalize">{{ s.datos.posicion }}</span>
              <span v-if="s.datos.tipo_documento && s.datos.numero_documento"
                    class="text-matchx-text-muted">
                {{ s.datos.tipo_documento }} {{ s.datos.numero_documento }}
              </span>
            </div>

            <div v-else-if="s.tipo === 'baja_jugador'" class="text-sm text-matchx-text-primary font-medium">
              {{ s.jugador_nombre ?? `Jugador #${s.jugador_id}` }}
            </div>

            <!-- Motivo rechazo -->
            <p v-if="s.estado === 'rechazado' && s.motivo_rechazo"
               class="mt-2 text-xs text-matchx-accent-orange/80 bg-matchx-accent-orange/5 rounded px-2 py-1">
              Motivo: {{ s.motivo_rechazo }}
            </p>

            <!-- Fecha -->
            <p class="mt-1.5 text-xs text-matchx-text-muted">{{ formatFecha(s.created_at) }}</p>
          </div>

          <!-- Acciones (solo pendientes) -->
          <div v-if="s.estado === 'pendiente'" class="flex gap-2 shrink-0 mt-0.5">
            <AppButton size="sm" @click="openAprobar(s)">
              <CheckCircle class="w-3.5 h-3.5" :stroke-width="2" />
              Aprobar
            </AppButton>
            <AppButton size="sm" variant="danger" @click="openRechazar(s)">
              <XCircle class="w-3.5 h-3.5" :stroke-width="2" />
              Rechazar
            </AppButton>
          </div>

          <!-- Indicador estado final -->
          <div v-else class="shrink-0 mt-0.5">
            <CheckCircle v-if="s.estado === 'aprobado'"
              class="w-5 h-5 text-matchx-accent-green opacity-60" :stroke-width="1.75" />
            <XCircle v-else
              class="w-5 h-5 text-red-400 opacity-60" :stroke-width="1.75" />
          </div>

        </div>
      </AppCard>
    </div>

  </div>

  <!-- ── Modal: Confirmar aprobación ──────────────────────────────────────── -->
  <AppModal v-model:open="showAprobar" size="sm"
    :title="aprobarDone ? '' : 'Aprobar solicitud'"
    :close-button="true">

    <div v-if="aprobarDone" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-matchx-accent-green/10 flex items-center justify-center">
        <CheckCircle class="w-7 h-7 text-matchx-accent-green" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">Solicitud aprobada</p>
        <p class="text-sm text-matchx-text-muted mt-1">
          <template v-if="targetAprobar?.tipo === 'reasignacion_arbitro'">
            El nuevo árbitro ha sido asignado al partido.
          </template>
          <template v-else-if="targetAprobar?.tipo === 'alta_jugador'">
            {{ targetAprobar?.datos?.nombre }} {{ targetAprobar?.datos?.apellido }} ha sido agregado a la plantilla.
          </template>
          <template v-else>
            La baja de {{ targetAprobar?.jugador_nombre }} ha sido procesada.
          </template>
        </p>
      </div>
    </div>

    <template v-else>
      <!-- Reasignación de árbitro -->
      <template v-if="targetAprobar?.tipo === 'reasignacion_arbitro'">
        <div class="rounded-lg bg-matchx-bg-base/50 border border-matchx-border-base p-3 mb-4">
          <p class="text-xs text-matchx-text-muted mb-0.5">Partido</p>
          <p class="text-sm font-medium text-matchx-text-primary">
            {{ targetAprobar?.partido_descripcion ?? `Partido #${targetAprobar?.partido_id}` }}
          </p>
          <p class="text-xs text-matchx-text-muted mt-2 mb-0.5">Árbitro que no puede presentarse</p>
          <p class="text-sm font-medium text-matchx-accent-orange">{{ targetAprobar?.arbitro_nombre }}</p>
        </div>
        <!-- Árbitro saliente -->
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-matchx-accent-orange/5 border border-matchx-accent-orange/20 mb-3">
          <span class="w-2 h-2 rounded-full bg-matchx-accent-orange shrink-0" />
          <span class="text-xs text-matchx-text-muted">Reemplazando a</span>
          <span class="text-xs font-semibold text-matchx-accent-orange">{{ targetAprobar?.arbitro_nombre }}</span>
        </div>

        <p class="text-xs font-medium text-matchx-text-secondary mb-2">Selecciona el nuevo árbitro</p>
        <div v-if="arbitrosConDisponibilidad.length === 0" class="text-xs text-matchx-accent-orange">
          No hay otros árbitros activos disponibles.
        </div>
        <div v-else class="space-y-2">
          <button
            v-for="arbitro in arbitrosConDisponibilidad"
            :key="arbitro.id"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors',
              nuevoArbitroId === arbitro.id
                ? 'border-matchx-accent-green bg-matchx-accent-green/5'
                : 'border-matchx-border-base hover:border-matchx-accent-green/40 bg-matchx-bg-base/40',
            ]"
            @click="nuevoArbitroId = arbitro.id"
          >
            <span :class="['w-2 h-2 rounded-full shrink-0', arbitro.ocupado ? 'bg-matchx-accent-orange' : 'bg-matchx-accent-green']" />
            <span class="flex-1 text-sm text-matchx-text-primary">{{ arbitro.nombre }}</span>
            <span :class="['text-xs font-medium', arbitro.ocupado ? 'text-matchx-accent-orange' : 'text-matchx-accent-green']">
              {{ arbitro.ocupado ? 'Ocupado' : 'Libre' }}
            </span>
          </button>
        </div>
      </template>

      <!-- Alta de jugador -->
      <template v-else-if="targetAprobar?.tipo === 'alta_jugador'">
        <p class="text-sm text-matchx-text-muted">
          Se agregará a
          <span class="font-semibold text-matchx-text-primary">
            {{ targetAprobar?.datos?.nombre }} {{ targetAprobar?.datos?.apellido }}
          </span>
          (#{{ targetAprobar?.datos?.numero_camiseta }} · {{ targetAprobar?.datos?.posicion }})
          a la plantilla de
          <span class="font-semibold text-matchx-text-primary">{{ targetAprobar?.equipo_nombre }}</span>.
        </p>
      </template>

      <!-- Baja de jugador -->
      <template v-else>
        <p class="text-sm text-matchx-text-muted">
          Se dará de baja a
          <span class="font-semibold text-matchx-text-primary">{{ targetAprobar?.jugador_nombre }}</span>
          del equipo
          <span class="font-semibold text-matchx-text-primary">{{ targetAprobar?.equipo_nombre }}</span>.
        </p>
      </template>

      <p v-if="aprobarError" class="mt-3 text-sm text-matchx-accent-orange">{{ aprobarError }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showAprobar = false">
          {{ aprobarDone ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton v-if="!aprobarDone" :loading="aprobarLoading" @click="confirmarAprobar">
          <CheckCircle class="w-4 h-4" :stroke-width="2" />
          Confirmar aprobación
        </AppButton>
      </div>
    </template>
  </AppModal>

  <!-- ── Modal: Rechazar ─────────────────────────────────────────────────── -->
  <AppModal v-model:open="showRechazar" size="sm"
    :title="rechazarDone ? '' : 'Rechazar solicitud'"
    :close-button="true">

    <div v-if="rechazarDone" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
        <XCircle class="w-7 h-7 text-red-400" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">Solicitud rechazada</p>
        <p class="text-sm text-matchx-text-muted mt-1">El capitán será notificado del rechazo.</p>
      </div>
    </div>

    <template v-else>
      <p class="text-sm text-matchx-text-muted mb-4">
        Rechazarás la solicitud de
        <span class="font-semibold text-matchx-text-primary">
          {{ targetRechazar?.equipo_nombre }}
        </span>.
        Puedes indicar un motivo (opcional).
      </p>
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium text-matchx-text-secondary">Motivo del rechazo</label>
        <textarea
          v-model="motivoRechazo"
          rows="3"
          placeholder="Ej: El cupo de jugadores ya está completo..."
          class="w-full px-3 py-2 rounded-lg bg-matchx-bg-base border border-matchx-border-base
                 text-matchx-text-primary placeholder:text-matchx-text-muted text-sm
                 focus:outline-none focus:border-matchx-accent-green transition-colors resize-none"
        />
      </div>
      <p v-if="rechazarError" class="mt-3 text-sm text-matchx-accent-orange">{{ rechazarError }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showRechazar = false">
          {{ rechazarDone ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton v-if="!rechazarDone" variant="danger" :loading="rechazarLoading" @click="confirmarRechazar">
          <XCircle class="w-4 h-4" :stroke-width="2" />
          Rechazar solicitud
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
