/**
 * Oh, Vue Icons! — registro central de iconos
 *
 * Packs usados:
 *  Co* → CoreUI Icons       (UI general, formas limpias)
 *  Fa* → Font Awesome 5     (fútbol: FaFutbol, FaTrophy, FaMedal…)
 *  Gi* → Game Icons         (detalles deportivos)
 *
 * Cómo agregar uno nuevo:
 *   1. Importarlo aquí
 *   2. Añadirlo al array de addIcons()
 *   3. Usarlo en templates con: <v-icon name="co-football" />
 *      (kebab-case del nombre del export, sin el prefijo de pack)
 */

import { OhVueIcon, addIcons } from 'oh-vue-icons'
import type { App } from 'vue'

// ── CoreUI ────────────────────────────────────────────────────────────────────
import {
  CoFootball,        // ⚽  balón de fútbol — goleadores, eventos
  CoSoccer,          // ⚽  alias soccer ball
  CoShieldAlt,       // 🛡️  escudo equipo — tarjetas, defensa
  CoCalendar,        // 📅  calendario — fixture, partidos
  CoClock,           // 🕐  reloj — tiempo, horario
  CoUser,            // 👤  jugador, perfil
  CoUserPlus,        // 👤➕ registrar jugador
  CoBarChart,        // 📊  estadísticas generales
  CoChartLine,       // 📈  tendencia, evolución
  CoStar,            // ⭐  destaque, MVP
  CoFlagAlt,         // 🚩  córner, evento
  CoCreditCard,      // 💳  (alias para tarjeta en contexto de sanciones)
} from 'oh-vue-icons/icons/co'

// ── Font Awesome 5 ────────────────────────────────────────────────────────────
import {
  FaFutbol,          // ⚽  balón clásico — alternativo
  FaTrophy,          // 🏆  trofeo — posiciones 1er lugar
  FaMedal,           // 🥇  medalla — 2do y 3er lugar
  FaStopwatch,       // ⏱️  cronómetro — delegado en vivo
  FaFlag,            // 🚩  bandera — kickoff, córner
  FaFlagCheckered,   // 🏁  bandera cuadros — final partido
  FaTshirt,          // 👕  camiseta — plantilla, jugadores
  FaShieldAlt,       // 🛡️  escudo — equipos
  FaAward,           // 🏅  premio — MVP, mejor jugador
} from 'oh-vue-icons/icons/fa'

// ── Game Icons ────────────────────────────────────────────────────────────────
import {
  GiWhistle,         // 🔔  silbato — árbitro
  GiCardRandom,      // 🃏  tarjeta — sanciones amarilla/roja
} from 'oh-vue-icons/icons/gi'

export function registerIcons(app: App) {
  addIcons(
    // CoreUI
    CoFootball, CoSoccer, CoShieldAlt, CoCalendar, CoClock,
    CoUser, CoUserPlus, CoBarChart, CoChartLine, CoStar, CoFlagAlt, CoCreditCard,
    // Font Awesome
    FaFutbol, FaTrophy, FaMedal, FaStopwatch, FaFlag, FaFlagCheckered,
    FaTshirt, FaShieldAlt, FaAward,
    // Game Icons
    GiWhistle, GiCardRandom,
  )
  app.component('VIcon', OhVueIcon)
}
