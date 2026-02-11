<?php
/**
 * user_api.php - API MEJORADA DE GESTIÓN DE USUARIOS
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
    case 'me':
        obtener_perfil();
        break;
    case 'list':
        listar_usuarios();
        break;
    case 'create':
        crear_usuario();
        break;
    case 'update':
        actualizar_usuario();
        break;
    case 'update_status':
        actualizar_estado_usuario();
        break;
    case 'update_role':
        actualizar_rol_usuario();
        break;
    case 'delete':
        eliminar_usuario();
        break;
    default:
        die(json_encode(['success' => false, 'message' => 'Acción no válida']));
}

// ==================== FUNCIONES ====================

function obtener_perfil() {
    global $conn;
    $user_id = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("SELECT u.id, 
                           CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_completo, 
                           u.usuario, 
                           u.email,
                           u.id_rol_admin,
                           r.nombre as rol
                           FROM usuarios u
                           LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
                           WHERE u.id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    echo json_encode(['success' => true, 'user' => $user]);
    exit;
}

function listar_usuarios() {
    global $conn;
    $user_id = $_SESSION['user_id'];
    $mi_rol = $_SESSION['id_rol_admin'];
    
    // Query mejorado con información completa
    $query = "SELECT u.id, 
              CONCAT(u.primer_nombre, ' ', u.segundo_nombre, ' ', u.primer_apellido, ' ', u.segundo_apellido) as nombre_completo,
              u.usuario, 
              u.email,
              u.id_rol_admin, 
              u.estado, 
              u.ultimo_acceso, 
              u.creado_en,
              r.nombre as rol,
              CASE 
                  WHEN u.id_rol_admin = 1 THEN 'Administrador Superior'
                  WHEN u.id_rol_admin = 2 THEN 'Administrador Intermedio'
                  WHEN u.id_rol_admin = 3 THEN 'Técnico'
                  ELSE 'Usuario'
              END as rol_legible
              FROM usuarios u
              LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
              ORDER BY u.creado_en DESC";
    
    $result = $conn->query($query);
    
    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        // Indicar si el usuario actual puede editar este usuario
        $row['puede_editar'] = ($mi_rol <= 2 && $row['id_rol_admin'] >= $mi_rol && $row['id'] != $user_id);
        $usuarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
    exit;
}

function crear_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    
    // Solo admin superior e intermedio pueden crear usuarios
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $segundo_nombre = trim($_POST['segundo_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $segundo_apellido = trim($_POST['segundo_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $id_rol_admin = intval($_POST['id_rol_admin'] ?? 4);
    $estado = intval($_POST['estado'] ?? 1);
    
    // Generar usuario automático
    $usuario = strtolower(substr($primer_nombre, 0, 1) . $primer_apellido);
    
    // Verificar si ya existe
    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ?");
    $stmt->bind_param("s", $usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $usuario .= rand(100, 999);
    }
    
    // Contraseña temporal
    $password = password_hash('Temporal123', PASSWORD_BCRYPT, ['cost' => 12]);
    
    $stmt = $conn->prepare("INSERT INTO usuarios (primer_nombre, segundo_nombre, primer_apellido, 
                           segundo_apellido, usuario, password, email, id_rol_admin, estado) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssssii", $primer_nombre, $segundo_nombre, $primer_apellido, 
                     $segundo_apellido, $usuario, $password, $email, $id_rol_admin, $estado);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Usuario creado', 
            'usuario' => $usuario,
            'password_temporal' => 'Temporal123'
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al crear usuario']);
    }
    exit;
}

function actualizar_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    $user_id = $_SESSION['user_id'];
    
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $id = intval($_POST['id']);
    $primer_nombre = trim($_POST['primer_nombre']);
    $primer_apellido = trim($_POST['primer_apellido']);
    $email = trim($_POST['email']);
    
    // No puede editarse a sí mismo
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes editarte a ti mismo']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE usuarios SET primer_nombre = ?, primer_apellido = ?, email = ? WHERE id = ?");
    $stmt->bind_param("sssi", $primer_nombre, $primer_apellido, $email, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Usuario actualizado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
    }
    exit;
}

function actualizar_estado_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    $user_id = $_SESSION['user_id'];
    
    // Solo admin superior e intermedio
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $id = intval($_POST['id']);
    $estado = intval($_POST['estado']);
    
    // No puede cambiar su propio estado
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes cambiar tu propio estado']);
        exit;
    }
    
    // Verificar que no esté cambiando a un admin superior
    $stmt = $conn->prepare("SELECT id_rol_admin FROM usuarios WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $target_user = $result->fetch_assoc();
    
    if ($target_user['id_rol_admin'] < $mi_rol) {
        echo json_encode(['success' => false, 'message' => 'No puedes cambiar el estado de un administrador superior']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE usuarios SET estado = ? WHERE id = ?");
    $stmt->bind_param("ii", $estado, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Estado actualizado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
    }
    exit;
}

function actualizar_rol_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    $user_id = $_SESSION['user_id'];
    
    // Solo admin superior e intermedio
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $id = intval($_POST['id']);
    $nuevo_rol = intval($_POST['rol']);
    
    // No puede cambiar su propio rol
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes cambiar tu propio rol']);
        exit;
    }
    
    // Verificar que no esté intentando crear un admin superior siendo intermedio
    if ($mi_rol == 2 && $nuevo_rol == 1) {
        echo json_encode(['success' => false, 'message' => 'Solo el Admin Superior puede crear otros Admins Superiores']);
        exit;
    }
    
    // Verificar que el usuario objetivo no sea superior
    $stmt = $conn->prepare("SELECT id_rol_admin FROM usuarios WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $target_user = $result->fetch_assoc();
    
    if ($target_user['id_rol_admin'] < $mi_rol) {
        echo json_encode(['success' => false, 'message' => 'No puedes cambiar el rol de un administrador superior']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE usuarios SET id_rol_admin = ? WHERE id = ?");
    $stmt->bind_param("ii", $nuevo_rol, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Rol actualizado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar']);
    }
    exit;
}

function eliminar_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    $user_id = $_SESSION['user_id'];
    
    // Solo admin superior
    if ($mi_rol > 1) {
        echo json_encode(['success' => false, 'message' => 'Solo el Admin Superior puede eliminar usuarios']);
        exit;
    }
    
    $id = intval($_POST['id']);
    
    // No puede eliminarse a sí mismo
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes eliminarte a ti mismo']);
        exit;
    }
    
    $stmt = $conn->prepare("DELETE FROM usuarios WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Usuario eliminado']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
    }
    exit;
}
?>
