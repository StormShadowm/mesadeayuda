<?php
/**
 * conexion.php
 * Archivo de conexión a la base de datos
 */

$host = "localhost";
$db = "mesa_ayuda_final";
$user = "root";
$pass = "";

try {
    $conn = new mysqli($host, $user, $pass, $db);
    
    if ($conn->connect_error) {
        throw new Exception('Error de conexión: ' . $conn->connect_error);
    }
    
    $conn->set_charset('utf8mb4');
} catch (Exception $e) {
    die('Error de conexión a la base de datos');
}
?>
