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
