<?php
/**
 * user_api_CON_AREAS.php
 * API completa con soporte para áreas
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

$action = $_REQUEST['action'] ?? '';

// ==================== OBTENER PERFIL (action=me) ====================

if ($action === 'me') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_id = $_SESSION['user_id'];
    
    try {
        $stmt = $conn->prepare("
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
                u.ultimo_acceso,
                CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_completo,
                r.nombre as nombre_rol,
                a.nombre as nombre_area
            FROM usuarios u
            LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
            LEFT JOIN areas a ON u.id_area = a.id
            WHERE u.id = ?
        ");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $usuario = $stmt->get_result()->fetch_assoc();
        
        if (!$usuario) {
            http_response_code(404);
            die(json_encode(['success' => false, 'message' => 'Usuario no encontrado']));
        }
        
        $stmt = $conn->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        
        unset($usuario['password']);
        
        echo json_encode([
            'success' => true,
            'user' => $usuario
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER ÁREAS (action=get_areas) ====================

else if ($action === 'get_areas') {
    try {
        $result = $conn->query("SHOW TABLES LIKE 'areas'");
        
        if ($result->num_rows > 0) {
            $query = "SELECT id, nombre, descripcion FROM areas WHERE activo = 1 ORDER BY nombre";
            $result = $conn->query($query);
            $areas = $result->fetch_all(MYSQLI_ASSOC);
        } else {
            $areas = [
                ['id' => 1, 'nombre' => 'Administración', 'descripcion' => 'Área administrativa'],
                ['id' => 2, 'nombre' => 'Ventas', 'descripcion' => 'Área de ventas'],
                ['id' => 3, 'nombre' => 'Soporte Técnico', 'descripcion' => 'Área de soporte técnico'],
                ['id' => 4, 'nombre' => 'Desarrollo', 'descripcion' => 'Área de desarrollo'],
                ['id' => 5, 'nombre' => 'Marketing', 'descripcion' => 'Área de marketing'],
                ['id' => 6, 'nombre' => 'Recursos Humanos', 'descripcion' => 'Área de RRHH'],
                ['id' => 7, 'nombre' => 'Contabilidad', 'descripcion' => 'Área de contabilidad'],
                ['id' => 8, 'nombre' => 'Operaciones', 'descripcion' => 'Área de operaciones']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'areas' => $areas
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER ROLES (action=get_roles) ====================

else if ($action === 'get_roles') {
    try {
        $result = $conn->query("
            SELECT id, nombre, nivel, permisos 
            FROM roles_admin 
            ORDER BY nivel
        ");
        
        $roles = $result->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'roles' => $roles
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== LISTAR USUARIOS ====================

else if ($action === 'list') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_rol = $_SESSION['id_rol_admin'];
    
    if ($user_rol > 3) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    try {
        $ordenar = $_GET['ordenar'] ?? 'id';
        $direccion = $_GET['direccion'] ?? 'ASC';
        
        $campos_validos = ['id', 'usuario', 'email', 'id_rol_admin', 'estado', 'primer_nombre', 'primer_apellido'];
        if (!in_array($ordenar, $campos_validos)) {
            $ordenar = 'id';
        }
        
        $direccion = strtoupper($direccion);
        if (!in_array($direccion, ['ASC', 'DESC'])) {
            $direccion = 'ASC';
        }
        
        $query = "
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
                u.ultimo_acceso,
                u.creado_en,
                CONCAT(u.primer_nombre, ' ', u.primer_apellido) as nombre_completo,
                r.nombre as nombre_rol,
                a.nombre as nombre_area
            FROM usuarios u
            LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
            LEFT JOIN areas a ON u.id_area = a.id
            ORDER BY u.$ordenar $direccion
        ";
        
        $result = $conn->query($query);
        $usuarios = $result->fetch_all(MYSQLI_ASSOC);
        
        echo json_encode([
            'success' => true,
            'usuarios' => $usuarios
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== HISTORIAL DE ACCESOS ====================

else if ($action === 'historial_accesos') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_id = $_SESSION['user_id'];
    $user_rol = $_SESSION['id_rol_admin'];
    $id_usuario = (int)($_GET['id_usuario'] ?? 0);
    
    if ($user_rol > 3 && $id_usuario != $user_id) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    if ($id_usuario == 0) {
        $id_usuario = $user_id;
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                'login' as tipo,
                CASE WHEN exitoso = 1 THEN 'Exitoso' ELSE 'Fallido' END as estado,
                ip_address,
                user_agent,
                fecha
            FROM historial_login
            WHERE id_usuario = ? OR (id_usuario IS NULL AND usuario = (
                SELECT usuario FROM usuarios WHERE id = ?
            ))
            ORDER BY fecha DESC
            LIMIT 50
        ");
        $stmt->bind_param("ii", $id_usuario, $id_usuario);
        $stmt->execute();
        $logins = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        
        $result = $conn->query("SHOW TABLES LIKE 'historial_logout'");
        
        if ($result->num_rows > 0) {
            $stmt = $conn->prepare("
                SELECT 
                    'logout' as tipo,
                    'Cerró sesión' as estado,
                    ip_address,
                    user_agent,
                    fecha
                FROM historial_logout
                WHERE id_usuario = ?
                ORDER BY fecha DESC
                LIMIT 50
            ");
            $stmt->bind_param("i", $id_usuario);
            $stmt->execute();
            $logouts = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        } else {
            $logouts = [];
        }
        
        $historial = array_merge($logins, $logouts);
        usort($historial, function($a, $b) {
            return strtotime($b['fecha']) - strtotime($a['fecha']);
        });
        
        $historial = array_slice($historial, 0, 50);
        
        echo json_encode([
            'success' => true,
            'historial' => $historial
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== OBTENER USUARIO ====================

else if ($action === 'get') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_id = $_SESSION['user_id'];
    $user_rol = $_SESSION['id_rol_admin'];
    $id = (int)($_GET['id'] ?? 0);
    
    if ($user_rol > 3 && $id != $user_id) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT 
                u.*,
                r.nombre as nombre_rol,
                a.nombre as nombre_area
            FROM usuarios u
            LEFT JOIN roles_admin r ON u.id_rol_admin = r.id
            LEFT JOIN areas a ON u.id_area = a.id
            WHERE u.id = ?
        ");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $usuario = $stmt->get_result()->fetch_assoc();
        
        if (!$usuario) {
            http_response_code(404);
            die(json_encode(['success' => false, 'message' => 'Usuario no encontrado']));
        }
        
        unset($usuario['password']);
        
        echo json_encode([
            'success' => true,
            'usuario' => $usuario
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== ACTUALIZAR USUARIO ====================

else if ($action === 'update') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_rol = $_SESSION['id_rol_admin'];
    
    if ($user_rol > 3) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $id = (int)($_POST['id'] ?? 0);
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '');
    $id_area = $_POST['id_area'] !== '' ? (int)$_POST['id_area'] : null;
    $id_rol_admin = (int)($_POST['id_rol_admin'] ?? 4);
    $estado = (int)($_POST['estado'] ?? 1);
    
    try {
        $stmt = $conn->prepare("
            UPDATE usuarios 
            SET primer_nombre = ?,
                primer_apellido = ?,
                email = ?,
                telefono = ?,
                id_area = ?,
                id_rol_admin = ?,
                estado = ?
            WHERE id = ?
        ");
        $stmt->bind_param("ssssiiii", 
            $primer_nombre, 
            $primer_apellido, 
            $email, 
            $telefono,
            $id_area,
            $id_rol_admin, 
            $estado, 
            $id
        );
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Usuario actualizado'
            ]);
        } else {
            throw new Exception('Error al actualizar usuario');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== CAMBIAR CONTRASEÑA ====================

else if ($action === 'change_password') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_id = $_SESSION['user_id'];
    $user_rol = $_SESSION['id_rol_admin'];
    $id = (int)($_POST['id'] ?? 0);
    $password = trim($_POST['password'] ?? '');
    
    if ($user_rol > 3 && $id != $user_id) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    if (strlen($password) < 6) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres']));
    }
    
    try {
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
        $stmt->bind_param("si", $password_hash, $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Contraseña actualizada'
            ]);
        } else {
            throw new Exception('Error al actualizar contraseña');
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

// ==================== CREAR USUARIO ====================

else if ($action === 'create') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $user_rol = $_SESSION['id_rol_admin'];
    
    if ($user_rol > 2) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'No autorizado']));
    }
    
    $usuario = trim($_POST['usuario'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $primer_nombre = trim($_POST['primer_nombre'] ?? '');
    $primer_apellido = trim($_POST['primer_apellido'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $id_area = $_POST['id_area'] !== '' ? (int)$_POST['id_area'] : null;
    $id_rol_admin = (int)($_POST['id_rol_admin'] ?? 4);
    
    if (empty($usuario) || empty($password) || empty($email)) {
        http_response_code(400);
        die(json_encode(['success' => false, 'message' => 'Campos requeridos faltantes']));
    }
    
    try {
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare("
            INSERT INTO usuarios (usuario, password, primer_nombre, primer_apellido, email, id_area, id_rol_admin)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("sssssii", 
            $usuario, 
            $password_hash, 
            $primer_nombre, 
            $primer_apellido, 
            $email,
            $id_area,
            $id_rol_admin
        );
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Usuario creado',
                'id' => $conn->insert_id
            ]);
        } else {
            throw new Exception('Error al crear usuario');
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
