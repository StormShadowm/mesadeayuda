/**
 * parche_dos_tiempos.js
 * Parche para formatear fechas y tiempos en el sistema
 */

// ==================== FORMATEAR FECHA Y HORA ====================

function formatearFechaHora(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ==================== FORMATEAR SOLO FECHA ====================

function formatearFecha(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "-";

  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// ==================== FORMATEAR TIEMPO RELATIVO ====================

function formatearTiempoRelativo(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "-";

  const ahora = new Date();
  const diff = ahora - d;

  const segundos = Math.floor(diff / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (dias > 7) {
    return formatearFecha(fecha);
  } else if (dias > 0) {
    return `Hace ${dias} día${dias > 1 ? "s" : ""}`;
  } else if (horas > 0) {
    return `Hace ${horas} hora${horas > 1 ? "s" : ""}`;
  } else if (minutos > 0) {
    return `Hace ${minutos} minuto${minutos > 1 ? "s" : ""}`;
  } else {
    return "Hace un momento";
  }
}

// ==================== CALCULAR DURACIÓN ====================

function calcularDuracion(fechaInicio, fechaFin) {
  if (!fechaInicio) return "-";

  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : new Date();

  if (isNaN(inicio.getTime())) return "-";

  const diff = fin - inicio;
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (dias > 0) {
    return `${dias}d ${horas}h ${minutos}m`;
  } else if (horas > 0) {
    return `${horas}h ${minutos}m`;
  } else {
    return `${minutos}m`;
  }
}

// ==================== FORMATEAR HORA AM/PM ====================

function formatearHoraAmPm(fecha) {
  if (!fecha) return "-";

  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "-";

  let horas = d.getHours();
  const minutos = d.getMinutes();
  const ampm = horas >= 12 ? "PM" : "AM";

  horas = horas % 12;
  horas = horas ? horas : 12; // 0 = 12

  const minutosStr = minutos < 10 ? "0" + minutos : minutos;

  return `${horas}:${minutosStr} ${ampm}`;
}

// ==================== ACTUALIZAR TIEMPOS AUTOMÁTICAMENTE ====================

function iniciarActualizacionAutomatica() {
  const elementos = document.querySelectorAll("[data-tiempo-relativo]");

  elementos.forEach((el) => {
    const fecha = el.getAttribute("data-tiempo-relativo");
    el.textContent = formatearTiempoRelativo(fecha);
  });

  // Actualizar cada minuto
  setInterval(() => {
    elementos.forEach((el) => {
      const fecha = el.getAttribute("data-tiempo-relativo");
      el.textContent = formatearTiempoRelativo(fecha);
    });
  }, 60000);
}

// ==================== AUTO-INICIALIZACIÓN ====================

document.addEventListener("DOMContentLoaded", () => {
  iniciarActualizacionAutomatica();
});

// Exportar funciones globalmente
window.formatearFechaHora = formatearFechaHora;
window.formatearFecha = formatearFecha;
window.formatearTiempoRelativo = formatearTiempoRelativo;
window.calcularDuracion = calcularDuracion;
window.formatearHoraAmPm = formatearHoraAmPm;
