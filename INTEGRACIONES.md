# Documentación de Integraciones — matchX

Registro de cada funcionalidad integrada en el frontend, las tablas/campos de la DB que consume, el estado actual (mock vs real) y lo que necesita el backend para completar la integración.

---

## 1. Convocatoria por partido (asistencia)

**Vista:** `src/views/capitan/FixtureView.vue` (modal por partido)  
**Quién puede usarla:** Solo el capitán (`auth.isCapitan === true`)  
**Estado:** Mock determinístico — fallback cuando el backend devuelve vacío

### Tablas de la DB usadas

| Tabla | Campos leídos | Campos escritos |
|-------|--------------|-----------------|
| `convocatoria` | `partido_id`, `jugador_id`, `equipo_id` | `es_titular`, `posicion` (pendiente) |

> **Nota:** La tabla `convocatoria` en la DB incluye `es_titular` y `posicion`, pero el frontend actualmente solo maneja el estado de asistencia (`confirmado / ausente / no_habilitado / pendiente`). Estos estados NO existen en la tabla `convocatoria` tal como está definida.

### Campo faltante en la DB — ACCIÓN REQUERIDA

La tabla `convocatoria` necesita un campo adicional:

```sql
ALTER TABLE convocatoria
  ADD COLUMN estado ENUM('confirmado', 'ausente', 'no_habilitado', 'pendiente')
    NOT NULL DEFAULT 'pendiente';
```

O alternativamente, usar la tabla `sanciones` para `no_habilitado` y dejar `convocatoria` solo para `confirmado/ausente/pendiente`.

### Endpoint esperado

```
GET  /api/torneos/partidos/{partidoId}/asistencia
     → devuelve array de { jugador_id, partido_id, estado }

PUT  /api/torneos/partidos/{partidoId}/asistencia
     body: { jugador_id: number, estado: 'confirmado'|'ausente'|'no_habilitado'|'pendiente' }
```

### Estados manejados

| Estado | Significado |
|--------|-------------|
| `confirmado` | El jugador confirmó asistencia / estuvo presente |
| `ausente` | No se presentó al partido (inasistencia) |
| `no_habilitado` | No puede jugar por sanción (amarilla/roja, deuda, etc.) |
| `pendiente` | Sin respuesta aún (en partidos jugados se trata como `ausente`) |

### Mock actual

```ts
// src/services/asistencias.service.ts
hash = (partidoId * 17 + jugadorId * 31) % 10
0-5 → confirmado · 6-7 → ausente · 8 → no_habilitado · 9 → pendiente
```

---

## 2. Sanciones y multas del equipo (vista capitán)

**Vista:** `src/views/capitan/SancionesView.vue`  
**Ruta:** `/capitan/sanciones`  
**Quién puede usarla:** Solo el capitán (`auth.isCapitan === true`)  
**Estado:** Mock determinístico — fallback cuando el backend devuelve vacío o falla

La vista está dividida en **dos secciones** con fuentes de datos distintas:

---

### 2A. Disciplina del torneo

Origen: tabla `sanciones` + tabla `pagos` + campo `estadisticas_jugador.tarjetas_amarillas`.

| Tabla | Campos leídos | Campos escritos |
|-------|--------------|-----------------|
| `sanciones` | `id`, `torneo_id`, `jugador_id`, `equipo_id`, `tipo_sancion`, `partidos_sancion`, `estado`, `motivo` | — (solo lectura) |
| `pagos` | `jugador_id`, `tipo_pago`, `valor`, `estado` | — (solo lectura) |
| `torneos` | `amarillas_para_suspension`, `partidos_suspension_roja`, `valor_tarjeta_amarilla`, `valor_tarjeta_roja` | — |
| `estadisticas_jugador` | `tarjetas_amarillas` | — |

**Configuración por torneo (campos en tabla `torneos`):**
| Campo | Valor 0 / null | Valor > 0 |
|-------|---------------|-----------|
| `amarillas_para_suspension` | No acumula amarillas → no muestra contador ni "en riesgo" | Acumula — muestra contador visual y alerta |
| `valor_tarjeta_amarilla` | No cobra → no muestra pagos pendientes de amarillas | Cobra — muestra deuda por amarilla |
| `valor_tarjeta_roja` | No cobra → no muestra pagos pendientes de rojas | Cobra — muestra deuda por roja |

**Lo que muestra:**
- Suspensiones activas (roja directa, amarillas acumuladas) con partidos restantes
- Pagos pendientes al torneo por tarjetas (solo si `valor_tarjeta_amarilla > 0` / `valor_tarjeta_roja > 0`) — el jugador queda `bloqueado_deuda` hasta que se pague al admin
- Contador visual de amarillas acumuladas (solo si `amarillas_para_suspension > 0`) con indicador de riesgo

**Campo faltante en `sanciones` — ACCIÓN REQUERIDA:**
```sql
ALTER TABLE sanciones
  ADD COLUMN motivo VARCHAR(255) NULL
  COMMENT 'Descripción breve de la causa (roja directa, amarillas acumuladas, etc.)';
```

**Endpoints esperados:**
```
GET /api/torneos/sanciones?equipo_id=X&torneo_id=Y&estado=activa,apelada
GET /api/torneos/pagos?equipo_id=X&torneo_id=Y&estado=pendiente&tipo=tarjeta_amarilla,tarjeta_roja
```

**Mock actual:**
```ts
// sanciones: jugadorId % 5
// 0 → suspensión 1 partido (roja) · 1 → suspensión 2 partidos (amarillas)
// 2 → amonestación · 3,4 → sin sanción

// pagos: (jugadorId * 11 + torneoId * 3) % 8
// 0 → pago amarilla pendiente · 1 → pago roja pendiente · 2-7 → sin pago
```

---

### 2B. Multas internas del equipo

Origen: tabla nueva `multas_equipo` (no existe aún en la DB — ver abajo).

**Lo que hace:**
- El capitán puede crear multas personalizadas sobre cualquier jugador de su plantilla
- Define motivo libre y monto en COP
- Puede marcar cada multa como **pagada** o **condonada**
- Las multas internas **NO bloquean al jugador en el torneo** — son reglas internas del equipo

**⚠ TABLA NUEVA REQUERIDA EN LA DB:**
```sql
CREATE TABLE multas_equipo (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  equipo_id   INT NOT NULL,
  jugador_id  INT NOT NULL,
  motivo      VARCHAR(255) NOT NULL,
  valor       DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado      ENUM('pendiente','pagada','condonada') NOT NULL DEFAULT 'pendiente',
  creado_por  INT NULL COMMENT 'user_id del capitán',
  creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (equipo_id)  REFERENCES equipos(id),
  FOREIGN KEY (jugador_id) REFERENCES jugadores(id),
  FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);
```

**Endpoints esperados:**
```
GET /api/equipos/{equipoId}/multas
POST /api/equipos/{equipoId}/multas        body: { jugador_id, motivo, valor }
PUT  /api/equipos/{equipoId}/multas/{id}   body: { estado: 'pagada' | 'condonada' }
```

**Mock actual:**
```ts
// multas-equipo: jugadorId % 6
// 2 → multa $30.000 (inasistencia entrenamiento)
// 3 → multa $15.000 (llegó tarde al partido)
// 0,1,4,5 → sin multa interna
```

---

## 3. Estadísticas de jugador (tarjetas amarillas acumuladas)

**Vista:** `src/views/capitan/SancionesView.vue` (indicador visual de amarillas)  
**Estado:** ⚠️ Mock temporal — pendiente implementar servicio real

### Tabla usada

| Tabla | Campos necesarios |
|-------|-------------------|
| `estadisticas_jugador` | `jugador_id`, `torneo_id`, `equipo_id`, `tarjetas_amarillas` |

### Endpoint esperado (futuro)

```
GET /api/torneos/estadisticas?torneo_id=X&equipo_id=Y
    → array de { jugador_id, tarjetas_amarillas, tarjetas_rojas, goles, asistencias, ... }
```

### Acción requerida

Crear `src/services/estadisticas.service.ts` y `src/stores/estadisticas.ts` cuando el backend tenga el endpoint. Reemplazar `amarillasMock()` en `SancionesView` por el dato real.

---

## Resumen de acciones requeridas en la DB

| Prioridad | Acción | Tabla | Descripción |
|-----------|--------|-------|-------------|
| Alta | Agregar campo | `convocatoria` | `estado ENUM('confirmado','ausente','no_habilitado','pendiente') DEFAULT 'pendiente'` |
| Alta | **Crear tabla** | `multas_equipo` | Multas internas creadas por el capitán (motivo libre, monto, estado) |
| Media | Agregar campo | `sanciones` | `motivo VARCHAR(255)` para descripción breve de la causa |
| Media | Verificar endpoint | `pagos` | Endpoint que filtre por equipo + torneo + tipo (tarjeta_amarilla, tarjeta_roja) + estado pendiente |
| Baja | Verificar endpoint | `estadisticas_jugador` | Confirmar que devuelve `tarjetas_amarillas` por jugador por torneo |

---

## Resumen de servicios pendientes de conectar al backend real

| Servicio / Store | Endpoint | Estado |
|-----------------|----------|--------|
| `asistencias.service.ts` | `GET/PUT /api/torneos/partidos/{id}/asistencia` | Mock con fallback ✅ |
| `sanciones.service.ts` | `GET /api/torneos/sanciones` | Mock con fallback ✅ |
| `multas-equipo.service.ts` | `GET/POST/PUT /api/equipos/{id}/multas` | Mock con fallback ✅ |
| `pagos.service.ts` | `GET/PUT /api/torneos/{id}/pagos` | Mock con fallback ✅ |
| `estadisticas.service.ts` | `GET /api/torneos/estadisticas` | ⚠️ No implementado |
| `torneos.service.ts` | `GET /api/torneos` | Mock — pendiente conectar |
| `equipos.service.ts` | `GET /api/torneos/equipos` | Mock — pendiente conectar |
| `jugadores.service.ts` | `GET /api/torneos/jugadores` | Mock — pendiente conectar |
| `partidos.service.ts` | `GET /api/torneos/partidos` | Mock — pendiente conectar |

---

*Última actualización: 2026-04-10*
