<?php
/**
 * functions.php
 * Funciones auxiliares del sistema
 */

// Verificar sesión
function verificar_sesion() {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
}

// Limpiar entrada
function limpiar_entrada($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $data;
}

// Enviar JSON
function enviar_json($data) {
    echo json_encode($data);
    exit;
}

// Hash de contraseña
function hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// Validar contraseña
function validar_password($password) {
    $errores = [];
    
    if (strlen($password) < 8) {
        $errores[] = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    return $errores;
}

// Registrar actividad
function registrar_actividad($conn, $user_id, $accion, $detalles) {
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
?>
