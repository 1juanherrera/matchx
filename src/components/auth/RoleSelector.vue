<script setup lang="ts">
import { computed } from 'vue'
import { Crown, Trophy, Building2, Clipboard, Scale, Flag, Eye, ChevronDown } from 'lucide-vue-next'
import type { UserRole } from '@/stores/auth'

interface RoleOption {
  value: UserRole
  label: string
  icon: any
  description: string
}

const props = defineProps<{
  modelValue: UserRole | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UserRole | null]
}>()

const roles: RoleOption[] = [
  { value: 'superadmin',   label: 'Admin Sistema', icon: Crown,      description: 'Control total del sistema' },
  { value: 'admin_torneo', label: 'Admin Torneo',  icon: Trophy,     description: 'Gestión de torneos y equipos' },
  { value: 'admin_sede',   label: 'Admin Sede',    icon: Building2,  description: 'Administración de canchas' },
  { value: 'delegado',     label: 'Delegado',      icon: Clipboard,  description: 'Mesa de control en cancha' },
  { value: 'arbitro',      label: 'Árbitro',       icon: Scale,      description: 'Partido y disciplina' },
  { value: 'capitan',      label: 'Capitán',       icon: Flag,       description: 'Gestión del equipo' },
  { value: 'publico',      label: 'Público',       icon: Eye,        description: 'Vista de resultados' },
]

const selected = computed(() => roles.find(r => r.value === props.modelValue) ?? null)
</script>

<template>
  <div class="space-y-2">

    <!-- Grid — colapsa con max-height cuando hay rol seleccionado -->
    <div :class="['role-grid', { 'role-grid--collapsed': modelValue }]">
      <p class="text-xs font-medium text-matchx-text-muted uppercase tracking-wider mb-2">
        Selecciona tu rol
      </p>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="role in roles"
          :key="role.value"
          type="button"
          :aria-label="`Rol: ${role.label}`"
          :tabindex="modelValue ? -1 : 0"
          class="flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchx-accent-green focus-visible:ring-offset-2 focus-visible:ring-offset-matchx-bg-base border-matchx-border-base bg-matchx-bg-surface text-matchx-text-secondary hover:border-matchx-accent-green/50 hover:text-matchx-text-primary"
          @click="emit('update:modelValue', role.value)"
        >
          <component :is="role.icon" class="w-5 h-5" :stroke-width="1.75" />
          <span class="text-[10px] font-medium leading-tight text-center">{{ role.label }}</span>
        </button>
      </div>
    </div>

    <!-- Chip de rol seleccionado -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="space-y-1">
        <p class="text-xs font-medium text-matchx-text-muted uppercase tracking-wider">
          Rol seleccionado
        </p>
        <div class="flex items-center justify-between rounded-lg border border-matchx-accent-green bg-matchx-accent-green/10 px-4 py-3">
          <div class="flex items-center gap-3">
            <component :is="selected!.icon" class="w-5 h-5 text-matchx-accent-green" :stroke-width="1.75" />
            <div>
              <p class="text-sm font-medium text-matchx-text-primary">{{ selected!.label }}</p>
              <p class="text-xs text-matchx-text-muted">{{ selected!.description }}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cambiar rol"
            class="flex items-center gap-1 text-xs text-matchx-text-muted hover:text-matchx-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchx-accent-green rounded px-1"
            @click="emit('update:modelValue', null)"
          >
            <ChevronDown class="w-3.5 h-3.5" :stroke-width="2" />
            Cambiar
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.role-grid {
  max-height: 200px;
  overflow: hidden;
  opacity: 1;
  transition: max-height 0.25s ease, opacity 0.2s ease;
}

.role-grid--collapsed {
  max-height: 0;
  opacity: 0;
}
</style>
