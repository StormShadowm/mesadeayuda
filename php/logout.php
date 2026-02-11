<?php
session_start();
require_once '../config/conexion.php';

if (isset($_SESSION['user_id'])) {
    registrar_actividad($conn, $_SESSION['user_id'], 'logout', 'Cierre de sesión');
}

session_unset();
session_destroy();
header('Location: ../index.html');
exit;

function registrar_actividad($conn, $user_id, $accion, $detalles) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
    $stmt = $conn->prepare("INSERT INTO historial_login (id_usuario, usuario, exitoso, ip_address) VALUES (?, ?, 1, ?)");
    $usuario = $_SESSION['usuario'] ?? 'system';
    $stmt->bind_param("iss", $user_id, $usuario, $ip);
    $stmt->execute();
}
?>