# matchX — Gaps de Base de Datos

> **Propósito**: Documento comparativo entre el schema actual (`match_produccion.sql`) y lo que el frontend requiere para funcionar. Lista tablas nuevas, campos faltantes, cambios de tipo y relaciones por agregar.

> **Schemas existentes**
> - `match_produccion` — tablas del dominio de torneos
> - `match_access` — tablas de usuarios y sedes (referenciadas vía FK externa)

> **Leyenda**
> - ✅ Existe en BD y coincide con frontend
> - ⚠️ Existe pero le faltan campos / tipos erróneos
> - ❌ No existe — crear tabla

---

## 1. Resumen ejecutivo

| Tipo de gap | Cantidad | Detalle |
|-------------|----------|---------|
| Tablas nuevas por crear | 4 | `solicitudes`, `comunicados`, `multas_equipo`, `asistencias` |
| Tablas con campos faltantes | 2 | `modalidades`, `inscripciones` |
| Tablas OK (20) | 20 | ver §4 |

---

## 2. Tablas que hay que CREAR (❌)

### 2.1 `solicitudes` — Solicitudes de capitanes

Permite al capitán solicitar alta/baja/transferencia de jugadores. El admin aprueba o rechaza.

```sql
CREATE TABLE `solicitudes` (
  `id_solicitudes`        int NOT NULL AUTO_INCREMENT,
  `tipo`                  enum('alta_jugador','baja_jugador','transferencia','habilitacion_documento') NOT NULL,
  `equipo_id`             int NOT NULL,
  `jugador_id`            int DEFAULT NULL COMMENT 'Para baja/transferencia',
  `datos`                 json DEFAULT NULL COMMENT 'Payload dependiente del tipo. Ver abajo.',
  `estado`                enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  `solicitado_por`        int NOT NULL COMMENT 'FK a match_access.users — el capitán',
  `revisado_por`          int DEFAULT NULL COMMENT 'FK a match_access.users — el admin que aprobó/rechazó',
  `motivo_rechazo`        text DEFAULT NULL,
  `created_at`            datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_solicitudes`),
  KEY `idx_solicitudes_equipo` (`equipo_id`),
  KEY `idx_solicitudes_estado` (`estado`),
  KEY `idx_solicitudes_jugador` (`jugador_id`),
  CONSTRAINT `fk_solicitudes_equipo`
    FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`),
  CONSTRAINT `fk_solicitudes_jugador`
    FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`)
) ENGINE=InnoDB;
```

**Estructura del campo `datos` (JSON) según tipo**:
- `alta_jugador`:
  ```json
  { "nombre": "...", "apellido": "...", "numero_camiseta": 17, "posicion": "delantero", "tipo_documento": "CC", "numero_documento": "1098765432" }
  ```
- `baja_jugador`: `null` (usar `jugador_id`)
- `transferencia`:
  ```json
  { "equipo_destino_id": 3 }
  ```
- `habilitacion_documento`:
  ```json
  { "url_documento": "https://...", "tipo_documento": "afiliacion_eps" }
  ```

**Side effects al aprobar** (ver §11 en `API_ENDPOINTS.md`):
- `alta_jugador` → INSERT en `jugadores` con `datos.*`, luego INSERT en `plantilla` para vincular al equipo.
- `baja_jugador` → `UPDATE jugadores SET activo=0`.
- `transferencia` → mover registro de `plantilla` del equipo origen al destino.

---

### 2.2 `comunicados` — Tablón del torneo

```sql
CREATE TABLE `comunicados` (
  `id_comunicados`     int NOT NULL AUTO_INCREMENT,
  `titulo`             varchar(200) NOT NULL,
  `cuerpo`             text NOT NULL,
  `tipo`               enum('general','urgente','informativo') NOT NULL DEFAULT 'general',
  `torneo_id`          int DEFAULT NULL COMMENT 'NULL = comunicado global',
  `imagen_url`         varchar(500) DEFAULT NULL,
  `creado_por`         int NOT NULL COMMENT 'FK match_access.users',
  `activo`             tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Soft delete',
  `created_at`         datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comunicados`),
  KEY `idx_comunicados_torneo` (`torneo_id`),
  KEY `idx_comunicados_tipo` (`tipo`),
  KEY `idx_comunicados_activo` (`activo`),
  CONSTRAINT `fk_comunicados_torneo`
    FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE CASCADE
) ENGINE=InnoDB;
```

> **Nota**: el campo `activo` del frontend se serializa como `true`/`false` en las respuestas de comunicados (a diferencia del resto de tablas que usan `0/1`). Laravel lo manejará automáticamente si el cast es `boolean`.

---

### 2.3 `multas_equipo` — Multas internas del equipo

Separa las multas internas del equipo (disciplina interna) de los pagos de tarjetas del torneo (tabla `pagos`).

```sql
CREATE TABLE `multas_equipo` (
  `id_multas_equipo`   int NOT NULL AUTO_INCREMENT,
  `equipo_id`          int NOT NULL,
  `jugador_id`         int NOT NULL,
  `motivo`             varchar(500) NOT NULL,
  `valor`              decimal(10,2) NOT NULL DEFAULT 0,
  `estado`             enum('pendiente','pagada','condonada') NOT NULL DEFAULT 'pendiente',
  `creado_por`         int NOT NULL COMMENT 'FK match_access.users — el capitán',
  `creado_en`          datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_multas_equipo`),
  KEY `idx_multas_equipo_equipo` (`equipo_id`),
  KEY `idx_multas_equipo_jugador` (`jugador_id`),
  KEY `idx_multas_equipo_estado` (`estado`),
  CONSTRAINT `fk_multas_equipo_equipo`
    FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`),
  CONSTRAINT `fk_multas_equipo_jugador`
    FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`)
) ENGINE=InnoDB;
```

---

### 2.4 `asistencias` — Asistencias a partido

Registra la asistencia de cada jugador a cada partido. UPSERT por `(partido_id, jugador_id)`.

```sql
CREATE TABLE `asistencias` (
  `id_asistencias`  int NOT NULL AUTO_INCREMENT,
  `partido_id`      int NOT NULL,
  `jugador_id`      int NOT NULL,
  `estado`          enum('confirmado','ausente','no_habilitado','pendiente') NOT NULL DEFAULT 'pendiente',
  `registrado_en`   datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_asistencias`),
  UNIQUE KEY `uk_partido_jugador` (`partido_id`, `jugador_id`),
  KEY `idx_asistencias_jugador` (`jugador_id`),
  CONSTRAINT `fk_asistencias_partido`
    FOREIGN KEY (`partido_id`) REFERENCES `partidos` (`id_partidos`) ON DELETE CASCADE,
  CONSTRAINT `fk_asistencias_jugador`
    FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`)
) ENGINE=InnoDB;
```

---

## 3. Tablas con CAMBIOS (⚠️)

### 3.1 `modalidades` — Agregar `codigo`, `descripcion`

Actualmente tiene: `id_modalidades`, `nombre`, `jugadores_por_equipo`, `duracion_minutos`, `numero_tiempos`, `cambios_permitidos`, `activo`.

**Faltantes** que el frontend consume en cada respuesta:

```sql
ALTER TABLE `modalidades`
  ADD COLUMN `codigo`      varchar(10) NOT NULL DEFAULT '' COMMENT 'Ej: F5, F7, F11' AFTER `nombre`,
  ADD COLUMN `descripcion` text DEFAULT NULL COMMENT 'Descripción de la modalidad' AFTER `codigo`;

UPDATE `modalidades` SET `codigo` = 'F5'  WHERE `id_modalidades` = 1;
UPDATE `modalidades` SET `codigo` = 'F7'  WHERE `id_modalidades` = 2;
UPDATE `modalidades` SET `codigo` = 'F11' WHERE `id_modalidades` = 3;
```

> **Gap menor** — los nombres actuales de las columnas en BD son `duracion_minutos` y `cambios_permitidos`, pero el frontend espera `duracion_tiempo_minutos` y `max_cambios`. El backend puede:
> - Renombrar las columnas con `ALTER TABLE ... RENAME COLUMN`, **o**
> - Hacer el alias en el modelo Eloquent (`$appends = ['duracion_tiempo_minutos','max_cambios']`).

---

### 3.2 `inscripciones` — Agregar 4 campos de pago de matrícula

Actualmente tiene: `id_inscripciones`, `torneo_id`, `equipo_id`, `grupo_id`, `estado`, `fecha_inscripcion`, `aprobado_por`, `fecha_aprobacion`, `motivo_rechazo`, `observaciones`.

**Faltantes** que el frontend muestra en `InscripcionesView.vue`:

```sql
ALTER TABLE `inscripciones`
  ADD COLUMN `pago_estado`     enum('pendiente','pagado','condonado') NOT NULL DEFAULT 'pendiente' AFTER `observaciones`,
  ADD COLUMN `pago_metodo`     enum('nequi','daviplata','bancolombia','efectivo','transferencia') DEFAULT NULL AFTER `pago_estado`,
  ADD COLUMN `pago_referencia` varchar(100) DEFAULT NULL AFTER `pago_metodo`,
  ADD COLUMN `pago_fecha`      datetime DEFAULT NULL AFTER `pago_referencia`;

CREATE INDEX `idx_inscripciones_pago_estado` ON `inscripciones` (`pago_estado`);
```

---

## 4. Tablas que ya están OK (✅)

Las siguientes tablas del schema actual ya concuerdan con lo que el frontend espera:

| Tabla | Notas |
|-------|-------|
| `torneos` | Tiene los 20+ campos. ✅ |
| `equipos` | Incluye `color_terciario`, `color_cuaternario`. ✅ |
| `jugadores` | Incluye `url_foto`, `fecha_nacimiento`, `tipo_documento`, `numero_documento`. ✅ |
| `partidos` | ✅ |
| `eventos_partido` | ✅ |
| `convocatoria` | ✅ |
| `plantilla` | ✅ — aquí viven `numero_dorsal`, `posicion`, `es_capitan`. |
| `sanciones` | ✅ |
| `pagos` | ✅ |
| `pagos_arbitros` | ✅ |
| `arbitros` | ✅ |
| `canchas` | ✅ — `activo` solamente (no hay `disponible`). |
| `fases_torneo` | ✅ |
| `grupos` | ✅ |
| `tabla_posiciones` | ✅ |
| `torneo_sedes` | ✅ |
| `estadisticas_jugador` | ✅ |
| `documentos_generados` | ✅ |
| `modalidades` | ⚠️ ver §3.1 |
| `inscripciones` | ⚠️ ver §3.2 |

---

## 5. Relaciones entre schemas (FK externas)

El schema `match_produccion` referencia a `match_access`:

| FK | Tabla origen (`match_produccion`) | Campo | Destino (`match_access`) |
|----|-----------------------------------|-------|--------------------------|
| usuarios → torneos | `torneos` | `admin_id` | `users.id_users` |
| usuarios → equipos | `equipos` | `capitan_id` | `users.id_users` |
| usuarios → partidos | `partidos` | `arbitro_id`, `delegado_id` | `users.id_users` |
| usuarios → eventos | `eventos_partido` | `registrado_por` | `users.id_users` |
| usuarios → comunicados (NUEVA) | `comunicados` | `creado_por` | `users.id_users` |
| usuarios → solicitudes (NUEVA) | `solicitudes` | `solicitado_por`, `revisado_por` | `users.id_users` |
| usuarios → multas_equipo (NUEVA) | `multas_equipo` | `creado_por` | `users.id_users` |
| sedes → torneo_sedes | `torneo_sedes` | `sede_id` | `sedes.id_sedes` |
| sedes → canchas | `canchas` | `sede_id` | `sedes.id_sedes` |
| sedes → partidos | `partidos` | `sede_id` | `sedes.id_sedes` |

> **Importante**: si el DBMS no permite FK cross-schema, al menos **documentar** la relación e implementar la integridad vía validación en el modelo/servicio.

---

## 6. Campos derivados obligatorios (JOIN requerido por el backend)

Estos campos **NO se guardan en la tabla base**. El backend los debe calcular/joinar al serializar la respuesta:

| Endpoint | Campo derivado | Origen |
|----------|----------------|--------|
| `GET /torneos/torneos` | `modalidad_codigo`, `modalidad` | JOIN `modalidades` |
| `GET /torneos/torneos` | `administrador` | JOIN `users` vía `admin_id` |
| `GET /torneos/torneos` | `equipos_inscritos` | `COUNT(*) FROM inscripciones WHERE torneo_id=? AND estado='aprobada'` |
| `GET /torneos/equipos` | `capitan_nombre` | JOIN `users` vía `capitan_id` |
| `GET /torneos/equipos` (en contexto) | `torneo_id` | Viene del contexto (ruta `/plantilla/:torneoId`) o JOIN con `inscripciones` |
| `GET /torneos/torneos/:id/inscripciones` | `aprobado_por` (nombre) | JOIN `users` vía `aprobado_por` (id). **Devolver el NOMBRE**, no el id. |
| `GET /torneos/torneos/:id/inscripciones` | `equipo{}` (nested) | JOIN `equipos` |
| `GET /torneos/solicitudes` | `equipo_nombre`, `jugador_nombre`, `solicitado_por_nombre` | JOIN respectivos |
| `GET /torneos/comunicados` | `creado_por_nombre` | JOIN `users` vía `creado_por` |
| `GET /torneos/fases/:id/posiciones` | toda la tabla | Calcular agregados desde `partidos` finalizados (o mantener `tabla_posiciones` actualizada via triggers/jobs) |
| `GET /torneos/torneos/:id/goleadores` | ranking | Agregado desde `eventos_partido` tipo `gol` + `penal_convertido` |

---

## 7. Convenciones que el backend DEBE respetar

1. **Respuestas envueltas**: `{ data: ..., status: "ok" }` — ver `API_ENDPOINTS.md §0.4`.
2. **PKs con prefijo**: `id_torneos`, `id_equipos`, `id_sedes`, etc. Mantener así (el frontend hace el mapping).
3. **Booleans como `0/1`**: excepto `comunicados.activo` que va como `true/false`.
4. **Fechas ISO 8601 UTC**: siempre con `Z` al final.
5. **Errores 4xx**: sin wrapper, con `{ message, errors: { _general: [...] } }`.
6. **401 reservado**: solo para token inválido. Para credenciales incorrectas de login → **422**.
7. **Side effects del acta**: al registrar un gol en `eventos_partido`, actualizar `partidos.goles_local` o `goles_visitante` (ver `API_ENDPOINTS.md §9.2`).
8. **Soft delete en comunicados**: DELETE solo setea `activo = false`.
9. **Unique constraint en inscripciones**: `(torneo_id, equipo_id)` — devolver 422 si ya existe.
10. **Upsert en asistencias**: `(partido_id, jugador_id)`.

---

## 8. Checklist de migraciones para backend

```
☐ CREATE TABLE solicitudes
☐ CREATE TABLE comunicados
☐ CREATE TABLE multas_equipo
☐ CREATE TABLE asistencias
☐ ALTER TABLE modalidades ADD codigo, descripcion
☐ ALTER TABLE inscripciones ADD pago_estado, pago_metodo, pago_referencia, pago_fecha
☐ (opcional) ALTER TABLE modalidades RENAME duracion_minutos → duracion_tiempo_minutos
☐ (opcional) ALTER TABLE modalidades RENAME cambios_permitidos → max_cambios
☐ Implementar side-effect de goles en POST /eventos
☐ Implementar soft delete en DELETE /comunicados/:id
☐ Implementar cálculo de tabla de posiciones (trigger o endpoint dinámico)
☐ Implementar ranking de goleadores
```

---

**Última actualización**: 2026-04-17
**Fuente**: comparación de `match_produccion.sql` vs. `src/data/mocks/*.json` + `src/mocks/handlers/*.ts`.
