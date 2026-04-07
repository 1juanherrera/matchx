<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTorneosStore, type Torneo, type EstadoTorneo } from '@/stores/torneos'
import { useModalidadesStore } from '@/stores/modalidades'
import { useAuthStore } from '@/stores/auth'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { Trophy, Gamepad2, CalendarRange, Users, Plus, Pencil, Trash2, Calendar, CalendarClock, Settings2, Coins, ShieldAlert } from 'lucide-vue-next'

const store = useTorneosStore()
const modalidadesStore = useModalidadesStore()
const authStore = useAuthStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const saveError = ref('')

const defaultForm = (): Omit<Torneo, 'id' | 'creado_en'> => ({
  nombre: '',
  edicion: '',
  categoria: '',
  descripcion: '',
  reglamento: '',
  modalidad_id: modalidadesStore.modalidades[0]?.id ?? 1,
  modalidad_codigo: '',
  modalidad: '',
  admin_id: authStore.user?.usuario_id ?? 0,
  administrador: '',
  equipos_inscritos: 0,
  estado: 'borrador',
  fecha_inicio: '',
  fecha_fin: '',
  fecha_limite_inscripcion: '',
  inscripcion_publica: 0,
  marcador_publico: 0,
  valor_matricula: 0,
  valor_tarjeta_amarilla: 0,
  valor_tarjeta_roja: 0,
  multa_inasistencia: 0,
  valor_jugador_tardio: 0,
  amarillas_para_suspension: 3,
  partidos_suspension_roja: 1,
  min_jugadores: 1,
  max_jugadores: 25,
  max_equipos: 0,
  url_banner: '',
})

const formData = ref(defaultForm())

const estadoOptions = [
  { value: 'borrador',               label: 'Borrador' },
  { value: 'inscripciones_abiertas', label: 'Inscripciones abiertas' },
  { value: 'en_curso',               label: 'En curso' },
  { value: 'finalizado',             label: 'Finalizado' },
  { value: 'cancelado',              label: 'Cancelado' },
]

const categoriaOptions = [
  { value: 'Sub-12',   label: 'Sub-12' },
  { value: 'Sub-15',   label: 'Sub-15' },
  { value: 'Sub-17',   label: 'Sub-17' },
  { value: 'Abierta',  label: 'Abierta' },
]

const modalidadOptions = computed(() =>
  modalidadesStore.modalidades.map(m => ({ value: m.id, label: `${m.nombre} (${m.codigo})` })),
)

const estadoBadge = (estado: string): 'green' | 'orange' | 'gray' | 'blue' => {
  const map: Record<string, 'green' | 'orange' | 'gray' | 'blue'> = {
    en_curso: 'green', inscripciones_abiertas: 'blue', borrador: 'gray', finalizado: 'gray', cancelado: 'orange',
  }
  return map[estado] ?? 'gray'
}

const formatFecha = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  await Promise.all([
    store.fetchTorneos(),
    modalidadesStore.fetchModalidades(),
  ])
})

const openNew = () => {
  isEditing.value = false
  editingId.value = null
  saveError.value = ''
  formData.value = defaultForm()
  showModal.value = true
}

const openEdit = (torneo: Torneo) => {
  isEditing.value = true
  editingId.value = torneo.id
  saveError.value = ''
  formData.value = { ...torneo }
  showModal.value = true
}

const saveTorneo = async () => {
  if (!formData.value.nombre || !formData.value.fecha_inicio) return
  saveError.value = ''

  const mod = modalidadesStore.obtenerPorId(formData.value.modalidad_id)
  if (mod) formData.value.modalidad_codigo = mod.codigo
  // admin_id nunca puede ser 0 — siempre usar el del usuario en sesión
  const userId = authStore.user?.usuario_id
  if (userId) formData.value.admin_id = userId

  try {
    if (isEditing.value && editingId.value !== null) {
      await store.actualizarTorneo(editingId.value, { ...formData.value })
    } else {
      await store.crearTorneo({ ...formData.value })
    }
    showModal.value = false
  } catch (err: any) {
    saveError.value = err.message ?? 'Error al guardar el torneo'
  }
}

const deleteTorneo = (id: number) => {
  if (confirm('¿Eliminar este torneo?')) store.eliminarTorneo(id)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-matchx-text-primary">Torneos</h1>
        <p class="text-matchx-text-muted mt-1">Gestión de torneos</p>
      </div>
      <AppButton variant="primary" @click="openNew">
        <Plus class="w-4 h-4 mr-1.5" :stroke-width="2.5" />
        Nuevo Torneo
      </AppButton>
    </div>

    <!-- Skeleton loader -->
    <div v-if="store.loading" class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <AppCard v-for="i in 3" :key="i" :hover="false">
        <div class="animate-pulse space-y-3">
          <div class="flex justify-between">
            <div class="h-4 bg-matchx-bg-elevated rounded w-2/3" />
            <div class="h-5 bg-matchx-bg-elevated rounded-full w-16" />
          </div>
          <div class="h-3 bg-matchx-bg-elevated rounded w-full" />
          <div class="h-px bg-matchx-border-base mt-2" />
          <div class="grid grid-cols-2 gap-2">
            <div v-for="j in 4" :key="j" class="space-y-1">
              <div class="h-2.5 bg-matchx-bg-elevated rounded w-16" />
              <div class="h-3.5 bg-matchx-bg-elevated rounded w-12" />
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <div class="h-8 bg-matchx-bg-elevated rounded flex-1" />
            <div class="h-8 bg-matchx-bg-elevated rounded w-10" />
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Empty state -->
    <div v-else-if="store.torneos.length === 0"
         class="border border-dashed border-matchx-border-base rounded-lg py-16 flex flex-col items-center gap-3">
      <Trophy class="w-12 h-12 text-matchx-text-muted opacity-30" :stroke-width="1.5" />
      <div class="text-center">
        <p class="text-matchx-text-secondary font-medium">No hay torneos registrados</p>
        <p class="text-matchx-text-muted text-sm mt-0.5">Crea el primer torneo para comenzar</p>
      </div>
      <AppButton variant="primary" size="sm" @click="openNew">
        <Plus class="w-3.5 h-3.5 mr-1" :stroke-width="2.5" />
        Nuevo Torneo
      </AppButton>
    </div>

    <!-- Grid de torneos -->
    <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <AppCard v-for="torneo in store.torneos" :key="torneo.id">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <h2 class="font-semibold text-matchx-text-primary truncate">{{ torneo.nombre }}</h2>
            <p class="text-xs text-matchx-text-muted mt-0.5 line-clamp-2">{{ torneo.descripcion }}</p>
          </div>
          <AppBadge :variant="estadoBadge(torneo.estado)" class="ml-2 shrink-0">
            {{ torneo.estado }}
          </AppBadge>
        </div>

        <div class="grid grid-cols-2 gap-2 mb-4 border-t border-matchx-border-base pt-3">
          <div class="flex items-start gap-1.5">
            <Gamepad2 class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Modalidad</div>
              <div class="font-medium text-matchx-accent-green text-sm">{{ torneo.modalidad || '—' }}</div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Users class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Jugadores</div>
              <div class="font-medium text-matchx-text-primary text-sm">{{ torneo.min_jugadores }}–{{ torneo.max_jugadores }}</div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <CalendarRange class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Período</div>
              <div class="text-matchx-text-secondary text-xs leading-snug">
                {{ formatFecha(torneo.fecha_inicio) }}<br />{{ formatFecha(torneo.fecha_fin) }}
              </div>
            </div>
          </div>
          <div class="flex items-start gap-1.5">
            <Calendar class="w-3.5 h-3.5 text-matchx-text-muted mt-0.5 shrink-0" :stroke-width="1.75" />
            <div>
              <div class="text-xs text-matchx-text-muted">Categoría</div>
              <div class="text-matchx-accent-orange font-medium text-sm">{{ torneo.categoria || '—' }}</div>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <AppButton variant="secondary" class="flex-1" size="sm" @click="openEdit(torneo)">
            <Pencil class="w-3.5 h-3.5 mr-1.5" :stroke-width="2" />
            Editar
          </AppButton>
          <AppButton variant="danger" size="sm" @click="deleteTorneo(torneo.id)" aria-label="Eliminar torneo">
            <Trash2 class="w-3.5 h-3.5" :stroke-width="2" />
          </AppButton>
        </div>
      </AppCard>
    </div>

    <!-- Modal -->
    <AppModal
      :open="showModal"
      :title="isEditing ? 'Editar Torneo' : 'Nuevo Torneo'"
      size="xl"
      @update:open="showModal = $event"
    >
      <div class="space-y-4">

        <!-- ── Información básica ───────────────────────────── -->
        <div class="rounded-lg border border-matchx-border-base/60 bg-matchx-bg-base/30 p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-0.5 h-3.5 bg-matchx-accent-green rounded-full shrink-0" />
            <Trophy class="w-3.5 h-3.5 text-matchx-accent-green" :stroke-width="2" />
            <span class="text-xs font-semibold text-matchx-text-secondary uppercase tracking-wider">Información básica</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div class="col-span-2">
              <AppInput v-model="formData.nombre" label="Nombre del torneo" placeholder="ej: Copa Bogotá F5 2026" required />
            </div>
            <AppInput v-model="formData.edicion" label="Edición" placeholder="ej: 2024-1" />
            <AppSelect v-model="formData.modalidad_id" :options="modalidadOptions" label="Modalidad" required />
            <AppSelect v-model="formData.categoria" :options="categoriaOptions" label="Categoría" />
            <AppSelect v-model="formData.estado" :options="estadoOptions" label="Estado" />
            <div class="col-span-2 sm:col-span-3">
              <AppInput v-model="formData.descripcion" label="Descripción" placeholder="Descripción breve del torneo..." />
            </div>
          </div>
        </div>

        <!-- ── Fechas ───────────────────────────────────────── -->
        <div class="rounded-lg border border-matchx-border-base/60 bg-matchx-bg-base/30 p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-0.5 h-3.5 bg-blue-400 rounded-full shrink-0" />
            <CalendarClock class="w-3.5 h-3.5 text-blue-400" :stroke-width="2" />
            <span class="text-xs font-semibold text-matchx-text-secondary uppercase tracking-wider">Fechas</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AppInput v-model="formData.fecha_inicio" label="Inicio" type="date" required />
            <AppInput v-model="formData.fecha_fin" label="Fin" type="date" />
            <AppInput v-model="formData.fecha_limite_inscripcion" label="Límite inscripción" type="date" />
          </div>
        </div>

        <!-- ── Configuración ────────────────────────────────── -->
        <div class="rounded-lg border border-matchx-border-base/60 bg-matchx-bg-base/30 p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-0.5 h-3.5 bg-purple-400 rounded-full shrink-0" />
            <Settings2 class="w-3.5 h-3.5 text-purple-400" :stroke-width="2" />
            <span class="text-xs font-semibold text-matchx-text-secondary uppercase tracking-wider">Configuración</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AppInput v-model="formData.min_jugadores" label="Mín. jugadores" type="number" />
            <AppInput v-model="formData.max_jugadores" label="Máx. jugadores" type="number" />
            <AppInput v-model="formData.max_equipos" label="Máx. equipos" type="number" />
            <!-- Toggle: Inscripción pública -->
            <button
              type="button"
              :class="[
                'flex items-center justify-between px-3 py-2 rounded-lg border transition-colors duration-200 cursor-pointer',
                formData.inscripcion_publica === 1
                  ? 'border-matchx-accent-green/40 bg-matchx-accent-green/10'
                  : 'border-matchx-border-base bg-matchx-bg-base/20',
              ]"
              @click="formData.inscripcion_publica = formData.inscripcion_publica === 1 ? 0 : 1"
            >
              <span class="text-xs font-medium text-matchx-text-secondary leading-tight text-left">Inscripción<br/>pública</span>
              <div :class="['relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ml-2', formData.inscripcion_publica === 1 ? 'bg-matchx-accent-green' : 'bg-matchx-border-base']">
                <span :class="['absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', formData.inscripcion_publica === 1 ? 'translate-x-4' : 'translate-x-0']" />
              </div>
            </button>
            <!-- Toggle: Marcador público -->
            <button
              type="button"
              :class="[
                'flex items-center justify-between px-3 py-2 rounded-lg border transition-colors duration-200 cursor-pointer',
                formData.marcador_publico === 1
                  ? 'border-matchx-accent-green/40 bg-matchx-accent-green/10'
                  : 'border-matchx-border-base bg-matchx-bg-base/20',
              ]"
              @click="formData.marcador_publico = formData.marcador_publico === 1 ? 0 : 1"
            >
              <span class="text-xs font-medium text-matchx-text-secondary leading-tight text-left">Marcador<br/>público</span>
              <div :class="['relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ml-2', formData.marcador_publico === 1 ? 'bg-matchx-accent-green' : 'bg-matchx-border-base']">
                <span :class="['absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200', formData.marcador_publico === 1 ? 'translate-x-4' : 'translate-x-0']" />
              </div>
            </button>
          </div>
        </div>

        <!-- ── Valores económicos ───────────────────────────── -->
        <div class="rounded-lg border border-matchx-border-base/60 bg-matchx-bg-base/30 p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-0.5 h-3.5 bg-matchx-accent-orange rounded-full shrink-0" />
            <Coins class="w-3.5 h-3.5 text-matchx-accent-orange" :stroke-width="2" />
            <span class="text-xs font-semibold text-matchx-text-secondary uppercase tracking-wider">Valores económicos</span>
            <span class="ml-auto text-[10px] text-matchx-text-muted font-mono bg-matchx-bg-elevated px-1.5 py-0.5 rounded">COP $</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AppInput v-model="formData.valor_matricula" label="Matrícula" type="number" placeholder="0" />
            <AppInput v-model="formData.valor_tarjeta_amarilla" label="Tarjeta amarilla" type="number" placeholder="0" />
            <AppInput v-model="formData.valor_tarjeta_roja" label="Tarjeta roja" type="number" placeholder="0" />
            <AppInput v-model="formData.multa_inasistencia" label="Multa inasistencia" type="number" placeholder="0" />
            <AppInput v-model="formData.valor_jugador_tardio" label="Jugador tardío" type="number" placeholder="0" />
          </div>
        </div>

        <!-- ── Disciplina ────────────────────────────────────── -->
        <div class="rounded-lg border border-matchx-border-base/60 bg-matchx-bg-base/30 p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-0.5 h-3.5 bg-red-400 rounded-full shrink-0" />
            <ShieldAlert class="w-3.5 h-3.5 text-red-400" :stroke-width="2" />
            <span class="text-xs font-semibold text-matchx-text-secondary uppercase tracking-wider">Disciplina</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AppInput v-model="formData.amarillas_para_suspension" label="Amarillas para suspensión" type="number" />
            <AppInput v-model="formData.partidos_suspension_roja" label="Partidos suspensión (roja)" type="number" />
          </div>
        </div>

      </div>

      <p v-if="saveError" class="mt-3 text-sm text-matchx-accent-orange flex items-center gap-1.5">
        <ShieldAlert class="w-3.5 h-3.5 shrink-0" :stroke-width="2" />
        {{ saveError }}
      </p>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <AppButton variant="secondary" @click="showModal = false">Cancelar</AppButton>
          <AppButton variant="primary" @click="saveTorneo">
            {{ isEditing ? 'Actualizar' : 'Crear Torneo' }}
          </AppButton>
        </div>
      </template>
    </AppModal>
  </div>
</template>
