/**
 * nps_dashboard.js
 * Dashboard de estadísticas NPS para administradores
 */

console.log("📊 Cargando dashboard NPS...");

// ==================== CARGAR ESTADÍSTICAS NPS ====================

async function loadNPSStats() {
  try {
    const response = await fetch("php/calificaciones_api.php?action=nps_stats");
    const data = await response.json();

    if (data.success) {
      renderNPSDashboard(data.stats);
    } else {
      console.error("Error:", data.message);
    }
  } catch (error) {
    console.error("Error al cargar NPS:", error);
  }
}

// ==================== RENDERIZAR DASHBOARD NPS ====================

function renderNPSDashboard(stats) {
  const container = document.getElementById("nps-dashboard-container");
  if (!container) return;

  const npsScore = stats.nps_score || 0;
  const totalCalificaciones = stats.total_calificaciones || 0;

  // Determinar color según NPS
  let npsColor = "secondary";
  let npsLabel = "Sin datos";

  if (totalCalificaciones > 0) {
    if (npsScore > 50) {
      npsColor = "success";
      npsLabel = "Excelente";
    } else if (npsScore >= 30) {
      npsColor = "primary";
      npsLabel = "Bueno";
    } else if (npsScore >= 0) {
      npsColor = "warning";
      npsLabel = "Regular";
    } else {
      npsColor = "danger";
      npsLabel = "Malo";
    }
  }

  const html = `
        <div class="card mb-4">
            <div class="card-header bg-primary text-white">
                <h5 class="mb-0">📊 Net Promoter Score (NPS)</h5>
            </div>
            <div class="card-body">
                ${
                  totalCalificaciones === 0
                    ? `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        No hay calificaciones registradas aún. Las estadísticas aparecerán cuando los usuarios califiquen los tickets cerrados.
                    </div>
                `
                    : `
                    <div class="row mb-4">
                        <div class="col-md-3 text-center">
                            <div class="card bg-${npsColor} text-white">
                                <div class="card-body">
                                    <h2 class="display-3 mb-0">${npsScore}</h2>
                                    <p class="mb-0">NPS Score</p>
                                    <small>${npsLabel}</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-md-9">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card border-success">
                                        <div class="card-body text-center">
                                            <h3 class="text-success">${stats.promotores || 0}</h3>
                                            <p class="mb-1">😊 Promotores</p>
                                            <small class="text-muted">${stats.porcentaje_promotores || 0}%</small>
                                            <div class="progress mt-2" style="height: 5px;">
                                                <div class="progress-bar bg-success" style="width: ${stats.porcentaje_promotores || 0}%"></div>
                                            </div>
                                            <small class="text-muted">Calificación 4-5 ⭐</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <div class="card border-warning">
                                        <div class="card-body text-center">
                                            <h3 class="text-warning">${stats.neutros || 0}</h3>
                                            <p class="mb-1">😐 Neutros</p>
                                            <small class="text-muted">${stats.porcentaje_neutros || 0}%</small>
                                            <div class="progress mt-2" style="height: 5px;">
                                                <div class="progress-bar bg-warning" style="width: ${stats.porcentaje_neutros || 0}%"></div>
                                            </div>
                                            <small class="text-muted">Calificación 3 ⭐</small>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="col-md-4">
                                    <div class="card border-danger">
                                        <div class="card-body text-center">
                                            <h3 class="text-danger">${stats.detractores || 0}</h3>
                                            <p class="mb-1">😞 Detractores</p>
                                            <small class="text-muted">${stats.porcentaje_detractores || 0}%</small>
                                            <div class="progress mt-2" style="height: 5px;">
                                                <div class="progress-bar bg-danger" style="width: ${stats.porcentaje_detractores || 0}%"></div>
                                            </div>
                                            <small class="text-muted">Calificación 1-2 ⭐</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row mt-3">
                                <div class="col-12">
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>Total de calificaciones:</strong> ${totalCalificaciones}
                                                </div>
                                                <div>
                                                    <button class="btn btn-sm btn-success" onclick="descargarReporteNPS()">
                                                        <i class="bi bi-download"></i> Descargar Reporte
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <strong>💡 Fórmula NPS:</strong> % Promotores - % Detractores = ${stats.porcentaje_promotores}% - ${stats.porcentaje_detractores}% = <strong>${npsScore}</strong>
                    </div>
                `
                }
            </div>
        </div>
    `;

  container.innerHTML = html;
}

// ==================== DESCARGAR REPORTE NPS ====================

async function descargarReporteNPS() {
  try {
    const response = await fetch(
      "php/calificaciones_api.php?action=reporte_nps",
    );
    const data = await response.json();

    if (data.success && data.calificaciones.length > 0) {
      // Convertir a CSV
      const headers = Object.keys(data.calificaciones[0]);
      const csvContent = [
        headers.join(","),
        ...data.calificaciones.map((row) =>
          headers
            .map((h) => {
              const val = row[h] || "";
              // Escapar comillas y comas
              return typeof val === "string" &&
                (val.includes(",") || val.includes('"'))
                ? `"${val.replace(/"/g, '""')}"`
                : val;
            })
            .join(","),
        ),
      ].join("\n");

      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `reporte_nps_${new Date().toISOString().split("T")[0]}.csv`,
      );
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      mostrarNotificacion("Reporte descargado exitosamente", "success");
    } else {
      alert("No hay calificaciones para descargar");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al descargar reporte");
  }
}

// ==================== INSERTAR DASHBOARD EN ESTADÍSTICAS ====================

function insertarNPSDashboard() {
  // Buscar el contenedor de estadísticas
  const statsContainer = document.getElementById("statsUsuariosContainer");

  if (statsContainer) {
    // Crear contenedor para NPS antes de la tabla de usuarios
    const npsContainer = document.createElement("div");
    npsContainer.id = "nps-dashboard-container";
    statsContainer.parentNode.insertBefore(npsContainer, statsContainer);

    // Cargar datos
    loadNPSStats();
  }
}

// ==================== AUTO-INICIALIZACIÓN ====================

// Cargar automáticamente cuando se carga la vista de estadísticas
if (typeof loadStats === "function") {
  const originalLoadStats = loadStats;
  window.loadStats = function () {
    originalLoadStats();
    setTimeout(() => insertarNPSDashboard(), 500);
  };
}

console.log("✅ Dashboard NPS cargado");

// Exportar funciones
window.loadNPSStats = loadNPSStats;
window.descargarReporteNPS = descargarReporteNPS;
window.insertarNPSDashboard = insertarNPSDashboard;
