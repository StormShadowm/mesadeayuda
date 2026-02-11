-- ================================================
-- MESA DE AYUDA - ESQUEMA DE BASE DE DATOS MEJORADO
-- Versión 2.0
-- ================================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS mesa_ayuda_final 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE mesa_ayuda_final;

-- ================================================
-- TABLA: roles_admin
-- Descripción: Niveles de acceso administrativo
-- ================================================
CREATE TABLE IF NOT EXISTS roles_admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    nivel INT NOT NULL COMMENT '1=Superior, 2=Intermedio, 3=Técnico, 4=Usuario',
    permisos JSON COMMENT 'Permisos específicos del rol',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar roles por defecto
INSERT INTO roles_admin (nombre, nivel, permisos) VALUES
('Administrador Superior', 1, '{"tickets": "all", "users": "all", "settings": "all"}'),
('Administrador Intermedio', 2, '{"tickets": "all", "users": "view"}'),
('Técnico', 3, '{"tickets": "assigned"}'),
('Usuario', 4, '{"tickets": "own"}');

-- ================================================
-- TABLA: usuarios
-- Descripción: Usuarios del sistema
-- ================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    usuario VARCHAR(50) NOT NULL UNIQUE COMMENT 'Username para login',
    password VARCHAR(255) NOT NULL COMMENT 'Hash de contraseña',
    id_rol_admin INT NOT NULL DEFAULT 4,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    ultimo_acceso TIMESTAMP NULL,
    cambiar_password TINYINT(1) DEFAULT 0 COMMENT '1=Obligar cambio',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol_admin) REFERENCES roles_admin(id) ON DELETE RESTRICT,
    INDEX idx_usuario (usuario),
    INDEX idx_estado (estado),
    INDEX idx_rol (id_rol_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar usuarios por defecto (contraseñas: Admin123 y Usuario123)
INSERT INTO usuarios (primer_nombre, primer_apellido, usuario, password, id_rol_admin, email) VALUES
('Administrador', 'Sistema', 'admin', '$2y$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5oDYb6YvhMCWm', 1, 'admin@sistema.com'),
('Usuario', 'Prueba', 'usuario', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 'usuario@test.com');

-- ================================================
-- TABLA: tickets
-- Descripción: Tickets de soporte
-- ================================================
CREATE TABLE IF NOT EXISTS tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria ENUM('tecnico', 'soporte', 'consulta', 'otro') DEFAULT 'otro',
    prioridad ENUM('baja', 'media', 'alta', 'critica') DEFAULT 'media',
    estado ENUM('Abierto', 'En Proceso', 'Cerrado', 'Resuelto') DEFAULT 'Abierto',
    id_usuario INT NOT NULL COMMENT 'Usuario que crea el ticket',
    id_asignado INT NULL COMMENT 'Usuario asignado (técnico/admin)',
    archivo_adjunto VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (id_asignado) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_usuario (id_usuario),
    INDEX idx_estado (estado),
    INDEX idx_prioridad (prioridad),
    INDEX idx_asignado (id_asignado),
    FULLTEXT INDEX ft_busqueda (titulo, descripcion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLA: mensajes_ticket
-- Descripción: Conversación/comentarios del ticket
-- ================================================
CREATE TABLE IF NOT EXISTS mensajes_ticket (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    id_usuario INT NOT NULL,
    mensaje TEXT NOT NULL,
    es_interno TINYINT(1) DEFAULT 0 COMMENT '1=Nota interna (solo admins)',
    archivo_adjunto VARCHAR(255),
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ticket) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_ticket (id_ticket),
    INDEX idx_fecha (fecha_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLA: historial_tickets
-- Descripción: Registro de cambios en tickets
-- ================================================
CREATE TABLE IF NOT EXISTS historial_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_ticket INT NOT NULL,
    id_usuario INT NOT NULL COMMENT 'Usuario que realizó el cambio',
    accion VARCHAR(100) NOT NULL COMMENT 'Ej: cambio_estado, asignacion, etc.',
    valor_anterior VARCHAR(255),
    valor_nuevo VARCHAR(255),
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ticket) REFERENCES tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_ticket (id_ticket),
    INDEX idx_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLA: historial_login
-- Descripción: Registro de accesos al sistema
-- ================================================
CREATE TABLE IF NOT EXISTS historial_login (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    usuario VARCHAR(50) NOT NULL,
    exitoso TINYINT(1) NOT NULL COMMENT '1=Éxito, 0=Fallo',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_usuario (id_usuario),
    INDEX idx_fecha (fecha),
    INDEX idx_exitoso (exitoso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- TABLA: configuracion
-- Descripción: Configuraciones del sistema
-- ================================================
CREATE TABLE IF NOT EXISTS configuracion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT,
    descripcion VARCHAR(255),
    tipo ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar configuraciones por defecto
INSERT INTO configuracion (clave, valor, descripcion, tipo) VALUES
('sistema_nombre', 'Mesa de Ayuda', 'Nombre del sistema', 'string'),
('tickets_por_pagina', '10', 'Cantidad de tickets por página', 'number'),
('tiempo_sesion', '1800', 'Tiempo de sesión en segundos', 'number'),
('permitir_registro', 'true', 'Permitir auto-registro de usuarios', 'boolean'),
('max_tamaño_archivo', '5242880', 'Tamaño máximo archivo en bytes (5MB)', 'number');

-- ================================================
-- VISTAS ÚTILES
-- ================================================

-- Vista de tickets con información completa
CREATE OR REPLACE VIEW v_tickets_completos AS
SELECT 
    t.*,
    CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS nombre_usuario,
    u.email AS email_usuario,
    CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS nombre_asignado,
    (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) AS total_mensajes,
    DATEDIFF(NOW(), t.fecha_creacion) AS dias_abierto
FROM tickets t
LEFT JOIN usuarios u ON t.id_usuario = u.id
LEFT JOIN usuarios a ON t.id_asignado = a.id;

-- Vista de estadísticas por usuario
CREATE OR REPLACE VIEW v_stats_usuarios AS
SELECT 
    u.id,
    CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS nombre_completo,
    COUNT(DISTINCT t.id) AS total_tickets,
    SUM(CASE WHEN t.estado = 'Abierto' THEN 1 ELSE 0 END) AS tickets_abiertos,
    SUM(CASE WHEN t.estado = 'En Proceso' THEN 1 ELSE 0 END) AS tickets_proceso,
    SUM(CASE WHEN t.estado = 'Cerrado' THEN 1 ELSE 0 END) AS tickets_cerrados
FROM usuarios u
LEFT JOIN tickets t ON u.id = t.id_usuario
GROUP BY u.id;

-- ================================================
-- TRIGGERS
-- ================================================

-- Trigger: Registrar cambio de estado en historial
DELIMITER //
CREATE TRIGGER after_ticket_update
AFTER UPDATE ON tickets
FOR EACH ROW
BEGIN
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
END//
DELIMITER ;

-- ================================================
-- PROCEDIMIENTOS ALMACENADOS
-- ================================================

-- Procedimiento: Obtener estadísticas generales
DELIMITER //
CREATE PROCEDURE sp_estadisticas_generales()
BEGIN
    SELECT 
        COUNT(*) AS total_tickets,
        SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) AS abiertos,
        SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) AS cerrados,
        SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) AS resueltos,
        SUM(CASE WHEN prioridad = 'alta' OR prioridad = 'critica' THEN 1 ELSE 0 END) AS alta_prioridad,
        AVG(DATEDIFF(IFNULL(fecha_cierre, NOW()), fecha_creacion)) AS tiempo_promedio_resolucion
    FROM tickets;
END//
DELIMITER ;

-- ================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- ================================================

-- Insertar tickets de ejemplo
INSERT INTO tickets (titulo, descripcion, categoria, prioridad, estado, id_usuario) VALUES
('Problema con el sistema de login', 'No puedo acceder a mi cuenta', 'tecnico', 'alta', 'Abierto', 2),
('Solicitud de información', 'Necesito información sobre el proceso', 'consulta', 'baja', 'En Proceso', 2),
('Error en reportes', 'Los reportes no se generan correctamente', 'tecnico', 'media', 'Resuelto', 2);

-- Insertar mensajes de ejemplo
INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje) VALUES
(1, 2, 'Hola, necesito ayuda urgente con el login'),
(1, 1, 'Hola, estoy revisando tu caso. ¿Qué error específico ves?'),
(2, 2, 'Quisiera saber los pasos del proceso de solicitud');

-- ================================================
-- FIN DEL SCRIPT
-- ================================================
