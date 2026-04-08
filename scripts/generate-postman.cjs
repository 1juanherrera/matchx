/**
 * Genera una colección de Postman desde los mocks de matchX.
 * Uso: node scripts/generate-postman.js
 * Output: docs/matchx-api.postman_collection.json
 */
const fs   = require('fs')
const path = require('path')

// Lee la base URL del .env
function getBaseUrl() {
  const envPath = path.resolve(__dirname, '../.env')
  const raw     = fs.readFileSync(envPath, 'utf8')
  const match   = raw.match(/VITE_API_BASE_URL=(.+)/)
  return match ? match[1].trim() : 'http://localhost:8082'
}

const BASE_URL = getBaseUrl()

// ──────────────────────────────────────────────
// Helpers para construir items de Postman
// ──────────────────────────────────────────────
function GET(name, path, description = '') {
  return item(name, 'GET', path, null, description)
}
function POST(name, path, body, description = '') {
  return item(name, 'POST', path, body, description)
}
function PUT(name, path, body, description = '') {
  return item(name, 'PUT', path, body, description)
}
function DELETE(name, path, description = '') {
  return item(name, 'DELETE', path, null, description)
}

function item(name, method, urlPath, body, description) {
  const entry = {
    name,
    request: {
      method,
      header: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{token}}', description: 'JWT del login' },
      ],
      url: {
        raw: `${BASE_URL}${urlPath}`,
        host: [BASE_URL],
        path: urlPath.replace(/^\//, '').split('/'),
      },
      description,
    },
    response: [],
  }
  if (body) {
    entry.request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    }
  }
  return entry
}

function folder(name, items, description = '') {
  return { name, description, item: items }
}

// ──────────────────────────────────────────────
// Colección completa
// ──────────────────────────────────────────────
const collection = {
  info: {
    name:        'matchX API',
    description: 'Contrato de API generado desde los mocks del frontend.\nTodos los endpoints están documentados con los campos exactos que el frontend espera.',
    schema:      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [
    { key: 'token',    value: '',  description: 'JWT obtenido del login' },
    { key: 'base_url', value: BASE_URL },
  ],
  item: [

    // ── AUTH ────────────────────────────────────────────────────────────────
    folder('Auth', [
      POST('Login directo', '/api/login',
        { username: 'carlos@matchx.com', password: '12345678' },
        'Retorna { token, user } o { status: "select_profile", profiles: [] }'
      ),
      POST('Login con perfil', '/api/login',
        { username: 'carlos@matchx.com', password: '12345678', selectedRole: 'superadmin' },
        'Paso 2 del flujo select_profile'
      ),
      GET('Usuario actual', '/api/user', 'Requiere token JWT'),
      POST('Logout', '/api/logout', {}, ''),
    ], 'Autenticación — login, logout, usuario actual'),

    // ── TORNEOS ─────────────────────────────────────────────────────────────
    folder('Torneos', [
      GET('Listar torneos', '/api/torneos/torneos',
        'Query: ?estado=borrador|inscripciones_abiertas|en_curso|finalizado|cancelado\nCampos requeridos: id_torneos, nombre, edicion, categoria, modalidad_id, modalidad_codigo, modalidad, admin_id, administrador, equipos_inscritos, estado, fecha_inicio, fecha_fin, fecha_limite_inscripcion, inscripcion_publica, marcador_publico, valor_matricula, valor_tarjeta_amarilla, valor_tarjeta_roja, multa_inasistencia, valor_jugador_tardio, amarillas_para_suspension, partidos_suspension_roja, min_jugadores, max_jugadores, max_equipos, url_banner, creado_en'
      ),
      GET('Obtener torneo', '/api/torneos/torneos/1', ''),
      POST('Crear torneo', '/api/torneos/torneos', {
        nombre: 'Copa Bogotá F5 2026', edicion: '2026', categoria: 'Abierta',
        modalidad_id: 1, fecha_inicio: '2026-03-01', fecha_fin: '2026-06-30',
        fecha_limite_inscripcion: '2026-02-28', max_equipos: 8,
        min_jugadores: 5, max_jugadores: 15, admin_id: 1,
        descripcion: 'Descripción del torneo', reglamento: '',
        valor_matricula: 500000, valor_tarjeta_amarilla: 50000,
        valor_tarjeta_roja: 100000, inscripcion_publica: 1, marcador_publico: 1,
      }),
      PUT('Actualizar torneo', '/api/torneos/torneos/1', {
        nombre: 'Copa Bogotá F5 2026 - Actualizado',
        max_equipos: 10,
      }),
      PUT('Cambiar estado torneo', '/api/torneos/torneos/1/estado',
        { estado: 'inscripciones_abiertas' },
        'estados: borrador | inscripciones_abiertas | en_curso | finalizado | cancelado'
      ),
      POST('Asignar sede a torneo', '/api/torneos/torneos/1/sedes', { sede_id: 1 }),
      DELETE('Quitar sede de torneo', '/api/torneos/torneos/1/sedes/1'),
      GET('Partidos del torneo', '/api/torneos/torneos/1/partidos', ''),
      GET('Inscripciones del torneo', '/api/torneos/torneos/1/inscripciones',
        'Ver carpeta Inscripciones para estructura de respuesta'
      ),
      GET('Goleadores del torneo', '/api/torneos/torneos/1/goleadores?limite=10', ''),
      GET('Fairplay del torneo', '/api/torneos/torneos/1/fairplay', ''),
      GET('Posiciones por fase', '/api/torneos/fases/1/posiciones', ''),
    ], 'CRUD torneos + cambio de estado + sedes asignadas'),

    // ── EQUIPOS ─────────────────────────────────────────────────────────────
    folder('Equipos', [
      GET('Listar equipos', '/api/torneos/equipos',
        'Campos: id_equipos, nombre, nombre_corto, url_escudo, color_principal, color_secundario, color_terciario, color_cuaternario, capitan_id, capitan_nombre (JOIN), torneo_id (contexto), activo, creado_en\nNOTA: equipos NO tiene torneo_id en BD — viene de inscripciones'
      ),
      GET('Obtener equipo', '/api/torneos/equipos/1', ''),
      GET('Plantilla en torneo', '/api/torneos/equipos/1/plantilla/1',
        'JOIN: jugadores + plantilla + inscripciones\nCampos por jugador: id_jugadores, nombre, apellido, url_foto, activo, equipo_id, numero_dorsal (de plantilla), posicion (de plantilla), es_capitan, estado'
      ),
      POST('Crear equipo', '/api/torneos/equipos', {
        nombre: 'Nuevo FC', nombre_corto: 'NFC',
        color_principal: '#1a56db', color_secundario: '#ffffff',
        color_terciario: '', color_cuaternario: '',
        url_escudo: 'https://...', capitan_id: null,
      }),
      PUT('Actualizar equipo', '/api/torneos/equipos/1', {
        nombre: 'Actualizado FC', nombre_corto: 'AFC',
      }),
      PUT('Toggle activo/inactivo', '/api/torneos/equipos/1/toggle', {}),
    ], 'CRUD equipos — sin torneo_id directo, usar inscripciones'),

    // ── JUGADORES ───────────────────────────────────────────────────────────
    folder('Jugadores', [
      GET('Listar jugadores', '/api/torneos/jugadores',
        'Query: ?nombre= (búsqueda)\nCampos: id_jugadores, nombre, apellido, tipo_documento, numero_documento, fecha_nacimiento, telefono, correo, url_foto, activo, creado_en\nNOTA: numero_dorsal y posicion están en tabla PLANTILLA, no en jugadores'
      ),
      GET('Buscar por nombre', '/api/torneos/jugadores?nombre=carlos', ''),
      GET('Obtener jugador', '/api/torneos/jugadores/1', ''),
      GET('Torneos del jugador', '/api/torneos/jugadores/1/torneos', ''),
      GET('Estadísticas en torneo', '/api/torneos/jugadores/1/estadisticas/1',
        'Campos: jugador_id, torneo_id, partidos_jugados, goles, asistencias, tarjetas_amarillas, tarjetas_rojas, minutos_jugados'
      ),
      POST('Crear jugador', '/api/torneos/jugadores', {
        nombre: 'Juan', apellido: 'García',
        tipo_documento: 'CC', numero_documento: '1234567890',
        fecha_nacimiento: '1995-05-15',
        telefono: '+573001234567', correo: 'juan@email.com',
      }),
      PUT('Actualizar jugador', '/api/torneos/jugadores/1', {
        telefono: '+573009999999',
      }),
      PUT('Toggle activo/inactivo', '/api/torneos/jugadores/1/toggle', {}),
    ], 'CRUD jugadores — perfil global, numero_dorsal/posicion van en plantilla'),

    // ── PARTIDOS ─────────────────────────────────────────────────────────────
    folder('Partidos', [
      GET('Próximos partidos', '/api/torneos/partidos/proximos?limite=5',
        'Campos: id_partidos, torneo_id, fase_id, grupo_id, numero_jornada, equipo_local_id, equipo_visitante_id, sede_id, cancha_id, fecha_hora_programada, estado, goles_local, goles_visitante, delegado_id, arbitro_id\nNOTA: el frontend mapea numero_jornada→jornada y fecha_hora_programada→fecha_hora en su normalize()'
      ),
      GET('Obtener partido', '/api/torneos/partidos/1', ''),
      POST('Crear partido', '/api/torneos/partidos', {
        torneo_id: 1, fase_id: 1, grupo_id: null, numero_jornada: 1,
        equipo_local_id: 1, equipo_visitante_id: 2,
        sede_id: 1, cancha_id: 101,
        fecha_hora_programada: '2026-05-10T15:00:00Z',
        delegado_id: 4, arbitro_id: 5,
      }),
      PUT('Actualizar partido', '/api/torneos/partidos/1', {
        fecha_hora_programada: '2026-05-10T16:00:00Z',
      }),
      PUT('Iniciar partido', '/api/torneos/partidos/1/iniciar', {}),
      PUT('Finalizar partido', '/api/torneos/partidos/1/finalizar', {
        goles_local: 2, goles_visitante: 1, minutos_adicionales: 3,
      }),
      PUT('Cambiar estado', '/api/torneos/partidos/1/estado', {
        estado: 'aplazado',
      }, 'estados: programado | en_curso | finalizado | aplazado | cancelado | walkover'),
      PUT('Actualizar marcador', '/api/torneos/partidos/1/marcador', {
        goles_local: 1, goles_visitante: 0,
      }),
      GET('Convocatoria del partido', '/api/torneos/partidos/1/convocatoria', ''),
      POST('Agregar a convocatoria', '/api/torneos/partidos/1/convocatoria', {
        jugador_id: 1, equipo_id: 1,
        numero_dorsal: 9, posicion: 'delantero', es_titular: 1,
      }),
      DELETE('Remover de convocatoria', '/api/torneos/convocatoria/1'),
    ], 'CRUD partidos — control de estado y marcador en tiempo real'),

    // ── SEDES ───────────────────────────────────────────────────────────────
    folder('Sedes & Canchas', [
      GET('Listar sedes', '/api/torneos/sedes',
        'BD separada. Campos: id_sedes, name (NO nombre), nombre_comercial, email, web, estado (0|1), ciudad, departamento, direccion, capacidad, telefono, creado_en, canchas: []\nNOTA: el frontend mapea name→nombre y estado→activo'
      ),
      GET('Obtener sede (con canchas)', '/api/torneos/sedes/1',
        'El GET por ID debe incluir el array "canchas" con todas las canchas de la sede'
      ),
      GET('Canchas de la sede', '/api/torneos/sedes/1/canchas',
        'Campos cancha: id_canchas, sede_id, nombre, tipo_superficie (sintetica|natural|cemento|otro), largo_metros, ancho_metros, capacidad, activo (0|1)\nNOTA: NO hay campo "disponible" en BD, solo "activo". El frontend lee activo===1 como disponible.'
      ),
      POST('Crear sede', '/api/torneos/sedes', {
        nombre: 'Estadio Norte', nombre_comercial: 'Estadio Norte',
        descripcion: '', email: 'norte@ejemplo.com', web: '',
        direccion: 'Calle 1 Norte', barrio: 'Norte', ciudad: 'Bogotá',
        departamento: 'Cundinamarca', telefono: '+5712345678',
        celular: '', estado: 1,
      }),
      PUT('Actualizar sede', '/api/torneos/sedes/1', {
        nombre: 'Estadio Norte Actualizado',
      }),
      PUT('Toggle sede activo/inactivo', '/api/torneos/sedes/1/toggle', {}),
      POST('Crear cancha', '/api/torneos/canchas', {
        sede_id: 1, nombre: 'Cancha 3',
        tipo_superficie: 'sintetica', largo_metros: 40, ancho_metros: 20,
        capacidad: 500,
      }),
      PUT('Actualizar cancha', '/api/torneos/canchas/101', {
        nombre: 'Cancha Principal Remodelada', tipo_superficie: 'natural',
      }),
      PUT('Toggle cancha activo/inactivo', '/api/torneos/canchas/101/toggle', {}),
      DELETE('Eliminar cancha', '/api/torneos/canchas/101'),
    ], 'CRUD sedes (BD separada) + canchas'),

    // ── MODALIDADES ─────────────────────────────────────────────────────────
    folder('Modalidades', [
      GET('Listar modalidades', '/api/torneos/modalidades',
        'Campos: id_modalidades, nombre, codigo*, descripcion*, jugadores_por_equipo, duracion_tiempo_minutos, numero_tiempos, max_cambios, activo, creado_en\n* IMPORTANTE: los campos "codigo" y "descripcion" NO existen aún en la tabla. Se recomienda agregarlos:\n  ALTER TABLE modalidades ADD codigo varchar(10) NOT NULL;\n  ALTER TABLE modalidades ADD descripcion text;'
      ),
      GET('Obtener modalidad', '/api/torneos/modalidades/1', ''),
      POST('Crear modalidad', '/api/torneos/modalidades', {
        nombre: 'Fútbol 8', codigo: 'F8',
        descripcion: 'Fútbol con 8 jugadores por equipo',
        jugadores_por_equipo: 8, duracion_tiempo_minutos: 40,
        numero_tiempos: 2, max_cambios: 5,
      }),
      PUT('Actualizar modalidad', '/api/torneos/modalidades/1', {
        max_cambios: 3,
      }),
      PUT('Toggle activo/inactivo', '/api/torneos/modalidades/1/toggle', {}),
      DELETE('Eliminar modalidad', '/api/torneos/modalidades/1'),
    ], 'CRUD modalidades — agregar campos codigo y descripcion a la tabla'),

    // ── USUARIOS ─────────────────────────────────────────────────────────────
    folder('Usuarios', [
      GET('Listar usuarios', '/api/torneos/usuarios',
        'Query: ?rol=superadmin|admin_torneo|admin_sede|delegado|arbitro|capitan|publico\nCampos: id_users, username, email, telefono, url_avatar, rol, activated (0|1), ultimo_acceso, creado_en'
      ),
      GET('Listar delegados', '/api/torneos/usuarios/delegados', ''),
      GET('Árbitros disponibles', '/api/torneos/usuarios/arbitros-disponibles', ''),
      GET('Obtener usuario', '/api/torneos/usuarios/1', ''),
      POST('Crear usuario', '/api/torneos/usuarios', {
        nombre: 'Nuevo Usuario', correo: 'nuevo@matchx.com',
        contrasena: 'password123', rol: 'arbitro',
      }),
      PUT('Actualizar usuario', '/api/torneos/usuarios/1', {
        telefono: '+573001111111',
      }),
      PUT('Cambiar contraseña', '/api/torneos/usuarios/1/password', {
        nueva_contrasena: 'nuevaPassword123',
      }),
      PUT('Toggle activo/inactivo', '/api/torneos/usuarios/1/toggle', {}),
    ], 'CRUD usuarios del sistema'),

    // ── EVENTOS ─────────────────────────────────────────────────────────────
    folder('Eventos de Partido', [
      GET('Eventos de un partido', '/api/torneos/partidos/1/eventos',
        'Campos: id_eventos_partido, partido_id, tipo_evento, minuto, minuto_adicional, equipo_id, jugador_id, jugador_sale_id, jugador_entra_id, es_autogol, observaciones, registrado_por, creado_en'
      ),
      POST('Registrar evento', '/api/torneos/eventos', {
        partido_id: 1,
        tipo_evento: 'gol',
        minuto: 35,
        equipo_id: 1,
        jugador_id: 3,
        es_autogol: 0,
        registrado_por: 4,
      }, 'tipos: gol | tarjeta_amarilla | tarjeta_roja | doble_amarilla | cambio | lesion | penal_convertido | penal_fallado | var | observacion\nIMPORTANTE: al registrar un gol, el backend debe actualizar goles_local o goles_visitante en la tabla partidos'),
      POST('Registrar cambio', '/api/torneos/eventos', {
        partido_id: 1, tipo_evento: 'cambio', minuto: 60,
        equipo_id: 1, jugador_sale_id: 2, jugador_entra_id: 10,
        registrado_por: 4,
      }),
      DELETE('Eliminar evento', '/api/torneos/eventos/1',
        'Al eliminar un gol, revertir el marcador en la tabla partidos'
      ),
    ], 'Eventos en tiempo real — goles, tarjetas, cambios'),

    // ── INSCRIPCIONES ────────────────────────────────────────────────────────
    folder('Inscripciones', [
      GET('Inscripciones de torneo', '/api/torneos/torneos/1/inscripciones',
        'JOIN con equipos. Campos: id_inscripciones, torneo_id, equipo_id, grupo_id, estado, fecha_inscripcion, aprobado_por (nombre), fecha_aprobacion, motivo_rechazo, observaciones\nObjeto equipo anidado: { nombre, nombre_corto, color_principal, color_secundario, url_escudo }'
      ),
      POST('Crear inscripción', '/api/torneos/inscripciones', {
        torneo_id: 1, equipo_id: 3,
        observaciones: 'Inscripción equipo visitante',
      }, 'UNIQUE KEY: un equipo solo puede inscribirse una vez por torneo'),
      PUT('Aprobar inscripción', '/api/torneos/inscripciones/1/aprobar', {
        admin_id: 1,
      }),
      PUT('Rechazar inscripción', '/api/torneos/inscripciones/1/rechazar', {
        motivo_rechazo: 'Documentación incompleta',
      }),
      DELETE('Eliminar inscripción', '/api/torneos/inscripciones/1'),
    ], 'Inscripción de equipos a torneos con flujo de aprobación'),

  ],
}

// ──────────────────────────────────────────────
// Escribir archivo
// ──────────────────────────────────────────────
const outDir  = path.resolve(__dirname, '../docs')
const outFile = path.join(outDir, 'matchx-api.postman_collection.json')

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(collection, null, 2), 'utf8')

console.log(`✓ Colección generada: ${outFile}`)
console.log(`  Endpoints: ${collection.item.reduce((acc, f) => acc + (f.item?.length ?? 0), 0)}`)
console.log(`  Importar en Postman: File → Import → seleccionar el archivo`)
