<script setup lang="ts">
import { Crown, Trophy, Building2, Clipboard, Scale, Flag, User, ChevronLeft } from 'lucide-vue-next'
import type { AuthProfile } from '@/stores/auth'

const props = defineProps<{
  profiles: AuthProfile[]
  username: string
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  select: [rol: string]
  back: []
}>()

const roleIconMap: Record<string, any> = {
  administrador: Crown,
  admin_torneo:  Trophy,
  admin_sede:    Building2,
  delegado:      Clipboard,
  arbitro:       Scale,
  capitan:       Flag,
  jugador:       Flag,
}

const roleLabelMap: Record<string, string> = {
  administrador: 'Administrador',
  admin_torneo:  'Admin Torneo',
  admin_sede:    'Admin Sede',
  delegado:      'Delegado',
  arbitro:       'Árbitro',
  capitan:       'Capitán',
  jugador:       'Jugador',
}

const roleDescMap: Record<string, string> = {
  administrador: 'Control total del sistema',
  admin_torneo:  'Gestión de torneos y equipos',
  admin_sede:    'Administración de canchas',
  delegado:      'Mesa de control en cancha',
  arbitro:       'Partido y disciplina',
  capitan:       'Gestión del equipo',
  jugador:       'Vista de jugador',
}

const getIcon = (rol: string) => roleIconMap[rol] ?? User
const getLabel = (p: AuthProfile) => roleLabelMap[p.rol] ?? p.nombre
const getDesc = (rol: string) => roleDescMap[rol] ?? ''
</script>

<template>
  <div class="space-y-5">
    <!-- Cabecera con info de usuario -->
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium text-matchx-text-muted uppercase tracking-wider mb-1">
          Conectado como
        </p>
        <p class="text-sm font-semibold text-matchx-text-primary">{{ username }}</p>
      </div>
      <button
        type="button"
        class="flex items-center gap-1 text-xs text-matchx-text-muted hover:text-matchx-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchx-accent-green rounded px-1 py-0.5"
        @click="emit('back')"
      >
        <ChevronLeft class="w-3.5 h-3.5" />
        Cambiar cuenta
      </button>
    </div>

    <!-- Divider -->
    <div class="flex items-center gap-3">
      <div class="h-px flex-1 bg-matchx-border-base" />
      <span class="text-xs text-matchx-text-muted">elige tu perfil</span>
      <div class="h-px flex-1 bg-matchx-border-base" />
    </div>

    <!-- Lista de perfiles -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <button
        v-for="profile in profiles"
        :key="profile.id_profiles"
        type="button"
        :disabled="loading"
        @click="emit('select', profile.rol)"
        class="group relative w-full flex flex-col gap-4 rounded-2xl border border-matchx-border-base bg-gradient-to-br from-matchx-bg-surface to-matchx-bg-elevated p-4 text-left transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-matchx-accent-green/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchx-accent-green disabled:opacity-50 disabled:cursor-not-allowed"
      >
        
        <!-- Glow hover -->
        <div class="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-matchx-accent-green/5 blur-xl"></div>

        <!-- Header -->
        <div class="flex items-center justify-between relative z-10">
          
          <!-- Icono -->
          <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-matchx-border-base bg-matchx-bg-elevated text-matchx-accent-green shadow-sm group-hover:shadow-md group-hover:scale-105 transition">
            <component :is="getIcon(profile.rol)" class="w-5 h-5" :stroke-width="1.75" />
          </div>

          <!-- Badge -->
          <span class="text-[10px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-matchx-accent-green/10 text-matchx-accent-green border border-matchx-accent-green/20">
            {{ getLabel(profile) }}
          </span>
        </div>

        <!-- Texto -->
        <div class="relative z-10">
          <p class="text-sm font-semibold text-matchx-text-primary truncate">
            {{ getLabel(profile) }}
          </p>
          <p class="text-xs text-matchx-text-muted mt-1 leading-relaxed">
            {{ getDesc(profile.rol) }}
          </p>
        </div>

      </button>
    </div>

    <!-- Error -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <p v-if="error" role="alert" class="flex items-start gap-2 text-sm text-matchx-accent-orange">
        <span class="shrink-0 mt-0.5">⚠</span>{{ error }}
      </p>
    </Transition>
  </div>
</template>
