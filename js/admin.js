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

function showView(view, event = null) {
  currentView = view;
  currentPage = 1;

  // DETENER intervalo anterior
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  currentView = view;
  currentPage = 1;

  // Quitar clases activas
  document.querySelectorAll(".btn-section").forEach((btn) => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
  });

  // Activar botón correcto
  if (event && event.currentTarget) {
    event.currentTarget.classList.remove("btn-secondary");
    event.currentTarget.classList.add("btn-primary");
  }

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="mt-3 text-muted">Cargando...</p>
    </div>
  `;

  if (view === "tickets") {
    loadTickets();
    startAutoUpdate();
  } else if (view === "create") {
    renderCreateTicketForm();
  } else if (view === "users") {
    loadUsers();
  } else if (view === "stats") {
    loadStats();
  }
}

// ==================== CREAR TICKET ====================

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
      const rolLabel = u.id_rol_admin <= 3 ? "Admin" : "Usuario";
      usuariosOptions += `<option value="${u.id}">${u.nombre_completo} (${rolLabel})</option>`;
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
                <h5 class="card-title mb-3">🔍 Filtros Avanzados</h5>
                <div class="row g-2">
                    <div class="col-md-3">
                        <label class="form-label small fw-bold">Buscar</label>
                        <input type="text" id="filtro_busqueda" class="form-control form-control-sm" placeholder="ID, usuario, email...">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold">Usuarios</label>
                        <select id="filtro_usuarios" class="form-select form-select-sm" multiple size="1">
                            ${usuariosOptions}
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small fw-bold">Desde</label>
                        <input type="date" id="filtro_fecha_desde" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small fw-bold">Hasta</label>
                        <input type="date" id="filtro_fecha_hasta" class="form-control form-control-sm">
                    </div>
                    <div class="col-md-2">
                        <label class="form-label small fw-bold">Estado</label>
                        <select id="filtro_estado" class="form-select form-select-sm">
                            <option value="">Todos</option>
                            <option value="Abierto">Abierto</option>
                            <option value="En Proceso">En Proceso</option>
                            <option value="Resuelto">Resuelto</option>
                            <option value="Cerrado">Cerrado</option>
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small fw-bold">Prioridad</label>
                        <select id="filtro_prioridad" class="form-select form-select-sm">
                            <option value="">Todas</option>
                            <option value="baja">Baja</option>
                            <option value="media">Media</option>
                            <option value="alta">Alta</option>
                            <option value="critica">Crítica</option>
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small fw-bold">Categoría</label>
                        <select id="filtro_categoria" class="form-select form-select-sm">
                            <option value="">Todas</option>
                            ${categoriasOptions}
                        </select>
                    </div>
                    <div class="col-md-1">
                        <label class="form-label small fw-bold">Adjunto</label>
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
                            ID ${sortColumn === "id" ? (sortDirection === "ASC" ? "▲" : "▼") : "▼"}
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
                        <th style="cursor:pointer" onclick="sortTickets('categoria')">
                            Categoría ${sortColumn === "categoria" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th>Adjunto</th>
                        <th style="cursor:pointer" onclick="sortTickets('respuestas')">
                            Respuestas ${sortColumn === "respuestas" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th style="cursor:pointer" onclick="sortTickets('minutos_abierto')">
                            Tiempo ${sortColumn === "minutos_abierto" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
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
  const tiempoTexto =
    minutos < 60
      ? `${Math.floor(minutos)} min`
      : `${Math.floor(minutos / 60)}h ${Math.floor(minutos % 60)}m`;
  const asignadoA = ticket.nombre_asignado
    ? `<span class="badge bg-info text-dark">${ticket.nombre_asignado}</span>`
    : '<span class="text-muted small">Sin asignar</span>';

  // CALCULAR NÚMERO CON REAPERTURAS
  let ticketNumero = ticket.id;
  if (ticket.numero_reapertura && parseInt(ticket.numero_reapertura) > 0) {
    const idOriginal = ticket.id_ticket_original || ticket.id;
    ticketNumero = `${idOriginal}-${ticket.numero_reapertura}`;
  }

  const badgeReabierto =
    ticket.numero_reapertura > 0
      ? '<span class="badge bg-warning text-dark ms-1">🔄</span>'
      : "";

  return `
    <tr data-ticket-id="${ticket.id}">
      <td><strong>#${ticketNumero}</strong>${badgeReabierto}</td>
      <td>${ticket.titulo}</td>
      <td><small>${ticket.nombre_usuario || "Desconocido"}</small></td>
      <td>${asignadoA}</td>
      <td><span class="badge ${estadoClass}">${ticket.estado}</span></td>
      <td><span class="badge ${prioridadClass}">${ticket.prioridad.toUpperCase()}</span></td>
      <td><small>${ticket.categoria || "-"}</small></td>
      <td class="text-center"><small>${ticket.tiene_adjunto || "No"}</small></td>
      <td class="text-center"><span class="badge bg-secondary">${ticket.respuestas || 0}</span></td>
      <td class="ticket-tiempo"><small>⏱️ ${tiempoTexto}</small></td>
      <td><small>${formatDate(ticket.fecha_creacion)}</small></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewTicketDetail(${ticket.id})">👁️ Ver</button>
      </td>
    </tr>
  `;
}

// Recargar tickets
renderTickets(allTickets);
console.log("✅ Tickets actualizados con formato de reaperturas");

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

    if (
      column === "id" ||
      column === "minutos_abierto" ||
      column === "respuestas"
    ) {
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

// Continúa en el siguiente mensaje...

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
      adminsOptions += `<option value="${u.id}" ${selected}>${u.nombre_completo}</option>`;
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
  console.log("🔄 Cargando usuarios...");
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="mt-3">Cargando usuarios...</p>
    </div>
  `;

  try {
    const response = await fetch("php/user_api.php?action=list");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log("✅ Respuesta API:", data);
    console.log("✅ Success:", data.success);
    console.log("✅ Usuarios recibidos:", data.usuarios?.length || 0);

    if (data.success && data.usuarios) {
      allUsers = data.usuarios;
      console.log("✅ allUsers actualizado:", allUsers.length);
      renderUsers(allUsers);
    } else {
      throw new Error(data.message || "No se recibieron usuarios");
    }
  } catch (error) {
    console.error("❌ Error en loadUsers:", error);
    content.innerHTML = `
      <div class="alert alert-danger">
        <h5>Error al cargar usuarios</h5>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="loadUsers()">
          <i class="bi bi-arrow-clockwise"></i> Reintentar
        </button>
      </div>
    `;
  }
}
function renderUsers(users) {
  console.log("🎨 Renderizando", users.length, "usuarios");

  const content = document.getElementById("content");

  if (!content) {
    console.error("❌ Elemento #content no encontrado");
    return;
  }

  if (!users || users.length === 0) {
    content.innerHTML = `
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i> No hay usuarios registrados
      </div>
    `;
    return;
  }

  let html = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Usuarios Registrados (${users.length})</h4>
      <button class="btn btn-success" onclick="showCreateUserModal()">
        <i class="bi bi-person-plus"></i> Nuevo Usuario
      </button>
    </div>
    
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>ID</th>
            <th>Nombre Completo</th>
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
    try {
      // Calcular valores
      const estadoBadge = u.estado == 1 ? "bg-success" : "bg-secondary";
      const estadoTexto = u.estado == 1 ? "Activo" : "Inactivo";

      let rolTexto = "Usuario";
      if (u.id_rol_admin == 1) rolTexto = "Super Admin";
      else if (u.id_rol_admin == 2) rolTexto = "Admin";
      else if (u.id_rol_admin == 3) rolTexto = "Técnico";

      const nombreCompleto =
        `${u.primer_nombre || ""} ${u.segundo_nombre || ""} ${u.primer_apellido || ""} ${u.segundo_apellido || ""}`.trim();
      const area = u.area || "-";

      html += `
        <tr style="border-bottom: 2px solid #dee2e6;">
          <td><strong>#${u.id}</strong></td>
          <td>${nombreCompleto}</td>
          <td><code>${u.usuario}</code></td>
          <td>${u.email || "-"}</td>
          <td>${u.telefono || "-"}</td>
          <td>${area}</td>
          <td><span class="badge bg-primary">${rolTexto}</span></td>
          <td><span class="badge ${estadoBadge}">${estadoTexto}</span></td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="editUser(${u.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            ${
              u.estado == 1
                ? `
              <button class="btn btn-sm btn-danger" onclick="toggleUserStatus(${u.id}, 0)" title="Desactivar">
                <i class="bi bi-x-circle"></i>
              </button>
            `
                : `
              <button class="btn btn-sm btn-success" onclick="toggleUserStatus(${u.id}, 1)" title="Activar">
                <i class="bi bi-check-circle"></i>
              </button>
            `
            }
          </td>
        </tr>
      `;
    } catch (err) {
      console.error("Error renderizando usuario:", u, err);
    }
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  content.innerHTML = html;
  console.log("✅ Tabla de usuarios renderizada correctamente");
}

async function editUser(userId) {
  try {
    await showEditUserModal(userId);
  } catch (error) {
    console.error("Error:", error);
  }
}

async function showEditUserModal(userId) {
  try {
    console.log("📝 Abriendo modal de edición para usuario:", userId);

    // Obtener datos del usuario
    const userResponse = await fetch(
      `php/user_api.php?action=get&id=${userId}`,
    );
    const userData = await userResponse.json();

    if (!userData.success) {
      alert("Error al cargar usuario: " + userData.message);
      return;
    }

    const user = userData.user;
    console.log("✅ Usuario cargado:", user);

    // Obtener áreas disponibles (con manejo de errores)
    let areas = [];
    try {
      const areasResponse = await fetch("php/user_api.php?action=get_areas");
      const areasData = await areasResponse.json();
      if (areasData.success && areasData.areas) {
        areas = areasData.areas;
        console.log("✅ Áreas cargadas:", areas.length);
      } else {
        console.warn("⚠️ No se pudieron cargar áreas");
      }
    } catch (error) {
      console.warn("⚠️ Error al cargar áreas:", error);
      areas = []; // Continuar sin áreas
    }

    // Obtener roles disponibles (con manejo de errores)
    let roles = [];
    try {
      const rolesResponse = await fetch("php/user_api.php?action=get_roles");
      const rolesData = await rolesResponse.json();
      if (rolesData.success && rolesData.roles) {
        roles = rolesData.roles;
        console.log("✅ Roles cargados:", roles.length);
      } else {
        console.warn("⚠️ No se pudieron cargar roles");
        // Roles por defecto si falla
        roles = [
          { id: 1, nombre: "Super Admin" },
          { id: 2, nombre: "Admin" },
          { id: 3, nombre: "Técnico" },
          { id: 4, nombre: "Usuario" },
        ];
      }
    } catch (error) {
      console.warn("⚠️ Error al cargar roles:", error);
      // Roles por defecto
      roles = [
        { id: 1, nombre: "Super Admin" },
        { id: 2, nombre: "Admin" },
        { id: 3, nombre: "Técnico" },
        { id: 4, nombre: "Usuario" },
      ];
    }

    // Crear opciones de áreas
    let areasOptions = '<option value="">Sin área asignada</option>';
    if (areas && areas.length > 0) {
      areasOptions += areas
        .map((area) => {
          const selected = user.id_area == area.id ? "selected" : "";
          return `<option value="${area.id}" ${selected}>${area.nombre}</option>`;
        })
        .join("");
    }

    // Crear opciones de roles
    let rolesOptions = "";
    if (roles && roles.length > 0) {
      rolesOptions = roles
        .map((rol) => {
          const selected = user.id_rol_admin == rol.id ? "selected" : "";
          return `<option value="${rol.id}" ${selected}>${rol.nombre}</option>`;
        })
        .join("");
    }

    // Crear el HTML del modal
    const modalHTML = `
            <div class="modal fade" id="editUserModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">✏️ Editar Usuario</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editUserForm">
                                <input type="hidden" name="id" value="${user.id}">
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Primer Nombre *</label>
                                        <input type="text" class="form-control" name="primer_nombre" 
                                               value="${user.primer_nombre || ""}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Segundo Nombre</label>
                                        <input type="text" class="form-control" name="segundo_nombre" 
                                               value="${user.segundo_nombre || ""}">
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Primer Apellido *</label>
                                        <input type="text" class="form-control" name="primer_apellido" 
                                               value="${user.primer_apellido || ""}" required>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Segundo Apellido</label>
                                        <input type="text" class="form-control" name="segundo_apellido" 
                                               value="${user.segundo_apellido || ""}">
                                    </div>
                                </div>
                                
                                <div class="row">
                                <div class="col-md-6 mb-3">
    <label class="form-label">Usuario *</label>
    <input type="text" class="form-control" value="${user.usuario}" disabled>
    <input type="hidden" name="usuario" value="${user.usuario}">
    <small class="text-muted">El usuario no se puede cambiar</small>
</div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Email *</label>
                                        <input type="email" class="form-control" name="email" 
                                               value="${user.email || ""}" required>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Teléfono</label>
                                        <input type="tel" class="form-control" name="telefono" 
                                               value="${user.telefono || ""}">
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Área</label>
                                        <select class="form-select" name="id_area">
                                            ${areasOptions}
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Rol *</label>
                                        <select class="form-select" name="id_rol_admin" required>
                                            ${rolesOptions}
                                        </select>
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Estado *</label>
                                        <select class="form-select" name="estado" required>
                                            <option value="1" ${user.estado == 1 ? "selected" : ""}>Activo</option>
                                            <option value="0" ${user.estado == 0 ? "selected" : ""}>Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Nueva Contraseña</label>
                                    <input type="password" class="form-control" name="password" id="newPassword"
                                           placeholder="Dejar en blanco para no cambiar" autocomplete="new-password">
                                    <small class="text-muted">Solo completar si desea cambiar la contraseña (mínimo 6 caracteres)</small>
                                </div>
                                
                                <hr>
                                
                                <!-- Contenedor para historial de accesos -->
                                <div id="historialAccesosContainer"></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle"></i> Cancelar
                            </button>
                            <button type="button" class="btn btn-primary" onclick="submitEditUserForm()">
                                <i class="bi bi-save"></i> Guardar Cambios
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Eliminar modal existente si existe
    const existingModal = document.getElementById("editUserModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Agregar modal al DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
    modal.show();

    // Cargar historial de accesos si la función existe
    setTimeout(() => {
      if (typeof mostrarHistorialAccesos === "function") {
        mostrarHistorialAccesos(userId, "historialAccesosContainer");
      }
    }, 500);

    console.log("✅ Modal mostrado correctamente");
  } catch (error) {
    console.error("❌ Error en showEditUserModal:", error);
    alert("Error al cargar el formulario de edición: " + error.message);
  }
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

    if (data.success == true) {
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
        
        <div class="row g-3 mb-4">
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
        
        <div class="row g-3">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Distribución por Estado</h5>
                        <canvas id="chartEstados"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Distribución por Prioridad</h5>
                        <canvas id="chartPrioridades"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Crear gráficos
  setTimeout(() => {
    createCharts(s);
  }, 100);

  // Agregar dashboard NPS al finals
  if (typeof loadNPSStats === "function") {
    setTimeout(() => {
      if (!document.getElementById("nps-dashboard-container")) {
        const npsDiv = document.createElement("div");
        npsDiv.id = "nps-dashboard-container";
        content.appendChild(npsDiv);
      }
      loadNPSStats();
    }, 500);
  }
}

function createCharts(stats) {
  // Gráfico de Estados
  const ctxEstados = document.getElementById("chartEstados");
  if (ctxEstados) {
    new Chart(ctxEstados, {
      type: "pie",
      data: {
        labels: ["Abiertos", "En Proceso", "Resueltos", "Cerrados"],
        datasets: [
          {
            data: [
              stats.abiertos || 0,
              stats.en_proceso || 0,
              stats.resueltos || 0,
              stats.cerrados || 0,
            ],
            backgroundColor: ["#0d6efd", "#ffc107", "#198754", "#6c757d"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  // Gráfico de Prioridades
  const ctxPrioridades = document.getElementById("chartPrioridades");
  if (ctxPrioridades) {
    new Chart(ctxPrioridades, {
      type: "bar",
      data: {
        labels: ["Baja", "Media", "Alta", "Crítica"],
        datasets: [
          {
            label: "Tickets",
            data: [
              stats.bajos || 0,
              stats.medios || 0,
              stats.altos || 0,
              stats.criticos || 0,
            ],
            backgroundColor: ["#0dcaf0", "#ffc107", "#fd7e14", "#dc3545"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }
}

// ==================== ACTUALIZACIÓN EN TIEMPO REAL ====================

function startAutoUpdate() {
  updateInterval = setInterval(() => {
    // SOLO ejecutar si realmente estamos viendo tickets
    if (
      currentView === "tickets" &&
      document.getElementById("ticketsTableBody")
    ) {
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

function submitEditUserForm() {
  const form = document.getElementById("editUserForm");
  const formData = new FormData(form);
  formData.append("action", "update");

  console.log("📤 Datos a enviar:");
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  fetch("php/user_api.php", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("📥 Respuesta:", data);

      if (data.success) {
        alert("✅ Usuario actualizado correctamente");
        bootstrap.Modal.getInstance(
          document.getElementById("editUserModal"),
        ).hide();
        loadUsers();
      } else {
        alert("❌ Error: " + data.message);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      alert("❌ Error de conexión");
    });
}

function insertarBotonesNPSEnTabla() {
  console.log("🔄 Insertando botones NPS en tickets cerrados...");

  if (!allTickets || allTickets.length === 0) {
    console.log("❌ No hay tickets cargados");
    return;
  }

  const tabla = document.querySelector("table tbody");
  if (!tabla) {
    console.log("❌ Tabla no encontrada");
    return;
  }

  const filas = tabla.querySelectorAll("tr");
  let botones_agregados = 0;

  filas.forEach((fila, index) => {
    const ticket = allTickets[index];
    if (!ticket) return;

    // Solo tickets cerrados o resueltos
    if (ticket.estado !== "Cerrado" && ticket.estado !== "Resuelto") return;

    const celdaAcciones = fila.cells[11]; // Columna "Acciones"
    if (!celdaAcciones) return;

    // Verificar si ya tiene botones NPS
    if (celdaAcciones.querySelector(".btn-nps-calificar")) return;

    // Crear botones
    const botonesHTML = `
      <div class="d-flex gap-1 mt-1 botones-nps">
        <button class="btn btn-sm btn-warning btn-nps-calificar" 
                onclick="verificarYCalificar(${ticket.id}, '${ticket.titulo.replace(/'/g, "\\'")}')">
          <i class="bi bi-star-fill"></i> Calificar
        </button>
        <button class="btn btn-sm btn-info btn-nps-reabrir" 
                onclick="mostrarModalReapertura(${ticket.id}, '${ticket.titulo.replace(/'/g, "\\'")}')">
          <i class="bi bi-arrow-clockwise"></i> Reabrir
        </button>
      </div>
    `;

    celdaAcciones.insertAdjacentHTML("beforeend", botonesHTML);
    botones_agregados++;
  });

  console.log(
    `✅ Botones NPS agregados a ${botones_agregados} tickets cerrados`,
  );
}

// ==================== VERIFICAR Y CALIFICAR ====================

async function verificarYCalificar(idTicket, titulo) {
  try {
    const response = await fetch(
      `php/calificaciones_api.php?action=puede_calificar&id_ticket=${idTicket}`,
    );
    const data = await response.json();

    if (data.success && data.puede_calificar) {
      if (typeof mostrarModalCalificacion === "function") {
        mostrarModalCalificacion(idTicket, titulo);
      } else {
        alert("El módulo de calificaciones no está disponible");
      }
    } else {
      alert(
        data.motivo || "Este ticket ya fue calificado o no puedes calificarlo",
      );
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al verificar calificación");
  }
}

// ==================== INTERCEPTAR RENDER DE TICKETS ====================

// Guardar función original
if (typeof renderTickets === "function") {
  const originalRenderTickets = window.renderTickets;

  window.renderTickets = function () {
    // Llamar función original
    originalRenderTickets.apply(this, arguments);

    // Agregar botones NPS después de renderizar
    setTimeout(() => {
      insertarBotonesNPSEnTabla();
    }, 100);
  };

  console.log("✅ Hook de renderTickets instalado para botones NPS");
}

// ==================== INTERCEPTAR CARGA DE TICKETS ====================

// También interceptar loadTickets para asegurar que se ejecute
if (typeof loadTickets === "function") {
  const originalLoadTickets = window.loadTickets;

  window.loadTickets = async function () {
    await originalLoadTickets.apply(this, arguments);

    // Agregar botones después de cargar
    setTimeout(() => {
      insertarBotonesNPSEnTabla();
    }, 200);
  };

  console.log("✅ Hook de loadTickets instalado para botones NPS");
}

// ==================== EXPORTAR FUNCIONES ====================

window.insertarBotonesNPSEnTabla = insertarBotonesNPSEnTabla;
window.verificarYCalificar = verificarYCalificar;

// ==================== AUTO-INICIALIZACIÓN ====================

// Agregar botones cuando se carga la página
document.addEventListener("DOMContentLoaded", function () {
  // Esperar 2 segundos para que todo cargue
  setTimeout(() => {
    if (allTickets && allTickets.length > 0) {
      insertarBotonesNPSEnTabla();
    }
  }, 2000);
});

// También ejecutar cuando cambia la vista a tickets
window.addEventListener("viewChanged", function (event) {
  if (event.detail === "tickets") {
    setTimeout(() => {
      insertarBotonesNPSEnTabla();
    }, 500);
  }
});

console.log("✅ Módulo de botones NPS cargado y listo");
