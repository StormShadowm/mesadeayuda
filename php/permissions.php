<?php

/**
 * permissions.php
 * Sistema de permisos para tickets
 */

class TicketPermissions
{

    const SUPER_ADMIN = 1;
    const ADMIN_INTERMEDIO = 2;
    const TECNICO = 3;
    const USUARIO = 4;

    /**
     * Verificar si el usuario puede ver un ticket
     */
    public static function puedeVerTicket($conn, $id_usuario, $id_rol_admin, $id_area_usuario, $ticket_id)
    {
        // Super Admin ve todos
        if ($id_rol_admin == self::SUPER_ADMIN) {
            return true;
        }

        // Obtener info del ticket
        $stmt = $conn->prepare("SELECT id_usuario, id_asignado, id_area FROM tickets WHERE id = ?");
        $stmt->bind_param("i", $ticket_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows == 0) {
            return false;
        }

        $ticket = $result->fetch_assoc();

        // Usuario solo ve sus propios tickets
        if ($id_rol_admin == self::USUARIO) {
            return $ticket['id_usuario'] == $id_usuario;
        }

        // Admin Intermedio y Técnicos solo ven tickets de su área
        if ($id_rol_admin == self::ADMIN_INTERMEDIO || $id_rol_admin == self::TECNICO) {
            return $ticket['id_area'] == $id_area_usuario;
        }

        return false;
    }

    /**
     * Verificar si puede cerrar el ticket
     */
    public static function puedeCerrarTicket($id_rol_admin, $id_usuario, $ticket)
    {
        // Super Admin y Admin Intermedio siempre pueden
        if ($id_rol_admin == self::SUPER_ADMIN || $id_rol_admin == self::ADMIN_INTERMEDIO) {
            return true;
        }

        // Técnico solo si está asignado a él
        if ($id_rol_admin == self::TECNICO) {
            return $ticket['id_asignado'] == $id_usuario;
        }

        return false;
    }

    /**
     * Verificar si puede asignar técnico
     */
    public static function puedeAsignarTecnico($id_rol_admin, $id_usuario, $ticket)
    {
        // Super Admin y Admin Intermedio siempre pueden
        if ($id_rol_admin == self::SUPER_ADMIN || $id_rol_admin == self::ADMIN_INTERMEDIO) {
            return true;
        }

        // Técnico solo si está asignado a él
        if ($id_rol_admin == self::TECNICO) {
            return $ticket['id_asignado'] == $id_usuario;
        }

        return false;
    }

    /**
     * Verificar si puede reabrir ticket
     */
    public static function puedeReabrirTicket($id_rol_admin)
    {
        return $id_rol_admin == self::SUPER_ADMIN || $id_rol_admin == self::ADMIN_INTERMEDIO;
    }

    /**
     * Verificar si puede cambiar área
     */
    public static function puedeCambiarArea($id_rol_admin)
    {
        return $id_rol_admin == self::SUPER_ADMIN || $id_rol_admin == self::ADMIN_INTERMEDIO;
    }

    /**
     * Verificar si puede editar mensajes
     */
    public static function puedeEditarMensajes($id_rol_admin)
    {
        return $id_rol_admin == self::SUPER_ADMIN;
    }

    /**
     * Verificar si puede eliminar archivos
     */
    public static function puedeEliminarArchivos($id_rol_admin)
    {
        return $id_rol_admin == self::SUPER_ADMIN;
    }

    /**
     * Verificar si puede enviar mensajes/archivos
     */
    public static function puedeEnviarMensajes($id_rol_admin, $id_usuario, $ticket)
    {
        // Super Admin y Admin Intermedio siempre pueden
        if ($id_rol_admin == self::SUPER_ADMIN || $id_rol_admin == self::ADMIN_INTERMEDIO) {
            return true;
        }

        // Técnico solo si está asignado
        if ($id_rol_admin == self::TECNICO) {
            return $ticket['id_asignado'] == $id_usuario;
        }

        // Usuario solo en sus propios tickets
        if ($id_rol_admin == self::USUARIO) {
            return $ticket['id_usuario'] == $id_usuario;
        }

        return false;
    }

    /**
     * Obtener tickets según permisos del usuario
     */
    public static function getTicketsQuery($id_usuario, $id_rol_admin, $id_area_usuario)
    {
        // Super Admin ve todos
        if ($id_rol_admin == self::SUPER_ADMIN) {
            return "SELECT * FROM tickets ORDER BY fecha_creacion DESC";
        }

        // Usuario solo ve sus tickets
        if ($id_rol_admin == self::USUARIO) {
            return "SELECT * FROM tickets WHERE id_usuario = $id_usuario ORDER BY fecha_creacion DESC";
        }

        // Admin Intermedio y Técnicos ven tickets de su área
        if ($id_rol_admin == self::ADMIN_INTERMEDIO || $id_rol_admin == self::TECNICO) {
            if ($id_area_usuario === null || $id_area_usuario === '') {
                return "SELECT * FROM tickets WHERE 1=0 ORDER BY fecha_creacion DESC";
            }
            return "SELECT * FROM tickets WHERE id_area = $id_area_usuario ORDER BY fecha_creacion DESC";
        }

        return "SELECT * FROM tickets WHERE 1=0"; // No debería llegar aquí
    }

    /**
     * Registrar cambio en historial
     */
    public static function registrarHistorial($conn, $id_ticket, $accion, $id_usuario, $campo = null, $valor_anterior = null, $valor_nuevo = null)
    {
        $stmt = $conn->prepare("INSERT INTO historial_tickets (id_ticket, accion, campo_modificado, valor_anterior, valor_nuevo, id_usuario) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issssi", $id_ticket, $accion, $campo, $valor_anterior, $valor_nuevo, $id_usuario);
        $stmt->execute();
    }

    /**
     * Obtener historial de ticket filtrado según rol
     */
    public static function getHistorialTicket($conn, $ticket_id, $id_rol_admin)
    {
        // Usuario no ve ciertos cambios
        if ($id_rol_admin == self::USUARIO) {
            $stmt = $conn->prepare("
                SELECT h.*, u.primer_nombre, u.primer_apellido 
                FROM historial_tickets h
                LEFT JOIN usuarios u ON h.id_usuario = u.id
                WHERE h.id_ticket = ? 
                AND h.accion NOT IN ('cambio_area', 'asignacion', 'reapertura')
                ORDER BY h.fecha DESC
            ");
        } else {
            $stmt = $conn->prepare("
                SELECT h.*, u.primer_nombre, u.primer_apellido 
                FROM historial_tickets h
                LEFT JOIN usuarios u ON h.id_usuario = u.id
                WHERE h.id_ticket = ?
                ORDER BY h.fecha DESC
            ");
        }

        $stmt->bind_param("i", $ticket_id);
        $stmt->execute();
        $result = $stmt->get_result();

        $historial = [];
        while ($row = $result->fetch_assoc()) {
            $historial[] = $row;
        }

        return $historial;
    }
}
