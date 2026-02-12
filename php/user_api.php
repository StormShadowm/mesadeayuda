<?php
/**
 * user_api.php - API CORREGIDA SIN ERRORES
 */

// Configuración de errores para producción
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
        throw new Exception('Error de conexión a la base de datos');
    }
    $conn->set_charset('utf8mb4');
} catch (Exception $e) {
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['success' => false, 'message' => $e->getMessage()]));
}

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user_id'])) {
    die(json_encode(['success' => false, 'message' => 'No autenticado']));
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    switch ($action) {
        case 'me':
            obtener_perfil();
            break;
        case 'list':
            listar_usuarios();
            break;
        case 'get':
            obtener_usuario();
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
        case 'get_areas':
            obtener_areas();
            break;
        default:
            throw new Exception('Acción no válida');
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
}

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
    
    $query = "SELECT u.id, 
              CONCAT(u.primer_nombre, ' ', IFNULL(u.segundo_nombre, ''), ' ', u.primer_apellido, ' ', IFNULL(u.segundo_apellido, '')) as nombre_completo,
              u.primer_nombre,
              u.segundo_nombre,
              u.primer_apellido,
              u.segundo_apellido,
              u.usuario, 
              u.email,
              u.telefono,
              u.id_rol_admin,
              u.id_area,
              u.estado, 
              u.ultimo_acceso, 
              u.creado_en,
              r.nombre as rol,
              a.nombre as area,
              CASE 
                  WHEN u.id_rol_admin = 1 THEN 'Administrador Superior'
                  WHEN u.id_rol_admin = 2 THEN 'Administrador Intermedio'
                  WHEN u.id_rol_admin = 3 THEN 'Técnico'
                  ELSE 'Usuario'
              END as rol_legible
              FROM usuarios u
              LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
              LEFT JOIN areas a ON u.id_area = a.id
              ORDER BY u.creado_en DESC";
    
    $result = $conn->query($query);
    
    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $row['puede_editar'] = ($mi_rol <= 2 && $row['id_rol_admin'] >= $mi_rol && $row['id'] != $user_id);
        $usuarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
    exit;
}

function obtener_usuario() {
    global $conn;
    $id = intval($_GET['id'] ?? 0);
    
    $stmt = $conn->prepare("SELECT u.*, a.nombre as area_nombre
                           FROM usuarios u
                           LEFT JOIN areas a ON u.id_area = a.id
                           WHERE u.id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Asegurar que todos los campos tengan valor
        $row['segundo_nombre'] = $row['segundo_nombre'] ?? '';
        $row['segundo_apellido'] = $row['segundo_apellido'] ?? '';
        $row['telefono'] = $row['telefono'] ?? '';
        $row['email'] = $row['email'] ?? '';
        
        echo json_encode(['success' => true, 'user' => $row]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
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
    
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes editarte a ti mismo']);
        exit;
    }
    
    // Verificar permisos
    $stmt = $conn->prepare("SELECT id_rol_admin FROM usuarios WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $target_user = $result->fetch_assoc();
    
    if (!$target_user) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
        exit;
    }
    
    if ($target_user['id_rol_admin'] < $mi_rol) {
        echo json_encode(['success' => false, 'message' => 'No puedes editar un administrador superior']);
        exit;
    }
    
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $segundo_nombre = trim($_POST['segundo_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $segundo_apellido = trim($_POST['segundo_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $estado = intval($_POST['estado'] ?? 1);
    $id_rol_admin = intval($_POST['id_rol_admin'] ?? 4);
    $id_area = !empty($_POST['id_area']) ? intval($_POST['id_area']) : null;
    
    // Validar rol
    if ($mi_rol == 2 && $id_rol_admin == 1) {
        echo json_encode(['success' => false, 'message' => 'Solo Admin Superior puede asignar rol de Admin Superior']);
        exit;
    }
    
    // Actualizar datos
    $sql = "UPDATE usuarios SET 
            primer_nombre = ?, 
            segundo_nombre = ?, 
            primer_apellido = ?, 
            segundo_apellido = ?, 
            email = ?, 
            telefono = ?,
            estado = ?,
            id_rol_admin = ?,
            id_area = ?
            WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssssssiiii", $primer_nombre, $segundo_nombre, $primer_apellido, 
                     $segundo_apellido, $email, $telefono, $estado, $id_rol_admin, $id_area, $id);
    
    if ($stmt->execute()) {
        // Si se proporcionó contraseña, actualizarla
        if (!empty($_POST['password'])) {
            $password = password_hash(trim($_POST['password']), PASSWORD_BCRYPT, ['cost' => 12]);
            $stmt2 = $conn->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
            $stmt2->bind_param("si", $password, $id);
            $stmt2->execute();
        }
        
        echo json_encode(['success' => true, 'message' => 'Usuario actualizado correctamente']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
    }
    exit;
}

function obtener_areas() {
    global $conn;
    
    $result = $conn->query("SELECT * FROM areas WHERE activo = 1 ORDER BY nombre");
    
    $areas = [];
    while ($row = $result->fetch_assoc()) {
        $areas[] = $row;
    }
    
    echo json_encode(['success' => true, 'areas' => $areas]);
    exit;
}

function crear_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $segundo_nombre = trim($_POST['segundo_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $segundo_apellido = trim($_POST['segundo_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $id_rol_admin = intval($_POST['id_rol_admin'] ?? 4);
    $id_area = !empty($_POST['id_area']) ? intval($_POST['id_area']) : null;
    $estado = intval($_POST['estado'] ?? 1);
    
    $usuario = strtolower(substr($primer_nombre, 0, 1) . $primer_apellido);
    
    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE usuario = ?");
    $stmt->bind_param("s", $usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $usuario .= rand(100, 999);
    }
    
    $password = password_hash('Temporal123', PASSWORD_BCRYPT, ['cost' => 12]);
    
    $stmt = $conn->prepare("INSERT INTO usuarios (primer_nombre, segundo_nombre, primer_apellido, 
                           segundo_apellido, usuario, password, email, telefono, id_rol_admin, id_area, estado) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssssssii", $primer_nombre, $segundo_nombre, $primer_apellido, 
                     $segundo_apellido, $usuario, $password, $email, $telefono, $id_rol_admin, $id_area, $estado);
    
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

function actualizar_estado_usuario() {
    global $conn;
    $mi_rol = $_SESSION['id_rol_admin'];
    $user_id = $_SESSION['user_id'];
    
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $id = intval($_POST['id']);
    $estado = intval($_POST['estado']);
    
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes cambiar tu propio estado']);
        exit;
    }
    
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
    
    if ($mi_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tienes permisos']);
        exit;
    }
    
    $id = intval($_POST['id']);
    $nuevo_rol = intval($_POST['rol']);
    
    if ($id == $user_id) {
        echo json_encode(['success' => false, 'message' => 'No puedes cambiar tu propio rol']);
        exit;
    }
    
    if ($mi_rol == 2 && $nuevo_rol == 1) {
        echo json_encode(['success' => false, 'message' => 'Solo el Admin Superior puede crear otros Admins Superiores']);
        exit;
    }
    
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
    
    if ($mi_rol > 1) {
        echo json_encode(['success' => false, 'message' => 'Solo el Admin Superior puede eliminar usuarios']);
        exit;
    }
    
    $id = intval($_POST['id']);
    
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
