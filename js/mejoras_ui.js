/**
 * mejoras_ui.js
 * Mejoras de UI: ordenamiento, filtros, validaciones
 */

console.log("🎨 Cargando mejoras de UI...");

// ==================== ORDENAMIENTO DE TABLAS ====================

let currentSortColumn = null;
let currentSortDirection = "ASC";

function habilitarOrdenamientoTabla(tableId, columns) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = table.querySelectorAll("thead th");

  headers.forEach((header, index) => {
    const columnName = columns[index];
    if (!columnName) return;

    header.style.cursor = "pointer";
    header.title = "Click para ordenar";

    // Agregar indicador de ordenamiento
    const indicator = document.createElement("span");
    indicator.className = "sort-indicator ms-1";
    indicator.innerHTML = "↕️";
    header.appendChild(indicator);

    header.addEventListener("click", () => {
      ordenarTabla(tableId, columnName, indicator);
    });
  });
}

function ordenarTabla(tableId, columnName, indicator) {
  // Cambiar dirección si es la misma columna
  if (currentSortColumn === columnName) {
    currentSortDirection = currentSortDirection === "ASC" ? "DESC" : "ASC";
  } else {
    currentSortColumn = columnName;
    currentSortDirection = "ASC";
  }

  // Actualizar indicadores visuales
  document.querySelectorAll(".sort-indicator").forEach((ind) => {
    ind.innerHTML = "↕️";
  });

  indicator.innerHTML = currentSortDirection === "ASC" ? "▲" : "▼";

  // Recargar datos con ordenamiento
  if (typeof loadUsuarios === "function") {
    loadUsuarios(currentSortColumn, currentSortDirection);
  }
}

// ==================== FILTRO "TODOS" EN USUARIOS ====================

function agregarOpcionTodosEnFiltros() {
  // Buscar select de usuarios en filtros
  const selectsUsuarios = document.querySelectorAll("select[multiple]");

  selectsUsuarios.forEach((select) => {
    // Verificar si ya tiene la opción "Todos"
    const hasTodos = Array.from(select.options).some(
      (opt) => opt.value === "todos",
    );

    if (!hasTodos && select.id.includes("usuario")) {
      const option = document.createElement("option");
      option.value = "todos";
      option.textContent = "📋 Todos los usuarios";
      select.insertBefore(option, select.firstChild);

      // Seleccionar "Todos" por defecto
      option.selected = true;
    }
  });
}

// ==================== LÓGICA DE FILTRO "TODOS" ====================

function manejarSeleccionTodos(selectElement) {
  const options = Array.from(selectElement.options);
  const todosOption = options.find((opt) => opt.value === "todos");

  if (!todosOption) return;

  selectElement.addEventListener("change", function () {
    const selectedValues = Array.from(this.selectedOptions).map(
      (opt) => opt.value,
    );

    // Si se selecciona "Todos", deseleccionar otros
    if (selectedValues.includes("todos") && selectedValues.length > 1) {
      options.forEach((opt) => {
        if (opt.value !== "todos") {
          opt.selected = false;
        }
      });
    }

    // Si se selecciona otro, deseleccionar "Todos"
    if (!selectedValues.includes("todos") && selectedValues.length > 0) {
      todosOption.selected = false;
    }

    // Si no hay nada seleccionado, seleccionar "Todos"
    if (selectedValues.length === 0) {
      todosOption.selected = true;
    }
  });
}

// ==================== FILTROS EN ESTADÍSTICAS ====================

function clonarFiltrosAEstadisticas() {
  const filtrosTickets = document.getElementById("filtrosTickets");
  const contenedorEstadisticas = document.getElementById("content");

  if (!filtrosTickets || !contenedorEstadisticas) return;

  // Buscar si ya existe la sección de filtros en estadísticas
  let filtrosEstadisticas = document.getElementById("filtrosEstadisticas");

  if (!filtrosEstadisticas) {
    // Clonar los filtros
    filtrosEstadisticas = filtrosTickets.cloneNode(true);
    filtrosEstadisticas.id = "filtrosEstadisticas";

    // Insertar después del dashboard NPS
    const npsContainer = document.getElementById("nps-dashboard-container");
    if (npsContainer) {
      npsContainer.after(filtrosEstadisticas);
    }

    // Actualizar IDs para evitar conflictos
    filtrosEstadisticas.querySelectorAll("[id]").forEach((el) => {
      el.id = el.id + "_stats";
    });

    // Conectar botones de filtro
    const btnFiltrar = filtrosEstadisticas.querySelector(
      '[onclick*="aplicarFiltros"]',
    );
    const btnLimpiar = filtrosEstadisticas.querySelector(
      '[onclick*="limpiarFiltros"]',
    );

    if (btnFiltrar) {
      btnFiltrar.setAttribute("onclick", "aplicarFiltrosEstadisticas()");
    }

    if (btnLimpiar) {
      btnLimpiar.setAttribute("onclick", "limpiarFiltrosEstadisticas()");
    }
  }
}

// ==================== VALIDACIÓN DE MENSAJES EN TICKETS CERRADOS ====================

function validarFormularioMensaje() {
  const form = document.getElementById("messageForm");
  if (!form) return;

  const ticketId = form.dataset.ticketId;
  const ticketEstado = form.dataset.ticketEstado;

  if (ticketEstado === "Cerrado") {
    // Deshabilitar form
    const textarea = form.querySelector("textarea");
    const btnEnviar = form.querySelector('button[type="submit"]');

    if (textarea) textarea.disabled = true;
    if (btnEnviar) btnEnviar.disabled = true;

    // Mostrar mensaje
    const alertHTML = `
            <div class="alert alert-warning">
                <i class="bi bi-lock"></i>
                Este ticket está cerrado. No se pueden agregar mensajes.
                Puedes <a href="#" onclick="mostrarModalReapertura(${ticketId}, 'ticket', '${ticketId}')">reabrirlo</a> si necesitas continuar la conversación.
            </div>
        `;

    form.insertAdjacentHTML("beforebegin", alertHTML);
  }
}

// ==================== MEJORAR TABLA DE USUARIOS ====================

async function mejorarTablaUsuarios() {
  const tabla = document.getElementById("usuariosTable");
  if (!tabla) return;

  // Columnas ordenables
  const columnasOrdenables = [
    "id",
    "nombre_completo",
    "usuario",
    "email",
    "telefono",
    "area",
    "id_rol_admin",
    "estado",
  ];

  habilitarOrdenamientoTabla("usuariosTable", columnasOrdenables);
}

// ==================== ACTUALIZAR FUNCIÓN loadUsuarios ====================

// Sobrescribir función original si existe
if (typeof loadUsuarios === "function") {
  const originalLoadUsuarios = window.loadUsuarios;

  window.loadUsuarios = async function (ordenar = "id", direccion = "ASC") {
    try {
      const url = `php/user_api.php?action=list&ordenar=${ordenar}&direccion=${direccion}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        renderUsuarios(data.usuarios);
        mejorarTablaUsuarios();
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };
}

// ==================== NÚMERO DE TICKET CON REAPERTURAS ====================

function formatearNumeroTicket(ticket) {
  if (ticket.numero_reapertura && ticket.numero_reapertura > 0) {
    const original = ticket.id_ticket_original || ticket.id;
    return `${original}-${ticket.numero_reapertura}`;
  }
  return ticket.id;
}

// ==================== BADGE DE ESTADO CON ICONOS ====================

function getBadgeEstado(estado) {
  const badges = {
    Abierto: '<span class="badge bg-info">📂 Abierto</span>',
    "En Proceso": '<span class="badge bg-warning">⚙️ En Proceso</span>',
    Resuelto: '<span class="badge bg-success">✅ Resuelto</span>',
    Cerrado: '<span class="badge bg-secondary">🔒 Cerrado</span>',
  };

  return badges[estado] || `<span class="badge bg-secondary">${estado}</span>`;
}

// ==================== BADGE DE PRIORIDAD CON ICONOS ====================

function getBadgePrioridad(prioridad) {
  const badges = {
    baja: '<span class="badge bg-secondary">🟢 Baja</span>',
    media: '<span class="badge bg-info">🟡 Media</span>',
    alta: '<span class="badge bg-warning">🟠 Alta</span>',
    critica: '<span class="badge bg-danger">🔴 Crítica</span>',
  };

  return (
    badges[prioridad] || `<span class="badge bg-secondary">${prioridad}</span>`
  );
}

// ==================== AUTO-INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", () => {
  // Agregar opción "Todos" en filtros
  setTimeout(() => {
    agregarOpcionTodosEnFiltros();

    // Configurar manejo de "Todos"
    document.querySelectorAll("select[multiple]").forEach((select) => {
      if (select.id.includes("usuario")) {
        manejarSeleccionTodos(select);
      }
    });
  }, 500);
});

console.log("✅ Mejoras de UI cargadas");

// Exportar funciones
window.habilitarOrdenamientoTabla = habilitarOrdenamientoTabla;
window.agregarOpcionTodosEnFiltros = agregarOpcionTodosEnFiltros;
window.clonarFiltrosAEstadisticas = clonarFiltrosAEstadisticas;
window.validarFormularioMensaje = validarFormularioMensaje;
window.mejorarTablaUsuarios = mejorarTablaUsuarios;
window.formatearNumeroTicket = formatearNumeroTicket;
window.getBadgeEstado = getBadgeEstado;
window.getBadgePrioridad = getBadgePrioridad;
