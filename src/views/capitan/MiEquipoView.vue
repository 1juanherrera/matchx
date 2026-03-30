<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useEquiposStore } from '@/stores/equipos'
import { useJugadoresStore, type Posicion } from '@/stores/jugadores'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { UserRound, Search, Users } from 'lucide-vue-next'

const auth = useAuthStore()
const equiposStore = useEquiposStore()
const jugadoresStore = useJugadoresStore()

const searchQuery = ref('')

onMounted(async () => {
  await Promise.all([
    equiposStore.fetchEquipos(),
    jugadoresStore.fetchJugadores(),
  ])
})

const miEquipo = computed(() =>
  equiposStore.equipos.find(e => e.capitan_id === auth.user?.usuario_id) ?? null,
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

// Contar por posición
const porPosicion = computed(() => {
  const counts: Record<string, number> = {}
  for (const j of jugadores.value) {
    counts[j.posicion] = (counts[j.posicion] ?? 0) + 1
  }
  return counts
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold text-matchx-text-primary">Mi Equipo</h1>
      <p class="text-matchx-text-muted mt-1">Plantilla y jugadores</p>
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
            class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-matchx-bg-base/30 transition-colors"
          >
            <div :class="['w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0', avatarColor(jugador.id)]">
              {{ initiales(jugador.nombre, jugador.apellido) }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-matchx-text-primary text-sm truncate">
                {{ jugador.nombre }} {{ jugador.apellido }}
              </div>
              <div class="text-xs text-matchx-text-muted">#{{ jugador.numero_camiseta }}</div>
            </div>
            <AppBadge :variant="posicionBadge(jugador.posicion)" :dot="false">
              {{ jugador.posicion }}
            </AppBadge>
          </div>
        </div>
      </AppCard>
    </template>
  </div>
</template>
