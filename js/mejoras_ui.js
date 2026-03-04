/**
 * mejoras_ui.js
 * Mejoras de interfaz de usuario para el sistema
 */

console.log("🎨 Cargando módulo de mejoras UI...");

// ==================== HABILITAR ORDENAMIENTO EN TABLAS ====================

function habilitarOrdenamientoTabla(tableId, columnsConfig) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = table.querySelectorAll("thead th");
  let sortColumn = null;
  let sortDirection = "asc";

  headers.forEach((header, index) => {
    if (columnsConfig[index] && columnsConfig[index].sortable) {
      header.classList.add("sortable-header");
      header.style.cursor = "pointer";
      header.innerHTML += ' <span class="sort-indicator">⇅</span>';

      header.addEventListener("click", () => {
        sortTable(table, index, header);
      });
    }
  });

  function sortTable(table, columnIndex, headerEl) {
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    // Determinar dirección
    if (sortColumn === columnIndex) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortDirection = "asc";
      sortColumn = columnIndex;
    }

    // Ordenar
    rows.sort((a, b) => {
      const aVal = a.cells[columnIndex].textContent.trim();
      const bVal = b.cells[columnIndex].textContent.trim();

      // Intentar comparar como números
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      // Comparar como texto
      return sortDirection === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    // Actualizar indicadores
    table.querySelectorAll(".sort-indicator").forEach((ind) => {
      ind.textContent = "⇅";
    });

    const indicator = headerEl.querySelector(".sort-indicator");
    if (indicator) {
      indicator.textContent = sortDirection === "asc" ? "↑" : "↓";
    }

    // Reinsertar filas
    rows.forEach((row) => tbody.appendChild(row));
  }
}

// ==================== AGREGAR OPCIÓN "TODOS" EN FILTROS ====================

function agregarOpcionTodosEnFiltros() {
  // Buscar selectores de filtro
  const filtros = document.querySelectorAll(
    'select[name="estado"], select[name="prioridad"], #filtroEstado, #filtroPrioridad',
  );

  filtros.forEach((select) => {
    // Verificar si ya tiene la opción "Todos"
    const tieneOpcionTodos = Array.from(select.options).some(
      (opt) => opt.value === "" || opt.value === "todos",
    );

    if (!tieneOpcionTodos && select.options.length > 0) {
      const optionTodos = document.createElement("option");
      optionTodos.value = "";
      optionTodos.textContent = "Todos";
      select.insertBefore(optionTodos, select.firstChild);
      select.selectedIndex = 0;
    }
  });
}

// ==================== VALIDAR FORMULARIO DE MENSAJE ====================

async function validarFormularioMensaje(idTicket, formElement) {
  try {
    const response = await fetch(
      `php/tickets_api.php?action=puede_responder&id_ticket=${idTicket}`,
    );
    const data = await response.json();

    if (!data.success || !data.puede_responder) {
      alert(
        "No se pueden agregar mensajes a tickets cerrados. Por favor, reabre el ticket primero.",
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error al validar:", error);
    return true; // Permitir envío si hay error de validación
  }
}

// ==================== MEJORAR TABLA DE USUARIOS ====================

function mejorarTablaUsuarios() {
  const tabla = document.querySelector("#usuariosTable, .table");
  if (!tabla) return;

  // Agregar clases de Bootstrap mejoradas
  tabla.classList.add("table-hover", "table-striped");

  // Mejorar celdas de email con iconos
  const emailCells = tabla.querySelectorAll("td");
  emailCells.forEach((cell) => {
    const text = cell.textContent.trim();
    if (text.includes("@")) {
      cell.innerHTML = `<i class="bi bi-envelope"></i> ${text}`;
    }
  });
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
    Abierto:
      '<span class="badge bg-info"><i class="bi bi-folder2-open"></i> Abierto</span>',
    "En Proceso":
      '<span class="badge bg-warning"><i class="bi bi-gear"></i> En Proceso</span>',
    Resuelto:
      '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Resuelto</span>',
    Cerrado:
      '<span class="badge bg-secondary"><i class="bi bi-lock"></i> Cerrado</span>',
  };
  return badges[estado] || `<span class="badge bg-secondary">${estado}</span>`;
}

function getBadgePrioridad(prioridad) {
  const badges = {
    baja: '<span class="badge bg-secondary"><i class="bi bi-circle"></i> Baja</span>',
    media:
      '<span class="badge bg-info"><i class="bi bi-circle-fill"></i> Media</span>',
    alta: '<span class="badge bg-warning"><i class="bi bi-exclamation-circle"></i> Alta</span>',
    critica:
      '<span class="badge bg-danger"><i class="bi bi-exclamation-triangle"></i> Crítica</span>',
  };
  return (
    badges[prioridad] || `<span class="badge bg-secondary">${prioridad}</span>`
  );
}

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

// ==================== AGREGAR SKELETON LOADERS ====================

function mostrarSkeleton(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
        <div class="placeholder-glow">
            <div class="placeholder col-12 mb-2"></div>
            <div class="placeholder col-10 mb-2"></div>
            <div class="placeholder col-8 mb-2"></div>
            <div class="placeholder col-12 mb-2"></div>
            <div class="placeholder col-9"></div>
        </div>
    `;
}

// ==================== AUTO-INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", () => {
  // Agregar opción "Todos" después de 500ms
  setTimeout(() => {
    agregarOpcionTodosEnFiltros();
  }, 500);

  // Mejorar tablas cuando se cargan
  const observer = new MutationObserver(() => {
    mejorarTablaUsuarios();
  });

  const contentDiv = document.getElementById("content");
  if (contentDiv) {
    observer.observe(contentDiv, { childList: true, subtree: true });
  }
});

console.log("✅ Módulo de mejoras UI cargado");

// Exportar funciones
window.habilitarOrdenamientoTabla = habilitarOrdenamientoTabla;
window.agregarOpcionTodosEnFiltros = agregarOpcionTodosEnFiltros;
window.validarFormularioMensaje = validarFormularioMensaje;
window.mejorarTablaUsuarios = mejorarTablaUsuarios;
window.formatearNumeroTicket = formatearNumeroTicket;
window.getBadgeEstado = getBadgeEstado;
window.getBadgePrioridad = getBadgePrioridad;
window.mostrarNotificacion = mostrarNotificacion;
window.mostrarSkeleton = mostrarSkeleton;
