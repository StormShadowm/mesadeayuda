/**
 * nps_calificaciones.js
 * Sistema de calificaciones NPS y reapertura de tickets
 */

console.log("🌟 Cargando módulo de calificaciones NPS...");

// ==================== VARIABLES GLOBALES ====================

let ticketActualCalificacion = null;
let ticketActualReapertura = null;

// ==================== MODAL DE CALIFICACIÓN ====================

function mostrarModalCalificacion(idTicket, tituloTicket) {
  ticketActualCalificacion = idTicket;

  const modalHTML = `
        <div class="modal fade" id="modalCalificacion" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">⭐ Calificar Servicio</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p class="mb-3"><strong>Ticket:</strong> ${tituloTicket}</p>
                        <p class="text-muted">¿Cómo calificarías la atención recibida?</p>
                        
                        <div class="text-center mb-4">
                            <div class="rating-stars" id="ratingStars">
                                ${[1, 2, 3, 4, 5]
                                  .map(
                                    (num) => `
                                    <i class="rating-star bi bi-star-fill" data-rating="${num}" 
                                       style="font-size: 2.5rem; color: #ddd; cursor: pointer; margin: 0 5px;"
                                       onmouseover="previewRating(${num})"
                                       onmouseout="resetRatingPreview()"
                                       onclick="selectRating(${num})"></i>
                                `,
                                  )
                                  .join("")}
                            </div>
                            <div class="mt-2">
                                <small class="text-muted" id="ratingLabel">Selecciona tu calificación</small>
                            </div>
                        </div>
                        
                        <div class="mb-3" id="comentarioContainer" style="display: none;">
                            <label class="form-label">
                                Comentario <span class="text-danger" id="comentarioObligatorio">*</span>
                            </label>
                            <textarea class="form-control" id="comentarioCalificacion" rows="3" 
                                      placeholder="Cuéntanos sobre tu experiencia..."></textarea>
                            <small class="text-muted" id="comentarioHint"></small>
                        </div>
                        
                        <div class="alert alert-info" id="alertCalificacion" style="display: none;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary" id="btnEnviarCalificacion" disabled>
                            <i class="bi bi-send"></i> Enviar Calificación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Eliminar modal existente si hay
  const existente = document.getElementById("modalCalificacion");
  if (existente) existente.remove();

  // Agregar al DOM
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Mostrar modal
  const modal = new bootstrap.Modal(
    document.getElementById("modalCalificacion"),
  );
  modal.show();

  // Event listener para enviar
  document
    .getElementById("btnEnviarCalificacion")
    .addEventListener("click", enviarCalificacion);
}

// ==================== FUNCIONES DE RATING ====================

let calificacionSeleccionada = 0;

function previewRating(rating) {
  const stars = document.querySelectorAll(".rating-star");
  stars.forEach((star, index) => {
    if (index < rating) {
      star.style.color = "#ffc107";
    } else {
      star.style.color = "#ddd";
    }
  });
}

function resetRatingPreview() {
  if (calificacionSeleccionada === 0) {
    const stars = document.querySelectorAll(".rating-star");
    stars.forEach((star) => (star.style.color = "#ddd"));
  } else {
    previewRating(calificacionSeleccionada);
  }
}

function selectRating(rating) {
  calificacionSeleccionada = rating;
  previewRating(rating);

  // Actualizar label
  const labels = ["Muy malo", "Malo", "Regular", "Bueno", "Excelente"];
  document.getElementById("ratingLabel").textContent = labels[rating - 1];

  // Mostrar/ocultar comentario
  const comentarioContainer = document.getElementById("comentarioContainer");
  const comentarioObligatorio = document.getElementById(
    "comentarioObligatorio",
  );
  const comentarioHint = document.getElementById("comentarioHint");

  comentarioContainer.style.display = "block";

  if (rating <= 2) {
    comentarioObligatorio.style.display = "inline";
    comentarioHint.textContent = "Por favor explica qué podemos mejorar";
    comentarioHint.classList.add("text-danger");
  } else {
    comentarioObligatorio.style.display = "none";
    comentarioHint.textContent = "Opcional: Comparte tu experiencia";
    comentarioHint.classList.remove("text-danger");
  }

  // Habilitar botón si cumple requisitos
  validarFormularioCalificacion();
}

function validarFormularioCalificacion() {
  const btnEnviar = document.getElementById("btnEnviarCalificacion");
  const comentario = document
    .getElementById("comentarioCalificacion")
    .value.trim();

  // Si calificación <= 2, comentario es obligatorio
  if (calificacionSeleccionada <= 2) {
    btnEnviar.disabled = comentario.length < 10;
  } else {
    btnEnviar.disabled = calificacionSeleccionada === 0;
  }
}

// Event listener para validar mientras escribe
document.addEventListener("input", function (e) {
  if (e.target.id === "comentarioCalificacion") {
    validarFormularioCalificacion();
  }
});

// ==================== ENVIAR CALIFICACIÓN ====================

async function enviarCalificacion() {
  const btnEnviar = document.getElementById("btnEnviarCalificacion");
  const comentario = document
    .getElementById("comentarioCalificacion")
    .value.trim();

  if (calificacionSeleccionada === 0) {
    alert("Por favor selecciona una calificación");
    return;
  }

  if (calificacionSeleccionada <= 2 && comentario.length < 10) {
    alert(
      "Para calificaciones bajas, el comentario debe tener al menos 10 caracteres",
    );
    return;
  }

  btnEnviar.disabled = true;
  btnEnviar.innerHTML =
    '<span class="spinner-border spinner-border-sm"></span> Enviando...';

  try {
    const formData = new FormData();
    formData.append("action", "calificar");
    formData.append("id_ticket", ticketActualCalificacion);
    formData.append("calificacion", calificacionSeleccionada);
    formData.append("comentario", comentario);

    const response = await fetch("php/calificaciones_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      // Cerrar modal
      bootstrap.Modal.getInstance(
        document.getElementById("modalCalificacion"),
      ).hide();

      // Mostrar mensaje de éxito
      mostrarNotificacion("¡Gracias por tu calificación!", "success");

      // Recargar lista de tickets si existe
      if (typeof loadTickets === "function") {
        loadTickets();
      }

      // Limpiar
      calificacionSeleccionada = 0;
      ticketActualCalificacion = null;
    } else {
      throw new Error(data.message || "Error al enviar calificación");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error al enviar calificación: " + error.message);
    btnEnviar.disabled = false;
    btnEnviar.innerHTML = '<i class="bi bi-send"></i> Enviar Calificación';
  }
}

// ==================== MODAL DE REAPERTURA ====================

function mostrarModalReapertura(idTicket, tituloTicket, numeroActual) {
  ticketActualReapertura = idTicket;

  const modalHTML = `
        <div class="modal fade" id="modalReapertura" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">🔄 Reabrir Ticket</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Ticket #${numeroActual}:</strong> ${tituloTicket}</p>
                        
                        <div class="alert alert-info">
                            <i class="bi bi-info-circle"></i>
                            Al reabrir este ticket, podrás continuar la conversación y recibir más ayuda.
                            El ticket volverá al estado "Abierto".
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">
                                Motivo de reapertura <span class="text-danger">*</span>
                            </label>
                            <textarea class="form-control" id="motivoReapertura" rows="3" 
                                      placeholder="Por favor explica por qué necesitas reabrir este ticket..."
                                      required></textarea>
                            <small class="text-muted">Mínimo 20 caracteres</small>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-warning" id="btnConfirmarReapertura" disabled>
                            <i class="bi bi-arrow-counterclockwise"></i> Reabrir Ticket
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Eliminar modal existente
  const existente = document.getElementById("modalReapertura");
  if (existente) existente.remove();

  // Agregar al DOM
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Event listener para validar
  document
    .getElementById("motivoReapertura")
    .addEventListener("input", function () {
      const btn = document.getElementById("btnConfirmarReapertura");
      btn.disabled = this.value.trim().length < 20;
    });

  // Event listener para enviar
  document
    .getElementById("btnConfirmarReapertura")
    .addEventListener("click", reabrirTicket);

  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById("modalReapertura"));
  modal.show();
}

// ==================== REABRIR TICKET ====================

async function reabrirTicket() {
  const btnReabrir = document.getElementById("btnConfirmarReapertura");
  const motivo = document.getElementById("motivoReapertura").value.trim();

  if (motivo.length < 20) {
    alert("El motivo debe tener al menos 20 caracteres");
    return;
  }

  btnReabrir.disabled = true;
  btnReabrir.innerHTML =
    '<span class="spinner-border spinner-border-sm"></span> Reabriendo...';

  try {
    const formData = new FormData();
    formData.append("action", "reabrir");
    formData.append("id_ticket", ticketActualReapertura);
    formData.append("motivo", motivo);

    const response = await fetch("php/calificaciones_api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      // Cerrar modal
      bootstrap.Modal.getInstance(
        document.getElementById("modalReapertura"),
      ).hide();

      // Mostrar mensaje
      mostrarNotificacion(
        `Ticket reabierto como #${data.nuevo_numero}. ${data.message}`,
        "success",
      );

      // Recargar tickets
      if (typeof loadTickets === "function") {
        setTimeout(() => loadTickets(), 1000);
      }

      // Limpiar
      ticketActualReapertura = null;
    } else {
      throw new Error(data.message || "Error al reabrir ticket");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error: " + error.message);
    btnReabrir.disabled = false;
    btnReabrir.innerHTML =
      '<i class="bi bi-arrow-counterclockwise"></i> Reabrir Ticket';
  }
}

// ==================== VERIFICAR SI PUEDE CALIFICAR ====================

async function verificarPuedeCalificar(idTicket) {
  try {
    const response = await fetch(
      `php/calificaciones_api.php?action=puede_calificar&id_ticket=${idTicket}`,
    );
    const data = await response.json();
    return data.puede_calificar;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}

// ==================== VERIFICAR SI PUEDE RESPONDER ====================

async function verificarPuedeResponder(idTicket) {
  try {
    const response = await fetch(
      `php/tickets_api.php?action=puede_responder&id_ticket=${idTicket}`,
    );
    const data = await response.json();
    return data.puede_responder;
  } catch (error) {
    console.error("Error:", error);
    return true; // Por defecto permitir
  }
}

// ==================== MOSTRAR NOTIFICACIÓN ====================

function mostrarNotificacion(mensaje, tipo = "info") {
  const alertHTML = `
        <div class="alert alert-${tipo} alert-dismissible fade show position-fixed" 
             style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;"
             role="alert">
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", alertHTML);

  // Auto-cerrar después de 5 segundos
  setTimeout(() => {
    const alerts = document.querySelectorAll(".alert");
    alerts.forEach((alert) => {
      if (alert.textContent.includes(mensaje)) {
        alert.remove();
      }
    });
  }, 5000);
}

// ==================== AGREGAR BOTONES A TICKETS ====================

function agregarBotonesNPS(
  ticketId,
  ticketTitulo,
  ticketNumero,
  estado,
  esCreador,
  puedeReabrir,
) {
  const container = document.getElementById(`ticket-actions-${ticketId}`);
  if (!container) return;

  // Si está cerrado y es el creador
  if ((estado === "Cerrado" || estado === "Resuelto") && esCreador) {
    // Botón de calificación
    verificarPuedeCalificar(ticketId).then((puede) => {
      if (puede) {
        const btnCalificar = document.createElement("button");
        btnCalificar.className = "btn btn-sm btn-warning me-2";
        btnCalificar.innerHTML = '<i class="bi bi-star"></i> Calificar';
        btnCalificar.onclick = () =>
          mostrarModalCalificacion(ticketId, ticketTitulo);
        container.appendChild(btnCalificar);
      }
    });

    // Botón de reapertura
    if (puedeReabrir) {
      const btnReabrir = document.createElement("button");
      btnReabrir.className = "btn btn-sm btn-secondary";
      btnReabrir.innerHTML =
        '<i class="bi bi-arrow-counterclockwise"></i> Reabrir';
      btnReabrir.onclick = () =>
        mostrarModalReapertura(ticketId, ticketTitulo, ticketNumero);
      container.appendChild(btnReabrir);
    }
  }
}

// ==================== VALIDAR FORMULARIO DE MENSAJE ====================

async function validarEnvioMensaje(idTicket) {
  const puedeResponder = await verificarPuedeResponder(idTicket);

  if (!puedeResponder) {
    alert(
      "No se pueden enviar mensajes en tickets cerrados. Puedes reabrir el ticket si necesitas continuar la conversación.",
    );
    return false;
  }

  return true;
}

console.log("✅ Módulo de calificaciones NPS cargado");

// Exportar funciones globales
window.mostrarModalCalificacion = mostrarModalCalificacion;
window.mostrarModalReapertura = mostrarModalReapertura;
window.verificarPuedeCalificar = verificarPuedeCalificar;
window.verificarPuedeResponder = verificarPuedeResponder;
window.agregarBotonesNPS = agregarBotonesNPS;
window.validarEnvioMensaje = validarEnvioMensaje;
window.previewRating = previewRating;
window.resetRatingPreview = resetRatingPreview;
window.selectRating = selectRating;
