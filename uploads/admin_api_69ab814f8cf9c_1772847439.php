<?php
/**
 * admin_api.php - CORREGIDO (sin columna 'efectivo')
 */

error_reporting(0);
ini_set('display_errors', 0);

session_start();

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
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['success' => false, 'message' => $e->getMessage()]));
}

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id']) || $_SESSION['id_rol_admin'] > 3) {
    die(json_encode(['success' => false, 'message' => 'No autorizado']));
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'stats':
            obtener_estadisticas_admin();
            break;
        case 'dashboard':
            obtener_dashboard();
            break;
        case 'usuarios':
            listar_usuarios_admin();
            break;
        case 'crear_usuario':
            crear_usuario_admin();
            break;
        case 'actualizar_usuario':
            actualizar_usuario_admin();
            break;
        case 'eliminar_usuario':
            eliminar_usuario_admin();
            break;
        case 'reportes':
            obtener_reportes();
            break;
        default:
            throw new Exception('Acción no válida');
    }
} catch (Exception $e) {
    die(json_encode(['success' => false, 'message' => $e->getMessage()]));
}

// ==================== FUNCIONES ====================

function obtener_estadisticas_admin() {
    global $conn;
    
    $query = "SELECT 
              COUNT(*) as total_tickets,
              SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos,
              SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
              SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
              SUM(CASE WHEN estado = 'Resuelto' THEN 1 ELSE 0 END) as resueltos,
              SUM(CASE WHEN prioridad = 'critica' THEN 1 ELSE 0 END) as criticos,
              SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) as altos,
              SUM(CASE WHEN prioridad = 'media' THEN 1 ELSE 0 END) as medios,
              SUM(CASE WHEN prioridad = 'baja' THEN 1 ELSE 0 END) as bajos
              FROM tickets";
    
    $result = $conn->query($query);
    $stats = $result->fetch_assoc();
    
    $query_usuarios = "SELECT COUNT(*) as total_usuarios FROM usuarios WHERE estado = 1";
    $result_usuarios = $conn->query($query_usuarios);
    $usuarios = $result_usuarios->fetch_assoc();
    
    $stats['total_usuarios'] = $usuarios['total_usuarios'];
    
    echo json_encode(['success' => true, 'stats' => $stats]);
    exit;
}

function obtener_dashboard() {
    global $conn;
    
    // Estadísticas generales
    $stats = [];
    
    $result = $conn->query("SELECT COUNT(*) as total FROM tickets");
    $stats['total_tickets'] = $result->fetch_assoc()['total'];
    
    $result = $conn->query("SELECT COUNT(*) as total FROM usuarios WHERE estado = 1");
    $stats['total_usuarios'] = $result->fetch_assoc()['total'];
    
    $result = $conn->query("SELECT COUNT(*) as total FROM tickets WHERE estado = 'Abierto'");
    $stats['tickets_abiertos'] = $result->fetch_assoc()['total'];
    
    $result = $conn->query("SELECT COUNT(*) as total FROM tickets WHERE estado = 'En Proceso'");
    $stats['tickets_proceso'] = $result->fetch_assoc()['total'];
    
    // Tickets por categoría
    $result = $conn->query("SELECT categoria, COUNT(*) as total FROM tickets GROUP BY categoria ORDER BY total DESC LIMIT 5");
    $stats['por_categoria'] = [];
    while ($row = $result->fetch_assoc()) {
        $stats['por_categoria'][] = $row;
    }
    
    // Tickets por prioridad
    $result = $conn->query("SELECT prioridad, COUNT(*) as total FROM tickets GROUP BY prioridad");
    $stats['por_prioridad'] = [];
    while ($row = $result->fetch_assoc()) {
        $stats['por_prioridad'][] = $row;
    }
    
    echo json_encode(['success' => true, 'dashboard' => $stats]);
    exit;
}

function listar_usuarios_admin() {
    global $conn;
    
    // QUERY CORREGIDA - SIN columna 'efectivo'
    $query = "SELECT 
              u.id,
              u.usuario,
              u.primer_nombre,
              u.segundo_nombre,
              u.primer_apellido,
              u.segundo_apellido,
              u.email,
              u.telefono,
              u.area,
              u.id_rol_admin,
              u.estado,
              u.fecha_creacion,
              CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_completo,
              CASE 
                  WHEN u.id_rol_admin = 1 THEN 'Super Admin'
                  WHEN u.id_rol_admin = 2 THEN 'Admin'
                  WHEN u.id_rol_admin = 3 THEN 'Soporte'
                  ELSE 'Usuario'
              END as rol_nombre
              FROM usuarios u
              ORDER BY u.fecha_creacion DESC";
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception('Error en la consulta: ' . $conn->error);
    }
    
    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $usuarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
    exit;
}

function crear_usuario_admin() {
    global $conn;
    
    $usuario = trim($_POST['usuario'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $segundo_nombre = trim($_POST['segundo_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $segundo_apellido = trim($_POST['segundo_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $area = trim($_POST['area'] ?? '');
    $id_rol_admin = intval($_POST['id_rol_admin'] ?? 4);
    
    if (empty($usuario) || empty($password) || empty($primer_nombre) || empty($primer_apellido) || empty($email)) {
        throw new Exception('Campos obligatorios faltantes');
    }
    
    // Verificar si usuario ya existe
    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ? OR email = ?");
    $stmt->bind_param("ss", $usuario, $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        throw new Exception('El usuario o email ya existe');
    }
    
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $conn->prepare("INSERT INTO usuarios 
                           (usuario, password, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
                            email, telefono, area, id_rol_admin, estado, fecha_creacion) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())");
    
    $stmt->bind_param("sssssssssi", 
        $usuario, $password_hash, $primer_nombre, $segundo_nombre, $primer_apellido, 
        $segundo_apellido, $email, $telefono, $area, $id_rol_admin
    );
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Usuario creado exitosamente']);
    } else {
        throw new Exception('Error al crear usuario');
    }
    exit;
}

function actualizar_usuario_admin() {
    global $conn;
    
    $id = intval($_POST['id'] ?? 0);
    $usuario = trim($_POST['usuario'] ?? '');
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $segundo_nombre = trim($_POST['segundo_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $segundo_apellido = trim($_POST['segundo_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $area = trim($_POST['area'] ?? '');
    $id_rol_admin = intval($_POST['id_rol_admin'] ?? 4);
    $estado = intval($_POST['estado'] ?? 1);
    $password = trim($_POST['password'] ?? '');
    
    if (!$id || empty($usuario) || empty($primer_nombre) || empty($primer_apellido) || empty($email)) {
        throw new Exception('Campos obligatorios faltantes');
    }
    
    // Verificar si usuario/email ya existe en otro registro
    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE (usuario = ? OR email = ?) AND id != ?");
    $stmt->bind_param("ssi", $usuario, $email, $id);
    $stmt->execute();
    if ($stmt->get_result()->num_rows > 0) {
        throw new Exception('El usuario o email ya existe en otro registro');
    }
    
    if (!empty($password)) {
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE usuarios SET 
                               usuario = ?, password = ?, primer_nombre = ?, segundo_nombre = ?, 
                               primer_apellido = ?, segundo_apellido = ?, email = ?, telefono = ?, 
                               area = ?, id_rol_admin = ?, estado = ?
                               WHERE id = ?");
        $stmt->bind_param("sssssssssiis", 
            $usuario, $password_hash, $primer_nombre, $segundo_nombre, $primer_apellido,
            $segundo_apellido, $email, $telefono, $area, $id_rol_admin, $estado, $id
        );
    } else {
        $stmt = $conn->prepare("UPDATE usuarios SET 
                               usuario = ?, primer_nombre = ?, segundo_nombre = ?, 
                               primer_apellido = ?, segundo_apellido = ?, email = ?, telefono = ?, 
                               area = ?, id_rol_admin = ?, estado = ?
                               WHERE id = ?");
        $stmt->bind_param("ssssssssiis", 
            $usuario, $primer_nombre, $segundo_nombre, $primer_apellido,
            $segundo_apellido, $email, $telefono, $area, $id_rol_admin, $estado, $id
        );
    }
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Usuario actualizado exitosamente']);
    } else {
        throw new Exception('Error al actualizar usuario');
    }
    exit;
}

function eliminar_usuario_admin() {
    global $conn;
    
    $id = intval($_POST['id'] ?? 0);
    
    if (!$id) {
        throw new Exception('ID de usuario no válido');
    }
    
    // No eliminar, solo desactivar
    $stmt = $conn->prepare("UPDATE usuarios SET estado = 0 WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Usuario desactivado exitosamente']);
    } else {
        throw new Exception('Error al desactivar usuario');
    }
    exit;
}

function obtener_reportes() {
    global $conn;
    
    $fecha_desde = $_GET['fecha_desde'] ?? date('Y-m-01');
    $fecha_hasta = $_GET['fecha_hasta'] ?? date('Y-m-d');
    
    $query = "SELECT 
              DATE(fecha_creacion) as fecha,
              COUNT(*) as total,
              SUM(CASE WHEN estado = 'Cerrado' THEN 1 ELSE 0 END) as cerrados,
              SUM(CASE WHEN estado = 'Abierto' THEN 1 ELSE 0 END) as abiertos
              FROM tickets
              WHERE DATE(fecha_creacion) BETWEEN ? AND ?
              GROUP BY DATE(fecha_creacion)
              ORDER BY fecha DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ss", $fecha_desde, $fecha_hasta);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $reportes = [];
    while ($row = $result->fetch_assoc()) {
        $reportes[] = $row;
    }
    
    echo json_encode(['success' => true, 'reportes' => $reportes]);
    exit;
}
?>
