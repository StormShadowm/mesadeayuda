<?php
/**
 * tickets_api.php - API DEFINITIVA COMPLETA
 * Con minutos_sin_respuesta implementado en TODAS las funciones
 */

session_start();

$host = "localhost";
$db = "mesa_ayuda_final";
$user = "root";
$pass = "";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Error de conexión']));
}
$conn->set_charset('utf8mb4');

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    die(json_encode(['success' => false, 'message' => 'No autenticado']));
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'list':
        listar_tickets();
        break;
    case 'list_filtered':
        listar_tickets_filtrados();
        break;
    case 'create':
        crear_ticket();
        break;
    case 'get':
        obtener_ticket();
        break;
    case 'update_status':
        actualizar_estado();
        break;
    case 'update_priority':
        actualizar_prioridad();
        break;
    case 'assign':
        asignar_ticket();
        break;
    case 'close':
        cerrar_ticket();
        break;
    case 'add_comment':
        agregar_comentario();
        break;
    case 'get_comments':
        obtener_comentarios();
        break;
    case 'stats':
        obtener_estadisticas();
        break;
    case 'get_categories':
        obtener_categorias();
        break;
    case 'get_subcategories':
        obtener_subcategorias();
        break;
    case 'get_admin_users':
        obtener_usuarios_admin();
        break;
    default:
        die(json_encode(['success' => false, 'message' => 'Acción no válida']));
}

// ==================== FUNCIONES ====================

function listar_tickets() {
    global $conn;
    $user_id = $_SESSION['user_id'];
    $rol = $_SESSION['id_rol_admin'];
    
    // Query base con DOS TIEMPOS
    $base_select = "SELECT t.*, 
                  CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS nombre_usuario,
                  u.email AS email_usuario,
                  CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS nombre_asignado,
                  
                  TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) AS minutos_abierto,
                  
                  CASE 
                      WHEN (SELECT MAX(m.fecha_envio) 
                            FROM mensajes_ticket m 
                            INNER JOIN usuarios u2 ON m.id_usuario = u2.id 
                            WHERE m.id_ticket = t.id 
                            AND u2.id_rol_admin <= 3) IS NOT NULL
                      THEN TIMESTAMPDIFF(MINUTE, 
                          (SELECT MAX(m.fecha_envio) 
                           FROM mensajes_ticket m 
                           INNER JOIN usuarios u2 ON m.id_usuario = u2.id 
                           WHERE m.id_ticket = t.id 
                           AND u2.id_rol_admin <= 3), 
                          NOW())
                      ELSE TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW())
                  END AS minutos_sin_respuesta,
                  
                  CASE 
                      WHEN t.archivo_adjunto IS NOT NULL THEN 'Sí'
                      WHEN (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id AND archivo_adjunto IS NOT NULL) > 0 THEN 'Sí'
                      ELSE 'No'
                  END AS tiene_adjunto,
                  
                  (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) AS respuestas
                  
                  FROM tickets t
                  LEFT JOIN usuarios u ON t.id_usuario = u.id
                  LEFT JOIN usuarios a ON t.id_asignado = a.id";
    
    if ($rol <= 3) {
        // Admin ve todos
        $query = $base_select . " WHERE (t.id_asignado = ? OR t.id_asignado IS NULL OR t.id_usuario = ?) ORDER BY t.fecha_creacion DESC";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ii", $user_id, $user_id);
    } else {
        // Usuario ve solo los suyos
        $query = $base_select . " WHERE t.id_usuario = ? ORDER BY t.fecha_creacion DESC";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $user_id);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tickets = [];
    while ($row = $result->fetch_assoc()) {
        $tickets[] = $row;
    }
    
    echo json_encode(['success' => true, 'tickets' => $tickets]);
    exit;
}

function listar_tickets_filtrados() {
    global $conn;
    $user_id = $_SESSION['user_id'];
    $rol = $_SESSION['id_rol_admin'];
    
    $usuarios = isset($_POST['usuarios']) ? $_POST['usuarios'] : [];
    $fecha_desde = $_POST['fecha_desde'] ?? '';
    $fecha_hasta = $_POST['fecha_hasta'] ?? '';
    $estado = $_POST['estado'] ?? '';
    $prioridad = $_POST['prioridad'] ?? '';
    $categoria = $_POST['categoria'] ?? '';
    $tiene_adjunto = $_POST['tiene_adjunto'] ?? '';
    $busqueda = $_POST['busqueda'] ?? '';
    
    $where = [];
    $params = [];
    $types = '';
    
    if ($rol <= 3) {
        if (!empty($usuarios) && is_array($usuarios)) {
            $placeholders = str_repeat('?,', count($usuarios) - 1) . '?';
            $where[] = "t.id_usuario IN ($placeholders)";
            foreach ($usuarios as $u) {
                $params[] = intval($u);
                $types .= 'i';
            }
        }
    } else {
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
    if ($busqueda) {
        $where[] = "(t.id = ? OR t.titulo LIKE ? OR t.descripcion LIKE ? OR u.usuario LIKE ? OR u.email LIKE ?)";
        $params[] = intval($busqueda);
        $types .= 'i';
        $search_like = "%$busqueda%";
        $params[] = $search_like;
        $params[] = $search_like;
        $params[] = $search_like;
        $params[] = $search_like;
        $types .= 'ssss';
    }
    
    $where_sql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Query con DOS TIEMPOS
    $query = "SELECT t.*, 
              CONCAT(u.primer_nombre, ' ', u.primer_apellido) AS nombre_usuario,
              u.email AS email_usuario,
              CONCAT(a.primer_nombre, ' ', a.primer_apellido) AS nombre_asignado,
              
              TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) AS minutos_abierto,
              
              CASE 
                  WHEN (SELECT MAX(m.fecha_envio) 
                        FROM mensajes_ticket m 
                        INNER JOIN usuarios u2 ON m.id_usuario = u2.id 
                        WHERE m.id_ticket = t.id 
                        AND u2.id_rol_admin <= 3) IS NOT NULL
                  THEN TIMESTAMPDIFF(MINUTE, 
                      (SELECT MAX(m.fecha_envio) 
                       FROM mensajes_ticket m 
                       INNER JOIN usuarios u2 ON m.id_usuario = u2.id 
                       WHERE m.id_ticket = t.id 
                       AND u2.id_rol_admin <= 3), 
                      NOW())
                  ELSE TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW())
              END AS minutos_sin_respuesta,
              
              CASE 
                  WHEN t.archivo_adjunto IS NOT NULL THEN 'Sí'
                  WHEN (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id AND archivo_adjunto IS NOT NULL) > 0 THEN 'Sí'
                  ELSE 'No'
              END AS tiene_adjunto,
              
              (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) AS respuestas
              
              FROM tickets t
              LEFT JOIN usuarios u ON t.id_usuario = u.id
              LEFT JOIN usuarios a ON t.id_asignado = a.id
              $where_sql
              ORDER BY t.fecha_creacion DESC";
    
    $stmt = $conn->prepare($query);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tickets = [];
    while ($row = $result->fetch_assoc()) {
        $tickets[] = $row;
    }
    
    echo json_encode(['success' => true, 'tickets' => $tickets]);
    exit;
}

function crear_ticket() {
    global $conn;
    $titulo = trim($_POST['titulo'] ?? '');
    $descripcion = trim($_POST['descripcion'] ?? '');
    $categoria = trim($_POST['categoria'] ?? '');
    $subcategoria = trim($_POST['subcategoria'] ?? '');
    $prioridad = trim($_POST['prioridad'] ?? 'media');
    $user_id = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("INSERT INTO tickets (titulo, descripcion, categoria, subcategoria, prioridad, id_usuario, estado, fecha_creacion) 
                           VALUES (?, ?, ?, ?, ?, ?, 'Abierto', NOW())");
    $stmt->bind_param("sssssi", $titulo, $descripcion, $categoria, $subcategoria, $prioridad, $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Ticket creado', 'ticket_id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al crear ticket']);
    }
    exit;
}

function obtener_ticket() {
    global $conn;
    $ticket_id = intval($_GET['id'] ?? 0);
    
    $stmt = $conn->prepare("SELECT t.*, 
                           CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
                           u.email as email_usuario,
                           CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado,
                           TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) AS minutos_abierto,
                           
                           CASE 
                               WHEN (SELECT MAX(m.fecha_envio) 
                                     FROM mensajes_ticket m 
                                     INNER JOIN usuarios u2 ON m.id_usuario = u2.id 
                                     WHERE m.id_ticket = t.id 
                                     AND u2.id_rol_admin <= 3) IS NOT NULL
                               THEN TIMESTAMPDIFF(MINUTE, 
                                   (SELECT MAX(m.fecha_envio) 
                                    FROM mensajes_ticket m 
                                    INNER JOIN usuarios u2 ON m.id_usuario = u2.id 
                                    WHERE m.id_ticket = t.id 
                                    AND u2.id_rol_admin <= 3), 
                                   NOW())
                               ELSE TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW())
                           END AS minutos_sin_respuesta
                           
                           FROM tickets t
                           LEFT JOIN usuarios u ON t.id_usuario = u.id
                           LEFT JOIN usuarios a ON t.id_asignado = a.id
                           WHERE t.id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode(['success' => true, 'ticket' => $row]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Ticket no encontrado']);
    }
    exit;
}

function actualizar_estado() {
    global $conn;
    $ticket_id = intval($_POST['ticket_id'] ?? 0);
    $estado = trim($_POST['estado'] ?? '');
    
    $estados_validos = ['Abierto', 'En Proceso', 'Resuelto', 'Cerrado'];
    if (!in_array($estado, $estados_validos)) {
        echo json_encode(['success' => false, 'message' => 'Estado no válido']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE tickets SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?");
    $stmt->bind_param("si", $estado, $ticket_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Estado actualizado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error']);
    }
    exit;
}

function actualizar_prioridad() {
    global $conn;
    $ticket_id = intval($_POST['ticket_id'] ?? 0);
    $prioridad = trim($_POST['prioridad'] ?? '');
    
    $prioridades_validas = ['baja', 'media', 'alta', 'critica'];
    if (!in_array($prioridad, $prioridades_validas)) {
        echo json_encode(['success' => false, 'message' => 'Prioridad no válida']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE tickets SET prioridad = ?, fecha_actualizacion = NOW() WHERE id = ?");
    $stmt->bind_param("si", $prioridad, $ticket_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Prioridad actualizada']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error']);
    }
    exit;
}

function asignar_ticket() {
    global $conn;
    $ticket_id = intval($_POST['ticket_id'] ?? 0);
    $usuario_asignado = intval($_POST['usuario_asignado'] ?? 0);
    
    $stmt = $conn->prepare("UPDATE tickets SET id_asignado = ?, fecha_actualizacion = NOW() WHERE id = ?");
    $stmt->bind_param("ii", $usuario_asignado, $ticket_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Ticket asignado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al asignar']);
    }
    exit;
}

function cerrar_ticket() {
    global $conn;
    $ticket_id = intval($_POST['ticket_id'] ?? 0);
    $motivo = trim($_POST['motivo'] ?? '');
    $user_id = $_SESSION['user_id'];
    
    if (empty($motivo)) {
        echo json_encode(['success' => false, 'message' => 'Debe proporcionar un motivo']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE tickets SET estado = 'Cerrado', motivo_cierre = ?, usuario_cierre = ?, fecha_cierre = NOW(), fecha_actualizacion = NOW() WHERE id = ?");
    $stmt->bind_param("sii", $motivo, $user_id, $ticket_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Ticket cerrado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al cerrar']);
    }
    exit;
}

function agregar_comentario() {
    global $conn;
    $ticket_id = intval($_POST['ticket_id'] ?? 0);
    $mensaje = trim($_POST['mensaje'] ?? '');
    $user_id = $_SESSION['user_id'];
    
    if (empty($mensaje)) {
        echo json_encode(['success' => false, 'message' => 'Comentario vacío']);
        exit;
    }
    
    $stmt = $conn->prepare("INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, fecha_envio) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("iis", $ticket_id, $user_id, $mensaje);
    
    if ($stmt->execute()) {
        $conn->query("UPDATE tickets SET fecha_actualizacion = NOW() WHERE id = $ticket_id");
        echo json_encode(['success' => true, 'message' => 'Comentario agregado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error']);
    }
    exit;
}

function obtener_comentarios() {
    global $conn;
    $ticket_id = intval($_GET['ticket_id'] ?? 0);
    
    $stmt = $conn->prepare("SELECT m.*, 
                           CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario
                           FROM mensajes_ticket m
                           LEFT JOIN usuarios u ON m.id_usuario = u.id
                           WHERE m.id_ticket = ?
                           ORDER BY m.fecha_envio ASC");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comentarios = [];
    while ($row = $result->fetch_assoc()) {
        $comentarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'comentarios' => $comentarios]);
    exit;
}

function obtener_estadisticas() {
    global $conn;
    $user_id = $_SESSION['user_id'];
    $rol = $_SESSION['id_rol_admin'];
    
    $where = $rol > 3 ? "WHERE id_usuario = $user_id" : '';
    
    $query = "SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos,
              SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
              SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
              SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos,
              SUM(CASE WHEN prioridad = 'critica' THEN 1 ELSE 0 END) as criticos,
              SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) as altos,
              SUM(CASE WHEN prioridad = 'baja' THEN 1 ELSE 0 END) as bajos,
              SUM(CASE WHEN prioridad = 'media' THEN 1 ELSE 0 END) as medios
              FROM tickets $where";
    
    $result = $conn->query($query);
    $stats = $result->fetch_assoc();
    
    echo json_encode(['success' => true, 'stats' => $stats]);
    exit;
}

function obtener_categorias() {
    global $conn;
    $result = $conn->query("SELECT * FROM categorias WHERE activo = 1 ORDER BY orden");
    $categorias = [];
    while ($row = $result->fetch_assoc()) {
        $categorias[] = $row;
    }
    echo json_encode(['success' => true, 'categorias' => $categorias]);
    exit;
}

function obtener_subcategorias() {
    global $conn;
    $id_categoria = intval($_GET['id_categoria'] ?? 0);
    
    $stmt = $conn->prepare("SELECT * FROM subcategorias WHERE id_categoria = ? AND activo = 1 ORDER BY orden");
    $stmt->bind_param("i", $id_categoria);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $subcategorias = [];
    while ($row = $result->fetch_assoc()) {
        $subcategorias[] = $row;
    }
    echo json_encode(['success' => true, 'subcategorias' => $subcategorias]);
    exit;
}

function obtener_usuarios_admin() {
    global $conn;
    $result = $conn->query("SELECT id, CONCAT(primer_nombre, ' ', primer_apellido) as nombre 
                           FROM usuarios 
                           WHERE id_rol_admin <= 3 AND estado = 1 
                           ORDER BY primer_nombre");
    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $usuarios[] = $row;
    }
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
    exit;
}
?>
