<?php
require_once '../config/conexion.php';
require_once '../config/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../registro.html');
    exit;
}

$primer_nombre = limpiar_entrada($_POST['primer_nombre']);
$segundo_nombre = limpiar_entrada($_POST['segundo_nombre'] ?? '');
$primer_apellido = limpiar_entrada($_POST['primer_apellido']);
$segundo_apellido = limpiar_entrada($_POST['segundo_apellido'] ?? '');
$password = $_POST['password'];

// Validar contraseña
$errores = validar_password($password);
if (!empty($errores)) {
    header('Location: ../registro.html?error=' . urlencode(implode(', ', $errores)));
    exit;
}

// Generar usuario automático
$usuario = strtolower(substr($primer_nombre, 0, 1) . $primer_apellido);

// Verificar si el usuario ya existe
$stmt = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ?");
$stmt->bind_param("s", $usuario);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    // Agregar número al final
    $usuario .= rand(100, 999);
}

$password_hash = hash_password($password);

$stmt = $conn->prepare("INSERT INTO usuarios (primer_nombre, segundo_nombre, primer_apellido, 
                       segundo_apellido, usuario, password, id_rol_admin, estado) 
                       VALUES (?, ?, ?, ?, ?, ?, 4, 0)");
$stmt->bind_param("ssssss", $primer_nombre, $segundo_nombre, $primer_apellido, 
                 $segundo_apellido, $usuario, $password_hash);

if ($stmt->execute()) {
    header('Location: ../index.html?registered=1&usuario=' . urlencode($usuario));
} else {
    header('Location: ../registro.html?error=Error al registrar');
}
exit;
?>