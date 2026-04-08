-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Servidor: db:3306
-- Tiempo de generación: 08-04-2026 a las 16:32:01
-- Versión del servidor: 8.0.45
-- Versión de PHP: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `match_produccion`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `arbitros`
--

CREATE TABLE `arbitros` (
  `id_arbitros` int NOT NULL,
  `usuario_id` int NOT NULL,
  `numero_documento` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_licencia` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Número de licencia de arbitraje',
  `vencimiento_licencia` date DEFAULT NULL COMMENT 'Fecha de vencimiento de la licencia',
  `honorario_partido` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Honorario estándar por partido',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perfil de árbitros registrados en el sistema';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `canchas`
--

CREATE TABLE `canchas` (
  `id_canchas` int NOT NULL,
  `sede_id` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_superficie` enum('sintetica','natural','cemento','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sintetica',
  `largo_metros` int NOT NULL,
  `ancho_metros` int NOT NULL,
  `capacidad` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Canchas disponibles dentro de cada sede';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `convocatoria`
--

CREATE TABLE `convocatoria` (
  `id_convocatoria` int NOT NULL,
  `partido_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `equipo_id` int NOT NULL,
  `numero_dorsal` tinyint DEFAULT NULL,
  `posicion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_titular` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1=titular, 0=suplente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Convocatoria y alineación de jugadores por partido';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `documentos_generados`
--

CREATE TABLE `documentos_generados` (
  `id_documentos_generados` int NOT NULL,
  `tipo_documento` enum('acta_partido','tabla_posiciones','certificado_campeon','certificado_subcampeon','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `torneo_id` int DEFAULT NULL,
  `partido_id` int DEFAULT NULL,
  `equipo_id` int DEFAULT NULL,
  `url_archivo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL del archivo generado (PDF, Excel, etc.)',
  `generado_por` int NOT NULL,
  `generado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de documentos generados (actas, certificados, tablas)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `equipos`
--

CREATE TABLE `equipos` (
  `id_equipos` int NOT NULL,
  `nombre` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_corto` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nombre corto o apodo del equipo',
  `url_escudo` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL del escudo o logo del equipo',
  `color_principal` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Color principal de la camiseta (hex)',
  `color_secundario` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Color secundario de la camiseta (hex)',
  `color_terciario` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color_cuaternario` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capitan_id` int DEFAULT NULL COMMENT 'Usuario capitán o representante del equipo',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Equipos del sistema (pueden participar en múltiples torneos)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `estadisticas_jugador`
--

CREATE TABLE `estadisticas_jugador` (
  `id_estadisticas_jugador` int NOT NULL,
  `torneo_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `equipo_id` int NOT NULL,
  `partidos_jugados` smallint NOT NULL DEFAULT '0',
  `goles` smallint NOT NULL DEFAULT '0',
  `asistencias` smallint NOT NULL DEFAULT '0',
  `tarjetas_amarillas` smallint NOT NULL DEFAULT '0',
  `tarjetas_rojas` smallint NOT NULL DEFAULT '0',
  `minutos_jugados` smallint NOT NULL DEFAULT '0',
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Estadísticas acumuladas por jugador en cada torneo (goleadores, asistencias, fairplay, etc.)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `eventos_partido`
--

CREATE TABLE `eventos_partido` (
  `id_eventos_partido` int NOT NULL,
  `partido_id` int NOT NULL,
  `tipo_evento` enum('gol','tarjeta_amarilla','tarjeta_roja','doble_amarilla','cambio','lesion','penal_convertido','penal_fallado','var','observacion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `minuto` tinyint DEFAULT NULL COMMENT 'Minuto del partido en que ocurrió',
  `minuto_adicional` tinyint DEFAULT NULL COMMENT 'Minuto del tiempo adicional (ej: 90+3)',
  `equipo_id` int NOT NULL COMMENT 'Equipo al que pertenece el evento',
  `jugador_id` int DEFAULT NULL COMMENT 'Jugador protagonista (gol, tarjeta, lesión)',
  `jugador_sale_id` int DEFAULT NULL COMMENT 'Jugador que sale en un cambio',
  `jugador_entra_id` int DEFAULT NULL COMMENT 'Jugador que entra en un cambio',
  `es_autogol` tinyint(1) NOT NULL DEFAULT '0',
  `observaciones` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registrado_por` int NOT NULL COMMENT 'Delegado que registró el evento',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Eventos del partido registrados en tiempo real por el delegado';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `fases_torneo`
--

CREATE TABLE `fases_torneo` (
  `id_fases_torneo` int NOT NULL,
  `torneo_id` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: Fase de Grupos, Octavos, Cuartos, Semifinal, Final',
  `tipo_fase` enum('grupos','eliminacion','eliminacion_ida_vuelta','todos_contra_todos') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` tinyint UNSIGNED NOT NULL COMMENT 'Orden de ejecución (1 = primera fase)',
  `estado` enum('pendiente','en_curso','finalizada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `criterios_desempate` json DEFAULT NULL COMMENT 'Array ordenado con criterios: puntos, dif_goles, goles_favor, tarjetas, etc.',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Fases de un torneo (soporta múltiples fases mixtas: grupos + eliminación, etc.)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupos`
--

CREATE TABLE `grupos` (
  `id_grupos` int NOT NULL,
  `fase_id` int NOT NULL,
  `nombre` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: Grupo A, Grupo B, Grupo Norte'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Grupos dentro de una fase de grupos';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inscripciones`
--

CREATE TABLE `inscripciones` (
  `id_inscripciones` int NOT NULL,
  `torneo_id` int NOT NULL,
  `equipo_id` int NOT NULL,
  `grupo_id` int DEFAULT NULL COMMENT 'Grupo asignado (si la fase tiene grupos)',
  `estado` enum('pendiente','aprobada','rechazada','retirada') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_inscripcion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `aprobado_por` int DEFAULT NULL COMMENT 'Administrador que aprobó o rechazó',
  `fecha_aprobacion` datetime DEFAULT NULL,
  `motivo_rechazo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Inscripción de equipos a torneos (soporta inscripción pública con aprobación del admin)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `jugadores`
--

CREATE TABLE `jugadores` (
  `id_jugadores` int NOT NULL,
  `usuario_id` int DEFAULT NULL COMMENT 'Vinculado a cuenta de usuario si tiene acceso al sistema',
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_documento` enum('CC','TI','CE','PAS','NIT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_documento` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `telefono` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_foto` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Perfil global de jugadores (independiente de equipos y torneos)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `modalidades`
--

CREATE TABLE `modalidades` (
  `id_modalidades` int NOT NULL,
  `nombre` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: Fútbol 11, Fútbol 5, Microfútbol, Fútbol 7',
  `jugadores_por_equipo` tinyint NOT NULL COMMENT 'Jugadores en cancha al mismo tiempo',
  `max_cambios` tinyint NOT NULL DEFAULT '5' COMMENT 'Cambios permitidos por partido',
  `duracion_tiempo_minutos` smallint NOT NULL DEFAULT '45' COMMENT 'Duración de cada tiempo en minutos',
  `numero_tiempos` tinyint NOT NULL DEFAULT '2' COMMENT 'Número de tiempos por partido',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Modalidades de fútbol soportadas por el sistema';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id_pagos` int NOT NULL,
  `torneo_id` int NOT NULL,
  `equipo_id` int DEFAULT NULL COMMENT 'Equipo deudor (matrículas, multas de equipo)',
  `jugador_id` int DEFAULT NULL COMMENT 'Jugador deudor (tarjetas, inscripción tardía)',
  `tipo_pago` enum('matricula','tarjeta_amarilla','tarjeta_roja','multa_inasistencia','jugador_tardio','otro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `referencia_id` int DEFAULT NULL COMMENT 'ID del registro relacionado (sanción, evento, partido)',
  `referencia_tipo` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nombre de la tabla relacionada',
  `valor` decimal(10,2) NOT NULL,
  `moneda` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'COP',
  `estado` enum('pendiente','pagado','condonado','devuelto') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_pago` datetime DEFAULT NULL,
  `recibido_por` int DEFAULT NULL COMMENT 'Admin que recibió el pago',
  `metodo_pago` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Efectivo, transferencia, PSE, Nequi, etc.',
  `numero_recibo` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Número de recibo o comprobante',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro completo de cobros y pagos (matrículas, tarjetas, multas, jugadores tardíos)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos_arbitros`
--

CREATE TABLE `pagos_arbitros` (
  `id_pagos_arbitros` int NOT NULL,
  `partido_id` int NOT NULL,
  `arbitro_id` int NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `estado` enum('pendiente','pagado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `fecha_pago` datetime DEFAULT NULL,
  `pagado_por` int DEFAULT NULL COMMENT 'Admin que realizó el pago',
  `observaciones` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de pagos realizados a árbitros por partido';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `partidos`
--

CREATE TABLE `partidos` (
  `id_partidos` int NOT NULL,
  `torneo_id` int NOT NULL,
  `fase_id` int NOT NULL,
  `grupo_id` int DEFAULT NULL COMMENT 'Grupo al que pertenece el partido (si aplica)',
  `numero_jornada` tinyint DEFAULT NULL COMMENT 'Número de jornada o ronda',
  `numero_encuentro` tinyint NOT NULL DEFAULT '1' COMMENT '1=partido único o ida, 2=vuelta',
  `partido_ida_id` int DEFAULT NULL COMMENT 'Referencia al partido de ida (para vuelta)',
  `equipo_local_id` int NOT NULL,
  `equipo_visitante_id` int NOT NULL,
  `sede_id` int NOT NULL,
  `cancha_id` int NOT NULL,
  `fecha_hora_programada` datetime NOT NULL COMMENT 'Fecha y hora programada del partido',
  `fecha_hora_inicio` datetime DEFAULT NULL COMMENT 'Hora real de inicio',
  `fecha_hora_fin` datetime DEFAULT NULL COMMENT 'Hora real de finalización',
  `estado` enum('programado','en_curso','finalizado','aplazado','cancelado','walkover') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'programado',
  `goles_local` tinyint NOT NULL DEFAULT '0',
  `goles_visitante` tinyint NOT NULL DEFAULT '0',
  `penaltis_local` tinyint DEFAULT NULL COMMENT 'Goles en penaltis (si aplica)',
  `penaltis_visitante` tinyint DEFAULT NULL,
  `minutos_adicionales` tinyint NOT NULL DEFAULT '0' COMMENT 'Minutos de tiempo añadido total',
  `arbitro_id` int DEFAULT NULL COMMENT 'Árbitro principal asignado',
  `delegado_id` int DEFAULT NULL COMMENT 'Delegado neutral que registra los eventos en vivo',
  `equipo_inasistente_id` int DEFAULT NULL COMMENT 'Equipo que no se presentó (causó el W.O.)',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Partidos con marcador, sede, cancha, árbitro y delegado asignado';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `plantilla`
--

CREATE TABLE `plantilla` (
  `id_plantilla` int NOT NULL,
  `inscripcion_id` int NOT NULL COMMENT 'Inscripción equipo-torneo a la que pertenece',
  `jugador_id` int NOT NULL,
  `numero_dorsal` tinyint DEFAULT NULL COMMENT 'Número de camiseta en este torneo (puede cambiar entre torneos)',
  `posicion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Portero, Defensa, Volante, Delantero, etc.',
  `es_capitan` tinyint(1) NOT NULL DEFAULT '0',
  `requiere_documento` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'El torneo exige verificación del documento',
  `documento_verificado` tinyint(1) NOT NULL DEFAULT '0',
  `inscripcion_tardia` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Inscripción fuera del plazo (aplica tarifa extra)',
  `estado` enum('activo','suspendido','bloqueado_deuda','inactivo','descalificado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activo',
  `fecha_ingreso` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Plantilla de jugadores por equipo en cada torneo (dorsal y estado específicos del torneo)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sanciones`
--

CREATE TABLE `sanciones` (
  `id_sanciones` int NOT NULL,
  `torneo_id` int NOT NULL,
  `jugador_id` int NOT NULL,
  `equipo_id` int NOT NULL,
  `evento_id` int DEFAULT NULL COMMENT 'Evento que originó la sanción (nulo si es manual)',
  `tipo_sancion` enum('suspension','multa','descalificacion','amonestacion') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `partidos_sancion` tinyint NOT NULL DEFAULT '0' COMMENT 'Número de partidos de suspensión',
  `valor_multa` decimal(10,2) NOT NULL DEFAULT '0.00',
  `motivo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `estado` enum('activa','apelada','anulada','cumplida') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activa',
  `argumentos_apelacion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Argumentos de la apelación',
  `resuelto_por` int DEFAULT NULL COMMENT 'Admin que resolvió la apelación',
  `fecha_resolucion` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Sanciones a jugadores (suspensiones, multas, descalificaciones). Soporta apelación.';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tabla_posiciones`
--

CREATE TABLE `tabla_posiciones` (
  `id_tabla_posiciones` int NOT NULL,
  `fase_id` int NOT NULL,
  `grupo_id` int DEFAULT NULL COMMENT 'Grupo específico (si la fase tiene grupos)',
  `equipo_id` int NOT NULL,
  `partidos_jugados` smallint NOT NULL DEFAULT '0',
  `victorias` smallint NOT NULL DEFAULT '0',
  `empates` smallint NOT NULL DEFAULT '0',
  `derrotas` smallint NOT NULL DEFAULT '0',
  `goles_favor` smallint NOT NULL DEFAULT '0',
  `goles_contra` smallint NOT NULL DEFAULT '0',
  `diferencia_goles` smallint NOT NULL DEFAULT '0',
  `puntos` smallint NOT NULL DEFAULT '0',
  `tarjetas_amarillas` smallint NOT NULL DEFAULT '0' COMMENT 'Para cálculo de fairplay',
  `tarjetas_rojas` smallint NOT NULL DEFAULT '0',
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabla de posiciones por fase/grupo (cache calculado a partir de los eventos del partido)';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `torneos`
--

CREATE TABLE `torneos` (
  `id_torneos` int NOT NULL,
  `nombre` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `edicion` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modalidad_id` int NOT NULL,
  `categoria` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Sub-12, Sub-15, Sub-17, Abierta, etc.',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `fecha_limite_inscripcion` date DEFAULT NULL COMMENT 'Fecha límite para inscripción de equipos',
  `estado` enum('borrador','inscripciones_abiertas','en_curso','finalizado','cancelado') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'borrador',
  `inscripcion_publica` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Permite inscripción pública de equipos',
  `marcador_publico` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Marcador visible al público en tiempo real',
  `valor_matricula` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Matrícula por equipo',
  `valor_tarjeta_amarilla` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valor_tarjeta_roja` decimal(10,2) NOT NULL DEFAULT '0.00',
  `multa_inasistencia` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Multa por no presentarse al partido',
  `valor_jugador_tardio` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Costo inscripción jugador fuera de plazo',
  `amarillas_para_suspension` tinyint NOT NULL DEFAULT '3' COMMENT 'N° amarillas acumuladas que generan suspensión',
  `partidos_suspension_roja` tinyint NOT NULL DEFAULT '1' COMMENT 'Partidos de suspensión por tarjeta roja directa',
  `max_equipos` int NOT NULL,
  `min_jugadores` tinyint NOT NULL DEFAULT '1',
  `max_jugadores` tinyint NOT NULL DEFAULT '25',
  `admin_id` int NOT NULL COMMENT 'Administrador responsable del torneo',
  `url_banner` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reglamento` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Torneos del sistema con su configuración completa de reglas y tarifas';

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `torneo_sedes`
--

CREATE TABLE `torneo_sedes` (
  `id_torneo_sedes` int NOT NULL,
  `torneo_id` int NOT NULL,
  `sede_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Relación: un torneo puede jugarse en varias sedes simultáneamente';

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `arbitros`
--
ALTER TABLE `arbitros`
  ADD PRIMARY KEY (`id_arbitros`),
  ADD KEY `fk_arbitro_usuario_idx` (`usuario_id`);

--
-- Indices de la tabla `canchas`
--
ALTER TABLE `canchas`
  ADD PRIMARY KEY (`id_canchas`),
  ADD KEY `fk_cancha_sede_idx` (`sede_id`);

--
-- Indices de la tabla `convocatoria`
--
ALTER TABLE `convocatoria`
  ADD PRIMARY KEY (`id_convocatoria`),
  ADD UNIQUE KEY `uk_convocatoria` (`partido_id`,`jugador_id`),
  ADD KEY `fk_conv_jugador` (`jugador_id`),
  ADD KEY `fk_conv_equipo` (`equipo_id`);

--
-- Indices de la tabla `documentos_generados`
--
ALTER TABLE `documentos_generados`
  ADD PRIMARY KEY (`id_documentos_generados`),
  ADD KEY `fk_doc_torneo` (`torneo_id`),
  ADD KEY `fk_doc_partido` (`partido_id`),
  ADD KEY `fk_doc_equipo` (`equipo_id`),
  ADD KEY `fk_doc_generador_idx` (`generado_por`);

--
-- Indices de la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD PRIMARY KEY (`id_equipos`),
  ADD KEY `fk_equipos_equipo_capitan_idx` (`capitan_id`);

--
-- Indices de la tabla `estadisticas_jugador`
--
ALTER TABLE `estadisticas_jugador`
  ADD PRIMARY KEY (`id_estadisticas_jugador`),
  ADD UNIQUE KEY `uk_estadistica` (`torneo_id`,`jugador_id`,`equipo_id`),
  ADD KEY `fk_est_jugador` (`jugador_id`),
  ADD KEY `fk_est_equipo` (`equipo_id`);

--
-- Indices de la tabla `eventos_partido`
--
ALTER TABLE `eventos_partido`
  ADD PRIMARY KEY (`id_eventos_partido`),
  ADD KEY `fk_evento_partido` (`partido_id`),
  ADD KEY `fk_evento_equipo` (`equipo_id`),
  ADD KEY `fk_evento_jugador` (`jugador_id`),
  ADD KEY `fk_evento_registrador_idx` (`registrado_por`);

--
-- Indices de la tabla `fases_torneo`
--
ALTER TABLE `fases_torneo`
  ADD PRIMARY KEY (`id_fases_torneo`),
  ADD KEY `fk_fase_torneo` (`torneo_id`);

--
-- Indices de la tabla `grupos`
--
ALTER TABLE `grupos`
  ADD PRIMARY KEY (`id_grupos`),
  ADD KEY `fk_grupo_fase` (`fase_id`);

--
-- Indices de la tabla `inscripciones`
--
ALTER TABLE `inscripciones`
  ADD PRIMARY KEY (`id_inscripciones`),
  ADD UNIQUE KEY `uk_torneo_equipo` (`torneo_id`,`equipo_id`),
  ADD KEY `fk_ins_equipo` (`equipo_id`),
  ADD KEY `fk_ins_grupo` (`grupo_id`),
  ADD KEY `fk_ins_aprobador_idx` (`aprobado_por`);

--
-- Indices de la tabla `jugadores`
--
ALTER TABLE `jugadores`
  ADD PRIMARY KEY (`id_jugadores`),
  ADD UNIQUE KEY `uk_documento` (`tipo_documento`,`numero_documento`),
  ADD KEY `idx_nombre` (`apellido`,`nombre`),
  ADD KEY `fk_jugadores_jugador_usuario_idx` (`usuario_id`);

--
-- Indices de la tabla `modalidades`
--
ALTER TABLE `modalidades`
  ADD PRIMARY KEY (`id_modalidades`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id_pagos`),
  ADD KEY `fk_pago_torneo` (`torneo_id`),
  ADD KEY `fk_pago_equipo` (`equipo_id`),
  ADD KEY `fk_pago_jugador` (`jugador_id`),
  ADD KEY `idx_pago_estado` (`estado`),
  ADD KEY `fk_pago_recibido_idx` (`recibido_por`);

--
-- Indices de la tabla `pagos_arbitros`
--
ALTER TABLE `pagos_arbitros`
  ADD PRIMARY KEY (`id_pagos_arbitros`),
  ADD UNIQUE KEY `uk_arbitro_partido` (`partido_id`,`arbitro_id`),
  ADD KEY `fk_pa_arbitro` (`arbitro_id`),
  ADD KEY `fk_pa_pagador_idx` (`pagado_por`);

--
-- Indices de la tabla `partidos`
--
ALTER TABLE `partidos`
  ADD PRIMARY KEY (`id_partidos`),
  ADD KEY `fk_partido_torneo` (`torneo_id`),
  ADD KEY `fk_partido_fase` (`fase_id`),
  ADD KEY `fk_partido_grupo` (`grupo_id`),
  ADD KEY `fk_partido_local` (`equipo_local_id`),
  ADD KEY `fk_partido_visitante` (`equipo_visitante_id`),
  ADD KEY `fk_partido_cancha` (`cancha_id`),
  ADD KEY `fk_partido_arbitro` (`arbitro_id`),
  ADD KEY `fk_partido_ida` (`partido_ida_id`),
  ADD KEY `idx_cancha_horario` (`cancha_id`,`fecha_hora_programada`) COMMENT '''\\''Para validar conflictos de horario en cancha\\''''',
  ADD KEY `fk_partido_delegado_idx` (`delegado_id`),
  ADD KEY `fk_partido_sede_idx` (`sede_id`);

--
-- Indices de la tabla `plantilla`
--
ALTER TABLE `plantilla`
  ADD PRIMARY KEY (`id_plantilla`),
  ADD UNIQUE KEY `uk_jugador_inscripcion` (`inscripcion_id`,`jugador_id`),
  ADD KEY `fk_plantilla_jugador` (`jugador_id`);

--
-- Indices de la tabla `sanciones`
--
ALTER TABLE `sanciones`
  ADD PRIMARY KEY (`id_sanciones`),
  ADD KEY `fk_sancion_torneo` (`torneo_id`),
  ADD KEY `fk_sancion_jugador` (`jugador_id`),
  ADD KEY `fk_sancion_equipo` (`equipo_id`),
  ADD KEY `fk_sancion_evento` (`evento_id`),
  ADD KEY `fk_sancion_resuelto_idx` (`resuelto_por`);

--
-- Indices de la tabla `tabla_posiciones`
--
ALTER TABLE `tabla_posiciones`
  ADD PRIMARY KEY (`id_tabla_posiciones`),
  ADD UNIQUE KEY `uk_posicion` (`fase_id`,`equipo_id`),
  ADD KEY `fk_pos_grupo` (`grupo_id`),
  ADD KEY `fk_pos_equipo` (`equipo_id`);

--
-- Indices de la tabla `torneos`
--
ALTER TABLE `torneos`
  ADD PRIMARY KEY (`id_torneos`),
  ADD KEY `fk_torneo_modalidad` (`modalidad_id`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `fk_torneo_admin_idx` (`admin_id`);

--
-- Indices de la tabla `torneo_sedes`
--
ALTER TABLE `torneo_sedes`
  ADD PRIMARY KEY (`id_torneo_sedes`),
  ADD UNIQUE KEY `uk_torneo_sede` (`torneo_id`,`sede_id`),
  ADD KEY `fk_ts_sede_idx` (`sede_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `arbitros`
--
ALTER TABLE `arbitros`
  MODIFY `id_arbitros` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `canchas`
--
ALTER TABLE `canchas`
  MODIFY `id_canchas` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `convocatoria`
--
ALTER TABLE `convocatoria`
  MODIFY `id_convocatoria` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `documentos_generados`
--
ALTER TABLE `documentos_generados`
  MODIFY `id_documentos_generados` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `equipos`
--
ALTER TABLE `equipos`
  MODIFY `id_equipos` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `estadisticas_jugador`
--
ALTER TABLE `estadisticas_jugador`
  MODIFY `id_estadisticas_jugador` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `eventos_partido`
--
ALTER TABLE `eventos_partido`
  MODIFY `id_eventos_partido` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `fases_torneo`
--
ALTER TABLE `fases_torneo`
  MODIFY `id_fases_torneo` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `grupos`
--
ALTER TABLE `grupos`
  MODIFY `id_grupos` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `inscripciones`
--
ALTER TABLE `inscripciones`
  MODIFY `id_inscripciones` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `jugadores`
--
ALTER TABLE `jugadores`
  MODIFY `id_jugadores` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `modalidades`
--
ALTER TABLE `modalidades`
  MODIFY `id_modalidades` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id_pagos` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pagos_arbitros`
--
ALTER TABLE `pagos_arbitros`
  MODIFY `id_pagos_arbitros` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `partidos`
--
ALTER TABLE `partidos`
  MODIFY `id_partidos` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `plantilla`
--
ALTER TABLE `plantilla`
  MODIFY `id_plantilla` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sanciones`
--
ALTER TABLE `sanciones`
  MODIFY `id_sanciones` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tabla_posiciones`
--
ALTER TABLE `tabla_posiciones`
  MODIFY `id_tabla_posiciones` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `torneos`
--
ALTER TABLE `torneos`
  MODIFY `id_torneos` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `torneo_sedes`
--
ALTER TABLE `torneo_sedes`
  MODIFY `id_torneo_sedes` int NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `arbitros`
--
ALTER TABLE `arbitros`
  ADD CONSTRAINT `fk_arbitro_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `canchas`
--
ALTER TABLE `canchas`
  ADD CONSTRAINT `fk_cancha_sede` FOREIGN KEY (`sede_id`) REFERENCES `match_access`.`sedes` (`id_sedes`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `convocatoria`
--
ALTER TABLE `convocatoria`
  ADD CONSTRAINT `fk_conv_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_conv_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_conv_partido` FOREIGN KEY (`partido_id`) REFERENCES `partidos` (`id_partidos`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `documentos_generados`
--
ALTER TABLE `documentos_generados`
  ADD CONSTRAINT `fk_doc_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doc_generador` FOREIGN KEY (`generado_por`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doc_partido` FOREIGN KEY (`partido_id`) REFERENCES `partidos` (`id_partidos`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_doc_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `equipos`
--
ALTER TABLE `equipos`
  ADD CONSTRAINT `fk_equipos_equipo_capitan` FOREIGN KEY (`capitan_id`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `estadisticas_jugador`
--
ALTER TABLE `estadisticas_jugador`
  ADD CONSTRAINT `fk_est_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_est_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_est_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `eventos_partido`
--
ALTER TABLE `eventos_partido`
  ADD CONSTRAINT `fk_evento_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_evento_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_evento_partido` FOREIGN KEY (`partido_id`) REFERENCES `partidos` (`id_partidos`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_evento_registrador` FOREIGN KEY (`registrado_por`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `fases_torneo`
--
ALTER TABLE `fases_torneo`
  ADD CONSTRAINT `fk_fase_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `grupos`
--
ALTER TABLE `grupos`
  ADD CONSTRAINT `fk_grupo_fase` FOREIGN KEY (`fase_id`) REFERENCES `fases_torneo` (`id_fases_torneo`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `inscripciones`
--
ALTER TABLE `inscripciones`
  ADD CONSTRAINT `fk_ins_aprobador` FOREIGN KEY (`aprobado_por`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ins_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ins_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id_grupos`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ins_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `jugadores`
--
ALTER TABLE `jugadores`
  ADD CONSTRAINT `fk_jugadores_jugador_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `fk_pago_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pago_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pago_recibido` FOREIGN KEY (`recibido_por`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pago_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `pagos_arbitros`
--
ALTER TABLE `pagos_arbitros`
  ADD CONSTRAINT `fk_pa_arbitro` FOREIGN KEY (`arbitro_id`) REFERENCES `arbitros` (`id_arbitros`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pa_pagador` FOREIGN KEY (`pagado_por`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pa_partido` FOREIGN KEY (`partido_id`) REFERENCES `partidos` (`id_partidos`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `partidos`
--
ALTER TABLE `partidos`
  ADD CONSTRAINT `fk_partido_arbitro` FOREIGN KEY (`arbitro_id`) REFERENCES `arbitros` (`id_arbitros`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_cancha` FOREIGN KEY (`cancha_id`) REFERENCES `canchas` (`id_canchas`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_delegado` FOREIGN KEY (`delegado_id`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_fase` FOREIGN KEY (`fase_id`) REFERENCES `fases_torneo` (`id_fases_torneo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id_grupos`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_ida` FOREIGN KEY (`partido_ida_id`) REFERENCES `partidos` (`id_partidos`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_local` FOREIGN KEY (`equipo_local_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_sede` FOREIGN KEY (`sede_id`) REFERENCES `match_access`.`sedes` (`id_sedes`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_partido_visitante` FOREIGN KEY (`equipo_visitante_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `plantilla`
--
ALTER TABLE `plantilla`
  ADD CONSTRAINT `fk_plantilla_inscripcion` FOREIGN KEY (`inscripcion_id`) REFERENCES `inscripciones` (`id_inscripciones`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_plantilla_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `sanciones`
--
ALTER TABLE `sanciones`
  ADD CONSTRAINT `fk_sancion_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sancion_evento` FOREIGN KEY (`evento_id`) REFERENCES `eventos_partido` (`id_eventos_partido`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sancion_jugador` FOREIGN KEY (`jugador_id`) REFERENCES `jugadores` (`id_jugadores`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sancion_resuelto` FOREIGN KEY (`resuelto_por`) REFERENCES `match_access`.`users` (`id_users`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sancion_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Filtros para la tabla `tabla_posiciones`
--
ALTER TABLE `tabla_posiciones`
  ADD CONSTRAINT `fk_pos_equipo` FOREIGN KEY (`equipo_id`) REFERENCES `equipos` (`id_equipos`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pos_fase` FOREIGN KEY (`fase_id`) REFERENCES `fases_torneo` (`id_fases_torneo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_pos_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos` (`id_grupos`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Filtros para la tabla `torneos`
--
ALTER TABLE `torneos`
  ADD CONSTRAINT `fk_torneo_admin` FOREIGN KEY (`admin_id`) REFERENCES `match_access`.`users` (`id_users`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_torneo_modalidad` FOREIGN KEY (`modalidad_id`) REFERENCES `modalidades` (`id_modalidades`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `torneo_sedes`
--
ALTER TABLE `torneo_sedes`
  ADD CONSTRAINT `fk_ts_sede` FOREIGN KEY (`sede_id`) REFERENCES `match_access`.`sedes` (`id_sedes`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ts_torneo` FOREIGN KEY (`torneo_id`) REFERENCES `torneos` (`id_torneos`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
