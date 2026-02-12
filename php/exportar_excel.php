<?php
/**
 * exportar_excel.php - Exportador de Reportes a Excel
 * Genera archivo Excel con estadísticas de tickets
 */

session_start();
require_once '../config/conexion.php';

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    die('No autenticado');
}

$user_id = $_SESSION['user_id'];
$rol = $_SESSION['id_rol_admin'];

// Obtener filtros
$fecha_desde = $_GET['fecha_desde'] ?? '';
$fecha_hasta = $_GET['fecha_hasta'] ?? '';
$estado = $_GET['estado'] ?? '';
$prioridad = $_GET['prioridad'] ?? '';
$categoria = $_GET['categoria'] ?? '';

// Construir query
$where = [];
$params = [];
$types = '';

if ($rol > 3) {
    $where[] = "t.id_usuario = ?";
    $params[] = $user_id;
    $types .= 'i';
}

if ($fecha_desde) {
    $where[] = "DATE(t.fecha_creacion) >= ?";
    $params[] = $fecha_desde;
    $types .= 's';
}

if ($fecha_hasta) {
    $where[] = "DATE(t.fecha_creacion) <= ?";
    $params[] = $fecha_hasta;
    $types .= 's';
}

if ($estado) {
    $where[] = "t.estado = ?";
    $params[] = $estado;
    $types .= 's';
}

if ($prioridad) {
    $where[] = "t.prioridad = ?";
    $params[] = $prioridad;
    $types .= 's';
}

if ($categoria) {
    $where[] = "t.categoria = ?";
    $params[] = $categoria;
    $types .= 's';
}

$where_sql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

$query = "SELECT 
    t.id,
    t.titulo,
    t.descripcion,
    t.categoria,
    t.subcategoria,
    t.prioridad,
    t.estado,
    CONCAT(u.primer_nombre, ' ', u.primer_apellido) as usuario,
    u.email as email_usuario,
    u.telefono as telefono_usuario,
    CONCAT(a.primer_nombre, ' ', a.primer_apellido) as asignado_a,
    ar.nombre as area_usuario,
    t.fecha_creacion,
    t.fecha_actualizacion,
    t.fecha_cierre,
    t.motivo_cierre,
    TIMESTAMPDIFF(HOUR, t.fecha_creacion, IFNULL(t.fecha_cierre, NOW())) as horas_resolucion,
    (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) as total_comentarios,
    CASE 
        WHEN t.archivo_adjunto IS NOT NULL THEN 'Sí'
        WHEN (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id AND archivo_adjunto IS NOT NULL) > 0 THEN 'Sí'
        ELSE 'No'
    END as tiene_adjunto
FROM tickets t
LEFT JOIN usuarios u ON t.id_usuario = u.id
LEFT JOIN usuarios a ON t.id_asignado = a.id
LEFT JOIN areas ar ON u.id_area = ar.id
$where_sql
ORDER BY t.fecha_creacion DESC";

$stmt = $conn->prepare($query);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

// Crear archivo CSV (compatible con Excel)
$filename = "reporte_tickets_" . date('Y-m-d_His') . ".csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Pragma: no-cache');
header('Expires: 0');

// Abrir output
$output = fopen('php://output', 'w');

// BOM para UTF-8
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// Encabezados
$headers = [
    'ID',
    'Título',
    'Descripción',
    'Categoría',
    'Subcategoría',
    'Prioridad',
    'Estado',
    'Usuario',
    'Email Usuario',
    'Teléfono Usuario',
    'Asignado A',
    'Área',
    'Fecha Creación',
    'Fecha Actualización',
    'Fecha Cierre',
    'Motivo Cierre',
    'Horas Resolución',
    'Total Comentarios',
    'Tiene Adjunto'
];

fputcsv($output, $headers, ';');

// Datos
while ($row = $result->fetch_assoc()) {
    $data = [
        $row['id'],
        $row['titulo'],
        $row['descripcion'],
        $row['categoria'],
        $row['subcategoria'],
        strtoupper($row['prioridad']),
        $row['estado'],
        $row['usuario'],
        $row['email_usuario'],
        $row['telefono_usuario'],
        $row['asignado_a'] ?: 'Sin asignar',
        $row['area_usuario'] ?: 'Sin área',
        $row['fecha_creacion'],
        $row['fecha_actualizacion'],
        $row['fecha_cierre'] ?: '-',
        $row['motivo_cierre'] ?: '-',
        $row['horas_resolucion'],
        $row['total_comentarios'],
        $row['tiene_adjunto']
    ];
    
    fputcsv($output, $data, ';');
}

fclose($output);
exit;
?>
