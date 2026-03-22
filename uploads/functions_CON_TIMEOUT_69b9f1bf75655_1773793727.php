<?php

/**
 * functions.php
 * Funciones auxiliares del sistema
 */

// ==================== CONTROL DE SESIÓN POR INACTIVIDAD ====================

/**
 * Verificar tiempo de inactividad de la sesión
 * @return bool True si la sesión es válida, False si expiró
 */
function verificar_timeout_sesion()
{
    $timeout_duracion = 1800; // 30 minutos en segundos

    // Si no hay timestamp de último acceso, crear uno
    if (!isset($_SESSION['ultimo_acceso'])) {
        $_SESSION['ultimo_acceso'] = time();
        return true;
    }

    // Calcular tiempo transcurrido
    $tiempo_inactivo = time() - $_SESSION['ultimo_acceso'];

    // Si pasaron más de 30 minutos, destruir sesión
    if ($tiempo_inactivo > $timeout_duracion) {
        session_unset();
        session_destroy();
        return false;
    }

    // Actualizar timestamp
    $_SESSION['ultimo_acceso'] = time();
    return true;
}

/**
 * Obtener tiempo restante de sesión en segundos
 * @return int Segundos restantes antes del timeout
 */
function obtener_tiempo_restante_sesion()
{
    $timeout_duracion = 1800; // 30 minutos

    if (!isset($_SESSION['ultimo_acceso'])) {
        return $timeout_duracion;
    }

    $tiempo_transcurrido = time() - $_SESSION['ultimo_acceso'];
    $tiempo_restante = $timeout_duracion - $tiempo_transcurrido;

    return max(0, $tiempo_restante);
}

/**
 * Extender la sesión (resetear el timer)
 * @return array Información de la sesión extendida
 */
function extender_sesion()
{
    $_SESSION['ultimo_acceso'] = time();
    return [
        'success' => true,
        'mensaje' => 'Sesión extendida por 30 minutos más',
        'tiempo_restante' => 1800,
        'nuevo_timestamp' => time()
    ];
}

// ==================== FUNCIONES ORIGINALES ====================

// Verificar sesión
function verificar_sesion()
{
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }

    // Verificar timeout de inactividad
    if (!verificar_timeout_sesion()) {
        http_response_code(401);
        die(json_encode([
            'success' => false,
            'message' => 'Sesión expirada por inactividad',
            'session_expired' => true
        ]));
    }
}

// Limpiar entrada
function limpiar_entrada($data)
{
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Enviar JSON
function enviar_json($data)
{
    echo json_encode($data);
    exit;
}

// Hash de contraseña
function hash_password($password)
{
    return password_hash($password, PASSWORD_DEFAULT);
}

// Validar contraseña
function validar_password($password)
{
    $errores = [];

    if (strlen($password) < 8) {
        $errores[] = 'La contraseña debe tener al menos 8 caracteres';
    }

    return $errores;
}

// Registrar actividad
function registrar_actividad($conn, $user_id, $accion, $detalles)
{
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
        $stmt = $conn->prepare("INSERT INTO historial_login (id_usuario, usuario, exitoso, ip_address, detalles) VALUES (?, ?, 1, ?, ?)");
        $usuario = $_SESSION['usuario'] ?? 'system';
        $stmt->bind_param("isss", $user_id, $usuario, $ip, $detalles);
        $stmt->execute();
    } catch (Exception $e) {
        // Silent fail
    }
}
