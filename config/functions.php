<?php
/**
 * Funciones Auxiliares del Sistema
 */

function validar_password($password) {
    $errores = [];
    if (strlen($password) < 8) $errores[] = "Mínimo 8 caracteres";
    if (!preg_match('/[A-Z]/', $password)) $errores[] = "Debe contener mayúsculas";
    if (!preg_match('/[0-9]/', $password)) $errores[] = "Debe contener números";
    return $errores;
}

function verificar_sesion() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    
    if (!isset($_SESSION['user_id'])) {
        header('Location: ../index.html');
        exit;
    }
    
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > 1800)) {
        session_destroy();
        header('Location: ../index.html?timeout=1');
        exit;
    }
    
    $_SESSION['last_activity'] = time();
}

function verificar_admin() {
    verificar_sesion();
    if (!isset($_SESSION['id_rol_admin']) || $_SESSION['id_rol_admin'] > 3) {
        header('Location: ../dashboard_user.html');
        exit;
    }
}

function registrar_actividad($conn, $user_id, $accion, $detalles = '') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    $stmt = $conn->prepare("INSERT INTO historial_login (id_usuario, usuario, exitoso, ip_address, fecha) VALUES (?, ?, 1, ?, NOW())");
    if ($stmt) {
        $usuario = $_SESSION['usuario'] ?? 'system';
        $stmt->bind_param("iss", $user_id, $usuario, $ip);
        $stmt->execute();
        $stmt->close();
    }
}

function enviar_json($data) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function obtener_nombre_rol($id_rol) {
    $roles = [1 => 'Admin Superior', 2 => 'Admin Intermedio', 3 => 'Técnico', 4 => 'Usuario'];
    return $roles[$id_rol] ?? 'Desconocido';
}
?>