<?php

/**
 * session_check.php
 * API para verificar estado de la sesión
 */

session_start();
require_once '../config/functions.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// ==================== CHECK - Verificar si la sesión está activa ====================
if ($action === 'check') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'session_active' => false,
            'message' => 'No hay sesión activa'
        ]);
        exit;
    }

    // Verificar timeout
    if (!verificar_timeout_sesion()) {
        echo json_encode([
            'success' => false,
            'session_active' => false,
            'session_expired' => true,
            'message' => 'Sesión expirada por inactividad'
        ]);
        exit;
    }

    // Sesión activa - devolver tiempo restante
    echo json_encode([
        'success' => true,
        'session_active' => true,
        'tiempo_restante' => obtener_tiempo_restante_sesion(),
        'user_id' => $_SESSION['user_id']
    ]);
    exit;
}

// ==================== EXTEND - Extender la sesión ====================
elseif ($action === 'extend') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => false,
            'message' => 'No hay sesión para extender'
        ]);
        exit;
    }

    $resultado = extender_sesion();
    echo json_encode($resultado);
    exit;
}

// ==================== PING - Mantener sesión activa (sin respuesta) ====================
elseif ($action === 'ping') {
    if (isset($_SESSION['user_id'])) {
        $_SESSION['ultimo_acceso'] = time();
    }
    echo json_encode(['success' => true]);
    exit;
}

// Acción no válida
else {
    echo json_encode([
        'success' => false,
        'message' => 'Acción no válida'
    ]);
}
