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

    if (data.success) {
      allInventario = data.items;
      renderInventario(allInventario);
      console.log("✅ Inventario cargado:", allInventario.length, "items");
    } else {
      console.error("Error al cargar inventario:", data.message);
    }
  } catch (error) {
    console.error("Error:", error);
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
      '<tr><td colspan="14" class="text-center text-muted">No hay items en el inventario</td></tr>';
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
            canEditInventario()
              ? `
            <button class="btn btn-sm btn-warning me-1" onclick="editInventario(${item.id})" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
          `
              : ""
          }
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

  const modal = new bootstrap.Modal(document.getElementById("modalInventario"));
  modal.show();
}

async function editInventario(id) {
  currentInventarioId = id;
  document.getElementById("modalInventarioTitle").textContent = "Editar Item";

  const item = allInventario.find((i) => i.id === id);
  if (!item) return;

  // Cargar catálogos
  await loadCatalogos();

  // Llenar formulario
  document.getElementById("inv_tipo").value = item.id_tipo || "";
  document.getElementById("inv_marca").value = item.id_marca || "";

  // Esperar a que carguen los modelos
  await loadModelosByMarca(item.id_marca);
  document.getElementById("inv_modelo").value = item.id_modelo || "";

  document.getElementById("inv_serial").value = item.serial || "";
  document.getElementById("inv_placa").value = item.placa || "";
  document.getElementById("inv_fecha_compra").value = item.fecha_compra || "";
  document.getElementById("inv_fecha_asignacion").value =
    item.fecha_asignacion || "";
  document.getElementById("inv_fecha_devolucion").value =
    item.fecha_devolucion || "";
  document.getElementById("inv_sede").value = item.id_sede || "";
  document.getElementById("inv_area").value = item.id_area || "";
  document.getElementById("inv_usuario").value = item.id_usuario_asignado || "";
  document.getElementById("inv_estado").value = item.estado || "en_bodega";
  document.getElementById("inv_observaciones").value = item.observaciones || "";

  const modal = new bootstrap.Modal(document.getElementById("modalInventario"));
  modal.show();
}

// ==================== CARGAR CATÁLOGOS ====================
async function loadCatalogos() {
  try {
    // Cargar tipos
    const resTipos = await fetch("php/inventario_api.php?action=get_tipos");
    const dataTipos = await resTipos.json();
    if (dataTipos.success) {
      fillSelect("inv_tipo", dataTipos.tipos);
      fillSelect("filtro_tipo", dataTipos.tipos, true);
    }

    // Cargar marcas
    const resMarcas = await fetch("php/inventario_api.php?action=get_marcas");
    const dataMarcas = await resMarcas.json();
    if (dataMarcas.success) {
      fillSelect("inv_marca", dataMarcas.marcas);
      fillSelect("filtro_marca", dataMarcas.marcas, true);
    }

    // Cargar sedes
    const resSedes = await fetch("php/inventario_api.php?action=get_sedes");
    const dataSedes = await resSedes.json();
    if (dataSedes.success) {
      fillSelect("inv_sede", dataSedes.sedes);
      fillSelect("filtro_sede", dataSedes.sedes, true);
    }

    // Cargar áreas
    const resAreas = await fetch("php/inventario_api.php?action=get_areas");
    const dataAreas = await resAreas.json();
    if (dataAreas.success) {
      fillSelect("inv_area", dataAreas.areas);
      fillSelect("filtro_area", dataAreas.areas, true);
    }

    // Cargar usuarios
    const resUsers = await fetch("php/user_api.php?action=list");
    const dataUsers = await resUsers.json();
    if (dataUsers.success) {
      const select = document.getElementById("inv_usuario");
      select.innerHTML = '<option value="">Sin asignar</option>';
      dataUsers.usuarios.forEach((u) => {
        select.innerHTML += `<option value="${u.id}">${u.primer_nombre} ${u.primer_apellido}</option>`;
      });
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
document.addEventListener("DOMContentLoaded", () => {
  const marcaSelect = document.getElementById("inv_marca");
  if (marcaSelect) {
    marcaSelect.addEventListener("change", (e) => {
      loadModelosByMarca(e.target.value);
    });
  }
});

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
  const item = allInventario.find((i) => i.id === id);
  if (!item) return;

  // Cargar historial
  try {
    const response = await fetch(
      `php/inventario_api.php?action=get_historial&id_inventario=${id}`,
    );
    const data = await response.json();

    let historialHtml = "";
    if (data.success && data.historial.length > 0) {
      data.historial.forEach((h) => {
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
      <div class="row">
        <div class="col-md-6">
          <h6>Información General</h6>
          <p><strong>ID:</strong> ${item.id}</p>
          <p><strong>Tipo:</strong> ${item.tipo_nombre}</p>
          <p><strong>Marca:</strong> ${item.marca_nombre}</p>
          <p><strong>Modelo:</strong> ${item.modelo_nombre}</p>
          <p><strong>Serial:</strong> ${item.serial}</p>
          <p><strong>Placa:</strong> ${item.placa}</p>
          <p><strong>Estado:</strong> <span class="badge ${getEstadoBadge(item.estado)}">${formatEstado(item.estado)}</span></p>
        </div>
        <div class="col-md-6">
          <h6>Asignación</h6>
          <p><strong>Fecha Compra:</strong> ${item.fecha_compra ? formatDate(item.fecha_compra) : "-"}</p>
          <p><strong>Fecha Asignación:</strong> ${item.fecha_asignacion ? formatDate(item.fecha_asignacion) : "-"}</p>
          <p><strong>Fecha Devolución:</strong> ${item.fecha_devolucion ? formatDate(item.fecha_devolucion) : "-"}</p>
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

    document.getElementById("modalDetailBody").innerHTML = modalBody;
    const modal = new bootstrap.Modal(
      document.getElementById("modalInventarioDetail"),
    );
    modal.show();
  } catch (error) {
    console.error("Error al cargar historial:", error);
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

console.log("✅ inventario.js cargado");
