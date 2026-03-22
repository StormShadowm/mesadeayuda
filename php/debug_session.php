<?php
session_start();

header('Content-Type: application/json');

echo json_encode([
    'session_data' => $_SESSION,
    'user_id' => $_SESSION['user_id'] ?? null,
    'id_rol_admin' => $_SESSION['id_rol_admin'] ?? null,
    'id_area' => $_SESSION['id_area'] ?? null,
    'usuario' => $_SESSION['usuario'] ?? null
]);
