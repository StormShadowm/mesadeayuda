<?php
/**
 * calificaciones_api.php
 * API para gestión de calificaciones NPS y reapertura de tickets
 */

session_start();
header('Content-Type: application/json');

// Configuración de base de datos
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
    http_response_code(500);
    die(json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos'
    ]));
}

// Verificar sesión
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    die(json_encode([
        'success' => false,
        'message' => 'No autorizado'
    ]));
}

$user_id = $_SESSION['user_id'];
$user_rol = $_SESSION['id_rol_admin'];
$action = $_REQUEST['action'] ?? '';

// =========================================================
// CALIFICAR TICKET
// =========================================================

if ($action === 'calificar') {
    $id_ticket = (int)($_POST['id_ticket'] ?? 0);
    $calificacion = (int)($_POST['calificacion'] ?? 0);
    $comentario = trim($_POST['comentario'] ?? '');
    
    // Validaciones
    if ($id_ticket <= 0) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'ID de ticket inválido']));
    }
    
    if ($calificacion < 1 || $calificacion > 5) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'La calificación debe estar entre 1 y 5']));
    }
    
    // Si es calificación baja (1-2), el comentario es obligatorio
    if ($calificacion <= 2 && empty($comentario)) {
        http_response_code(400);
        die(json_encode([
            'success' => false, 
            'message' => 'Para calificaciones bajas (1-2) el comentario es obligatorio'
        ]));
    }
    
    try {
        // Verificar que el ticket existe y está cerrado/resuelto
        $stmt = $conn->prepare("
            SELECT id, estado, id_usuario, numero_reapertura
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
        
        if (!in_array($ticket['estado'], ['Cerrado', 'Resuelto'])) {
            http_response_code(400);
            die(json_encode([
                'success' => false, 
                'message' => 'Solo se pueden calificar tickets cerrados o resueltos'
            ]));
        }
        
        if ($ticket['id_usuario'] != $user_id) {
            http_response_code(403);
            die(json_encode([
                'success' => false, 
                'message' => 'Solo el creador del ticket puede calificarlo'
            ]));
        }
        
        // Verificar si ya fue calificado para esta reapertura
        $stmt = $conn->prepare("
            SELECT id FROM calificaciones_tickets 
            WHERE id_ticket = ? AND numero_reapertura = ?
        ");
        $stmt->bind_param("ii", $id_ticket, $ticket['numero_reapertura']);
        $stmt->execute();
        
        if ($stmt->get_result()->num_rows > 0) {
            http_response_code(400);
            die(json_encode([
                'success' => false, 
                'message' => 'Este ticket ya ha sido calificado para esta reapertura'
            ]));
        }
        
        // Insertar calificación
        $stmt = $conn->prepare("
            INSERT INTO calificaciones_tickets 
            (id_ticket, id_usuario, calificacion, comentario, numero_reapertura)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("iiisi", 
            $id_ticket, 
            $user_id, 
            $calificacion, 
            $comentario, 
            $ticket['numero_reapertura']
        );
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Gracias por calificar el servicio',
                'calificacion_id' => $conn->insert_id
            ]);
        } else {
            throw new Exception('Error al guardar calificación');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ]);
    }
}

// =========================================================
// VERIFICAR SI PUEDE CALIFICAR
// =========================================================

else if ($action === 'puede_calificar') {
    $id_ticket = (int)($_GET['id_ticket'] ?? 0);
    
    if ($id_ticket <= 0) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'ID inválido']));
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                t.id,
                t.estado,
                t.id_usuario,
                t.numero_reapertura,
                (SELECT COUNT(*) FROM calificaciones_tickets 
                 WHERE id_ticket = t.id 
                 AND numero_reapertura = t.numero_reapertura) as ya_calificado
            FROM tickets t
            WHERE t.id = ?
        ");
        $stmt->bind_param("i", $id_ticket);
        $stmt->execute();
        $ticket = $stmt->get_result()->fetch_assoc();
        
        if (!$ticket) {
            http_response_code(404);
            die(json_encode(['success' => false, 'message' => 'Ticket no encontrado']));
        }
        
        $puede_calificar = (
            in_array($ticket['estado'], ['Cerrado', 'Resuelto']) &&
            $ticket['id_usuario'] == $user_id &&
            $ticket['ya_calificado'] == 0
        );
        
        echo json_encode([
            'success' => true,
            'puede_calificar' => $puede_calificar,
            'motivo' => !$puede_calificar ? (
                $ticket['ya_calificado'] > 0 ? 'Ya calificado' : 
                ($ticket['id_usuario'] != $user_id ? 'No es el creador' : 'Estado no permite calificación')
            ) : null
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// =========================================================
// REABRIR TICKET
// =========================================================

else if ($action === 'reabrir') {
    $id_ticket = (int)($_POST['id_ticket'] ?? 0);
    $motivo = trim($_POST['motivo'] ?? '');
    
    if ($id_ticket <= 0) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'ID inválido']));
    }
    
    if (empty($motivo)) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'El motivo de reapertura es obligatorio']));
    }
    
    try {
        // Llamar al stored procedure
        $stmt = $conn->prepare("CALL sp_reabrir_ticket(?, ?, ?)");
        $stmt->bind_param("iis", $id_ticket, $user_id, $motivo);
        
        if ($stmt->execute()) {
            $result = $stmt->get_result()->fetch_assoc();
            echo json_encode([
                'success' => true,
                'message' => $result['mensaje'],
                'nuevo_numero' => $result['nuevo_numero'],
                'numero_reapertura' => $result['numero_reapertura']
            ]);
        } else {
            throw new Exception('Error al reabrir ticket');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

// =========================================================
// OBTENER ESTADÍSTICAS NPS (Solo admins)
// =========================================================

else if ($action === 'nps_stats') {
    // Solo admins pueden ver estadísticas
    if ($user_rol > 3) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    try {
        // Obtener stats de la vista
        $result = $conn->query("SELECT * FROM v_nps_stats");
        $stats = $result->fetch_assoc();
        
        if (!$stats || $stats['total_calificaciones'] == 0) {
            echo json_encode([
                'success' => true,
                'stats' => [
                    'total_calificaciones' => 0,
                    'promotores' => 0,
                    'neutros' => 0,
                    'detractores' => 0,
                    'nps_score' => 0,
                    'porcentaje_promotores' => 0,
                    'porcentaje_neutros' => 0,
                    'porcentaje_detractores' => 0
                ]
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'stats' => [
                    'total_calificaciones' => (int)$stats['total_calificaciones'],
                    'promotores' => (int)$stats['promotores'],
                    'neutros' => (int)$stats['neutros'],
                    'detractores' => (int)$stats['detractores'],
                    'nps_score' => (float)$stats['nps_score'],
                    'porcentaje_promotores' => round(($stats['promotores'] / $stats['total_calificaciones']) * 100, 2),
                    'porcentaje_neutros' => round(($stats['neutros'] / $stats['total_calificaciones']) * 100, 2),
                    'porcentaje_detractores' => round(($stats['detractores'] / $stats['total_calificaciones']) * 100, 2)
                ]
            ]);
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// =========================================================
// DESCARGAR REPORTE NPS (Solo admins)
// =========================================================

else if ($action === 'reporte_nps') {
    // Solo admins pueden descargar reporte
    if ($user_rol > 3) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    try {
        $result = $conn->query("
            SELECT 
                ticket_numero as 'ID Ticket',
                ticket_titulo as 'Título',
                nombre_usuario as 'Usuario',
                email_usuario as 'Email',
                calificacion as 'Calificación',
                categoria_nps as 'Categoría NPS',
                comentario as 'Comentario',
                DATE_FORMAT(fecha_calificacion, '%Y-%m-%d %H:%i') as 'Fecha Calificación'
            FROM v_calificaciones_detalle
            ORDER BY fecha_calificacion DESC
        ");
        
        $calificaciones = [];
        while ($row = $result->fetch_assoc()) {
            $calificaciones[] = $row;
        }
        
        echo json_encode([
            'success' => true,
            'calificaciones' => $calificaciones
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// =========================================================
// REGISTRAR LOGOUT
// =========================================================

else if ($action === 'logout') {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? null;
        
        $stmt = $conn->prepare("
            INSERT INTO historial_logout (id_usuario, ip_address, user_agent)
            VALUES (?, ?, ?)
        ");
        $stmt->bind_param("iss", $user_id, $ip, $user_agent);
        $stmt->execute();
        
        // Destruir sesión
        session_destroy();
        
        echo json_encode([
            'success' => true,
            'message' => 'Sesión cerrada correctamente'
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// =========================================================
// ACCIÓN NO VÁLIDA
// =========================================================

else {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Acción no válida'
    ]);
}

$conn->close();
?>
