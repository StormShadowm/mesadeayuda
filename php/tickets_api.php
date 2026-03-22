<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

require_once 'permissions.php';

$conn = new mysqli("localhost", "root", "", "mesa_ayuda_final");
$conn->set_charset('utf8mb4');
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo '{"success":false,"message":"No autorizado"}';
    exit;
}

$user_id = $_SESSION['user_id'];
$user_rol = $_SESSION['id_rol_admin'];
$user_area = $_SESSION['id_area'] ?? null;
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// LIST
if ($action === 'list') {
    $query = TicketPermissions::getTicketsQuery($user_id, $user_rol, $user_area);
    $query = str_replace("SELECT t.*", "SELECT t.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario, CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado, ar.nombre as area_nombre, (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) as total_mensajes, TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) as minutos_abierto", $query);
    $query = str_replace("FROM tickets", "FROM tickets t LEFT JOIN usuarios u ON t.id_usuario = u.id LEFT JOIN usuarios a ON t.id_asignado = a.id LEFT JOIN areas ar ON t.id_area = ar.id", $query);
    $query = str_replace("WHERE id_area =", "WHERE t.id_area =", $query);


    error_log("=== DEBUG LIST ===");
    error_log("user_id: " . $user_id);
    error_log("user_rol: " . $user_rol);
    error_log("user_area: " . var_export($user_area, true));

    $query = TicketPermissions::getTicketsQuery($user_id, $user_rol, $user_area);
    error_log("Query inicial: " . $query);

    $query = str_replace("SELECT *", "SELECT t.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario, CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado, ar.nombre as area_nombre", $query);
    $query = str_replace("FROM tickets", "FROM tickets t LEFT JOIN usuarios u ON t.id_usuario = u.id LEFT JOIN usuarios a ON t.id_asignado = a.id LEFT JOIN areas ar ON t.id_area = ar.id", $query);
    $query = str_replace("WHERE id_area =", "WHERE t.id_area =", $query);

    error_log("Query final: " . $query);

    $result = $conn->query($query);

    if (!$result) {
        error_log("ERROR SQL: " . $conn->error);
    } else {
        error_log("Filas encontradas: " . $result->num_rows);
    }

    $result = $conn->query($query);
    $tickets = array();
    while ($row = $result->fetch_assoc()) {
        $tickets[] = $row;
    }
    echo json_encode(['success' => true, 'tickets' => $tickets]);
}

// LIST_FILTERED - Con filtros avanzados
elseif ($action === 'list_filtered') {
    $busqueda = isset($_POST['busqueda']) ? trim($_POST['busqueda']) : '';
    $usuarios = isset($_POST['usuarios']) ? $_POST['usuarios'] : [];
    $fecha_desde = isset($_POST['fecha_desde']) ? $_POST['fecha_desde'] : '';
    $fecha_hasta = isset($_POST['fecha_hasta']) ? $_POST['fecha_hasta'] : '';
    $estado = isset($_POST['estado']) ? $_POST['estado'] : '';
    $prioridad = isset($_POST['prioridad']) ? $_POST['prioridad'] : '';
    $categoria = isset($_POST['categoria']) ? $_POST['categoria'] : '';
    $tiene_adjunto = isset($_POST['tiene_adjunto']) ? $_POST['tiene_adjunto'] : '';

    // Query base según permisos
    $base_query = TicketPermissions::getTicketsQuery($user_id, $user_rol, $user_area);

    // SELECT con campos calculados
    $select_fields = "SELECT t.*, 
        CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
        CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado,
        ar.nombre as area_nombre,
        u.email as email_usuario,
        TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) as minutos_abierto,
        (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) as num_respuestas";

    // Construir WHERE adicional
    $where_conditions = [];

    if (!empty($busqueda)) {
        $busqueda_escaped = $conn->real_escape_string($busqueda);
        $where_conditions[] = "(t.id LIKE '%$busqueda_escaped%' OR t.titulo LIKE '%$busqueda_escaped%' OR t.descripcion LIKE '%$busqueda_escaped%' OR CONCAT(u.primer_nombre, ' ', u.primer_apellido) LIKE '%$busqueda_escaped%')";
    }

    if (!empty($usuarios) && is_array($usuarios)) {
        $user_ids = implode(',', array_map('intval', $usuarios));
        $where_conditions[] = "t.id_usuario IN ($user_ids)";
    }

    if (!empty($fecha_desde)) {
        $fecha_desde_escaped = $conn->real_escape_string($fecha_desde);
        $where_conditions[] = "DATE(t.fecha_creacion) >= '$fecha_desde_escaped'";
    }

    if (!empty($fecha_hasta)) {
        $fecha_hasta_escaped = $conn->real_escape_string($fecha_hasta);
        $where_conditions[] = "DATE(t.fecha_creacion) <= '$fecha_hasta_escaped'";
    }

    if (!empty($estado)) {
        $estado_escaped = $conn->real_escape_string($estado);
        $where_conditions[] = "t.estado = '$estado_escaped'";
    }

    if (!empty($prioridad)) {
        $prioridad_escaped = $conn->real_escape_string($prioridad);
        $where_conditions[] = "t.prioridad = '$prioridad_escaped'";
    }

    if (!empty($categoria)) {
        $categoria_escaped = $conn->real_escape_string($categoria);
        $where_conditions[] = "t.categoria = '$categoria_escaped'";
    }

    if ($tiene_adjunto === '1') {
        $where_conditions[] = "(t.archivo_adjunto IS NOT NULL AND t.archivo_adjunto != '')";
    } elseif ($tiene_adjunto === '0') {
        $where_conditions[] = "(t.archivo_adjunto IS NULL OR t.archivo_adjunto = '')";
    }

    // Construir query
    $query = str_replace("SELECT *", $select_fields, $base_query);
    $query = str_replace("FROM tickets", "FROM tickets t", $query);
    $query = str_replace("WHERE id_area =", "WHERE t.id_area =", $query);
    $query = str_replace("WHERE id_usuario =", "WHERE t.id_usuario =", $query);

    // JOINs
    $joins = " LEFT JOIN usuarios u ON t.id_usuario = u.id LEFT JOIN usuarios a ON t.id_asignado = a.id LEFT JOIN areas ar ON t.id_area = ar.id";
    $query = str_replace("FROM tickets t", "FROM tickets t" . $joins, $query);

    // WHERE adicionales
    if (!empty($where_conditions)) {
        $additional_where = implode(' AND ', $where_conditions);
        if (strpos($query, 'WHERE') !== false) {
            $query = preg_replace('/ORDER BY/', "AND ($additional_where) ORDER BY", $query, 1);
        } else {
            $query = preg_replace('/ORDER BY/', "WHERE ($additional_where) ORDER BY", $query, 1);
        }
    }

    // ORDER BY
    if (strpos($query, 'ORDER BY') === false) {
        $query .= " ORDER BY t.fecha_creacion DESC";
    } else {
        $query = str_replace("ORDER BY fecha_creacion", "ORDER BY t.fecha_creacion", $query);
    }

    $result = $conn->query($query);

    if (!$result) {
        error_log("Error SQL: " . $conn->error);
        error_log("Query: " . $query);
        echo json_encode(['success' => false, 'message' => 'Error: ' . $conn->error]);
        exit;
    }

    $tickets = array();
    while ($row = $result->fetch_assoc()) {
        $tickets[] = $row;
    }

    echo json_encode(['success' => true, 'tickets' => $tickets]);
}

// CREATE
elseif ($action === 'create') {
    $titulo = isset($_POST['titulo']) ? trim($_POST['titulo']) : '';
    $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : '';
    $categoria = isset($_POST['categoria']) ? trim($_POST['categoria']) : 'otro';
    $subcategoria = isset($_POST['subcategoria']) ? trim($_POST['subcategoria']) : '';
    $prioridad = isset($_POST['prioridad']) ? trim($_POST['prioridad']) : 'media';
    $id_area = isset($_POST['id_area']) ? (int)$_POST['id_area'] : $user_area;

    if (!$id_area && $user_area) {
        $id_area = $user_area;
    }

    if (!$id_area || $id_area === 0) {
        $id_area = 1;
    }

    $stmt = $conn->prepare("INSERT INTO tickets (titulo, descripcion, categoria, subcategoria, prioridad, id_usuario, id_area, estado) VALUES (?, ?, ?, ?, ?, ?, ?, 'Abierto')");
    $stmt->bind_param("sssssii", $titulo, $descripcion, $categoria, $subcategoria, $prioridad, $user_id, $id_area);

    if ($stmt->execute()) {
        $ticket_id = $conn->insert_id;
        TicketPermissions::registrarHistorial($conn, $ticket_id, 'creacion', $user_id);
        echo json_encode(['success' => true, 'ticket_id' => $ticket_id]);
    } else {
        echo '{"success":false,"message":"Error al crear"}';
    }
}

// GET
elseif ($action === 'get') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

    if (!TicketPermissions::puedeVerTicket($conn, $user_id, $user_rol, $user_area, $id)) {
        echo json_encode(['success' => false, 'message' => 'No tienes permiso']);
        exit;
    }

    $stmt = $conn->prepare("SELECT t.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario, u.email as email_usuario, ar.nombre as area_nombre FROM tickets t LEFT JOIN usuarios u ON t.id_usuario = u.id LEFT JOIN areas ar ON t.id_area = ar.id WHERE t.id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();

    echo json_encode(['success' => true, 'ticket' => $ticket]);
}

// UPDATE_STATUS
elseif ($action === 'update_status') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $nuevo_estado = isset($_POST['estado']) ? trim($_POST['estado']) : '';

    $stmt = $conn->prepare("SELECT * FROM tickets WHERE id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();

    if (!$ticket) {
        echo json_encode(['success' => false, 'message' => 'Ticket no encontrado']);
        exit;
    }

    if ($nuevo_estado === 'Cerrado' && !TicketPermissions::puedeCerrarTicket($user_rol, $user_id, $ticket)) {
        echo json_encode(['success' => false, 'message' => 'No tienes permiso']);
        exit;
    }

    $estado_anterior = $ticket['estado'];

    $stmt = $conn->prepare("UPDATE tickets SET estado = ? WHERE id = ?");
    $stmt->bind_param("si", $nuevo_estado, $ticket_id);

    if ($stmt->execute()) {
        TicketPermissions::registrarHistorial($conn, $ticket_id, 'cambio_estado', $user_id, 'estado', $estado_anterior, $nuevo_estado);
        echo '{"success":true,"message":"Estado actualizado"}';
    } else {
        echo '{"success":false,"message":"Error"}';
    }
}

// UPDATE_PRIORITY
elseif ($action === 'update_priority') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $prioridad = isset($_POST['prioridad']) ? trim($_POST['prioridad']) : '';

    $stmt = $conn->prepare("SELECT * FROM tickets WHERE id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();

    $prioridad_anterior = $ticket['prioridad'];

    $stmt = $conn->prepare("UPDATE tickets SET prioridad = ? WHERE id = ?");
    $stmt->bind_param("si", $prioridad, $ticket_id);

    if ($stmt->execute()) {
        TicketPermissions::registrarHistorial($conn, $ticket_id, 'cambio_prioridad', $user_id, 'prioridad', $prioridad_anterior, $prioridad);
        echo '{"success":true,"message":"Prioridad actualizada"}';
    } else {
        echo '{"success":false,"message":"Error"}';
    }
}

// ASSIGN
elseif ($action === 'assign') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $asignado_a = isset($_POST['id_usuario_asignado']) ? (int)$_POST['id_usuario_asignado'] : 0;

    if ($ticket_id <= 0 || $asignado_a <= 0) {
        echo json_encode(["success" => false, "message" => "Datos inválidos"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM tickets WHERE id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();

    if (!TicketPermissions::puedeAsignarTecnico($user_rol, $user_id, $ticket)) {
        echo json_encode(["success" => false, "message" => "No tienes permiso"]);
        exit;
    }

    $asignado_anterior = $ticket['id_asignado'];

    $stmt = $conn->prepare("UPDATE tickets SET id_asignado = ? WHERE id = ?");
    $stmt->bind_param("ii", $asignado_a, $ticket_id);

    if ($stmt->execute()) {
        TicketPermissions::registrarHistorial($conn, $ticket_id, 'asignacion', $user_id, 'id_asignado', $asignado_anterior, $asignado_a);
        echo json_encode(["success" => true, "message" => "Técnico asignado"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
    }
}

// CHANGE_AREA
elseif ($action === 'change_area') {
    if (!TicketPermissions::puedeCambiarArea($user_rol)) {
        echo json_encode(['success' => false, 'message' => 'No tienes permiso']);
        exit;
    }

    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $nueva_area = isset($_POST['id_area']) ? (int)$_POST['id_area'] : 0;

    $stmt = $conn->prepare("SELECT id_area FROM tickets WHERE id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result()->fetch_assoc();
    $area_anterior = $result['id_area'];

    $stmt = $conn->prepare("UPDATE tickets SET id_area = ? WHERE id = ?");
    $stmt->bind_param("ii", $nueva_area, $ticket_id);

    if ($stmt->execute()) {
        TicketPermissions::registrarHistorial($conn, $ticket_id, 'cambio_area', $user_id, 'id_area', $area_anterior, $nueva_area);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error']);
    }
}

// GET_AREAS
elseif ($action === 'get_areas') {
    $result = $conn->query("SELECT id, nombre FROM areas ORDER BY nombre ASC");
    $areas = [];
    while ($row = $result->fetch_assoc()) {
        $areas[] = $row;
    }
    echo json_encode(['success' => true, 'areas' => $areas]);
}

// GET_HISTORIAL
elseif ($action === 'get_historial') {
    $ticket_id = isset($_GET['ticket_id']) ? (int)$_GET['ticket_id'] : 0;
    $historial = TicketPermissions::getHistorialTicket($conn, $ticket_id, $user_rol);
    echo json_encode(['success' => true, 'historial' => $historial]);
}

// EDIT_MESSAGE
elseif ($action === 'edit_message') {
    if (!TicketPermissions::puedeEditarMensajes($user_rol)) {
        echo json_encode(['success' => false, 'message' => 'No tienes permiso']);
        exit;
    }

    $message_id = isset($_POST['message_id']) ? (int)$_POST['message_id'] : 0;
    $nuevo_mensaje = isset($_POST['mensaje']) ? trim($_POST['mensaje']) : '';

    $stmt = $conn->prepare("UPDATE mensajes_ticket SET mensaje = ?, editado = 1, fecha_edicion = NOW(), usuario_edicion = ? WHERE id = ?");
    $stmt->bind_param("sii", $nuevo_mensaje, $user_id, $message_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error']);
    }
}

// GET_CATEGORIES
elseif ($action === 'get_categories') {
    echo '{"success":true,"categorias":[{"id":"hardware","nombre":"Hardware"},{"id":"software","nombre":"Software"},{"id":"red","nombre":"Red"},{"id":"acceso","nombre":"Acceso"},{"id":"otro","nombre":"Otro"}]}';
}

// GET_ADMIN_USERS
elseif ($action === 'get_admin_users') {
    $result = $conn->query("SELECT id, CONCAT(primer_nombre, ' ', primer_apellido) as nombre_completo FROM usuarios WHERE id_rol_admin <= 3 AND estado = 1 ORDER BY primer_nombre");
    $usuarios = array();
    while ($row = $result->fetch_assoc()) {
        $usuarios[] = $row;
    }
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
}

// ADD_COMMENT
elseif ($action === 'add_comment') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $mensaje = isset($_POST['mensaje']) ? trim($_POST['mensaje']) : '';

    $stmt = $conn->prepare("SELECT * FROM tickets WHERE id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();

    if (!TicketPermissions::puedeEnviarMensajes($user_rol, $user_id, $ticket)) {
        echo json_encode(['success' => false, 'message' => 'No tienes permiso']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, fecha_envio) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("iis", $ticket_id, $user_id, $mensaje);

    if ($stmt->execute()) {
        TicketPermissions::registrarHistorial($conn, $ticket_id, 'comentario', $user_id);
        echo '{"success":true}';
    } else {
        echo '{"success":false}';
    }
}

// GET_COMMENTS
elseif ($action === 'get_comments') {
    $ticket_id = isset($_GET['ticket_id']) ? (int)$_GET['ticket_id'] : 0;

    $stmt = $conn->prepare("SELECT m.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as usuario FROM mensajes_ticket m LEFT JOIN usuarios u ON m.id_usuario = u.id WHERE m.id_ticket = ? ORDER BY m.fecha_envio ASC");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $comments = array();
    while ($row = $result->fetch_assoc()) {
        $comments[] = $row;
    }

    echo json_encode(['success' => true, 'comments' => $comments]);
}

// CLOSE
elseif ($action === 'close') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $motivo = isset($_POST['motivo']) ? trim($_POST['motivo']) : '';

    if ($ticket_id <= 0 || empty($motivo)) {
        echo json_encode(['success' => false, 'message' => 'Datos inválidos']);
        exit;
    }

    $stmt = $conn->prepare("SELECT * FROM tickets WHERE id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();

    if (!TicketPermissions::puedeCerrarTicket($user_rol, $user_id, $ticket)) {
        echo json_encode(['success' => false, 'message' => 'No tienes permiso']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE tickets SET estado = 'Cerrado', motivo_cierre = ?, fecha_cierre = NOW() WHERE id = ?");
    $stmt->bind_param("si", $motivo, $ticket_id);

    if ($stmt->execute()) {
        $mensaje_cierre = "🔒 Ticket cerrado. Motivo: " . $motivo;
        $stmt2 = $conn->prepare("INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, fecha_envio) VALUES (?, ?, ?, NOW())");
        $stmt2->bind_param("iis", $ticket_id, $user_id, $mensaje_cierre);
        $stmt2->execute();

        TicketPermissions::registrarHistorial($conn, $ticket_id, 'cierre', $user_id);

        echo json_encode(['success' => true, 'message' => 'Ticket cerrado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error']);
    }
}

// STATS
elseif ($action === 'stats') {
    $fecha_desde = isset($_GET['fecha_desde']) ? $_GET['fecha_desde'] : '';
    $fecha_hasta = isset($_GET['fecha_hasta']) ? $_GET['fecha_hasta'] : '';
    $estado_filtro = isset($_GET['estado']) ? $_GET['estado'] : '';
    $prioridad_filtro = isset($_GET['prioridad']) ? $_GET['prioridad'] : '';

    if ($user_rol > 3) {
        $where = " WHERE id_usuario = $user_id";
    } elseif ($user_rol == 2 || $user_rol == 3) {
        if ($user_area === null || $user_area === '') {
            $where = " WHERE 1=0";
        } else {
            $where = " WHERE id_area = $user_area";
        }
    } else {
        $where = " WHERE 1=1";
    }

    if ($fecha_desde) $where .= " AND DATE(fecha_creacion) >= '$fecha_desde'";
    if ($fecha_hasta) $where .= " AND DATE(fecha_creacion) <= '$fecha_hasta'";
    if ($estado_filtro) $where .= " AND estado = '$estado_filtro'";
    if ($prioridad_filtro) $where .= " AND prioridad = '$prioridad_filtro'";

    $query = "SELECT COUNT(*) as total, SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos, SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso, SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos, SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados, SUM(CASE WHEN numero_reapertura > 0 THEN 1 ELSE 0 END) as reabiertos, SUM(CASE WHEN prioridad IN ('alta', 'critica') AND estado NOT IN ('Cerrado', 'Resuelto') THEN 1 ELSE 0 END) as urgentes FROM tickets" . $where;

    $result = $conn->query($query);
    $stats = $result->fetch_assoc();

    echo json_encode(['success' => true, 'stats' => $stats]);
}

// GET_SUBCATEGORIES
elseif ($action === 'get_subcategories') {
    $id_categoria = isset($_GET['id_categoria']) ? trim($_GET['id_categoria']) : '';

    if (empty($id_categoria)) {
        echo json_encode(['success' => false, 'message' => 'Categoría requerida']);
        exit;
    }

    $categorias_map = ['hardware' => 1, 'software' => 2, 'red' => 3, 'acceso' => 4, 'otro' => 5];
    $id_categoria_num = isset($categorias_map[$id_categoria]) ? $categorias_map[$id_categoria] : (int)$id_categoria;

    $stmt = $conn->prepare("SELECT id, nombre FROM subcategorias WHERE id_categoria = ? AND activo = 1 ORDER BY orden, nombre");
    $stmt->bind_param("i", $id_categoria_num);
    $stmt->execute();
    $result = $stmt->get_result();

    $subcategorias = array();
    while ($row = $result->fetch_assoc()) {
        $subcategorias[] = $row;
    }

    echo json_encode(['success' => true, 'subcategorias' => $subcategorias]);
} else {
    echo '{"success":false,"message":"Accion no valida"}';
}

$conn->close();
