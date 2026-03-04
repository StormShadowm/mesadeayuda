<?php
/**
 * test_session.php
 * Script para verificar el estado de la sesión
 * 
 * INSTRUCCIONES:
 * 1. Copiar este archivo a la raíz del proyecto
 * 2. Ir a: http://localhost/mesa_ayuda_mejorada/test_session.php
 * 3. Ver qué errores muestra
 */

session_start();

header('Content-Type: application/json; charset=utf-8');

$diagnostico = [
    'fecha' => date('Y-m-d H:i:s'),
    'sesion_iniciada' => session_status() === PHP_SESSION_ACTIVE,
    'sesion_id' => session_id(),
    'sesion_datos' => $_SESSION ?? [],
    'tiene_user_id' => isset($_SESSION['user_id']),
    'user_id' => $_SESSION['user_id'] ?? null,
    'usuario' => $_SESSION['usuario'] ?? null,
    'rol' => $_SESSION['id_rol_admin'] ?? null,
];

// Verificar conexión a BD
try {
    $host = "localhost";
    $db = "mesa_ayuda_final";
    $user = "root";
    $pass = "";
    
    $conn = new mysqli($host, $user, $pass, $db);
    
    if ($conn->connect_error) {
        $diagnostico['bd_conectada'] = false;
        $diagnostico['bd_error'] = $conn->connect_error;
    } else {
        $diagnostico['bd_conectada'] = true;
        
        // Probar query
        $result = $conn->query("SELECT COUNT(*) as total FROM usuarios");
        if ($result) {
            $row = $result->fetch_assoc();
            $diagnostico['bd_usuarios'] = $row['total'];
        } else {
            $diagnostico['bd_query_error'] = $conn->error;
        }
    }
} catch (Exception $e) {
    $diagnostico['bd_exception'] = $e->getMessage();
}

// Verificar archivos config
$diagnostico['archivo_conexion_existe'] = file_exists(__DIR__ . '/config/conexion.php');
$diagnostico['archivo_functions_existe'] = file_exists(__DIR__ . '/config/functions.php');

// Verificar PHP
$diagnostico['php_version'] = phpversion();
$diagnostico['php_extensions'] = [
    'mysqli' => extension_loaded('mysqli'),
    'session' => extension_loaded('session'),
    'json' => extension_loaded('json'),
];

echo json_encode($diagnostico, JSON_PRETTY_PRINT);
?>
