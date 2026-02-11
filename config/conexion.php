<?php
/**
 * Conexión a Base de Datos - Versión Mejorada
 */

// Configuración
define('DB_HOST', 'localhost');
define('DB_NAME', 'mesa_ayuda_final');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Configuración de errores (cambiar en producción)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }
    
    if (!$conn->set_charset(DB_CHARSET)) {
        throw new Exception("Error al establecer charset");
    }
    
} catch (Exception $e) {
    error_log($e->getMessage());
    die("Error al conectar con la base de datos. Por favor, intente más tarde.");
}

// Funciones auxiliares
function limpiar_entrada($data) {
    global $conn;
    return $conn->real_escape_string(trim(stripslashes($data)));
}

function hash_password($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
}

function verificar_password($password, $hash) {
    return password_verify($password, $hash);
}
?>