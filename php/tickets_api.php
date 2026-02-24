<?php
/**
 * tickets_api_CORREGIDO.php
 * Versión corregida con id_area en get_admin_users
 */

session_start();
header('Content-Type: application/json');

$host = "localhost";
$db = "mesa_ayuda_final";
$user = "root";
$pass = "";

try {
    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) {
        throw new Exception('Error de conexión');
    }
    $conn->set_charset('utf8mb4');
} catch (Exception $e) {
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Error de conexión']));
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode(['success' => false, 'message' => 'No autorizado']));
}

$user_id = $_SESSION['user_id'];
$user_rol = $_SESSION['id_rol_admin'];
$action = $_REQUEST['action'] ?? '';

function obtenerNumeroTicket($id, $numero_reapertura, $id_ticket_original) {
    if ($numero_reapertura > 0) {
        $original = $id_ticket_original ?? $id;
        return $original . '-' . $numero_reapertura;
    }
    return (string)$id;
}

// ==================== OBTENER USUARIOS ADMIN ====================

if ($action === 'get_admin_users') {
    try {
        $result = $conn->query("
            SELECT 
                u.id,
                u.primer_nombre,
                u.segundo_nombre,
                u.primer_apellido,
                u.segundo_apellido,
                u.usuario,
                u.email,
                u.telefono,
                u.id_area,
                u.id_rol_admin,
                u.estado,
                CONCAT(u.primer_nombre, ' ', IFNULL(u.segundo_nombre, ''), ' ', u.primer_apellido, ' ', IFNULL(u.segundo_apellido, '')) as nombre_completo,
                r.nombre as nombre_rol,
                a.nombre as nombre_area
            FROM usuarios u
            LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
            LEFT JOIN areas a ON u.id_area = a.id
            WHERE u.id_rol_admin <= 3 AND u.estado = 1
            ORDER BY u.primer_nombre, u.primer_apellido
        ");
        
        $usuarios = $result->fetch_all(MYSQLI_ASSOC);
        
        // Limpiar espacios extras en nombre_completo
        foreach ($usuarios as &$usuario) {
            $usuario['nombre_completo'] = trim(preg_replace('/\s+/', ' ', $usuario['nombre_completo']));
        }
        
        echo json_encode([
            'success' => true,
            'usuarios' => $usuarios
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER COMENTARIOS ====================

else if ($action === 'get_comments') {
    $ticket_id = (int)($_GET['ticket_id'] ?? 0);
    
    if ($ticket_id <= 0) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'ID de ticket inválido']));
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                m.id,
                m.id_ticket,
                m.id_usuario,
                m.mensaje,
                m.es_interno,
                m.archivo_adjunto,
                m.fecha_envio,
                CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
                u.id_rol_admin,
                r.nombre as nombre_rol
            FROM mensajes_ticket m
            LEFT JOIN usuarios u ON m.id_usuario = u.id
            LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
            WHERE m.id_ticket = ?
            ORDER BY m.fecha_envio ASC
        ");
        $stmt->bind_param("i", $ticket_id);
        $stmt->execute();
        $comentarios = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'comentarios' => $comentarios,
            'total' => count($comentarios)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== AGREGAR COMENTARIO ====================

else if ($action === 'add_comment') {
    $id_ticket = (int)($_POST['id_ticket'] ?? $_POST['ticket_id'] ?? 0);
    $mensaje = trim($_POST['mensaje'] ?? $_POST['comment'] ?? '');
    $es_interno = (int)($_POST['es_interno'] ?? 0);
    
    if ($id_ticket <= 0) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'ID de ticket inválido']));
    }
    
    if (empty($mensaje)) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'El mensaje no puede estar vacío']));
    }
    
    try {
        $stmt = $conn->prepare("SELECT estado FROM tickets WHERE id = ?");
        $stmt->bind_param("i", $id_ticket);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        
        if (!$ticket) {
            http_response_code(404);
            die(json_encode(['success' => false, 'message' => 'Ticket no encontrado']));
        }
        
        if ($ticket['estado'] === 'Cerrado') {
            http_response_code(400);
            die(json_encode([
                'success' => false,
                'message' => 'No se pueden agregar mensajes a tickets cerrados'
            ]));
        }
        
        $stmt = $conn->prepare("
            INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, es_interno)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("iisi", $id_ticket, $user_id, $mensaje, $es_interno);
        
        if ($stmt->execute()) {
            $stmt = $conn->prepare("UPDATE tickets SET fecha_actualizacion = NOW() WHERE id = ?");
            $stmt->bind_param("i", $id_ticket);
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Comentario agregado',
                'id' => $conn->insert_id
            ]);
        } else {
            throw new Exception('Error al agregar comentario');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== ESTADÍSTICAS ====================

else if ($action === 'stats') {
    try {
        $query = "
            SELECT 
                COUNT(*) as total_tickets,
                SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos,
                SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
                SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
                SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos,
                SUM(CASE WHEN prioridad = 'alta' OR prioridad = 'critica' THEN 1 ELSE 0 END) as alta_prioridad
            FROM tickets
        ";
        
        $result = $conn->query($query);
        $stats = $result->fetch_assoc();
        
        $query_cat = "
            SELECT 
                COALESCE(categoria, 'Sin categoría') as categoria,
                COUNT(*) as total
            FROM tickets
            GROUP BY categoria
            ORDER BY total DESC
        ";
        $result_cat = $conn->query($query_cat);
        $por_categoria = $result_cat->fetch_all(MYSQLI_ASSOC);
        
        $query_recientes = "
            SELECT 
                DATE(fecha_creacion) as fecha,
                COUNT(*) as total
            FROM tickets
            WHERE fecha_creacion >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(fecha_creacion)
            ORDER BY fecha DESC
        ";
        $result_recientes = $conn->query($query_recientes);
        $recientes = $result_recientes->fetch_all(MYSQLI_ASSOC);
        
        $query_prioridad = "
            SELECT 
                prioridad,
                COUNT(*) as total
            FROM tickets
            GROUP BY prioridad
        ";
        $result_prioridad = $conn->query($query_prioridad);
        $por_prioridad = $result_prioridad->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'stats' => $stats,
            'por_categoria' => $por_categoria,
            'recientes' => $recientes,
            'por_prioridad' => $por_prioridad
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER CATEGORÍAS ====================

else if ($action === 'get_categories') {
    try {
        $result = $conn->query("
            SELECT id, nombre, descripcion, activo 
            FROM categorias 
            WHERE activo = 1 
            ORDER BY orden
        ");
        
        $categorias = $result->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'categorias' => $categorias
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER SUBCATEGORÍAS ====================

else if ($action === 'get_subcategories') {
    $id_categoria = (int)($_GET['id_categoria'] ?? 0);
    
    try {
        if ($id_categoria > 0) {
            $stmt = $conn->prepare("
                SELECT id, nombre, descripcion 
                FROM subcategorias 
                WHERE id_categoria = ? AND activo = 1 
                ORDER BY orden
            ");
            $stmt->bind_param("i", $id_categoria);
            $stmt->execute();
            $subcategorias = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        } else {
            $result = $conn->query("
                SELECT id, id_categoria, nombre, descripcion 
                FROM subcategorias 
                WHERE activo = 1 
                ORDER BY id_categoria, orden
            ");
            $subcategorias = $result->fetch_all(MYSQLI_ASSOC);
        }
        
        echo json_encode([
            'success' => true,
            'subcategorias' => $subcategorias
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== LISTAR TICKETS ====================

else if ($action === 'list') {
    try {
        $query = "
            SELECT 
                t.*,
                CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
                CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado,
                (SELECT COUNT(*) FROM mensajes_ticket WHERE id_ticket = t.id) as total_mensajes,
                TIMESTAMPDIFF(MINUTE, t.fecha_creacion, NOW()) as minutos_abierto,
                CASE 
                    WHEN t.numero_reapertura > 0 THEN CONCAT(COALESCE(t.id_ticket_original, t.id), '-', t.numero_reapertura)
                    ELSE CAST(t.id AS CHAR)
                END as ticket_numero
            FROM tickets t
            LEFT JOIN usuarios u ON t.id_usuario = u.id
            LEFT JOIN usuarios a ON t.id_asignado = a.id
            WHERE 1=1
        ";
        
        if ($user_rol == 4) {
            $query .= " AND t.id_usuario = $user_id";
        }
        
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
        
        echo json_encode([
            'success' => true,
            'tickets' => $tickets
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER TICKET ====================

else if ($action === 'get') {
    $id = (int)($_GET['id'] ?? 0);
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                t.*,
                CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
                CONCAT(a.primer_nombre, ' ', a.primer_apellido) as nombre_asignado,
                u.email as email_usuario,
                a.email as email_asignado
            FROM tickets t
            LEFT JOIN usuarios u ON t.id_usuario = u.id
            LEFT JOIN usuarios a ON t.id_asignado = a.id
            WHERE t.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        
        if (!$ticket) {
            http_response_code(404);
            die(json_encode(['success' => false, 'message' => 'Ticket no encontrado']));
        }
        
        $ticket['ticket_numero'] = obtenerNumeroTicket(
            $ticket['id'], 
            $ticket['numero_reapertura'], 
            $ticket['id_ticket_original']
        );
        
        if ($user_rol == 4 && $ticket['id_usuario'] != $user_id) {
            http_response_code(403);
            die(json_encode(['success' => false, 'message' => 'No autorizado']));
        }
        
        echo json_encode([
            'success' => true,
            'ticket' => $ticket
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== VERIFICAR SI PUEDE RESPONDER ====================

else if ($action === 'puede_responder') {
    $id_ticket = (int)($_GET['id_ticket'] ?? 0);
    
    try {
        $stmt = $conn->prepare("SELECT estado FROM tickets WHERE id = ?");
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
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER MENSAJES ====================

else if ($action === 'messages') {
    $id_ticket = (int)($_GET['id_ticket'] ?? 0);
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                m.*,
                CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_usuario,
                u.id_rol_admin
            FROM mensajes_ticket m
            LEFT JOIN usuarios u ON m.id_usuario = u.id
            WHERE m.id_ticket = ?
            ORDER BY m.fecha_envio ASC
        ");
        $stmt->bind_param("i", $id_ticket);
        $stmt->execute();
        $mensajes = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'mensajes' => $mensajes
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== AGREGAR MENSAJE ====================

else if ($action === 'add_message') {
    $id_ticket = (int)($_POST['id_ticket'] ?? 0);
    $mensaje = trim($_POST['mensaje'] ?? '');
    $es_interno = (int)($_POST['es_interno'] ?? 0);
    
    if (empty($mensaje)) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'El mensaje no puede estar vacío']));
    }
    
    try {
        $stmt = $conn->prepare("SELECT estado FROM tickets WHERE id = ?");
        $stmt->bind_param("i", $id_ticket);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        
        if ($ticket['estado'] === 'Cerrado') {
            http_response_code(400);
            die(json_encode([
                'success' => false,
                'message' => 'No se pueden agregar mensajes a tickets cerrados'
            ]));
        }
        
        $stmt = $conn->prepare("
            INSERT INTO mensajes_ticket (id_ticket, id_usuario, mensaje, es_interno)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->bind_param("iisi", $id_ticket, $user_id, $mensaje, $es_interno);
        
        if ($stmt->execute()) {
            $stmt = $conn->prepare("UPDATE tickets SET fecha_actualizacion = NOW() WHERE id = ?");
            $stmt->bind_param("i", $id_ticket);
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Mensaje agregado',
                'id' => $conn->insert_id
            ]);
        } else {
            throw new Exception('Error al agregar mensaje');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== CREAR TICKET ====================

else if ($action === 'create') {
    $titulo = trim($_POST['titulo'] ?? '');
    $descripcion = trim($_POST['descripcion'] ?? '');
    $categoria = trim($_POST['categoria'] ?? '');
    $subcategoria = trim($_POST['subcategoria'] ?? '');
    $prioridad = trim($_POST['prioridad'] ?? 'media');
    
    if (empty($titulo) || empty($descripcion)) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'Título y descripción son requeridos']));
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO tickets (titulo, descripcion, categoria, subcategoria, prioridad, id_usuario)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("sssssi", $titulo, $descripcion, $categoria, $subcategoria, $prioridad, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Ticket creado exitosamente',
                'id' => $conn->insert_id
            ]);
        } else {
            throw new Exception('Error al crear ticket');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== ACTUALIZAR ESTADO ====================

else if ($action === 'update_status') {
    if ($user_rol > 3) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $id = (int)($_POST['id'] ?? 0);
    $estado = trim($_POST['estado'] ?? '');
    $motivo_cierre = trim($_POST['motivo_cierre'] ?? '');
    
    try {
        if ($estado === 'Cerrado' || $estado === 'Resuelto') {
            $stmt = $conn->prepare("
                UPDATE tickets 
                SET estado = ?, 
                    fecha_cierre = NOW(),
                    motivo_cierre = ?,
                    usuario_cierre = ?
                WHERE id = ?
            ");
            $stmt->bind_param("ssii", $estado, $motivo_cierre, $user_id, $id);
        } else {
            $stmt = $conn->prepare("UPDATE tickets SET estado = ? WHERE id = ?");
            $stmt->bind_param("si", $estado, $id);
        }
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Estado actualizado'
            ]);
        } else {
            throw new Exception('Error al actualizar estado');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== ASIGNAR TICKET ====================

else if ($action === 'assign') {
    if ($user_rol > 3) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $id = (int)($_POST['id'] ?? 0);
    $id_asignado = (int)($_POST['id_asignado'] ?? 0);
    
    try {
        $stmt = $conn->prepare("UPDATE tickets SET id_asignado = ? WHERE id = ?");
        $stmt->bind_param("ii", $id_asignado, $id);
        
        if ($stmt->execute()) {
            $stmt = $conn->prepare("
                INSERT INTO asignaciones_tickets (id_ticket, id_usuario_asignado, id_usuario_asigna)
                VALUES (?, ?, ?)
            ");
            $stmt->bind_param("iii", $id, $id_asignado, $user_id);
            $stmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Ticket asignado'
            ]);
        } else {
            throw new Exception('Error al asignar ticket');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

else {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => "Acción '$action' no válida"]);
}

$conn->close();
?>
