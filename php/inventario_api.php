<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

$conn = new mysqli("localhost", "root", "", "mesa_ayuda_final");
$conn->set_charset('utf8mb4');
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit;
}

$user_id = $_SESSION['user_id'];
$user_rol = $_SESSION['id_rol_admin'];
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// Solo admins pueden acceder (rol <= 3)
if ($user_rol > 3) {
    echo json_encode(['success' => false, 'message' => 'No tiene permisos para acceder al inventario']);
    exit;
}

// ==================== LISTAR INVENTARIO ====================
if ($action === 'list') {
    $query = "SELECT i.*, 
              t.nombre as tipo_nombre,
              m.nombre as marca_nombre,
              mo.nombre as modelo_nombre,
              s.nombre as sede_nombre,
              a.nombre as area_nombre,
              CONCAT(u.primer_nombre, ' ', u.primer_apellido) as usuario_asignado_nombre
              FROM inventario i
              LEFT JOIN tipos_activo t ON i.id_tipo = t.id
              LEFT JOIN marcas m ON i.id_marca = m.id
              LEFT JOIN modelos mo ON i.id_modelo = mo.id
              LEFT JOIN sedes s ON i.id_sede = s.id
              LEFT JOIN areas a ON i.id_area = a.id
              LEFT JOIN usuarios u ON i.id_usuario_asignado = u.id
              ORDER BY i.id DESC";
    
    $result = $conn->query($query);
    $items = [];
    
    while ($row = $result->fetch_assoc()) {
        $items[] = $row;
    }
    
    echo json_encode(['success' => true, 'items' => $items]);
}

// ==================== CREAR ITEM ====================
elseif ($action === 'create') {
    // Solo Super Admin (1) y Admin Intermedio (2) pueden crear
    if ($user_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tiene permisos para crear items']);
        exit;
    }
    
    $id_tipo = isset($_POST['id_tipo']) ? (int)$_POST['id_tipo'] : 0;
    $id_marca = isset($_POST['id_marca']) ? (int)$_POST['id_marca'] : 0;
    $id_modelo = isset($_POST['id_modelo']) ? (int)$_POST['id_modelo'] : 0;
    $serial = isset($_POST['serial']) ? trim($_POST['serial']) : '';
    $placa = isset($_POST['placa']) ? trim($_POST['placa']) : '';
    $fecha_compra = isset($_POST['fecha_compra']) ? $_POST['fecha_compra'] : null;
    $fecha_asignacion = isset($_POST['fecha_asignacion']) ? $_POST['fecha_asignacion'] : null;
    $id_sede = isset($_POST['id_sede']) ? (int)$_POST['id_sede'] : null;
    $id_area = isset($_POST['id_area']) ? (int)$_POST['id_area'] : null;
    $id_usuario_asignado = isset($_POST['id_usuario_asignado']) ? (int)$_POST['id_usuario_asignado'] : null;
    $estado = isset($_POST['estado']) ? $_POST['estado'] : 'en_bodega';
    $observaciones = isset($_POST['observaciones']) ? trim($_POST['observaciones']) : '';
    
    // Validaciones
    if (empty($serial)) {
        echo json_encode(['success' => false, 'message' => 'El serial es obligatorio']);
        exit;
    }
    
    if (empty($placa)) {
        echo json_encode(['success' => false, 'message' => 'La placa es obligatoria']);
        exit;
    }
    
    // Verificar duplicados de serial
    $check = $conn->prepare("SELECT id, estado FROM inventario WHERE serial = ?");
    $check->bind_param("s", $serial);
    $check->execute();
    $result = $check->get_result();
    
    if ($result->num_rows > 0) {
        $existing = $result->fetch_assoc();
        // Si existe con diferente estado, permitir pero avisar
        echo json_encode([
            'success' => false, 
            'message' => 'Ya existe un activo con este serial',
            'warning' => true,
            'existing_id' => $existing['id'],
            'existing_estado' => $existing['estado']
        ]);
        exit;
    }
    
    // Verificar duplicados de placa
    $check = $conn->prepare("SELECT id, estado FROM inventario WHERE placa = ?");
    $check->bind_param("s", $placa);
    $check->execute();
    $result = $check->get_result();
    
    if ($result->num_rows > 0) {
        $existing = $result->fetch_assoc();
        echo json_encode([
            'success' => false, 
            'message' => 'Ya existe un activo con esta placa',
            'warning' => true,
            'existing_id' => $existing['id'],
            'existing_estado' => $existing['estado']
        ]);
        exit;
    }
    
    // Insertar
    $stmt = $conn->prepare("INSERT INTO inventario (id_tipo, id_marca, id_modelo, serial, placa, fecha_compra, fecha_asignacion, id_sede, id_area, id_usuario_asignado, estado, observaciones, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iiissssiiissi", $id_tipo, $id_marca, $id_modelo, $serial, $placa, $fecha_compra, $fecha_asignacion, $id_sede, $id_area, $id_usuario_asignado, $estado, $observaciones, $user_id);
    
    if ($stmt->execute()) {
        $item_id = $conn->insert_id;
        
        // Registrar en historial
        $hist = $conn->prepare("INSERT INTO historial_inventario (id_inventario, accion, id_usuario) VALUES (?, 'creacion', ?)");
        $hist->bind_param("ii", $item_id, $user_id);
        $hist->execute();
        
        echo json_encode(['success' => true, 'id' => $item_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al crear: ' . $conn->error]);
    }
}

// ==================== ACTUALIZAR ITEM ====================
elseif ($action === 'update') {
    // Solo Super Admin (1) y Admin Intermedio (2) pueden editar
    if ($user_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tiene permisos para editar items']);
        exit;
    }
    
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    
    // Obtener valores actuales
    $current = $conn->prepare("SELECT * FROM inventario WHERE id = ?");
    $current->bind_param("i", $id);
    $current->execute();
    $current_data = $current->get_result()->fetch_assoc();
    
    if (!$current_data) {
        echo json_encode(['success' => false, 'message' => 'Item no encontrado']);
        exit;
    }
    
    // Campos a actualizar
    $fields = ['id_tipo', 'id_marca', 'id_modelo', 'serial', 'placa', 'fecha_compra', 'fecha_asignacion', 'fecha_devolucion', 'id_sede', 'id_area', 'id_usuario_asignado', 'estado', 'observaciones'];
    
    $updates = [];
    $params = [];
    $types = '';
    
    foreach ($fields as $field) {
        if (isset($_POST[$field])) {
            $new_value = $_POST[$field];
            $old_value = $current_data[$field];
            
            // Solo actualizar si cambió
            if ($new_value != $old_value) {
                $updates[] = "$field = ?";
                $params[] = $new_value;
                
                if (in_array($field, ['id_tipo', 'id_marca', 'id_modelo', 'id_sede', 'id_area', 'id_usuario_asignado'])) {
                    $types .= 'i';
                } else {
                    $types .= 's';
                }
                
                // Registrar cambio en historial
                $hist = $conn->prepare("INSERT INTO historial_inventario (id_inventario, accion, campo_modificado, valor_anterior, valor_nuevo, id_usuario) VALUES (?, 'modificacion', ?, ?, ?, ?)");
                $hist->bind_param("isssi", $id, $field, $old_value, $new_value, $user_id);
                $hist->execute();
            }
        }
    }
    
    if (empty($updates)) {
        echo json_encode(['success' => true, 'message' => 'No hay cambios para actualizar']);
        exit;
    }
    
    $sql = "UPDATE inventario SET " . implode(', ', $updates) . " WHERE id = ?";
    $params[] = $id;
    $types .= 'i';
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $conn->error]);
    }
}

// ==================== ELIMINAR ITEM ====================
elseif ($action === 'delete') {
    // Solo Super Admin puede eliminar
    if ($user_rol > 1) {
        echo json_encode(['success' => false, 'message' => 'Solo Super Administradores pueden eliminar items']);
        exit;
    }
    
    $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
    
    // Registrar eliminación en historial antes de borrar
    $hist = $conn->prepare("INSERT INTO historial_inventario (id_inventario, accion, id_usuario) VALUES (?, 'eliminacion', ?)");
    $hist->bind_param("ii", $id, $user_id);
    $hist->execute();
    
    $stmt = $conn->prepare("DELETE FROM inventario WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
    }
}

// ==================== OBTENER HISTORIAL ====================
elseif ($action === 'get_historial') {
    $id_inventario = isset($_GET['id_inventario']) ? (int)$_GET['id_inventario'] : 0;
    
    $query = "SELECT h.*, CONCAT(u.primer_nombre, ' ', u.primer_apellido) as usuario_nombre
              FROM historial_inventario h
              LEFT JOIN usuarios u ON h.id_usuario = u.id
              WHERE h.id_inventario = ?
              ORDER BY h.fecha DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $id_inventario);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $historial = [];
    while ($row = $result->fetch_assoc()) {
        $historial[] = $row;
    }
    
    echo json_encode(['success' => true, 'historial' => $historial]);
}

// ==================== CATÁLOGOS ====================
elseif ($action === 'get_tipos') {
    $result = $conn->query("SELECT * FROM tipos_activo WHERE activo = 1 ORDER BY nombre");
    $tipos = [];
    while ($row = $result->fetch_assoc()) {
        $tipos[] = $row;
    }
    echo json_encode(['success' => true, 'tipos' => $tipos]);
}

elseif ($action === 'get_marcas') {
    $result = $conn->query("SELECT * FROM marcas WHERE activo = 1 ORDER BY nombre");
    $marcas = [];
    while ($row = $result->fetch_assoc()) {
        $marcas[] = $row;
    }
    echo json_encode(['success' => true, 'marcas' => $marcas]);
}

elseif ($action === 'get_modelos') {
    $id_marca = isset($_GET['id_marca']) ? (int)$_GET['id_marca'] : 0;
    
    if ($id_marca > 0) {
        $stmt = $conn->prepare("SELECT * FROM modelos WHERE id_marca = ? AND activo = 1 ORDER BY nombre");
        $stmt->bind_param("i", $id_marca);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        $result = $conn->query("SELECT * FROM modelos WHERE activo = 1 ORDER BY nombre");
    }
    
    $modelos = [];
    while ($row = $result->fetch_assoc()) {
        $modelos[] = $row;
    }
    echo json_encode(['success' => true, 'modelos' => $modelos]);
}

elseif ($action === 'get_sedes') {
    $result = $conn->query("SELECT * FROM sedes WHERE activo = 1 ORDER BY nombre");
    $sedes = [];
    while ($row = $result->fetch_assoc()) {
        $sedes[] = $row;
    }
    echo json_encode(['success' => true, 'sedes' => $sedes]);
}

elseif ($action === 'get_areas') {
    $result = $conn->query("SELECT * FROM areas ORDER BY nombre");
    $areas = [];
    while ($row = $result->fetch_assoc()) {
        $areas[] = $row;
    }
    echo json_encode(['success' => true, 'areas' => $areas]);
}

// ==================== CREAR CATÁLOGOS ====================
elseif ($action === 'create_tipo') {
    if ($user_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tiene permisos']);
        exit;
    }
    
    $nombre = isset($_POST['nombre']) ? trim($_POST['nombre']) : '';
    $stmt = $conn->prepare("INSERT INTO tipos_activo (nombre) VALUES (?)");
    $stmt->bind_param("s", $nombre);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $conn->error]);
    }
}

elseif ($action === 'create_marca') {
    if ($user_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tiene permisos']);
        exit;
    }
    
    $nombre = isset($_POST['nombre']) ? trim($_POST['nombre']) : '';
    $stmt = $conn->prepare("INSERT INTO marcas (nombre) VALUES (?)");
    $stmt->bind_param("s", $nombre);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $conn->error]);
    }
}

elseif ($action === 'create_modelo') {
    if ($user_rol > 2) {
        echo json_encode(['success' => false, 'message' => 'No tiene permisos']);
        exit;
    }
    
    $nombre = isset($_POST['nombre']) ? trim($_POST['nombre']) : '';
    $id_marca = isset($_POST['id_marca']) ? (int)$_POST['id_marca'] : 0;
    $stmt = $conn->prepare("INSERT INTO modelos (nombre, id_marca) VALUES (?, ?)");
    $stmt->bind_param("si", $nombre, $id_marca);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $conn->error]);
    }
}

else {
    echo json_encode(['success' => false, 'message' => 'Acción no válida']);
}

$conn->close();
?>
