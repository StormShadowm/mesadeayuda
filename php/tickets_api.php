<?php
error_reporting(0);
ini_set('display_errors', 0);
session_start();

$conn = new mysqli("localhost", "root", "", "mesa_ayuda_final");
$conn->set_charset('utf8mb4');

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo '{"success":false,"message":"No autorizado"}';
    exit;
}

$user_id = $_SESSION['user_id'];
$user_rol = $_SESSION['id_rol_admin'];
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

if ($action === 'list') {
    $where = $user_rol > 3 ? " WHERE t.id_usuario = $user_id" : "";
    
    $query = "SELECT t.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario, CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado FROM tickets t LEFT JOIN usuarios u ON t.id_usuario = u.id LEFT JOIN usuarios a ON t.id_asignado = a.id" . $where . " ORDER BY t.fecha_creacion DESC";
    
    $result = $conn->query($query);
    
    $tickets = array();
    while ($row = $result->fetch_assoc()) {
        $tickets[] = $row;
    }
    
    echo json_encode(['success' => true, 'tickets' => $tickets]);
}

elseif ($action === 'create') {
    $titulo = isset($_POST['titulo']) ? trim($_POST['titulo']) : '';
    $descripcion = isset($_POST['descripcion']) ? trim($_POST['descripcion']) : '';
    $categoria = isset($_POST['categoria']) ? trim($_POST['categoria']) : 'otro';
    $prioridad = isset($_POST['prioridad']) ? trim($_POST['prioridad']) : 'media';
    
    $stmt = $conn->prepare("INSERT INTO tickets (titulo, descripcion, categoria, prioridad, id_usuario, estado) VALUES (?, ?, ?, ?, ?, 'Abierto')");
    $stmt->bind_param("ssssi", $titulo, $descripcion, $categoria, $prioridad, $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'ticket_id' => $conn->insert_id]);
    } else {
        echo '{"success":false,"message":"Error al crear"}';
    }
}

elseif ($action === 'get') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    $stmt = $conn->prepare("SELECT t.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario FROM tickets t LEFT JOIN usuarios u ON t.id_usuario = u.id WHERE t.id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $ticket = $stmt->get_result()->fetch_assoc();
    
    echo json_encode(['success' => true, 'ticket' => $ticket]);
}

elseif ($action === 'update_status') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $estado = isset($_POST['estado']) ? trim($_POST['estado']) : '';
    
    $stmt = $conn->prepare("UPDATE tickets SET estado = ? WHERE id = ?");
    $stmt->bind_param("si", $estado, $ticket_id);
    
    if ($stmt->execute()) {
        echo '{"success":true,"message":"Estado actualizado"}';
    } else {
        echo '{"success":false,"message":"Error"}';
    }
}

elseif ($action === 'update_priority') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $prioridad = isset($_POST['prioridad']) ? trim($_POST['prioridad']) : '';
    
    $stmt = $conn->prepare("UPDATE tickets SET prioridad = ? WHERE id = ?");
    $stmt->bind_param("si", $prioridad, $ticket_id);
    
    if ($stmt->execute()) {
        echo '{"success":true,"message":"Prioridad actualizada"}';
    } else {
        echo '{"success":false,"message":"Error"}';
    }
}

elseif ($action === 'assign') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $asignado_a = isset($_POST['usuario_asignado']) ? (int)$_POST['usuario_asignado'] : 0;

    if ($ticket_id <= 0 || $asignado_a <= 0) {
        echo json_encode(["success" => false, "message" => "Datos inválidos"]);
        exit;
    }

    $stmt = $conn->prepare("UPDATE tickets SET id_asignado = ? WHERE id = ?");
    $stmt->bind_param("ii", $asignado_a, $ticket_id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Asignado"]);
    } else {
        echo json_encode(["success" => false, "message" => "Error al asignar"]);
    }
}

elseif ($action === 'get_categories') {
    echo '{"success":true,"categorias":[{"id":"hardware","nombre":"Hardware"},{"id":"software","nombre":"Software"},{"id":"red","nombre":"Red"},{"id":"acceso","nombre":"Acceso"},{"id":"otro","nombre":"Otro"}]}';
}

elseif ($action === 'get_admin_users') {
    $result = $conn->query("SELECT id, CONCAT(primer_nombre, ' ', primer_apellido) as nombre_completo FROM usuarios WHERE id_rol_admin <= 3 AND estado = 1 ORDER BY primer_nombre");
    
    $usuarios = array();
    while ($row = $result->fetch_assoc()) {
        $usuarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
}

elseif ($action === 'add_comment') {
    $ticket_id = isset($_POST['ticket_id']) ? (int)$_POST['ticket_id'] : 0;
    $mensaje = isset($_POST['mensaje']) ? trim($_POST['mensaje']) : '';
    
    $stmt = $conn->prepare("INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, fecha_envio) VALUES (?, ?, ?, NOW())");
    $stmt->bind_param("iis", $ticket_id, $user_id, $mensaje);
    
    if ($stmt->execute()) {
        echo '{"success":true}';
    } else {
        echo '{"success":false}';
    }
}

elseif ($action === 'get_comments') {
    $ticket_id = isset($_GET['ticket_id']) ? (int)$_GET['ticket_id'] : 0;
    
    $stmt = $conn->prepare("SELECT m.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario FROM mensajes_ticket m LEFT JOIN usuarios u ON m.id_usuario = u.id WHERE m.id_ticket = ? ORDER BY m.fecha_envio ASC");
    $stmt->bind_param("i", $ticket_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $comentarios = array();
    while ($row = $result->fetch_assoc()) {
        $comentarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'comentarios' => $comentarios]);
}

elseif ($action === 'stats') {
    // Filtros
    $fecha_desde = isset($_GET['fecha_desde']) && !empty($_GET['fecha_desde']) ? $_GET['fecha_desde'] : '';
    $fecha_hasta = isset($_GET['fecha_hasta']) && !empty($_GET['fecha_hasta']) ? $_GET['fecha_hasta'] : '';
    $estado_filtro = isset($_GET['estado']) && !empty($_GET['estado']) ? $_GET['estado'] : '';
    $prioridad_filtro = isset($_GET['prioridad']) && !empty($_GET['prioridad']) ? $_GET['prioridad'] : '';
    
    $where = $user_rol > 3 ? " WHERE id_usuario = $user_id" : " WHERE 1=1";
    
    if ($fecha_desde) {
        $where .= " AND DATE(fecha_creacion) >= '$fecha_desde'";
    }
    if ($fecha_hasta) {
        $where .= " AND DATE(fecha_creacion) <= '$fecha_hasta'";
    }
    if ($estado_filtro) {
        $where .= " AND estado = '$estado_filtro'";
    }
    if ($prioridad_filtro) {
        $where .= " AND prioridad = '$prioridad_filtro'";
    }
    
    $query = "SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos,
        SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos,
        SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
        SUM(CASE WHEN numero_reapertura > 0 THEN 1 ELSE 0 END) as reabiertos,
        SUM(CASE WHEN prioridad IN ('alta', 'critica') AND estado NOT IN ('Cerrado', 'Resuelto') THEN 1 ELSE 0 END) as urgentes
    FROM tickets" . $where;
    
    $result = $conn->query($query);
    $stats = $result->fetch_assoc();
    
    echo json_encode(['success' => true, 'stats' => $stats]);
}

elseif ($action === 'get_subcategories') {
    $id_categoria = isset($_GET['id_categoria']) ? trim($_GET['id_categoria']) : '';
    
    if (empty($id_categoria)) {
        echo json_encode(['success' => false, 'message' => 'ID de categoría requerido']);
        exit;
    }
    
    // Obtener ID numérico de la categoría
    $categorias_map = [
        'hardware' => 1,
        'software' => 2,
        'red' => 3,
        'acceso' => 4,
        'otro' => 5
    ];
    
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
}

else {
    echo '{"success":false,"message":"Accion no valida"}';
}

$conn->close();
?>
