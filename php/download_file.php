<?php
/**
 * download_file.php - Manejador de descarga de archivos
 * Permite descargar archivos de forma segura
 */

session_start();
require_once '../config/conexion.php';
require_once '../config/functions.php';

// Verificar sesión
verificar_sesion();

// Obtener nombre del archivo
$filename = isset($_GET['file']) ? basename($_GET['file']) : '';

if (empty($filename)) {
    die('Archivo no especificado');
}

// Ruta del archivo
$file_path = __DIR__ . '/../uploads/' . $filename;

// Verificar que el archivo existe
if (!file_exists($file_path)) {
    die('Archivo no encontrado');
}

// Obtener información del archivo
$file_size = filesize($file_path);
$file_extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

// Determinar MIME type
$mime_types = [
    // Documentos
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls' => 'application/vnd.ms-excel',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt' => 'application/vnd.ms-powerpoint',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt' => 'text/plain',
    'csv' => 'text/csv',
    'rtf' => 'application/rtf',
    'odt' => 'application/vnd.oasis.opendocument.text',
    
    // Imágenes
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'gif' => 'image/gif',
    'bmp' => 'image/bmp',
    'svg' => 'image/svg+xml',
    'webp' => 'image/webp',
    'ico' => 'image/x-icon',
    
    // Audio
    'mp3' => 'audio/mpeg',
    'wav' => 'audio/wav',
    'ogg' => 'audio/ogg',
    'm4a' => 'audio/mp4',
    
    // Video
    'mp4' => 'video/mp4',
    'avi' => 'video/x-msvideo',
    'mov' => 'video/quicktime',
    'wmv' => 'video/x-ms-wmv',
    'flv' => 'video/x-flv',
    'mkv' => 'video/x-matroska',
    
    // Comprimidos
    'zip' => 'application/zip',
    'rar' => 'application/x-rar-compressed',
    '7z' => 'application/x-7z-compressed',
    'tar' => 'application/x-tar',
    'gz' => 'application/gzip',
    
    // Código
    'html' => 'text/html',
    'css' => 'text/css',
    'js' => 'application/javascript',
    'json' => 'application/json',
    'xml' => 'application/xml',
    'php' => 'text/plain',
    'py' => 'text/plain',
    'java' => 'text/plain',
    'cpp' => 'text/plain',
    'c' => 'text/plain',
    
    // Otros
    'apk' => 'application/vnd.android.package-archive',
    'exe' => 'application/x-msdownload',
    'dmg' => 'application/x-apple-diskimage',
    'iso' => 'application/x-iso9660-image',
];

$mime_type = isset($mime_types[$file_extension]) ? $mime_types[$file_extension] : 'application/octet-stream';

// Limpiar buffer de salida
if (ob_get_level()) {
    ob_end_clean();
}

// Establecer headers
header('Content-Type: ' . $mime_type);
header('Content-Length: ' . $file_size);
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
header('Pragma: public');
header('Expires: 0');

// Registrar descarga
registrar_actividad($conn, $_SESSION['user_id'], 'download_file', "Archivo descargado: $filename");

// Enviar archivo
readfile($file_path);
exit;
?>
