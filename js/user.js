// user.js - VERSIÓN DEFINITIVA COMPLETA
// Incluye: Ordenamiento completo, Respuestas, Colores, Navegación

let currentView = "mytickets";
let userTickets = [];
let sortColumn = "fecha_creacion";
let sortDirection = "DESC";
let updateInterval = null;
let currentPage = 1;
let ticketsPerPage = 20;

document.addEventListener("DOMContentLoaded", () => {
  loadUserProfile();
  showView("mytickets");
  startAutoUpdate();
});

async function loadUserProfile() {
  try {
    const response = await fetch("php/user_api.php?action=me");
    const data = await response.json();

    if (data.success) {
      const fullName = data.user.nombre_completo;
      const userNameElement = document.getElementById("userName");
      if (userNameElement) {
        userNameElement.textContent = fullName;
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function showView(view) {
  currentView = view;
  currentPage = 1;

  const buttons = document.querySelectorAll(".list-group-item");
  buttons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-view") === view) {
      btn.classList.add("active");
    }
  });

  if (view === "create") {
    renderCreateForm();
  } else if (view === "mytickets") {
    loadMyTickets();
  } else if (view === "stats") {
    loadStats();
  }
}

// ==================== CREAR TICKET ====================

async function renderCreateForm() {
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
                <form id="createTicketForm" onsubmit="createTicketWithFile(event)">
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
                                <select class="form-select" name="categoria" id="categoria" onchange="loadSubcategorias()" required>
                                    ${categoriasOptions}
                                </select>
                            </div>
                        </div>
                        
                        <div class="col-md-4">
                            <div class="mb-3">
                                <label class="form-label">Subcategoría</label>
                                <select class="form-select" name="subcategoria" id="subcategoria">
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
                        <input type="file" class="form-control" id="ticketFile">
                        <small class="text-muted">Tamaño máximo: 50MB</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">📤 Crear Ticket</button>
                    <button type="button" class="btn btn-secondary" onclick="showView('mytickets')">Cancelar</button>
                </form>
            </div>
        </div>
    `;
}

async function loadSubcategorias() {
  const categoriaSelect = document.getElementById("categoria");
  const subcategoriaSelect = document.getElementById("subcategoria");
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

async function createTicketWithFile(e) {
  e.preventDefault();

  const form = e.target;
  const titulo = form.titulo.value;
  const descripcion = form.descripcion.value;
  const categoria = form.categoria.value;
  const subcategoria = form.subcategoria.value;
  const prioridad = form.prioridad.value;
  const fileInput = document.getElementById("ticketFile");
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
      const ticketId = data.ticket_id;

      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          alert("⚠️ Ticket creado, pero el archivo es muy grande (máx 50MB)");
          showView("mytickets");
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
      showView("mytickets");
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

// ==================== MIS TICKETS ====================

async function loadMyTickets() {
  const content = document.getElementById("content");
  content.innerHTML =
    '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

  try {
    const response = await fetch("php/tickets_api.php?action=list");
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing JSON:", text);
      content.innerHTML =
        '<div class="alert alert-danger">Error: Respuesta inválida del servidor</div>';
      return;
    }

    if (data.success) {
      userTickets = data.tickets;
      renderMyTickets(userTickets);
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

function renderMyTickets(tickets) {
  const content = document.getElementById("content");

  if (tickets.length === 0) {
    content.innerHTML = `
            <div class="text-center py-5">
                <h5>No tienes tickets aún</h5>
                <p class="text-muted">Crea tu primer ticket para comenzar</p>
                <button class="btn btn-primary" onclick="showView('create')">➕ Crear Ticket</button>
            </div>
        `;
    return;
  }

  const totalPages = Math.ceil(tickets.length / ticketsPerPage);
  const startIndex = (currentPage - 1) * ticketsPerPage;
  const endIndex = startIndex + ticketsPerPage;
  const ticketsToShow = tickets.slice(startIndex, endIndex);

  let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>Mis Tickets (${tickets.length})</h4>
            <div class="d-flex gap-2 align-items-center">
                <small class="text-muted">Mostrando ${startIndex + 1}-${Math.min(endIndex, tickets.length)} de ${tickets.length}</small>
                <button class="btn btn-sm btn-outline-primary" onclick="previousPage()" ${currentPage === 1 ? "disabled" : ""}>
                    ◀ Anterior
                </button>
                <span class="badge bg-primary">${currentPage} / ${totalPages}</span>
                <button class="btn btn-sm btn-outline-primary" onclick="nextPage()" ${currentPage === totalPages ? "disabled" : ""}>
                    Siguiente ▶
                </button>
                <button class="btn btn-success btn-sm" onclick="showView('create')">➕ Nuevo</button>
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
                        <th style="cursor:pointer" onclick="sortTickets('estado')">
                            Estado ${sortColumn === "estado" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th style="cursor:pointer" onclick="sortTickets('prioridad')">
                            Prioridad ${sortColumn === "prioridad" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
                        <th style="cursor:pointer" onclick="sortTickets('categoria')">
                            Categoría ${sortColumn === "categoria" ? (sortDirection === "ASC" ? "▲" : "▼") : ""}
                        </th>
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

  return `
        <tr style="background-color: ${bgColor}; transition: background-color 0.3s; border-bottom: 2px solid #dee2e6;" data-ticket-id="${ticket.id}" data-minutos="${minutos}">
            <td><strong>#${ticket.id}</strong></td>
            <td>${escapeHtml(ticket.titulo)}</td>
            <td><span class="badge ${estadoClass}">${ticket.estado}</span></td>
            <td><span class="badge ${prioridadClass}">${ticket.prioridad.toUpperCase()}</span></td>
            <td><small>${escapeHtml(ticket.categoria || "-")}</small></td>
            <td class="text-center"><span class="badge bg-secondary">${ticket.respuestas || 0}</span></td>
            <td class="ticket-tiempo"><small>⏱️ ${tiempoTexto}</small></td>
            <td><small>${formatDate(ticket.fecha_creacion)}</small></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewTicket(${ticket.id})">👁️ Ver</button>
            </td>
        </tr>
    `;
}

function previousPage() {
  if (currentPage > 1) {
    currentPage--;
    renderMyTickets(userTickets);
    window.scrollTo(0, 0);
  }
}

function nextPage() {
  const totalPages = Math.ceil(userTickets.length / ticketsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderMyTickets(userTickets);
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

  userTickets.sort((a, b) => {
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

  renderMyTickets(userTickets);
}

// ==================== VER TICKET ====================

async function viewTicket(ticketId) {
  try {
    const response = await fetch(
      `php/tickets_api.php?action=get&id=${ticketId}`,
    );
    const data = await response.json();

    if (data.success) {
      showTicketModal(data.ticket);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function showTicketModal(ticket) {
  const modalBody = document.getElementById("ticketModalBody");

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

  const minutos = ticket.minutos_abierto || 0;
  const tiempoTexto =
    minutos < 60
      ? `${Math.floor(minutos)} minutos`
      : `${Math.floor(minutos / 60)} horas ${Math.floor(minutos % 60)} minutos`;

  const botonCerrar =
    ticket.estado === "Abierto" || ticket.estado === "En Proceso"
      ? `
        <button class="btn btn-danger btn-sm mt-3" onclick="mostrarFormularioCierre(${ticket.id})">
            🔒 Cerrar Ticket
        </button>
    `
      : "";

  modalBody.innerHTML = `
        <div class="mb-3">
            <h5>#${ticket.id} - ${escapeHtml(ticket.titulo)}</h5>
            <span class="badge bg-${ticket.estado === "Abierto" ? "primary" : ticket.estado === "Resuelto" ? "success" : ticket.estado === "Cerrado" ? "secondary" : "warning"}">
                ${ticket.estado}
            </span>
            <span class="badge bg-secondary ms-2">${ticket.prioridad.toUpperCase()}</span>
            <small class="text-muted ms-2">⏱️ Abierto hace: ${tiempoTexto}</small>
        </div>
        
        <hr>
        
        <div class="mb-3">
            <strong>Descripción:</strong>
            <p>${escapeHtml(ticket.descripcion)}</p>
        </div>
        
        ${adjuntoHtml}
        
        <div class="mb-3">
            <strong>Categoría:</strong> ${ticket.categoria || "-"}<br>
            <strong>Subcategoría:</strong> ${ticket.subcategoria || "-"}<br>
            <strong>Creado:</strong> ${formatDate(ticket.fecha_creacion)}
        </div>
        
        ${
          ticket.motivo_cierre
            ? `
            <div class="alert alert-secondary">
                <strong>Motivo de cierre:</strong><br>
                ${escapeHtml(ticket.motivo_cierre)}
            </div>
        `
            : ""
        }
        
        <div id="formCierre" style="display:none;" class="mb-3">
            <hr>
            <h6>Cerrar Ticket</h6>
            <textarea id="motivoCierre" class="form-control mb-2" rows="3" placeholder="Explica por qué estás cerrando este ticket..."></textarea>
            <button class="btn btn-danger btn-sm" onclick="cerrarTicket(${ticket.id})">Confirmar Cierre</button>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('formCierre').style.display='none'">Cancelar</button>
        </div>
        
        ${botonCerrar}
        
        <hr>
        
        <h6>Comentarios:</h6>
        <div id="commentsSection">Cargando...</div>
        
        <hr>
        
        <div class="mt-3">
            <textarea id="newComment" class="form-control mb-2" placeholder="Agregar comentario..." rows="3"></textarea>
            <input type="file" id="commentFile" class="form-control mb-2">
            <small class="text-muted d-block mb-2">Puedes adjuntar un archivo (máx 50MB)</small>
            <button class="btn btn-primary btn-sm" onclick="addCommentWithFile(${ticket.id})">
                💬 Enviar Comentario
            </button>
        </div>
    `;

  const modal = new bootstrap.Modal(document.getElementById("ticketModal"));
  modal.show();

  loadComments(ticket.id);
}

function mostrarFormularioCierre(ticketId) {
  document.getElementById("formCierre").style.display = "block";
}

async function cerrarTicket(ticketId) {
  const motivo = document.getElementById("motivoCierre").value.trim();

  if (!motivo) {
    alert("⚠️ Debes proporcionar un motivo para cerrar el ticket");
    return;
  }

  if (!confirm("¿Estás seguro de cerrar este ticket?")) {
    return;
  }

  const formData = new FormData();
  formData.append("action", "close");
  formData.append("ticket_id", ticketId);
  formData.append("motivo", motivo);

  try {
    const response = await fetch("php/tickets_api.php", {
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
      alert("✅ Ticket cerrado exitosamente");
      bootstrap.Modal.getInstance(
        document.getElementById("ticketModal"),
      ).hide();
      loadMyTickets();
    } else {
      alert("❌ Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("❌ Error de conexión");
  }
}

async function loadComments(ticketId) {
  try {
    const response = await fetch(
      `php/tickets_api.php?action=get_comments&ticket_id=${ticketId}`,
    );
    const data = await response.json();

    const commentsSection = document.getElementById("commentsSection");

    if (data.success && data.comentarios.length > 0) {
      let html = "";
      data.comentarios.forEach((comment) => {
        const adjuntoHtml = comment.archivo_adjunto
          ? `<br><a href="php/download_file.php?file=${comment.archivo_adjunto}" class="btn btn-sm btn-outline-primary mt-1">
                        📎 Descargar archivo
                    </a>`
          : "";

        html += `
                    <div class="border-bottom pb-2 mb-2">
                        <small class="text-muted">
                            <strong>${escapeHtml(comment.nombre_usuario)}</strong> - 
                            ${formatDate(comment.fecha_envio)}
                        </small>
                        <p class="mb-0">${escapeHtml(comment.mensaje)}${adjuntoHtml}</p>
                    </div>
                `;
      });
      commentsSection.innerHTML = html;
    } else {
      commentsSection.innerHTML =
        '<p class="text-muted">No hay comentarios aún</p>';
    }
  } catch (error) {
    console.error("Error:", error);
    commentsSection.innerHTML =
      '<p class="text-danger">Error al cargar comentarios</p>';
  }
}

async function addCommentWithFile(ticketId) {
  const mensaje = document.getElementById("newComment").value.trim();
  const fileInput = document.getElementById("commentFile");
  const file = fileInput.files[0];

  if (!mensaje && !file) {
    alert("Escribe un comentario o adjunta un archivo");
    return;
  }

  if (file && file.size > 50 * 1024 * 1024) {
    alert("El archivo es demasiado grande. Máximo 50MB");
    return;
  }

  try {
    if (file) {
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("ticket_id", ticketId);
      formData.append("tipo", "comentario");
      formData.append("mensaje", mensaje || `Archivo adjunto: ${file.name}`);

      const response = await fetch("php/upload_file.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        alert("✅ Comentario enviado");
        document.getElementById("newComment").value = "";
        fileInput.value = "";
        loadComments(ticketId);
      } else {
        alert("❌ Error: " + data.message);
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
        loadComments(ticketId);
      } else {
        alert("Error al agregar comentario");
      }
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error de conexión");
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
        <h4 class="mb-4">Mis Estadísticas</h4>
        <div class="row g-3">
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-primary">${s.total || 0}</h2>
                        <p class="text-muted mb-0">Total</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-info">${s.abiertos || 0}</h2>
                        <p class="text-muted mb-0">Abiertos</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-warning">${s.en_proceso || 0}</h2>
                        <p class="text-muted mb-0">En Proceso</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h2 class="text-success">${s.resueltos || 0}</h2>
                        <p class="text-muted mb-0">Resueltos</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ==================== ACTUALIZACIÓN EN TIEMPO REAL ====================

function startAutoUpdate() {
  updateInterval = setInterval(() => {
    if (currentView === "mytickets") {
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
