<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore, type Posicion } from '@/stores/jugadores'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { UserRound, Search, Users, UserPlus, UserMinus, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-vue-next'
import api from '@/services/api'

const auth = useAuthStore()
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()

const searchQuery = ref('')

// ── Solicitudes del equipo ─────────────────────────────────────────────────
interface DatoAlta { nombre: string; apellido: string; numero_camiseta: number; posicion: string }
interface Solicitud {
  id: number
  tipo: 'alta_jugador' | 'baja_jugador'
  jugador_nombre: string | null
  datos: DatoAlta | null
  estado: 'pendiente' | 'aprobado' | 'rechazado'
  motivo_rechazo: string | null
  created_at: string
}

const solicitudes       = ref<Solicitud[]>([])
const solicitudesOpen   = ref(true)

const fetchSolicitudes = async (equipoId: number) => {
  const { data } = await api.get('/api/torneos/solicitudes', { params: { equipo_id: equipoId } })
  solicitudes.value = (data.data ?? data) as Solicitud[]
}

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
  ])
  if (miEquipo.value) await fetchSolicitudes(miEquipo.value.id)
})

const miEquipo = computed(() =>
  equiposStore.equipos.find(e =>
    (auth.user?.equipo_id != null && e.id === auth.user.equipo_id) ||
    (import.meta.env.VITE_MOCK_API === 'true' && e.id === 1)
  ) ?? null,
)

const jugadores = computed(() =>
  miEquipo.value ? jugadoresStore.jugadoresPorEquipo(miEquipo.value.id) : [],
)

const showSearch = computed(() => jugadores.value.length > 4)

const jugadoresFiltrados = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  const lista = [...jugadores.value].sort((a, b) => a.numero_camiseta - b.numero_camiseta)
  if (!q) return lista
  return lista.filter(j =>
    `${j.nombre} ${j.apellido}`.toLowerCase().includes(q) ||
    String(j.numero_camiseta).includes(q),
  )
})

const posicionBadge = (pos: Posicion): 'green' | 'blue' | 'orange' | 'gray' => ({
  portero: 'orange', defensa: 'blue', mediocampo: 'green', delantero: 'orange',
}[pos] ?? 'gray' as any)

const avatarColors = [
  'bg-matchx-accent-green/20 text-matchx-accent-green',
  'bg-matchx-accent-orange/20 text-matchx-accent-orange',
  'bg-blue-500/20 text-blue-400',
  'bg-purple-500/20 text-purple-400',
]
const avatarColor = (id: number) => avatarColors[id % 4]
const initiales = (nombre: string, apellido: string) =>
  `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase()

const pendientesCount = computed(() => solicitudes.value.filter(s => s.estado === 'pendiente').length)

const solicitudLabel = (s: Solicitud) => {
  if (s.tipo === 'alta_jugador' && s.datos)
    return `Alta · ${s.datos.nombre} ${s.datos.apellido} (#${s.datos.numero_camiseta})`
  if (s.tipo === 'baja_jugador')
    return `Baja · ${s.jugador_nombre ?? 'Jugador'}`
  return 'Solicitud'
}

const solicitudBadge = (estado: Solicitud['estado']) =>
  ({ pendiente: 'orange', aprobado: 'green', rechazado: 'red' } as const)[estado]

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const porPosicion = computed(() => {
  const counts: Record<string, number> = {}
  for (const j of jugadores.value) {
    counts[j.posicion] = (counts[j.posicion] ?? 0) + 1
  }
  return counts
})

// ── Solicitud alta jugador ─────────────────────────────────────────────────
const showAddModal = ref(false)
const addSuccess = ref(false)
const addLoading = ref(false)
const addError = ref('')
const addForm = ref({
  nombre: '',
  apellido: '',
  numero_camiseta: '',
  posicion: 'defensa' as Posicion,
  tipo_documento: '',
  numero_documento: '',
})

const posicionOptions = [
  { value: 'portero',     label: 'Portero' },
  { value: 'defensa',     label: 'Defensa' },
  { value: 'mediocampo',  label: 'Mediocampo' },
  { value: 'delantero',   label: 'Delantero' },
]

const openAddModal = () => {
  addForm.value = { nombre: '', apellido: '', numero_camiseta: '', posicion: 'defensa', tipo_documento: '', numero_documento: '' }
  addError.value = ''
  addSuccess.value = false
  showAddModal.value = true
}

const solicitarAgregarJugador = async () => {
  if (!miEquipo.value) return
  if (!addForm.value.nombre.trim() || !addForm.value.apellido.trim() || !addForm.value.numero_camiseta) {
    addError.value = 'Nombre, apellido y número de camiseta son obligatorios'
    return
  }
  addError.value = ''
  addLoading.value = true
  try {
    await api.post('/api/torneos/solicitudes', {
      tipo: 'alta_jugador',
      equipo_id: miEquipo.value.id,
      datos: {
        nombre: addForm.value.nombre.trim(),
        apellido: addForm.value.apellido.trim(),
        numero_camiseta: Number(addForm.value.numero_camiseta),
        posicion: addForm.value.posicion,
        tipo_documento: addForm.value.tipo_documento || undefined,
        numero_documento: addForm.value.numero_documento || undefined,
      },
    })
    addSuccess.value = true
  } catch (err: any) {
    addError.value = err.response?.data?.message ?? 'Error al enviar la solicitud'
  } finally {
    addLoading.value = false
  }
}

// ── Solicitud baja jugador ─────────────────────────────────────────────────
const showRemoveModal = ref(false)
const removeTarget = ref<{ id: number; nombre: string; apellido: string } | null>(null)
const removeSuccess = ref(false)
const removeLoading = ref(false)
const removeError = ref('')

const openRemoveModal = (jugador: { id: number; nombre: string; apellido: string }) => {
  removeTarget.value = jugador
  removeError.value = ''
  removeSuccess.value = false
  showRemoveModal.value = true
}

const solicitarEliminarJugador = async () => {
  if (!removeTarget.value || !miEquipo.value) return
  removeError.value = ''
  removeLoading.value = true
  try {
    await api.post('/api/torneos/solicitudes', {
      tipo: 'baja_jugador',
      equipo_id: miEquipo.value.id,
      jugador_id: removeTarget.value.id,
    })
    removeSuccess.value = true
  } catch (err: any) {
    removeError.value = err.response?.data?.message ?? 'Error al enviar la solicitud'
  } finally {
    removeLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Mi Equipo</h1>
        <p class="text-matchx-text-muted mt-1">Plantilla y jugadores</p>
      </div>
      <AppButton v-if="miEquipo && auth.isCapitan" size="sm" @click="openAddModal">
        <UserPlus class="w-4 h-4" :stroke-width="2" />
        Solicitar jugador
      </AppButton>
    </div>

    <!-- Sin equipo -->
    <div v-if="!miEquipo" class="flex flex-col items-center gap-3 py-16">
      <UserRound class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <p class="text-matchx-text-muted">No tienes un equipo asignado</p>
    </div>

    <template v-else>
      <!-- Header equipo -->
      <AppCard :hover="false">
        <div class="flex items-center gap-4">
          <img :src="miEquipo.escudo_url" :alt="miEquipo.nombre" class="w-14 h-14 rounded-xl" />
          <div class="flex-1">
            <h2 class="text-xl font-bold text-matchx-text-primary">{{ miEquipo.nombre }}</h2>
            <p class="text-matchx-text-muted text-sm">{{ miEquipo.ciudad }}</p>
          </div>
          <AppBadge variant="green">
            <Users class="w-3 h-3 mr-1" :stroke-width="2" />
            {{ jugadores.length }} jugadores
          </AppBadge>
        </div>

        <!-- Resumen por posición -->
        <div v-if="jugadores.length > 0" class="flex flex-wrap gap-3 mt-4 pt-4 border-t border-matchx-border-base">
          <div v-for="(count, pos) in porPosicion" :key="pos" class="flex items-center gap-1.5">
            <AppBadge :variant="posicionBadge(pos as Posicion)" :dot="false" class="text-xs">
              {{ pos }}
            </AppBadge>
            <span class="text-xs text-matchx-text-muted">×{{ count }}</span>
          </div>
        </div>
      </AppCard>

      <!-- Mis solicitudes (solo capitán) -->
      <AppCard v-if="auth.isCapitan && solicitudes.length > 0" :hover="false">
        <!-- Header colapsable -->
        <button
          class="w-full flex items-center justify-between gap-3 text-left"
          @click="solicitudesOpen = !solicitudesOpen"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-matchx-text-primary">Mis solicitudes</span>
            <AppBadge v-if="pendientesCount > 0" variant="orange" :dot="true" :pulse="true" class="text-xs">
              {{ pendientesCount }} pendiente{{ pendientesCount !== 1 ? 's' : '' }}
            </AppBadge>
          </div>
          <ChevronUp v-if="solicitudesOpen" class="w-4 h-4 text-matchx-text-muted shrink-0" :stroke-width="1.75" />
          <ChevronDown v-else class="w-4 h-4 text-matchx-text-muted shrink-0" :stroke-width="1.75" />
        </button>

        <!-- Lista -->
        <div v-if="solicitudesOpen" class="mt-3 space-y-2">
          <div
            v-for="s in solicitudes"
            :key="s.id"
            class="flex items-start gap-3 p-2.5 rounded-lg bg-matchx-bg-base/40"
          >
            <!-- Icono estado -->
            <div class="mt-0.5 shrink-0">
              <Clock       v-if="s.estado === 'pendiente'"  class="w-4 h-4 text-matchx-accent-orange" :stroke-width="1.75" />
              <CheckCircle v-else-if="s.estado === 'aprobado'"  class="w-4 h-4 text-matchx-accent-green"  :stroke-width="1.75" />
              <XCircle     v-else                            class="w-4 h-4 text-red-400"               :stroke-width="1.75" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm text-matchx-text-primary truncate">{{ solicitudLabel(s) }}</span>
                <AppBadge :variant="solicitudBadge(s.estado)" :dot="false" class="text-xs capitalize shrink-0">
                  {{ s.estado }}
                </AppBadge>
              </div>
              <p v-if="s.estado === 'rechazado' && s.motivo_rechazo"
                 class="text-xs text-matchx-accent-orange/80 mt-0.5">
                {{ s.motivo_rechazo }}
              </p>
              <p class="text-xs text-matchx-text-muted mt-0.5">{{ formatFecha(s.created_at) }}</p>
            </div>
          </div>
        </div>
      </AppCard>

      <!-- Búsqueda -->
      <div v-if="showSearch" class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-matchx-text-muted" :stroke-width="1.75" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por nombre o número..."
          class="w-full pl-9 pr-4 py-2 rounded-lg bg-matchx-bg-surface border border-matchx-border-base
                 text-matchx-text-primary placeholder:text-matchx-text-muted text-sm
                 focus:outline-none focus:border-matchx-accent-green transition-colors"
        />
      </div>

      <!-- Empty: sin jugadores -->
      <div v-if="jugadores.length === 0" class="flex flex-col items-center gap-2 py-12">
        <UserRound class="w-10 h-10 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
        <p class="text-matchx-text-muted text-sm">No hay jugadores registrados en tu equipo</p>
      </div>

      <!-- Sin resultados de búsqueda -->
      <div v-else-if="jugadoresFiltrados.length === 0"
           class="text-center py-8 text-matchx-text-muted text-sm">
        Sin resultados para "{{ searchQuery }}"
      </div>

      <!-- Lista jugadores -->
      <AppCard v-else :hover="false">
        <div class="space-y-1">
          <div
            v-for="jugador in jugadoresFiltrados"
            :key="jugador.id"
            class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-matchx-bg-base/30 transition-colors group"
          >
            <div class="relative shrink-0">
              <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold', avatarColor(jugador.id)]">
                {{ initiales(jugador.nombre, jugador.apellido) }}
              </div>
              <span v-if="jugador.es_capitan"
                class="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center
                       text-[9px] font-black leading-none
                       bg-gradient-to-b from-yellow-300 to-yellow-500 text-yellow-950
                       ring-2 ring-matchx-bg-surface shadow-sm">
                C
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-matchx-text-primary text-sm truncate">
                {{ jugador.nombre }} {{ jugador.apellido }}
              </div>
              <div class="text-xs text-matchx-text-muted">#{{ jugador.numero_camiseta }}</div>
            </div>
            <AppBadge :variant="posicionBadge(jugador.posicion)" :dot="false"
              class="w-24 justify-center shrink-0">
              {{ jugador.posicion }}
            </AppBadge>
            <button
              v-if="auth.isCapitan"
              class="shrink-0 p-1 rounded text-matchx-text-muted hover:text-matchx-accent-orange
                     hover:bg-matchx-accent-orange/10 transition-colors
                     opacity-0 group-hover:opacity-100"
              title="Solicitar baja"
              @click="openRemoveModal(jugador)"
            >
              <UserMinus class="w-4 h-4" :stroke-width="1.75" />
            </button>
          </div>
        </div>
      </AppCard>
    </template>
  </div>

  <!-- ── Modal: Solicitar alta de jugador ───────────────────────────────── -->
  <AppModal v-model:open="showAddModal" size="md"
    :title="addSuccess ? '' : 'Solicitar alta de jugador'"
    :close-button="true">

    <!-- Estado éxito -->
    <div v-if="addSuccess" class="flex flex-col items-center gap-4 py-6 text-center">
      <div class="w-14 h-14 rounded-full bg-matchx-accent-green/10 flex items-center justify-center">
        <CheckCircle class="w-7 h-7 text-matchx-accent-green" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">Solicitud enviada</p>
        <p class="text-sm text-matchx-text-muted mt-1">
          El administrador del torneo revisará y aprobará la inscripción del jugador.
        </p>
      </div>
      <div class="flex items-center gap-1.5 text-xs text-matchx-text-muted bg-matchx-bg-surface px-3 py-2 rounded-lg">
        <Clock class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
        Pendiente de aprobación
      </div>
    </div>

    <!-- Formulario -->
    <template v-else>
      <p class="text-sm text-matchx-text-muted mb-5">
        Completa los datos del jugador. La solicitud será revisada por el
        administrador del torneo antes de agregarlo a la plantilla.
      </p>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <AppInput
            v-model="addForm.nombre"
            label="Nombre"
            placeholder="Ej: Carlos"
            required
          />
          <AppInput
            v-model="addForm.apellido"
            label="Apellido"
            placeholder="Ej: Gómez"
            required
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AppInput
            v-model="addForm.numero_camiseta"
            label="Número de camiseta"
            type="number"
            placeholder="Ej: 10"
            required
          />
          <AppSelect
            v-model="addForm.posicion"
            label="Posición"
            :options="posicionOptions"
            required
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <AppInput
            v-model="addForm.tipo_documento"
            label="Tipo de documento"
            placeholder="Ej: CC"
          />
          <AppInput
            v-model="addForm.numero_documento"
            label="Número de documento"
            placeholder="Ej: 10012345"
          />
        </div>

        <p v-if="addError" class="text-sm text-matchx-accent-orange">{{ addError }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showAddModal = false">
          {{ addSuccess ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton
          v-if="!addSuccess"
          :loading="addLoading"
          @click="solicitarAgregarJugador"
        >
          <UserPlus class="w-4 h-4" :stroke-width="2" />
          Enviar solicitud
        </AppButton>
      </div>
    </template>
  </AppModal>

  <!-- ── Modal: Solicitar baja de jugador ───────────────────────────────── -->
  <AppModal v-model:open="showRemoveModal" size="sm"
    :title="removeSuccess ? '' : 'Solicitar baja de jugador'"
    :close-button="true">

    <!-- Estado éxito -->
    <div v-if="removeSuccess" class="flex flex-col items-center gap-4 py-4 text-center">
      <div class="w-14 h-14 rounded-full bg-matchx-accent-green/10 flex items-center justify-center">
        <CheckCircle class="w-7 h-7 text-matchx-accent-green" :stroke-width="1.75" />
      </div>
      <div>
        <p class="font-semibold text-matchx-text-primary">Solicitud enviada</p>
        <p class="text-sm text-matchx-text-muted mt-1">
          El administrador del torneo procesará la baja del jugador.
        </p>
      </div>
      <div class="flex items-center gap-1.5 text-xs text-matchx-text-muted bg-matchx-bg-surface px-3 py-2 rounded-lg">
        <Clock class="w-3.5 h-3.5 shrink-0" :stroke-width="1.75" />
        Pendiente de aprobación
      </div>
    </div>

    <!-- Confirmación -->
    <template v-else>
      <p class="text-sm text-matchx-text-muted mb-2">
        Estás solicitando la baja de
        <span class="font-semibold text-matchx-text-primary">
          {{ removeTarget?.nombre }} {{ removeTarget?.apellido }}
        </span>
        del equipo.
      </p>
      <p class="text-sm text-matchx-text-muted">
        Esta acción requiere la aprobación del administrador del torneo y no
        elimina al jugador de forma inmediata.
      </p>

      <p v-if="removeError" class="mt-3 text-sm text-matchx-accent-orange">{{ removeError }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <AppButton variant="secondary" @click="showRemoveModal = false">
          {{ removeSuccess ? 'Cerrar' : 'Cancelar' }}
        </AppButton>
        <AppButton
          v-if="!removeSuccess"
          variant="danger"
          :loading="removeLoading"
          @click="solicitarEliminarJugador"
        >
          <UserMinus class="w-4 h-4" :stroke-width="2" />
          Enviar solicitud
        </AppButton>
      </div>
    </template>
  </AppModal>
</template>
