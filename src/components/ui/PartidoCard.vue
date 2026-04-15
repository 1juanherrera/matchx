<script setup lang="ts">
import { CalendarRange, Clock, CheckCircle2, ArrowRight, Radio, AlertCircle } from 'lucide-vue-next'

interface PartidoCard {
  id:               number
  jornada:          number
  fecha_hora:       string
  estado:           string
  goles_local:      number
  goles_visitante:  number
  localNombre:      string
  localEscudo:      string
  localColor:       string
  visitanteNombre:  string
  visitanteEscudo:  string
  visitanteColor:   string
}

defineProps<{ partido: PartidoCard }>()
defineEmits<{ ver: [] }>()

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })

const formatHora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div
    class="bg-matchx-bg-surface rounded-xl border overflow-hidden transition-all duration-200"
    :class="{
      'border-red-400/40 shadow-[0_0_16px_-4px_rgba(248,113,113,0.15)]': partido.estado === 'en_curso',
      'border-matchx-border-base':                                        partido.estado !== 'en_curso',
    }"
  >
    <!-- Barra superior de estado -->
    <div
      class="h-0.5 w-full"
      :class="{
        'bg-gradient-to-r from-red-400/40 via-red-400 to-red-400/40 animate-pulse': partido.estado === 'en_curso',
        'bg-matchx-accent-green/30':                                                  partido.estado === 'finalizado',
        'bg-blue-500/30':                                                              partido.estado === 'programado',
        'bg-yellow-500/30':                                                            partido.estado === 'aplazado' || partido.estado === 'suspendido',
      }"
    />

    <div class="p-4">

      <!-- Fila superior: fecha/hora + badge estado -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-1.5 text-xs text-matchx-text-muted">
          <CalendarRange class="w-3.5 h-3.5" :stroke-width="1.75" />
          <span class="capitalize">{{ formatFecha(partido.fecha_hora) }}</span>
          <Clock class="w-3 h-3 ml-1" :stroke-width="1.75" />
          <span>{{ formatHora(partido.fecha_hora) }}</span>
        </div>

        <!-- Badge estado -->
        <div
          class="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
          :class="{
            'bg-red-400/10 text-red-400':                      partido.estado === 'en_curso',
            'bg-matchx-accent-green/10 text-matchx-accent-green': partido.estado === 'finalizado',
            'bg-blue-500/10 text-blue-400':                    partido.estado === 'programado',
            'bg-yellow-500/10 text-yellow-400':                partido.estado === 'aplazado' || partido.estado === 'suspendido',
          }"
        >
          <!-- EN VIVO: punto pulsante -->
          <template v-if="partido.estado === 'en_curso'">
            <span class="relative flex h-1.5 w-1.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-400" />
            </span>
            EN VIVO
          </template>
          <template v-else-if="partido.estado === 'finalizado'">
            <CheckCircle2 class="w-3.5 h-3.5" :stroke-width="2" />
            Finalizado
          </template>
          <template v-else-if="partido.estado === 'programado'">
            <Clock class="w-3.5 h-3.5" :stroke-width="2" />
            Programado
          </template>
          <template v-else>
            <AlertCircle class="w-3.5 h-3.5" :stroke-width="2" />
            {{ partido.estado }}
          </template>
        </div>
      </div>

      <!-- Equipos + marcador -->
      <div class="flex items-center gap-3">

        <!-- Local (nombre + escudo alineados a la derecha) -->
        <div class="flex-1 flex items-center gap-2 justify-end min-w-0">
          <span
            class="text-sm font-bold leading-tight text-right truncate transition-opacity"
            :class="partido.estado === 'finalizado' && partido.goles_local < partido.goles_visitante
              ? 'text-matchx-text-muted'
              : 'text-matchx-text-primary'"
          >{{ partido.localNombre }}</span>
          <div class="w-9 h-9 rounded-lg bg-matchx-bg-elevated border border-matchx-border-base flex items-center justify-center p-1 shrink-0">
            <img
              v-if="partido.localEscudo"
              :src="partido.localEscudo"
              :alt="partido.localNombre"
              class="w-full h-full object-contain"
            />
            <!-- Placeholder iniciales si no hay escudo -->
            <span
              v-else
              class="text-xs font-black leading-none"
              :style="{ color: partido.localColor }"
            >{{ partido.localNombre.slice(0, 2).toUpperCase() }}</span>
          </div>
        </div>

        <!-- Marcador central -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Gol local -->
          <div
            class="w-10 h-10 flex items-center justify-center rounded-lg font-black text-xl leading-none"
            style="font-family: 'Fira Code', monospace"
            :class="partido.estado === 'en_curso' || partido.estado === 'finalizado'
              ? 'bg-matchx-bg-elevated'
              : 'bg-matchx-bg-elevated'"
            :style="partido.estado === 'en_curso' || partido.estado === 'finalizado'
              ? { color: partido.localColor }
              : {}"
          >
            <span v-if="partido.estado === 'en_curso' || partido.estado === 'finalizado'">
              {{ partido.goles_local }}
            </span>
            <span v-else class="text-matchx-text-muted text-base">-</span>
          </div>

          <span class="text-matchx-text-muted text-sm font-bold">:</span>

          <!-- Gol visitante -->
          <div
            class="w-10 h-10 flex items-center justify-center rounded-lg font-black text-xl leading-none"
            style="font-family: 'Fira Code', monospace"
            :class="'bg-matchx-bg-elevated'"
            :style="partido.estado === 'en_curso' || partido.estado === 'finalizado'
              ? { color: partido.visitanteColor }
              : {}"
          >
            <span v-if="partido.estado === 'en_curso' || partido.estado === 'finalizado'">
              {{ partido.goles_visitante }}
            </span>
            <span v-else class="text-matchx-text-muted text-base">-</span>
          </div>
        </div>

        <!-- Visitante (escudo + nombre alineados a la izquierda) -->
        <div class="flex-1 flex items-center gap-2 min-w-0">
          <div class="w-9 h-9 rounded-lg bg-matchx-bg-elevated border border-matchx-border-base flex items-center justify-center p-1 shrink-0">
            <img
              v-if="partido.visitanteEscudo"
              :src="partido.visitanteEscudo"
              :alt="partido.visitanteNombre"
              class="w-full h-full object-contain"
            />
            <span
              v-else
              class="text-xs font-black leading-none"
              :style="{ color: partido.visitanteColor }"
            >{{ partido.visitanteNombre.slice(0, 2).toUpperCase() }}</span>
          </div>
          <span
            class="text-sm font-bold leading-tight truncate transition-opacity"
            :class="partido.estado === 'finalizado' && partido.goles_visitante < partido.goles_local
              ? 'text-matchx-text-muted'
              : 'text-matchx-text-primary'"
          >{{ partido.visitanteNombre }}</span>
        </div>

      </div>

      <!-- Footer: link ver detalle -->
      <div class="mt-4 pt-3 border-t border-matchx-border-base flex items-center justify-between">
        <span v-if="partido.estado === 'en_curso'" class="text-[11px] text-red-400/70 font-medium flex items-center gap-1">
          <Radio class="w-3 h-3" :stroke-width="2" />
          Actualizando en tiempo real
        </span>
        <span v-else class="text-[11px] text-matchx-text-muted">
          Jornada {{ partido.jornada }}
        </span>

        <button
          @click="$emit('ver')"
          class="flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
          :class="partido.estado === 'en_curso'
            ? 'text-red-400 hover:text-red-300'
            : 'text-matchx-accent-green hover:opacity-70'"
        >
          {{ partido.estado === 'en_curso' ? 'Ver en vivo' : partido.estado === 'finalizado' ? 'Ver detalle' : 'Ver información' }}
          <ArrowRight class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </div>

    </div>
  </div>
</template>
