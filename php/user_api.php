<?php
error_reporting(0);
ini_set('display_errors', 0);

session_start();

$conn = new mysqli("localhost", "root", "", "mesa_ayuda_final");
$conn->set_charset('utf8mb4');
header('Content-Type: application/json');

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// ==================== ME ====================
if ($action === 'me') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT id, usuario, primer_nombre, primer_apellido, email, id_rol_admin FROM usuarios WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    
    if ($user) {
        $user['nombre_completo'] = $user['primer_nombre'] . ' ' . $user['primer_apellido'];
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
    }
    exit;
}

// ==================== LIST ====================
if ($action === 'list') {
    if (!isset($_SESSION['user_id']) || $_SESSION['id_rol_admin'] > 3) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $result = $conn->query("
        SELECT u.id, u.usuario, u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido,
               u.email, u.telefono, u.id_area, u.id_rol_admin, u.estado,
               COALESCE(a.nombre, '-') as area
        FROM usuarios u
        LEFT JOIN areas a ON u.id_area = a.id
        ORDER BY u.id DESC
    ");
    
    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $row['nombre_completo'] = $row['primer_nombre'] . ' ' . $row['primer_apellido'];
        $usuarios[] = $row;
    }
    
    echo json_encode(['success' => true, 'usuarios' => $usuarios]);
    exit;
}

// ==================== GET ====================
if ($action === 'get') {
    if (!isset($_SESSION['user_id']) || $_SESSION['id_rol_admin'] > 3) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if ($id <= 0) {
        echo json_encode(['success' => false, 'message' => 'ID inválido']);
        exit;
    }
    
    $stmt = $conn->prepare("
        SELECT u.id, u.usuario, u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido,
               u.email, u.telefono, u.id_area, u.id_rol_admin, u.estado,
               COALESCE(a.nombre, '-') as area
        FROM usuarios u
        LEFT JOIN areas a ON u.id_area = a.id
        WHERE u.id = ?
    ");
    
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    
    if ($user) {
        echo json_encode(['success' => true, 'user' => $user]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado']);
    }
    exit;
}

// ==================== GET_AREAS ====================
if ($action === 'get_areas') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $table_check = $conn->query("SHOW TABLES LIKE 'areas'");
    if ($table_check->num_rows == 0) {
        echo json_encode(['success' => true, 'areas' => []]);
        exit;
    }
    
    $result = $conn->query("SELECT id, nombre FROM areas ORDER BY nombre ASC");
    $areas = [];
    while ($row = $result->fetch_assoc()) {
        $areas[] = $row;
    }
    
    echo json_encode(['success' => true, 'areas' => $areas]);
    exit;
}

// ==================== GET_ROLES ====================
if ($action === 'get_roles') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $roles = [
        ['id' => 1, 'nombre' => 'Super Admin'],
        ['id' => 2, 'nombre' => 'Admin'],
        ['id' => 3, 'nombre' => 'Técnico'],
        ['id' => 4, 'nombre' => 'Usuario']
    ];
    
    echo json_encode(['success' => true, 'roles' => $roles]);
    exit;
}

// ==================== UPDATE ====================
if ($action === 'update') {
    if (!isset($_SESSION['user_id']) || $_SESSION['id_rol_admin'] > 3) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    $usuario = isset($_POST['usuario']) ? trim($_POST['usuario']) : '';
    $primer_nombre = isset($_POST['primer_nombre']) ? trim($_POST['primer_nombre']) : '';
    $segundo_nombre = isset($_POST['segundo_nombre']) ? trim($_POST['segundo_nombre']) : '';
    $primer_apellido = isset($_POST['primer_apellido']) ? trim($_POST['primer_apellido']) : '';
    $segundo_apellido = isset($_POST['segundo_apellido']) ? trim($_POST['segundo_apellido']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $telefono = isset($_POST['telefono']) ? trim($_POST['telefono']) : '';
    $id_area = isset($_POST['id_area']) && $_POST['id_area'] !== '' ? (int)$_POST['id_area'] : null;
    $id_rol_admin = isset($_POST['id_rol_admin']) ? (int)$_POST['id_rol_admin'] : 4;
    $estado = isset($_POST['estado']) ? (int)$_POST['estado'] : 1;
    $password = isset($_POST['password']) ? trim($_POST['password']) : '';
    
    if ($id <= 0 || empty($usuario) || empty($primer_nombre) || empty($primer_apellido) || empty($email)) {
        echo json_encode(['success' => false, 'message' => 'Campos obligatorios faltantes']);
        exit;
    }
    
    try {
        // Verificar duplicados
        $stmt = $conn->prepare("SELECT id FROM usuarios WHERE (usuario = ? OR email = ?) AND id != ?");
        $stmt->bind_param("ssi", $usuario, $email, $id);
        $stmt->execute();
        
        if ($stmt->get_result()->num_rows > 0) {
            echo json_encode(['success' => false, 'message' => 'El usuario o email ya existe']);
            exit;
        }
        
        // Actualizar CON contraseña
        if (!empty($password) && strlen($password) >= 6) {
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            
            // 12 parámetros → 12 letras en el tipo
            $stmt = $conn->prepare("
                UPDATE usuarios 
                SET usuario = ?, password = ?, primer_nombre = ?, segundo_nombre = ?, 
                    primer_apellido = ?, segundo_apellido = ?, email = ?, telefono = ?, 
                    id_area = ?, id_rol_admin = ?, estado = ? 
                WHERE id = ?
            ");
            
            // s s s s s s s s i i i i = 12 parámetros
            $stmt->bind_param("sssssssiiii", 
                $usuario, $password_hash, $primer_nombre, $segundo_nombre, 
                $primer_apellido, $segundo_apellido, $email, $telefono, 
                $id_area, $id_rol_admin, $estado, $id
            );
        } 
        // Actualizar SIN contraseña
        else {
            // 11 parámetros → 11 letras en el tipo
            $stmt = $conn->prepare("
                UPDATE usuarios 
                SET usuario = ?, primer_nombre = ?, segundo_nombre = ?, 
                    primer_apellido = ?, segundo_apellido = ?, email = ?, telefono = ?, 
                    id_area = ?, id_rol_admin = ?, estado = ? 
                WHERE id = ?
            ");
            
            // s s s s s s s i i i i = 11 parámetros
            $stmt->bind_param("sssssssiiii", 
                $usuario, $primer_nombre, $segundo_nombre, 
                $primer_apellido, $segundo_apellido, $email, $telefono, 
                $id_area, $id_rol_admin, $estado, $id
            );
        }
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Usuario actualizado']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error SQL: ' . $stmt->error]);
        }
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
    exit;
}

// ==================== HISTORIAL_ACCESOS ====================
if ($action === 'historial_accesos') {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit;
    }
    
    $id_usuario = isset($_GET['id_usuario']) ? (int)$_GET['id_usuario'] : $_SESSION['user_id'];
    
    $table_check = $conn->query("SHOW TABLES LIKE 'historial_login'");
    if ($table_check->num_rows == 0) {
        echo json_encode(['success' => true, 'historial' => []]);
        exit;
    }
    
    $stmt = $conn->prepare("
        SELECT 'login' as tipo, 
               CASE WHEN exitoso = 1 THEN 'Exitoso' ELSE 'Fallido' END as estado,
               ip_address, '' as user_agent, fecha
        FROM historial_login
        WHERE id_usuario = ?
        ORDER BY fecha DESC
        LIMIT 50
    ");
    
    $stmt->bind_param("i", $id_usuario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $historial = [];
    while ($row = $result->fetch_assoc()) {
        $historial[] = $row;
    }
    
    echo json_encode(['success' => true, 'historial' => $historial]);
    exit;
}

// ==================== ACCIÓN NO VÁLIDA ====================
echo json_encode(['success' => false, 'message' => 'Accion no valida: ' . $action]);
$conn->close();
?>
