<?php
session_start();
require_once '../config/conexion.php';
require_once '../config/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.html');
    exit;
}

$username = limpiar_entrada($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';

// Buscar usuario
$stmt = $conn->prepare("SELECT id, usuario, password, id_rol_admin, estado, 
                        CONCAT(primer_nombre, ' ', primer_apellido) as nombre_completo 
                        FROM usuarios WHERE usuario = ? LIMIT 1");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    // Registrar intento fallido
    $stmt2 = $conn->prepare("INSERT INTO historial_login (usuario, exitoso, ip_address) VALUES (?, 0, ?)");
    $stmt2->bind_param("ss", $username, $ip);
    $stmt2->execute();
    header('Location: ../index.html?error=1');
    exit;
}

$user = $result->fetch_assoc();

// Verificar estado
if ($user['estado'] != 1) {
    header('Location: ../index.html?error=2');
    exit;
}

// Verificar contraseña
if (!password_verify($password, $user['password'])) {
    $stmt2 = $conn->prepare("INSERT INTO historial_login (usuario, exitoso, ip_address) VALUES (?, 0, ?)");
    $stmt2->bind_param("ss", $username, $ip);
    $stmt2->execute();
    header('Location: ../index.html?error=1');
    exit;
}

// Login exitoso
$_SESSION['user_id'] = $user['id'];
$_SESSION['usuario'] = $user['usuario'];
$_SESSION['nombre_completo'] = $user['nombre_completo'];
$_SESSION['id_rol_admin'] = $user['id_rol_admin'];
$_SESSION['last_activity'] = time();

// Actualizar último acceso
$update = $conn->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?");
$update->bind_param("i", $user['id']);
$update->execute();

// Registrar login exitoso
registrar_actividad($conn, $user['id'], 'login', 'Login exitoso');

// Redirigir según rol
if ($user['id_rol_admin'] <= 3) {
    header('Location: ../dashboard_admin.html');
} else {
    header('Location: ../dashboard_user.html');
}
exit;
?>