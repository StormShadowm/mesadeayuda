/**
 * mejoras_ui.js - VERSIÓN LIGERA SIN CONFLICTOS
 * Solo funciones esenciales para el sistema NPS
 */

console.log("🎨 Cargando módulo de mejoras UI (versión ligera)...");

// ==================== NOTIFICACIONES TOAST ====================

function mostrarNotificacion(mensaje, tipo = "info") {
  const toast = document.createElement("div");
  toast.className = `alert alert-${tipo} position-fixed top-0 end-0 m-3`;
  toast.style.zIndex = "9999";
  toast.style.minWidth = "300px";
  toast.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="bi bi-${tipo === "success" ? "check-circle" : "info-circle"} me-2"></i>
      <div>${mensaje}</div>
      <button type="button" class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// ==================== FORMATEAR NÚMERO DE TICKET ====================

function formatearNumeroTicket(ticket) {
  if (ticket.numero_reapertura > 0) {
    const original = ticket.id_ticket_original || ticket.id;
    return `${original}-${ticket.numero_reapertura}`;
  }
  return ticket.id.toString();
}

// ==================== BADGES MEJORADOS CON ICONOS ====================

function getBadgeEstado(estado) {
  const badges = {
    Abierto: '<span class="badge bg-info"><i class="bi bi-folder2-open"></i> Abierto</span>',
    "En Proceso": '<span class="badge bg-warning"><i class="bi bi-gear"></i> En Proceso</span>',
    Resuelto: '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Resuelto</span>',
    Cerrado: '<span class="badge bg-secondary"><i class="bi bi-lock"></i> Cerrado</span>',
  };
  return badges[estado] || `<span class="badge bg-secondary">${estado}</span>`;
}

function getBadgePrioridad(prioridad) {
  const badges = {
    baja: '<span class="badge bg-secondary"><i class="bi bi-circle"></i> Baja</span>',
    media: '<span class="badge bg-info"><i class="bi bi-circle-fill"></i> Media</span>',
    alta: '<span class="badge bg-warning"><i class="bi bi-exclamation-circle"></i> Alta</span>',
    critica: '<span class="badge bg-danger"><i class="bi bi-exclamation-triangle"></i> Crítica</span>',
  };
  return badges[prioridad] || `<span class="badge bg-secondary">${prioridad}</span>`;
}

// ==================== VALIDAR ENVÍO DE MENSAJE ====================

async function validarEnvioMensaje(idTicket) {
  try {
    const response = await fetch(`php/tickets_api.php?action=get&id=${idTicket}`);
    const data = await response.json();
    
    if (data.success && data.ticket) {
      if (data.ticket.estado === 'Cerrado') {
        alert('No se pueden agregar mensajes a tickets cerrados. Por favor, reabre el ticket primero.');
        return false;
      }
      return true;
    }
    return true;
  } catch (error) {
    console.error("Error al validar:", error);
    return true; // Permitir si hay error
  }
}

console.log("✅ Módulo de mejoras UI (ligero) cargado");

// Exportar funciones
window.mostrarNotificacion = mostrarNotificacion;
window.formatearNumeroTicket = formatearNumeroTicket;
window.getBadgeEstado = getBadgeEstado;
window.getBadgePrioridad = getBadgePrioridad;
window.validarEnvioMensaje = validarEnvioMensaje;

// Funciones dummy para compatibilidad (no hacen nada)
window.habilitarOrdenamientoTabla = function() { console.log("Ordenamiento deshabilitado"); };
window.agregarOpcionTodosEnFiltros = function() { console.log("Filtros 'Todos' deshabilitado"); };
window.validarFormularioMensaje = validarEnvioMensaje;
window.mejorarTablaUsuarios = function() {};
window.mostrarSkeleton = function() {};
