// admin.js - VERSIÓN ULTRA FINAL
// Incluye: Columna Asignado, Navegación con botones, Corrección errores

let currentView = "tickets";
let allTickets = [];
let allUsers = [];
let currentTicketId = null;
let sortColumn = "fecha_creacion";
let sortDirection = "DESC";
let updateInterval = null;
let currentPage = 1;
let ticketsPerPage = 20;

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
  currentPage = 1; // Reset página al cambiar vista

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
  } else if (view === "create") {
    renderCreateTicketForm();
  } else if (view === "users") {
    loadUsers();
  } else if (view === "stats") {
    loadStats();
  }
}

// ==================== CREAR TICKET (ADMIN) ====================

async function renderCreateTicketForm() {
  const content = document.getElementById("content");

  const response = await fetch("php/tickets_api.php?action=get_categories");
  const data = await response.json();

  let categoriasOptions = '<option value="">-- Seleccionar --</option>';
  if (data.success) {
    data.categorias.forEach((c) => {
      categoriasOptions += `<option value="${c.nombre}">${c.nombre}</option>`;
    });
  }

  content.innerHTML = `
        <h4>Crear Nuevo Ticket</h4>
        <div class="card">
            <div class="card-body">
                <form id="createTicketForm" onsubmit="createTicketAdmin(event)">
                    <div class="mb-3">
                        <label class="form-label">Título *</label>
                        <input type="text" class="form-control" name="titulo" required>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Descripción *</label>
                        <textarea class="form-control" name="descripcion" rows="5" required></textarea>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Categoría *</label>
                                <select class="form-select" name="categoria" id="categoriaAdmin" onchange="loadSubcategoriasAdmin()" required>
                                    ${categoriasOptions}
                                </select>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Subcategoría</label>
                                <select class="form-select" name="subcategoria" id="subcategoriaAdmin">
                                    <option value="">-- Primero selecciona categoría --</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Prioridad</label>
                                <select class="form-select" name="prioridad">
                                    <option value="baja">Baja</option>
                                    <option value="media" selected>Media</option>
                                    <option value="alta">Alta</option>
                                    <option value="critica">Crítica</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Adjuntar Archivo (Opcional)</label>
                        <input type="file" class="form-control" id="ticketFileAdmin">
                        <small class="text-muted">Tamaño máximo: 50MB</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">📤 Crear Ticket</button>
                    <button type="button" class="btn btn-secondary" onclick="showView('tickets', null)">Cancelar</button>
                </form>
            </div>
        </div>
    `;
}

async function loadSubcategoriasAdmin() {
  const categoriaSelect = document.getElementById("categoriaAdmin");
  const subcategoriaSelect = document.getElementById("subcategoriaAdmin");
  const categoriaNombre = categoriaSelect.value;

  if (!categoriaNombre) {
    subcategoriaSelect.innerHTML =
      '<option value="">-- Primero selecciona categoría --</option>';
    return;
  }

  try {
    const response = await fetch("php/tickets_api.php?action=get_categories");
    const data = await response.json();

    let categoriaId = null;
    if (data.success) {
      const cat = data.categorias.find((c) => c.nombre === categoriaNombre);
      if (cat) categoriaId = cat.id;
    }

    if (!categoriaId) return;

    const response2 = await fetch(
      `php/tickets_api.php?action=get_subcategories&id_categoria=${categoriaId}`,
    );
    const data2 = await response2.json();

    let options = '<option value="">-- Ninguna --</option>';
    if (data2.success) {
      data2.subcategorias.forEach((s) => {
        options += `<option value="${s.nombre}">${s.nombre}</option>`;
      });
    }

    subcategoriaSelect.innerHTML = options;
  } catch (error) {
    console.error("Error:", error);
  }
}

async function createTicketAdmin(e) {
  e.preventDefault();

  const form = e.target;
  const titulo = form.titulo.value;
  const descripcion = form.descripcion.value;
  const categoria = form.categoria.value;
  const subcategoria = form.subcategoria.value;
  const prioridad = form.prioridad.value;
  const fileInput = document.getElementById("ticketFileAdmin");
  const file = fileInput.files[0];

  try {
    const formData = new FormData();
    formData.append("action", "create");
    formData.append("titulo", titulo);
    formData.append("descripcion", descripcion);
    formData.append("categoria", categoria);
    formData.append("subcategoria", subcategoria);
    formData.append("prioridad", prioridad);

    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      const ticketId = data.ticket_id;

      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          alert("⚠️ Ticket creado, pero el archivo es muy grande (máx 50MB)");
          showView("tickets", null);
          return;
        }

        const fileFormData = new FormData();
        fileFormData.append("archivo", file);
        fileFormData.append("ticket_id", ticketId);
        fileFormData.append("tipo", "ticket");

        await fetch("php/upload_file.php", {
          method: "POST",
          body: fileFormData,
        });
      }

      alert("✅ Ticket creado exitosamente");
      showView("tickets", null);
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
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

async function renderTickets(tickets) {
  const content = document.getElementById("content");

  const responseUsers = await fetch("php/user_api.php?action=list");
  const dataUsers = await responseUsers.json();

  let usuariosOptions = "";
  if (dataUsers.success) {
    dataUsers.usuarios.forEach((u) => {
      usuariosOptions += `<option value="${u.id}">${u.nombre_completo}</option>`;
    });
  }

  const responseCat = await fetch("php/tickets_api.php?action=get_categories");
  const dataCat = await responseCat.json();

  let categoriasOptions = "";
  if (dataCat.success) {
    dataCat.categorias.forEach((c) => {
      categoriasOptions += `<option value="${c.nombre}">${c.nombre}</option>`;
    });
  }

  const totalPages = Math.ceil(tickets.length / ticketsPerPage);
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const endIndex = startIndex + ticketsPerPage;
  const ticketsToShow = tickets.slice(startIndex, endIndex);

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
                        <label class="form-label small">Usuarios</label>
                        <select id="filtro_usuarios" class="form-select form-select-sm" multiple size="1">
                            ${usuariosOptions}
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small">Desde</label>
                        <input type="date" id="filtro_fecha_desde" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small">Hasta</label>
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
                    <div class="col-md-1">
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
                        <label class="form-label small">Categoría</label>
                        <select id="filtro_categoria" class="form-select form-select-sm">
                            <option value="">Todas</option>
                            ${categoriasOptions}
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small">Adjunto</label>
                        <select id="filtro_adjunto" class="form-select form-select-sm">
                            <option value="">Todos</option>
                            <option value="Sí">Sí</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-md-12">
                        <button class="btn btn-primary btn-sm" onclick="aplicarFiltros()">🔍 Filtrar</button>
                        <button class="btn btn-secondary btn-sm" onclick="limpiarFiltros()">🔄 Limpiar</button>
                        <button class="btn btn-success btn-sm" onclick="exportarExcel()">📥 Exportar Excel</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>Gestión de Tickets (${tickets.length})</h4>
            <div class="d-flex gap-2 align-items-center">
                <small class="text-muted">Mostrando ${startIndex + 1}-${Math.min(endIndex, tickets.length)} de ${tickets.length}</small>
                <button class="btn btn-sm btn-outline-primary" onclick="previousPage()" ${currentPage === 1 ? "disabled" : ""}>
                    ◀ Anterior
                </button>
                <span class="badge bg-primary">${currentPage} / ${totalPages}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""}>
                    Siguiente ▶
                </button>
            </div>
        </div>
        
        <div class="table-responsive">
            <table class="table table-hover table-sm">
                <thead class="table-light">
                    <tr>
                        <th style="cursor:pointer" onclick="sortTickets('id')">
                            ID ${sortColumn === "id" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th style="cursor:pointer" onclick="sortTickets('titulo')">
                            Título ${sortColumn === "titulo" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th>Usuario</th>
                        <th>Asignado A</th>
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

  ticketsToShow.forEach((ticket) => {
    html += renderTicketRow(ticket);
  });

  html += "</tbody></table></div>";

  if (totalPages > 1) {
    html += `
            <div class="d-flex justify-content-center align-items-center gap-2 mt-3">
                <button class="btn btn-sm btn-outline-primary" onclick="previousPage()" ${currentPage === 1 ? "disabled" : ""}>
                    ◀ Anterior
                </button>
                <span>Página ${currentPage} de ${totalPages}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""}>
                    Siguiente ▶
                </button>
            </div>
        `;
  }

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

  const minutos = ticket.minutos_abierto || 0;
  const urgencia = Math.min(100, (minutos / 60) * 100);

  let bgColor = "#ffffff";
  if (urgencia >= 100) {
    bgColor = "#ffcccc";
  } else if (urgencia >= 66) {
    bgColor = "#ffe6cc";
  } else if (urgencia >= 33) {
    bgColor = "#fff9cc";
  }

  const tiempoTexto =
    minutos < 60
      ? `${Math.floor(minutos)} min`
      : `${Math.floor(minutos / 60)}h ${Math.floor(minutos % 60)}m`;

  const asignadoA = ticket.nombre_asignado
    ? `<span class="badge bg-info text-dark">${escapeHtml(ticket.nombre_asignado)}</span>`
    : '<span class="text-muted small">Sin asignar</span>';

  return `
        <tr style="background-color: ${bgColor}; transition: background-color 0.3s;" data-ticket-id="${ticket.id}" data-minutos="${minutos}">
            <td><strong>#${ticket.id}</strong></td>
            <td>${escapeHtml(ticket.titulo)}</td>
            <td><small>${escapeHtml(ticket.nombre_usuario || "Desconocido")}</small></td>
            <td>${asignadoA}</td>
            <td><span class="badge ${estadoClass}">${ticket.estado}</span></td>
            <td><span class="badge ${prioridadClass}">${ticket.prioridad.toUpperCase()}</span></td>
            <td><small>${escapeHtml(ticket.categoria || "-")}</small></td>
            <td class="text-center"><small>${ticket.tiene_adjunto || "No"}</small></td>
            <td class="ticket-tiempo"><small>⏱️ ${tiempoTexto}</small></td>
            <td><small>${formatDate(ticket.fecha_creacion)}</small></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewTicketDetail(${ticket.id})">👁️</button>
            </td>
        </tr>
    `;
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTickets(allTickets);
    window.scrollTo(0, 0);
  }
}

function nextPage() {
  const totalPages = Math.ceil(allTickets.length / ticketsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTickets(allTickets);
    window.scrollTo(0, 0);
  }
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
  const usuariosSelect = document.getElementById("filtro_usuarios");
  const usuarios = Array.from(usuariosSelect.selectedOptions).map(
    (opt) => opt.value,
  );
  const fecha_desde = document.getElementById("filtro_fecha_desde").value;
  const fecha_hasta = document.getElementById("filtro_fecha_hasta").value;
  const estado = document.getElementById("filtro_estado").value;
  const prioridad = document.getElementById("filtro_prioridad").value;
  const categoria = document.getElementById("filtro_categoria").value;
  const adjunto = document.getElementById("filtro_adjunto").value;

  const formData = new FormData();
  formData.append("action", "list_filtered");
  formData.append("busqueda", busqueda);
  usuarios.forEach((u) => formData.append("usuarios[]", u));
  formData.append("fecha_desde", fecha_desde);
  formData.append("fecha_hasta", fecha_hasta);
  formData.append("estado", estado);
  formData.append("prioridad", prioridad);
  formData.append("categoria", categoria);
  formData.append("tiene_adjunto", adjunto);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      allTickets = data.tickets;
      currentPage = 1;
      renderTickets(allTickets);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function limpiarFiltros() {
  document.getElementById("filtro_busqueda").value = "";
  document.getElementById("filtro_usuarios").selectedIndex = -1;
  document.getElementById("filtro_fecha_desde").value = "";
  document.getElementById("filtro_fecha_hasta").value = "";
  document.getElementById("filtro_estado").value = "";
  document.getElementById("filtro_prioridad").value = "";
  document.getElementById("filtro_categoria").value = "";
  document.getElementById("filtro_adjunto").value = "";
  currentPage = 1;
  loadTickets();
}

async function exportarExcel() {
  const fecha_desde = document.getElementById("filtro_fecha_desde").value;
  const fecha_hasta = document.getElementById("filtro_fecha_hasta").value;
  const estado = document.getElementById("filtro_estado").value;
  const prioridad = document.getElementById("filtro_prioridad").value;
  const categoria = document.getElementById("filtro_categoria").value;

  const params = new URLSearchParams({
    fecha_desde,
    fecha_hasta,
    estado,
    prioridad,
    categoria,
  });

  window.open(`php/exportar_excel.php?${params.toString()}`, "_blank");
}

// Continúa en siguiente mensaje debido al límite...

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

  const responseAdmins = await fetch(
    "php/tickets_api.php?action=get_admin_users",
  );
  const dataAdmins = await responseAdmins.json();

  let adminsOptions = '<option value="">-- No asignado --</option>';
  if (dataAdmins.success) {
    dataAdmins.usuarios.forEach((u) => {
      const selected = ticket.id_asignado == u.id ? "selected" : "";
      adminsOptions += `<option value="${u.id}" ${selected}>${u.nombre}</option>`;
    });
  }

  const minutos = ticket.minutos_abierto || 0;
  const tiempoTexto =
    minutos < 60
      ? `${Math.floor(minutos)} minutos`
      : `${Math.floor(minutos / 60)} horas ${Math.floor(minutos % 60)} minutos`;

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
            <div class="col-md-6">
                <label class="form-label"><strong>Asignar a:</strong></label>
                <select class="form-select form-select-sm" onchange="asignarTicket(${ticket.id}, this.value)">
                    ${adminsOptions}
                </select>
            </div>
            
            <div class="col-md-3">
                <label class="form-label"><strong>Cambiar Estado:</strong></label>
                <select class="form-select form-select-sm" onchange="updateTicketStatus(${ticket.id}, this.value)">
                    <option value="">--</option>
                    <option value="Abierto" ${ticket.estado === "Abierto" ? "selected" : ""}>Abierto</option>
                    <option value="En Proceso" ${ticket.estado === "En Proceso" ? "selected" : ""}>En Proceso</option>
                    <option value="Resuelto" ${ticket.estado === "Resuelto" ? "selected" : ""}>Resuelto</option>
                    <option value="Cerrado" ${ticket.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
                </select>
            </div>
            
            <div class="col-md-3">
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
            <button class="btn btn-secondary btn-sm mt-2" onclick="uploadTicketFile(${ticket.id})">📤 Subir</button>
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
                        <th>Teléfono</th>
                        <th>Área</th>
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

    html += `
            <tr>
                <td>${u.id}</td>
                <td>${escapeHtml(u.nombre_completo)}</td>
                <td><code>${escapeHtml(u.usuario)}</code></td>
                <td>${escapeHtml(u.email || "-")}</td>
                <td>${escapeHtml(u.telefono || "-")}</td>
                <td>${escapeHtml(u.area || "-")}</td>
                <td>${escapeHtml(u.rol_legible)}</td>
                <td><span class="badge ${badge}">${estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})">✏️ Editar</button>
                </td>
            </tr>
        `;
  });

  html += "</tbody></table></div>";
  content.innerHTML = html;
}

async function editUser(userId) {
  try {
    const response = await fetch(`php/user_api.php?action=get&id=${userId}`);
    const data = await response.json();

    if (data.success) {
      showEditUserModal(data.user);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function showEditUserModal(user) {
  const responseAreas = await fetch("php/user_api.php?action=get_areas");
  const dataAreas = await responseAreas.json();

  let areasOptions = '<option value="">-- Sin área --</option>';
  if (dataAreas.success) {
    dataAreas.areas.forEach((a) => {
      const selected = user.id_area == a.id ? "selected" : "";
      areasOptions += `<option value="${a.id}" ${selected}>${a.nombre}</option>`;
    });
  }

  const modalBody = document.getElementById("editUserModalBody");

  modalBody.innerHTML = `
        <form id="editUserForm" onsubmit="saveUserEdit(event, ${user.id})">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Primer Nombre *</label>
                        <input type="text" class="form-control" name="primer_nombre" value="${escapeHtml(user.primer_nombre)}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Segundo Nombre</label>
                        <input type="text" class="form-control" name="segundo_nombre" value="${escapeHtml(user.segundo_nombre || "")}">
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Primer Apellido *</label>
                        <input type="text" class="form-control" name="primer_apellido" value="${escapeHtml(user.primer_apellido)}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Segundo Apellido</label>
                        <input type="text" class="form-control" name="segundo_apellido" value="${escapeHtml(user.segundo_apellido || "")}">
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Email *</label>
                        <input type="email" class="form-control" name="email" value="${escapeHtml(user.email || "")}" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label">Teléfono</label>
                        <input type="text" class="form-control" name="telefono" value="${escapeHtml(user.telefono || "")}">
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="mb-3">
                        <label class="form-label">Área</label>
                        <select class="form-select" name="id_area">
                            ${areasOptions}
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-3">
                        <label class="form-label">Estado</label>
                        <select class="form-select" name="estado">
                            <option value="1" ${user.estado == 1 ? "selected" : ""}>Activo</option>
                            <option value="0" ${user.estado == 0 ? "selected" : ""}>Inactivo</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="mb-3">
                        <label class="form-label">Rol</label>
                        <select class="form-select" name="id_rol_admin">
                            <option value="1" ${user.id_rol_admin == 1 ? "selected" : ""}>Admin Superior</option>
                            <option value="2" ${user.id_rol_admin == 2 ? "selected" : ""}>Admin Intermedio</option>
                            <option value="3" ${user.id_rol_admin == 3 ? "selected" : ""}>Técnico</option>
                            <option value="4" ${user.id_rol_admin == 4 ? "selected" : ""}>Usuario</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Nueva Contraseña (dejar vacío para no cambiar)</label>
                <input type="password" class="form-control" name="password" autocomplete="new-password">
            </div>
            
            <button type="submit" class="btn btn-primary">💾 Guardar Cambios</button>
        </form>
    `;

  const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
  modal.show();
}

async function saveUserEdit(e, userId) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  formData.append("action", "update");
  formData.append("id", userId);

  try {
    const response = await fetch("php/user_api.php", {
      method: "POST",
      body: formData,
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing JSON:", text);
      alert("❌ Error: Respuesta inválida del servidor");
      return;
    }

    if (data.success) {
      alert("✅ Usuario actualizado correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("editUserModal"),
      ).hide();
      loadUsers();
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
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
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4>Estadísticas del Sistema</h4>
            <button class="btn btn-success" onclick="exportarExcel()">📥 Descargar Reporte Excel</button>
        </div>
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

// ==================== ACTUALIZACIÓN EN TIEMPO REAL ====================

function startAutoUpdate() {
  updateInterval = setInterval(() => {
    if (currentView === "tickets") {
      updateTicketTimesRealTime();
    }
  }, 1000);
}

function updateTicketTimesRealTime() {
  const rows = document.querySelectorAll(
    "#ticketsTableBody tr[data-ticket-id]",
  );

  rows.forEach((row) => {
    const ticketId = row.getAttribute("data-ticket-id");
    const minutosActual = parseFloat(row.getAttribute("data-minutos") || 0);
    const nuevosMinutos = minutosActual + 1 / 60;

    row.setAttribute("data-minutos", nuevosMinutos);

    const urgencia = Math.min(100, (nuevosMinutos / 60) * 100);

    let bgColor = "#ffffff";
    if (urgencia >= 100) {
      bgColor = "#ffcccc";
    } else if (urgencia >= 66) {
      bgColor = "#ffe6cc";
    } else if (urgencia >= 33) {
      bgColor = "#fff9cc";
    }

    row.style.backgroundColor = bgColor;

    const minutos = Math.floor(nuevosMinutos);
    const tiempoTexto =
      minutos < 60
        ? `${minutos} min`
        : `${Math.floor(minutos / 60)}h ${Math.floor(minutos % 60)}m`;

    const tiempoCell = row.querySelector(".ticket-tiempo");
    if (tiempoCell) {
      tiempoCell.innerHTML = `<small>⏱️ ${tiempoTexto}</small>`;
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

window.addEventListener("beforeunload", () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
