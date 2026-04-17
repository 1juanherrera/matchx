# matchX — Contrato de API (Referencia para Backend)

> **Propósito**: Esta documentación es la referencia EXACTA de lo que el frontend espera del backend. Cada endpoint está generado directamente desde los handlers MSW (`src/mocks/handlers/*.ts`) y los `normalize*` de los servicios (`src/services/*.service.ts`). Si un campo figura aquí, el frontend lo consume; si falta en la respuesta, algo se romperá.

> **Alcance**: 16 dominios — Auth, Torneos, Equipos, Jugadores, Partidos, Sedes/Canchas, Modalidades, Usuarios, Eventos de partido, Inscripciones, Solicitudes, Comunicados, Sanciones, Pagos (tarjetas), Multas de equipo, Asistencias.

---

## 0. Convenciones globales

### 0.1 Base URL
- Variable de entorno del frontend: `VITE_API_BASE_URL`
- Valor actual en desarrollo: `http://35.243.241.205:8082`
- Todos los paths de este documento se sirven bajo esa base URL.

### 0.2 Autenticación
- Esquema: **JWT Bearer**.
- El token se obtiene en `POST /api/login` y se almacena en `localStorage.matchx_session` (campo `token`).
- Todas las peticiones (excepto `POST /api/login`) deben incluir:
  ```
  Authorization: Bearer {token}
  ```
- **HTTP 401** → el interceptor del frontend hace `localStorage.clear()` + redirect a `/login`. **No uses 401 para credenciales incorrectas**: para errores de login devuelve **422**.

### 0.3 Content-Type
Todas las peticiones con body:
```
Content-Type: application/json
```

### 0.4 Formato de respuesta (wrapper)

**Éxito (HTTP 200 / 201)** — TODAS las respuestas de lectura y escritura deben envolver los datos:
```json
{
  "data": { /* objeto o array — ver cada endpoint */ },
  "status": "ok"
}
```

Algunas respuestas de acciones (toggle, eliminar, asignar sede) devuelven un objeto simple dentro de `data`:
```json
{ "data": { "message": "Recurso eliminado correctamente" }, "status": "ok" }
```

**Error (HTTP 4xx / 5xx)** — sin wrapper:
```json
{
  "message": "Texto legible para el usuario",
  "errors": { "_general": ["Texto legible para el usuario"] }
}
```

| HTTP | Uso |
|------|-----|
| 200 | OK (lectura / actualización / acción) |
| 201 | Created (POST que crea recurso) |
| 401 | SOLO para token inválido/expirado → el frontend desloguea automáticamente |
| 404 | Recurso no encontrado. `{ "message": "Solicitud no encontrado", "errors": { "_general": ["Solicitud no encontrado"] } }` |
| 422 | Validación / reglas de negocio rotas (incluye credenciales incorrectas de login) |
| 500 | Error interno |

### 0.5 Convenciones de datos

| Convención | Regla |
|------------|-------|
| PKs | `id_<tabla>` (ej: `id_torneos`, `id_equipos`, `id_sedes`). Algunos endpoints aceptan ambos en input. |
| Booleans | `0 | 1` en columnas `activo`, `es_capitan`, `inscripcion_publica`, `marcador_publico`, `es_autogol`. `true/false` solo en `comunicados.activo` y lógicos derivados. |
| Fechas | ISO 8601 UTC: `2026-03-08T10:00:00Z`. Campo `creado_en` / `created_at` en cada tabla. |
| Money | Entero COP sin decimales (`valor_matricula: 150000` = $150.000 COP). |
| Arrays vacíos | `[]`, nunca `null`. |
| Strings vacíos | `""`, nunca `null`, salvo que sea FK nullable. |

### 0.6 Roles del sistema
| Rol | Uso |
|-----|-----|
| `superadmin` | Admin global (carlos) |
| `admin_torneo` | Admin de torneos (ana) |
| `admin_sede` | Admin de sede/canchas (juan) |
| `delegado` | Mesa de control de partidos (miguel) |
| `arbitro` | Árbitro — acta (pedro) |
| `jugador` | Jugador. Si `jugadores.es_capitan = 1` entonces UI lo trata como capitán. **NO es un rol separado.** |
| `publico` | Usuario público lector |

---

# 1. AUTH

Todos los endpoints bajo `/api/login`, `/api/logout`.

## 1.1 POST `/api/login`
Login de usuario. Flujo simple O flujo `select_profile` (cuando el usuario tiene múltiples roles).

**Request body**
```json
{
  "username": "ana@matchx.com",
  "password": "password",
  "selectedRole": "admin_torneo"
}
```
- `username` puede contener email o el nombre del usuario. El frontend también envía `email` como alias.
- `selectedRole` es opcional. Si se envía y el usuario tiene varios roles, el backend devuelve el perfil con ese rol.

**Response — login directo (HTTP 200)**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtb2NrIn0.mock_matchx",
  "user": {
    "id": 2,
    "username": "Ana",
    "email": "ana@matchx.com",
    "rol": "admin_torneo",
    "url_avatar": "https://...",
    "equipo_id": null,
    "es_capitan": 0
  }
}
```
- `equipo_id` y `es_capitan` solo para usuarios con `rol = jugador`.
- Esta respuesta **NO** usa el wrapper `{ data, status }`.

**Response — multi-perfil (HTTP 200)**
```json
{
  "status": "select_profile",
  "profiles": [
    { "rol": "admin_torneo", "label": "Administrar torneos" },
    { "rol": "admin_sede",   "label": "Administrar sede Chapinero" }
  ]
}
```
El frontend muestra un selector y repite el `POST /api/login` con `selectedRole`.

**Response — credenciales inválidas (HTTP 422)**
```json
{ "message": "Credenciales incorrectas. Verifica tu correo.", "errors": { "_general": ["Credenciales incorrectas. Verifica tu correo."] } }
```
> NO devolver 401 aquí — el interceptor del frontend hace logout automático en 401.

## 1.2 POST `/api/logout`
Revoca el token del usuario actual.

**Response (HTTP 200)**
```json
{ "message": "Sesión cerrada correctamente" }
```

## 1.3 GET `/api/user` (opcional)
Devuelve el usuario del token actual. El frontend NO lo mockea. Si el backend lo implementa, debe retornar el mismo objeto `user` que el login.

---

# 2. TORNEOS

Todos los endpoints bajo `/api/torneos/torneos`. BD subyacente: `torneos` (PK `id_torneos`).

## 2.1 GET `/api/torneos/torneos`
Lista todos los torneos con filtro opcional por estado.

**Query params**
| Param | Tipo | Valores |
|-------|------|---------|
| `estado` | string | `borrador`, `inscripciones_abiertas`, `en_curso`, `finalizado`, `cancelado` |

**Response 200** — `data` es array de Torneo:
```json
{
  "data": [
    {
      "id_torneos": 1,
      "nombre": "Copa Bogotá F5 2026",
      "edicion": "2026",
      "categoria": "Abierta",
      "descripcion": "Torneo relámpago de fútbol 5...",
      "reglamento": "",
      "modalidad_id": 1,
      "estado": "en_curso",
      "fecha_inicio": "2026-03-01",
      "fecha_fin": "2026-04-30",
      "fecha_limite_inscripcion": "2026-02-20",
      "inscripcion_publica": 1,
      "marcador_publico": 1,
      "valor_matricula": 150000,
      "valor_tarjeta_amarilla": 20000,
      "valor_tarjeta_roja": 50000,
      "multa_inasistencia": 100000,
      "valor_jugador_tardio": 30000,
      "amarillas_para_suspension": 3,
      "partidos_suspension_roja": 1,
      "min_jugadores": 5,
      "max_jugadores": 12,
      "max_equipos": 8,
      "admin_id": 2,
      "url_banner": "https://picsum.photos/seed/torneo1/400/200",
      "creado_en": "2026-02-01T00:00:00Z",
      "modalidad_codigo": "F5",
      "modalidad": "Fútbol 5",
      "administrador": "Ana",
      "equipos_inscritos": 6
    }
  ],
  "status": "ok"
}
```

**Campos derivados (JOIN)** que el backend debe calcular y adjuntar:
- `modalidad_codigo` — de `modalidades.codigo` vía `modalidad_id`
- `modalidad` — de `modalidades.nombre` vía `modalidad_id`
- `administrador` — `users.nombre` vía `admin_id`
- `equipos_inscritos` — `COUNT(*)` de `inscripciones` WHERE `torneo_id = ?` AND `estado = 'aprobada'`

## 2.2 GET `/api/torneos/torneos/:id`
Retorna un torneo con la misma estructura que 2.1.

## 2.3 POST `/api/torneos/torneos`
Crear torneo.

**Body**
```json
{
  "nombre": "Copa Bogotá F5 2026",
  "edicion": "2026",
  "categoria": "Abierta",
  "modalidad_id": 1,
  "fecha_inicio": "2026-03-01",
  "fecha_fin": "2026-04-30",
  "fecha_limite_inscripcion": "2026-02-20",
  "max_equipos": 8,
  "min_jugadores": 5,
  "max_jugadores": 12,
  "admin_id": 2,
  "descripcion": "...",
  "reglamento": "",
  "url_banner": "",
  "valor_matricula": 150000,
  "valor_tarjeta_amarilla": 20000,
  "valor_tarjeta_roja": 50000,
  "multa_inasistencia": 100000,
  "valor_jugador_tardio": 30000,
  "amarillas_para_suspension": 3,
  "partidos_suspension_roja": 1,
  "inscripcion_publica": 1,
  "marcador_publico": 1
}
```
**Response 201** — mismo shape que 2.1. `estado` default = `"borrador"`.

## 2.4 PUT `/api/torneos/torneos/:id`
Actualizar torneo. Body es `Partial<Torneo>` — el frontend puede enviar cualquier subconjunto de los campos de 2.3. **Response 200** = Torneo completo.

## 2.5 PUT `/api/torneos/torneos/:id/estado`
Cambiar estado del torneo.

**Body**
```json
{ "estado": "inscripciones_abiertas" }
```
Valores válidos: `borrador`, `inscripciones_abiertas`, `en_curso`, `finalizado`, `cancelado`. Si estado inválido → HTTP 422. **Response 200** = Torneo completo.

## 2.6 POST `/api/torneos/torneos/:id/sedes`
Asignar una sede al torneo (inserta en `torneo_sedes`).

**Body**
```json
{ "sede_id": 3 }
```
**Response 200**
```json
{ "data": { "message": "Sede asignada correctamente" }, "status": "ok" }
```

## 2.7 DELETE `/api/torneos/torneos/:id/sedes/:sedeId`
Remueve la relación `torneo_sedes`. **Response 200**:
```json
{ "data": { "message": "Sede removida correctamente" }, "status": "ok" }
```

## 2.8 GET `/api/torneos/torneos/:id/partidos`
Partidos del torneo. Mismo shape que §5.1.

## 2.9 GET `/api/torneos/torneos/:id/inscripciones`
Ver §10.1.

## 2.10 GET `/api/torneos/torneos/:id/goleadores?limite=10`
Top goleadores. Shape:
```json
{
  "data": [
    {
      "jugador_id": 4,
      "nombre": "Juan",
      "apellido": "Pérez",
      "equipo_id": 1,
      "equipo_nombre": "Águilas FC",
      "goles": 7,
      "partidos_jugados": 5
    }
  ],
  "status": "ok"
}
```

## 2.11 GET `/api/torneos/torneos/:id/fairplay`
Ranking de fair-play (equipos con menos tarjetas). Shape:
```json
{
  "data": [
    { "equipo_id": 1, "equipo_nombre": "Águilas FC", "amarillas": 3, "rojas": 0, "puntaje_fairplay": 94 }
  ],
  "status": "ok"
}
```

## 2.12 GET `/api/torneos/fases/:faseId/posiciones`
Tabla de posiciones de una fase. **Calculada dinámicamente** desde `partidos` finalizados (el backend debe hacer la agregación o mantener `tabla_posiciones` actualizada).

**Response 200**
```json
{
  "data": [
    {
      "id_tabla_posiciones": 1,
      "fase_id": 1,
      "grupo_id": null,
      "equipo_id": 1,
      "partidos_jugados": 5,
      "victorias": 4,
      "empates": 0,
      "derrotas": 1,
      "goles_favor": 12,
      "goles_contra": 4,
      "diferencia_goles": 8,
      "puntos": 12,
      "tarjetas_amarillas": 0,
      "tarjetas_rojas": 0
    }
  ],
  "status": "ok"
}
```
Orden: `puntos DESC, diferencia_goles DESC, goles_favor DESC`.

---

# 3. EQUIPOS

Todos los endpoints bajo `/api/torneos/equipos`. BD: `equipos` (PK `id_equipos`).

> **NOTA crítica**: `equipos` NO tiene `torneo_id`. La relación equipo ↔ torneo está en `inscripciones`. Al listar equipos en el contexto de un torneo, el backend debe hacer JOIN e incluir `torneo_id` del contexto.

## 3.1 GET `/api/torneos/equipos`
Listar equipos.

**Response 200** — `data` es array:
```json
{
  "data": [
    {
      "id_equipos": 1,
      "nombre": "Águilas FC",
      "nombre_corto": "ÁGUILA",
      "url_escudo": "https://...",
      "color_principal": "#1a56db",
      "color_secundario": "#ffffff",
      "color_terciario": "#000000",
      "color_cuaternario": "#000000",
      "capitan_id": 6,
      "activo": 1,
      "creado_en": "2026-02-10T00:00:00Z",
      "capitan_nombre": "Luis Peñaranda",
      "torneo_id": 1
    }
  ],
  "status": "ok"
}
```
Campos derivados:
- `capitan_nombre` — `users.nombre` vía `capitan_id`
- `torneo_id` — del JOIN con `inscripciones` cuando se consulta en contexto de torneo

## 3.2 GET `/api/torneos/equipos/:id`
Equipo individual — mismo shape que 3.1.

## 3.3 GET `/api/torneos/equipos/:equipoId/plantilla/:torneoId`
Plantilla del equipo para un torneo específico. JOIN `jugadores + plantilla + inscripciones`.

**Response 200**
```json
{
  "data": [
    {
      "id_jugadores": 4,
      "nombre": "David",
      "apellido": "Vargas",
      "url_foto": "https://...",
      "activo": 1,
      "equipo_id": 1,
      "numero_dorsal": 10,
      "posicion": "delantero",
      "es_capitan": 0,
      "estado": "activo"
    }
  ],
  "status": "ok"
}
```
- `numero_dorsal` y `posicion` vienen de `plantilla` (NO de `jugadores`).
- `estado` = estado del jugador en esa plantilla (`activo`, `suspendido`, `baja`).

## 3.4 POST `/api/torneos/equipos`
Crear equipo.

**Body**
```json
{
  "nombre": "Águilas FC",
  "nombre_corto": "ÁGUILA",
  "color_principal": "#1a56db",
  "color_secundario": "#ffffff",
  "color_terciario": "#000000",
  "color_cuaternario": "#000000",
  "url_escudo": "https://...",
  "capitan_id": 6
}
```
**Response 201** — mismo shape que 3.1. `activo` default = `1`.

## 3.5 PUT `/api/torneos/equipos/:id`
Actualizar. Body es `Partial<Equipo>`. **Response 200** = Equipo completo.

## 3.6 PUT `/api/torneos/equipos/:id/toggle`
Toggle `activo` (0 ↔ 1). **Response 200** = Equipo completo.

---

# 4. JUGADORES

Endpoints bajo `/api/torneos/jugadores`. BD: `jugadores` (PK `id_jugadores`). `numero_dorsal` y `posicion` viven en `plantilla`.

## 4.1 GET `/api/torneos/jugadores?nombre=`
Lista con búsqueda por nombre/apellido.

**Response 200**
```json
{
  "data": [
    {
      "id_jugadores": 4,
      "nombre": "David",
      "apellido": "Vargas",
      "tipo_documento": "CC",
      "numero_documento": "1023456789",
      "fecha_nacimiento": "1998-05-12",
      "telefono": "+573001234567",
      "correo": "david@ejemplo.com",
      "url_foto": "https://...",
      "activo": 1,
      "creado_en": "2026-02-10T00:00:00Z",
      "numero_dorsal": 10,
      "posicion": "delantero",
      "equipo_id": 1,
      "es_capitan": 0
    }
  ],
  "status": "ok"
}
```
`numero_dorsal`, `posicion`, `equipo_id`, `es_capitan` son derivados del JOIN con `plantilla + inscripciones` — solo presentes cuando el jugador tiene contexto de equipo.

## 4.2 GET `/api/torneos/jugadores/:id`
Un jugador. Mismo shape que 4.1.

## 4.3 GET `/api/torneos/jugadores/:id/torneos`
Torneos en los que ha participado el jugador.

**Response 200**
```json
{
  "data": [
    { "id_torneos": 1, "nombre": "Copa Bogotá F5 2026", "estado": "en_curso" }
  ],
  "status": "ok"
}
```

## 4.4 GET `/api/torneos/jugadores/:id/estadisticas/:torneoId`
Estadísticas del jugador en un torneo.

**Response 200**
```json
{
  "data": {
    "jugador_id": 4,
    "torneo_id": 1,
    "partidos_jugados": 5,
    "goles": 3,
    "asistencias": 2,
    "tarjetas_amarillas": 1,
    "tarjetas_rojas": 0,
    "minutos_jugados": 420
  },
  "status": "ok"
}
```

## 4.5 POST `/api/torneos/jugadores`
Crear jugador.

**Body**
```json
{
  "nombre": "David",
  "apellido": "Vargas",
  "tipo_documento": "CC",
  "numero_documento": "1023456789",
  "fecha_nacimiento": "1998-05-12",
  "telefono": "+573001234567",
  "correo": "david@ejemplo.com",
  "url_foto": "https://..."
}
```
**Response 201** = Jugador completo.

## 4.6 PUT `/api/torneos/jugadores/:id`
`Partial<Jugador>`. **Response 200** = Jugador.

## 4.7 PUT `/api/torneos/jugadores/:id/toggle`
Toggle `activo`. **Response 200** = Jugador.

---

# 5. PARTIDOS

Endpoints bajo `/api/torneos/partidos`. BD: `partidos` (PK `id_partidos`).

## 5.1 GET `/api/torneos/partidos`
Lista con filtros.

**Query params**
| Param | Tipo |
|-------|------|
| `arbitro_id` | number |
| `delegado_id` | number |
| `torneo_id` | number |
| `estado` | `programado`, `en_curso`, `finalizado`, `suspendido`, `aplazado`, `cancelado`, `walkover` |

**Response 200**
```json
{
  "data": [
    {
      "id_partidos": 1,
      "torneo_id": 1,
      "fase_id": 1,
      "grupo_id": null,
      "numero_jornada": 1,
      "equipo_local_id": 1,
      "equipo_visitante_id": 2,
      "sede_id": 1,
      "cancha_id": 102,
      "fecha_hora_programada": "2026-03-08T10:00:00Z",
      "fecha_hora_inicio": null,
      "fecha_hora_fin": null,
      "estado": "programado",
      "goles_local": 0,
      "goles_visitante": 0,
      "penaltis_local": null,
      "penaltis_visitante": null,
      "minutos_adicionales": 0,
      "arbitro_id": 5,
      "delegado_id": 4
    }
  ],
  "status": "ok"
}
```

## 5.2 GET `/api/torneos/partidos/proximos?limite=5`
Próximos partidos no finalizados, ordenados por fecha ascendente.

## 5.3 GET `/api/torneos/partidos/:id`
Mismo shape que 5.1.

## 5.4 POST `/api/torneos/partidos`
Crear.

**Body**
```json
{
  "torneo_id": 1,
  "fase_id": 1,
  "grupo_id": null,
  "equipo_local_id": 1,
  "equipo_visitante_id": 2,
  "sede_id": 1,
  "cancha_id": 102,
  "numero_jornada": 1,
  "fecha_hora_programada": "2026-03-08T10:00:00Z",
  "delegado_id": 4,
  "arbitro_id": 5
}
```
**Response 201** — Partido con `estado='programado'`, `goles_local=0`, `goles_visitante=0`.

## 5.5 PUT `/api/torneos/partidos/:id`
`Partial<Partido>`. **Response 200** = Partido.

## 5.6 PUT `/api/torneos/partidos/:id/iniciar`
Setea `estado = 'en_curso'` y `fecha_hora_inicio = now()`. Sin body. **Response 200** = Partido.

## 5.7 PUT `/api/torneos/partidos/:id/finalizar`
**Body**
```json
{
  "goles_local": 3,
  "goles_visitante": 1,
  "minutos_adicionales": 5
}
```
Setea `estado='finalizado'`, `fecha_hora_fin=now()`. **Response 200** = Partido.

## 5.8 PUT `/api/torneos/partidos/:id/estado`
**Body**: `{ "estado": "suspendido" }`. Estados válidos: ver 5.1. Inválido → 422. **Response 200** = Partido.

## 5.9 PUT `/api/torneos/partidos/:id/marcador`
Solo actualiza goles (sin cambiar estado).

**Body**
```json
{ "goles_local": 2, "goles_visitante": 1 }
```
**Response 200** = Partido.

## 5.10 GET `/api/torneos/partidos/:id/convocatoria`
Lista de convocados para un partido.

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "partido_id": 1,
      "jugador_id": 4,
      "equipo_id": 1,
      "numero_dorsal": 10,
      "posicion": "delantero",
      "es_titular": 1
    }
  ],
  "status": "ok"
}
```

## 5.11 POST `/api/torneos/partidos/:id/convocatoria`
**Body**
```json
{
  "jugador_id": 4,
  "equipo_id": 1,
  "numero_dorsal": 10,
  "posicion": "delantero",
  "es_titular": 1
}
```
**Response 201** = Convocatoria creada.

## 5.12 DELETE `/api/torneos/convocatoria/:id`
**Response 200** — `{ data: { message: "Eliminado correctamente" }, status: "ok" }`.

---

# 6. SEDES Y CANCHAS

> **Arquitectura**: Las sedes viven en el schema `match_access` (BD externa). Las canchas viven en `match_produccion`. El frontend usa `name` (no `nombre`) para el nombre de la sede, y mapea `estado → activo` del modelo interno.

## 6.1 GET `/api/torneos/sedes`
Lista de sedes SIN canchas incluidas.

**Response 200**
```json
{
  "data": [
    {
      "id_sedes": 1,
      "name": "Sede Norte",
      "nombre_comercial": "Sede Norte",
      "descripcion": "",
      "email": "norte@matchx.com",
      "web": "",
      "estado": 1,
      "ciudad": "Bogotá",
      "departamento": "Cundinamarca",
      "direccion": "Cra 15 #123-45",
      "capacidad": 500,
      "telefono": "+573001112222",
      "creado_en": "2026-01-01T00:00:00Z",
      "canchas": []
    }
  ],
  "status": "ok"
}
```

## 6.2 GET `/api/torneos/sedes/:id`
Sede individual **con `canchas` incluidas**.

**Response 200** — mismo shape que 6.1 pero con `canchas: [Cancha]`.

## 6.3 GET `/api/torneos/sedes/:id/canchas`
Solo las canchas de una sede.

**Response 200**
```json
{
  "data": [
    {
      "id_canchas": 102,
      "sede_id": 1,
      "nombre": "Cancha 1",
      "tipo_superficie": "sintetica",
      "largo_metros": 30,
      "ancho_metros": 20,
      "capacidad": 30,
      "activo": 1,
      "creado_en": "2026-01-01T00:00:00Z"
    }
  ],
  "status": "ok"
}
```

## 6.4 POST `/api/torneos/sedes`
**Body**
```json
{
  "nombre": "Sede Norte",
  "nombre_comercial": "Sede Norte Premium",
  "descripcion": "",
  "email": "norte@matchx.com",
  "web": "",
  "estado": 1,
  "direccion": "Cra 15 #123-45",
  "barrio": "Usaquén",
  "telefono": "+573001112222",
  "celular": "+573001112222",
  "ciudad": "Bogotá",
  "departamento": "Cundinamarca",
  "capacidad": 500
}
```
**Response 201** = Sede. (El campo `name` en la respuesta sale de `nombre` en el body.)

## 6.5 PUT `/api/torneos/sedes/:id`
`Partial<Sede>`. **Response 200** = Sede.

## 6.6 PUT `/api/torneos/sedes/:id/toggle`
Toggle `estado`. **Response 200** = Sede.

## 6.7 POST `/api/torneos/canchas`
Crear cancha (se asocia a una sede).

**Body**
```json
{
  "sede_id": 1,
  "nombre": "Cancha 1",
  "tipo_superficie": "sintetica",
  "largo_metros": 30,
  "ancho_metros": 20,
  "capacidad": 30
}
```
`tipo_superficie`: `"sintetica" | "natural" | "mixta" | "cemento"`. **Response 201** = Cancha.

## 6.8 PUT `/api/torneos/canchas/:id`
`Partial<Cancha>`. **Response 200** = Cancha.

## 6.9 PUT `/api/torneos/canchas/:id/toggle`
Toggle `activo`. **Response 200** = Cancha.

## 6.10 DELETE `/api/torneos/canchas/:id`
**Response 200** = `{ data: { message: "Cancha eliminada correctamente" }, status: "ok" }`.

---

# 7. MODALIDADES

Endpoints bajo `/api/torneos/modalidades`. BD: `modalidades` (PK `id_modalidades`).

> **Gap de BD**: la tabla `modalidades` actual NO tiene los campos `codigo` ni `descripcion`. **Hay que agregarlos** — ver `DATABASE_GAPS.md`.

## 7.1 GET `/api/torneos/modalidades`

**Response 200**
```json
{
  "data": [
    {
      "id_modalidades": 1,
      "nombre": "Fútbol 5",
      "codigo": "F5",
      "descripcion": "Modalidad rápida en cancha reducida",
      "jugadores_por_equipo": 5,
      "duracion_tiempo_minutos": 20,
      "numero_tiempos": 2,
      "max_cambios": 5,
      "activo": 1,
      "creado_en": "2026-01-01T00:00:00Z"
    }
  ],
  "status": "ok"
}
```

## 7.2 GET `/api/torneos/modalidades/:id` — idem.

## 7.3 POST `/api/torneos/modalidades`
**Body**
```json
{
  "nombre": "Fútbol 5",
  "codigo": "F5",
  "descripcion": "Modalidad rápida en cancha reducida",
  "jugadores_por_equipo": 5,
  "duracion_tiempo_minutos": 20,
  "numero_tiempos": 2,
  "max_cambios": 5
}
```
**Response 201** = Modalidad.

## 7.4 PUT `/api/torneos/modalidades/:id` — `Partial<Modalidad>`.
## 7.5 PUT `/api/torneos/modalidades/:id/toggle` — toggle `activo`.
## 7.6 DELETE `/api/torneos/modalidades/:id` — `{ data: { message: "Modalidad eliminada correctamente" }, status: "ok" }`.

---

# 8. USUARIOS

Endpoints bajo `/api/torneos/usuarios`. BD: tabla `users` de Laravel (schema `match_access`).

## 8.1 GET `/api/torneos/usuarios?rol=`

**Response 200**
```json
{
  "data": [
    {
      "id_users": 2,
      "username": "Ana",
      "email": "ana@matchx.com",
      "telefono": "+573009876543",
      "url_avatar": "https://...",
      "rol": "admin_torneo",
      "activated": 1,
      "ultimo_acceso": "2026-03-30T09:30:00Z",
      "creado_en": "2026-01-05T00:00:00Z"
    }
  ],
  "status": "ok"
}
```

## 8.2 GET `/api/torneos/usuarios/delegados`
Usuarios con `rol = 'delegado'`. Mismo shape.

## 8.3 GET `/api/torneos/usuarios/arbitros-disponibles`
Usuarios con `rol = 'arbitro'` AND `activated = 1`.

## 8.4 GET `/api/torneos/usuarios/:id` — idem shape.

## 8.5 POST `/api/torneos/usuarios`
**Body**
```json
{
  "nombre": "Ana",
  "correo": "ana@matchx.com",
  "contrasena": "password123",
  "rol": "admin_torneo"
}
```
Valores de `rol`: `superadmin | admin_torneo | admin_sede | delegado | arbitro | jugador | publico`. **Response 201** = Usuario.

## 8.6 PUT `/api/torneos/usuarios/:id` — `Partial<Usuario>`.

## 8.7 PUT `/api/torneos/usuarios/:id/password`
**Body**: `{ "nueva_contrasena": "..." }`. **Response 200**: `{ data: { message: "Contraseña actualizada correctamente" }, status: "ok" }`.

## 8.8 PUT `/api/torneos/usuarios/:id/toggle` — toggle `activated`.

---

# 9. EVENTOS DE PARTIDO

BD: `eventos_partido` (PK `id_eventos_partido`).

## 9.1 GET `/api/torneos/partidos/:id/eventos`
Eventos de un partido.

**Response 200**
```json
{
  "data": [
    {
      "id_eventos_partido": 1,
      "partido_id": 1,
      "tipo_evento": "gol",
      "minuto": 23,
      "minuto_adicional": null,
      "equipo_id": 1,
      "jugador_id": 4,
      "jugador_sale_id": null,
      "jugador_entra_id": null,
      "es_autogol": 0,
      "observaciones": null,
      "registrado_por": 5,
      "creado_en": "2026-03-08T10:23:00Z"
    }
  ],
  "status": "ok"
}
```

## 9.2 POST `/api/torneos/eventos`
Registrar un evento.

**Body**
```json
{
  "partido_id": 1,
  "tipo_evento": "gol",
  "minuto": 23,
  "equipo_id": 1,
  "jugador_id": 4,
  "es_autogol": 0,
  "jugador_sale_id": null,
  "jugador_entra_id": null,
  "observaciones": null,
  "registrado_por": 5
}
```
`tipo_evento` ∈ { `gol`, `tarjeta_amarilla`, `tarjeta_roja`, `doble_amarilla`, `cambio`, `lesion`, `penal_convertido`, `penal_fallado`, `var`, `observacion` }

**SIDE EFFECT crítico**: si `tipo_evento in ('gol', 'penal_convertido')` el backend debe:
- Si `equipo_id == partidos.equipo_local_id` y `es_autogol=0`, o `equipo_id != local` y `es_autogol=1` → `partidos.goles_local += 1`
- En caso contrario → `partidos.goles_visitante += 1`

**Response 201** = Evento creado.

## 9.3 DELETE `/api/torneos/eventos/:id`
Eliminar evento. **Response 200** = `{ data: { message: "Evento eliminado correctamente" }, status: "ok" }`.

> Al eliminar un gol, el backend DEBERÍA también decrementar el marcador del partido (el frontend NO lo hace — confía en el backend).

---

# 10. INSCRIPCIONES

Endpoints bajo `/api/torneos/inscripciones` y `/api/torneos/torneos/:id/inscripciones`.

## 10.1 GET `/api/torneos/torneos/:torneoId/inscripciones`
Inscripciones de un torneo.

**Response 200**
```json
{
  "data": [
    {
      "id_inscripciones": 1,
      "torneo_id": 1,
      "equipo_id": 1,
      "grupo_id": null,
      "estado": "aprobada",
      "fecha_inscripcion": "2026-02-15T00:00:00Z",
      "aprobado_por": "Ana",
      "fecha_aprobacion": "2026-02-16T00:00:00Z",
      "motivo_rechazo": null,
      "observaciones": null,
      "equipo": {
        "nombre": "Águilas FC",
        "nombre_corto": "ÁGUILA",
        "color_principal": "#1a56db",
        "color_secundario": "#ffffff",
        "url_escudo": "https://..."
      },
      "pago_estado": "pagado",
      "pago_metodo": "nequi",
      "pago_referencia": "NEQ-20260215-8473",
      "pago_fecha": "2026-02-15T14:32:00Z"
    }
  ],
  "status": "ok"
}
```
- `estado` ∈ { `pendiente`, `aprobada`, `rechazada` }
- `aprobado_por` es el **nombre** del admin (NO el id) — JOIN con `users`.
- `equipo` es un objeto anidado (JOIN con `equipos`). El frontend también soporta forma plana (`equipo_nombre`, `equipo_color_principal`…) pero el objeto anidado es preferido.
- `pago_metodo` ∈ { `nequi`, `daviplata`, `bancolombia`, `efectivo`, `transferencia` } | null
- `pago_estado` ∈ { `pendiente`, `pagado`, `condonado` }

## 10.2 POST `/api/torneos/inscripciones`
Crear inscripción.

**Body**
```json
{
  "torneo_id": 1,
  "equipo_id": 1,
  "observaciones": "Pendiente confirmación del capitán"
}
```
**Reglas**:
- Único `(torneo_id, equipo_id)`. Si ya existe → HTTP 422 `"El equipo ya está inscrito en este torneo"`.
- `estado` default = `"pendiente"`. Pago default = `"pendiente"`.

**Response 201** = Inscripción completa (shape de 10.1).

## 10.3 PUT `/api/torneos/inscripciones/:id/aprobar`
**Body**
```json
{ "admin_id": 2 }
```
Setea `estado='aprobada'`, `aprobado_por=admin_id`, `fecha_aprobacion=now()`. **Response 200** = Inscripción.

## 10.4 PUT `/api/torneos/inscripciones/:id/rechazar`
**Body**
```json
{ "motivo_rechazo": "Documentación incompleta" }
```
**Response 200** = Inscripción.

## 10.5 DELETE `/api/torneos/inscripciones/:id`
**Response 200** = `{ data: { message: "Inscripción eliminada correctamente" }, status: "ok" }`.

## 10.6 PUT `/api/torneos/inscripciones/:id/pago`
Registrar pago de matrícula.

**Body**
```json
{
  "pago_estado": "pagado",
  "pago_metodo": "nequi",
  "pago_referencia": "NEQ-20260215-8473",
  "pago_fecha": "2026-02-15T14:32:00Z"
}
```
`pago_fecha` es opcional — si no viene, el backend usa `now()`. **Response 200** = Inscripción completa.

---

# 11. SOLICITUDES DE JUGADORES

Endpoints bajo `/api/torneos/solicitudes`. **Tabla NO EXISTE aún** — ver `DATABASE_GAPS.md`.

Flujo: el capitán crea una solicitud de alta/baja/transferencia de jugador. El admin_torneo aprueba o rechaza. Al aprobar `alta_jugador`, se crea el jugador; al aprobar `baja_jugador`, se desactiva el jugador.

## 11.1 GET `/api/torneos/solicitudes`
**Query params**
| Param | Tipo |
|-------|------|
| `estado` | `pendiente | aprobado | rechazado` |
| `equipo_id` | number |

**Response 200** — ordenado: pendientes primero, luego por `created_at DESC`.
```json
{
  "data": [
    {
      "id": 1,
      "tipo": "alta_jugador",
      "equipo_id": 1,
      "equipo_nombre": "Águilas FC",
      "jugador_id": null,
      "jugador_nombre": null,
      "datos": {
        "nombre": "Rodrigo",
        "apellido": "Palomino",
        "numero_camiseta": 17,
        "posicion": "delantero",
        "tipo_documento": "CC",
        "numero_documento": "1098765432"
      },
      "estado": "pendiente",
      "solicitado_por": 6,
      "solicitado_por_nombre": "Luis Peñaranda",
      "revisado_por": null,
      "motivo_rechazo": null,
      "created_at": "2026-04-08T14:30:00Z",
      "updated_at": "2026-04-08T14:30:00Z"
    }
  ],
  "status": "ok"
}
```
- `tipo` ∈ { `alta_jugador`, `baja_jugador`, `transferencia`, `habilitacion_documento` }
- `datos` depende del `tipo`:
  - `alta_jugador` → `{ nombre, apellido, numero_camiseta, posicion, tipo_documento, numero_documento }`
  - `baja_jugador` → null (se usa `jugador_id`)
  - `transferencia` → `{ equipo_destino_id }`
  - `habilitacion_documento` → `{ url_documento, tipo_documento }`
- `estado` ∈ { `pendiente`, `aprobado`, `rechazado` }

## 11.2 POST `/api/torneos/solicitudes`
Crear solicitud (desde capitán).

**Body**
```json
{
  "tipo": "alta_jugador",
  "equipo_id": 1,
  "datos": { "nombre": "Rodrigo", "apellido": "Palomino", "numero_camiseta": 17, "posicion": "delantero", "tipo_documento": "CC", "numero_documento": "1098765432" },
  "jugador_id": null
}
```
**Response 201** = Solicitud completa. Backend debe resolver `equipo_nombre` (JOIN), `solicitado_por` (del JWT), `solicitado_por_nombre`.

## 11.3 PUT `/api/torneos/solicitudes/:id/aprobar`
Sin body. **Side effects**:
- `estado = 'aprobado'`, `revisado_por = <admin del JWT>`, `updated_at = now()`
- Si `tipo = 'alta_jugador'`: crear registro en `jugadores` con `datos.*`, luego crear registro en `plantilla` para vincular al equipo.
- Si `tipo = 'baja_jugador'`: `UPDATE jugadores SET activo=0 WHERE id=jugador_id`.
- Si `tipo = 'transferencia'`: mover plantilla de un equipo a otro.

Si la solicitud no está `pendiente` → HTTP 422 `"Esta solicitud ya fue procesada"`.

**Response 200** = Solicitud.

## 11.4 PUT `/api/torneos/solicitudes/:id/rechazar`
**Body**
```json
{ "motivo": "Documentos incompletos" }
```
Si no está `pendiente` → HTTP 422. **Response 200** = Solicitud.

---

# 12. COMUNICADOS

Endpoints bajo `/api/torneos/comunicados`. **Tabla NO EXISTE aún** — ver `DATABASE_GAPS.md`.

## 12.1 GET `/api/torneos/comunicados?torneo_id=&tipo=&activo=`
Lista.

**Query params**
| Param | Tipo |
|-------|------|
| `torneo_id` | number (filtra por torneo O comunicados globales con `torneo_id IS NULL`) |
| `tipo` | `general | urgente | informativo` |
| `activo` | `1` (default) o `0` para ver eliminados |

**Orden**: urgentes primero, luego `created_at DESC`.

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "titulo": "Bienvenidos al Torneo Apertura 2025",
      "cuerpo": "Estimados equipos, les damos la bienvenida...",
      "tipo": "general",
      "torneo_id": 1,
      "imagen_url": null,
      "creado_por": 2,
      "creado_por_nombre": "Ana",
      "activo": true,
      "created_at": "2025-01-10T09:00:00.000Z",
      "updated_at": "2025-01-10T09:00:00.000Z"
    }
  ],
  "status": "ok"
}
```

## 12.2 POST `/api/torneos/comunicados`
**Body**
```json
{
  "titulo": "Suspensión por lluvia",
  "cuerpo": "Texto completo...",
  "tipo": "urgente",
  "torneo_id": 1,
  "imagen_url": null
}
```
Backend setea `creado_por` (desde JWT), `creado_por_nombre` (JOIN), `activo=true`, `created_at`, `updated_at`.

**Response 201** = Comunicado completo.

## 12.3 PUT `/api/torneos/comunicados/:id`
`Partial<Comunicado>`. Solo campos editables: `titulo`, `cuerpo`, `tipo`, `imagen_url`, `activo`. **Response 200** = Comunicado.

## 12.4 DELETE `/api/torneos/comunicados/:id`
**Soft delete** — UPDATE `activo = false`, `updated_at = now()`. **Response 200**:
```json
{ "data": { "id": 1 }, "status": "ok" }
```

---

# 13. SANCIONES

Endpoints bajo `/api/torneos/sanciones`. BD: `sanciones` (PK `id_sanciones`).

## 13.1 GET `/api/torneos/sanciones`
**Query params**
| Param | Tipo |
|-------|------|
| `torneo_id` | number |
| `equipo_id` | number |
| `estado` | CSV: `activa,apelada,cumplida` |

**Orden**: activa/apelada antes de cumplida, luego `creado_en DESC`.

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "torneo_id": 1,
      "jugador_id": 4,
      "equipo_id": 1,
      "evento_id": 5,
      "tipo_sancion": "suspension",
      "partidos_sancion": 2,
      "valor_multa": 0,
      "estado": "activa",
      "motivo": "Tarjeta roja directa en jornada 3 por agresión",
      "creado_en": "2025-01-20T15:00:00Z"
    }
  ],
  "status": "ok"
}
```
- `tipo_sancion` ∈ { `suspension`, `multa`, `amonestacion` }
- `estado` ∈ { `activa`, `cumplida`, `apelada`, `revertida` }
- `evento_id` puede ser null (sanciones manuales).

## 13.2 PUT `/api/torneos/sanciones/:id`
**Body** — `Partial<Sancion>`, campos editables: `estado`, `partidos_sancion`, `motivo`.
```json
{ "estado": "revertida", "motivo": "Apelación aceptada" }
```
**Response 200** = Sanción.

---

# 14. PAGOS DE TARJETAS (por torneo)

Endpoints bajo `/api/torneos/:torneoId/pagos`. BD: `pagos` (PK `id_pagos`).

## 14.1 GET `/api/torneos/:torneoId/pagos?tipo=tarjeta_amarilla,tarjeta_roja`
Pagos de tarjetas del torneo.

**Query params**
| Param | Tipo |
|-------|------|
| `tipo` | CSV: `tarjeta_amarilla,tarjeta_roja,multa_inasistencia,matricula` |

**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "torneo_id": 1,
      "equipo_id": 1,
      "jugador_id": 2,
      "tipo_pago": "tarjeta_amarilla",
      "valor": 20000,
      "estado": "pendiente",
      "recibido_por": null,
      "metodo_pago": null,
      "numero_recibo": null,
      "creado_en": "2025-01-18T14:00:00Z",
      "pagado_en": null
    }
  ],
  "status": "ok"
}
```
- `estado` ∈ { `pendiente`, `pagado`, `condonado` }
- `tipo_pago` ∈ { `tarjeta_amarilla`, `tarjeta_roja`, `multa_inasistencia`, `matricula`, `otro` }

## 14.2 PUT `/api/torneos/:torneoId/pagos/:pagoId`
Confirmar o condonar pago.

**Body**
```json
{
  "estado": "pagado",
  "metodo_pago": "efectivo",
  "numero_recibo": "REC-007"
}
```
- Si `estado='pagado'` → backend setea `recibido_por = <admin JWT>`, `pagado_en = now()`.
- Si `estado='condonado'` → backend setea `recibido_por = <admin JWT>`.

**Response 200** = Pago.

---

# 15. MULTAS INTERNAS DE EQUIPO

Endpoints bajo `/api/equipos/:equipoId/multas`. **Tabla NO EXISTE aún** — ver `DATABASE_GAPS.md`.

## 15.1 GET `/api/equipos/:equipoId/multas`
**Response 200**
```json
{
  "data": [
    {
      "id": 1,
      "equipo_id": 1,
      "jugador_id": 2,
      "motivo": "Inasistencia al entrenamiento sin justificación",
      "valor": 30000,
      "estado": "pendiente",
      "creado_por": 5,
      "creado_en": "2025-01-21T08:00:00Z"
    }
  ],
  "status": "ok"
}
```
- `estado` ∈ { `pendiente`, `pagada`, `condonada` }

## 15.2 POST `/api/equipos/:equipoId/multas`
**Body**
```json
{
  "jugador_id": 2,
  "motivo": "Inasistencia al entrenamiento",
  "valor": 30000
}
```
Backend setea `estado="pendiente"`, `creado_por=<JWT>`, `creado_en=now()`. **Response 201** = Multa.

## 15.3 PUT `/api/equipos/:equipoId/multas/:id`
**Body**: `{ "estado": "pagada" }`. **Response 200** = Multa.

---

# 16. ASISTENCIAS A PARTIDOS

Endpoints bajo `/api/torneos/partidos/:partidoId/asistencia`. **Tabla NO EXISTE aún** — ver `DATABASE_GAPS.md`.

## 16.1 GET `/api/torneos/partidos/:partidoId/asistencia`
Lista de asistencias del partido.

**Response 200**
```json
{
  "data": [
    { "jugador_id": 4, "partido_id": 1, "estado": "confirmado" },
    { "jugador_id": 5, "partido_id": 1, "estado": "ausente" }
  ],
  "status": "ok"
}
```
- `estado` ∈ { `confirmado`, `ausente`, `no_habilitado`, `pendiente` }

## 16.2 PUT `/api/torneos/partidos/:partidoId/asistencia`
**Upsert** (por `partido_id + jugador_id`).

**Body**
```json
{ "jugador_id": 4, "estado": "confirmado" }
```
**Response 200** = registro de asistencia actualizado/creado.

---

# Apéndice A — Map de `normalize*` del frontend

El frontend transforma la respuesta del backend a su modelo interno. Los campos que el frontend **exige** (si faltan, rompe):

| Dominio | Campos mínimos del response | Campos derivados |
|---------|-----------------------------|------------------|
| Torneo | `id_torneos, nombre, estado, fecha_inicio, fecha_fin, modalidad_id, admin_id, valor_matricula, valor_tarjeta_amarilla, valor_tarjeta_roja` | `modalidad_codigo, modalidad, administrador, equipos_inscritos` |
| Equipo | `id_equipos, nombre, nombre_corto, color_principal, color_secundario, activo` | `capitan_nombre, torneo_id` (en contexto) |
| Jugador | `id_jugadores, nombre, apellido, activo` | `numero_dorsal, posicion, equipo_id, es_capitan` (en contexto de equipo) |
| Partido | `id_partidos, torneo_id, equipo_local_id, equipo_visitante_id, fecha_hora_programada, estado` | — |
| Sede | `id_sedes, name, ciudad, departamento, estado, canchas` | — |
| Cancha | `id_canchas, sede_id, nombre, activo` | — |
| Modalidad | `id_modalidades, nombre, jugadores_por_equipo, activo` | `codigo, descripcion` |
| Usuario | `id_users, username, email, rol, activated` | — |
| Inscripción | `id_inscripciones, torneo_id, equipo_id, estado` | `equipo{}, pago_estado, pago_metodo` |
| Solicitud | `id, tipo, equipo_id, estado` | `equipo_nombre, solicitado_por_nombre, jugador_nombre` |
| Comunicado | `id, titulo, cuerpo, tipo, torneo_id, activo, created_at` | `creado_por_nombre` |
| Sanción | `id, torneo_id, jugador_id, tipo_sancion, estado` | — |
| Pago | `id, torneo_id, equipo_id, jugador_id, tipo_pago, valor, estado` | — |
| Multa eq. | `id, equipo_id, jugador_id, motivo, valor, estado` | — |
| Asistencia | `jugador_id, partido_id, estado` | — |

---

# Apéndice B — Resumen de endpoints por método

## GET (42)
```
GET  /api/user
GET  /api/torneos/torneos                            ?estado=
GET  /api/torneos/torneos/:id
GET  /api/torneos/torneos/:id/partidos
GET  /api/torneos/torneos/:id/inscripciones
GET  /api/torneos/torneos/:id/goleadores             ?limite=
GET  /api/torneos/torneos/:id/fairplay
GET  /api/torneos/fases/:faseId/posiciones
GET  /api/torneos/equipos
GET  /api/torneos/equipos/:id
GET  /api/torneos/equipos/:equipoId/plantilla/:torneoId
GET  /api/torneos/jugadores                          ?nombre=
GET  /api/torneos/jugadores/:id
GET  /api/torneos/jugadores/:id/torneos
GET  /api/torneos/jugadores/:id/estadisticas/:torneoId
GET  /api/torneos/partidos                           ?arbitro_id=&delegado_id=&torneo_id=&estado=
GET  /api/torneos/partidos/proximos                  ?limite=
GET  /api/torneos/partidos/:id
GET  /api/torneos/partidos/:id/eventos
GET  /api/torneos/partidos/:id/convocatoria
GET  /api/torneos/partidos/:partidoId/asistencia
GET  /api/torneos/sedes
GET  /api/torneos/sedes/:id
GET  /api/torneos/sedes/:id/canchas
GET  /api/torneos/modalidades
GET  /api/torneos/modalidades/:id
GET  /api/torneos/usuarios                           ?rol=
GET  /api/torneos/usuarios/delegados
GET  /api/torneos/usuarios/arbitros-disponibles
GET  /api/torneos/usuarios/:id
GET  /api/torneos/solicitudes                        ?estado=&equipo_id=
GET  /api/torneos/comunicados                        ?torneo_id=&tipo=&activo=
GET  /api/torneos/sanciones                          ?torneo_id=&equipo_id=&estado=
GET  /api/torneos/:torneoId/pagos                    ?tipo=
GET  /api/equipos/:equipoId/multas
```

## POST (13)
```
POST /api/login
POST /api/logout
POST /api/torneos/torneos
POST /api/torneos/torneos/:id/sedes
POST /api/torneos/equipos
POST /api/torneos/jugadores
POST /api/torneos/partidos
POST /api/torneos/partidos/:id/convocatoria
POST /api/torneos/eventos
POST /api/torneos/sedes
POST /api/torneos/canchas
POST /api/torneos/modalidades
POST /api/torneos/usuarios
POST /api/torneos/inscripciones
POST /api/torneos/solicitudes
POST /api/torneos/comunicados
POST /api/equipos/:equipoId/multas
```

## PUT (28)
```
PUT  /api/torneos/torneos/:id
PUT  /api/torneos/torneos/:id/estado
PUT  /api/torneos/equipos/:id
PUT  /api/torneos/equipos/:id/toggle
PUT  /api/torneos/jugadores/:id
PUT  /api/torneos/jugadores/:id/toggle
PUT  /api/torneos/partidos/:id
PUT  /api/torneos/partidos/:id/iniciar
PUT  /api/torneos/partidos/:id/finalizar
PUT  /api/torneos/partidos/:id/estado
PUT  /api/torneos/partidos/:id/marcador
PUT  /api/torneos/partidos/:partidoId/asistencia
PUT  /api/torneos/sedes/:id
PUT  /api/torneos/sedes/:id/toggle
PUT  /api/torneos/canchas/:id
PUT  /api/torneos/canchas/:id/toggle
PUT  /api/torneos/modalidades/:id
PUT  /api/torneos/modalidades/:id/toggle
PUT  /api/torneos/usuarios/:id
PUT  /api/torneos/usuarios/:id/password
PUT  /api/torneos/usuarios/:id/toggle
PUT  /api/torneos/inscripciones/:id/aprobar
PUT  /api/torneos/inscripciones/:id/rechazar
PUT  /api/torneos/inscripciones/:id/pago
PUT  /api/torneos/solicitudes/:id/aprobar
PUT  /api/torneos/solicitudes/:id/rechazar
PUT  /api/torneos/comunicados/:id
PUT  /api/torneos/sanciones/:id
PUT  /api/torneos/:torneoId/pagos/:pagoId
PUT  /api/equipos/:equipoId/multas/:id
```

## DELETE (6)
```
DELETE /api/torneos/torneos/:id/sedes/:sedeId
DELETE /api/torneos/convocatoria/:id
DELETE /api/torneos/eventos/:id
DELETE /api/torneos/canchas/:id
DELETE /api/torneos/modalidades/:id
DELETE /api/torneos/inscripciones/:id
DELETE /api/torneos/comunicados/:id
```

---

**Última actualización**: 2026-04-17
**Fuente de verdad**: `src/mocks/handlers/*.ts` + `src/services/*.service.ts` del repo `matchx`.
