<?php
/**
 * tickets_api.php - API para gestión de tickets
 * Versión CORREGIDA con manejo completo de estados
 */

session_start();
require_once '../config/conexion.php';
require_once '../config/functions.php';

header('Content-Type: application/json; charset=utf-8');

verificar_sesion();

function obtenerNumeroTicket($id, $numero_reapertura, $id_ticket_original) {
    if ($numero_reapertura > 0) {
        $original = $id_ticket_original ?? $id;
        return $original . '-' . $numero_reapertura;
    }
    return (string)$id;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'list':
        listar_tickets($conn);
        break;
    case 'create':
        crear_ticket($conn);
        break;
    case 'get':
        obtener_ticket($conn);
        break;
    case 'update':
        actualizar_ticket($conn);
        break;
    case 'update_status':
        actualizar_estado($conn);
        break;
    case 'add_comment':
        agregar_comentario($conn);
        break;
    case 'get_comments':
        obtener_comentarios($conn);
        break;
    case 'stats':
        obtener_estadisticas($conn);
        break;
    default:
        enviar_json(['success' => false, 'message' => 'Acción no válida']);
}

function obtenerNumeroTicket($id, $numero_reapertura, $id_ticket_original) {
    if ($numero_reapertura > 0) {
        $original = $id_ticket_original ?? $id;
        return $original . '-' . $numero_reapertura;
    }
    return (string)$id;
}

function listar_tickets($conn) {
    $user_id = $_SESSION['user_id'];
    $rol = $_SESSION['id_rol_admin'];
    
    // Admin ve todos, usuario solo los suyos
    if ($rol <= 3) {
        $query = "
    SELECT 
        t.*,
        CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
        CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado,
        (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) as total_mensajes,
        TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) as minutos_abierto,
        CASE 
            WHEN numero_reapertura > 0 THEN CONCAT(COALESCE(id_ticket_original, id), '-', numero_reapertura)
            ELSE CAST(id AS CHAR)
        END as ticket_numero
    FROM tickets t
    LEFT JOIN usuarios u ON t.id_usuario = u.id
    LEFT JOIN usuarios a ON t.id_asignado = a.id
    WHERE 1=1
";

// Agregar filtros según rol
if ($user_rol == 4) { // Usuario normal
    $query .= " AND t.id_usuario = $user_id";
}

// Ordenar de nuevo a más viejo (por defecto)
$query .= " ORDER BY t.fecha_creacion DESC";

$result = $conn->query($query);
$tickets = [];

while ($row = $result->fetch_assoc()) {
    $row['ticket_numero'] = obtenerNumeroTicket(
        $row['id'], 
        $row['numero_reapertura'], 
        $row['id_ticket_original']
    );
    $tickets[] = $row;
}

function puede_responder($conn){
    else if ($action === 'puede_responder') {
    $id_ticket = (int)($_GET['id_ticket'] ?? 0);
    
    $stmt = $conn->prepare("
        SELECT estado, id_usuario 
        FROM tickets 
        WHERE id = ?
    ");
    $stmt->bind_param("i", $id_ticket);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();
    
    if (!$ticket) {
        http_response_code(404);
        die(json_encode(['success' => false, 'message' => 'Ticket no encontrado']));
    }
    
    $puede_responder = !in_array($ticket['estado'], ['Cerrado']);
    
    echo json_encode([
        'success' => true,
        'puede_responder' => $puede_responder,
        'estado' => $ticket['estado']
    ]);
}

}

function crear_ticket($conn) {
    $titulo = limpiar_entrada($_POST['titulo']);
    $descripcion = limpiar_entrada($_POST['descripcion']);
    $categoria = limpiar_entrada($_POST['categoria'] ?? 'otro');
    $prioridad = limpiar_entrada($_POST['prioridad'] ?? 'media');
    $user_id = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("INSERT INTO tickets (titulo, descripcion, categoria, prioridad, id_usuario, estado) 
                           VALUES (?, ?, ?, ?, ?, 'Abierto')");
    $stmt->bind_param("ssssi", $titulo, $descripcion, $categoria, $prioridad, $user_id);
    
    if ($stmt->execute()) {
        $ticket_id = $conn->insert_id;
        
        // Registrar actividad
        registrar_actividad($conn, $user_id, 'create_ticket', "Ticket creado: #$ticket_id");
        
        enviar_json(['success' => true, 'message' => 'Ticket creado', 'ticket_id' => $ticket_id]);
    } else {
        enviar_json(['success' => false, 'message' => 'Error al crear ticket: ' . $stmt->error]);
    }
}

function obtener_ticket($conn) {
    $ticket_id = intval($_GET['id']);
    
    $stmt = $conn->prepare("SELECT t.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
                           CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado
                           FROM tickets t
                           LEFT JOIN usuarios u ON t.id_usuario = u.id
                           LEFT JOIN usuarios a ON t.id_asignado = a.id
                           WHERE t.id = ?");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $ticket = $result->fetch_assoc();
        enviar_json(['success' => true, 'ticket' => $ticket]);
    } else {
        enviar_json(['success' => false, 'message' => 'Ticket no encontrado']);
    }
}

function actualizar_ticket($conn) {
    $ticket_id = intval($_POST['ticket_id']);
    $titulo = limpiar_entrada($_POST['titulo']);
    $descripcion = limpiar_entrada($_POST['descripcion']);
    
    $stmt = $conn->prepare("UPDATE tickets SET titulo = ?, descripcion = ?, fecha_actualizacion = NOW() WHERE id = ?");
    $stmt->bind_param("ssi", $titulo, $descripcion, $ticket_id);
    
    if ($stmt->execute()) {
        enviar_json(['success' => true, 'message' => 'Ticket actualizado']);
    } else {
        enviar_json(['success' => false, 'message' => 'Error al actualizar']);
    }
}

function actualizar_estado($conn) {
    $ticket_id = intval($_POST['ticket_id']);
    $estado = limpiar_entrada($_POST['estado']);
    $user_id = $_SESSION['user_id'];
    
    // Validar que el estado sea válido
    $estados_validos = ['Abierto', 'En Proceso', 'Resuelto', 'Cerrado'];
    if (!in_array($estado, $estados_validos)) {
        enviar_json(['success' => false, 'message' => 'Estado no válido']);
    }
    
    // Obtener estado anterior
    $stmt_old = $conn->prepare("SELECT estado FROM tickets WHERE id = ?");
    $stmt_old->bind_param("i", $ticket_id);
    $stmt_old->execute();
    $result_old = $stmt_old->get_result();
    $old_data = $result_old->fetch_assoc();
    $estado_anterior = $old_data['estado'];
    
    // Actualizar estado
    $stmt = $conn->prepare("UPDATE tickets SET estado = ?, fecha_actualizacion = NOW() WHERE id = ?");
    $stmt->bind_param("si", $estado, $ticket_id);
    
    if ($stmt->execute()) {
        // Registrar en historial
        $stmt2 = $conn->prepare("INSERT INTO historial_tickets (id_ticket, id_usuario, accion, valor_anterior, valor_nuevo, descripcion) 
                                VALUES (?, ?, 'cambio_estado', ?, ?, ?)");
        $descripcion = "Estado cambiado de '$estado_anterior' a '$estado'";
        $stmt2->bind_param("iisss", $ticket_id, $user_id, $estado_anterior, $estado, $descripcion);
        $stmt2->execute();
        
        // Registrar actividad
        registrar_actividad($conn, $user_id, 'update_status', "Ticket #$ticket_id: $estado_anterior → $estado");
        
        enviar_json(['success' => true, 'message' => 'Estado actualizado correctamente']);
    } else {
        enviar_json(['success' => false, 'message' => 'Error al actualizar estado: ' . $stmt->error]);
    }
}

function agregar_comentario($conn) {
    $ticket_id = intval($_POST['ticket_id']);
    $mensaje = limpiar_entrada($_POST['mensaje']);
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT estado FROM tickets WHERE id = ?");
$stmt->bind_param("i", $id_ticket);
$stmt->execute();
$estado = $stmt->get_result()->fetch_assoc()['estado'];

if ($estado === 'Cerrado') {
    http_response_code(400);
    die(json_encode([
        'success' => false,
        'message' => 'No se pueden agregar mensajes a tickets cerrados'
    ]));
}


    if (empty($mensaje)) {
        enviar_json(['success' => false, 'message' => 'El comentario no puede estar vacío']);
    }
    
    $stmt = $conn->prepare("INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, fecha_envio) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("iis", $ticket_id, $user_id, $mensaje);
    
    if ($stmt->execute()) {
        // Actualizar fecha del ticket
        $conn->query("UPDATE tickets SET fecha_actualizacion = NOW() WHERE id = $ticket_id");
        
        // Registrar actividad
        registrar_actividad($conn, $user_id, 'add_comment', "Comentario en ticket #$ticket_id");
        
        enviar_json(['success' => true, 'message' => 'Comentario agregado']);
    } else {
        enviar_json(['success' => false, 'message' => 'Error al agregar comentario: ' . $stmt->error]);
    }
}

function obtener_comentarios($conn) {
    $ticket_id = intval($_GET['ticket_id']);
    
    $query = "SELECT m.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario
              FROM mensajes_ticket m
              LEFT JOIN usuarios u ON m.id_usuario = u.id
              WHERE m.id_ticket = ?
              ORDER BY m.fecha_envio ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comentarios = [];
    while ($row = $result->fetch_assoc()) {
        $comentarios[] = $row;
    }
    
    enviar_json(['success' => true, 'comentarios' => $comentarios]);
}

function obtener_estadisticas($conn) {
    $user_id = $_SESSION['user_id'];
    $rol = $_SESSION['id_rol_admin'];
    
    if ($rol <= 3) {
        // Estadísticas globales para admin
        $query = "SELECT 
                  COUNT(*) as total,
                  SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos,
                  SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
                  SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
                  SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos
                  FROM tickets";
        $result = $conn->query($query);
    } else {
        // Estadísticas personales
        $query = "SELECT 
                  COUNT(*) as total,
                  SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos,
                  SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
                  SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
                  SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos
                  FROM tickets WHERE id_usuario = $user_id";
        $result = $conn->query($query);
    }
    
    $stats = $result->fetch_assoc();
    
    enviar_json(['success' => true, 'stats' => $stats]);
}
?>
