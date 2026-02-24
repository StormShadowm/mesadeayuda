/**
 * integracion_nps.js
 * Archivo principal de integración de todos los módulos NPS
 */

console.log("🚀 Iniciando integración del sistema NPS...");

// ==================== CONFIGURACIÓN GLOBAL ====================

const NPS_CONFIG = {
  version: "1.0.0",
  modulosRequeridos: [
    "nps_calificaciones.js",
    "nps_dashboard.js",
    "historial_accesos.js",
    "mejoras_ui.js",
  ],
  apis: {
    calificaciones: "php/calificaciones_api.php",
    tickets: "php/tickets_api.php",
    usuarios: "php/user_api.php",
  },
};

// ==================== INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", function () {
  console.log("📋 Inicializando sistema NPS...");

  inicializarSistemaNPS();
});

// ==================== FUNCIÓN PRINCIPAL DE INICIALIZACIÓN ====================

async function inicializarSistemaNPS() {
  try {
    // 1. Verificar módulos cargados
    verificarModulos();

    // 2. Configurar logout mejorado
    if (typeof interceptarLogout === "function") {
      interceptarLogout();
    }

    // 3. Agregar opción "Todos" en filtros
    setTimeout(() => {
      if (typeof agregarOpcionTodosEnFiltros === "function") {
        agregarOpcionTodosEnFiltros();
      }
    }, 1000);

    // 4. Cargar NPS dashboard si estamos en estadísticas
    if (
      window.location.href.includes("admin") ||
      document.getElementById("statsContainer")
    ) {
      setTimeout(() => {
        if (typeof insertarNPSDashboard === "function") {
          insertarNPSDashboard();
        }
      }, 1500);
    }

    console.log("✅ Sistema NPS inicializado correctamente");
  } catch (error) {
    console.error("❌ Error al inicializar sistema NPS:", error);
  }
}

// ==================== VERIFICAR MÓDULOS ====================

function verificarModulos() {
  const modulos = {
    Calificaciones: typeof mostrarModalCalificacion === "function",
    "Dashboard NPS": typeof loadNPSStats === "function",
    Historial: typeof cargarHistorialAccesos === "function",
    "Mejoras UI": typeof habilitarOrdenamientoTabla === "function",
  };

  console.log("📦 Verificando módulos:");
  Object.entries(modulos).forEach(([nombre, cargado]) => {
    console.log(`  ${cargado ? "✅" : "❌"} ${nombre}`);
  });
}

// ==================== INTEGRACIÓN CON VISTA DE TICKETS ====================

// Sobrescribir función de renderizado de tickets para agregar botones NPS
if (typeof renderTicketsList === "function") {
  const originalRenderTickets = window.renderTicketsList;

  window.renderTicketsList = function (tickets) {
    originalRenderTickets(tickets);

    // Agregar botones NPS después de renderizar
    tickets.forEach((ticket) => {
      const esCreador = ticket.id_usuario == window.currentUserId;
      const puedeReabrir = esCreador || window.currentUserRol <= 2;

      if (typeof agregarBotonesNPS === "function") {
        agregarBotonesNPS(
          ticket.id,
          ticket.titulo,
          ticket.ticket_numero || ticket.id,
          ticket.estado,
          esCreador,
          puedeReabrir,
        );
      }
    });
  };
}

// ==================== INTEGRACIÓN CON FORMULARIO DE MENSAJES ====================

// Interceptar envío de mensajes para validar estado del ticket
if (typeof enviarMensaje === "function") {
  const originalEnviarMensaje = window.enviarMensaje;

  window.enviarMensaje = async function (idTicket, mensaje) {
    // Validar antes de enviar
    if (typeof validarEnvioMensaje === "function") {
      const puedeEnviar = await validarEnvioMensaje(idTicket);
      if (!puedeEnviar) {
        return false;
      }
    }

    return originalEnviarMensaje(idTicket, mensaje);
  };
}

// ==================== INTEGRACIÓN CON EDICIÓN DE USUARIOS ====================

// Agregar historial cuando se edita un usuario
window.addEventListener("userEditOpened", function (event) {
  const idUsuario = event.detail?.idUsuario;

  if (idUsuario && typeof agregarSeccionHistorialEnEdicion === "function") {
    setTimeout(() => {
      agregarSeccionHistorialEnEdicion(idUsuario);
    }, 500);
  }
});

// ==================== INTEGRACIÓN CON CIERRE DE TICKETS ====================

// Mostrar modal de calificación automáticamente cuando se cierra un ticket
window.addEventListener("ticketClosed", function (event) {
  const ticket = event.detail?.ticket;

  if (ticket && ticket.id_usuario == window.currentUserId) {
    // Esperar 1 segundo y mostrar modal de calificación
    setTimeout(() => {
      if (typeof verificarPuedeCalificar === "function") {
        verificarPuedeCalificar(ticket.id).then((puede) => {
          if (puede && typeof mostrarModalCalificacion === "function") {
            mostrarModalCalificacion(ticket.id, ticket.titulo);
          }
        });
      }
    }, 1000);
  }
});

// ==================== HELPERS GLOBALES ====================

// Emitir evento personalizado
window.emitirEvento = function (nombre, detalle) {
  const evento = new CustomEvent(nombre, { detail: detalle });
  window.dispatchEvent(evento);
};

// Formatear fecha
window.formatearFecha = function (fecha) {
  const d = new Date(fecha);
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Mostrar notificación toast
window.mostrarToast = function (mensaje, tipo = "info") {
  if (typeof mostrarNotificacion === "function") {
    mostrarNotificacion(mensaje, tipo);
  } else {
    // Fallback a alert
    alert(mensaje);
  }
};

// ==================== EXPORTAR CONFIGURACIÓN ====================

window.NPS_SYSTEM = {
  config: NPS_CONFIG,
  version: NPS_CONFIG.version,
  inicializado: true,
  timestamp: new Date().toISOString(),
};

console.log("✅ Integración NPS completa. Sistema listo.");
console.log("📊 NPS System v" + NPS_CONFIG.version);
