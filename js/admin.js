let currentView = "tickets";
let allTickets = [];
let allUsers = [];
let currentTicketId = null;
let sortColumn = "fecha_creacion";
let sortDirection = "DESC";
let updateInterval = null;
let currentPage = 1;
let ticketsPerPage = 20;
let sortColumnUsers = "id";
let sortDirectionUsers = "ASC";
let userPermissions = {
  rol: 4,
  area: null,
  canEditMessages: false,
  canDeleteFiles: false,
  canChangeArea: false,
  canReopenTickets: false,
};
async function loadUserPermissions() {
  try {
    const response = await fetch("php/user_api.php?action=me");
    const data = await response.json();

    if (data.success) {
      const user = data.user;
      userPermissions.rol = parseInt(user.id_rol_admin) || 4;
      userPermissions.area = user.id_area || null;
      userPermissions.canEditMessages = userPermissions.rol === 1;
      userPermissions.canDeleteFiles = userPermissions.rol === 1;
      userPermissions.canChangeArea = userPermissions.rol <= 2;
      userPermissions.canReopenTickets = userPermissions.rol <= 2;

      sessionStorage.setItem("id_rol_admin", userPermissions.rol);
      sessionStorage.setItem("user_id", user.id);

      console.log("✅ Permisos cargados:", userPermissions);
    }
  } catch (error) {
    console.error("Error al cargar permisos:", error);
  }
}

function canCloseTicket(ticket) {
  const rol = userPermissions.rol;
  const userId = parseInt(sessionStorage.getItem("user_id"));
  if (rol === 1 || rol === 2) return true;
  if (rol === 3) return ticket.id_asignado === userId;
  return false;
}

function canAssignTicket(ticket) {
  const rol = userPermissions.rol;
  const userId = parseInt(sessionStorage.getItem("user_id"));
  if (rol === 1 || rol === 2) return true;
  if (rol === 3) return ticket.id_asignado === userId;
  return false;
}

function canSendMessages(ticket) {
  const rol = userPermissions.rol;
  const userId = parseInt(sessionStorage.getItem("user_id"));
  if (rol === 1 || rol === 2) return true;
  if (rol === 3) return ticket.id_asignado === userId;
  if (rol === 4) return ticket.id_usuario === userId;
  return false;
}

window.sortColumnUsers = "id";
window.sortDirectionUsers = "ASC";

window.sortUsers = function (column) {
  if (window.sortColumnUsers === column) {
    window.sortDirectionUsers =
      window.sortDirectionUsers === "ASC" ? "DESC" : "ASC";
  } else {
    window.sortColumnUsers = column;
    window.sortDirectionUsers = "ASC";
  }
  allUsers.sort((a, b) => {
    let valA, valB;
    if (column === "nombre_completo") {
      valA =
        `${a.primer_nombre || ""} ${a.segundo_nombre || ""} ${a.primer_apellido || ""} ${a.segundo_apellido || ""}`
          .trim()
          .toLowerCase();
      valB =
        `${b.primer_nombre || ""} ${b.segundo_nombre || ""} ${b.primer_apellido || ""} ${b.segundo_apellido || ""}`
          .trim()
          .toLowerCase();
    } else if (
      column === "id" ||
      column === "id_rol_admin" ||
      column === "estado"
    ) {
      valA = parseInt(a[column]) || 0;
      valB = parseInt(b[column]) || 0;
    } else {
      valA = (a[column] || "").toString().toLowerCase();
      valB = (b[column] || "").toString().toLowerCase();
    }
    if (window.sortDirectionUsers === "ASC") {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });
  renderUsers(allUsers);
};

window.aplicarFiltrosUsuarios = function () {
  const busqueda =
    document.getElementById("filtro_busqueda_usuarios")?.value.toLowerCase() ||
    "";
  const area = document.getElementById("filtro_area")?.value || "";
  const rol = document.getElementById("filtro_rol")?.value || "";
  const estado = document.getElementById("filtro_estado_usuario")?.value || "";
  let usuariosFiltrados = allUsers.filter((u) => {
    if (busqueda) {
      const nombreCompleto =
        `${u.primer_nombre || ""} ${u.segundo_nombre || ""} ${u.primer_apellido || ""} ${u.segundo_apellido || ""}`.toLowerCase();
      const usuario = (u.usuario || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const coincide =
        nombreCompleto.includes(busqueda) ||
        usuario.includes(busqueda) ||
        email.includes(busqueda);
      if (!coincide) return false;
    }
    if (area && u.area !== area) return false;
    if (rol && u.id_rol_admin != rol) return false;
    if (estado !== "" && u.estado != estado) return false;
    return true;
  });
  renderUsers(usuariosFiltrados);
};

window.limpiarFiltrosUsuarios = function () {
  document.getElementById("filtro_busqueda_usuarios").value = "";
  document.getElementById("filtro_area").value = "";
  document.getElementById("filtro_rol").value = "";
  document.getElementById("filtro_estado_usuario").value = "";
  renderUsers(allUsers);
};

// ==================== FIN FUNCIONES DE USUARIOS ====================

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  loadUserPermissions();
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
      const rolId = data.user.id_rol_admin;

      const avatar = document.getElementById("userAvatar");
      const menuName = document.getElementById("menuUserName");

      if (avatar) avatar.textContent = initials;
      if (menuName) menuName.textContent = fullName;

      // IMPORTANTE: Guardar el rol en sessionStorage
      sessionStorage.setItem("id_rol_admin", rolId);
      console.log("✅ Rol de usuario guardado:", rolId);
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
  } else if (view === "inventario") {
    // ✅ AGREGAR ESTE BLOQUE
    renderInventarioView();
    loadInventario();
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
      <<td class="text-center"> 
      ${ticket.archivo_adjunto ? '<i class="bi bi-paperclip text-success fs-5"></i>' : '<span class="text-muted">-</span>'}
      </td>
      <td class="text-center">
      <span class="badge ${(ticket.total_mensajes || 0) > 0 ? "bg-primary" : "bg-secondary"}">
      ${ticket.total_mensajes || 0}
  </span>
</td>
<td class="text-center ${getColorTiempo(ticket.minutos_abierto || 0, ticket.total_mensajes || 0)}">
  ⏱️ ${formatTiempo(ticket.minutos_abierto || 0)}
</td>
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
  // Obtener filtros actuales (si existen)
  const fecha_desde =
    document.getElementById("filtro_fecha_desde")?.value || "";
  const fecha_hasta =
    document.getElementById("filtro_fecha_hasta")?.value || "";
  const estado = document.getElementById("filtro_estado")?.value || "";
  const prioridad = document.getElementById("filtro_prioridad")?.value || "";
  const categoria = document.getElementById("filtro_categoria")?.value || "";

  const params = new URLSearchParams();
  if (fecha_desde) params.append("fecha_desde", fecha_desde);
  if (fecha_hasta) params.append("fecha_hasta", fecha_hasta);
  if (estado) params.append("estado", estado);
  if (prioridad) params.append("prioridad", prioridad);
  if (categoria) params.append("categoria", categoria);

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
  const usuarioRol = userPermissions.rol;
  const estasCerrado = ticket.estado === "Cerrado";
  const puedeAbrirTicketCerrado = usuarioRol <= 2;
  const selectEstadoDisabled = estasCerrado && !puedeAbrirTicketCerrado;

  const puedeAsignar = canAssignTicket(ticket);
  const puedeCerrar = canCloseTicket(ticket);
  const puedeEnviar = canSendMessages(ticket);

  const adjuntoHtml = ticket.archivo_adjunto
    ? `
    <div class="alert alert-info">
      📎 <strong>Archivo adjunto:</strong> 
      <a href="php/download_file.php?file=${ticket.archivo_adjunto}" class="btn btn-sm btn-primary ms-2">Descargar</a>
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

  let areasSelect = "";
  if (userPermissions.canChangeArea) {
    const responseAreas = await fetch("php/tickets_api.php?action=get_areas");
    const dataAreas = await responseAreas.json();

    if (dataAreas.success) {
      let areasOptions = '<option value="">-- Sin área --</option>';
      dataAreas.areas.forEach((area) => {
        const selected = ticket.id_area == area.id ? "selected" : "";
        areasOptions += `<option value="${area.id}" ${selected}>${area.nombre}</option>`;
      });

      areasSelect = `
        <div class="col-md-6 mb-3">
          <label class="form-label"><strong>Área:</strong></label>
          <select class="form-select form-select-sm" onchange="cambiarAreaTicket(${ticket.id}, this.value)">
            ${areasOptions}
          </select>
        </div>
      `;
    }
  } else if (ticket.area_nombre) {
    areasSelect = `
      <div class="col-md-6 mb-3">
        <strong>Área:</strong> ${ticket.area_nombre}
      </div>
    `;
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
      ${areasSelect}
      
      <div class="col-md-6">
        <label class="form-label"><strong>Asignar a:</strong></label>
        <select class="form-select form-select-sm" 
          onchange="asignarTicket(${ticket.id}, this.value)"
          ${!puedeAsignar ? "disabled" : ""}
          ${selectEstadoDisabled ? "disabled" : ""}>
          ${adminsOptions}             
        </select>             
      </div>
      
      <div class="col-md-3">
        <label class="form-label"><strong>Cambiar Estado:</strong></label>
        <select class="form-select form-select-sm" 
          onchange="updateTicketStatus(${ticket.id}, this.value)"
          ${!puedeCerrar && ticket.estado === "Cerrado" ? "disabled" : ""}>
          <option value="">--</option>
          <option value="Abierto" ${ticket.estado === "Abierto" ? "selected" : ""}>Abierto</option>
          <option value="En Proceso" ${ticket.estado === "En Proceso" ? "selected" : ""}>En Proceso</option>
          <option value="Resuelto" ${ticket.estado === "Resuelto" ? "selected" : ""}>Resuelto</option>
          <option value="Cerrado" ${ticket.estado === "Cerrado" ? "selected" : ""}>Cerrado</option>
        </select>
      </div>
      
      <div class="col-md-3">
        <label class="form-label"><strong>Prioridad:</strong></label>
        <select class="form-select form-select-sm" 
          onchange="updateTicketPriority(${ticket.id}, this.value)"
          ${!puedeAsignar ? "disabled" : ""}>
          <option value="">--</option>
          <option value="baja" ${ticket.prioridad === "baja" ? "selected" : ""}>Baja</option>
          <option value="media" ${ticket.prioridad === "media" ? "selected" : ""}>Media</option>
          <option value="alta" ${ticket.prioridad === "alta" ? "selected" : ""}>Alta</option>
          <option value="critica" ${ticket.prioridad === "critica" ? "selected" : ""}>Crítica</option>
        </select>
      </div>
    </div>
    
    <hr>
    
    ${
      puedeEnviar
        ? `
    <div class="mb-3">
      <label class="form-label"><strong>Adjuntar Archivo:</strong></label>
      <input type="file" id="ticketFile" class="form-control form-control-sm">
      <button class="btn btn-secondary btn-sm mt-2" onclick="uploadTicketFile(${ticket.id})">📤 Subir</button>
    </div>
    `
        : ""
    }
    
    <hr>
    
    <div class="mb-3">
      <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#historialTicket">
        📋 Ver Historial de Cambios
      </button>
      <div class="collapse mt-2" id="historialTicket">
        <div id="historialContent" class="border rounded p-2" style="max-height: 200px; overflow-y: auto;">
          <div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>
        </div>
      </div>
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

  document.getElementById("historialTicket").addEventListener(
    "show.bs.collapse",
    function () {
      loadTicketHistorial(ticket.id);
    },
    { once: true },
  );
}
async function asignarTicket(ticketId, usuarioId) {
  if (!usuarioId) return;

  const formData = new FormData();
  formData.append("action", "assign");
  formData.append("ticket_id", ticketId);
  formData.append("id_usuario_asignado", usuarioId);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Técnico asignado correctamente");
      loadTickets();
      viewTicketDetail(ticketId); // Actualizar vista de detalle también
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
    const comments = data.comments || data.comentarios || [];

    if (data.success && comments.length > 0) {
      let html = '<h6>Comentarios:</h6><div class="list-group">';

      comments.forEach((comment) => {
        const editado =
          comment.editado == 1
            ? '<small class="text-muted">(editado)</small>'
            : "";
        const canEdit = userPermissions.canEditMessages;

        const editButton = canEdit
          ? `
    <button class="btn btn-sm btn-outline-secondary" 
            onclick="toggleEditMessage(${comment.id})" 
            id="editBtn_${comment.id}"
            title="Editar mensaje">
      <i class="bi bi-pencil"></i> Editar
    </button>
  `
          : "";

        html += `
    <div class="list-group-item">
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <strong>${escapeHtml(comment.usuario)}</strong>
          <small class="text-muted ms-2">${formatDate(comment.fecha_envio)}</small>
          ${editado}
          <div class="mt-1" id="messageText_${comment.id}">${escapeHtml(comment.mensaje)}</div>
          <textarea class="form-control mt-1 d-none" 
                    id="messageEdit_${comment.id}" 
                    rows="3">${escapeHtml(comment.mensaje)}</textarea>
          <div class="mt-2 d-none" id="messageActions_${comment.id}">
            <button class="btn btn-sm btn-success" onclick="saveEditedMessage(${comment.id})">
              <i class="bi bi-check"></i> Guardar
            </button>
            <button class="btn btn-sm btn-secondary" onclick="cancelEditMessage(${comment.id})">
              <i class="bi bi-x"></i> Cancelar
            </button>
          </div>
        </div>
        ${editButton}
      </div>
      ${
        comment.archivo
          ? `
        <div class="mt-2">
          <a href="php/download_file.php?file=${comment.archivo}" class="btn btn-sm btn-link">
            📎 ${comment.archivo}
          </a>
          ${
            canEdit
              ? `
    <button class="btn btn-sm btn-outline-danger" 
            onclick="deleteAttachment(${comment.id}, ${ticketId})"
            title="Eliminar archivo">
      🗑️ Eliminar
    </button>
  `
              : ""
          }
        </div>
      `
          : ""
      }
    </div>
  `;
      });

      html += "</div>";
      section.innerHTML = html;
    } else {
      section.innerHTML = '<p class="text-muted">Sin comentarios aún</p>';
    }

    // Agregar formulario para nuevo comentario
    section.innerHTML += `
      <hr>
      <h6>Agregar Comentario:</h6>
      <textarea id="newComment" class="form-control mb-2" rows="3" placeholder="Escribe tu comentario..."></textarea>
      <input type="file" id="commentFile" class="form-control form-control-sm mb-2">
      <button class="btn btn-primary btn-sm" onclick="addTicketComment(${ticketId})">
        💬 Enviar Comentario
      </button>
    `;
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

    console.log("✅ Usuarios recibidos:", data.usuarios?.length || 0);

    if (data.success && data.usuarios) {
      allUsers = data.usuarios;
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

  // Inicializar variables de ordenamiento si no existen
  if (typeof window.sortColumnUsers === "undefined") {
    window.sortColumnUsers = "id";
    window.sortDirectionUsers = "ASC";
  }

  // Obtener áreas únicas
  const areasUnicas = [...new Set(users.map((u) => u.area).filter(Boolean))];
  let areasOptions = areasUnicas
    .map((a) => `<option value="${a}">${a}</option>`)
    .join("");

  let html = `
    <!-- FILTROS -->
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title mb-3">🔍 Filtros de Usuarios</h5>
        <div class="row g-2">
          <div class="col-md-3">
            <label class="form-label small fw-bold">Buscar</label>
            <input type="text" id="filtro_busqueda_usuarios" class="form-control form-control-sm" 
                   placeholder="Nombre, apellido, usuario, email...">
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Área</label>
            <select id="filtro_area" class="form-select form-select-sm">
              <option value="">Todas</option>
              ${areasOptions}
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Rol</label>
            <select id="filtro_rol" class="form-select form-select-sm">
              <option value="">Todos</option>
              <option value="1">Super Admin</option>
              <option value="2">Admin</option>
              <option value="3">Técnico</option>
              <option value="4">Usuario</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Estado</label>
            <select id="filtro_estado_usuario" class="form-select form-select-sm">
              <option value="">Todos</option>
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-bold">&nbsp;</label>
            <div class="d-flex gap-1">
              <button class="btn btn-primary btn-sm flex-fill" onclick="window.aplicarFiltrosUsuarios()">
                🔍 Filtrar
              </button>
              <button class="btn btn-secondary btn-sm flex-fill" onclick="window.limpiarFiltrosUsuarios()">
                🔄 Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- HEADER CON CONTADOR -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="mb-0">Usuarios Registrados (${users.length})</h4>
      <button class="btn btn-success" onclick="showCreateUserModal()">
        <i class="bi bi-person-plus"></i> Nuevo Usuario
      </button>
    </div>
    
    <!-- TABLA CON ORDENAMIENTO -->
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th style="cursor:pointer" onclick="window.sortUsers('id')">
              ID ${window.sortColumnUsers === "id" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('nombre_completo')">
              Nombre Completo ${window.sortColumnUsers === "nombre_completo" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('usuario')">
              Usuario ${window.sortColumnUsers === "usuario" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('email')">
              Email ${window.sortColumnUsers === "email" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('telefono')">
              Teléfono ${window.sortColumnUsers === "telefono" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('area')">
              Área ${window.sortColumnUsers === "area" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('id_rol_admin')">
              Rol ${window.sortColumnUsers === "id_rol_admin" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th style="cursor:pointer" onclick="window.sortUsers('estado')">
              Estado ${window.sortColumnUsers === "estado" ? (window.sortDirectionUsers === "ASC" ? "▲" : "▼") : "⬍"}
            </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
  `;

  users.forEach((u) => {
    try {
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

async function showCreateUserModal() {
  try {
    console.log("📝 Abriendo modal de creación de usuario");

    // Obtener áreas disponibles
    let areas = [];
    try {
      const areasResponse = await fetch("php/user_api.php?action=get_areas");
      const areasData = await areasResponse.json();
      if (areasData.success && areasData.areas) {
        areas = areasData.areas;
      }
    } catch (error) {
      console.warn("⚠️ Error al cargar áreas:", error);
    }

    // Obtener roles disponibles
    let roles = [
      { id: 1, nombre: "Super Admin" },
      { id: 2, nombre: "Admin" },
      { id: 3, nombre: "Técnico" },
      { id: 4, nombre: "Usuario" },
    ];

    try {
      const rolesResponse = await fetch("php/user_api.php?action=get_roles");
      const rolesData = await rolesResponse.json();
      if (rolesData.success && rolesData.roles) {
        roles = rolesData.roles;
      }
    } catch (error) {
      console.warn("⚠️ Usando roles por defecto");
    }

    // Crear opciones de áreas
    let areasOptions = '<option value="">Sin área asignada</option>';
    if (areas && areas.length > 0) {
      areasOptions += areas
        .map((area) => `<option value="${area.id}">${area.nombre}</option>`)
        .join("");
    }

    // Crear opciones de roles
    let rolesOptions = roles
      .map((rol) => `<option value="${rol.id}">${rol.nombre}</option>`)
      .join("");

    // Crear el HTML del modal
    const modalHTML = `
      <div class="modal fade" id="createUserModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">➕ Crear Nuevo Usuario</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="createUserForm">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Primer Nombre *</label>
                    <input type="text" class="form-control" name="primer_nombre" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Segundo Nombre</label>
                    <input type="text" class="form-control" name="segundo_nombre">
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Primer Apellido *</label>
                    <input type="text" class="form-control" name="primer_apellido" required>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Segundo Apellido</label>
                    <input type="text" class="form-control" name="segundo_apellido">
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Usuario *</label>
                    <input type="text" class="form-control" name="usuario" required>
                    <small class="text-muted">Sin espacios ni caracteres especiales</small>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Email *</label>
                    <input type="email" class="form-control" name="email" required>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Contraseña *</label>
                    <input type="password" class="form-control" name="password" required minlength="6">
                    <small class="text-muted">Mínimo 6 caracteres</small>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" class="form-control" name="telefono">
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Área</label>
                    <select class="form-select" name="id_area">
                      ${areasOptions}
                    </select>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Rol *</label>
                    <select class="form-select" name="id_rol_admin" required>
                      ${rolesOptions}
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x-circle"></i> Cancelar
              </button>
              <button type="button" class="btn btn-success" onclick="submitCreateUserForm()">
                <i class="bi bi-save"></i> Crear Usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Eliminar modal existente si existe
    const existingModal = document.getElementById("createUserModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Agregar modal al DOM
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Mostrar modal
    const modal = new bootstrap.Modal(
      document.getElementById("createUserModal"),
    );
    modal.show();

    console.log("✅ Modal de creación mostrado correctamente");
  } catch (error) {
    console.error("❌ Error en showCreateUserModal:", error);
    alert("Error al cargar el formulario de creación: " + error.message);
  }
}

async function submitCreateUserForm() {
  const form = document.getElementById("createUserForm");
  const formData = new FormData(form);
  formData.append("action", "create");

  console.log("📤 Creando usuario...");

  try {
    const response = await fetch("php/user_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Usuario creado correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("createUserModal"),
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

async function renderStatsWithFilters() {
  const content = document.getElementById("content");

  // HTML del filtro
  const filtroHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title mb-3">🔍 Filtros de Estadísticas</h5>
        <div class="row g-2">
          <div class="col-md-3">
            <label class="form-label small fw-bold">Desde</label>
            <input type="date" id="stats_fecha_desde" class="form-control form-control-sm">
          </div>
          <div class="col-md-3">
            <label class="form-label small fw-bold">Hasta</label>
            <input type="date" id="stats_fecha_hasta" class="form-control form-control-sm">
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Estado</label>
            <select id="stats_estado" class="form-select form-select-sm">
              <option value="">Todos</option>
              <option value="Abierto">Abierto</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Resuelto">Resuelto</option>
              <option value="Cerrado">Cerrado</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Prioridad</label>
            <select id="stats_prioridad" class="form-select form-select-sm">
              <option value="">Todas</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">&nbsp;</label>
            <div>
              <button class="btn btn-primary btn-sm w-100" onclick="aplicarFiltrosStats()">
                🔍 Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div id="stats-content-container"></div>
  `;

  content.innerHTML = filtroHTML;

  // Cargar stats sin filtros inicialmente
  aplicarFiltrosStats();
}

// ==================== APLICAR FILTROS A ESTADÍSTICAS ====================

async function aplicarFiltrosStats() {
  const fecha_desde = document.getElementById("stats_fecha_desde")?.value || "";
  const fecha_hasta = document.getElementById("stats_fecha_hasta")?.value || "";
  const estado = document.getElementById("stats_estado")?.value || "";
  const prioridad = document.getElementById("stats_prioridad")?.value || "";

  const container = document.getElementById("stats-content-container");
  container.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    // Construir query params
    const params = new URLSearchParams();
    if (fecha_desde) params.append("fecha_desde", fecha_desde);
    if (fecha_hasta) params.append("fecha_hasta", fecha_hasta);
    if (estado) params.append("estado", estado);
    if (prioridad) params.append("prioridad", prioridad);

    const queryString = params.toString() ? "&" + params.toString() : "";

    // Obtener estadísticas filtradas
    const response = await fetch(
      `php/tickets_api.php?action=stats${queryString}`,
    );
    const data = await response.json();

    if (data.success) {
      // Renderizar stats filtradas
      let html = renderStatsCards(data.stats);

      // Agregar NPS Dashboard
      html += '<div id="nps-dashboard-container"></div>';

      container.innerHTML = html;

      // Cargar NPS
      setTimeout(() => {
        if (typeof loadNPSStats === "function") {
          loadNPSStats();
        }
      }, 100);
    }
  } catch (error) {
    console.error("Error:", error);
    container.innerHTML =
      '<div class="alert alert-danger">Error al cargar estadísticas</div>';
  }
}

// ==================== RENDERIZAR TARJETAS DE ESTADÍSTICAS ====================

function renderStatsCards(s) {
  return `
    <h4 class="mb-4">Estadísticas del Sistema</h4>
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
        <div class="card text-center">
          <div class="card-body">
            <h2 class="text-warning">${s.reabiertos || 0}</h2>
            <p class="text-muted mb-0">Reabiertos</p>
          </div>
        </div>
      </div>
    </div>
  `;
}
async function loadStats() {
  renderStatsWithFilters();
}

function renderStatsCards(s) {
  return `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="mb-0">Estadísticas del Sistema</h4>
      <button class="btn btn-success btn-sm" onclick="exportarTicketsExcel()">
        <i class="bi bi-download"></i> Descargar Tickets Excel
      </button>
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
        <div class="card text-center">
          <div class="card-body">
            <h2 class="text-warning">${s.reabiertos || 0}</h2>
            <p class="text-muted mb-0">Reabiertos</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function exportarTicketsExcel() {
  // Obtener filtros de estadísticas (si existen)
  const fecha_desde = document.getElementById("stats_fecha_desde")?.value || "";
  const fecha_hasta = document.getElementById("stats_fecha_hasta")?.value || "";
  const estado = document.getElementById("stats_estado")?.value || "";
  const prioridad = document.getElementById("stats_prioridad")?.value || "";

  const params = new URLSearchParams();
  if (fecha_desde) params.append("fecha_desde", fecha_desde);
  if (fecha_hasta) params.append("fecha_hasta", fecha_hasta);
  if (estado) params.append("estado", estado);
  if (prioridad) params.append("prioridad", prioridad);

  window.open(`php/exportar_excel.php?${params.toString()}`, "_blank");
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

  window.sortUsers = function (column) {
    if (window.sortColumnUsers === column) {
      window.sortDirectionUsers =
        window.sortDirectionUsers === "ASC" ? "DESC" : "ASC";
    } else {
      window.sortColumnUsers = column;
      window.sortDirectionUsers = "ASC";
    }

    allUsers.sort((a, b) => {
      let valA, valB;

      if (column === "nombre_completo") {
        valA =
          `${a.primer_nombre || ""} ${a.segundo_nombre || ""} ${a.primer_apellido || ""} ${a.segundo_apellido || ""}`
            .trim()
            .toLowerCase();
        valB =
          `${b.primer_nombre || ""} ${b.segundo_nombre || ""} ${b.primer_apellido || ""} ${b.segundo_apellido || ""}`
            .trim()
            .toLowerCase();
      } else if (
        column === "id" ||
        column === "id_rol_admin" ||
        column === "estado"
      ) {
        valA = parseInt(a[column]) || 0;
        valB = parseInt(b[column]) || 0;
      } else {
        valA = (a[column] || "").toString().toLowerCase();
        valB = (b[column] || "").toString().toLowerCase();
      }

      if (window.sortDirectionUsers === "ASC") {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });

    renderUsers(allUsers);
  };

  window.aplicarFiltrosUsuarios = function () {
    const busqueda =
      document
        .getElementById("filtro_busqueda_usuarios")
        ?.value.toLowerCase() || "";
    const area = document.getElementById("filtro_area")?.value || "";
    const rol = document.getElementById("filtro_rol")?.value || "";
    const estado =
      document.getElementById("filtro_estado_usuario")?.value || "";

    let usuariosFiltrados = allUsers.filter((u) => {
      if (busqueda) {
        const nombreCompleto =
          `${u.primer_nombre || ""} ${u.segundo_nombre || ""} ${u.primer_apellido || ""} ${u.segundo_apellido || ""}`.toLowerCase();
        const usuario = (u.usuario || "").toLowerCase();
        const email = (u.email || "").toLowerCase();

        const coincide =
          nombreCompleto.includes(busqueda) ||
          usuario.includes(busqueda) ||
          email.includes(busqueda);

        if (!coincide) return false;
      }

      if (area && u.area !== area) return false;
      if (rol && u.id_rol_admin != rol) return false;
      if (estado !== "" && u.estado != estado) return false;

      return true;
    });

    renderUsers(usuariosFiltrados);
  };

  window.limpiarFiltrosUsuarios = function () {
    document.getElementById("filtro_busqueda_usuarios").value = "";
    document.getElementById("filtro_area").value = "";
    document.getElementById("filtro_rol").value = "";
    document.getElementById("filtro_estado_usuario").value = "";

    renderUsers(allUsers);
  };

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
window.sortUsers = sortUsers;
window.aplicarFiltrosUsuarios = aplicarFiltrosUsuarios;
window.limpiarFiltrosUsuarios = limpiarFiltrosUsuarios;
window.sortColumnUsers = "id";
window.sortDirectionUsers = "ASC";
window.showCreateUserModal = showCreateUserModal;
window.submitCreateUserForm = submitCreateUserForm;

// ==================== FUNCIONES DE USUARIOS - FILTROS Y ORDENAMIENTO ====================

window.sortColumnUsers = "id";
window.sortDirectionUsers = "ASC";

window.sortUsers = function (column) {
  if (window.sortColumnUsers === column) {
    window.sortDirectionUsers =
      window.sortDirectionUsers === "ASC" ? "DESC" : "ASC";
  } else {
    window.sortColumnUsers = column;
    window.sortDirectionUsers = "ASC";
  }

  allUsers.sort((a, b) => {
    let valA, valB;

    if (column === "nombre_completo") {
      valA =
        `${a.primer_nombre || ""} ${a.segundo_nombre || ""} ${a.primer_apellido || ""} ${a.segundo_apellido || ""}`
          .trim()
          .toLowerCase();
      valB =
        `${b.primer_nombre || ""} ${b.segundo_nombre || ""} ${b.primer_apellido || ""} ${b.segundo_apellido || ""}`
          .trim()
          .toLowerCase();
    } else if (
      column === "id" ||
      column === "id_rol_admin" ||
      column === "estado"
    ) {
      valA = parseInt(a[column]) || 0;
      valB = parseInt(b[column]) || 0;
    } else {
      valA = (a[column] || "").toString().toLowerCase();
      valB = (b[column] || "").toString().toLowerCase();
    }

    if (window.sortDirectionUsers === "ASC") {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });

  renderUsers(allUsers);
};

window.aplicarFiltrosUsuarios = function () {
  const busqueda =
    document.getElementById("filtro_busqueda_usuarios")?.value.toLowerCase() ||
    "";
  const area = document.getElementById("filtro_area")?.value || "";
  const rol = document.getElementById("filtro_rol")?.value || "";
  const estado = document.getElementById("filtro_estado_usuario")?.value || "";

  let usuariosFiltrados = allUsers.filter((u) => {
    if (busqueda) {
      const nombreCompleto =
        `${u.primer_nombre || ""} ${u.segundo_nombre || ""} ${u.primer_apellido || ""} ${u.segundo_apellido || ""}`.toLowerCase();
      const usuario = (u.usuario || "").toLowerCase();
      const email = (u.email || "").toLowerCase();

      const coincide =
        nombreCompleto.includes(busqueda) ||
        usuario.includes(busqueda) ||
        email.includes(busqueda);
      if (!coincide) return false;
    }
    if (area && u.area !== area) return false;
    if (rol && u.id_rol_admin != rol) return false;
    if (estado !== "" && u.estado != estado) return false;
    return true;
  });

  renderUsers(usuariosFiltrados);
};

window.limpiarFiltrosUsuarios = function () {
  document.getElementById("filtro_busqueda_usuarios").value = "";
  document.getElementById("filtro_area").value = "";
  document.getElementById("filtro_rol").value = "";
  document.getElementById("filtro_estado_usuario").value = "";
  renderUsers(allUsers);
};

async function cambiarAreaTicket(ticketId, nuevaArea) {
  if (!nuevaArea) return;

  if (!confirm("¿Cambiar el área de este ticket?")) return;

  const formData = new FormData();
  formData.append("action", "change_area");
  formData.append("ticket_id", ticketId);
  formData.append("id_area", nuevaArea);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Área cambiada correctamente");
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

// CARGAR HISTORIAL DEL TICKET
async function loadTicketHistorial(ticketId) {
  try {
    const response = await fetch(
      `php/tickets_api.php?action=get_historial&ticket_id=${ticketId}`,
    );
    const data = await response.json();

    const container = document.getElementById("historialContent");

    if (data.success && data.historial.length > 0) {
      let html = '<div class="list-group list-group-flush">';

      data.historial.forEach((item) => {
        const fecha = new Date(item.fecha).toLocaleString("es-CO");
        const usuario = `${item.primer_nombre} ${item.primer_apellido}`;

        let icono = "📝";
        let texto = "";

        switch (item.accion) {
          case "creacion":
            icono = "✨";
            texto = "Ticket creado";
            break;
          case "cambio_estado":
            icono = "🔄";
            texto = `Estado: ${item.valor_anterior} → ${item.valor_nuevo}`;
            break;
          case "cambio_area":
            icono = "📁";
            texto = `Área cambiada`;
            break;
          case "asignacion":
            icono = "👤";
            texto = `Técnico asignado`;
            break;
          case "reapertura":
            icono = "🔓";
            texto = `Ticket reabierto`;
            break;
          case "comentario":
            icono = "💬";
            texto = "Comentario agregado";
            break;
          case "cierre":
            icono = "🔒";
            texto = "Ticket cerrado";
            break;
          case "cambio_prioridad":
            icono = "⚡";
            texto = `Prioridad: ${item.valor_anterior} → ${item.valor_nuevo}`;
            break;
          case "edicion_mensaje":
            icono = "✏️";
            texto = "Mensaje editado";
            break;
          case "eliminacion_archivo":
            icono = "🗑️";
            texto = `Archivo eliminado: ${item.valor_anterior}`;
            break;
          default:
            texto = item.accion;
        }

        html += `
          <div class="list-group-item list-group-item-action py-2">
            <div class="d-flex w-100 justify-content-between align-items-start">
              <small class="mb-0">${icono} ${texto}</small>
              <small class="text-muted">${fecha}</small>
            </div>
            <small class="text-muted">Por: ${usuario}</small>
          </div>
        `;
      });

      html += "</div>";
      container.innerHTML = html;
    } else {
      container.innerHTML =
        '<p class="text-muted text-center mb-0">Sin historial</p>';
    }
  } catch (error) {
    console.error("Error al cargar historial:", error);
    document.getElementById("historialContent").innerHTML =
      '<p class="text-danger">Error al cargar historial</p>';
  }
}

// TOGGLE EDITAR MENSAJE
function toggleEditMessage(messageId) {
  const textDiv = document.getElementById(`messageText_${messageId}`);
  const editArea = document.getElementById(`messageEdit_${messageId}`);
  const actions = document.getElementById(`messageActions_${messageId}`);
  const editBtn = document.getElementById(`editBtn_${messageId}`);

  textDiv.classList.add("d-none");
  editArea.classList.remove("d-none");
  actions.classList.remove("d-none");
  editBtn.classList.add("d-none");
}

// CANCELAR EDITAR MENSAJE
function cancelEditMessage(messageId) {
  const textDiv = document.getElementById(`messageText_${messageId}`);
  const editArea = document.getElementById(`messageEdit_${messageId}`);
  const actions = document.getElementById(`messageActions_${messageId}`);
  const editBtn = document.getElementById(`editBtn_${messageId}`);

  textDiv.classList.remove("d-none");
  editArea.classList.add("d-none");
  actions.classList.add("d-none");
  editBtn.classList.remove("d-none");
}

// ELIMINAR ARCHIVO ADJUNTO
async function deleteAttachment(messageId, ticketId) {
  if (!confirm("¿Eliminar este archivo adjunto?")) return;

  const formData = new FormData();
  formData.append("action", "delete_attachment");
  formData.append("message_id", messageId);
  formData.append("ticket_id", ticketId);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ Archivo eliminado");
      loadTicketComments(ticketId);
      loadTicketHistorial(ticketId);
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

// GUARDAR MENSAJE EDITADO
async function saveEditedMessage(messageId) {
  const editArea = document.getElementById(`messageEdit_${messageId}`);
  const textDiv = document.getElementById(`messageText_${messageId}`);
  const nuevoMensaje = editArea.value.trim();
  const mensajeAnterior = textDiv.textContent.trim();

  if (!nuevoMensaje) {
    alert("El mensaje no puede estar vacío");
    return;
  }

  const formData = new FormData();
  formData.append("action", "edit_message");
  formData.append("message_id", messageId);
  formData.append("mensaje", nuevoMensaje);
  formData.append("mensaje_anterior", mensajeAnterior);
  formData.append("ticket_id", currentTicketId);

  try {
    const response = await fetch("php/tickets_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      loadTicketComments(currentTicketId);
      loadTicketHistorial(currentTicketId);
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

/**
 * Formatear tiempo en formato legible
 */
function formatTiempo(minutos) {
  if (!minutos || minutos < 0) return "0 min";

  if (minutos < 60) {
    // Menos de 1 hora
    return `${Math.floor(minutos)} min`;
  } else if (minutos < 1440) {
    // Menos de 24 horas
    const horas = Math.floor(minutos / 60);
    const mins = Math.floor(minutos % 60);
    return mins > 0 ? `${horas}h ${mins}m` : `${horas}h`;
  } else {
    // Días
    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    return horas > 0 ? `${dias}d ${horas}h` : `${dias}d`;
  }
}

/**
 * Obtener clase de color según tiempo transcurrido
 */
function getColorTiempo(minutos, totalMensajes) {
  if (!minutos) return "";

  const sinRespuestaAdmin = (totalMensajes || 0) === 0;

  if (minutos < 60) {
    // Menos de 1 hora - Verde
    return "bg-success-subtle text-success fw-bold";
  } else if (minutos < 240) {
    // 1-4 horas - Amarillo
    return "bg-warning-subtle text-warning fw-bold";
  } else if (minutos < 1440) {
    // 4-24 horas - Naranja
    return "bg-orange-subtle text-orange fw-bold";
  } else {
    // Más de 24 horas
    if (sinRespuestaAdmin) {
      // Sin respuesta - Rojo parpadeante
      return "bg-danger text-white fw-bold blink-danger";
    } else {
      // Con respuesta - Rojo normal
      return "bg-danger-subtle text-danger fw-bold";
    }
  }
}

// Renderizar vista de inventario
function renderInventarioView() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <!-- Filtros -->
    <div class="card mb-3">
      <div class="card-body">
        <h5 class="card-title mb-3">🔍 Filtros de Inventario</h5>
        <div class="row g-2">
          <div class="col-md-2">
            <label class="form-label small fw-bold">Buscar</label>
            <input type="text" id="filtro_busqueda" class="form-control form-control-sm" placeholder="Serial, placa, tipo...">
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Tipo</label>
            <select id="filtro_tipo" class="form-select form-select-sm">
              <option value="">Todos</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Marca</label>
            <select id="filtro_marca" class="form-select form-select-sm">
              <option value="">Todas</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Estado</label>
            <select id="filtro_estado" class="form-select form-select-sm">
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="en_bodega">En Bodega</option>
              <option value="custodia">Custodia</option>
              <option value="disposicion">Disposición</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Sede</label>
            <select id="filtro_sede" class="form-select form-select-sm">
              <option value="">Todas</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-bold">Área</label>
            <select id="filtro_area" class="form-select form-select-sm">
              <option value="">Todas</option>
            </select>
          </div>
        </div>
        <div class="row mt-2">
          <div class="col-12">
            <button class="btn btn-primary btn-sm" onclick="aplicarFiltrosInventario()">🔍 Filtrar</button>
            <button class="btn btn-secondary btn-sm" onclick="limpiarFiltrosInventario()">🔄 Limpiar</button>
            <button class="btn btn-success btn-sm" onclick="exportarInventarioExcel()">📥 Exportar Excel</button>
            <button class="btn btn-info btn-sm" onclick="showCreateInventarioModal()" id="btnCrearInventario">➕ Nuevo Item</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0">📦 Inventario (<span id="inventarioCount">0</span>)</h5>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-sm mb-0">
            <thead class="table-light">
              <tr>
                <th class="text-center">ID</th>
                <th>Tipo</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Serial</th>
                <th>Placa</th>
                <th class="text-center">F. Compra</th>
                <th class="text-center">F. Asignación</th>
                <th class="text-center">F. Devolución</th>
                <th>Sede</th>
                <th>Área</th>
                <th>Usuario</th>
                <th class="text-center">Estado</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody id="inventarioTableBody">
              <tr>
                <td colspan="14" class="text-center">
                  <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Cargando...</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Cargar catálogos en filtros
  loadCatalogos();

  // Ocultar botón crear si no tiene permisos
  const rol = parseInt(sessionStorage.getItem("id_rol_admin")) || 4;
  if (rol > 2) {
    setTimeout(() => {
      const btnCrear = document.getElementById("btnCrearInventario");
      if (btnCrear) btnCrear.style.display = "none";
    }, 100);
  }
}

console.log("✅ admin.js cargado completamente");
