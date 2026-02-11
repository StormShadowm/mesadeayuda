-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 11-02-2026 a las 03:42:20
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

--
-- Volcado de datos para la tabla `asignaciones_tickets`
--

INSERT INTO `asignaciones_tickets` (`id`, `id_ticket`, `id_usuario_asignado`, `id_usuario_asigna`, `fecha_asignacion`, `activo`) VALUES
(1, 30321, 4, 1, '2026-02-11 01:02:17', 1),
(2, 278, 3, 1, '2026-02-11 01:16:31', 1),
(3, 261, 4, 3, '2026-02-11 01:41:25', 1);

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
(1, 'sistema_nombre', 'Mesa de Ayuda', 'Nombre del sistema', 'string', '2026-02-08 22:19:13'),
(2, 'tickets_por_pagina', '10', 'Cantidad de tickets por página', 'number', '2026-02-08 22:19:13'),
(3, 'tiempo_sesion', '1800', 'Tiempo de sesión en segundos', 'number', '2026-02-08 22:19:13'),
(4, 'permitir_registro', 'true', 'Permitir auto-registro de usuarios', 'boolean', '2026-02-08 22:19:13'),
(5, 'max_tamaño_archivo', '5242880', 'Tamaño máximo archivo en bytes (5MB)', 'number', '2026-02-08 22:19:13');

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
(1, NULL, 'josi', 0, '::1', NULL, '2026-02-08 22:19:20'),
(2, NULL, 'admin', 0, '::1', NULL, '2026-02-08 22:19:33'),
(3, NULL, 'admin', 0, '::1', NULL, '2026-02-08 22:19:49'),
(4, NULL, 'admin', 0, '::1', NULL, '2026-02-08 22:21:19'),
(5, NULL, 'usuario', 0, '::1', NULL, '2026-02-08 22:21:30'),
(6, NULL, 'Andres', 0, '::1', NULL, '2026-02-08 22:22:28'),
(7, NULL, 'Andres', 0, '::1', NULL, '2026-02-08 22:22:39'),
(8, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 22:23:31'),
(9, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 22:24:31'),
(10, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 22:56:14'),
(11, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 22:57:18'),
(12, NULL, 'usuario', 0, '::1', NULL, '2026-02-08 22:57:43'),
(13, NULL, 'usuario', 0, '::1', NULL, '2026-02-08 22:58:30'),
(14, NULL, 'usuario', 0, '::1', NULL, '2026-02-08 22:58:30'),
(15, 2, 'usuario', 1, '::1', NULL, '2026-02-08 22:58:40'),
(16, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:00:23'),
(17, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 23:00:27'),
(18, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 23:06:24'),
(19, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:06:29'),
(20, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:18:57'),
(21, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:19:27'),
(22, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:23:43'),
(23, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 23:23:55'),
(24, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 23:25:33'),
(25, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 23:30:28'),
(26, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:30:33'),
(27, 2, 'usuario', 1, '::1', NULL, '2026-02-08 23:42:19'),
(28, 3, 'mmoreno', 1, '::1', NULL, '2026-02-08 23:42:23'),
(29, 3, 'mmoreno', 1, '::1', NULL, '2026-02-09 00:06:52'),
(30, NULL, 'admin', 0, '::1', NULL, '2026-02-09 00:07:08'),
(31, 1, 'admin', 1, '::1', NULL, '2026-02-09 00:08:46'),
(32, 1, 'admin', 1, '::1', NULL, '2026-02-09 00:18:19'),
(33, 2, 'usuario', 1, '::1', NULL, '2026-02-09 00:18:24'),
(34, 2, 'usuario', 1, '::1', NULL, '2026-02-09 00:18:33'),
(35, 2, 'usuario', 1, '::1', NULL, '2026-02-10 00:39:29'),
(36, 2, 'usuario', 1, '::1', NULL, '2026-02-10 00:39:36'),
(37, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 00:39:41'),
(38, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 00:55:59'),
(39, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:12:01'),
(40, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:12:25'),
(41, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:12:27'),
(42, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:13:07'),
(43, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:22:05'),
(44, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:48:11'),
(45, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:51:40'),
(46, 2, 'usuario', 1, '::1', NULL, '2026-02-10 01:51:50'),
(47, 2, 'usuario', 1, '::1', NULL, '2026-02-10 01:54:39'),
(48, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:54:44'),
(49, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:55:29'),
(50, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:55:56'),
(51, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 01:56:58'),
(52, NULL, 'cca', 0, '::1', NULL, '2026-02-10 01:57:02'),
(53, NULL, 'mmoreno', 0, '::1', NULL, '2026-02-10 01:57:08'),
(54, 4, 'cca', 1, '::1', NULL, '2026-02-10 01:57:15'),
(55, 4, 'cca', 1, '::1', NULL, '2026-02-10 02:25:08'),
(56, 4, 'cca', 1, '::1', NULL, '2026-02-10 02:37:42'),
(77, 17, 'user13', 1, '10.0.192.27', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(172, 9, 'user5', 1, '10.0.60.138', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(189, 4, 'cca', 0, '10.0.85.196', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(367, 6, 'user2', 0, '10.0.166.153', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(384, 2, 'usuario', 0, '10.0.180.106', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(469, 19, 'user15', 0, '10.0.76.90', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(488, 7, 'user3', 1, '10.0.79.198', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(731, 20, 'user16', 0, '10.0.135.186', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(839, 14, 'user10', 0, '10.0.44.171', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(894, 13, 'user9', 1, '10.0.50.79', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(925, 1, 'admin', 0, '10.0.106.168', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1177, 8, 'user4', 0, '10.0.180.22', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1182, 12, 'user8', 0, '10.0.55.237', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1200, 18, 'user14', 1, '10.0.136.184', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1246, 15, 'user11', 1, '10.0.155.0', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1380, 16, 'user12', 0, '10.0.51.222', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1471, 5, 'user1', 1, '10.0.145.158', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1760, 3, 'mmoreno', 1, '10.0.59.72', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1872, 10, 'user6', 1, '10.0.27.62', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(1876, 11, 'user7', 0, '10.0.6.171', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2026-02-10 03:57:28'),
(2104, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 03:57:49'),
(2105, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 04:00:34'),
(2106, 2, 'usuario', 1, '::1', NULL, '2026-02-10 04:00:41'),
(2107, 2, 'usuario', 1, '::1', NULL, '2026-02-10 04:01:02'),
(2108, 5, 'user1', 1, '::1', NULL, '2026-02-10 04:01:18'),
(2109, 5, 'user1', 1, '::1', NULL, '2026-02-10 04:06:20'),
(2110, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 04:06:25'),
(2111, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 04:09:20'),
(2112, 2, 'usuario', 1, '::1', NULL, '2026-02-10 23:54:08'),
(2113, 2, 'usuario', 1, '::1', NULL, '2026-02-10 23:55:51'),
(2114, 2, 'usuario', 1, '::1', NULL, '2026-02-10 23:56:01'),
(2115, 2, 'usuario', 1, '::1', NULL, '2026-02-10 23:57:27'),
(2116, 3, 'mmoreno', 1, '::1', NULL, '2026-02-10 23:57:31'),
(2117, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:10:48'),
(2118, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:10:54'),
(2119, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:12:09'),
(2120, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:12:12'),
(2121, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:21:28'),
(2122, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:21:33'),
(2123, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:27:29'),
(2124, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:27:33'),
(2125, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:35:57'),
(2126, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:36:02'),
(2127, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:38:19'),
(2128, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:38:22'),
(2129, 2, 'usuario', 1, '::1', NULL, '2026-02-11 00:43:22'),
(2130, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:43:26'),
(2131, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 00:58:23'),
(2132, NULL, 'administrador', 0, '::1', NULL, '2026-02-11 00:58:35'),
(2133, NULL, 'Administrador', 0, '::1', NULL, '2026-02-11 00:59:13'),
(2134, 1, 'admin', 1, '::1', NULL, '2026-02-11 00:59:47'),
(2135, 1, 'admin', 1, '::1', NULL, '2026-02-11 01:18:48'),
(2136, 2, 'usuario', 1, '::1', NULL, '2026-02-11 01:18:53'),
(2137, 2, 'usuario', 1, '::1', NULL, '2026-02-11 01:39:44'),
(2138, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 01:40:12'),
(2139, 3, 'mmoreno', 1, '::1', NULL, '2026-02-11 01:41:30'),
(2140, NULL, 'cca', 0, '::1', NULL, '2026-02-11 01:41:50'),
(2141, 4, 'cca', 1, '::1', NULL, '2026-02-11 01:42:23');

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

--
-- Volcado de datos para la tabla `historial_tickets`
--

INSERT INTO `historial_tickets` (`id`, `id_ticket`, `id_usuario`, `accion`, `valor_anterior`, `valor_nuevo`, `descripcion`, `fecha`) VALUES
(1, 4, 3, 'cambio_estado', NULL, 'Abierto', NULL, '2026-02-08 23:43:50'),
(197, 30321, 4, 'asignacion', NULL, '4', 'Ticket asignado a nuevo usuario', '2026-02-11 01:02:17'),
(198, 278, 3, 'asignacion', NULL, '3', 'Ticket asignado a nuevo usuario', '2026-02-11 01:16:31'),
(199, 261, 4, 'asignacion', NULL, '4', 'Ticket asignado a nuevo usuario', '2026-02-11 01:41:25');

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

--
-- Volcado de datos para la tabla `mensajes_ticket`
--

INSERT INTO `mensajes_ticket` (`id`, `id_ticket`, `id_usuario`, `mensaje`, `es_interno`, `archivo_adjunto`, `fecha_envio`) VALUES
(1, 1, 2, 'Hola, necesito ayuda urgente con el login', 0, NULL, '2026-02-08 22:19:13'),
(2, 1, 1, 'Hola, estoy revisando tu caso. ¿Qué error específico ves?', 0, NULL, '2026-02-08 22:19:13'),
(3, 2, 2, 'Quisiera saber los pasos del proceso de solicitud', 0, NULL, '2026-02-08 22:19:13'),
(4, 4, 3, 'Es de prueba', 0, NULL, '2026-02-08 23:01:32'),
(5, 2, 3, 'Archivo adjunto: INSTRUCCIONES_INSTALACION.md', 0, 'INSTRUCCIONES_INSTALACION_69891b6de672f_1770593133.md', '2026-02-08 23:25:33'),
(6, 2, 3, 'Estamos validando', 0, NULL, '2026-02-08 23:25:47'),
(7, 4, 3, 'cerrado', 0, NULL, '2026-02-08 23:57:10'),
(8, 4, 3, 'Prueba', 0, NULL, '2026-02-10 00:49:52'),
(9, 1, 2, 'Que soy medio marica', 0, NULL, '2026-02-10 01:52:19'),
(10, 2, 4, 'Archivo: FORMATO POLIZA VIDA DEUDORES.pdf', 0, 'FORMATO_POLIZA_VIDA_DEUDORES_698a9704ec50c_1770690308.pdf', '2026-02-10 02:25:08'),
(18, 3, 19, 'Mensaje automático del ticket 3', 0, NULL, '2026-02-10 03:56:59');

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
(1, 'Administrador Superior', 1, '{\"tickets\": \"all\", \"users\": \"all\", \"settings\": \"all\"}', '2026-02-08 22:19:13'),
(2, 'Administrador Intermedio', 2, '{\"tickets\": \"all\", \"users\": \"view\"}', '2026-02-08 22:19:13'),
(3, 'Técnico', 3, '{\"tickets\": \"assigned\"}', '2026-02-08 22:19:13'),
(4, 'Usuario', 4, '{\"tickets\": \"own\"}', '2026-02-08 22:19:13');

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
(1, 'Problema con el sistema de login', 'No puedo acceder a mi cuenta', '', NULL, 'alta', 'Abierto', 2, NULL, NULL, '2026-02-08 22:19:13', '2026-02-11 00:25:08', NULL, NULL, NULL),
(2, 'Solicitud de información', 'Necesito información sobre el proceso', 'soporte', NULL, 'critica', 'En Proceso', 2, NULL, NULL, '2026-02-08 22:19:13', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3, 'Error en reportes', 'Los reportes no se generan correctamente', '', NULL, 'critica', 'Resuelto', 2, NULL, NULL, '2026-02-08 22:19:13', '2026-02-11 00:25:08', NULL, NULL, NULL),
(4, 'Prueba', 'Es ticket de prueba', 'soporte', NULL, 'baja', 'Abierto', 2, NULL, NULL, '2026-02-08 23:00:17', '2026-02-10 01:48:19', NULL, NULL, NULL),
(5, 'Falla mouse', 'El mouse no funciona el click y lleva varios días con esa falla', '', NULL, 'baja', 'Abierto', 2, NULL, NULL, '2026-02-10 01:54:30', '2026-02-11 00:25:08', NULL, NULL, NULL),
(144, 'Ticket 139', 'Descripción automática del ticket 139', 'soporte', NULL, 'baja', 'Abierto', 3, NULL, NULL, '2026-02-10 03:56:33', '2026-02-11 00:25:08', NULL, NULL, NULL),
(261, 'Ticket 1-1', 'Ticket automático 1 del usuario admin', 'otro', NULL, 'media', 'Abierto', 1, 4, NULL, '2026-02-10 04:04:46', '2026-02-11 01:41:25', NULL, NULL, NULL),
(262, 'Ticket 1-2', 'Ticket automático 2 del usuario admin', '', NULL, 'baja', 'Resuelto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(263, 'Ticket 1-3', 'Ticket automático 3 del usuario admin', '', NULL, 'media', 'Abierto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(264, 'Ticket 1-4', 'Ticket automático 4 del usuario admin', 'soporte', NULL, 'baja', 'En Proceso', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(265, 'Ticket 1-5', 'Ticket automático 5 del usuario admin', 'soporte', NULL, 'critica', 'Resuelto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(266, 'Ticket 1-6', 'Ticket automático 6 del usuario admin', 'otro', NULL, 'alta', 'Resuelto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(267, 'Ticket 1-7', 'Ticket automático 7 del usuario admin', 'soporte', NULL, 'media', 'Cerrado', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(268, 'Ticket 1-8', 'Ticket automático 8 del usuario admin', 'soporte', NULL, 'baja', 'Cerrado', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(269, 'Ticket 1-9', 'Ticket automático 9 del usuario admin', '', NULL, 'critica', 'Resuelto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(270, 'Ticket 1-10', 'Ticket automático 10 del usuario admin', 'soporte', NULL, 'baja', 'En Proceso', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(271, 'Ticket 1-11', 'Ticket automático 11 del usuario admin', 'otro', NULL, 'media', 'En Proceso', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(272, 'Ticket 1-12', 'Ticket automático 12 del usuario admin', '', NULL, 'critica', 'Cerrado', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(273, 'Ticket 1-13', 'Ticket automático 13 del usuario admin', 'otro', NULL, 'media', 'Cerrado', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(274, 'Ticket 1-14', 'Ticket automático 14 del usuario admin', 'soporte', NULL, 'baja', 'Abierto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(275, 'Ticket 1-15', 'Ticket automático 15 del usuario admin', 'soporte', NULL, 'baja', 'Resuelto', 1, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(276, 'Ticket 4-1', 'Ticket automático 1 del usuario cca', 'soporte', NULL, 'alta', 'En Proceso', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(277, 'Ticket 4-2', 'Ticket automático 2 del usuario cca', '', NULL, 'alta', 'Resuelto', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(278, 'Ticket 4-3', 'Ticket automático 3 del usuario cca', '', NULL, 'baja', 'En Proceso', 4, 3, NULL, '2026-02-10 04:04:46', '2026-02-11 01:16:31', NULL, NULL, NULL),
(279, 'Ticket 4-4', 'Ticket automático 4 del usuario cca', 'otro', NULL, 'alta', 'Cerrado', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(280, 'Ticket 4-5', 'Ticket automático 5 del usuario cca', 'otro', NULL, 'critica', 'Resuelto', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(281, 'Ticket 4-6', 'Ticket automático 6 del usuario cca', 'soporte', NULL, 'alta', 'En Proceso', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(282, 'Ticket 4-7', 'Ticket automático 7 del usuario cca', 'otro', NULL, 'baja', 'Cerrado', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(283, 'Ticket 4-8', 'Ticket automático 8 del usuario cca', 'soporte', NULL, 'media', 'Resuelto', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(284, 'Ticket 4-9', 'Ticket automático 9 del usuario cca', 'soporte', NULL, 'media', 'Cerrado', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(285, 'Ticket 4-10', 'Ticket automático 10 del usuario cca', '', NULL, 'alta', 'Cerrado', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(286, 'Ticket 4-11', 'Ticket automático 11 del usuario cca', '', NULL, 'critica', 'Abierto', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(287, 'Ticket 4-12', 'Ticket automático 12 del usuario cca', 'soporte', NULL, 'critica', 'Abierto', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(288, 'Ticket 4-13', 'Ticket automático 13 del usuario cca', 'soporte', NULL, 'alta', 'Cerrado', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(289, 'Ticket 4-14', 'Ticket automático 14 del usuario cca', 'soporte', NULL, 'media', 'Abierto', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(290, 'Ticket 4-15', 'Ticket automático 15 del usuario cca', 'soporte', NULL, 'alta', 'En Proceso', 4, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(291, 'Ticket 3-1', 'Ticket automático 1 del usuario mmoreno', 'otro', NULL, 'alta', 'En Proceso', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(292, 'Ticket 3-2', 'Ticket automático 2 del usuario mmoreno', 'soporte', NULL, 'media', 'Cerrado', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(293, 'Ticket 3-3', 'Ticket automático 3 del usuario mmoreno', 'otro', NULL, 'critica', 'En Proceso', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(294, 'Ticket 3-4', 'Ticket automático 4 del usuario mmoreno', 'soporte', NULL, 'critica', 'Abierto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(295, 'Ticket 3-5', 'Ticket automático 5 del usuario mmoreno', 'soporte', NULL, 'critica', 'Cerrado', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(296, 'Ticket 3-6', 'Ticket automático 6 del usuario mmoreno', 'soporte', NULL, 'alta', 'Resuelto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(297, 'Ticket 3-7', 'Ticket automático 7 del usuario mmoreno', 'soporte', NULL, 'media', 'Abierto', 3, 6, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(298, 'Ticket 3-8', 'Ticket automático 8 del usuario mmoreno', '', NULL, 'alta', 'Abierto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(299, 'Ticket 3-9', 'Ticket automático 9 del usuario mmoreno', '', NULL, 'media', 'Cerrado', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(300, 'Ticket 3-10', 'Ticket automático 10 del usuario mmoreno', 'soporte', NULL, 'media', 'Abierto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(301, 'Ticket 3-11', 'Ticket automático 11 del usuario mmoreno', 'soporte', NULL, 'baja', 'En Proceso', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(302, 'Ticket 3-12', 'Ticket automático 12 del usuario mmoreno', 'soporte', NULL, 'alta', 'Abierto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(303, 'Ticket 3-13', 'Ticket automático 13 del usuario mmoreno', 'soporte', NULL, 'baja', 'Abierto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(304, 'Ticket 3-14', 'Ticket automático 14 del usuario mmoreno', 'soporte', NULL, 'alta', 'Abierto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(305, 'Ticket 3-15', 'Ticket automático 15 del usuario mmoreno', 'soporte', NULL, 'media', 'Resuelto', 3, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(306, 'Ticket 5-1', 'Ticket automático 1 del usuario user1', 'soporte', NULL, 'baja', 'Abierto', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(307, 'Ticket 5-2', 'Ticket automático 2 del usuario user1', 'soporte', NULL, 'media', 'Cerrado', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(308, 'Ticket 5-3', 'Ticket automático 3 del usuario user1', 'otro', NULL, 'media', 'Resuelto', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(309, 'Ticket 5-4', 'Ticket automático 4 del usuario user1', 'soporte', NULL, 'baja', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(310, 'Ticket 5-5', 'Ticket automático 5 del usuario user1', 'soporte', NULL, 'critica', 'Cerrado', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(311, 'Ticket 5-6', 'Ticket automático 6 del usuario user1', '', NULL, 'critica', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(312, 'Ticket 5-7', 'Ticket automático 7 del usuario user1', 'soporte', NULL, 'critica', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(313, 'Ticket 5-8', 'Ticket automático 8 del usuario user1', 'soporte', NULL, 'media', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(314, 'Ticket 5-9', 'Ticket automático 9 del usuario user1', 'otro', NULL, 'critica', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(315, 'Ticket 5-10', 'Ticket automático 10 del usuario user1', 'soporte', NULL, 'alta', 'Resuelto', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(316, 'Ticket 5-11', 'Ticket automático 11 del usuario user1', '', NULL, 'alta', 'Resuelto', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(317, 'Ticket 5-12', 'Ticket automático 12 del usuario user1', 'soporte', NULL, 'critica', 'Cerrado', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(318, 'Ticket 5-13', 'Ticket automático 13 del usuario user1', '', NULL, 'baja', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(319, 'Ticket 5-14', 'Ticket automático 14 del usuario user1', 'otro', NULL, 'critica', 'Resuelto', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(320, 'Ticket 5-15', 'Ticket automático 15 del usuario user1', 'soporte', NULL, 'baja', 'En Proceso', 5, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(321, 'Ticket 14-1', 'Ticket automático 1 del usuario user10', '', NULL, 'alta', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(322, 'Ticket 14-2', 'Ticket automático 2 del usuario user10', 'otro', NULL, 'baja', 'Resuelto', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(323, 'Ticket 14-3', 'Ticket automático 3 del usuario user10', 'otro', NULL, 'critica', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(324, 'Ticket 14-4', 'Ticket automático 4 del usuario user10', '', NULL, 'critica', 'Abierto', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(325, 'Ticket 14-5', 'Ticket automático 5 del usuario user10', 'soporte', NULL, 'alta', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(326, 'Ticket 14-6', 'Ticket automático 6 del usuario user10', 'soporte', NULL, 'media', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(327, 'Ticket 14-7', 'Ticket automático 7 del usuario user10', 'otro', NULL, 'media', 'Cerrado', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(328, 'Ticket 14-8', 'Ticket automático 8 del usuario user10', 'otro', NULL, 'baja', 'Abierto', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(329, 'Ticket 14-9', 'Ticket automático 9 del usuario user10', '', NULL, 'alta', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(330, 'Ticket 14-10', 'Ticket automático 10 del usuario user10', '', NULL, 'critica', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(331, 'Ticket 14-11', 'Ticket automático 11 del usuario user10', 'otro', NULL, 'baja', 'Cerrado', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(332, 'Ticket 14-12', 'Ticket automático 12 del usuario user10', 'soporte', NULL, 'alta', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(333, 'Ticket 14-13', 'Ticket automático 13 del usuario user10', 'soporte', NULL, 'alta', 'Abierto', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(334, 'Ticket 14-14', 'Ticket automático 14 del usuario user10', 'otro', NULL, 'media', 'En Proceso', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(335, 'Ticket 14-15', 'Ticket automático 15 del usuario user10', 'soporte', NULL, 'alta', 'Resuelto', 14, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1986, 'Ticket 15-1', 'Ticket automático 1 del usuario user11', '', NULL, 'baja', 'Abierto', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1987, 'Ticket 15-2', 'Ticket automático 2 del usuario user11', 'soporte', NULL, 'baja', 'En Proceso', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1988, 'Ticket 15-3', 'Ticket automático 3 del usuario user11', 'soporte', NULL, 'baja', 'Abierto', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1989, 'Ticket 15-4', 'Ticket automático 4 del usuario user11', 'soporte', NULL, 'critica', 'En Proceso', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1990, 'Ticket 15-5', 'Ticket automático 5 del usuario user11', '', NULL, 'media', 'Cerrado', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1991, 'Ticket 15-6', 'Ticket automático 6 del usuario user11', 'soporte', NULL, 'media', 'Cerrado', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1992, 'Ticket 15-7', 'Ticket automático 7 del usuario user11', 'soporte', NULL, 'media', 'Resuelto', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1993, 'Ticket 15-8', 'Ticket automático 8 del usuario user11', 'soporte', NULL, 'critica', 'Abierto', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1994, 'Ticket 15-9', 'Ticket automático 9 del usuario user11', 'otro', NULL, 'critica', 'Resuelto', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1995, 'Ticket 15-10', 'Ticket automático 10 del usuario user11', '', NULL, 'alta', 'Cerrado', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1996, 'Ticket 15-11', 'Ticket automático 11 del usuario user11', 'soporte', NULL, 'alta', 'En Proceso', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1997, 'Ticket 15-12', 'Ticket automático 12 del usuario user11', 'soporte', NULL, 'critica', 'Resuelto', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(1998, 'Ticket 15-13', 'Ticket automático 13 del usuario user11', 'otro', NULL, 'media', 'Cerrado', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(1999, 'Ticket 15-14', 'Ticket automático 14 del usuario user11', '', NULL, 'alta', 'Cerrado', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(2000, 'Ticket 15-15', 'Ticket automático 15 del usuario user11', 'otro', NULL, 'baja', 'En Proceso', 15, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3651, 'Ticket 16-1', 'Ticket automático 1 del usuario user12', 'otro', NULL, 'alta', 'Resuelto', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3652, 'Ticket 16-2', 'Ticket automático 2 del usuario user12', 'soporte', NULL, 'media', 'Cerrado', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3653, 'Ticket 16-3', 'Ticket automático 3 del usuario user12', '', NULL, 'baja', 'Resuelto', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3654, 'Ticket 16-4', 'Ticket automático 4 del usuario user12', 'soporte', NULL, 'media', 'Cerrado', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3655, 'Ticket 16-5', 'Ticket automático 5 del usuario user12', 'soporte', NULL, 'critica', 'Cerrado', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3656, 'Ticket 16-6', 'Ticket automático 6 del usuario user12', 'soporte', NULL, 'critica', 'Cerrado', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3657, 'Ticket 16-7', 'Ticket automático 7 del usuario user12', '', NULL, 'critica', 'Cerrado', 16, 15, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3658, 'Ticket 16-8', 'Ticket automático 8 del usuario user12', 'otro', NULL, 'critica', 'En Proceso', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3659, 'Ticket 16-9', 'Ticket automático 9 del usuario user12', '', NULL, 'baja', 'Cerrado', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3660, 'Ticket 16-10', 'Ticket automático 10 del usuario user12', 'soporte', NULL, 'media', 'Resuelto', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3661, 'Ticket 16-11', 'Ticket automático 11 del usuario user12', 'soporte', NULL, 'critica', 'Cerrado', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3662, 'Ticket 16-12', 'Ticket automático 12 del usuario user12', '', NULL, 'baja', 'Resuelto', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3663, 'Ticket 16-13', 'Ticket automático 13 del usuario user12', 'otro', NULL, 'critica', 'En Proceso', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(3664, 'Ticket 16-14', 'Ticket automático 14 del usuario user12', 'soporte', NULL, 'critica', 'En Proceso', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(3665, 'Ticket 16-15', 'Ticket automático 15 del usuario user12', 'otro', NULL, 'media', 'En Proceso', 16, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5316, 'Ticket 17-1', 'Ticket automático 1 del usuario user13', '', NULL, 'baja', 'En Proceso', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5317, 'Ticket 17-2', 'Ticket automático 2 del usuario user13', 'otro', NULL, 'media', 'Abierto', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5318, 'Ticket 17-3', 'Ticket automático 3 del usuario user13', 'soporte', NULL, 'alta', 'Cerrado', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5319, 'Ticket 17-4', 'Ticket automático 4 del usuario user13', 'soporte', NULL, 'critica', 'Abierto', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5320, 'Ticket 17-5', 'Ticket automático 5 del usuario user13', 'soporte', NULL, 'media', 'Cerrado', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5321, 'Ticket 17-6', 'Ticket automático 6 del usuario user13', 'soporte', NULL, 'alta', 'Abierto', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5322, 'Ticket 17-7', 'Ticket automático 7 del usuario user13', 'soporte', NULL, 'media', 'En Proceso', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5323, 'Ticket 17-8', 'Ticket automático 8 del usuario user13', 'otro', NULL, 'critica', 'En Proceso', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5324, 'Ticket 17-9', 'Ticket automático 9 del usuario user13', 'soporte', NULL, 'baja', 'Abierto', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5325, 'Ticket 17-10', 'Ticket automático 10 del usuario user13', '', NULL, 'alta', 'En Proceso', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5326, 'Ticket 17-11', 'Ticket automático 11 del usuario user13', 'soporte', NULL, 'media', 'En Proceso', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5327, 'Ticket 17-12', 'Ticket automático 12 del usuario user13', 'soporte', NULL, 'alta', 'En Proceso', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5328, 'Ticket 17-13', 'Ticket automático 13 del usuario user13', 'otro', NULL, 'media', 'Cerrado', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(5329, 'Ticket 17-14', 'Ticket automático 14 del usuario user13', '', NULL, 'alta', 'Resuelto', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(5330, 'Ticket 17-15', 'Ticket automático 15 del usuario user13', 'soporte', NULL, 'alta', 'Cerrado', 17, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(6981, 'Ticket 18-1', 'Ticket automático 1 del usuario user14', '', NULL, 'critica', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6982, 'Ticket 18-2', 'Ticket automático 2 del usuario user14', '', NULL, 'alta', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6983, 'Ticket 18-3', 'Ticket automático 3 del usuario user14', 'soporte', NULL, 'media', 'Resuelto', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6984, 'Ticket 18-4', 'Ticket automático 4 del usuario user14', 'soporte', NULL, 'media', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6985, 'Ticket 18-5', 'Ticket automático 5 del usuario user14', 'soporte', NULL, 'alta', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(6986, 'Ticket 18-6', 'Ticket automático 6 del usuario user14', '', NULL, 'critica', 'Resuelto', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6987, 'Ticket 18-7', 'Ticket automático 7 del usuario user14', '', NULL, 'media', 'Abierto', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6988, 'Ticket 18-8', 'Ticket automático 8 del usuario user14', '', NULL, 'baja', 'Abierto', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6989, 'Ticket 18-9', 'Ticket automático 9 del usuario user14', '', NULL, 'alta', 'Cerrado', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6990, 'Ticket 18-10', 'Ticket automático 10 del usuario user14', '', NULL, 'alta', 'Resuelto', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6991, 'Ticket 18-11', 'Ticket automático 11 del usuario user14', 'soporte', NULL, 'media', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(6992, 'Ticket 18-12', 'Ticket automático 12 del usuario user14', 'otro', NULL, 'media', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(6993, 'Ticket 18-13', 'Ticket automático 13 del usuario user14', '', NULL, 'critica', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6994, 'Ticket 18-14', 'Ticket automático 14 del usuario user14', 'soporte', NULL, 'baja', 'En Proceso', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(6995, 'Ticket 18-15', 'Ticket automático 15 del usuario user14', 'soporte', NULL, 'baja', 'Cerrado', 18, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(8646, 'Ticket 19-1', 'Ticket automático 1 del usuario user15', '', NULL, 'media', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(8647, 'Ticket 19-2', 'Ticket automático 2 del usuario user15', 'soporte', NULL, 'baja', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8648, 'Ticket 19-3', 'Ticket automático 3 del usuario user15', '', NULL, 'critica', 'Cerrado', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(8649, 'Ticket 19-4', 'Ticket automático 4 del usuario user15', 'soporte', NULL, 'alta', 'Abierto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8650, 'Ticket 19-5', 'Ticket automático 5 del usuario user15', 'otro', NULL, 'alta', 'Cerrado', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8651, 'Ticket 19-6', 'Ticket automático 6 del usuario user15', 'otro', NULL, 'media', 'Abierto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8652, 'Ticket 19-7', 'Ticket automático 7 del usuario user15', 'otro', NULL, 'alta', 'Abierto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8653, 'Ticket 19-8', 'Ticket automático 8 del usuario user15', 'otro', NULL, 'critica', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8654, 'Ticket 19-9', 'Ticket automático 9 del usuario user15', 'otro', NULL, 'baja', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8655, 'Ticket 19-10', 'Ticket automático 10 del usuario user15', 'soporte', NULL, 'media', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8656, 'Ticket 19-11', 'Ticket automático 11 del usuario user15', '', NULL, 'baja', 'En Proceso', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(8657, 'Ticket 19-12', 'Ticket automático 12 del usuario user15', 'soporte', NULL, 'media', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(8658, 'Ticket 19-13', 'Ticket automático 13 del usuario user15', 'otro', NULL, 'baja', 'Resuelto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8659, 'Ticket 19-14', 'Ticket automático 14 del usuario user15', 'otro', NULL, 'critica', 'En Proceso', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(8660, 'Ticket 19-15', 'Ticket automático 15 del usuario user15', 'soporte', NULL, 'alta', 'Abierto', 19, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10311, 'Ticket 20-1', 'Ticket automático 1 del usuario user16', 'soporte', NULL, 'alta', 'Abierto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10312, 'Ticket 20-2', 'Ticket automático 2 del usuario user16', 'soporte', NULL, 'baja', 'Cerrado', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10313, 'Ticket 20-3', 'Ticket automático 3 del usuario user16', '', NULL, 'media', 'Abierto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10314, 'Ticket 20-4', 'Ticket automático 4 del usuario user16', 'soporte', NULL, 'baja', 'Resuelto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10315, 'Ticket 20-5', 'Ticket automático 5 del usuario user16', '', NULL, 'media', 'Cerrado', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10316, 'Ticket 20-6', 'Ticket automático 6 del usuario user16', 'soporte', NULL, 'media', 'Cerrado', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(10317, 'Ticket 20-7', 'Ticket automático 7 del usuario user16', 'soporte', NULL, 'alta', 'Resuelto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10318, 'Ticket 20-8', 'Ticket automático 8 del usuario user16', 'soporte', NULL, 'critica', 'Abierto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10319, 'Ticket 20-9', 'Ticket automático 9 del usuario user16', '', NULL, 'critica', 'Abierto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10320, 'Ticket 20-10', 'Ticket automático 10 del usuario user16', '', NULL, 'alta', 'Resuelto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10321, 'Ticket 20-11', 'Ticket automático 11 del usuario user16', 'otro', NULL, 'media', 'Resuelto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(10322, 'Ticket 20-12', 'Ticket automático 12 del usuario user16', '', NULL, 'media', 'En Proceso', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(10323, 'Ticket 20-13', 'Ticket automático 13 del usuario user16', 'soporte', NULL, 'alta', 'Cerrado', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(10324, 'Ticket 20-14', 'Ticket automático 14 del usuario user16', 'otro', NULL, 'alta', 'En Proceso', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(10325, 'Ticket 20-15', 'Ticket automático 15 del usuario user16', 'otro', NULL, 'critica', 'Abierto', 20, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16971, 'Ticket 6-1', 'Ticket automático 1 del usuario user2', 'soporte', NULL, 'baja', 'Resuelto', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16972, 'Ticket 6-2', 'Ticket automático 2 del usuario user2', 'otro', NULL, 'critica', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16973, 'Ticket 6-3', 'Ticket automático 3 del usuario user2', 'soporte', NULL, 'alta', 'Resuelto', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16974, 'Ticket 6-4', 'Ticket automático 4 del usuario user2', 'otro', NULL, 'alta', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16975, 'Ticket 6-5', 'Ticket automático 5 del usuario user2', 'soporte', NULL, 'baja', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16976, 'Ticket 6-6', 'Ticket automático 6 del usuario user2', 'soporte', NULL, 'critica', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16977, 'Ticket 6-7', 'Ticket automático 7 del usuario user2', 'soporte', NULL, 'critica', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16978, 'Ticket 6-8', 'Ticket automático 8 del usuario user2', '', NULL, 'critica', 'En Proceso', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16979, 'Ticket 6-9', 'Ticket automático 9 del usuario user2', '', NULL, 'alta', 'Abierto', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16980, 'Ticket 6-10', 'Ticket automático 10 del usuario user2', 'soporte', NULL, 'media', 'Resuelto', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16981, 'Ticket 6-11', 'Ticket automático 11 del usuario user2', 'otro', NULL, 'alta', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16982, 'Ticket 6-12', 'Ticket automático 12 del usuario user2', '', NULL, 'baja', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16983, 'Ticket 6-13', 'Ticket automático 13 del usuario user2', 'soporte', NULL, 'critica', 'En Proceso', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(16984, 'Ticket 6-14', 'Ticket automático 14 del usuario user2', 'otro', NULL, 'baja', 'Cerrado', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(16985, 'Ticket 6-15', 'Ticket automático 15 del usuario user2', 'otro', NULL, 'media', 'Resuelto', 6, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18651, 'Ticket 7-1', 'Ticket automático 1 del usuario user3', 'otro', NULL, 'baja', 'Resuelto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18652, 'Ticket 7-2', 'Ticket automático 2 del usuario user3', 'soporte', NULL, 'baja', 'Resuelto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18653, 'Ticket 7-3', 'Ticket automático 3 del usuario user3', 'soporte', NULL, 'baja', 'Abierto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18654, 'Ticket 7-4', 'Ticket automático 4 del usuario user3', 'otro', NULL, 'media', 'Resuelto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18655, 'Ticket 7-5', 'Ticket automático 5 del usuario user3', 'soporte', NULL, 'baja', 'Resuelto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18656, 'Ticket 7-6', 'Ticket automático 6 del usuario user3', 'soporte', NULL, 'baja', 'Cerrado', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18657, 'Ticket 7-7', 'Ticket automático 7 del usuario user3', '', NULL, 'alta', 'En Proceso', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18658, 'Ticket 7-8', 'Ticket automático 8 del usuario user3', 'soporte', NULL, 'baja', 'En Proceso', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18659, 'Ticket 7-9', 'Ticket automático 9 del usuario user3', 'soporte', NULL, 'media', 'Resuelto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18660, 'Ticket 7-10', 'Ticket automático 10 del usuario user3', '', NULL, 'critica', 'En Proceso', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18661, 'Ticket 7-11', 'Ticket automático 11 del usuario user3', 'soporte', NULL, 'media', 'En Proceso', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18662, 'Ticket 7-12', 'Ticket automático 12 del usuario user3', 'soporte', NULL, 'baja', 'Resuelto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18663, 'Ticket 7-13', 'Ticket automático 13 del usuario user3', 'soporte', NULL, 'alta', 'En Proceso', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(18664, 'Ticket 7-14', 'Ticket automático 14 del usuario user3', 'soporte', NULL, 'baja', 'Cerrado', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(18665, 'Ticket 7-15', 'Ticket automático 15 del usuario user3', '', NULL, 'critica', 'Abierto', 7, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20316, 'Ticket 8-1', 'Ticket automático 1 del usuario user4', 'otro', NULL, 'media', 'Resuelto', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20317, 'Ticket 8-2', 'Ticket automático 2 del usuario user4', '', NULL, 'media', 'Cerrado', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20318, 'Ticket 8-3', 'Ticket automático 3 del usuario user4', 'soporte', NULL, 'media', 'En Proceso', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20319, 'Ticket 8-4', 'Ticket automático 4 del usuario user4', '', NULL, 'critica', 'Cerrado', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20320, 'Ticket 8-5', 'Ticket automático 5 del usuario user4', 'soporte', NULL, 'alta', 'En Proceso', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20321, 'Ticket 8-6', 'Ticket automático 6 del usuario user4', 'soporte', NULL, 'alta', 'En Proceso', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20322, 'Ticket 8-7', 'Ticket automático 7 del usuario user4', 'otro', NULL, 'media', 'Abierto', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20323, 'Ticket 8-8', 'Ticket automático 8 del usuario user4', 'soporte', NULL, 'critica', 'Cerrado', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20324, 'Ticket 8-9', 'Ticket automático 9 del usuario user4', 'soporte', NULL, 'critica', 'Cerrado', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20325, 'Ticket 8-10', 'Ticket automático 10 del usuario user4', '', NULL, 'media', 'Abierto', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20326, 'Ticket 8-11', 'Ticket automático 11 del usuario user4', 'soporte', NULL, 'critica', 'Abierto', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20327, 'Ticket 8-12', 'Ticket automático 12 del usuario user4', 'otro', NULL, 'alta', 'Abierto', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20328, 'Ticket 8-13', 'Ticket automático 13 del usuario user4', '', NULL, 'critica', 'En Proceso', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(20329, 'Ticket 8-14', 'Ticket automático 14 del usuario user4', 'otro', NULL, 'alta', 'Abierto', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(20330, 'Ticket 8-15', 'Ticket automático 15 del usuario user4', 'soporte', NULL, 'critica', 'Cerrado', 8, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21981, 'Ticket 9-1', 'Ticket automático 1 del usuario user5', '', NULL, 'critica', 'En Proceso', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21982, 'Ticket 9-2', 'Ticket automático 2 del usuario user5', 'soporte', NULL, 'baja', 'Resuelto', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21983, 'Ticket 9-3', 'Ticket automático 3 del usuario user5', '', NULL, 'critica', 'Abierto', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21984, 'Ticket 9-4', 'Ticket automático 4 del usuario user5', 'otro', NULL, 'baja', 'En Proceso', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21985, 'Ticket 9-5', 'Ticket automático 5 del usuario user5', '', NULL, 'alta', 'Resuelto', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21986, 'Ticket 9-6', 'Ticket automático 6 del usuario user5', 'soporte', NULL, 'critica', 'Resuelto', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21987, 'Ticket 9-7', 'Ticket automático 7 del usuario user5', 'otro', NULL, 'alta', 'En Proceso', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21988, 'Ticket 9-8', 'Ticket automático 8 del usuario user5', '', NULL, 'alta', 'Abierto', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21989, 'Ticket 9-9', 'Ticket automático 9 del usuario user5', 'soporte', NULL, 'media', 'Cerrado', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21990, 'Ticket 9-10', 'Ticket automático 10 del usuario user5', 'otro', NULL, 'baja', 'En Proceso', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21991, 'Ticket 9-11', 'Ticket automático 11 del usuario user5', '', NULL, 'baja', 'Resuelto', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21992, 'Ticket 9-12', 'Ticket automático 12 del usuario user5', 'soporte', NULL, 'alta', 'Cerrado', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(21993, 'Ticket 9-13', 'Ticket automático 13 del usuario user5', 'soporte', NULL, 'baja', 'Cerrado', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21994, 'Ticket 9-14', 'Ticket automático 14 del usuario user5', 'otro', NULL, 'critica', 'En Proceso', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(21995, 'Ticket 9-15', 'Ticket automático 15 del usuario user5', 'soporte', NULL, 'alta', 'En Proceso', 9, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23646, 'Ticket 10-1', 'Ticket automático 1 del usuario user6', '', NULL, 'critica', 'En Proceso', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23647, 'Ticket 10-2', 'Ticket automático 2 del usuario user6', 'otro', NULL, 'alta', 'Cerrado', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(23648, 'Ticket 10-3', 'Ticket automático 3 del usuario user6', '', NULL, 'critica', 'Cerrado', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23649, 'Ticket 10-4', 'Ticket automático 4 del usuario user6', 'soporte', NULL, 'baja', 'En Proceso', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23650, 'Ticket 10-5', 'Ticket automático 5 del usuario user6', 'otro', NULL, 'alta', 'En Proceso', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(23651, 'Ticket 10-6', 'Ticket automático 6 del usuario user6', 'soporte', NULL, 'alta', 'En Proceso', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(23652, 'Ticket 10-7', 'Ticket automático 7 del usuario user6', '', NULL, 'media', 'Abierto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23653, 'Ticket 10-8', 'Ticket automático 8 del usuario user6', 'soporte', NULL, 'critica', 'Resuelto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(23654, 'Ticket 10-9', 'Ticket automático 9 del usuario user6', 'soporte', NULL, 'alta', 'Abierto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(23655, 'Ticket 10-10', 'Ticket automático 10 del usuario user6', '', NULL, 'critica', 'Abierto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23656, 'Ticket 10-11', 'Ticket automático 11 del usuario user6', 'otro', NULL, 'critica', 'Resuelto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(23657, 'Ticket 10-12', 'Ticket automático 12 del usuario user6', '', NULL, 'baja', 'Abierto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23658, 'Ticket 10-13', 'Ticket automático 13 del usuario user6', 'soporte', NULL, 'media', 'Resuelto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23659, 'Ticket 10-14', 'Ticket automático 14 del usuario user6', '', NULL, 'baja', 'Resuelto', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(23660, 'Ticket 10-15', 'Ticket automático 15 del usuario user6', 'soporte', NULL, 'alta', 'En Proceso', 10, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(25311, 'Ticket 11-1', 'Ticket automático 1 del usuario user7', 'otro', NULL, 'media', 'En Proceso', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25312, 'Ticket 11-2', 'Ticket automático 2 del usuario user7', 'otro', NULL, 'critica', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25313, 'Ticket 11-3', 'Ticket automático 3 del usuario user7', '', NULL, 'alta', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(25314, 'Ticket 11-4', 'Ticket automático 4 del usuario user7', 'soporte', NULL, 'baja', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(25315, 'Ticket 11-5', 'Ticket automático 5 del usuario user7', 'soporte', NULL, 'baja', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25316, 'Ticket 11-6', 'Ticket automático 6 del usuario user7', 'otro', NULL, 'baja', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25317, 'Ticket 11-7', 'Ticket automático 7 del usuario user7', 'soporte', NULL, 'alta', 'Resuelto', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25318, 'Ticket 11-8', 'Ticket automático 8 del usuario user7', 'otro', NULL, 'baja', 'Resuelto', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25319, 'Ticket 11-9', 'Ticket automático 9 del usuario user7', 'soporte', NULL, 'alta', 'Resuelto', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25320, 'Ticket 11-10', 'Ticket automático 10 del usuario user7', 'otro', NULL, 'alta', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25321, 'Ticket 11-11', 'Ticket automático 11 del usuario user7', '', NULL, 'baja', 'En Proceso', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(25322, 'Ticket 11-12', 'Ticket automático 12 del usuario user7', 'soporte', NULL, 'alta', 'Resuelto', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(25323, 'Ticket 11-13', 'Ticket automático 13 del usuario user7', 'soporte', NULL, 'critica', 'Abierto', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(25324, 'Ticket 11-14', 'Ticket automático 14 del usuario user7', '', NULL, 'media', 'Cerrado', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(25325, 'Ticket 11-15', 'Ticket automático 15 del usuario user7', 'soporte', NULL, 'critica', 'Resuelto', 11, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(26976, 'Ticket 12-1', 'Ticket automático 1 del usuario user8', 'soporte', NULL, 'media', 'Cerrado', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(26977, 'Ticket 12-2', 'Ticket automático 2 del usuario user8', 'soporte', NULL, 'critica', 'Abierto', 12, 8, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26978, 'Ticket 12-3', 'Ticket automático 3 del usuario user8', 'soporte', NULL, 'baja', 'En Proceso', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(26979, 'Ticket 12-4', 'Ticket automático 4 del usuario user8', 'soporte', NULL, 'media', 'Abierto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26980, 'Ticket 12-5', 'Ticket automático 5 del usuario user8', 'otro', NULL, 'critica', 'Resuelto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26981, 'Ticket 12-6', 'Ticket automático 6 del usuario user8', 'soporte', NULL, 'media', 'Resuelto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26982, 'Ticket 12-7', 'Ticket automático 7 del usuario user8', 'otro', NULL, 'media', 'Resuelto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26983, 'Ticket 12-8', 'Ticket automático 8 del usuario user8', 'soporte', NULL, 'baja', 'Resuelto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(26984, 'Ticket 12-9', 'Ticket automático 9 del usuario user8', '', NULL, 'alta', 'Abierto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(26985, 'Ticket 12-10', 'Ticket automático 10 del usuario user8', 'otro', NULL, 'critica', 'Resuelto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26986, 'Ticket 12-11', 'Ticket automático 11 del usuario user8', 'soporte', NULL, 'alta', 'Abierto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(26987, 'Ticket 12-12', 'Ticket automático 12 del usuario user8', 'otro', NULL, 'alta', 'Abierto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26988, 'Ticket 12-13', 'Ticket automático 13 del usuario user8', 'otro', NULL, 'media', 'Resuelto', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26989, 'Ticket 12-14', 'Ticket automático 14 del usuario user8', 'soporte', NULL, 'media', 'En Proceso', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(26990, 'Ticket 12-15', 'Ticket automático 15 del usuario user8', 'otro', NULL, 'media', 'Cerrado', 12, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28641, 'Ticket 13-1', 'Ticket automático 1 del usuario user9', 'soporte', NULL, 'critica', 'En Proceso', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28642, 'Ticket 13-2', 'Ticket automático 2 del usuario user9', 'otro', NULL, 'critica', 'En Proceso', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28643, 'Ticket 13-3', 'Ticket automático 3 del usuario user9', 'soporte', NULL, 'alta', 'Cerrado', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL);
INSERT INTO `tickets` (`id`, `titulo`, `descripcion`, `categoria`, `subcategoria`, `prioridad`, `estado`, `id_usuario`, `id_asignado`, `archivo_adjunto`, `fecha_creacion`, `fecha_actualizacion`, `fecha_cierre`, `motivo_cierre`, `usuario_cierre`) VALUES
(28644, 'Ticket 13-4', 'Ticket automático 4 del usuario user9', 'soporte', NULL, 'media', 'Resuelto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28645, 'Ticket 13-5', 'Ticket automático 5 del usuario user9', 'otro', NULL, 'media', 'En Proceso', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28646, 'Ticket 13-6', 'Ticket automático 6 del usuario user9', '', NULL, 'critica', 'Abierto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(28647, 'Ticket 13-7', 'Ticket automático 7 del usuario user9', 'soporte', NULL, 'baja', 'Resuelto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(28648, 'Ticket 13-8', 'Ticket automático 8 del usuario user9', '', NULL, 'baja', 'En Proceso', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(28649, 'Ticket 13-9', 'Ticket automático 9 del usuario user9', 'soporte', NULL, 'critica', 'Abierto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28650, 'Ticket 13-10', 'Ticket automático 10 del usuario user9', 'soporte', NULL, 'media', 'En Proceso', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28651, 'Ticket 13-11', 'Ticket automático 11 del usuario user9', 'otro', NULL, 'critica', 'Abierto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(28652, 'Ticket 13-12', 'Ticket automático 12 del usuario user9', 'soporte', NULL, 'media', 'Abierto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(28653, 'Ticket 13-13', 'Ticket automático 13 del usuario user9', '', NULL, 'critica', 'En Proceso', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(28654, 'Ticket 13-14', 'Ticket automático 14 del usuario user9', 'soporte', NULL, 'critica', 'Resuelto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(28655, 'Ticket 13-15', 'Ticket automático 15 del usuario user9', 'soporte', NULL, 'media', 'Abierto', 13, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30306, 'Ticket 2-1', 'Ticket automático 1 del usuario usuario', 'soporte', NULL, 'baja', 'Cerrado', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30307, 'Ticket 2-2', 'Ticket automático 2 del usuario usuario', 'soporte', NULL, 'critica', 'Abierto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30308, 'Ticket 2-3', 'Ticket automático 3 del usuario usuario', 'soporte', NULL, 'media', 'En Proceso', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30309, 'Ticket 2-4', 'Ticket automático 4 del usuario usuario', 'otro', NULL, 'baja', 'En Proceso', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30310, 'Ticket 2-5', 'Ticket automático 5 del usuario usuario', 'soporte', NULL, 'critica', 'Resuelto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30311, 'Ticket 2-6', 'Ticket automático 6 del usuario usuario', 'otro', NULL, 'media', 'Abierto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30312, 'Ticket 2-7', 'Ticket automático 7 del usuario usuario', 'soporte', NULL, 'baja', 'Resuelto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30313, 'Ticket 2-8', 'Ticket automático 8 del usuario usuario', '', NULL, 'alta', 'Cerrado', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30314, 'Ticket 2-9', 'Ticket automático 9 del usuario usuario', 'otro', NULL, 'alta', 'Cerrado', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30315, 'Ticket 2-10', 'Ticket automático 10 del usuario usuario', 'soporte', NULL, 'baja', 'Resuelto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30316, 'Ticket 2-11', 'Ticket automático 11 del usuario usuario', 'soporte', NULL, 'critica', 'Cerrado', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30317, 'Ticket 2-12', 'Ticket automático 12 del usuario usuario', 'soporte', NULL, 'media', 'En Proceso', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30318, 'Ticket 2-13', 'Ticket automático 13 del usuario usuario', 'soporte', NULL, 'baja', 'Abierto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30319, 'Ticket 2-14', 'Ticket automático 14 del usuario usuario', 'soporte', NULL, 'critica', 'Cerrado', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-11 00:25:08', NULL, NULL, NULL),
(30320, 'Ticket 2-15', 'Ticket automático 15 del usuario usuario', 'otro', NULL, 'critica', 'Abierto', 2, NULL, NULL, '2026-02-10 04:04:46', '2026-02-10 04:04:46', NULL, NULL, NULL),
(30321, 'Prueba filtro', 'Es la prueba de filtro', 'Software', 'Office (Word, Excel, etc)', 'critica', 'Abierto', 2, 4, NULL, '2026-02-10 23:39:05', '2026-02-11 01:02:17', NULL, NULL, NULL);

--
-- Disparadores `tickets`
--
DELIMITER $$
CREATE TRIGGER `after_ticket_assign` AFTER UPDATE ON `tickets` FOR EACH ROW BEGIN
    IF OLD.id_asignado != NEW.id_asignado OR (OLD.id_asignado IS NULL AND NEW.id_asignado IS NOT NULL) THEN
        INSERT INTO asignaciones_tickets (id_ticket, id_usuario_asignado, id_usuario_asigna, fecha_asignacion)
        SELECT NEW.id, NEW.id_asignado, @current_user_id, NOW()
        WHERE NEW.id_asignado IS NOT NULL;
    END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_ticket_update` AFTER UPDATE ON `tickets` FOR EACH ROW BEGIN
    IF OLD.estado != NEW.estado THEN
        INSERT INTO historial_tickets (id_ticket, id_usuario, accion, valor_anterior, valor_nuevo, descripcion)
        VALUES (NEW.id, NEW.id_asignado, 'cambio_estado', OLD.estado, NEW.estado, 
                CONCAT('Estado cambiado de ', OLD.estado, ' a ', NEW.estado));
    END IF;
    
    IF OLD.id_asignado != NEW.id_asignado OR (OLD.id_asignado IS NULL AND NEW.id_asignado IS NOT NULL) THEN
        INSERT INTO historial_tickets (id_ticket, id_usuario, accion, valor_anterior, valor_nuevo, descripcion)
        VALUES (NEW.id, NEW.id_asignado, 'asignacion', OLD.id_asignado, NEW.id_asignado,
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
(1, 'Administrador', NULL, 'Sistema', NULL, 'admin', '$2y$12$XuWTLgteInkFrvMzhllAnuWEyc8Pi1KU7g6UP3MvtoMC38zjsSlMe', 1, 1, 'admin@sistema.com', NULL, '2026-02-11 00:59:47', 0, '2026-02-08 22:19:13', '2026-02-11 00:59:47'),
(2, 'Usuario', NULL, 'Prueba', NULL, 'usuario', '$2y$12$XuWTLgteInkFrvMzhllAnuWEyc8Pi1KU7g6UP3MvtoMC38zjsSlMe', 4, 1, 'usuario@test.com', NULL, '2026-02-11 01:18:53', 0, '2026-02-08 22:19:13', '2026-02-11 01:18:53'),
(3, 'Michael', 'Andres', 'Moreno', 'Cruz', 'mmoreno', '$2y$12$XuWTLgteInkFrvMzhllAnuWEyc8Pi1KU7g6UP3MvtoMC38zjsSlMe', 1, 1, 'mmoreno@sistema.local', NULL, '2026-02-11 01:40:12', 0, '2026-02-08 22:22:21', '2026-02-11 01:40:12'),
(4, 'car', 'car', 'ca', 'ca', 'cca', '$2y$12$XuWTLgteInkFrvMzhllAnuWEyc8Pi1KU7g6UP3MvtoMC38zjsSlMe', 2, 1, 'cca@sistema.local', NULL, '2026-02-11 01:42:23', 0, '2026-02-10 01:55:49', '2026-02-11 01:42:23'),
(5, 'Nombre1', NULL, 'Apellido1', NULL, 'user1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user1@mail.com', NULL, '2026-02-10 04:01:18', 0, '2026-02-10 03:55:50', '2026-02-10 04:01:18'),
(6, 'Nombre2', NULL, 'Apellido2', NULL, 'user2', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user2@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(7, 'Nombre3', NULL, 'Apellido3', NULL, 'user3', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user3@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(8, 'Nombre4', NULL, 'Apellido4', NULL, 'user4', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user4@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(9, 'Nombre5', NULL, 'Apellido5', NULL, 'user5', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user5@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(10, 'Nombre6', NULL, 'Apellido6', NULL, 'user6', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user6@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(11, 'Nombre7', NULL, 'Apellido7', NULL, 'user7', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user7@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(12, 'Nombre8', NULL, 'Apellido8', NULL, 'user8', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user8@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(13, 'Nombre9', NULL, 'Apellido9', NULL, 'user9', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user9@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(14, 'Nombre10', NULL, 'Apellido10', NULL, 'user10', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user10@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(15, 'Nombre11', NULL, 'Apellido11', NULL, 'user11', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user11@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(16, 'Nombre12', NULL, 'Apellido12', NULL, 'user12', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user12@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(17, 'Nombre13', NULL, 'Apellido13', NULL, 'user13', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user13@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(18, 'Nombre14', NULL, 'Apellido14', NULL, 'user14', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user14@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(19, 'Nombre15', NULL, 'Apellido15', NULL, 'user15', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user15@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50'),
(20, 'Nombre16', NULL, 'Apellido16', NULL, 'user16', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'user16@mail.com', NULL, NULL, 0, '2026-02-10 03:55:50', '2026-02-10 03:55:50');

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

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_stats_usuarios`  AS SELECT `u`.`id` AS `id`, concat(`u`.`primer_nombre`,' ',`u`.`primer_apellido`) AS `nombre_completo`, count(distinct `t`.`id`) AS `total_tickets`, sum(case when `t`.`estado` = 'Abierto' then 1 else 0 end) AS `tickets_abiertos`, sum(case when `t`.`estado` = 'En Proceso' then 1 else 0 end) AS `tickets_proceso`, sum(case when `t`.`estado` = 'Cerrado' then 1 else 0 end) AS `tickets_cerrados` FROM (`usuarios` `u` left join `tickets` `t` on(`u`.`id` = `t`.`id_usuario`)) GROUP BY `u`.`id` ;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2142;

--
-- AUTO_INCREMENT de la tabla `historial_tickets`
--
ALTER TABLE `historial_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=200;

--
-- AUTO_INCREMENT de la tabla `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=596;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30322;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2005;

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
