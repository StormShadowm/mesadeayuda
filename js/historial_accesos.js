/**
 * historial_accesos.js
 * Módulo para mostrar historial de login/logout
 */

console.log("📝 Cargando módulo de historial de accesos...");

// ==================== CARGAR HISTORIAL ====================

async function cargarHistorialAccesos(idUsuario) {
  try {
    const url = idUsuario
      ? `php/user_api.php?action=historial_accesos&id_usuario=${idUsuario}`
      : "php/user_api.php?action=historial_accesos";

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      return data.historial;
    } else {
      console.error("Error:", data.message);
      return [];
    }
  } catch (error) {
    console.error("Error al cargar historial:", error);
    return [];
  }
}

// ==================== RENDERIZAR HISTORIAL ====================

async function mostrarHistorialAccesos(
  idUsuario,
  containerId = "historialAccesosContainer",
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML =
    '<div class="text-center"><div class="spinner-border"></div></div>';

  const historial = await cargarHistorialAccesos(idUsuario);

  if (historial.length === 0) {
    container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i>
                No hay registros de acceso disponibles.
            </div>
        `;
    return;
  }

  let html = `
        <div class="card">
            <div class="card-header bg-secondary text-white">
                <h6 class="mb-0">📋 Historial de Accesos (Últimos 50)</h6>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                    <table class="table table-sm table-hover mb-0">
                        <thead class="table-light sticky-top">
                            <tr>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>IP</th>
                                <th>Navegador</th>
                                <th>Fecha/Hora</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

  historial.forEach((registro) => {
    const tipo = registro.tipo === "login" ? "🔓" : "🔒";
    let estadoClass = "";
    let estadoBadge = "";

    if (registro.tipo === "login") {
      if (registro.estado === "Exitoso") {
        estadoClass = "success";
        estadoBadge = "✓ Exitoso";
      } else {
        estadoClass = "danger";
        estadoBadge = "✗ Fallido";
      }
    } else {
      estadoClass = "secondary";
      estadoBadge = registro.estado;
    }

    // Extraer navegador del user agent
    const navegador = extraerNavegador(registro.user_agent);

    // Formatear fecha
    const fecha = new Date(registro.fecha);
    const fechaFormateada = fecha.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    html += `
            <tr>
                <td>${tipo} ${registro.tipo === "login" ? "Login" : "Logout"}</td>
                <td><span class="badge bg-${estadoClass}">${estadoBadge}</span></td>
                <td><code>${registro.ip_address}</code></td>
                <td><small>${navegador}</small></td>
                <td><small>${fechaFormateada}</small></td>
            </tr>
        `;
  });

  html += `
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="card-footer text-muted">
                <small><i class="bi bi-info-circle"></i> Mostrando los últimos 50 registros</small>
            </div>
        </div>
    `;

  container.innerHTML = html;
}

// ==================== EXTRAER INFO DEL NAVEGADOR ====================

function extraerNavegador(userAgent) {
  if (!userAgent) return "Desconocido";

  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    return "🌐 Chrome";
  } else if (userAgent.includes("Firefox")) {
    return "🦊 Firefox";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    return "🧭 Safari";
  } else if (userAgent.includes("Edg")) {
    return "🌊 Edge";
  } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
    return "🎭 Opera";
  } else {
    return "❓ Otro";
  }
}

// ==================== AGREGAR SECCIÓN EN EDITAR USUARIO ====================

function agregarSeccionHistorialEnEdicion(idUsuario) {
  // Buscar el formulario de edición de usuario
  const formContainer =
    document.querySelector(".modal-body") ||
    document.querySelector("#user-edit-form");

  if (!formContainer) return;

  // Buscar después del campo de contraseña
  const passwordField =
    formContainer.querySelector('[name="password"]') ||
    formContainer.querySelector("#nueva_password");

  if (passwordField) {
    const seccionHTML = `
            <div class="mb-3 mt-4">
                <hr>
                <div id="historialAccesosContainer"></div>
            </div>
        `;

    // Insertar después del campo de contraseña
    passwordField.closest(".mb-3").insertAdjacentHTML("afterend", seccionHTML);

    // Cargar historial
    mostrarHistorialAccesos(idUsuario);
  }
}

// ==================== REGISTRAR LOGOUT ====================

async function registrarLogout() {
  try {
    const formData = new FormData();
    formData.append("action", "logout");

    await fetch("php/calificaciones_api.php", {
      method: "POST",
      body: formData,
    });

    // Redirigir al login
    window.location.href = "index.html";
  } catch (error) {
    console.error("Error al registrar logout:", error);
    // Aún así cerrar sesión
    window.location.href = "index.html";
  }
}

// ==================== INTERCEPTAR LOGOUT ====================

function interceptarLogout() {
  // Buscar botones de logout
  const logoutButtons = document.querySelectorAll(
    '[onclick*="logout"], .logout-btn, #logoutBtn',
  );

  logoutButtons.forEach((btn) => {
    // Remover onclick existente
    btn.removeAttribute("onclick");

    // Agregar nuevo evento
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("¿Estás seguro que deseas cerrar sesión?")) {
        registrarLogout();
      }
    });
  });
}

// ==================== AUTO-INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", () => {
  // Interceptar botones de logout
  interceptarLogout();
});

console.log("✅ Módulo de historial de accesos cargado");

// Exportar funciones
window.cargarHistorialAccesos = cargarHistorialAccesos;
window.mostrarHistorialAccesos = mostrarHistorialAccesos;
window.agregarSeccionHistorialEnEdicion = agregarSeccionHistorialEnEdicion;
window.registrarLogout = registrarLogout;
window.interceptarLogout = interceptarLogout;
