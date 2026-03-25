// ==================== VARIABLES GLOBALES ====================
let allInventario = [];
let currentInventarioId = null;
let filtrosInventario = {
  tipo: "",
  marca: "",
  modelo: "",
  estado: "",
  sede: "",
  area: "",
  busqueda: "",
};

// ==================== CARGAR INVENTARIO ====================
async function loadInventario() {
  try {
    const response = await fetch("php/inventario_api.php?action=list");
    const data = await response.json();

    console.log("📦 Respuesta del servidor:", data); // ✅ DEBUG

    if (data.success) {
      allInventario = data.items; // ✅ IMPORTANTE
      console.log("✅ Items cargados:", allInventario.length); // ✅ DEBUG
      renderInventario(allInventario);
    } else {
      console.error("❌ Error al cargar inventario:", data.message);
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    alert("Error al cargar inventario");
  }
}

// ==================== RENDERIZAR TABLA ====================
function renderInventario(items) {
  const tbody = document.getElementById("inventarioTableBody");

  if (!tbody) {
    console.error("Elemento inventarioTableBody no encontrado");
    return;
  }

  if (items.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="13" class="text-center text-muted">No hay items en el inventario</td></tr>';
    return;
  }

  let html = "";

  items.forEach((item) => {
    const estadoBadge = getEstadoBadge(item.estado);
    const fechaCompra = item.fecha_compra ? formatDate(item.fecha_compra) : "-";
    const fechaAsignacion = item.fecha_asignacion
      ? formatDate(item.fecha_asignacion)
      : "-";
    const fechaDevolucion = item.fecha_devolucion
      ? formatDate(item.fecha_devolucion)
      : "-";

    // Verificar duplicados de serial/placa
    const duplicadoSerial = allInventario.filter(
      (i) =>
        i.serial === item.serial &&
        i.id !== item.id &&
        i.estado !== item.estado,
    );
    const duplicadoPlaca = allInventario.filter(
      (i) =>
        i.placa === item.placa && i.id !== item.id && i.estado !== item.estado,
    );

    const alertaSerial =
      duplicadoSerial.length > 0
        ? '<i class="bi bi-exclamation-triangle-fill text-warning ms-1" title="Serial duplicado en otro estado"></i>'
        : "";
    const alertaPlaca =
      duplicadoPlaca.length > 0
        ? '<i class="bi bi-exclamation-triangle-fill text-warning ms-1" title="Placa duplicada en otro estado"></i>'
        : "";

    html += `
      <tr>
        <td>${item.tipo_nombre || "-"}</td>
        <td>${item.marca_nombre || "-"}</td>
        <td>${item.modelo_nombre || "-"}</td>
        <td>${item.serial}${alertaSerial}</td>
        <td>${item.placa}${alertaPlaca}</td>
        <td class="text-center">${fechaCompra}</td>
        <td class="text-center">${fechaAsignacion}</td>
        <td class="text-center">${fechaDevolucion}</td>
        <td>${item.sede_nombre || "-"}</td>
        <td>${item.sede_nombre || "-"}</td>
        <td>${item.area_nombre || "-"}</td>
        <td>${item.usuario_asignado_nombre || "-"}</td>
        <td class="text-center"><span class="badge ${estadoBadge}">${formatEstado(item.estado)}</span></td>
        <td class="text-center">
  <button class="btn btn-sm btn-primary me-1" onclick="viewInventarioDetail(${item.id})" title="Ver detalles">
    <i class="bi bi-eye"></i>
  </button>
  ${
    canDeleteInventario()
      ? `
    <button class="btn btn-sm btn-danger" onclick="deleteInventario(${item.id})" title="Eliminar">
      <i class="bi bi-trash"></i>
    </button>
  `
      : ""
  }
</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Actualizar contador
  const contador = document.getElementById("inventarioCount");
  if (contador) {
    contador.textContent = items.length;
  }
}

// ==================== VERIFICAR PERMISOS ====================
function canEditInventario() {
  const rol = parseInt(sessionStorage.getItem("id_rol_admin")) || 4;
  return rol <= 2; // Super Admin (1) o Admin Intermedio (2)
}

function canDeleteInventario() {
  const rol = parseInt(sessionStorage.getItem("id_rol_admin")) || 4;
  return rol === 1; // Solo Super Admin
}

// ==================== MOSTRAR MODAL CREAR/EDITAR ====================
async function showCreateInventarioModal() {
  currentInventarioId = null;
  document.getElementById("modalInventarioTitle").textContent =
    "Crear Nuevo Item";
  document.getElementById("formInventario").reset();

  // Cargar catálogos
  await loadCatalogos();

  initInventarioListeners();

  const modal = new bootstrap.Modal(document.getElementById("modalInventario"));
  modal.show();
}

async function editInventario(id) {
  try {
    console.log("🔧 Editando item ID:", id);
    console.log("📊 Total items en memoria:", allInventario.length);

    currentInventarioId = id;

    const modalTitle = document.getElementById("modalInventarioTitle");
    if (!modalTitle) {
      throw new Error("Modal no encontrado");
    }

    modalTitle.textContent = "Editar Item";

    // ✅ Si no está en memoria, obtenerlo del servidor
    let item = allInventario.find((i) => i.id == id); // Usar == en lugar de ===

    if (!item) {
      console.warn("⚠️ Item no encontrado en memoria, consultando servidor...");

      const response = await fetch(
        `php/inventario_api.php?action=get&id=${id}`,
      );
      const data = await response.json();

      if (data.success && data.item) {
        item = data.item;
      } else {
        alert("Error: Item no encontrado");
        return;
      }
    }

    console.log("✅ Item encontrado:", item);

    // Cargar catálogos primero
    await loadCatalogos();

    // Llenar formulario (resto del código igual)
    setTimeout(() => {
      const invTipo = document.getElementById("inv_tipo");
      const invMarca = document.getElementById("inv_marca");
      const invModelo = document.getElementById("inv_modelo");
      const invSerial = document.getElementById("inv_serial");
      const invPlaca = document.getElementById("inv_placa");
      const invFechaCompra = document.getElementById("inv_fecha_compra");
      const invFechaAsignacion = document.getElementById(
        "inv_fecha_asignacion",
      );
      const invFechaDevolucion = document.getElementById(
        "inv_fecha_devolucion",
      );
      const invSede = document.getElementById("inv_sede");
      const invArea = document.getElementById("inv_area");
      const invUsuario = document.getElementById("inv_usuario");
      const invEstado = document.getElementById("inv_estado");
      const invObservaciones = document.getElementById("inv_observaciones");

      if (invTipo) invTipo.value = item.id_tipo || "";
      if (invMarca) invMarca.value = item.id_marca || "";

      if (item.id_marca) {
        loadModelosByMarca(item.id_marca).then(() => {
          if (invModelo) invModelo.value = item.id_modelo || "";
        });
      }

      if (invSerial) invSerial.value = item.serial || "";
      if (invPlaca) invPlaca.value = item.placa || "";
      if (invFechaCompra) invFechaCompra.value = item.fecha_compra || "";
      if (invFechaAsignacion)
        invFechaAsignacion.value = item.fecha_asignacion || "";
      if (invFechaDevolucion)
        invFechaDevolucion.value = item.fecha_devolucion || "";
      if (invSede) invSede.value = item.id_sede || "";
      if (invArea) invArea.value = item.id_area || "";
      if (invUsuario) invUsuario.value = item.id_usuario_asignado || "";
      if (invEstado) invEstado.value = item.estado || "en_bodega";
      if (invObservaciones) invObservaciones.value = item.observaciones || "";

      initInventarioListeners();
    }, 200);

    const modal = new bootstrap.Modal(
      document.getElementById("modalInventario"),
    );
    modal.show();
  } catch (error) {
    console.error("❌ Error completo:", error);
    alert("Error: " + error.message);
  }
}

// ==================== CARGAR CATÁLOGOS ====================
async function loadCatalogos() {
  try {
    // Cargar tipos
    const resTipos = await fetch("php/inventario_api.php?action=get_tipos");
    const dataTipos = await resTipos.json();
    if (dataTipos.success) {
      const invTipo = document.getElementById("inv_tipo");
      const filtroTipo = document.getElementById("filtro_tipo");

      if (invTipo) fillSelect("inv_tipo", dataTipos.tipos);
      if (filtroTipo) fillSelect("filtro_tipo", dataTipos.tipos, true);
    }

    // Cargar marcas
    const resMarcas = await fetch("php/inventario_api.php?action=get_marcas");
    const dataMarcas = await resMarcas.json();
    if (dataMarcas.success) {
      const invMarca = document.getElementById("inv_marca");
      const filtroMarca = document.getElementById("filtro_marca");

      if (invMarca) fillSelect("inv_marca", dataMarcas.marcas);
      if (filtroMarca) fillSelect("filtro_marca", dataMarcas.marcas, true);
    }

    // Cargar sedes
    const resSedes = await fetch("php/inventario_api.php?action=get_sedes");
    const dataSedes = await resSedes.json();
    if (dataSedes.success) {
      const invSede = document.getElementById("inv_sede");
      const filtroSede = document.getElementById("filtro_sede");

      if (invSede) fillSelect("inv_sede", dataSedes.sedes);
      if (filtroSede) fillSelect("filtro_sede", dataSedes.sedes, true);
    }

    // Cargar áreas
    const resAreas = await fetch("php/inventario_api.php?action=get_areas");
    const dataAreas = await resAreas.json();
    if (dataAreas.success) {
      const invArea = document.getElementById("inv_area");
      const filtroArea = document.getElementById("filtro_area");

      if (invArea) fillSelect("inv_area", dataAreas.areas);
      if (filtroArea) fillSelect("filtro_area", dataAreas.areas, true);
    }

    // Cargar usuarios
    const resUsers = await fetch("php/user_api.php?action=list");
    const dataUsers = await resUsers.json();
    if (dataUsers.success) {
      const select = document.getElementById("inv_usuario");
      if (select) {
        select.innerHTML = '<option value="">Sin asignar</option>';
        dataUsers.usuarios.forEach((u) => {
          select.innerHTML += `<option value="${u.id}">${u.primer_nombre} ${u.primer_apellido}</option>`;
        });
      }
    }
  } catch (error) {
    console.error("Error al cargar catálogos:", error);
  }
}

function fillSelect(selectId, items, addEmpty = false) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = addEmpty
    ? '<option value="">Todos</option>'
    : '<option value="">Seleccione...</option>';

  items.forEach((item) => {
    select.innerHTML += `<option value="${item.id}">${item.nombre}</option>`;
  });
}

// ==================== CARGAR MODELOS POR MARCA ====================
async function loadModelosByMarca(idMarca) {
  if (!idMarca) {
    document.getElementById("inv_modelo").innerHTML =
      '<option value="">Seleccione primero una marca</option>';
    return;
  }

  try {
    const response = await fetch(
      `php/inventario_api.php?action=get_modelos&id_marca=${idMarca}`,
    );
    const data = await response.json();

    if (data.success) {
      fillSelect("inv_modelo", data.modelos);
    }
  } catch (error) {
    console.error("Error al cargar modelos:", error);
  }
}

// Event listener para cambio de marca
function initInventarioListeners() {
  const marcaSelect = document.getElementById("inv_marca");
  if (marcaSelect && !marcaSelect.dataset.listenerAdded) {
    marcaSelect.addEventListener("change", (e) => {
      loadModelosByMarca(e.target.value);
    });
    marcaSelect.dataset.listenerAdded = "true";
  }
}

// ==================== GUARDAR INVENTARIO ====================
async function saveInventario() {
  const formData = new FormData();
  formData.append("action", currentInventarioId ? "update" : "create");

  if (currentInventarioId) {
    formData.append("id", currentInventarioId);
  }

  formData.append("id_tipo", document.getElementById("inv_tipo").value);
  formData.append("id_marca", document.getElementById("inv_marca").value);
  formData.append("id_modelo", document.getElementById("inv_modelo").value);
  formData.append("serial", document.getElementById("inv_serial").value);
  formData.append("placa", document.getElementById("inv_placa").value);
  formData.append(
    "fecha_compra",
    document.getElementById("inv_fecha_compra").value,
  );
  formData.append(
    "fecha_asignacion",
    document.getElementById("inv_fecha_asignacion").value,
  );
  formData.append(
    "fecha_devolucion",
    document.getElementById("inv_fecha_devolucion").value,
  );
  formData.append("id_sede", document.getElementById("inv_sede").value);
  formData.append("id_area", document.getElementById("inv_area").value);
  formData.append(
    "id_usuario_asignado",
    document.getElementById("inv_usuario").value,
  );
  formData.append("estado", document.getElementById("inv_estado").value);
  formData.append(
    "observaciones",
    document.getElementById("inv_observaciones").value,
  );

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert(
        currentInventarioId
          ? "Item actualizado correctamente"
          : "Item creado correctamente",
      );
      bootstrap.Modal.getInstance(
        document.getElementById("modalInventario"),
      ).hide();
      loadInventario();
    } else if (data.warning) {
      // Duplicado en otro estado - confirmar
      if (confirm(`${data.message}\n\n¿Desea continuar de todos modos?`)) {
        formData.append("force", "1");
        // Reenviar con force
        const response2 = await fetch("php/inventario_api.php", {
          method: "POST",
          body: formData,
        });
        const data2 = await response2.json();
        if (data2.success) {
          alert("Item creado correctamente");
          bootstrap.Modal.getInstance(
            document.getElementById("modalInventario"),
          ).hide();
          loadInventario();
        }
      }
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar");
  }
}

// ==================== ELIMINAR INVENTARIO ====================
async function deleteInventario(id) {
  if (!confirm("¿Está seguro de eliminar este item del inventario?")) {
    return;
  }

  const formData = new FormData();
  formData.append("action", "delete");
  formData.append("id", id);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      alert("Item eliminado correctamente");
      loadInventario();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// ==================== VER DETALLE CON HISTORIAL ====================
async function viewInventarioDetail(id) {
  try {
    console.log("👁️ Viendo detalle de item:", id);

    // Buscar item en memoria o traerlo del servidor
    let item = allInventario.find((i) => i.id == id);

    if (!item) {
      console.warn("⚠️ Item no encontrado en memoria, consultando servidor...");
      const response = await fetch(
        `php/inventario_api.php?action=get&id=${id}`,
      );
      const data = await response.json();

      if (data.success && data.item) {
        item = data.item;
      } else {
        alert("Error: Item no encontrado");
        return;
      }
    }

    console.log("✅ Item encontrado:", item);

    // Cargar historial
    const responseHist = await fetch(
      `php/inventario_api.php?action=get_historial&id_inventario=${id}`,
    );
    const dataHist = await responseHist.json();

    let historialHtml = "";
    if (dataHist.success && dataHist.historial.length > 0) {
      dataHist.historial.forEach((h) => {
        const fecha = formatDateTime(h.fecha);
        let descripcion = "";

        if (h.accion === "creacion") {
          descripcion = "✅ Item creado";
        } else if (h.accion === "modificacion") {
          descripcion = `📝 ${h.campo_modificado}: "${h.valor_anterior}" → "${h.valor_nuevo}"`;
        } else if (h.accion === "eliminacion") {
          descripcion = "🗑️ Item eliminado";
        }

        historialHtml += `
          <div class="border-start border-3 border-primary ps-3 mb-3">
            <small class="text-muted">${fecha} - ${h.usuario_nombre}</small>
            <p class="mb-0">${descripcion}</p>
          </div>
        `;
      });
    } else {
      historialHtml = '<p class="text-muted">No hay cambios registrados</p>';
    }

    // Mostrar modal con detalles
    const modalBody = `
  <div class="d-flex justify-content-end mb-3">
    ${
      canEditInventario()
        ? `
      <button class="btn btn-warning btn-sm" onclick="editInventarioFromDetail(${item.id})">
        <i class="bi bi-pencil"></i> Editar
      </button>
    `
        : ""
    }
  </div>
  <div class="row">
    <div class="col-md-6">
      <h6>Información General</h6>
      <p><strong>ID:</strong> ${item.id}</p>
      <p><strong>Tipo:</strong> ${item.tipo_nombre || "-"}</p>
      <p><strong>Marca:</strong> ${item.marca_nombre || "-"}</p>
      <p><strong>Modelo:</strong> ${item.modelo_nombre || "-"}</p>
      <p><strong>Serial:</strong> ${item.serial}</p>
      <p><strong>Placa:</strong> ${item.placa}</p>
      <p><strong>Estado:</strong> <span class="badge ${getEstadoBadge(item.estado)}">${formatEstado(item.estado)}</span></p>
    </div>
    <div class="col-md-6">
      <h6>Asignación</h6>
      <p><strong>Fecha Compra:</strong> ${item.fecha_compra ? formatDate(item.fecha_compra) : "-"}</p>
      <p><strong>Fecha Asignación:</strong> ${item.fecha_asignacion ? formatDate(item.fecha_asignacion) : "-"}</p>
      <p><strong>Fecha Devolución:</strong> ${item.fecha_devolucion ? formatDate(item.fecha_devolucion) : "-"}</p>
      <p><strong>Ciudad:</strong> ${item.sede_ciudad || "-"}</p>
      <p><strong>Sede:</strong> ${item.sede_nombre || "-"}</p>
      <p><strong>Área:</strong> ${item.area_nombre || "-"}</p>
      <p><strong>Usuario:</strong> ${item.usuario_asignado_nombre || "-"}</p>
    </div>
  </div>
  <div class="row mt-3">
    <div class="col-12">
      <h6>Observaciones</h6>
      <p>${item.observaciones || "Sin observaciones"}</p>
    </div>
  </div>
  <hr>
  <h6>Historial de Cambios</h6>
  ${historialHtml}
`;

    const modalDetailBody = document.getElementById("modalDetailBody");
    if (modalDetailBody) {
      modalDetailBody.innerHTML = modalBody;
      const modal = new bootstrap.Modal(
        document.getElementById("modalInventarioDetail"),
      );
      modal.show();
    } else {
      console.error("❌ modalDetailBody no encontrado");
      alert("Error al mostrar detalle");
    }
  } catch (error) {
    console.error("❌ Error al cargar detalle:", error);
    alert("Error al cargar detalle: " + error.message);
  }
}

// ==================== FILTROS ====================
function aplicarFiltrosInventario() {
  filtrosInventario.tipo = document.getElementById("filtro_tipo").value;
  filtrosInventario.marca = document.getElementById("filtro_marca").value;
  filtrosInventario.estado = document.getElementById("filtro_estado").value;
  filtrosInventario.sede = document.getElementById("filtro_sede").value;
  filtrosInventario.area = document.getElementById("filtro_area").value;
  filtrosInventario.busqueda = document
    .getElementById("filtro_busqueda")
    .value.toLowerCase();

  let filtered = allInventario.filter((item) => {
    if (filtrosInventario.tipo && item.id_tipo != filtrosInventario.tipo)
      return false;
    if (filtrosInventario.marca && item.id_marca != filtrosInventario.marca)
      return false;
    if (filtrosInventario.estado && item.estado != filtrosInventario.estado)
      return false;
    if (filtrosInventario.sede && item.id_sede != filtrosInventario.sede)
      return false;
    if (filtrosInventario.area && item.id_area != filtrosInventario.area)
      return false;

    if (filtrosInventario.busqueda) {
      const searchText =
        `${item.serial} ${item.placa} ${item.tipo_nombre} ${item.marca_nombre} ${item.modelo_nombre}`.toLowerCase();
      if (!searchText.includes(filtrosInventario.busqueda)) return false;
    }

    return true;
  });

  renderInventario(filtered);
}

function limpiarFiltrosInventario() {
  document.getElementById("filtro_tipo").value = "";
  document.getElementById("filtro_marca").value = "";
  document.getElementById("filtro_estado").value = "";
  document.getElementById("filtro_sede").value = "";
  document.getElementById("filtro_area").value = "";
  document.getElementById("filtro_busqueda").value = "";

  filtrosInventario = {
    tipo: "",
    marca: "",
    modelo: "",
    estado: "",
    sede: "",
    area: "",
    busqueda: "",
  };

  renderInventario(allInventario);
}

// ==================== HELPERS ====================
function getEstadoBadge(estado) {
  const badges = {
    activo: "bg-success",
    disposicion: "bg-danger",
    en_bodega: "bg-secondary",
    custodia: "bg-warning text-dark",
  };
  return badges[estado] || "bg-secondary";
}

function formatEstado(estado) {
  const estados = {
    activo: "Activo",
    disposicion: "Disposición",
    en_bodega: "En Bodega",
    custodia: "Custodia",
  };
  return estados[estado] || estado;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO");
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("es-CO");
}

// ==================== EXPORTAR A EXCEL ====================
function exportarInventarioExcel() {
  window.location.href = "php/exportar_inventario_excel.php";
}

// Función para abrir editar desde el modal de detalle
function editInventarioFromDetail(id) {
  // Cerrar modal de detalle
  const modalDetail = bootstrap.Modal.getInstance(
    document.getElementById("modalInventarioDetail"),
  );
  if (modalDetail) {
    modalDetail.hide();
  }

  // Esperar a que se cierre y abrir modal de editar
  setTimeout(() => {
    editInventario(id);
  }, 300);
}

let catalogosTipos = [];
let catalogosMarcas = [];
let catalogosModelos = [];
let catalogosSedes = [];
let catalogosAreas = [];

// Renderizar vista de catálogos
function renderCatalogosView() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="row">
      <div class="col-12 mb-3">
        <h4>⚙️ Gestión de Catálogos</h4>
        <p class="text-muted">Administre tipos de activos, marcas, modelos, sedes y áreas</p>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs" id="catalogosTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="tipos-tab" data-bs-toggle="tab" data-bs-target="#tipos" type="button">
          📦 Tipos
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="marcas-tab" data-bs-toggle="tab" data-bs-target="#marcas" type="button">
          🏷️ Marcas
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="modelos-tab" data-bs-toggle="tab" data-bs-target="#modelos" type="button">
          🔧 Modelos
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="sedes-tab" data-bs-toggle="tab" data-bs-target="#sedes" type="button">
          🏢 Sedes
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="areas-tab" data-bs-toggle="tab" data-bs-target="#areas" type="button">
          🗂️ Áreas
        </button>
      </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content mt-3" id="catalogosTabContent">
      
      <!-- TIPOS -->
      <div class="tab-pane fade show active" id="tipos" role="tabpanel">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Tipos de Activos</h6>
            <button class="btn btn-primary btn-sm" onclick="showModalCrearTipo()">
              ➕ Nuevo Tipo
            </button>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="tiposTableBody">
                <tr><td colspan="4" class="text-center">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MARCAS -->
      <div class="tab-pane fade" id="marcas" role="tabpanel">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Marcas</h6>
            <button class="btn btn-primary btn-sm" onclick="showModalCrearMarca()">
              ➕ Nueva Marca
            </button>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="marcasTableBody">
                <tr><td colspan="4" class="text-center">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- MODELOS -->
      <div class="tab-pane fade" id="modelos" role="tabpanel">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Modelos</h6>
            <button class="btn btn-primary btn-sm" onclick="showModalCrearModelo()">
              ➕ Nuevo Modelo
            </button>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="modelosTableBody">
                <tr><td colspan="5" class="text-center">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- SEDES -->
      <div class="tab-pane fade" id="sedes" role="tabpanel">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Sedes</h6>
            <button class="btn btn-primary btn-sm" onclick="showModalCrearSede()">
              ➕ Nueva Sede
            </button>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="sedesTableBody">
                <tr><td colspan="6" class="text-center">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ÁREAS -->
      <div class="tab-pane fade" id="areas" role="tabpanel">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0">Áreas</h6>
            <button class="btn btn-primary btn-sm" onclick="showModalCrearArea()">
              ➕ Nueva Área
            </button>
          </div>
          <div class="card-body">
            <table class="table table-sm table-hover">
              <thead class="table-light">
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody id="areasTableBody">
                <tr><td colspan="3" class="text-center">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  `;
}

// ==================== CARGAR CATÁLOGOS ====================

async function loadCatalogosAdmin() {
  await Promise.all([
    loadTiposAdmin(),
    loadMarcasAdmin(),
    loadModelosAdmin(),
    loadSedesAdmin(),
    loadAreasAdmin(),
  ]);
}

async function loadTiposAdmin() {
  try {
    const response = await fetch("php/inventario_api.php?action=get_all_tipos");
    const data = await response.json();

    if (data.success) {
      catalogosTipos = data.tipos;
      renderTiposTable();
    }
  } catch (error) {
    console.error("Error al cargar tipos:", error);
  }
}

async function loadMarcasAdmin() {
  try {
    const response = await fetch(
      "php/inventario_api.php?action=get_all_marcas",
    );
    const data = await response.json();

    if (data.success) {
      catalogosMarcas = data.marcas;
      renderMarcasTable();
    }
  } catch (error) {
    console.error("Error al cargar marcas:", error);
  }
}

async function loadModelosAdmin() {
  try {
    const response = await fetch(
      "php/inventario_api.php?action=get_all_modelos",
    );
    const data = await response.json();

    if (data.success) {
      catalogosModelos = data.modelos;
      renderModelosTable();
    }
  } catch (error) {
    console.error("Error al cargar modelos:", error);
  }
}

async function loadSedesAdmin() {
  try {
    const response = await fetch("php/inventario_api.php?action=get_all_sedes");
    const data = await response.json();

    if (data.success) {
      catalogosSedes = data.sedes;
      renderSedesTable();
    }
  } catch (error) {
    console.error("Error al cargar sedes:", error);
  }
}

async function loadAreasAdmin() {
  try {
    const response = await fetch("php/inventario_api.php?action=get_all_areas");
    const data = await response.json();

    if (data.success) {
      catalogosAreas = data.areas;
      renderAreasTable();
    }
  } catch (error) {
    console.error("Error al cargar áreas:", error);
  }
}

// ==================== RENDERIZAR TABLAS ====================

function renderTiposTable() {
  const tbody = document.getElementById("tiposTableBody");
  if (!tbody) return;

  let html = "";
  catalogosTipos.forEach((tipo) => {
    html += `
      <tr>
        <td>${tipo.id}</td>
        <td>${tipo.nombre}</td>
        <td><span class="badge ${tipo.activo ? "bg-success" : "bg-secondary"}">${tipo.activo ? "Activo" : "Inactivo"}</span></td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editarTipo(${tipo.id})" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm ${tipo.activo ? "btn-danger" : "btn-success"}" onclick="toggleActivoTipo(${tipo.id})" title="${tipo.activo ? "Desactivar" : "Activar"}">
            <i class="bi ${tipo.activo ? "bi-toggle-on" : "bi-toggle-off"}"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderMarcasTable() {
  const tbody = document.getElementById("marcasTableBody");
  if (!tbody) return;

  let html = "";
  catalogosMarcas.forEach((marca) => {
    html += `
      <tr>
        <td>${marca.id}</td>
        <td>${marca.nombre}</td>
        <td><span class="badge ${marca.activo ? "bg-success" : "bg-secondary"}">${marca.activo ? "Activo" : "Inactivo"}</span></td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editarMarca(${marca.id})" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm ${marca.activo ? "btn-danger" : "btn-success"}" onclick="toggleActivoMarca(${marca.id})" title="${marca.activo ? "Desactivar" : "Activar"}">
            <i class="bi ${marca.activo ? "bi-toggle-on" : "bi-toggle-off"}"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderModelosTable() {
  const tbody = document.getElementById("modelosTableBody");
  if (!tbody) return;

  let html = "";
  catalogosModelos.forEach((modelo) => {
    const marca = catalogosMarcas.find((m) => m.id == modelo.id_marca);
    html += `
      <tr>
        <td>${modelo.id}</td>
        <td>${modelo.nombre}</td>
        <td>${marca ? marca.nombre : "-"}</td>
        <td><span class="badge ${modelo.activo ? "bg-success" : "bg-secondary"}">${modelo.activo ? "Activo" : "Inactivo"}</span></td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editarModelo(${modelo.id})" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm ${modelo.activo ? "btn-danger" : "btn-success"}" onclick="toggleActivoModelo(${modelo.id})" title="${modelo.activo ? "Desactivar" : "Activar"}">
            <i class="bi ${modelo.activo ? "bi-toggle-on" : "bi-toggle-off"}"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderSedesTable() {
  const tbody = document.getElementById("sedesTableBody");
  if (!tbody) return;

  let html = "";
  catalogosSedes.forEach((sede) => {
    html += `
      <tr>
        <td>${sede.id}</td>
        <td>${sede.nombre}</td>
        <td>${sede.ciudad || "-"}</td>
        <td>${sede.direccion || "-"}</td>
        <td><span class="badge ${sede.activo ? "bg-success" : "bg-secondary"}">${sede.activo ? "Activo" : "Inactivo"}</span></td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editarSede(${sede.id})" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm ${sede.activo ? "btn-danger" : "btn-success"}" onclick="toggleActivoSede(${sede.id})" title="${sede.activo ? "Desactivar" : "Activar"}">
            <i class="bi ${sede.activo ? "bi-toggle-on" : "bi-toggle-off"}"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderAreasTable() {
  const tbody = document.getElementById("areasTableBody");
  if (!tbody) return;

  let html = "";
  catalogosAreas.forEach((area) => {
    html += `
      <tr>
        <td>${area.id}</td>
        <td>${area.nombre}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editarArea(${area.id})" title="Editar">
            <i class="bi bi-pencil"></i>
          </button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

// ==================== MODALES CREAR ====================

function showModalCrearTipo() {
  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Tipo de Activo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Nombre</label>
            <input type="text" id="inputNombreCatalogo" class="form-control" placeholder="Ej: Tablet">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarTipo()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function showModalCrearMarca() {
  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Marca</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Nombre</label>
            <input type="text" id="inputNombreCatalogo" class="form-control" placeholder="Ej: Microsoft">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarMarca()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function showModalCrearModelo() {
  let marcasOptions = "";
  catalogosMarcas
    .filter((m) => m.activo)
    .forEach((m) => {
      marcasOptions += `<option value="${m.id}">${m.nombre}</option>`;
    });

  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Modelo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Marca</label>
              <select id="inputMarcaCatalogo" class="form-select">
                <option value="">Seleccione...</option>
                ${marcasOptions}
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nombre del Modelo</label>
              <input type="text" id="inputNombreCatalogo" class="form-control" placeholder="Ej: Surface Pro 9">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarModelo()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function showModalCrearSede() {
  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Sede</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input type="text" id="inputNombreCatalogo" class="form-control" placeholder="Ej: Sede Centro">
            </div>
            <div class="mb-3">
              <label class="form-label">Ciudad</label>
              <input type="text" id="inputCiudadCatalogo" class="form-control" placeholder="Ej: Bogotá">
            </div>
            <div class="mb-3">
              <label class="form-label">Dirección</label>
              <input type="text" id="inputDireccionCatalogo" class="form-control" placeholder="Ej: Calle 123 #45-67">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarSede()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function showModalCrearArea() {
  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Crear Área</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Nombre</label>
            <input type="text" id="inputNombreCatalogo" class="form-control" placeholder="Ej: Recursos Humanos">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="guardarArea()">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

// ==================== GUARDAR ====================

async function guardarTipo() {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "create_tipo");
  formData.append("nombre", nombre);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Tipo creado correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadTiposAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar");
  }
}

async function guardarMarca() {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "create_marca");
  formData.append("nombre", nombre);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Marca creada correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadMarcasAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar");
  }
}

async function guardarModelo() {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  const id_marca = document.getElementById("inputMarcaCatalogo").value;

  if (!nombre || !id_marca) {
    alert("Complete todos los campos");
    return;
  }

  const formData = new FormData();
  formData.append("action", "create_modelo");
  formData.append("nombre", nombre);
  formData.append("id_marca", id_marca);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Modelo creado correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadModelosAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar");
  }
}

async function guardarSede() {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  const ciudad = document.getElementById("inputCiudadCatalogo").value.trim();
  const direccion = document
    .getElementById("inputDireccionCatalogo")
    .value.trim();

  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "create_sede");
  formData.append("nombre", nombre);
  formData.append("ciudad", ciudad);
  formData.append("direccion", direccion);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Sede creada correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadSedesAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar");
  }
}

async function guardarArea() {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "create_area");
  formData.append("nombre", nombre);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Área creada correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadAreasAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al guardar");
  }
}

// ==================== TOGGLE ACTIVO ====================

async function toggleActivoTipo(id) {
  const tipo = catalogosTipos.find((t) => t.id == id);
  if (!tipo) return;

  if (!confirm(`¿${tipo.activo ? "Desactivar" : "Activar"} este tipo?`)) return;

  const formData = new FormData();
  formData.append("action", "toggle_tipo");
  formData.append("id", id);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      loadTiposAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function toggleActivoMarca(id) {
  const marca = catalogosMarcas.find((m) => m.id == id);
  if (!marca) return;

  if (!confirm(`¿${marca.activo ? "Desactivar" : "Activar"} esta marca?`))
    return;

  const formData = new FormData();
  formData.append("action", "toggle_marca");
  formData.append("id", id);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      loadMarcasAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function toggleActivoModelo(id) {
  const modelo = catalogosModelos.find((m) => m.id == id);
  if (!modelo) return;

  if (!confirm(`¿${modelo.activo ? "Desactivar" : "Activar"} este modelo?`))
    return;

  const formData = new FormData();
  formData.append("action", "toggle_modelo");
  formData.append("id", id);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      loadModelosAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function toggleActivoSede(id) {
  const sede = catalogosSedes.find((s) => s.id == id);
  if (!sede) return;

  if (!confirm(`¿${sede.activo ? "Desactivar" : "Activar"} esta sede?`)) return;

  const formData = new FormData();
  formData.append("action", "toggle_sede");
  formData.append("id", id);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      loadSedesAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
// ==================== FUNCIONES DE EDICIÓN ====================

function editarTipo(id) {
  const tipo = catalogosTipos.find((t) => t.id == id);
  if (!tipo) return;

  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Tipo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Nombre</label>
            <input type="text" id="inputNombreCatalogo" class="form-control" value="${tipo.nombre}">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="actualizarTipo(${id})">Actualizar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function editarMarca(id) {
  const marca = catalogosMarcas.find((m) => m.id == id);
  if (!marca) return;

  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Marca</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Nombre</label>
            <input type="text" id="inputNombreCatalogo" class="form-control" value="${marca.nombre}">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="actualizarMarca(${id})">Actualizar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function editarModelo(id) {
  const modelo = catalogosModelos.find((m) => m.id == id);
  if (!modelo) return;

  let marcasOptions = "";
  catalogosMarcas
    .filter((m) => m.activo)
    .forEach((m) => {
      const selected = m.id == modelo.id_marca ? "selected" : "";
      marcasOptions += `<option value="${m.id}" ${selected}>${m.nombre}</option>`;
    });

  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Modelo</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Marca</label>
              <select id="inputMarcaCatalogo" class="form-select">
                ${marcasOptions}
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Nombre del Modelo</label>
              <input type="text" id="inputNombreCatalogo" class="form-control" value="${modelo.nombre}">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="actualizarModelo(${id})">Actualizar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function editarSede(id) {
  const sede = catalogosSedes.find((s) => s.id == id);
  if (!sede) return;

  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Sede</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Nombre</label>
              <input type="text" id="inputNombreCatalogo" class="form-control" value="${sede.nombre}">
            </div>
            <div class="mb-3">
              <label class="form-label">Ciudad</label>
              <input type="text" id="inputCiudadCatalogo" class="form-control" value="${sede.ciudad || ""}">
            </div>
            <div class="mb-3">
              <label class="form-label">Dirección</label>
              <input type="text" id="inputDireccionCatalogo" class="form-control" value="${sede.direccion || ""}">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="actualizarSede(${id})">Actualizar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

function editarArea(id) {
  const area = catalogosAreas.find((a) => a.id == id);
  if (!area) return;

  const modalHtml = `
    <div class="modal fade" id="modalCatalogoTemp" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Área</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label class="form-label">Nombre</label>
            <input type="text" id="inputNombreCatalogo" class="form-control" value="${area.nombre}">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="actualizarArea(${id})">Actualizar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  const modal = new bootstrap.Modal(
    document.getElementById("modalCatalogoTemp"),
  );
  modal.show();

  document
    .getElementById("modalCatalogoTemp")
    .addEventListener("hidden.bs.modal", function () {
      this.remove();
    });
}

// ==================== FUNCIONES DE ACTUALIZACIÓN ====================

async function actualizarTipo(id) {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "update_tipo");
  formData.append("id", id);
  formData.append("nombre", nombre);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Tipo actualizado correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadTiposAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al actualizar");
  }
}

async function actualizarMarca(id) {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "update_marca");
  formData.append("id", id);
  formData.append("nombre", nombre);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Marca actualizada correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadMarcasAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al actualizar");
  }
}

async function actualizarModelo(id) {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  const id_marca = document.getElementById("inputMarcaCatalogo").value;

  if (!nombre || !id_marca) {
    alert("Complete todos los campos");
    return;
  }

  const formData = new FormData();
  formData.append("action", "update_modelo");
  formData.append("id", id);
  formData.append("nombre", nombre);
  formData.append("id_marca", id_marca);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Modelo actualizado correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadModelosAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al actualizar");
  }
}

async function actualizarSede(id) {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  const ciudad = document.getElementById("inputCiudadCatalogo").value.trim();
  const direccion = document
    .getElementById("inputDireccionCatalogo")
    .value.trim();

  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "update_sede");
  formData.append("id", id);
  formData.append("nombre", nombre);
  formData.append("ciudad", ciudad);
  formData.append("direccion", direccion);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Sede actualizada correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadSedesAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al actualizar");
  }
}

async function actualizarArea(id) {
  const nombre = document.getElementById("inputNombreCatalogo").value.trim();
  if (!nombre) {
    alert("Ingrese un nombre");
    return;
  }

  const formData = new FormData();
  formData.append("action", "update_area");
  formData.append("id", id);
  formData.append("nombre", nombre);

  try {
    const response = await fetch("php/inventario_api.php", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (data.success) {
      alert("Área actualizada correctamente");
      bootstrap.Modal.getInstance(
        document.getElementById("modalCatalogoTemp"),
      ).hide();
      loadAreasAdmin();
    } else {
      alert("Error: " + data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al actualizar");
  }
}
