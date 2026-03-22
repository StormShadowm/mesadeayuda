-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 22, 2026 at 06:25 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mesa_ayuda_final`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `GenerarDataMasiva` ()   BEGIN
    DECLARE i INT DEFAULT 100;
    DECLARE user_rand INT;
    DECLARE tech_rand INT;
    DECLARE fecha_rand DATETIME;
    
    WHILE i < 200 DO
        -- Seleccionar un usuario cliente aleatorio (IDs 14-33, excluyendo técnicos)
        SET user_rand = FLOOR(14 + (RAND() * 20));
        -- Seleccionar un técnico aleatorio (IDs 3, 4, 5, 16, 19, 22, 26, 30)
        SET tech_rand = ELT(FLOOR(1 + (RAND() * 8)), 3, 4, 5, 16, 19, 22, 26, 30);
        -- Fecha aleatoria en los últimos 30 días
        SET fecha_rand = DATE_SUB(NOW(), INTERVAL FLOOR(RAND() * 30 * 24 * 60) MINUTE);
        
        INSERT INTO `tickets` 
        (`id`, `titulo`, `descripcion`, `categoria`, `subcategoria`, `prioridad`, `estado`, `id_usuario`, `id_asignado`, `fecha_creacion`, `fecha_actualizacion`) 
        VALUES 
        (i, 
         CONCAT('Error reportado sistema #', i), 
         CONCAT('El usuario informa un fallo recurrente en el módulo indexado ', i, '. Requiere revisión técnica urgente.'), 
         ELT(FLOOR(1+(RAND()*6)), 'Hardware', 'Software', 'Red', 'Accesos', 'Soporte', 'Incidentes'),
         'General',
         ELT(FLOOR(1+(RAND()*4)), 'baja', 'media', 'alta', 'critica'),
         ELT(FLOOR(1+(RAND()*4)), 'Abierto', 'En Proceso', 'Resuelto', 'Cerrado'),
         user_rand, 
         tech_rand, 
         fecha_rand, 
         NOW());

        -- Insertar al menos 1 mensaje por ticket
        INSERT INTO `mensajes_ticket` (`id_ticket`, `id_usuario`, `mensaje`, `es_interno`, `fecha_envio`)
        VALUES (i, user_rand, 'Hola, sigo teniendo problemas con este caso.', 0, DATE_ADD(fecha_rand, INTERVAL 10 MINUTE));
        
        INSERT INTO `mensajes_ticket` (`id_ticket`, `id_usuario`, `mensaje`, `es_interno`, `fecha_envio`)
        VALUES (i, tech_rand, 'Estamos revisando su solicitud, le informaremos pronto.', 0, DATE_ADD(fecha_rand, INTERVAL 30 MINUTE));

        -- Insertar Historial de Ticket
        INSERT INTO `historial_tickets` (`id_ticket`, `id_usuario`, `accion`, `valor_anterior`, `valor_nuevo`, `descripcion`, `fecha`)
        VALUES (i, tech_rand, 'cambio_estado', 'Abierto', 'En Proceso', 'Se inicia revisión técnica', DATE_ADD(fecha_rand, INTERVAL 15 MINUTE));

        SET i = i + 1;
    END WHILE;
END$$

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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_exportar_estadisticas` (IN `p_fecha_desde` DATE, IN `p_fecha_hasta` DATE, IN `p_estado` VARCHAR(50), IN `p_prioridad` VARCHAR(50), IN `p_categoria` VARCHAR(100))   BEGIN
    SELECT 
        t.id,
        t.titulo,
        t.descripcion,
        t.categoria,
        t.subcategoria,
        t.prioridad,
        t.estado,
        CONCAT(u.primer_nombre, ' ', u.primer_apellido) as usuario,
        u.email as email_usuario,
        CONCAT(a.primer_nombre, ' ', a.primer_apellido) as asignado_a,
        ar.nombre as area,
        t.fecha_creacion,
        t.fecha_actualizacion,
        t.fecha_cierre,
        t.motivo_cierre,
        TIMESTAMPDIFF(HOUR, t.fecha_creacion, IFNULL(t.fecha_cierre, NOW())) as horas_resolucion,
        (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) as total_comentarios,
        CASE WHEN t.archivo_adjunto IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_adjunto
    FROM tickets t
    LEFT JOIN usuarios u ON t.id_usuario = u.id
    LEFT JOIN usuarios a ON t.id_asignado = a.id
    LEFT JOIN areas ar ON u.id_area = ar.id
    WHERE 
        (p_fecha_desde IS NULL OR DATE(t.fecha_creacion) >= p_fecha_desde)
        AND (p_fecha_hasta IS NULL OR DATE(t.fecha_creacion) <= p_fecha_hasta)
        AND (p_estado IS NULL OR p_estado = '' OR t.estado = p_estado)
        AND (p_prioridad IS NULL OR p_prioridad = '' OR t.prioridad = p_prioridad)
        AND (p_categoria IS NULL OR p_categoria = '' OR t.categoria = p_categoria)
    ORDER BY t.fecha_creacion DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_reabrir_ticket` (IN `p_id_ticket` INT, IN `p_id_usuario` INT, IN `p_motivo` TEXT)   BEGIN
    DECLARE v_id_ticket_original INT;
    DECLARE v_numero_reapertura INT;
    DECLARE v_puede_reabrir BOOLEAN;
    DECLARE v_id_rol INT;
    DECLARE v_es_creador BOOLEAN;
    
    -- Obtener rol del usuario
    SELECT id_rol_admin INTO v_id_rol
    FROM usuarios WHERE id = p_id_usuario;
    
    -- Verificar si es el creador del ticket
    SELECT (id_usuario = p_id_usuario) INTO v_es_creador
    FROM tickets WHERE id = p_id_ticket;
    
    -- Verificar permisos: Creador O Admin nivel 1-2
    SET v_puede_reabrir = (v_es_creador OR v_id_rol IN (1, 2));
    
    IF NOT v_puede_reabrir THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No tiene permisos para reabrir este ticket';
    END IF;
    
    -- Obtener información del ticket
    SELECT 
        COALESCE(id_ticket_original, id),
        numero_reapertura
    INTO 
        v_id_ticket_original,
        v_numero_reapertura
    FROM tickets 
    WHERE id = p_id_ticket;
    
    -- Incrementar número de reapertura
    SET v_numero_reapertura = v_numero_reapertura + 1;
    
    -- Actualizar ticket
    UPDATE tickets SET
        estado = 'Abierto',
        numero_reapertura = v_numero_reapertura,
        id_ticket_original = v_id_ticket_original,
        fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = p_id_ticket;
    
    -- Registrar en historial
    INSERT INTO historial_tickets 
    (id_ticket, id_usuario, accion, valor_anterior, valor_nuevo, descripcion)
    VALUES 
    (p_id_ticket, p_id_usuario, 'reapertura', 
     'Cerrado', 'Abierto', 
     CONCAT('Ticket reabierto. Reapertura #', v_numero_reapertura, '. Motivo: ', COALESCE(p_motivo, 'No especificado')));
    
    SELECT 
        p_id_ticket as id_ticket,
        v_numero_reapertura as numero_reapertura,
        CONCAT(v_id_ticket_original, '-', v_numero_reapertura) as nuevo_numero,
        'Ticket reabierto exitosamente' as mensaje;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `areas`
--

CREATE TABLE `areas` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`id`, `nombre`, `descripcion`, `activo`, `fecha_creacion`) VALUES
(1, 'Sistemas', 'Departamento de Sistemas e IT', 1, '2026-02-17 01:35:59'),
(2, 'Soporte Técnico', 'Área de soporte técnico', 1, '2026-02-17 01:35:59'),
(3, 'Administración', 'Área administrativa', 1, '2026-02-17 01:35:59'),
(4, 'Recursos Humanos', 'Departamento de RRHH', 1, '2026-02-17 01:35:59'),
(5, 'Ventas', 'Departamento de Ventas', 1, '2026-02-17 01:35:59'),
(6, 'Marketing', 'Área de Marketing', 1, '2026-02-17 01:35:59'),
(7, 'Finanzas', 'Departamento Financiero', 1, '2026-02-17 01:35:59'),
(8, 'Operaciones', 'Área de Operaciones', 1, '2026-02-17 01:35:59'),
(9, 'Gerencia', 'Gerencia General', 1, '2026-02-17 01:35:59'),
(10, 'Sin Asignar', 'Sin área específica', 1, '2026-02-17 01:35:59');

-- --------------------------------------------------------

--
-- Table structure for table `asignaciones_tickets`
--

CREATE TABLE `asignaciones_tickets` (
  `id` int NOT NULL,
  `id_ticket` int NOT NULL,
  `id_usuario_asignado` int NOT NULL,
  `id_usuario_asigna` int NOT NULL,
  `fecha_asignacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `asignaciones_tickets`
--

INSERT INTO `asignaciones_tickets` (`id`, `id_ticket`, `id_usuario_asignado`, `id_usuario_asigna`, `fecha_asignacion`, `activo`) VALUES
(1, 1, 4, 3, '2026-02-17 00:59:10', 1),
(2, 2, 5, 3, '2026-02-17 00:59:10', 1);

-- --------------------------------------------------------

--
-- Table structure for table `calificaciones_tickets`
--

CREATE TABLE `calificaciones_tickets` (
  `id` int NOT NULL,
  `id_ticket` int NOT NULL,
  `id_usuario` int NOT NULL COMMENT 'Usuario que califica (creador del ticket)',
  `calificacion` tinyint(1) NOT NULL COMMENT 'Calificación de 1 a 5',
  `comentario` text COLLATE utf8mb4_unicode_ci COMMENT 'Comentario explicativo',
  `numero_reapertura` int NOT NULL DEFAULT '0' COMMENT 'Número de reapertura cuando se calificó',
  `fecha_calificacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `calificaciones_tickets`
--

INSERT INTO `calificaciones_tickets` (`id`, `id_ticket`, `id_usuario`, `calificacion`, `comentario`, `numero_reapertura`, `fecha_calificacion`) VALUES
(17, 203, 17, 5, 'es de prueba', 1, '2026-03-04 02:39:07'),
(18, 205, 13, 1, 'No funciona la prueba', 0, '2026-03-05 00:21:00'),
(19, 203, 17, 5, 'es de prueba 0000', 0, '2026-03-05 00:38:32'),
(20, 203, 17, 5, 'prueba calificaion reabierto', 2, '2026-03-05 01:01:04'),
(21, 155, 17, 5, 'se hace prueba tickets cerrados luego de semanas', 0, '2026-03-05 01:36:18'),
(22, 205, 13, 5, 'Es de prueba', 1, '2026-03-12 01:48:59'),
(23, 142, 33, 5, '', 0, '2026-03-18 01:21:02'),
(24, 123, 33, 5, '', 0, '2026-03-18 01:21:08');

--
-- Triggers `calificaciones_tickets`
--
DELIMITER $$
CREATE TRIGGER `before_calificacion_insert` BEFORE INSERT ON `calificaciones_tickets` FOR EACH ROW BEGIN
    -- Validar que la calificación esté entre 1 y 5
    IF NEW.calificacion < 1 OR NEW.calificacion > 5 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La calificación debe estar entre 1 y 5';
    END IF;
    
    -- Validar que el ticket esté cerrado
    IF NOT EXISTS (
        SELECT 1 FROM tickets 
        WHERE id = NEW.id_ticket 
        AND estado IN ('Cerrado', 'Resuelto')
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo se pueden calificar tickets cerrados o resueltos';
    END IF;
    
    -- Validar que el usuario sea el creador del ticket
    IF NOT EXISTS (
        SELECT 1 FROM tickets 
        WHERE id = NEW.id_ticket 
        AND id_usuario = NEW.id_usuario
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Solo el creador del ticket puede calificarlo';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `categorias`
--

CREATE TABLE `categorias` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `orden` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categorias`
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
-- Table structure for table `configuracion`
--

CREATE TABLE `configuracion` (
  `id` int NOT NULL,
  `clave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `configuracion`
--

INSERT INTO `configuracion` (`id`, `clave`, `valor`, `descripcion`, `tipo`, `actualizado_en`) VALUES
(1, 'sistema_nombre', 'Mesa de Ayuda', 'Nombre del sistema', 'string', '2026-02-17 00:28:31'),
(2, 'tickets_por_pagina', '10', 'Cantidad de tickets por página', 'number', '2026-02-17 00:28:31'),
(3, 'tiempo_sesion', '1800', 'Tiempo de sesión en segundos', 'number', '2026-02-17 00:28:31'),
(4, 'permitir_registro', 'true', 'Permitir auto-registro de usuarios', 'boolean', '2026-02-17 00:28:31'),
(5, 'max_tamaño_archivo', '5242880', 'Tamaño máximo archivo en bytes (5MB)', 'number', '2026-02-17 00:28:31');

-- --------------------------------------------------------

--
-- Table structure for table `historial_inventario`
--

CREATE TABLE `historial_inventario` (
  `id` int NOT NULL,
  `id_inventario` int NOT NULL,
  `accion` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campo_modificado` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor_anterior` text COLLATE utf8mb4_unicode_ci,
  `valor_nuevo` text COLLATE utf8mb4_unicode_ci,
  `id_usuario` int NOT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `historial_inventario`
--

INSERT INTO `historial_inventario` (`id`, `id_inventario`, `accion`, `campo_modificado`, `valor_anterior`, `valor_nuevo`, `id_usuario`, `fecha`) VALUES
(1, 1, 'creacion', NULL, NULL, NULL, 13, '2026-03-22 04:20:55'),
(2, 2, 'creacion', NULL, NULL, NULL, 13, '2026-03-22 04:20:55'),
(3, 3, 'creacion', NULL, NULL, NULL, 13, '2026-03-22 04:20:55');

-- --------------------------------------------------------

--
-- Table structure for table `historial_login`
--

CREATE TABLE `historial_login` (
  `id` int NOT NULL,
  `id_usuario` int DEFAULT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exitoso` tinyint(1) NOT NULL COMMENT '1=Éxito, 0=Fallo',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `historial_login`
--

INSERT INTO `historial_login` (`id`, `id_usuario`, `usuario`, `exitoso`, `ip_address`, `user_agent`, `fecha`) VALUES
(1, 3, 'crodriguez', 1, '127.0.0.1', 'Chrome/Win10', '2026-02-17 00:59:10'),
(2, 7, 'jperez', 1, '127.0.0.1', 'Edge/Win11', '2026-02-17 00:59:10'),
(3, NULL, 'pdiaz', 0, '::1', NULL, '2026-02-17 00:59:41'),
(4, NULL, 'pdiaz', 0, '::1', NULL, '2026-02-17 01:00:03'),
(5, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:00:44'),
(6, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:01:09'),
(7, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:01:11'),
(8, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:37:41'),
(9, NULL, 'crodriguez', 0, '::1', NULL, '2026-02-17 01:37:44'),
(10, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:38:08'),
(11, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:38:23'),
(12, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 01:38:47'),
(13, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 01:39:05'),
(14, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:40:26'),
(15, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:40:54'),
(16, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:41:03'),
(17, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:41:09'),
(18, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:41:21'),
(19, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:53:08'),
(20, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 01:53:11'),
(21, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 01:59:50'),
(22, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 01:59:54'),
(23, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:02:22'),
(24, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:02:27'),
(25, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:02:53'),
(26, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:02:57'),
(27, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:09:07'),
(28, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:09:10'),
(29, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:09:27'),
(30, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:09:31'),
(31, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:11:19'),
(32, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:11:21'),
(33, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:11:34'),
(34, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:11:37'),
(35, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:13:39'),
(36, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:13:41'),
(37, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:14:30'),
(38, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:15:21'),
(39, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:15:25'),
(40, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:24:18'),
(41, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:24:22'),
(42, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:26:36'),
(43, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:26:42'),
(44, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 02:35:09'),
(45, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 02:35:12'),
(46, 14, 'afcano', 1, '::1', NULL, '2026-02-17 02:43:13'),
(47, 14, 'afcano', 1, '::1', NULL, '2026-02-17 02:44:23'),
(48, NULL, 'mgomez', 0, '::1', NULL, '2026-02-17 02:44:29'),
(49, 26, 'mgomez', 1, '::1', NULL, '2026-02-17 02:44:38'),
(50, 26, 'mgomez', 1, '::1', NULL, '2026-02-17 02:45:38'),
(51, 26, 'mgomez', 1, '::1', NULL, '2026-02-17 02:45:55'),
(52, 26, 'mgomez', 1, '::1', NULL, '2026-02-17 03:35:41'),
(53, 3, 'crodriguez', 1, '::1', NULL, '2026-02-17 23:11:52'),
(54, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:11:56'),
(55, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:26:02'),
(56, NULL, 'laura2', 0, '::1', NULL, '2026-02-17 23:26:05'),
(57, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:26:52'),
(58, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:30:07'),
(59, NULL, 'dmorjas', 0, '::1', NULL, '2026-02-17 23:30:11'),
(60, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:32:33'),
(61, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:32:37'),
(62, 17, 'dmrojas', 1, '::1', NULL, '2026-02-17 23:33:47'),
(63, 17, 'dmrojas', 1, '::1', NULL, '2026-02-17 23:36:30'),
(64, 13, 'mmoreno', 1, '::1', NULL, '2026-02-17 23:36:34'),
(65, 17, 'dmrojas', 1, '::1', NULL, '2026-02-18 03:25:05'),
(66, 13, 'mmoreno', 1, '::1', NULL, '2026-02-18 03:33:31'),
(67, 13, 'mmoreno', 1, '::1', NULL, '2026-02-18 03:33:33'),
(68, 13, 'mmoreno', 1, '::1', NULL, '2026-02-18 23:37:15'),
(69, 13, 'mmoreno', 1, '::1', NULL, '2026-02-18 23:37:17'),
(70, 13, 'mmoreno', 1, '::1', NULL, '2026-02-18 23:45:38'),
(71, 13, 'mmoreno', 1, '::1', NULL, '2026-02-18 23:45:41'),
(72, 17, 'dmrojas', 1, '::1', NULL, '2026-02-19 01:37:09'),
(73, 13, 'mmoreno', 1, '::1', NULL, '2026-02-19 23:33:45'),
(74, 17, 'dmrojas', 1, '::1', NULL, '2026-02-19 23:33:47'),
(75, 17, 'dmrojas', 1, '::1', NULL, '2026-02-19 23:33:53'),
(76, 13, 'mmoreno', 1, '::1', NULL, '2026-02-19 23:33:56'),
(77, 13, 'mmoreno', 1, '::1', NULL, '2026-02-20 00:11:17'),
(78, 13, 'mmoreno', 1, '::1', NULL, '2026-02-20 00:11:20'),
(79, 13, 'mmoreno', 1, '::1', NULL, '2026-02-20 04:00:23'),
(80, 13, 'mmoreno', 1, '::1', NULL, '2026-02-20 04:00:25'),
(81, 13, 'mmoreno', 1, '::1', NULL, '2026-02-20 04:12:04'),
(82, 13, 'mmoreno', 1, '::1', NULL, '2026-02-20 04:12:05'),
(83, 17, 'dmrojas', 1, '::1', NULL, '2026-02-21 00:10:54'),
(84, 13, 'mmoreno', 1, '::1', NULL, '2026-02-21 00:17:04'),
(85, 17, 'dmrojas', 1, '::1', NULL, '2026-02-21 00:18:23'),
(86, 13, 'mmoreno', 1, '::1', NULL, '2026-02-21 00:26:15'),
(87, 13, 'mmoreno', 1, '::1', NULL, '2026-02-21 17:44:18'),
(88, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 22:22:46'),
(89, 17, 'dmrojas', 1, '::1', NULL, '2026-02-22 22:23:09'),
(90, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 22:27:08'),
(91, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 22:39:52'),
(92, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 22:42:36'),
(93, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 22:43:49'),
(94, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 22:59:20'),
(95, 13, 'mmoreno', 1, '::1', NULL, '2026-02-22 23:03:06'),
(96, 13, 'mmoreno', 1, '::1', NULL, '2026-02-24 01:07:38'),
(97, 13, 'mmoreno', 1, '192.168.1.30', NULL, '2026-02-24 01:11:25'),
(98, 17, 'dmrojas', 1, '::1', NULL, '2026-02-24 02:28:46'),
(99, 17, 'dmrojas', 1, '::1', NULL, '2026-02-24 22:39:46'),
(100, 13, 'mmoreno', 1, '::1', NULL, '2026-02-24 22:40:24'),
(101, 17, 'dmrojas', 1, '::1', NULL, '2026-02-25 03:25:29'),
(102, 13, 'mmoreno', 1, '::1', NULL, '2026-02-25 03:43:01'),
(103, 17, 'dmrojas', 1, '::1', NULL, '2026-03-02 02:03:16'),
(104, 13, 'mmoreno', 1, '::1', NULL, '2026-03-02 02:03:41'),
(105, 13, 'mmoreno', 1, '::1', NULL, '2026-03-02 02:15:38'),
(106, 13, 'mmoreno', 1, '::1', NULL, '2026-03-02 02:20:13'),
(107, 17, 'dmrojas', 1, '::1', NULL, '2026-03-02 02:21:11'),
(108, 13, 'mmoreno', 1, '::1', NULL, '2026-03-02 02:22:19'),
(109, 17, 'dmrojas', 1, '::1', NULL, '2026-03-02 02:22:26'),
(110, NULL, 'dmorjas', 0, '::1', NULL, '2026-03-05 23:37:11'),
(111, NULL, 'dmrojas', 0, '::1', NULL, '2026-03-05 23:37:26'),
(112, NULL, 'mmoreno', 0, '127.0.0.1', NULL, '2026-03-10 00:40:02'),
(113, NULL, 'mmoreno', 0, '127.0.0.1', NULL, '2026-03-10 00:40:13'),
(114, NULL, 'dmorojas', 0, '127.0.0.1', NULL, '2026-03-11 02:38:11'),
(115, NULL, 'rabernal', 0, '127.0.0.1', NULL, '2026-03-14 19:01:24'),
(116, NULL, 'rabernal', 0, '127.0.0.1', NULL, '2026-03-14 19:01:39'),
(117, NULL, 'vlmendez', 0, '127.0.0.1', NULL, '2026-03-18 01:19:28'),
(118, NULL, 'vlmendez', 0, '127.0.0.1', NULL, '2026-03-18 01:19:37'),
(119, NULL, 'vlmede', 0, '127.0.0.1', NULL, '2026-03-18 02:08:33'),
(120, NULL, 'Angel Chaves Garzon', 0, '::1', NULL, '2026-03-22 17:38:54');

-- --------------------------------------------------------

--
-- Table structure for table `historial_logout`
--

CREATE TABLE `historial_logout` (
  `id` int NOT NULL,
  `id_usuario` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `historial_logout`
--

INSERT INTO `historial_logout` (`id`, `id_usuario`, `ip_address`, `user_agent`, `fecha`) VALUES
(1, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 00:16:57'),
(2, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-21 17:44:16'),
(3, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-22 22:41:06'),
(4, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-24 22:40:20'),
(5, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 02:03:37'),
(6, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 15:51:14'),
(7, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 20:22:57'),
(8, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 21:04:06'),
(9, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 21:05:40'),
(10, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-02 21:17:31'),
(11, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-04 01:54:16'),
(12, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 00:18:37'),
(13, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-05 00:50:07'),
(14, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 23:37:05'),
(15, 17, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-05 23:38:51'),
(16, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-06 00:01:56'),
(17, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-06 00:03:00'),
(18, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-11 01:55:10'),
(19, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-11 23:42:40'),
(20, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-11 23:46:07'),
(21, 36, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-11 23:46:50'),
(22, 13, '192.168.56.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-12 02:56:09'),
(23, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-13 00:56:19'),
(24, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-13 01:46:30'),
(25, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 00:16:22'),
(26, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 00:16:45'),
(27, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 00:17:47'),
(28, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 00:21:04'),
(29, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 00:36:28'),
(30, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 18:51:46'),
(31, 17, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 18:52:26'),
(32, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 18:59:22'),
(33, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:00:00'),
(34, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:01:17'),
(35, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:05:51'),
(36, 36, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:06:09'),
(37, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:06:29'),
(38, 36, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:07:08'),
(39, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-14 19:29:35'),
(40, 17, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:05:47'),
(41, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:17:37'),
(42, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:17:58'),
(43, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:18:53'),
(44, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:19:20'),
(45, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:21:32'),
(46, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:27:39'),
(47, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:28:10'),
(48, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:38:39'),
(49, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 01:47:34'),
(50, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:08:24'),
(51, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:11:43'),
(52, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:15:13'),
(53, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:17:39'),
(54, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:17:50'),
(55, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-18 02:19:22'),
(56, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:20:25'),
(57, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:44:03'),
(58, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:49:48'),
(59, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 02:55:36'),
(60, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0', '2026-03-18 03:07:27'),
(61, 33, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 03:08:25'),
(62, 35, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-18 03:08:48'),
(63, 13, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-19 01:13:00'),
(64, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 17:34:54'),
(65, 13, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 17:37:35'),
(66, 37, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-22 17:45:56'),
(67, 37, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0', '2026-03-22 18:07:42');

-- --------------------------------------------------------

--
-- Table structure for table `historial_tickets`
--

CREATE TABLE `historial_tickets` (
  `id` int NOT NULL,
  `id_ticket` int NOT NULL,
  `id_usuario` int NOT NULL COMMENT 'Usuario que realizó el cambio',
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej: cambio_estado, asignacion, etc.',
  `campo_modificado` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor_anterior` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valor_nuevo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `historial_tickets`
--

INSERT INTO `historial_tickets` (`id`, `id_ticket`, `id_usuario`, `accion`, `campo_modificado`, `valor_anterior`, `valor_nuevo`, `descripcion`, `fecha`) VALUES
(1, 11, 3, 'asignacion', NULL, NULL, '3', 'Ticket asignado a nuevo usuario', '2026-02-17 02:09:43'),
(2, 2, 5, 'cambio_estado', NULL, 'En Proceso', 'Abierto', 'Estado cambiado de En Proceso a Abierto', '2026-02-17 02:10:57'),
(3, 3, 4, 'cambio_estado', NULL, 'Resuelto', 'Abierto', 'Estado cambiado de Resuelto a Abierto', '2026-02-17 02:10:57'),
(4, 4, 3, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-02-17 02:10:57'),
(5, 5, 5, 'cambio_estado', NULL, 'En Proceso', 'Abierto', 'Estado cambiado de En Proceso a Abierto', '2026-02-17 02:10:57'),
(6, 7, 4, 'cambio_estado', NULL, 'En Proceso', 'Abierto', 'Estado cambiado de En Proceso a Abierto', '2026-02-17 02:10:57'),
(7, 9, 3, 'cambio_estado', NULL, 'Resuelto', 'Abierto', 'Estado cambiado de Resuelto a Abierto', '2026-02-17 02:10:57'),
(8, 10, 3, 'cambio_estado', NULL, 'Resuelto', 'Abierto', 'Estado cambiado de Resuelto a Abierto', '2026-02-17 02:10:57'),
(9, 100, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-24 18:20:37'),
(10, 101, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-06 07:49:37'),
(11, 102, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-13 13:59:38'),
(12, 103, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-05 06:51:38'),
(13, 104, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-22 16:49:38'),
(14, 105, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-23 18:55:38'),
(15, 106, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-30 04:38:38'),
(16, 107, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 02:38:38'),
(17, 108, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-12 00:26:38'),
(18, 109, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-19 06:50:38'),
(19, 110, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 19:32:38'),
(20, 111, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-23 01:33:38'),
(21, 112, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-11 00:41:38'),
(22, 113, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-13 13:36:38'),
(23, 114, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-16 14:58:38'),
(24, 115, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-15 08:01:38'),
(25, 116, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-15 14:48:38'),
(26, 117, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 12:43:38'),
(27, 118, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-13 18:52:38'),
(28, 119, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-29 17:54:38'),
(29, 120, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-13 02:41:38'),
(30, 121, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-24 18:25:38'),
(31, 122, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-23 02:29:38'),
(32, 123, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-27 08:20:38'),
(33, 124, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-29 10:27:38'),
(34, 125, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-16 06:10:38'),
(35, 126, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-22 06:53:38'),
(36, 127, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-20 17:27:38'),
(37, 128, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-12 22:24:38'),
(38, 129, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-08 11:01:38'),
(39, 130, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-28 07:28:38'),
(40, 131, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-11 06:23:38'),
(41, 132, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 13:19:38'),
(42, 133, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-04 21:35:38'),
(43, 134, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-31 22:09:38'),
(44, 135, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-30 17:55:38'),
(45, 136, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-24 20:01:38'),
(46, 137, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 11:21:38'),
(47, 138, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-21 23:53:38'),
(48, 139, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 20:17:38'),
(49, 140, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-05 08:47:38'),
(50, 141, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 05:53:38'),
(51, 142, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 14:58:38'),
(52, 143, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-15 02:19:38'),
(53, 144, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-10 13:27:38'),
(54, 145, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-26 08:04:38'),
(55, 146, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-19 05:48:38'),
(56, 147, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-28 02:12:38'),
(57, 148, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-06 16:52:38'),
(58, 149, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-07 23:30:38'),
(59, 150, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-22 18:49:38'),
(60, 151, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-28 22:51:38'),
(61, 152, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-08 22:37:38'),
(62, 153, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-04 12:54:38'),
(63, 154, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 22:45:38'),
(64, 155, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-25 12:22:38'),
(65, 156, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-28 05:30:38'),
(66, 157, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-27 16:51:38'),
(67, 158, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-16 20:15:38'),
(68, 159, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-27 15:39:38'),
(69, 160, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 21:06:38'),
(70, 161, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-28 22:38:38'),
(71, 162, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-21 01:03:38'),
(72, 163, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-22 12:28:38'),
(73, 164, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-24 17:46:38'),
(74, 165, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-21 03:04:38'),
(75, 166, 4, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 03:07:38'),
(76, 167, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-07 01:27:38'),
(77, 168, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-01 06:08:38'),
(78, 169, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-27 00:53:38'),
(79, 170, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-28 01:03:38'),
(80, 171, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-21 15:44:38'),
(81, 172, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-30 03:20:38'),
(82, 173, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-19 23:24:38'),
(83, 174, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-19 01:57:38'),
(84, 175, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-12 11:12:38'),
(85, 176, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 07:51:38'),
(86, 177, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-01 03:34:38'),
(87, 178, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-20 04:39:38'),
(88, 179, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-02 01:10:38'),
(89, 180, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-23 11:43:38'),
(90, 181, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-02 02:30:38'),
(91, 182, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-12 03:48:38'),
(92, 183, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-16 13:05:38'),
(93, 184, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-03 16:25:38'),
(94, 185, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-31 21:16:38'),
(95, 186, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-21 19:32:38'),
(96, 187, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-01 18:23:38'),
(97, 188, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-18 17:12:38'),
(98, 189, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-15 12:09:38'),
(99, 190, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-09 04:44:38'),
(100, 191, 3, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-13 18:38:38'),
(101, 192, 5, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-15 14:12:38'),
(102, 193, 30, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-07 02:58:38'),
(103, 194, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-25 16:51:38'),
(104, 195, 16, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-31 10:37:38'),
(105, 196, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-01 19:40:38'),
(106, 197, 19, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-30 02:52:38'),
(107, 198, 26, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-02-08 11:29:38'),
(108, 199, 22, 'cambio_estado', NULL, 'Abierto', 'En Proceso', 'Se inicia revisión técnica', '2026-01-19 05:01:38'),
(109, 1, 3, 'asignacion', NULL, '4', '3', 'Ticket asignado a nuevo usuario', '2026-02-17 02:48:43'),
(110, 200, 26, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-02-17 02:50:16'),
(111, 200, 13, 'asignacion', NULL, NULL, '13', 'Ticket asignado a nuevo usuario', '2026-02-17 23:22:57'),
(112, 200, 13, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-02-17 23:23:05'),
(113, 155, 26, 'cambio_estado', NULL, 'Resuelto', 'Cerrado', 'Estado cambiado de Resuelto a Cerrado', '2026-02-24 02:30:18'),
(114, 203, 22, 'asignacion', NULL, NULL, '22', 'Ticket asignado a nuevo usuario', '2026-03-02 21:29:39'),
(115, 203, 10, 'asignacion', NULL, '22', '10', 'Ticket asignado a nuevo usuario', '2026-03-03 01:47:19'),
(116, 203, 10, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-03 01:47:22'),
(117, 203, 10, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-04 01:19:00'),
(118, 203, 10, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-04 01:21:16'),
(119, 202, 22, 'asignacion', NULL, NULL, '22', 'Ticket asignado a nuevo usuario', '2026-03-04 01:54:39'),
(120, 201, 12, 'asignacion', NULL, NULL, '12', 'Ticket asignado a nuevo usuario', '2026-03-04 01:54:45'),
(121, 204, 13, 'asignacion', NULL, NULL, '13', 'Ticket asignado a nuevo usuario', '2026-03-04 02:22:07'),
(122, 204, 13, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-04 02:22:10'),
(123, 205, 13, 'asignacion', NULL, NULL, '13', 'Ticket asignado a nuevo usuario', '2026-03-04 02:26:18'),
(124, 205, 13, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-04 02:26:21'),
(125, 205, 13, 'cambio_estado', NULL, 'Cerrado', 'Resuelto', 'Estado cambiado de Cerrado a Resuelto', '2026-03-04 02:27:39'),
(126, 205, 13, 'cambio_estado', NULL, 'Resuelto', 'Cerrado', 'Estado cambiado de Resuelto a Cerrado', '2026-03-05 00:15:36'),
(127, 205, 13, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-05 00:23:39'),
(128, 205, 13, 'reapertura', NULL, 'Cerrado', 'Abierto', 'Ticket reabierto. Reapertura #1. Motivo: es de prueba proque no se puede saber que es', '2026-03-05 00:23:39'),
(129, 204, 13, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-05 00:31:38'),
(130, 204, 13, 'reapertura', NULL, 'Cerrado', 'Abierto', 'Ticket reabierto. Reapertura #1. Motivo: No es el usuario no deberia poder hacerlo', '2026-03-05 00:31:38'),
(131, 203, 10, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-05 00:42:05'),
(132, 203, 17, 'reapertura', NULL, 'Cerrado', 'Abierto', 'Ticket reabierto. Reapertura #1. Motivo: es la prueba de reabrir', '2026-03-05 00:42:05'),
(133, 203, 10, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-05 00:44:15'),
(134, 203, 10, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-05 00:58:10'),
(135, 203, 17, 'reapertura', NULL, 'Cerrado', 'Abierto', 'Ticket reabierto. Reapertura #2. Motivo: se reabre desde usuario', '2026-03-05 00:58:10'),
(136, 203, 10, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-05 00:59:38'),
(137, 203, 10, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-05 01:01:33'),
(138, 203, 17, 'reapertura', NULL, 'Cerrado', 'Abierto', 'Ticket reabierto. Reapertura #3. Motivo: prueba de reabrir 2 usuario', '2026-03-05 01:01:33'),
(139, 155, 26, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-05 01:37:07'),
(140, 155, 17, 'reapertura', NULL, 'Cerrado', 'Abierto', 'Ticket reabierto. Reapertura #1. Motivo: prueba reabrir tickets cerrados semanas', '2026-03-05 01:37:07'),
(141, 205, 13, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-10 01:13:40'),
(142, 205, 13, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-10 01:15:12'),
(143, 205, 10, 'asignacion', NULL, '13', '10', 'Ticket asignado a nuevo usuario', '2026-03-12 00:13:49'),
(144, 205, 10, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-12 01:41:50'),
(145, 8, 13, 'asignacion', NULL, NULL, '13', 'Ticket asignado a nuevo usuario', '2026-03-12 02:53:21'),
(146, 8, 11, 'asignacion', NULL, '13', '11', 'Ticket asignado a nuevo usuario', '2026-03-12 02:53:24'),
(147, 201, 12, 'cambio_estado', NULL, 'Abierto', 'Cerrado', 'Estado cambiado de Abierto a Cerrado', '2026-03-13 01:46:04'),
(148, 201, 12, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-13 01:46:17'),
(149, 199, 22, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-13 01:50:36'),
(150, 198, 26, 'cambio_estado', NULL, 'Cerrado', 'Abierto', 'Estado cambiado de Cerrado a Abierto', '2026-03-13 02:04:22'),
(151, 203, 13, 'asignacion', NULL, '10', '13', 'Ticket asignado a nuevo usuario', '2026-03-14 00:32:38'),
(152, 206, 13, 'asignacion', NULL, NULL, '13', 'Ticket asignado a nuevo usuario', '2026-03-14 00:49:55'),
(153, 206, 6, 'asignacion', NULL, '13', '6', 'Ticket asignado a nuevo usuario', '2026-03-14 02:14:19'),
(154, 206, 13, 'asignacion', NULL, '6', '13', 'Ticket asignado a nuevo usuario', '2026-03-14 02:21:38'),
(155, 204, 12, 'asignacion', NULL, '13', '12', 'Ticket asignado a nuevo usuario', '2026-03-14 18:34:51'),
(156, 206, 13, 'comentario', NULL, NULL, NULL, NULL, '2026-03-14 19:02:28'),
(157, 206, 13, 'cambio_area', 'id_area', NULL, '1', NULL, '2026-03-14 19:04:12'),
(158, 206, 13, 'edicion_mensaje', 'mensaje', 'prueba 3', 'se corrige mensaje por prueba 3', NULL, '2026-03-14 19:33:56'),
(159, 207, 17, 'creacion', NULL, NULL, NULL, NULL, '2026-03-18 00:59:16'),
(160, 207, 13, 'asignacion', NULL, NULL, '13', 'Ticket asignado a nuevo usuario', '2026-03-18 01:05:58'),
(161, 207, 13, 'asignacion', 'id_asignado', NULL, '13', NULL, '2026-03-18 01:05:58'),
(162, 207, 13, 'cambio_area', 'id_area', NULL, '1', NULL, '2026-03-18 01:12:58'),
(163, 208, 13, 'creacion', NULL, NULL, NULL, NULL, '2026-03-18 02:13:57'),
(164, 208, 16, 'asignacion', NULL, NULL, '16', 'Ticket asignado a nuevo usuario', '2026-03-18 02:54:36'),
(165, 208, 13, 'asignacion', 'id_asignado', NULL, '16', NULL, '2026-03-18 02:54:36'),
(166, 208, 13, 'cambio_area', 'id_area', '1', '3', NULL, '2026-03-18 03:07:43');

-- --------------------------------------------------------

--
-- Table structure for table `inventario`
--

CREATE TABLE `inventario` (
  `id` int NOT NULL,
  `id_tipo` int NOT NULL,
  `id_marca` int NOT NULL,
  `id_modelo` int NOT NULL,
  `serial` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `placa` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_compra` date DEFAULT NULL,
  `fecha_asignacion` date DEFAULT NULL,
  `fecha_devolucion` date DEFAULT NULL,
  `id_sede` int DEFAULT NULL,
  `id_area` int DEFAULT NULL,
  `id_usuario_asignado` int DEFAULT NULL,
  `estado` enum('activo','disposicion','en_bodega','custodia') COLLATE utf8mb4_unicode_ci DEFAULT 'en_bodega',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_por` int NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventario`
--

INSERT INTO `inventario` (`id`, `id_tipo`, `id_marca`, `id_modelo`, `serial`, `placa`, `fecha_compra`, `fecha_asignacion`, `fecha_devolucion`, `id_sede`, `id_area`, `id_usuario_asignado`, `estado`, `observaciones`, `creado_por`, `creado_en`, `actualizado_en`) VALUES
(1, 1, 1, 1, 'DL5420-2024-001', 'IT-LAP-001', '2024-01-15', '2024-01-20', NULL, 1, 1, 13, 'activo', 'Laptop asignada al área de sistemas. Incluye cargador y maletín. Estado excelente.', 13, '2026-03-22 04:20:55', '2026-03-22 04:20:55'),
(2, 3, 1, 4, 'DU2422-2024-015', 'IT-MON-015', '2024-02-10', NULL, NULL, 1, NULL, NULL, 'en_bodega', 'Monitor 24 pulgadas Full HD. Nuevo, sin uso. Cable HDMI incluido.', 13, '2026-03-22 04:20:55', '2026-03-22 04:20:55'),
(3, 6, 2, 5, 'HP404-2022-089', 'IT-IMP-089', '2022-03-20', '2022-04-01', '2024-11-30', 1, 1, NULL, 'disposicion', 'Impresora dañada, requiere reparación costosa. Programada para baja. Tóner vacío.', 13, '2026-03-22 04:20:55', '2026-03-22 04:20:55');

-- --------------------------------------------------------

--
-- Table structure for table `marcas`
--

CREATE TABLE `marcas` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `marcas`
--

INSERT INTO `marcas` (`id`, `nombre`, `activo`, `creado_en`) VALUES
(1, 'Dell', 1, '2026-03-22 03:52:59'),
(2, 'HP', 1, '2026-03-22 03:52:59'),
(3, 'Lenovo', 1, '2026-03-22 03:52:59'),
(4, 'Asus', 1, '2026-03-22 03:52:59'),
(5, 'Acer', 1, '2026-03-22 03:52:59'),
(6, 'Apple', 1, '2026-03-22 03:52:59'),
(7, 'Samsung', 1, '2026-03-22 03:52:59'),
(8, 'LG', 1, '2026-03-22 03:52:59');

-- --------------------------------------------------------

--
-- Table structure for table `mensajes_ticket`
--

CREATE TABLE `mensajes_ticket` (
  `id` int NOT NULL,
  `id_ticket` int NOT NULL,
  `id_usuario` int NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `editado` tinyint(1) DEFAULT '0',
  `fecha_edicion` timestamp NULL DEFAULT NULL,
  `usuario_edicion` int DEFAULT NULL,
  `es_interno` tinyint(1) DEFAULT '0' COMMENT '1=Nota interna (solo admins)',
  `archivo_adjunto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_envio` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `mensajes_ticket`
--

INSERT INTO `mensajes_ticket` (`id`, `id_ticket`, `id_usuario`, `mensaje`, `editado`, `fecha_edicion`, `usuario_edicion`, `es_interno`, `archivo_adjunto`, `fecha_envio`) VALUES
(1, 1, 6, 'Revisé los cables y nada.', 0, NULL, NULL, 0, NULL, '2026-02-17 00:59:10'),
(2, 1, 4, 'Entendido, llevo multímetro.', 0, NULL, NULL, 1, NULL, '2026-02-17 00:59:10'),
(3, 100, 15, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-24 18:15:37'),
(4, 100, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-24 18:35:37'),
(5, 101, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-06 07:44:37'),
(6, 101, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-06 08:04:37'),
(7, 102, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-13 13:54:38'),
(8, 102, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-13 14:14:38'),
(9, 103, 14, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-05 06:46:38'),
(10, 103, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-05 07:06:38'),
(11, 104, 25, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-22 16:44:38'),
(12, 104, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-22 17:04:38'),
(13, 105, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-23 18:50:38'),
(14, 105, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-23 19:10:38'),
(15, 106, 24, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-30 04:33:38'),
(16, 106, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-30 04:53:38'),
(17, 107, 30, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 02:33:38'),
(18, 107, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 02:53:38'),
(19, 108, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-12 00:21:38'),
(20, 108, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-12 00:41:38'),
(21, 109, 19, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-19 06:45:38'),
(22, 109, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-19 07:05:38'),
(23, 110, 18, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 19:27:38'),
(24, 110, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 19:47:38'),
(25, 111, 31, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-23 01:28:38'),
(26, 111, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-23 01:48:38'),
(27, 112, 30, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-11 00:36:38'),
(28, 112, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-11 00:56:38'),
(29, 113, 32, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-13 13:31:38'),
(30, 113, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-13 13:51:38'),
(31, 114, 32, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-16 14:53:38'),
(32, 114, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-16 15:13:38'),
(33, 115, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-15 07:56:38'),
(34, 115, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-15 08:16:38'),
(35, 116, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-15 14:43:38'),
(36, 116, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-15 15:03:38'),
(37, 117, 29, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 12:38:38'),
(38, 117, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 12:58:38'),
(39, 118, 17, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-13 18:47:38'),
(40, 118, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-13 19:07:38'),
(41, 119, 16, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-29 17:49:38'),
(42, 119, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-29 18:09:38'),
(43, 120, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-13 02:36:38'),
(44, 120, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-13 02:56:38'),
(45, 121, 29, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-24 18:20:38'),
(46, 121, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-24 18:40:38'),
(47, 122, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-23 02:24:38'),
(48, 122, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-23 02:44:38'),
(49, 123, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-27 08:15:38'),
(50, 123, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-27 08:35:38'),
(51, 124, 30, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-29 10:22:38'),
(52, 124, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-29 10:42:38'),
(53, 125, 31, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-16 06:05:38'),
(54, 125, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-16 06:25:38'),
(55, 126, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-22 06:48:38'),
(56, 126, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-22 07:08:38'),
(57, 127, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-20 17:22:38'),
(58, 127, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-20 17:42:38'),
(59, 128, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-12 22:19:38'),
(60, 128, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-12 22:39:38'),
(61, 129, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-08 10:56:38'),
(62, 129, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-08 11:16:38'),
(63, 130, 31, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-28 07:23:38'),
(64, 130, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-28 07:43:38'),
(65, 131, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-11 06:18:38'),
(66, 131, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-11 06:38:38'),
(67, 132, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 13:14:38'),
(68, 132, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 13:34:38'),
(69, 133, 15, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-04 21:30:38'),
(70, 133, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-04 21:50:38'),
(71, 134, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-31 22:04:38'),
(72, 134, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-31 22:24:38'),
(73, 135, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-30 17:50:38'),
(74, 135, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-30 18:10:38'),
(75, 136, 21, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-24 19:56:38'),
(76, 136, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-24 20:16:38'),
(77, 137, 31, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 11:16:38'),
(78, 137, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 11:36:38'),
(79, 138, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-21 23:48:38'),
(80, 138, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-22 00:08:38'),
(81, 139, 17, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 20:12:38'),
(82, 139, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 20:32:38'),
(83, 140, 16, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-05 08:42:38'),
(84, 140, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-05 09:02:38'),
(85, 141, 24, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 05:48:38'),
(86, 141, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 06:08:38'),
(87, 142, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 14:53:38'),
(88, 142, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 15:13:38'),
(89, 143, 15, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-15 02:14:38'),
(90, 143, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-15 02:34:38'),
(91, 144, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-10 13:22:38'),
(92, 144, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-10 13:42:38'),
(93, 145, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-26 07:59:38'),
(94, 145, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-26 08:19:38'),
(95, 146, 21, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-19 05:43:38'),
(96, 146, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-19 06:03:38'),
(97, 147, 17, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-28 02:07:38'),
(98, 147, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-28 02:27:38'),
(99, 148, 17, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-06 16:47:38'),
(100, 148, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-06 17:07:38'),
(101, 149, 27, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-07 23:25:38'),
(102, 149, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-07 23:45:38'),
(103, 150, 19, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-22 18:44:38'),
(104, 150, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-22 19:04:38'),
(105, 151, 29, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-28 22:46:38'),
(106, 151, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-28 23:06:38'),
(107, 152, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-08 22:32:38'),
(108, 152, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-08 22:52:38'),
(109, 153, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-04 12:49:38'),
(110, 153, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-04 13:09:38'),
(111, 154, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 22:40:38'),
(112, 154, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 23:00:38'),
(113, 155, 17, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-25 12:17:38'),
(114, 155, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-25 12:37:38'),
(115, 156, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-28 05:25:38'),
(116, 156, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-28 05:45:38'),
(117, 157, 16, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-27 16:46:38'),
(118, 157, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-27 17:06:38'),
(119, 158, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-16 20:10:38'),
(120, 158, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-16 20:30:38'),
(121, 159, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-27 15:34:38'),
(122, 159, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-27 15:54:38'),
(123, 160, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 21:01:38'),
(124, 160, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 21:21:38'),
(125, 161, 18, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-28 22:33:38'),
(126, 161, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-28 22:53:38'),
(127, 162, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-21 00:58:38'),
(128, 162, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-21 01:18:38'),
(129, 163, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-22 12:23:38'),
(130, 163, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-22 12:43:38'),
(131, 164, 32, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-24 17:41:38'),
(132, 164, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-24 18:01:38'),
(133, 165, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-21 02:59:38'),
(134, 165, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-21 03:19:38'),
(135, 166, 27, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 03:02:38'),
(136, 166, 4, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 03:22:38'),
(137, 167, 29, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-07 01:22:38'),
(138, 167, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-07 01:42:38'),
(139, 168, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-01 06:03:38'),
(140, 168, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-01 06:23:38'),
(141, 169, 19, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-27 00:48:38'),
(142, 169, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-27 01:08:38'),
(143, 170, 19, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-28 00:58:38'),
(144, 170, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-28 01:18:38'),
(145, 171, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-21 15:39:38'),
(146, 171, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-21 15:59:38'),
(147, 172, 25, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-30 03:15:38'),
(148, 172, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-30 03:35:38'),
(149, 173, 14, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-19 23:19:38'),
(150, 173, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-19 23:39:38'),
(151, 174, 28, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-19 01:52:38'),
(152, 174, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-19 02:12:38'),
(153, 175, 27, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-12 11:07:38'),
(154, 175, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-12 11:27:38'),
(155, 176, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 07:46:38'),
(156, 176, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 08:06:38'),
(157, 177, 25, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-01 03:29:38'),
(158, 177, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-01 03:49:38'),
(159, 178, 24, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-20 04:34:38'),
(160, 178, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-20 04:54:38'),
(161, 179, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-02 01:05:38'),
(162, 179, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-02 01:25:38'),
(163, 180, 32, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-23 11:38:38'),
(164, 180, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-23 11:58:38'),
(165, 181, 31, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-02 02:25:38'),
(166, 181, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-02 02:45:38'),
(167, 182, 16, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-12 03:43:38'),
(168, 182, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-12 04:03:38'),
(169, 183, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-16 13:00:38'),
(170, 183, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-16 13:20:38'),
(171, 184, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-03 16:20:38'),
(172, 184, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-03 16:40:38'),
(173, 185, 31, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-31 21:11:38'),
(174, 185, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-31 21:31:38'),
(175, 186, 18, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-21 19:27:38'),
(176, 186, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-21 19:47:38'),
(177, 187, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-01 18:18:38'),
(178, 187, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-01 18:38:38'),
(179, 188, 33, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-18 17:07:38'),
(180, 188, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-18 17:27:38'),
(181, 189, 30, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-15 12:04:38'),
(182, 189, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-15 12:24:38'),
(183, 190, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-09 04:39:38'),
(184, 190, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-09 04:59:38'),
(185, 191, 30, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-13 18:33:38'),
(186, 191, 3, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-13 18:53:38'),
(187, 192, 15, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-15 14:07:38'),
(188, 192, 5, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-15 14:27:38'),
(189, 193, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-07 02:53:38'),
(190, 193, 30, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-07 03:13:38'),
(191, 194, 16, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-25 16:46:38'),
(192, 194, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-25 17:06:38'),
(193, 195, 23, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-31 10:32:38'),
(194, 195, 16, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-31 10:52:38'),
(195, 196, 24, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-01 19:35:38'),
(196, 196, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-01 19:55:38'),
(197, 197, 20, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-30 02:47:38'),
(198, 197, 19, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-30 03:07:38'),
(199, 198, 26, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-02-08 11:24:38'),
(200, 198, 26, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-02-08 11:44:38'),
(201, 199, 22, 'Hola, sigo teniendo problemas con este caso.', 0, NULL, NULL, 0, NULL, '2026-01-19 04:56:38'),
(202, 199, 22, 'Estamos revisando su solicitud, le informaremos pronto.', 0, NULL, NULL, 0, NULL, '2026-01-19 05:16:38'),
(203, 1, 3, 'Se realiza la validacion del proceso', 0, NULL, NULL, 0, NULL, '2026-02-17 02:48:45'),
(204, 200, 13, 'Ya se va a validar el caso', 0, NULL, NULL, 0, NULL, '2026-02-17 23:23:26'),
(205, 201, 13, 'Prueba', 0, NULL, NULL, 0, NULL, '2026-03-02 15:29:36'),
(206, 204, 13, 'se envia prueba', 0, NULL, NULL, 0, NULL, '2026-03-14 18:53:34'),
(207, 204, 13, 'se prueba', 0, NULL, NULL, 0, NULL, '2026-03-14 18:54:01'),
(208, 198, 13, 'Test mensaje', 0, NULL, NULL, 0, NULL, '2026-03-14 18:55:56'),
(209, 206, 13, 'se corrige mensaje por prueba.', 1, '2026-03-14 19:09:42', 13, 0, NULL, '2026-03-14 18:57:00'),
(210, 206, 13, 'se corrige mensaje por prueba 2', 1, '2026-03-14 19:15:28', 13, 0, NULL, '2026-03-14 18:59:03'),
(211, 206, 13, 'se corrige mensaje por prueba 3', 1, '2026-03-14 19:33:56', 13, 0, NULL, '2026-03-14 19:02:28'),
(212, 204, 17, 'Archivo adjunto: functions_CON_TIMEOUT.php', 0, NULL, NULL, 0, 'functions_CON_TIMEOUT_69b9f1bf75655_1773793727.php', '2026-03-18 00:28:47');

-- --------------------------------------------------------

--
-- Table structure for table `modelos`
--

CREATE TABLE `modelos` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_marca` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `modelos`
--

INSERT INTO `modelos` (`id`, `nombre`, `id_marca`, `activo`, `creado_en`) VALUES
(1, 'Latitude 5420', 1, 1, '2026-03-22 04:20:55'),
(2, 'EliteBook 840', 2, 1, '2026-03-22 04:20:55'),
(3, 'ThinkPad T14', 3, 1, '2026-03-22 04:20:55'),
(4, 'UltraSharp U2422H', 1, 1, '2026-03-22 04:20:55'),
(5, 'LaserJet Pro M404', 2, 1, '2026-03-22 04:20:55'),
(6, 'Yoga 7i', 3, 1, '2026-03-22 04:20:55');

-- --------------------------------------------------------

--
-- Table structure for table `roles_admin`
--

CREATE TABLE `roles_admin` (
  `id` int NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel` int NOT NULL COMMENT '1=Superior, 2=Intermedio, 3=Técnico, 4=Usuario',
  `permisos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Permisos específicos del rol',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `roles_admin`
--

INSERT INTO `roles_admin` (`id`, `nombre`, `nivel`, `permisos`, `creado_en`) VALUES
(1, 'Administrador Superior', 1, '{\"tickets\": \"all\", \"users\": \"all\", \"settings\": \"all\"}', '2026-02-17 00:28:31'),
(2, 'Administrador Intermedio', 2, '{\"tickets\": \"all\", \"users\": \"view\"}', '2026-02-17 00:28:31'),
(3, 'Técnico', 3, '{\"tickets\": \"assigned\"}', '2026-02-17 00:28:31'),
(4, 'Usuario', 4, '{\"tickets\": \"own\"}', '2026-02-17 00:28:31');

-- --------------------------------------------------------

--
-- Table structure for table `sedes`
--

CREATE TABLE `sedes` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sedes`
--

INSERT INTO `sedes` (`id`, `nombre`, `direccion`, `ciudad`, `activo`, `creado_en`) VALUES
(1, 'Sede Principal', NULL, 'Bogotá', 1, '2026-03-22 03:52:59'),
(2, 'Sede Norte', NULL, 'Medellín', 1, '2026-03-22 03:52:59'),
(3, 'Sede Sur', NULL, 'Cali', 1, '2026-03-22 03:52:59');

-- --------------------------------------------------------

--
-- Table structure for table `subcategorias`
--

CREATE TABLE `subcategorias` (
  `id` int NOT NULL,
  `id_categoria` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `orden` int DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subcategorias`
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
-- Table structure for table `tickets`
--

CREATE TABLE `tickets` (
  `id` int NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subcategoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prioridad` enum('baja','media','alta','critica') COLLATE utf8mb4_unicode_ci DEFAULT 'media',
  `estado` enum('Abierto','En Proceso','Cerrado','Resuelto') COLLATE utf8mb4_unicode_ci DEFAULT 'Abierto',
  `id_usuario` int NOT NULL COMMENT 'Usuario que crea el ticket',
  `id_area` int DEFAULT NULL,
  `id_asignado` int DEFAULT NULL COMMENT 'Usuario asignado (técnico/admin)',
  `archivo_adjunto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fecha_cierre` timestamp NULL DEFAULT NULL,
  `motivo_cierre` text COLLATE utf8mb4_unicode_ci,
  `usuario_cierre` int DEFAULT NULL,
  `numero_reapertura` int NOT NULL DEFAULT '0' COMMENT 'Cantidad de veces que ha sido reabierto',
  `id_ticket_original` int DEFAULT NULL COMMENT 'ID del ticket original (para reaperturas)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tickets`
--

INSERT INTO `tickets` (`id`, `titulo`, `descripcion`, `categoria`, `subcategoria`, `prioridad`, `estado`, `id_usuario`, `id_area`, `id_asignado`, `archivo_adjunto`, `fecha_creacion`, `fecha_actualizacion`, `fecha_cierre`, `motivo_cierre`, `usuario_cierre`, `numero_reapertura`, `id_ticket_original`) VALUES
(1, 'PC no enciende', 'Escritorio 15 no arranca.', 'Hardware', 'PC', 'alta', 'Abierto', 6, 1, 3, NULL, '2026-02-17 00:59:10', '2026-03-18 01:41:41', NULL, NULL, NULL, 0, NULL),
(2, 'Office error', 'Word no abre docs.', 'Software', 'Office', 'media', 'Abierto', 7, 1, 5, NULL, '2026-02-17 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(3, 'Sin internet', 'Piso 3 desconectado.', 'Red', 'Soporte', 'critica', 'Abierto', 8, 1, 4, NULL, '2026-02-16 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(4, 'Olvido Clave', 'Acceso a nómina.', 'Accesos', 'Password', 'baja', 'Abierto', 9, 1, 3, NULL, '2026-02-14 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(5, 'Impresora HP', 'Atasco de papel.', 'Hardware', 'Impresora', 'media', 'Abierto', 10, 1, 5, NULL, '2026-02-17 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(6, 'Bloqueo Antivirus', 'Bloquea contabilidad.', 'Software', 'Antivirus', 'alta', 'Abierto', 11, 1, NULL, NULL, '2026-02-17 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(7, 'Falla VPN', 'Error de certificado.', 'Red', 'VPN', 'alta', 'Abierto', 12, 1, 4, NULL, '2026-02-17 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(8, 'Capacitación Excel', 'Tablas dinámicas.', 'Soporte', 'Training', 'baja', 'Abierto', 6, 1, 11, NULL, '2026-02-17 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(9, 'Acceso Carpeta', 'Ventas trimestral.', 'Accesos', 'Permisos', 'media', 'Abierto', 7, 1, 3, NULL, '2026-02-15 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(10, 'Servidor Caído', 'Facturación offline.', 'Incidentes', 'Crítico', 'critica', 'Abierto', 8, 1, 3, NULL, '2026-02-16 00:59:10', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(11, 'Ticket prueba admin', 'ticket prueba', 'Otro', 'No especificado', 'critica', 'Abierto', 13, 1, 3, NULL, '2026-02-17 01:02:14', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(100, 'Error reportado sistema #100', 'El usuario informa un fallo recurrente en el módulo indexado 100. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'baja', 'En Proceso', 15, 1, 30, NULL, '2026-01-24 18:05:37', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(101, 'Error reportado sistema #101', 'El usuario informa un fallo recurrente en el módulo indexado 101. Requiere revisión técnica urgente.', 'Hardware', 'General', 'baja', 'Resuelto', 28, 1, 30, NULL, '2026-02-06 07:34:37', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(102, 'Error reportado sistema #102', 'El usuario informa un fallo recurrente en el módulo indexado 102. Requiere revisión técnica urgente.', 'Hardware', 'General', 'media', 'Cerrado', 22, 1, 16, NULL, '2026-02-13 13:44:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(103, 'Error reportado sistema #103', 'El usuario informa un fallo recurrente en el módulo indexado 103. Requiere revisión técnica urgente.', 'Hardware', 'General', 'baja', 'En Proceso', 14, 1, 5, NULL, '2026-02-05 06:36:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(104, 'Error reportado sistema #104', 'El usuario informa un fallo recurrente en el módulo indexado 104. Requiere revisión técnica urgente.', 'Hardware', 'General', 'critica', 'En Proceso', 25, 1, 22, NULL, '2026-01-22 16:34:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(105, 'Error reportado sistema #105', 'El usuario informa un fallo recurrente en el módulo indexado 105. Requiere revisión técnica urgente.', 'Red', 'General', 'critica', 'En Proceso', 26, 1, 19, NULL, '2026-01-23 18:40:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(106, 'Error reportado sistema #106', 'El usuario informa un fallo recurrente en el módulo indexado 106. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'critica', 'En Proceso', 24, 1, 3, NULL, '2026-01-30 04:23:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(107, 'Error reportado sistema #107', 'El usuario informa un fallo recurrente en el módulo indexado 107. Requiere revisión técnica urgente.', 'Hardware', 'General', 'alta', 'En Proceso', 30, 1, 26, NULL, '2026-02-09 02:23:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(108, 'Error reportado sistema #108', 'El usuario informa un fallo recurrente en el módulo indexado 108. Requiere revisión técnica urgente.', 'Accesos', 'General', 'baja', 'Resuelto', 23, 1, 3, NULL, '2026-02-12 00:11:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(109, 'Error reportado sistema #109', 'El usuario informa un fallo recurrente en el módulo indexado 109. Requiere revisión técnica urgente.', 'Soporte', 'General', 'alta', 'En Proceso', 19, 1, 5, NULL, '2026-01-19 06:35:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(110, 'Error reportado sistema #110', 'El usuario informa un fallo recurrente en el módulo indexado 110. Requiere revisión técnica urgente.', 'Soporte', 'General', 'media', 'Abierto', 18, 1, 22, NULL, '2026-01-18 19:17:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(111, 'Error reportado sistema #111', 'El usuario informa un fallo recurrente en el módulo indexado 111. Requiere revisión técnica urgente.', 'Software', 'General', 'baja', 'En Proceso', 31, 1, 5, NULL, '2026-01-23 01:18:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(112, 'Error reportado sistema #112', 'El usuario informa un fallo recurrente en el módulo indexado 112. Requiere revisión técnica urgente.', 'Software', 'General', 'media', 'Abierto', 30, 1, 30, NULL, '2026-02-11 00:26:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(113, 'Error reportado sistema #113', 'El usuario informa un fallo recurrente en el módulo indexado 113. Requiere revisión técnica urgente.', 'Soporte', 'General', 'baja', 'Abierto', 32, 1, 30, NULL, '2026-02-13 13:21:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(114, 'Error reportado sistema #114', 'El usuario informa un fallo recurrente en el módulo indexado 114. Requiere revisión técnica urgente.', 'Software', 'General', 'baja', 'Resuelto', 32, 1, 30, NULL, '2026-02-16 14:43:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(115, 'Error reportado sistema #115', 'El usuario informa un fallo recurrente en el módulo indexado 115. Requiere revisión técnica urgente.', 'Accesos', 'General', 'alta', 'Cerrado', 23, 1, 30, NULL, '2026-02-15 07:46:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(116, 'Error reportado sistema #116', 'El usuario informa un fallo recurrente en el módulo indexado 116. Requiere revisión técnica urgente.', 'Accesos', 'General', 'alta', 'Resuelto', 28, 1, 4, NULL, '2026-02-15 14:33:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(117, 'Error reportado sistema #117', 'El usuario informa un fallo recurrente en el módulo indexado 117. Requiere revisión técnica urgente.', 'Hardware', 'General', 'alta', 'En Proceso', 29, 1, 5, NULL, '2026-01-18 12:28:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(118, 'Error reportado sistema #118', 'El usuario informa un fallo recurrente en el módulo indexado 118. Requiere revisión técnica urgente.', 'Hardware', 'General', 'media', 'Abierto', 17, 1, 4, NULL, '2026-02-13 18:37:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(119, 'Error reportado sistema #119', 'El usuario informa un fallo recurrente en el módulo indexado 119. Requiere revisión técnica urgente.', 'Hardware', 'General', 'media', 'Abierto', 16, 1, 3, NULL, '2026-01-29 17:39:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(120, 'Error reportado sistema #120', 'El usuario informa un fallo recurrente en el módulo indexado 120. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'critica', 'Abierto', 33, 1, 19, NULL, '2026-02-13 02:26:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(121, 'Error reportado sistema #121', 'El usuario informa un fallo recurrente en el módulo indexado 121. Requiere revisión técnica urgente.', 'Soporte', 'General', 'baja', 'Abierto', 29, 1, 16, NULL, '2026-01-24 18:10:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(122, 'Error reportado sistema #122', 'El usuario informa un fallo recurrente en el módulo indexado 122. Requiere revisión técnica urgente.', 'Hardware', 'General', 'alta', 'Resuelto', 23, 1, 3, NULL, '2026-01-23 02:14:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(123, 'Error reportado sistema #123', 'El usuario informa un fallo recurrente en el módulo indexado 123. Requiere revisión técnica urgente.', 'Software', 'General', 'media', 'Cerrado', 33, 1, 22, NULL, '2026-01-27 08:05:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(124, 'Error reportado sistema #124', 'El usuario informa un fallo recurrente en el módulo indexado 124. Requiere revisión técnica urgente.', 'Soporte', 'General', 'media', 'En Proceso', 30, 1, 26, NULL, '2026-01-29 10:12:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(125, 'Error reportado sistema #125', 'El usuario informa un fallo recurrente en el módulo indexado 125. Requiere revisión técnica urgente.', 'Red', 'General', 'alta', 'Resuelto', 31, 1, 30, NULL, '2026-02-16 05:55:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(126, 'Error reportado sistema #126', 'El usuario informa un fallo recurrente en el módulo indexado 126. Requiere revisión técnica urgente.', 'Soporte', 'General', 'critica', 'Resuelto', 23, 1, 26, NULL, '2026-01-22 06:38:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(127, 'Error reportado sistema #127', 'El usuario informa un fallo recurrente en el módulo indexado 127. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'En Proceso', 28, 1, 4, NULL, '2026-01-20 17:12:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(128, 'Error reportado sistema #128', 'El usuario informa un fallo recurrente en el módulo indexado 128. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'baja', 'Resuelto', 26, 1, 19, NULL, '2026-02-12 22:09:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(129, 'Error reportado sistema #129', 'El usuario informa un fallo recurrente en el módulo indexado 129. Requiere revisión técnica urgente.', 'Soporte', 'General', 'alta', 'Abierto', 22, 1, 30, NULL, '2026-02-08 10:46:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(130, 'Error reportado sistema #130', 'El usuario informa un fallo recurrente en el módulo indexado 130. Requiere revisión técnica urgente.', 'Soporte', 'General', 'alta', 'En Proceso', 31, 1, 26, NULL, '2026-01-28 07:13:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(131, 'Error reportado sistema #131', 'El usuario informa un fallo recurrente en el módulo indexado 131. Requiere revisión técnica urgente.', 'Red', 'General', 'alta', 'Cerrado', 20, 1, 26, NULL, '2026-02-11 06:08:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(132, 'Error reportado sistema #132', 'El usuario informa un fallo recurrente en el módulo indexado 132. Requiere revisión técnica urgente.', 'Hardware', 'General', 'critica', 'En Proceso', 20, 1, 3, NULL, '2026-02-09 13:04:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(133, 'Error reportado sistema #133', 'El usuario informa un fallo recurrente en el módulo indexado 133. Requiere revisión técnica urgente.', 'Soporte', 'General', 'baja', 'Abierto', 15, 1, 3, NULL, '2026-02-04 21:20:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(134, 'Error reportado sistema #134', 'El usuario informa un fallo recurrente en el módulo indexado 134. Requiere revisión técnica urgente.', 'Hardware', 'General', 'critica', 'Resuelto', 26, 1, 26, NULL, '2026-01-31 21:54:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(135, 'Error reportado sistema #135', 'El usuario informa un fallo recurrente en el módulo indexado 135. Requiere revisión técnica urgente.', 'Software', 'General', 'baja', 'En Proceso', 33, 1, 30, NULL, '2026-01-30 17:40:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(136, 'Error reportado sistema #136', 'El usuario informa un fallo recurrente en el módulo indexado 136. Requiere revisión técnica urgente.', 'Accesos', 'General', 'baja', 'En Proceso', 21, 1, 26, NULL, '2026-01-24 19:46:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(137, 'Error reportado sistema #137', 'El usuario informa un fallo recurrente en el módulo indexado 137. Requiere revisión técnica urgente.', 'Hardware', 'General', 'critica', 'Resuelto', 31, 1, 30, NULL, '2026-01-18 11:06:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(138, 'Error reportado sistema #138', 'El usuario informa un fallo recurrente en el módulo indexado 138. Requiere revisión técnica urgente.', 'Red', 'General', 'baja', 'Cerrado', 23, 1, 22, NULL, '2026-01-21 23:38:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(139, 'Error reportado sistema #139', 'El usuario informa un fallo recurrente en el módulo indexado 139. Requiere revisión técnica urgente.', 'Red', 'General', 'baja', 'En Proceso', 17, 1, 30, NULL, '2026-02-09 20:02:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(140, 'Error reportado sistema #140', 'El usuario informa un fallo recurrente en el módulo indexado 140. Requiere revisión técnica urgente.', 'Red', 'General', 'media', 'Cerrado', 16, 1, 4, NULL, '2026-02-05 08:32:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(141, 'Error reportado sistema #141', 'El usuario informa un fallo recurrente en el módulo indexado 141. Requiere revisión técnica urgente.', 'Accesos', 'General', 'critica', 'Abierto', 24, 1, 4, NULL, '2026-01-18 05:38:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(142, 'Error reportado sistema #142', 'El usuario informa un fallo recurrente en el módulo indexado 142. Requiere revisión técnica urgente.', 'Accesos', 'General', 'baja', 'Cerrado', 33, 1, 4, NULL, '2026-02-09 14:43:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(143, 'Error reportado sistema #143', 'El usuario informa un fallo recurrente en el módulo indexado 143. Requiere revisión técnica urgente.', 'Red', 'General', 'alta', 'Resuelto', 15, 1, 22, NULL, '2026-02-15 02:04:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(144, 'Error reportado sistema #144', 'El usuario informa un fallo recurrente en el módulo indexado 144. Requiere revisión técnica urgente.', 'Hardware', 'General', 'media', 'Cerrado', 20, 1, 3, NULL, '2026-02-10 13:12:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(145, 'Error reportado sistema #145', 'El usuario informa un fallo recurrente en el módulo indexado 145. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'media', 'Resuelto', 28, 1, 19, NULL, '2026-01-26 07:49:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(146, 'Error reportado sistema #146', 'El usuario informa un fallo recurrente en el módulo indexado 146. Requiere revisión técnica urgente.', 'Hardware', 'General', 'critica', 'Cerrado', 21, 1, 4, NULL, '2026-01-19 05:33:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(147, 'Error reportado sistema #147', 'El usuario informa un fallo recurrente en el módulo indexado 147. Requiere revisión técnica urgente.', 'Software', 'General', 'critica', 'Abierto', 17, 1, 3, NULL, '2026-01-28 01:57:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(148, 'Error reportado sistema #148', 'El usuario informa un fallo recurrente en el módulo indexado 148. Requiere revisión técnica urgente.', 'Software', 'General', 'baja', 'En Proceso', 17, 1, 4, NULL, '2026-02-06 16:37:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(149, 'Error reportado sistema #149', 'El usuario informa un fallo recurrente en el módulo indexado 149. Requiere revisión técnica urgente.', 'Red', 'General', 'alta', 'En Proceso', 27, 1, 22, NULL, '2026-02-07 23:15:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(150, 'Error reportado sistema #150', 'El usuario informa un fallo recurrente en el módulo indexado 150. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'Resuelto', 19, 1, 4, NULL, '2026-01-22 18:34:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(151, 'Error reportado sistema #151', 'El usuario informa un fallo recurrente en el módulo indexado 151. Requiere revisión técnica urgente.', 'Red', 'General', 'media', 'Abierto', 29, 1, 19, NULL, '2026-01-28 22:36:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(152, 'Error reportado sistema #152', 'El usuario informa un fallo recurrente en el módulo indexado 152. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'baja', 'En Proceso', 23, 1, 4, NULL, '2026-02-08 22:22:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(153, 'Error reportado sistema #153', 'El usuario informa un fallo recurrente en el módulo indexado 153. Requiere revisión técnica urgente.', 'Hardware', 'General', 'baja', 'Cerrado', 20, 1, 22, NULL, '2026-02-04 12:39:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(154, 'Error reportado sistema #154', 'El usuario informa un fallo recurrente en el módulo indexado 154. Requiere revisión técnica urgente.', 'Software', 'General', 'alta', 'Resuelto', 26, 1, 22, NULL, '2026-02-09 22:30:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(155, 'Error reportado sistema #155', 'El usuario informa un fallo recurrente en el módulo indexado 155. Requiere revisión técnica urgente.', 'Software', 'General', 'critica', 'Abierto', 17, 1, 26, NULL, '2026-01-25 12:07:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 1, 155),
(156, 'Error reportado sistema #156', 'El usuario informa un fallo recurrente en el módulo indexado 156. Requiere revisión técnica urgente.', 'Accesos', 'General', 'baja', 'Abierto', 28, 1, 19, NULL, '2026-01-28 05:15:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(157, 'Error reportado sistema #157', 'El usuario informa un fallo recurrente en el módulo indexado 157. Requiere revisión técnica urgente.', 'Soporte', 'General', 'alta', 'Abierto', 16, 1, 4, NULL, '2026-01-27 16:36:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(158, 'Error reportado sistema #158', 'El usuario informa un fallo recurrente en el módulo indexado 158. Requiere revisión técnica urgente.', 'Accesos', 'General', 'alta', 'Abierto', 33, 1, 4, NULL, '2026-02-16 20:00:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(159, 'Error reportado sistema #159', 'El usuario informa un fallo recurrente en el módulo indexado 159. Requiere revisión técnica urgente.', 'Software', 'General', 'media', 'Cerrado', 22, 1, 16, NULL, '2026-01-27 15:24:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(160, 'Error reportado sistema #160', 'El usuario informa un fallo recurrente en el módulo indexado 160. Requiere revisión técnica urgente.', 'Hardware', 'General', 'alta', 'Cerrado', 20, 1, 3, NULL, '2026-02-09 20:51:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(161, 'Error reportado sistema #161', 'El usuario informa un fallo recurrente en el módulo indexado 161. Requiere revisión técnica urgente.', 'Software', 'General', 'baja', 'En Proceso', 18, 1, 22, NULL, '2026-01-28 22:23:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(162, 'Error reportado sistema #162', 'El usuario informa un fallo recurrente en el módulo indexado 162. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'Cerrado', 28, 1, 4, NULL, '2026-01-21 00:48:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(163, 'Error reportado sistema #163', 'El usuario informa un fallo recurrente en el módulo indexado 163. Requiere revisión técnica urgente.', 'Accesos', 'General', 'baja', 'Resuelto', 22, 1, 4, NULL, '2026-01-22 12:13:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(164, 'Error reportado sistema #164', 'El usuario informa un fallo recurrente en el módulo indexado 164. Requiere revisión técnica urgente.', 'Accesos', 'General', 'media', 'Cerrado', 32, 1, 3, NULL, '2026-01-24 17:31:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(165, 'Error reportado sistema #165', 'El usuario informa un fallo recurrente en el módulo indexado 165. Requiere revisión técnica urgente.', 'Red', 'General', 'alta', 'Resuelto', 26, 1, 5, NULL, '2026-01-21 02:49:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(166, 'Error reportado sistema #166', 'El usuario informa un fallo recurrente en el módulo indexado 166. Requiere revisión técnica urgente.', 'Red', 'General', 'baja', 'Cerrado', 27, 1, 4, NULL, '2026-01-18 02:52:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(167, 'Error reportado sistema #167', 'El usuario informa un fallo recurrente en el módulo indexado 167. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'media', 'En Proceso', 29, 1, 30, NULL, '2026-02-07 01:12:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(168, 'Error reportado sistema #168', 'El usuario informa un fallo recurrente en el módulo indexado 168. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'media', 'Resuelto', 28, 1, 19, NULL, '2026-02-01 05:53:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(169, 'Error reportado sistema #169', 'El usuario informa un fallo recurrente en el módulo indexado 169. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'Resuelto', 19, 1, 19, NULL, '2026-01-27 00:38:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(170, 'Error reportado sistema #170', 'El usuario informa un fallo recurrente en el módulo indexado 170. Requiere revisión técnica urgente.', 'Red', 'General', 'media', 'Abierto', 19, 1, 5, NULL, '2026-01-28 00:48:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(171, 'Error reportado sistema #171', 'El usuario informa un fallo recurrente en el módulo indexado 171. Requiere revisión técnica urgente.', 'Software', 'General', 'media', 'Cerrado', 26, 1, 22, NULL, '2026-01-21 15:29:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(172, 'Error reportado sistema #172', 'El usuario informa un fallo recurrente en el módulo indexado 172. Requiere revisión técnica urgente.', 'Software', 'General', 'baja', 'Cerrado', 25, 1, 5, NULL, '2026-01-30 03:05:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(173, 'Error reportado sistema #173', 'El usuario informa un fallo recurrente en el módulo indexado 173. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'Abierto', 14, 1, 19, NULL, '2026-01-19 23:09:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(174, 'Error reportado sistema #174', 'El usuario informa un fallo recurrente en el módulo indexado 174. Requiere revisión técnica urgente.', 'Accesos', 'General', 'critica', 'Resuelto', 28, 1, 16, NULL, '2026-01-19 01:42:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(175, 'Error reportado sistema #175', 'El usuario informa un fallo recurrente en el módulo indexado 175. Requiere revisión técnica urgente.', 'Red', 'General', 'critica', 'Cerrado', 27, 1, 16, NULL, '2026-02-12 10:57:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(176, 'Error reportado sistema #176', 'El usuario informa un fallo recurrente en el módulo indexado 176. Requiere revisión técnica urgente.', 'Soporte', 'General', 'critica', 'Cerrado', 20, 1, 16, NULL, '2026-01-18 07:36:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(177, 'Error reportado sistema #177', 'El usuario informa un fallo recurrente en el módulo indexado 177. Requiere revisión técnica urgente.', 'Software', 'General', 'critica', 'Cerrado', 25, 1, 16, NULL, '2026-02-01 03:19:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(178, 'Error reportado sistema #178', 'El usuario informa un fallo recurrente en el módulo indexado 178. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'baja', 'Resuelto', 24, 1, 30, NULL, '2026-01-20 04:24:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(179, 'Error reportado sistema #179', 'El usuario informa un fallo recurrente en el módulo indexado 179. Requiere revisión técnica urgente.', 'Accesos', 'General', 'critica', 'Abierto', 20, 1, 5, NULL, '2026-02-02 00:55:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(180, 'Error reportado sistema #180', 'El usuario informa un fallo recurrente en el módulo indexado 180. Requiere revisión técnica urgente.', 'Software', 'General', 'media', 'Cerrado', 32, 1, 5, NULL, '2026-01-23 11:28:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(181, 'Error reportado sistema #181', 'El usuario informa un fallo recurrente en el módulo indexado 181. Requiere revisión técnica urgente.', 'Hardware', 'General', 'alta', 'Resuelto', 31, 1, 26, NULL, '2026-02-02 02:15:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(182, 'Error reportado sistema #182', 'El usuario informa un fallo recurrente en el módulo indexado 182. Requiere revisión técnica urgente.', 'Red', 'General', 'critica', 'Cerrado', 16, 1, 3, NULL, '2026-02-12 03:33:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(183, 'Error reportado sistema #183', 'El usuario informa un fallo recurrente en el módulo indexado 183. Requiere revisión técnica urgente.', 'Red', 'General', 'critica', 'Abierto', 26, 1, 19, NULL, '2026-02-16 12:50:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(184, 'Error reportado sistema #184', 'El usuario informa un fallo recurrente en el módulo indexado 184. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'critica', 'Abierto', 33, 1, 16, NULL, '2026-02-03 16:10:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(185, 'Error reportado sistema #185', 'El usuario informa un fallo recurrente en el módulo indexado 185. Requiere revisión técnica urgente.', 'Accesos', 'General', 'baja', 'En Proceso', 31, 1, 3, NULL, '2026-01-31 21:01:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(186, 'Error reportado sistema #186', 'El usuario informa un fallo recurrente en el módulo indexado 186. Requiere revisión técnica urgente.', 'Soporte', 'General', 'critica', 'Abierto', 18, 1, 30, NULL, '2026-01-21 19:17:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(187, 'Error reportado sistema #187', 'El usuario informa un fallo recurrente en el módulo indexado 187. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'critica', 'En Proceso', 22, 1, 19, NULL, '2026-02-01 18:08:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(188, 'Error reportado sistema #188', 'El usuario informa un fallo recurrente en el módulo indexado 188. Requiere revisión técnica urgente.', 'Soporte', 'General', 'critica', 'En Proceso', 33, 1, 16, NULL, '2026-01-18 16:57:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(189, 'Error reportado sistema #189', 'El usuario informa un fallo recurrente en el módulo indexado 189. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'Resuelto', 30, 1, 3, NULL, '2026-02-15 11:54:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(190, 'Error reportado sistema #190', 'El usuario informa un fallo recurrente en el módulo indexado 190. Requiere revisión técnica urgente.', 'Hardware', 'General', 'media', 'En Proceso', 20, 1, 16, NULL, '2026-02-09 04:29:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(191, 'Error reportado sistema #191', 'El usuario informa un fallo recurrente en el módulo indexado 191. Requiere revisión técnica urgente.', 'Software', 'General', 'alta', 'Abierto', 30, 1, 3, NULL, '2026-02-13 18:23:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(192, 'Error reportado sistema #192', 'El usuario informa un fallo recurrente en el módulo indexado 192. Requiere revisión técnica urgente.', 'Red', 'General', 'baja', 'En Proceso', 15, 1, 5, NULL, '2026-02-15 13:57:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(193, 'Error reportado sistema #193', 'El usuario informa un fallo recurrente en el módulo indexado 193. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'alta', 'Resuelto', 22, 1, 30, NULL, '2026-02-07 02:43:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(194, 'Error reportado sistema #194', 'El usuario informa un fallo recurrente en el módulo indexado 194. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'media', 'Resuelto', 16, 1, 19, NULL, '2026-01-25 16:36:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(195, 'Error reportado sistema #195', 'El usuario informa un fallo recurrente en el módulo indexado 195. Requiere revisión técnica urgente.', 'Accesos', 'General', 'media', 'Resuelto', 23, 1, 16, NULL, '2026-01-31 10:22:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(196, 'Error reportado sistema #196', 'El usuario informa un fallo recurrente en el módulo indexado 196. Requiere revisión técnica urgente.', 'Soporte', 'General', 'critica', 'En Proceso', 24, 1, 19, NULL, '2026-02-01 19:25:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(197, 'Error reportado sistema #197', 'El usuario informa un fallo recurrente en el módulo indexado 197. Requiere revisión técnica urgente.', 'Red', 'General', 'media', 'Abierto', 20, 1, 19, NULL, '2026-01-30 02:37:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(198, 'Error reportado sistema #198', 'El usuario informa un fallo recurrente en el módulo indexado 198. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'critica', 'Abierto', 26, 1, 26, NULL, '2026-02-08 11:14:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(199, 'Error reportado sistema #199', 'El usuario informa un fallo recurrente en el módulo indexado 199. Requiere revisión técnica urgente.', 'Incidentes', 'General', 'media', 'Abierto', 22, 1, 22, NULL, '2026-01-19 04:46:38', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(200, 'Prueba ticket', 'Pureba ticketr', 'Hardware', 'Computadora no enciende', 'critica', 'Abierto', 26, 1, 13, NULL, '2026-02-17 02:46:22', '2026-03-18 02:05:11', '2026-02-17 02:50:16', 'Se cierra por prueba', 26, 0, NULL),
(201, 'Prueba admin', 'Prueba admin', 'Hardware', 'Computadora no enciende', 'critica', 'Abierto', 13, 1, 12, NULL, '2026-02-21 00:07:15', '2026-03-18 02:05:11', NULL, NULL, NULL, 0, NULL),
(202, 'prueba adminb', 'prueba dmin', 'Red', NULL, 'alta', 'Abierto', 13, 1, 22, NULL, '2026-03-02 15:49:45', '2026-03-18 02:03:21', NULL, NULL, NULL, 0, NULL),
(203, 'prueba usuario', 'prueba usuario', 'Hardware', NULL, 'alta', 'Abierto', 17, 1, 13, NULL, '2026-03-02 15:51:02', '2026-03-18 02:05:11', NULL, NULL, NULL, 3, 203),
(204, 'prueba nps', 'prueba nps', 'Hardware', NULL, 'media', 'Abierto', 17, 1, 12, NULL, '2026-03-04 02:21:57', '2026-03-18 02:05:11', NULL, NULL, NULL, 1, 204),
(205, 'prurena nps admin', 'prurena nps admin', 'Hardware', NULL, 'media', 'Cerrado', 13, 1, 10, NULL, '2026-03-04 02:26:14', '2026-03-18 02:03:18', NULL, NULL, NULL, 1, 205),
(206, 'prueba 10', 'prueba 10 usuario', 'Software', NULL, 'media', 'Abierto', 35, 1, 13, 'test_session_69b4a9467000b_1773447494.php', '2026-03-14 00:18:14', '2026-03-14 19:04:12', NULL, NULL, NULL, 0, NULL),
(207, 'prueba archuvo', 'prueba archuvo', 'Hardware', 'Teclado/Mouse', 'baja', 'Abierto', 17, 1, 13, 'session_timeout_69b9f8e46a1d6_1773795556.js', '2026-03-18 00:59:16', '2026-03-18 01:12:58', NULL, NULL, NULL, 0, NULL),
(208, 'Prueba tickets area', 'Prueba tickets area', 'Hardware', 'Computadora no enciende', 'baja', 'Abierto', 13, 3, 16, NULL, '2026-03-18 02:13:57', '2026-03-18 03:07:43', NULL, NULL, NULL, 0, NULL);

--
-- Triggers `tickets`
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
-- Table structure for table `tipos_activo`
--

CREATE TABLE `tipos_activo` (
  `id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tipos_activo`
--

INSERT INTO `tipos_activo` (`id`, `nombre`, `descripcion`, `activo`, `creado_en`) VALUES
(1, 'Computador Portátil', NULL, 1, '2026-03-22 03:52:59'),
(2, 'Computador de Escritorio', NULL, 1, '2026-03-22 03:52:59'),
(3, 'Monitor', NULL, 1, '2026-03-22 03:52:59'),
(4, 'Teclado', NULL, 1, '2026-03-22 03:52:59'),
(5, 'Mouse', NULL, 1, '2026-03-22 03:52:59'),
(6, 'Impresora', NULL, 1, '2026-03-22 03:52:59'),
(7, 'Escáner', NULL, 1, '2026-03-22 03:52:59'),
(8, 'Teléfono', NULL, 1, '2026-03-22 03:52:59');

-- --------------------------------------------------------

--
-- Table structure for table `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int NOT NULL,
  `primer_nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `segundo_nombre` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primer_apellido` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `segundo_apellido` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Username para login',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hash de contraseña',
  `id_rol_admin` int NOT NULL DEFAULT '4',
  `id_area` int DEFAULT NULL,
  `estado` tinyint(1) DEFAULT '1' COMMENT '1=Activo, 0=Inactivo',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ultimo_acceso` timestamp NULL DEFAULT NULL,
  `cambiar_password` tinyint(1) DEFAULT '0' COMMENT '1=Obligar cambio',
  `creado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `usuarios`
--

INSERT INTO `usuarios` (`id`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `usuario`, `password`, `id_rol_admin`, `id_area`, `estado`, `email`, `telefono`, `ultimo_acceso`, `cambiar_password`, `creado_en`, `actualizado_en`) VALUES
(3, 'Carlos', 'Alberto', 'Rodríguez', 'Pérez', 'crodriguez', '$2y$12$HgvoZAxonEegjgtYO2CRPuHxA8JlE4TeKhjtyCudRuQMVqIj/Az4O', 2, 10, 0, 'carlos@example.com', '555-0101', '2026-01-02 02:35:12', 0, '2026-02-17 00:59:10', '2026-03-13 00:28:53'),
(4, 'Ana', 'María', 'García', 'López', 'agarcia', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, 10, 1, 'ana@example.com', '555-0102', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(5, 'Luis', 'Fernando', 'Martínez', 'Sosa', 'lmartinez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, 10, 1, 'luis@example.com', '555-0103', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(6, 'Mario', NULL, 'Hernández', 'Ruiz', 'mhernandez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'mario@example.com', '555-0104', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(7, 'Juan', 'Carlos', 'Pérez', 'Gómez', 'jperez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'juan@example.com', '555-0105', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(8, 'Laura', 'Beatriz', 'Sánchez', 'Mejía', 'lsanchez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'laura@example.com', '555-0106', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(9, 'Rosa', NULL, 'González', 'Mendoza', 'rgonzalez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'rosa@example.com', '555-0107', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(10, 'Pedro', 'José', 'Díaz', 'Infante', 'pdiaz', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'pedro@example.com', '555-0108', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(11, 'Elena', NULL, 'Vargas', 'Luna', 'elen-v', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'elena@example.com', '555-0109', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(12, 'Jorge', 'Luis', 'Castro', 'Ríos', 'jcastro', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 10, 1, 'jorge@example.com', '555-0110', NULL, 0, '2026-02-17 00:59:10', '2026-02-17 01:35:59'),
(13, 'Michael', '', 'Moreno', '', 'mmoreno', '$2y$12$mrj/ZD.MvyMqvmdroA3l6.vXHz6ijM2XCF0GKcsHRn6PqAstu470q', 1, 1, 1, 'michael1@test.com', '', '2026-03-22 17:37:56', 0, '2026-02-17 01:00:30', '2026-03-22 17:37:56'),
(14, 'Andrés', 'Felipe', 'Cano', 'Ruiz', 'afcano', '$2y$12$a5wwnqzaPLxWqpjffp1kruW55/dfi6aZskUZHZkQdf0LBcFuCTfV6', 4, 1, 0, 'andres.cano@example.com', '3001112233', '2026-01-02 02:43:13', 0, '2026-02-17 02:40:37', '2026-03-13 00:28:53'),
(15, 'Beatriz', '', 'Luna', 'Pascual', 'bluna', '$2y$12$CDgwUprkcMZNsQYmcRkEru.ljRPlhXlDlsy1TCuI.8dapMs1M067O', 4, 2, 1, 'beatriz.luna@example.com', '3001112234', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 23:28:54'),
(16, 'Camilo', 'José', 'Torres', 'Nieto', 'cjtorres', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 3, 1, 'camilo.torres@example.com', '3001112235', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(17, 'Diana', 'Marcela', 'Rojas', 'Soler', 'dmrojas', '$2y$12$ig4uo38NTSzu33yVHsnHjeII/j5eC/yMw1T3HBDkxmYZ1kF.uYKJ6', 4, 1, 1, 'diana.rojas@example.com', '3001112236', '2026-03-18 00:58:57', 0, '2026-02-17 02:40:37', '2026-03-18 00:58:57'),
(18, 'Esteban', NULL, 'Giraldo', 'Hoyos', 'egiraldo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 4, 1, 'esteban.giraldo@example.com', '3001112237', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(19, 'Fabian', 'Arturo', 'Vivas', 'Castro', 'favivas', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 5, 1, 'fabian.vivas@example.com', '3001112238', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(20, 'Gloria', 'Inés', 'Ortiz', 'Mena', 'giortiz', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 2, 1, 'gloria.ortiz@example.com', '3001112239', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(21, 'Hugo', NULL, 'Beltrán', 'Sanz', 'hbeltran', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 3, 1, 'hugo.beltran@example.com', '3001112240', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(22, 'Iván', 'Darío', 'Duque', 'Lara', 'iduque', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 4, 1, 'ivan.duque@example.com', '3001112241', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(23, 'Julia', 'Rosa', 'Mora', 'Rico', 'jmora', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 5, 1, 'julia.mora@example.com', '3001112242', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(24, 'Kevin', NULL, 'Prada', 'Osorio', 'kprada', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 1, 'kevin.prada@example.com', '3001112243', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(25, 'Laura', 'Ximena', 'Pinto', 'Bello', 'lxpinto', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 2, 1, 'laura.pinto@example.com', '3001112244', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(26, 'Mauricio', '', 'Gómez', 'Toro', 'mgomez', '$2y$12$sqFe3KDJMyY.r8vAkQ2uB.ESq2EI1ijRst0EVIPxjroYcfwzURYaC', 4, 3, 0, 'mauricio.gomez@example.com', '3001112245', '2026-01-07 03:35:41', 0, '2026-02-17 02:40:37', '2026-03-13 00:28:53'),
(27, 'Natalia', 'Sofía', 'Peña', 'Vidal', 'npena', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 4, 1, 'natalia.pena@example.com', '3001112246', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(28, 'Oscar', 'Iván', 'Rangel', 'Moya', 'oirangel', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 5, 1, 'oscar.rangel@example.com', '3001112247', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(29, 'Paula', NULL, 'Vallejo', 'Suárez', 'pvallejo', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 1, 'paula.vallejo@example.com', '3001112248', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(30, 'Ricardo', 'Alonso', 'Bernal', 'Cruz', 'rabernal', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 2, 1, 'ricardo.bernal@example.com', '3001112249', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(31, 'Sandra', 'Milena', 'Téllez', 'Páez', 'smtellez', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 3, 1, 'sandra.tellez@example.com', '3001112250', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(32, 'Tomás', NULL, 'Herrera', 'Arias', 'therrera', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 4, 1, 'tomas.herrera@example.com', '3001112251', NULL, 0, '2026-02-17 02:40:37', '2026-02-17 02:40:37'),
(33, 'Vanessa', 'Lucía', 'Méndez', 'Falla', 'vlmendez', '$2y$12$mrj/ZD.MvyMqvmdroA3l6.vXHz6ijM2XCF0GKcsHRn6PqAstu470q', 3, 1, 1, 'vanessa.mendez@example.com', '3001112252', '2026-03-18 03:08:56', 0, '2026-02-17 02:40:37', '2026-03-18 03:08:56'),
(35, 'sss', 'sss', 'sss', 'sss', 'ssss', '$2y$10$sM9m3Sgfv4TDcN2ZIR52Uet5GG.oNqEzITPM7yT9G4q7WB7CQNmxy', 4, 1, 1, 'sss@ss.com', '0', '2026-03-18 03:08:28', 0, '2026-03-11 01:53:24', '2026-03-18 03:08:28'),
(36, 'ss', 'sss', 'sss', 'sss', 'ssss337', '$2y$10$./krHmw/uK5EzLVzCPoKxe9zTd.uG6/E3RN2MjyKKkws3AC7.W8WS', 3, 8, 0, 'sss@sss.com', '3000000', '2026-03-14 19:06:36', 0, '2026-03-11 23:43:19', '2026-03-22 04:17:22'),
(37, 'Angel', '', 'Chaves', 'Garzon', 'achaves', '$2y$10$v3dNaC3fs8TywDpRu1BAk.1CfqRo0NDxIVU1j2CAMA8INjPzqguTC', 2, 2, 1, 'Angel@angel.com', '30000000', '2026-03-22 18:07:45', 0, '2026-03-22 17:38:26', '2026-03-22 18:18:35');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_calificaciones_detalle`
-- (See below for the actual view)
--
CREATE TABLE `v_calificaciones_detalle` (
`calificacion` tinyint(1)
,`categoria_nps` varchar(9)
,`comentario` text
,`email_usuario` varchar(100)
,`fecha_calificacion` timestamp
,`id` int
,`id_ticket` int
,`nombre_usuario` varchar(101)
,`numero_reapertura` int
,`ticket_numero` varchar(23)
,`ticket_titulo` varchar(200)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_nps_stats`
-- (See below for the actual view)
--
CREATE TABLE `v_nps_stats` (
`detractores` decimal(23,0)
,`neutros` decimal(23,0)
,`nps_score` decimal(30,2)
,`promotores` decimal(23,0)
,`total_calificaciones` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_stats_usuarios`
-- (See below for the actual view)
--
CREATE TABLE `v_stats_usuarios` (
`id` int
,`nombre_completo` varchar(101)
,`tickets_abiertos` decimal(23,0)
,`tickets_cerrados` decimal(23,0)
,`tickets_proceso` decimal(23,0)
,`total_tickets` bigint
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_tickets_completos`
-- (See below for the actual view)
--
CREATE TABLE `v_tickets_completos` (
`archivo_adjunto` varchar(255)
,`area_asignado` varchar(100)
,`area_usuario` varchar(100)
,`categoria` varchar(100)
,`descripcion` text
,`email_asignado` varchar(100)
,`email_usuario` varchar(100)
,`estado` enum('Abierto','En Proceso','Cerrado','Resuelto')
,`fecha_actualizacion` timestamp
,`fecha_cierre` timestamp
,`fecha_creacion` timestamp
,`id` int
,`id_asignado` int
,`id_usuario` int
,`minutos_abierto` bigint
,`motivo_cierre` text
,`nombre_asignado` varchar(101)
,`nombre_usuario` varchar(101)
,`prioridad` enum('baja','media','alta','critica')
,`rol_usuario` varchar(50)
,`subcategoria` varchar(100)
,`telefono_usuario` varchar(20)
,`tiene_adjunto` varchar(2)
,`titulo` varchar(200)
,`total_archivos` bigint
,`total_mensajes` bigint
,`usuario_cierre` int
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_nombre` (`nombre`);

--
-- Indexes for table `asignaciones_tickets`
--
ALTER TABLE `asignaciones_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario_asigna` (`id_usuario_asigna`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_usuario` (`id_usuario_asignado`);

--
-- Indexes for table `calificaciones_tickets`
--
ALTER TABLE `calificaciones_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_usuario` (`id_usuario`),
  ADD KEY `idx_calificacion` (`calificacion`);

--
-- Indexes for table `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `configuracion`
--
ALTER TABLE `configuracion`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `clave` (`clave`);

--
-- Indexes for table `historial_inventario`
--
ALTER TABLE `historial_inventario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inventario` (`id_inventario`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `idx_usuario` (`id_usuario`);

--
-- Indexes for table `historial_login`
--
ALTER TABLE `historial_login`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`id_usuario`),
  ADD KEY `idx_fecha` (`fecha`),
  ADD KEY `idx_exitoso` (`exitoso`);

--
-- Indexes for table `historial_logout`
--
ALTER TABLE `historial_logout`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`id_usuario`),
  ADD KEY `idx_fecha` (`fecha`);

--
-- Indexes for table `historial_tickets`
--
ALTER TABLE `historial_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_fecha` (`fecha`);

--
-- Indexes for table `inventario`
--
ALTER TABLE `inventario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_serial` (`serial`),
  ADD UNIQUE KEY `unique_placa` (`placa`),
  ADD KEY `idx_tipo` (`id_tipo`),
  ADD KEY `idx_marca` (`id_marca`),
  ADD KEY `idx_modelo` (`id_modelo`),
  ADD KEY `idx_serial` (`serial`),
  ADD KEY `idx_placa` (`placa`),
  ADD KEY `idx_sede` (`id_sede`),
  ADD KEY `idx_area` (`id_area`),
  ADD KEY `idx_usuario` (`id_usuario_asignado`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `creado_por` (`creado_por`);

--
-- Indexes for table `marcas`
--
ALTER TABLE `marcas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indexes for table `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_ticket` (`id_ticket`),
  ADD KEY `idx_fecha` (`fecha_envio`);

--
-- Indexes for table `modelos`
--
ALTER TABLE `modelos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_modelo_marca` (`nombre`,`id_marca`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_marca` (`id_marca`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indexes for table `roles_admin`
--
ALTER TABLE `roles_admin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indexes for table `sedes`
--
ALTER TABLE `sedes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indexes for table `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categoria` (`id_categoria`);

--
-- Indexes for table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usuario` (`id_usuario`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_prioridad` (`prioridad`),
  ADD KEY `idx_asignado` (`id_asignado`),
  ADD KEY `idx_estado_fecha` (`estado`,`fecha_creacion`),
  ADD KEY `idx_categoria` (`categoria`),
  ADD KEY `idx_subcategoria` (`subcategoria`),
  ADD KEY `idx_fecha_estado` (`fecha_creacion`,`estado`),
  ADD KEY `idx_numero_reapertura` (`numero_reapertura`),
  ADD KEY `idx_estado_cerrado_fecha` (`estado`,`fecha_cierre`),
  ADD KEY `idx_area` (`id_area`);
ALTER TABLE `tickets` ADD FULLTEXT KEY `ft_busqueda` (`titulo`,`descripcion`);

--
-- Indexes for table `tipos_activo`
--
ALTER TABLE `tipos_activo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`),
  ADD KEY `idx_nombre` (`nombre`),
  ADD KEY `idx_activo` (`activo`);

--
-- Indexes for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_usuario` (`usuario`),
  ADD KEY `idx_estado` (`estado`),
  ADD KEY `idx_rol` (`id_rol_admin`),
  ADD KEY `id_area` (`id_area`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `areas`
--
ALTER TABLE `areas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `asignaciones_tickets`
--
ALTER TABLE `asignaciones_tickets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `calificaciones_tickets`
--
ALTER TABLE `calificaciones_tickets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `configuracion`
--
ALTER TABLE `configuracion`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `historial_inventario`
--
ALTER TABLE `historial_inventario`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `historial_login`
--
ALTER TABLE `historial_login`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=121;

--
-- AUTO_INCREMENT for table `historial_logout`
--
ALTER TABLE `historial_logout`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=68;

--
-- AUTO_INCREMENT for table `historial_tickets`
--
ALTER TABLE `historial_tickets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=167;

--
-- AUTO_INCREMENT for table `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `marcas`
--
ALTER TABLE `marcas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=213;

--
-- AUTO_INCREMENT for table `modelos`
--
ALTER TABLE `modelos`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `roles_admin`
--
ALTER TABLE `roles_admin`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sedes`
--
ALTER TABLE `sedes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=209;

--
-- AUTO_INCREMENT for table `tipos_activo`
--
ALTER TABLE `tipos_activo`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

-- --------------------------------------------------------

--
-- Structure for view `v_calificaciones_detalle`
--
DROP TABLE IF EXISTS `v_calificaciones_detalle`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_calificaciones_detalle`  AS SELECT `c`.`id` AS `id`, `c`.`id_ticket` AS `id_ticket`, (case when (`t`.`numero_reapertura` > 0) then concat(coalesce(`t`.`id_ticket_original`,`t`.`id`),'-',`t`.`numero_reapertura`) else cast(`t`.`id` as char charset utf8mb4) end) AS `ticket_numero`, `t`.`titulo` AS `ticket_titulo`, concat(`u`.`primer_nombre`,' ',`u`.`primer_apellido`) AS `nombre_usuario`, `u`.`email` AS `email_usuario`, `c`.`calificacion` AS `calificacion`, (case when (`c`.`calificacion` >= 4) then 'Promotor' when (`c`.`calificacion` = 3) then 'Neutro' else 'Detractor' end) AS `categoria_nps`, `c`.`comentario` AS `comentario`, `c`.`numero_reapertura` AS `numero_reapertura`, `c`.`fecha_calificacion` AS `fecha_calificacion` FROM ((`calificaciones_tickets` `c` join `tickets` `t` on((`c`.`id_ticket` = `t`.`id`))) join `usuarios` `u` on((`c`.`id_usuario` = `u`.`id`))) ;

-- --------------------------------------------------------

--
-- Structure for view `v_nps_stats`
--
DROP TABLE IF EXISTS `v_nps_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_nps_stats`  AS SELECT count(0) AS `total_calificaciones`, sum((case when (`calificaciones_tickets`.`calificacion` >= 4) then 1 else 0 end)) AS `promotores`, sum((case when (`calificaciones_tickets`.`calificacion` = 3) then 1 else 0 end)) AS `neutros`, sum((case when (`calificaciones_tickets`.`calificacion` <= 2) then 1 else 0 end)) AS `detractores`, round((((sum((case when (`calificaciones_tickets`.`calificacion` >= 4) then 1 else 0 end)) / count(0)) * 100) - ((sum((case when (`calificaciones_tickets`.`calificacion` <= 2) then 1 else 0 end)) / count(0)) * 100)),2) AS `nps_score` FROM `calificaciones_tickets` ;

-- --------------------------------------------------------

--
-- Structure for view `v_stats_usuarios`
--
DROP TABLE IF EXISTS `v_stats_usuarios`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_stats_usuarios`  AS SELECT `u`.`id` AS `id`, concat(`u`.`primer_nombre`,' ',`u`.`primer_apellido`) AS `nombre_completo`, count(distinct `t`.`id`) AS `total_tickets`, sum((case when (`t`.`estado` = 'Abierto') then 1 else 0 end)) AS `tickets_abiertos`, sum((case when (`t`.`estado` = 'En Proceso') then 1 else 0 end)) AS `tickets_proceso`, sum((case when (`t`.`estado` in ('Cerrado','Resuelto')) then 1 else 0 end)) AS `tickets_cerrados` FROM (`usuarios` `u` left join `tickets` `t` on((`u`.`id` = `t`.`id_usuario`))) WHERE (`u`.`estado` = 1) GROUP BY `u`.`id`, `u`.`primer_nombre`, `u`.`primer_apellido` ORDER BY count(distinct `t`.`id`) DESC ;

-- --------------------------------------------------------

--
-- Structure for view `v_tickets_completos`
--
DROP TABLE IF EXISTS `v_tickets_completos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_tickets_completos`  AS SELECT `t`.`id` AS `id`, `t`.`titulo` AS `titulo`, `t`.`descripcion` AS `descripcion`, `t`.`categoria` AS `categoria`, `t`.`subcategoria` AS `subcategoria`, `t`.`prioridad` AS `prioridad`, `t`.`estado` AS `estado`, `t`.`id_usuario` AS `id_usuario`, `t`.`id_asignado` AS `id_asignado`, `t`.`archivo_adjunto` AS `archivo_adjunto`, `t`.`fecha_creacion` AS `fecha_creacion`, `t`.`fecha_actualizacion` AS `fecha_actualizacion`, `t`.`fecha_cierre` AS `fecha_cierre`, `t`.`motivo_cierre` AS `motivo_cierre`, `t`.`usuario_cierre` AS `usuario_cierre`, concat(`u`.`primer_nombre`,' ',`u`.`primer_apellido`) AS `nombre_usuario`, `u`.`email` AS `email_usuario`, `u`.`telefono` AS `telefono_usuario`, concat(`a`.`primer_nombre`,' ',`a`.`primer_apellido`) AS `nombre_asignado`, `a`.`email` AS `email_asignado`, `ar_usuario`.`nombre` AS `area_usuario`, `ar_asignado`.`nombre` AS `area_asignado`, `r`.`nombre` AS `rol_usuario`, (select count(0) from `mensajes_ticket` where (`mensajes_ticket`.`id_ticket` = `t`.`id`)) AS `total_mensajes`, (select count(0) from `mensajes_ticket` where ((`mensajes_ticket`.`id_ticket` = `t`.`id`) and (`mensajes_ticket`.`archivo_adjunto` is not null))) AS `total_archivos`, timestampdiff(MINUTE,`t`.`fecha_creacion`,now()) AS `minutos_abierto`, (case when (`t`.`archivo_adjunto` is not null) then 'Sí' when ((select count(0) from `mensajes_ticket` where ((`mensajes_ticket`.`id_ticket` = `t`.`id`) and (`mensajes_ticket`.`archivo_adjunto` is not null))) > 0) then 'Sí' else 'No' end) AS `tiene_adjunto` FROM (((((`tickets` `t` left join `usuarios` `u` on((`t`.`id_usuario` = `u`.`id`))) left join `usuarios` `a` on((`t`.`id_asignado` = `a`.`id`))) left join `areas` `ar_usuario` on((`u`.`id_area` = `ar_usuario`.`id`))) left join `areas` `ar_asignado` on((`a`.`id_area` = `ar_asignado`.`id`))) left join `roles_admin` `r` on((`u`.`id_rol_admin` = `r`.`id`))) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `asignaciones_tickets`
--
ALTER TABLE `asignaciones_tickets`
  ADD CONSTRAINT `asignaciones_tickets_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `asignaciones_tickets_ibfk_2` FOREIGN KEY (`id_usuario_asignado`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `asignaciones_tickets_ibfk_3` FOREIGN KEY (`id_usuario_asigna`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `calificaciones_tickets`
--
ALTER TABLE `calificaciones_tickets`
  ADD CONSTRAINT `calificaciones_tickets_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `calificaciones_tickets_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `historial_inventario`
--
ALTER TABLE `historial_inventario`
  ADD CONSTRAINT `historial_inventario_ibfk_1` FOREIGN KEY (`id_inventario`) REFERENCES `inventario` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_inventario_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `historial_login`
--
ALTER TABLE `historial_login`
  ADD CONSTRAINT `historial_login_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `historial_logout`
--
ALTER TABLE `historial_logout`
  ADD CONSTRAINT `historial_logout_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `historial_tickets`
--
ALTER TABLE `historial_tickets`
  ADD CONSTRAINT `historial_tickets_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_tickets_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `inventario`
--
ALTER TABLE `inventario`
  ADD CONSTRAINT `inventario_ibfk_1` FOREIGN KEY (`id_tipo`) REFERENCES `tipos_activo` (`id`),
  ADD CONSTRAINT `inventario_ibfk_2` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id`),
  ADD CONSTRAINT `inventario_ibfk_3` FOREIGN KEY (`id_modelo`) REFERENCES `modelos` (`id`),
  ADD CONSTRAINT `inventario_ibfk_4` FOREIGN KEY (`id_sede`) REFERENCES `sedes` (`id`),
  ADD CONSTRAINT `inventario_ibfk_5` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id`),
  ADD CONSTRAINT `inventario_ibfk_6` FOREIGN KEY (`id_usuario_asignado`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `inventario_ibfk_7` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`);

--
-- Constraints for table `mensajes_ticket`
--
ALTER TABLE `mensajes_ticket`
  ADD CONSTRAINT `mensajes_ticket_ibfk_1` FOREIGN KEY (`id_ticket`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mensajes_ticket_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `modelos`
--
ALTER TABLE `modelos`
  ADD CONSTRAINT `modelos_ibfk_1` FOREIGN KEY (`id_marca`) REFERENCES `marcas` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`id_asignado`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_rol_admin`) REFERENCES `roles_admin` (`id`),
  ADD CONSTRAINT `usuarios_ibfk_2` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id`) ON DELETE SET NULL;

DELIMITER $$
--
-- Events
--
CREATE DEFINER=`root`@`localhost` EVENT `desactivar_usuarios_inactivos` ON SCHEDULE EVERY 1 DAY STARTS '2026-03-11 19:28:53' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE usuarios
SET estado = 0
WHERE ultimo_acceso IS NOT NULL
AND ultimo_acceso < DATE_SUB(NOW(), INTERVAL 1 MONTH)$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
