// admin.js - VERSIÓN COMPLETA CON TODAS LAS MEJORAS
// Incluye: Filtros, Ordenamiento, Urgencia Visual, Asignación, y más

let currentView = "tickets";
let allTickets = [];
let allUsers = [];
let currentTicketId = null;
let sortColumn = "fecha_creacion";
let sortDirection = "DESC";
let updateInterval = null;

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  showView("tickets", null);
  startAutoUpdate();
});

async function loadUserProfile() {
  try {
    const response = await fetch("php/user_api.php?action=me");
    const data = await response.json();

    if (data.success) {
      const fullName = data.user.nombre_completo;
      const initials = getInitials(fullName);

      const avatar = document.getElementById("userAvatar");
      const menuName = document.getElementById("menuUserName");

      if (avatar) avatar.textContent = initials;
      if (menuName) menuName.textContent = fullName;
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function getInitials(name) {
  const parts = name.split(" ");
  return (parts[0][0] + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

function showView(view, event) {
  currentView = view;

  if (event && event.target) {
    document.querySelectorAll(".btn-section").forEach((btn) => {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");
    });
    event.target.classList.remove("btn-secondary");
    event.target.classList.add("btn-primary");
  } else {
    document.querySelectorAll(".btn-section").forEach((btn) => {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary");
    });

    const activeButton = document.querySelector(`[onclick*="${view}"]`);
    if (activeButton) {
      activeButton.classList.remove("btn-secondary");
      activeButton.classList.add("btn-primary");
    }
  }

  if (view === "tickets") {
    loadTickets();
  } else if (view === "users") {
    loadUsers();
  } else if (view === "stats") {
    loadStats();
  }
}

// ==================== TICKETS ====================

async function loadTickets() {
  const content = document.getElementById("content");
  content.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const response = await fetch("php/tickets_api.php?action=list");
    const data = await response.json();

    if (data.success) {
      allTickets = data.tickets;
      renderTickets(allTickets);
    } else {
      content.innerHTML =
        '<div class="alert alert-danger">Error: ' + data.message + "</div>";
    }
  } catch (error) {
    console.error("Error:", error);
    content.innerHTML =
      '<div class="alert alert-danger">Error de conexión</div>';
  }
}

function renderTickets(tickets) {
  const content = document.getElementById("content");

  // Barra de filtros
  let html = `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title">🔍 Filtros Avanzados</h5>
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label small">Buscar</label>
                        <input type="text" id="filtro_busqueda" class="form-control form-control-sm" placeholder="ID, usuario, email...">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small">Fecha Desde</label>
                        <input type="date" id="filtro_fecha_desde" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small">Fecha Hasta</label>
                        <input type="date" id="filtro_fecha_hasta" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small">Estado</label>
                        <select id="filtro_estado" class="form-select form-select-sm">
                            <option value="">Todos</option>
                            <option value="Abierto">Abierto</option>
                            <option value="En Proceso">En Proceso</option>
                            <option value="Resuelto">Resuelto</option>
                            <option value="Cerrado">Cerrado</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small">Prioridad</label>
                        <select id="filtro_prioridad" class="form-select form-select-sm">
                            <option value="">Todas</option>
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica</option>
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small">Adjunto</label>
                        <select id="filtro_adjunto" class="form-select form-select-sm">
                            <option value="">Todos</option>
                            <option value="Si">Sí</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-md-12">
                        <button class="btn btn-primary btn-sm" onclick="aplicarFiltros()">
                            🔍 Filtrar
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="limpiarFiltros()">
                            🔄 Limpiar
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>Gestión de Tickets (${tickets.length})</h4>
            <small class="text-muted">Mostrando máximo 20 tickets</small>
        </div>
        
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th style="cursor:pointer" onclick="sortTickets('id')">
                            ID ${sortColumn === "id" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th style="cursor:pointer" onclick="sortTickets('titulo')">
                            Título ${sortColumn === "titulo" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th>Usuario</th>
                        <th style="cursor:pointer" onclick="sortTickets('estado')">
                            Estado ${sortColumn === "estado" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th style="cursor:pointer" onclick="sortTickets('prioridad')">
                            Prioridad ${sortColumn === "prioridad" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th>Categoría</th>
                        <th>Adjunto</th>
                        <th>Tiempo</th>
                        <th style="cursor:pointer" onclick="sortTickets('fecha_creacion')">
                            Fecha ${sortColumn === "fecha_creacion" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="ticketsTableBody">
    `;

  tickets.forEach((ticket) => {
    html += renderTicketRow(ticket);
  });

  html += `
                </tbody>
            </table>
        </div>
    `;

  content.innerHTML = html;
}

function renderTicketRow(ticket) {
  const estadoClass =
    {
      Abierto: "bg-primary",
      "En Proceso": "bg-warning text-dark",
      Cerrado: "bg-secondary",
      Resuelto: "bg-success",
    }[ticket.estado] || "bg-secondary";

  const prioridadClass =
    {
      baja: "bg-info text-dark",
      media: "bg-warning text-dark",
      alta: "bg-danger",
      critica: "bg-danger",
    }[ticket.prioridad] || "bg-secondary";

  // Calcular color de fondo según urgencia
  const urgencia = ticket.urgencia_porcentaje || 0;
  let bgColor = "transparent";
  if (urgencia >= 100) {
    bgColor = "#ffcccc"; // Rojo
  } else if (urgencia >= 66) {
    bgColor = "#ffe6cc"; // Naranja
  } else if (urgencia >= 33) {
    bgColor = "#fff9cc"; // Amarillo
  }

  const minutos = ticket.minutos_abierto || 0;
  const tiempoTexto =
    minutos < 60
      ? `${minutos} min`
      : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;

  return `
        <tr style="background-color: ${bgColor};" data-ticket-id="${ticket.id}">
            <td><strong>#${ticket.id}</strong></td>
            <td>${escapeHtml(ticket.titulo)}</td>
            <td>${escapeHtml(ticket.nombre_usuario || "Desconocido")}</td>
            <td><span class="badge ${estadoClass}">${ticket.estado}</span></td>
            <td><span class="badge ${prioridadClass}">${ticket.prioridad.toUpperCase()}</span></td>
            <td>${escapeHtml(ticket.categoria || "-")}</td>
            <td class="text-center">${ticket.tiene_adjunto || "No"}</td>
            <td><small>⏱️ ${tiempoTexto}</small></td>
            <td><small>${formatDate(ticket.fecha_creacion)}</small></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewTicketDetail(${ticket.id})">
                    👁️ Ver
                </button>
            </td>
        </tr>
    `;
}

function sortTickets(column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "ASC" ? "DESC" : "ASC";
  } else {
    sortColumn = column;
    sortDirection = "ASC";
  }

  allTickets.sort((a, b) => {
    let valA = a[column];
    let valB = b[column];

    // Convertir a números si es ID o minutos
    if (column === "id" || column === "minutos_abierto") {
      valA = parseInt(valA) || 0;
      valB = parseInt(valB) || 0;
    }

    if (sortDirection === "ASC") {
      return valA > valB ? 1 : -1;
    } else {
      return valA < valB ? 1 : -1;
    }
  });

  renderTickets(allTickets);
}

async function aplicarFiltros() {
  const busqueda = document.getElementById("filtro_busqueda").value;
  const fecha_desde = document.getElementById("filtro_fecha_desde").value;
  const fecha_hasta = document.getElementById("filtro_fecha_hasta").value;
  const estado = document.getElementById("filtro_estado").value;
  const prioridad = document.getElementById("filtro_prioridad").value;
  const adjunto = document.getElementById("filtro_adjunto").value;

  const formData = new FormData();
  formData.append("action", "list_filtered");
  formData.append("busqueda", busqueda);
  formData.append("fecha_desde", fecha_desde);
  formData.append("fecha_hasta", fecha_hasta);
  formData.append("estado", estado);
  formData.append("prioridad", prioridad);
  formData.append("tiene_adjunto", adjunto);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      allTickets = data.tickets;
      renderTickets(allTickets);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function limpiarFiltros() {
  document.getElementById("filtro_busqueda").value = "";
  document.getElementById("filtro_fecha_desde").value = "";
  document.getElementById("filtro_fecha_hasta").value = "";
  document.getElementById("filtro_estado").value = "";
  document.getElementById("filtro_prioridad").value = "";
  document.getElementById("filtro_adjunto").value = "";
  loadTickets();
}

async function viewTicketDetail(ticketId) {
  currentTicketId = ticketId;

  try {
    const response = await fetch(
      `php/tickets_api.php?action=get&id=${ticketId}`,
    );
    const data = await response.json();

    if (data.success) {
      showTicketModal(data.ticket);
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión");
  }
}

async function showTicketModal(ticket) {
  const modalContent = document.getElementById("ticketDetailContent");

  const adjuntoHtml = ticket.archivo_adjunto
    ? `
        <div class="alert alert-info">
            📎 <strong>Archivo adjunto:</strong> 
            <a href="php/download_file.php?file=${ticket.archivo_adjunto}" class="btn btn-sm btn-primary ms-2">
                Descargar
            </a>
        </div>
    `
    : "";

  // Obtener lista de admins para asignar
  const responseAdmins = await fetch(
    "php/tickets_api.php?action=get_admin_users",
  );
  const dataAdmins = await responseAdmins.json();

  let adminsOptions = '<option value="">-- No asignado --</option>';
  if (dataAdmins.success) {
    dataAdmins.usuarios.forEach((u) => {
      const selected = ticket.id_asignado == u.id ? "selected" : "";
      adminsOptions += `<option value="${u.id}" ${selected}>${u.nombre} (${u.usuario})</option>`;
    });
  }

  const minutos = ticket.minutos_abierto || 0;
  const tiempoTexto =
    minutos < 60
      ? `${minutos} minutos`
      : `${Math.floor(minutos / 60)} horas ${minutos % 60} minutos`;

  modalContent.innerHTML = `
        <div class="mb-3">
            <h5>#${ticket.id} - ${escapeHtml(ticket.titulo)}</h5>
            <span class="badge bg-${ticket.estado === "Abierto" ? "primary" : ticket.estado === "Resuelto" ? "success" : "warning"}">
                ${ticket.estado}
            </span>
            <span class="badge bg-secondary ms-2">${ticket.prioridad.toUpperCase()}</span>
            <small class="text-muted ms-2">⏱️ Abierto hace: ${tiempoTexto}</small>
        </div>
        
        <div class="mb-3">
            <strong>Descripción:</strong>
            <p>${escapeHtml(ticket.descripcion)}</p>
        </div>
        
        ${adjuntoHtml}
        
        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Categoría:</strong> ${ticket.categoria || "-"}<br>
                <strong>Subcategoría:</strong> ${ticket.subcategoria || "-"}
            </div>
            <div class="col-md-6">
                <strong>Creado por:</strong> ${escapeHtml(ticket.nombre_usuario || "Desconocido")}<br>
                <strong>Email:</strong> ${escapeHtml(ticket.email_usuario || "-")}
            </div>
        </div>
        
        <div class="mb-3">
            <strong>Fecha:</strong> ${formatDate(ticket.fecha_creacion)}
        </div>
        
        <hr>
        
        <div class="row mb-3">
            <div class="col-md-4">
                <label class="form-label"><strong>Asignar a:</strong></label>
                <select class="form-select form-select-sm" onchange="asignarTicket(${ticket.id}, this.value)">
                    ${adminsOptions}
                </select>
            </div>
            
            <div class="col-md-4">
                <label class="form-label"><strong>Estado:</strong></label>
                <select class="form-select form-select-sm" onchange="updateTicketStatus(${ticket.id}, this.value)">
                    <option value="">--</option>
                    <option value="Abierto" ${ticket.estado === "Abierto" ? "selected" : ""}>Abierto</option>
                    <option value="En Proceso" ${ticket.estado === "En Proceso" ? "selected" : ""}>En Proceso</option>
                    <option value="Resuelto" ${ticket.estado === "Resuelto" ? "selected" : ""}>Resuelto</option>
                    <option value="Cerrado" ${ticket.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
                </select>
            </div>
            
            <div class="col-md-4">
                <label class="form-label"><strong>Prioridad:</strong></label>
                <select class="form-select form-select-sm" onchange="updateTicketPriority(${ticket.id}, this.value)">
                    <option value="">--</option>
                    <option value="baja" ${ticket.prioridad === "baja" ? "selected" : ""}>Baja</option>
                    <option value="media" ${ticket.prioridad === "media" ? "selected" : ""}>Media</option>
                    <option value="alta" ${ticket.prioridad === "alta" ? "selected" : ""}>Alta</option>
                    <option value="critica" ${ticket.prioridad === "critica" ? "selected" : ""}>Crítica</option>
                </select>
            </div>
        </div>
        
        <hr>
        
        <div class="mb-3">
            <label class="form-label"><strong>Adjuntar Archivo:</strong></label>
            <input type="file" id="ticketFile" class="form-control form-control-sm">
            <button class="btn btn-secondary btn-sm mt-2" onclick="uploadTicketFile(${ticket.id})">
                📤 Subir
            </button>
        </div>
        
        <hr>
        
        <div id="ticketCommentsSection">
            <div class="text-center">
                <div class="spinner-border spinner-border-sm"></div>
            </div>
        </div>
    `;

  const modal = new bootstrap.Modal(
    document.getElementById("ticketDetailModal"),
  );
  modal.show();

  loadTicketComments(ticket.id);
}

async function asignarTicket(ticketId, usuarioId) {
  if (!usuarioId) return;

  const formData = new FormData();
  formData.append("action", "assign");
  formData.append("ticket_id", ticketId);
  formData.append("usuario_asignado", usuarioId);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Ticket asignado");
      loadTickets();
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

async function updateTicketStatus(ticketId, newStatus) {
  if (!newStatus) return;

  const formData = new FormData();
  formData.append("action", "update_status");
  formData.append("ticket_id", ticketId);
  formData.append("estado", newStatus);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Estado actualizado");
      loadTickets();
      viewTicketDetail(ticketId);
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

async function updateTicketPriority(ticketId, newPriority) {
  if (!newPriority) return;

  const formData = new FormData();
  formData.append("action", "update_priority");
  formData.append("ticket_id", ticketId);
  formData.append("prioridad", newPriority);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Prioridad actualizada");
      loadTickets();
      viewTicketDetail(ticketId);
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

async function uploadTicketFile(ticketId) {
  const fileInput = document.getElementById("ticketFile");
  const file = fileInput.files[0];

  if (!file) {
    alert("Selecciona un archivo");
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    alert("Archivo muy grande. Máximo 50MB");
    return;
  }

  const formData = new FormData();
  formData.append("archivo", file);
  formData.append("ticket_id", ticketId);
  formData.append("tipo", "comentario");
  formData.append("mensaje", `Archivo adjunto: ${file.name}`);

  try {
    const response = await fetch("php/upload_file.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Archivo subido");
      fileInput.value = "";
      viewTicketDetail(ticketId);
      loadTickets();
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error al subir archivo");
  }
}

async function loadTicketComments(ticketId) {
  try {
    const response = await fetch(
      `php/tickets_api.php?action=get_comments&ticket_id=${ticketId}`,
    );
    const data = await response.json();

    const section = document.getElementById("ticketCommentsSection");

    if (data.success && data.comentarios.length > 0) {
      let html = "<h6>Comentarios:</h6>";
      data.comentarios.forEach((c) => {
        const adj = c.archivo_adjunto
          ? `<br><a href="php/download_file.php?file=${c.archivo_adjunto}" class="btn btn-sm btn-outline-primary mt-1">📎 Descargar</a>`
          : "";

        html += `
                    <div class="border-bottom pb-2 mb-2">
                        <small class="text-muted">${escapeHtml(c.nombre_usuario)} - ${formatDate(c.fecha_envio)}</small>
                        <p class="mb-0">${escapeHtml(c.mensaje)}${adj}</p>
                    </div>
                `;
      });

      html += `
                <div class="mt-3">
                    <textarea id="newComment" class="form-control mb-2" rows="3" placeholder="Comentario..."></textarea>
                    <input type="file" id="commentFile" class="form-control mb-2">
                    <button class="btn btn-primary btn-sm" onclick="addComment(${ticketId})">💬 Enviar</button>
                </div>
            `;

      section.innerHTML = html;
    } else {
      section.innerHTML = `
                <h6>Comentarios:</h6>
                <p class="text-muted">Sin comentarios</p>
                <div class="mt-3">
                    <textarea id="newComment" class="form-control mb-2" rows="3" placeholder="Comentario..."></textarea>
                    <input type="file" id="commentFile" class="form-control mb-2">
                    <button class="btn btn-primary btn-sm" onclick="addComment(${ticketId})">💬 Enviar</button>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function addComment(ticketId) {
  const mensaje = document.getElementById("newComment").value.trim();
  const fileInput = document.getElementById("commentFile");
  const file = fileInput.files[0];

  if (!mensaje && !file) {
    alert("Escribe un comentario o adjunta un archivo");
    return;
  }

  try {
    if (file) {
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("ticket_id", ticketId);
      formData.append("tipo", "comentario");
      formData.append("mensaje", mensaje || `Archivo: ${file.name}`);

      const response = await fetch("php/upload_file.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ Enviado");
        document.getElementById("newComment").value = "";
        fileInput.value = "";
        loadTicketComments(ticketId);
      }
    } else {
      const formData = new FormData();
      formData.append("action", "add_comment");
      formData.append("ticket_id", ticketId);
      formData.append("mensaje", mensaje);

      const response = await fetch("php/tickets_api.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        document.getElementById("newComment").value = "";
        loadTicketComments(ticketId);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión");
  }
}

// ==================== USUARIOS ====================

async function loadUsers() {
  const content = document.getElementById("content");
  content.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const response = await fetch("php/user_api.php?action=list");
    const data = await response.json();

    if (data.success) {
      allUsers = data.usuarios;
      renderUsers(allUsers);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function renderUsers(users) {
  const content = document.getElementById("content");
  const miRol = parseInt(
    document.documentElement.getAttribute("data-user-role") || "4",
  );

  let html = `
        <h4 class="mb-3">Usuarios (${users.length})</h4>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-light">
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;

  users.forEach((u) => {
    const badge = u.estado == 1 ? "bg-success" : "bg-secondary";
    const estado = u.estado == 1 ? "Activo" : "Inactivo";
    const puedeEditar = miRol <= 2 && u.id_rol_admin >= miRol;

    html += `
            <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.nombre_completo)}</td>
                <td><code>${escapeHtml(u.usuario)}</code></td>
                <td>${escapeHtml(u.email || "-")}</td>
                <td>${escapeHtml(u.rol)}</td>
                <td><span class="badge ${badge}">${estado}</span></td>
                <td>
                    ${puedeEditar ? `<button class="btn btn-sm btn-warning" onclick="editUser(${u.id})">Editar</button>` : "-"}
                </td>
            </tr>
        `;
  });

  html += "</tbody></table></div>";
  content.innerHTML = html;
}

// ==================== ESTADÍSTICAS ====================

async function loadStats() {
  const content = document.getElementById("content");
  content.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const response = await fetch("php/tickets_api.php?action=stats");
    const data = await response.json();

    if (data.success) {
      renderStats(data.stats);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function renderStats(s) {
  const content = document.getElementById("content");

  content.innerHTML = `
        <h4 class="mb-4">Estadísticas</h4>
        <div class="row g-3">
            <div class="col-md-2">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-primary">${s.total || 0}</h2>
                        <p class="text-muted mb-0">Total</p>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-info">${s.abiertos || 0}</h2>
                        <p class="text-muted mb-0">Abiertos</p>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-warning">${s.en_proceso || 0}</h2>
                        <p class="text-muted mb-0">En Proceso</p>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-success">${s.resueltos || 0}</h2>
                        <p class="text-muted mb-0">Resueltos</p>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-secondary">${s.cerrados || 0}</h2>
                        <p class="text-muted mb-0">Cerrados</p>
                    </div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="card text-center border-danger">
                    <div class="card-body">
                        <h2 class="text-danger">${(s.criticos || 0) + (s.altos || 0)}</h2>
                        <p class="text-muted mb-0">Urgentes</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== ACTUALIZACIÓN AUTOMÁTICA ====================

function startAutoUpdate() {
  // Actualizar cada 30 segundos
  updateInterval = setInterval(() => {
    if (currentView === "tickets" && allTickets.length > 0) {
      updateTicketTimes();
    }
  }, 30000); // 30 segundos
}

function updateTicketTimes() {
  allTickets.forEach((ticket) => {
    ticket.minutos_abierto = (ticket.minutos_abierto || 0) + 0.5; // 30 segundos
    ticket.urgencia_porcentaje = Math.min(
      100,
      (ticket.minutos_abierto / 60) * 100,
    );

    const row = document.querySelector(`tr[data-ticket-id="${ticket.id}"]`);
    if (row) {
      const urgencia = ticket.urgencia_porcentaje;
      let bgColor = "transparent";
      if (urgencia >= 100) bgColor = "#ffcccc";
      else if (urgencia >= 66) bgColor = "#ffe6cc";
      else if (urgencia >= 33) bgColor = "#fff9cc";

      row.style.backgroundColor = bgColor;

      // Actualizar tiempo
      const minutos = Math.floor(ticket.minutos_abierto);
      const tiempoTexto =
        minutos < 60
          ? `${minutos} min`
          : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;
      const tiempoCell = row.querySelector("td:nth-child(8)");
      if (tiempoCell) {
        tiempoCell.innerHTML = `<small>⏱️ ${tiempoTexto}</small>`;
      }
    }
  });
}

// ==================== UTILIDADES ====================

function formatDate(d) {
  if (!d) return "N/A";
  const date = new Date(d);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.toString().replace(/[&<>"']/g, (m) => map[m]);
}

// Limpiar intervalo al salir
window.addEventListener("beforeunload", () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
