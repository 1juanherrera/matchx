<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUsuariosStore } from '@/stores/usuarios'
import { useSedesStore } from '@/stores/sedes'
import AppCard from '@/components/ui/AppCard.vue'

const authStore = useAuthStore()
const usuariosStore = useUsuariosStore()
const sedesStore = useSedesStore()

onMounted(async () => {
  await usuariosStore.fetchUsuarios()
  await sedesStore.fetchSedes()
})

const welcomeMessage = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

const totalCanchas = computed(() => {
  return sedesStore.sedes.reduce((sum, sede) => sum + sede.canchas.length, 0)
})

const usuariosRecientes = computed(() => {
  return usuariosStore.usuariosActivos.sort((a, b) =>
    new Date(b.creado_en).getTime() - new Date(a.creado_en).getTime()
  ).slice(0, 5)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-4xl font-bold text-matchx-text-primary">
        {{ welcomeMessage }}, {{ authStore.userName }}
      </h1>
      <p class="text-matchx-text-secondary">Sistema de Gestión de Torneos - Administración</p>
    </div>

    <!-- Metric cards grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Usuarios -->
      <AppCard>
        <div class="space-y-2">
          <div class="text-matchx-text-muted text-sm font-medium">Usuarios Registrados</div>
          <div class="text-4xl font-bold text-matchx-accent-green">{{ usuariosStore.usuariosActivos.length }}</div>
          <div class="text-xs text-matchx-text-muted">{{ usuariosStore.usuarios.length }} total</div>
        </div>
      </AppCard>

      <!-- Sedes -->
      <AppCard>
        <div class="space-y-2">
          <div class="text-matchx-text-muted text-sm font-medium">Sedes</div>
          <div class="text-4xl font-bold text-matchx-accent-orange">{{ sedesStore.sedesActivas.length }}</div>
          <div class="text-xs text-matchx-text-muted">{{ totalCanchas }} canchas</div>
        </div>
      </AppCard>

      <!-- Roles -->
      <AppCard>
        <div class="space-y-2">
          <div class="text-matchx-text-muted text-sm font-medium">Roles Activos</div>
          <div class="text-4xl font-bold text-blue-400">7</div>
          <div class="text-xs text-matchx-text-muted">Sistema completo</div>
        </div>
      </AppCard>

      <!-- Estado -->
      <AppCard>
        <div class="space-y-2">
          <div class="text-matchx-text-muted text-sm font-medium">Estado del Sistema</div>
          <div class="inline-flex items-center gap-2 mt-1">
            <div class="w-3 h-3 rounded-full bg-matchx-accent-green animate-pulse" />
            <span class="text-lg font-semibold text-matchx-accent-green">Operativo</span>
          </div>
          <div class="text-xs text-matchx-text-muted mt-2">Última sincronización: ahora</div>
        </div>
      </AppCard>
    </div>

    <!-- Usuarios recientes -->
    <AppCard>
      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-matchx-text-primary">Usuarios Registrados Recientemente</h2>
        <div v-if="usuariosRecientes.length === 0" class="text-matchx-text-muted text-sm py-4">
          No hay usuarios recientes
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="usuario in usuariosRecientes"
            :key="usuario.id"
            class="flex items-center justify-between p-3 rounded-lg bg-matchx-bg-base/30 hover:bg-matchx-bg-base/50 transition-colors"
          >
            <div class="flex items-center gap-3 flex-1">
              <img :src="usuario.url_avatar" alt="Avatar" class="w-8 h-8 rounded-full" />
              <div class="flex-1">
                <div class="text-sm font-medium text-matchx-text-primary">{{ usuario.nombre }}</div>
                <div class="text-xs text-matchx-text-muted">{{ usuario.correo }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-medium text-matchx-text-secondary px-2.5 py-1 rounded-full bg-matchx-accent-green/10 text-matchx-accent-green">
                {{ usuario.rol }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppCard>

    <!-- System info -->
    <AppCard>
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-matchx-text-primary">Información del Sistema</h2>
        <p class="text-matchx-text-secondary text-sm leading-relaxed">
          Bienvenido al panel de administración de matchX. Desde aquí puedes gestionar usuarios, configurar modalidades, administrar sedes y acceder a toda la configuración del sistema.
        </p>
      </div>
    </AppCard>
  </div>
</template>
