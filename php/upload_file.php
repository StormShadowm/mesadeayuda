<?php
/**
 * upload_file.php - Manejador de subida de archivos
 * Permite subir archivos de cualquier tipo de forma segura
 */

session_start();
require_once '../config/conexion.php';
require_once '../config/functions.php';

header('Content-Type: application/json; charset=utf-8');

// Verificar sesión
verificar_sesion();

// Verificar que se envió un archivo
if (!isset($_FILES['archivo']) || $_FILES['archivo']['error'] !== UPLOAD_ERR_OK) {
    enviar_json(['success' => false, 'message' => 'No se recibió ningún archivo o hubo un error en la subida']);
}

$archivo = $_FILES['archivo'];
$ticket_id = isset($_POST['ticket_id']) ? intval($_POST['ticket_id']) : null;
$tipo = isset($_POST['tipo']) ? $_POST['tipo'] : 'ticket'; // 'ticket' o 'comentario'

// Configuración
$max_size = 50 * 1024 * 1024; // 50MB
$upload_dir = __DIR__ . '/../uploads/';

// Crear directorio si no existe
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

// Validar tamaño
if ($archivo['size'] > $max_size) {
    enviar_json(['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 50MB permitido']);
}

// Obtener información del archivo
$nombre_original = basename($archivo['name']);
$extension = strtolower(pathinfo($nombre_original, PATHINFO_EXTENSION));
$nombre_sin_extension = pathinfo($nombre_original, PATHINFO_FILENAME);

// Sanitizar nombre del archivo
$nombre_limpio = preg_replace('/[^a-zA-Z0-9_-]/', '_', $nombre_sin_extension);
$nombre_limpio = substr($nombre_limpio, 0, 50); // Limitar longitud

// Generar nombre único
$nombre_unico = $nombre_limpio . '_' . uniqid() . '_' . time();
if ($extension) {
    $nombre_unico .= '.' . $extension;
}

$ruta_destino = $upload_dir . $nombre_unico;

// Mover archivo
if (!move_uploaded_file($archivo['tmp_name'], $ruta_destino)) {
    enviar_json(['success' => false, 'message' => 'Error al guardar el archivo']);
}

// Registrar en base de datos si es necesario
if ($ticket_id && $tipo === 'ticket') {
    // Actualizar ticket con archivo adjunto
    $stmt = $conn->prepare("UPDATE tickets SET archivo_adjunto = ? WHERE id = ?");
    $stmt->bind_param("si", $nombre_unico, $ticket_id);
    $stmt->execute();
} elseif ($ticket_id && $tipo === 'comentario') {
    // Si es un comentario, guardar en la tabla de mensajes
    $mensaje = isset($_POST['mensaje']) ? limpiar_entrada($_POST['mensaje']) : 'Archivo adjunto';
    $user_id = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, archivo_adjunto) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iiss", $ticket_id, $user_id, $mensaje, $nombre_unico);
    $stmt->execute();
}

// Registrar actividad
registrar_actividad($conn, $_SESSION['user_id'], 'upload_file', "Archivo subido: $nombre_original");

enviar_json([
    'success' => true, 
    'message' => 'Archivo subido exitosamente',
    'filename' => $nombre_unico,
    'original_name' => $nombre_original,
    'size' => $archivo['size'],
    'extension' => $extension
]);
?>
