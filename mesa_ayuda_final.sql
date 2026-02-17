-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 17-02-2026 a las 01:40:20
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `mesa_ayuda_final`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_estadisticas_generales` ()   BEGIN
    SELECT 
        COUNT(*) AS total_tickets,
        SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) AS abiertos,
        SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) AS cerrados,
        SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) AS resueltos,
        SUM(CASE WHEN prioridad = 'alta' OR prioridad = 'critica' THEN 1 ELSE 0 END) AS alta_prioridad,
        AVG(DATEDIFF(IFNULL(fecha_cierre, NOW()), fecha_creacion)) AS tiempo_promedio_resolucion
    FROM tickets;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignaciones_tickets`
--

CREATE TABLE `asignaciones_tickets` (
  `id` int(11) NOT NULL,
  `id_ticket` int(11) NOT NULL,
  `id_usuario_asignado` int(11) NOT NULL,
  `id_usuario_asigna` int(11) NOT NULL,
  `fecha_asignacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `activo` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `descripcion`, `activo`, `orden`) VALUES
(1, 'Hardware', 'Problemas relacionados con equipos físicos', 1, 1),
(2, 'Software', 'Problemas de aplicaciones y sistemas operativos', 1, 2),
(3, 'Red', 'Problemas de conectividad y red', 1, 3),
(4, 'Accesos', 'Permisos y credenciales', 1, 4),
(5, 'Soporte', 'Consultas generales y soporte', 1, 5),
(6, 'Incidentes', 'Reportes de incidentes', 1, 6),
(7, 'Otro', 'Otras categorías', 1, 99);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion`
--

CREATE TABLE `configuracion` (
  `id` int(11) NOT NULL,
  `clave` varchar(100) NOT NULL,
  `valor` text DEFAULT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `tipo` enum('string','number','boolean','json') DEFAULT 'string',
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion`
--

INSERT INTO `configuracion` (`id`, `clave`, `valor`, `descripcion`, `tipo`, `actualizado_en`) VALUES
(1, 'sistema_nombre', 'Mesa de Ayuda', 'Nombre del sistema', 'string', '2026-02-17 00:28:31'),
(2, 'tickets_por_pagina', '10', 'Cantidad de tickets por página', 'number', '2026-02-17 00:28:31'),
(3, 'tiempo_sesion', '1800', 'Tiempo de sesión en segundos', 'number', '2026-02-17 00:28:31'),
(4, 'permitir_registro', 'true', 'Permitir auto-registro de usuarios', 'boolean', '2026-02-17 00:28:31'),
(5, 'max_tamaño_archivo', '5242880', 'Tamaño máximo archivo en bytes (5MB)', 'number', '2026-02-17 00:28:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_login`
--

CREATE TABLE `historial_login` (
  `id` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `usuario` varchar(50) NOT NULL,
  `exitoso` tinyint(1) NOT NULL COMMENT '1=Éxito, 0=Fallo',
  `ip_address` varchar(45) NOT NULL,
  `user_agent` text DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `historial_login`
--

INSERT INTO `historial_login` (`id`, `id_usuario`, `usuario`, `exitoso`, `ip_address`, `user_agent`, `fecha`) VALUES
(1, NULL, 'mmoreno', 0, '::1', NULL, '2026-02-17 00:29:11'),
(2, NULL, 'mmoreno', 0, '::1', NULL, '2026-02-17 00:29:15'),
(3, NULL, 'admin', 0, '::1', NULL, '2026-02-17 00:30:27'),
(4, NULL, 'admin', 0, '::1', NULL, '2026-02-17 00:30:42'),
(5, 2, 'mmoreno', 1, '::1', NULL, '2026-02-17 00:31:28');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_tickets`
--

CREATE TABLE `historial_tickets` (
  `id` int(11) NOT NULL,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL COMMENT 'Usuario que realizó el cambio',
  `accion` varchar(100) NOT NULL COMMENT 'Ej: cambio_estado, asignacion, etc.',
  `valor_anterior` varchar(255) DEFAULT NULL,
  `valor_nuevo` varchar(255) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mensajes_ticket`
--

CREATE TABLE `mensajes_ticket` (
  `id` int(11) NOT NULL,
  `id_ticket` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `mensaje` text NOT NULL,
  `es_interno` tinyint(1) DEFAULT 0 COMMENT '1=Nota interna (solo admins)',
  `archivo_adjunto` varchar(255) DEFAULT NULL,
  `fecha_envio` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles_admin`
--

CREATE TABLE `roles_admin` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `nivel` int(11) NOT NULL COMMENT '1=Superior, 2=Intermedio, 3=Técnico, 4=Usuario',
  `permisos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Permisos específicos del rol' CHECK (json_valid(`permisos`)),
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles_admin`
--

INSERT INTO `roles_admin` (`id`, `nombre`, `nivel`, `permisos`, `creado_en`) VALUES
(1, 'Administrador Superior', 1, '{\"tickets\": \"all\", \"users\": \"all\", \"settings\": \"all\"}', '2026-02-17 00:28:31'),
(2, 'Administrador Intermedio', 2, '{\"tickets\": \"all\", \"users\": \"view\"}', '2026-02-17 00:28:31'),
(3, 'Técnico', 3, '{\"tickets\": \"assigned\"}', '2026-02-17 00:28:31'),
(4, 'Usuario', 4, '{\"tickets\": \"own\"}', '2026-02-17 00:28:31');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `subcategorias`
--

CREATE TABLE `subcategorias` (
  `id` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `orden` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `subcategorias`
--

INSERT INTO `subcategorias` (`id`, `id_categoria`, `nombre`, `descripcion`, `activo`, `orden`) VALUES
(1, 1, 'Computadora no enciende', NULL, 1, 1),
(2, 1, 'Teclado/Mouse', NULL, 1, 2),
(3, 1, 'Monitor', NULL, 1, 3),
(4, 1, 'Impresora', NULL, 1, 4),
(5, 1, 'Otro hardware', NULL, 1, 99),
(6, 2, 'Windows/Mac OS', NULL, 1, 1),
(7, 2, 'Office (Word, Excel, etc)', NULL, 1, 2),
(8, 2, 'Navegadores', NULL, 1, 3),
(9, 2, 'Antivirus', NULL, 1, 4),
(10, 2, 'Instalación de software', NULL, 1, 5),
(11, 2, 'Otro software', NULL, 1, 99),
(12, 3, 'Sin internet', NULL, 1, 1),
(13, 3, 'Internet lento', NULL, 1, 2),
(14, 3, 'WiFi no funciona', NULL, 1, 3),
(15, 3, 'VPN', NULL, 1, 4),
(16, 3, 'Otro problema de red', NULL, 1, 99),
(17, 4, 'Olvidé mi contraseña', NULL, 1, 1),
(18, 4, 'Necesito acceso a sistema', NULL, 1, 2),
(19, 4, 'Necesito acceso a carpeta', NULL, 1, 3),
(20, 4, 'Usuario bloqueado', NULL, 1, 4),
(21, 4, 'Otro problema de acceso', NULL, 1, 99),
(22, 5, 'Consulta general', NULL, 1, 1),
(23, 5, 'Capacitación', NULL, 1, 2),
(24, 5, 'Documentación', NULL, 1, 3),
(25, 5, 'Otro soporte', NULL, 1, 99),
(26, 6, 'Sistema caído', NULL, 1, 1),
(27, 6, 'Pérdida de datos', NULL, 1, 2),
(28, 6, 'Error crítico', NULL, 1, 3),
(29, 6, 'Otro incidente', NULL, 1, 99),
(30, 7, 'No especificado', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tickets`
--

CREATE TABLE `tickets` (
  `id` int(11) NOT NULL,
  `titulo` varchar(200) NOT NULL,
  `descripcion` text NOT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `subcategoria` varchar(100) DEFAULT NULL,
  `prioridad` enum('baja','media','alta','critica') DEFAULT 'media',
  `estado` enum('Abierto','En Proceso','Cerrado','Resuelto') DEFAULT 'Abierto',
  `id_usuario` int(11) NOT NULL COMMENT 'Usuario que crea el ticket',
  `id_asignado` int(11) DEFAULT NULL COMMENT 'Usuario asignado (técnico/admin)',
  `archivo_adjunto` varchar(255) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `fecha_cierre` timestamp NULL DEFAULT NULL,
  `motivo_cierre` text DEFAULT NULL,
  `usuario_cierre` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tickets`
--

INSERT INTO `tickets` (`id`, `titulo`, `descripcion`, `categoria`, `subcategoria`, `prioridad`, `estado`, `id_usuario`, `id_asignado`, `archivo_adjunto`, `fecha_creacion`, `fecha_actualizacion`, `fecha_cierre`, `motivo_cierre`, `usuario_cierre`) VALUES
(1, 'Prueba tickey admin', 'Se crea ticket de prueba admin', 'Hardware', 'Monitor', 'baja', 'Abierto', 2, NULL, NULL, '2026-02-17 00:12:15', '2026-02-17 00:21:15', NULL, NULL, NULL);

--
-- Disparadores `tickets`
--
DELIMITER $$
CREATE TRIGGER `after_ticket_update` AFTER UPDATE ON `tickets` FOR EACH ROW BEGIN
    IF OLD.estado != NEW.estado THEN
        INSERT INTO historial_tickets (id_ticket, id_usuario, accion, valor_anterior, valor_nuevo, descripcion)
        VALUES (NEW.id, COALESCE(NEW.id_asignado, NEW.id_usuario), 'cambio_estado', OLD.estado, NEW.estado, 
                CONCAT('Estado cambiado de ', OLD.estado, ' a ', NEW.estado));
    END IF;
    
    IF OLD.id_asignado != NEW.id_asignado OR (OLD.id_asignado IS NULL AND NEW.id_asignado IS NOT NULL) THEN
        INSERT INTO historial_tickets (id_ticket, id_usuario, accion, valor_anterior, valor_nuevo, descripcion)
        VALUES (NEW.id, COALESCE(NEW.id_asignado, NEW.id_usuario), 'asignacion', OLD.id_asignado, NEW.id_asignado,
                'Ticket asignado a nuevo usuario');
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `primer_nombre` varchar(50) NOT NULL,
  `segundo_nombre` varchar(50) DEFAULT NULL,
  `primer_apellido` varchar(50) NOT NULL,
  `segundo_apellido` varchar(50) DEFAULT NULL,
  `usuario` varchar(50) NOT NULL COMMENT 'Username para login',
  `password` varchar(255) NOT NULL COMMENT 'Hash de contraseña',
  `id_rol_admin` int(11) NOT NULL DEFAULT 4,
  `estado` tinyint(1) DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `cambiar_password` tinyint(1) DEFAULT 0 COMMENT '1=Obligar cambio',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `usuario`, `password`, `id_rol_admin`, `estado`, `email`, `telefono`, `ultimo_acceso`, `cambiar_password`, `creado_en`, `actualizado_en`) VALUES
(1, 'Admin', NULL, 'Sistema', NULL, 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 1, 'admin@empresa.com', NULL, NULL, 0, '2026-02-17 00:30:13', '2026-02-17 00:30:13'),
(2, 'Michael', 'Andres', 'Moreno', 'Cruz', 'mmoreno', '$2y$12$dX5yrvldTDSWowcJvkWiAu8LbcxmjYZpwGutDl3fHtUvwKMsuuCsm', 1, 1, NULL, NULL, '2026-02-17 00:31:28', 0, '2026-02-17 00:31:01', '2026-02-17 00:31:28');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_stats_usuarios`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_stats_usuarios` (
`id` int(11)
,`nombre_completo` varchar(101)
,`total_tickets` bigint(21)
,`tickets_abiertos` decimal(22,0)
,`tickets_proceso` decimal(22,0)
,`tickets_cerrados` decimal(22,0)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `v_tickets_completos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `v_tickets_completos` (
`id` int(11)
,`titulo` varchar(200)
,`descripcion` text
,`categoria` varchar(100)
,`subcategoria` varchar(100)
,`prioridad` enum('baja','media','alta','critica')
,`estado` enum('Abierto','En Proceso','Cerrado','Resuelto')
,`id_usuario` int(11)
,`id_asignado` int(11)
,`archivo_adjunto` varchar(255)
,`fecha_creacion` timestamp
,`fecha_actualizacion` timestamp
,`fecha_cierre` timestamp
,`motivo_cierre` text
,`usuario_cierre` int(11)
,`nombre_usuario` varchar(101)
,`email_usuario` varchar(100)
,`nombre_asignado` varchar(101)
,`email_asignado` varchar(100)
,`rol_usuario` varchar(50)
,`total_mensajes` bigint(21)
,`total_archivos` bigint(21)
,`minutos_abierto` bigint(21)
,`tiene_adjunto` varchar(2)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `v_stats_usuarios`
--
DROP TABLE IF EXISTS `v_stats_usuarios`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_stats_usuarios`  AS SELECT `u`.`id` AS `id`, concat(`u`.`primer_nombre`,' ',`u`.`primer_apellido`) AS `nombre_completo`, count(distinct `t`.`id`) AS `total_tickets`, sum(case when `t`.`estado` = 'Abierto' then 1 else 0 end) AS `tickets_abiertos`, sum(case when `t`.`estado` = 'En Proceso' then 1 else 0 end) AS `tickets_proceso`, sum(case when `t`.`estado` in ('Cerrado','Resuelto') then 1 else 0 end) AS `tickets_cerrados` FROM (`usuarios` `u` left join `tickets` `t` on(`u`.`id` = `t`.`id_usuario`)) WHERE `u`.`estado` = 1 GROUP BY `u`.`id`, `u`.`primer_nombre`, `u`.`primer_apellido` ORDER BY count(distinct `t`.`id`) DESC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `v_tickets_completos`
--
DROP TABLE IF EXISTS `v_tickets_completos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_tickets_completos`  AS SELECT `t`.`id` AS `id`, `t`.`titulo` AS `titulo`, `t`.`descripcion` AS `descripcion`, `t`.`categoria` AS `categoria`, `t`.`subcategoria` AS `subcategoria`, `t`.`prioridad` AS `prioridad`, `t`.`estado` AS `estado`, `t`.`id_usuario` AS `id_usuario`, `t`.`id_asignado` AS `id_asignado`, `t`.`archivo_adjunto` AS `archivo_adjunto`, `t`.`fecha_creacion` AS `fecha_creacion`, `t`.`fecha_actualizacion` AS `fecha_actualizacion`, `t`.`fecha_cierre` AS `fecha_cierre`, `t`.`motivo_cierre` AS `motivo_cierre`, `t`.`usuario_cierre` AS `usuario_cierre`, concat(`u`.`primer_nombre`,' ',`u`.`primer_apellido`) AS `nombre_usuario`, `u`.`email` AS `email_usuario`, concat(`a`.`primer_nombre`,' ',`a`.`primer_apellido`) AS `nombre_asignado`, `a`.`email` AS `email_asignado`, `r`.`nombre` AS `rol_usuario`, (select count(0) from `mensajes_ticket` where `mensajes_ticket`.`id_ticket` = `t`.`id`) AS `total_mensajes`, (select count(0) from `mensajes_ticket` where `mensajes_ticket`.`id_ticket` = `t`.`id` and `mensajes_ticket`.`archivo_adjunto` is not null) AS `total_archivos`, timestampdiff(MINUTE,`t`.`fecha_creacion`,current_timestamp()) AS `minutos_abierto`, CASE WHEN `t`.`archivo_adjunto` is not null THEN 'Sí' WHEN (select count(0) from `mensajes_ticket` where `mensajes_ticket`.`id_ticket` = `t`.`id` AND `mensajes_ticket`.`archivo_adjunto` is not null) > 0 THEN 'Sí' ELSE 'No' END AS `tiene_adjunto` FROM (((`tickets` `t` left join `usuarios` `u` on(`t`.`id_usuario` = `u`.`id`)) left join `usuarios` `a` on(`t`.`id_asignado` = `a`.`id`)) left join `roles_admin` `r` on(`u`.`id_rol_admin` = `r`.`id`)) ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `asignaciones_tickets`
--
ALTER TABLE `asignaciones_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario_asigna` (`id_usuario_asigna`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_usuario` (`id_usuario_asignado`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `configuracion`
--
ALTER TABLE `configuracion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indices de la tabla `historial_login`
--
ALTER TABLE `historial_login`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`id_usuario`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `idx_exitoso` (`exitoso`);

--
-- Indices de la tabla `historial_tickets`
--
ALTER TABLE `historial_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_fecha` (`fecha`);

--
-- Indices de la tabla `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_fecha` (`fecha_envio`);

--
-- Indices de la tabla `roles_admin`
--
ALTER TABLE `roles_admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categoria` (`id_categoria`);

--
-- Indices de la tabla `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`id_usuario`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_prioridad` (`prioridad`),
  ADD KEY `idx_asignado` (`id_asignado`),
  ADD KEY `idx_estado_fecha` (`estado`,`fecha_creacion`),
  ADD KEY `idx_categoria` (`categoria`),
  ADD KEY `idx_subcategoria` (`subcategoria`);
ALTER TABLE `tickets` ADD FULLTEXT KEY `ft_busqueda` (`titulo`,`descripcion`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_usuario` (`usuario`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_rol` (`id_rol_admin`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `asignaciones_tickets`
--
ALTER TABLE `asignaciones_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `configuracion`
--
ALTER TABLE `configuracion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `historial_login`
--
ALTER TABLE `historial_login`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `historial_tickets`
--
ALTER TABLE `historial_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles_admin`
--
ALTER TABLE `roles_admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT de la tabla `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `asignaciones_tickets`
--
ALTER TABLE `asignaciones_tickets`
  ADD CONSTRAINT `asignaciones_tickets_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `asignaciones_tickets_ibfk_2` FOREIGN KEY (`id_usuario_asignado`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `asignaciones_tickets_ibfk_3` FOREIGN KEY (`id_usuario_asigna`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `historial_login`
--
ALTER TABLE `historial_login`
  ADD CONSTRAINT `historial_login_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `historial_tickets`
--
ALTER TABLE `historial_tickets`
  ADD CONSTRAINT `historial_tickets_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_tickets_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  ADD CONSTRAINT `mensajes_ticket_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mensajes_ticket_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`id_asignado`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol_admin`) REFERENCES `roles_admin` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
