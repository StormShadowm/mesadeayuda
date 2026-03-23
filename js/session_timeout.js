// ==================== CONTROL DE SESIÓN POR INACTIVIDAD ====================
// Agregar este código AL INICIO de admin.js y user.js

const SessionTimeout = {
  // Configuración
  timeout: 2 * 60 * 1000, // 2 minutos en milisegundos (para pruebas)
  warningTime: 1 * 60 * 1000, // Advertir 1 minuto antes
  checkInterval: 30 * 1000, // Verificar cada 30 segundos

  // Variables de control
  timerCheck: null,
  lastActivity: Date.now(),
  warningShown: false,
  modalElement: null,
  countdownInterval: null,

  // Inicializar sistema de timeout
  init: function () {
    // Crear modal de advertencia
    this.createWarningModal();

    // Resetear timer en actividad del usuario
    this.setupActivityListeners();

    // Iniciar verificación periódica
    this.startPeriodicCheck();

    // Verificación inicial
    this.checkSession();
  },

  // Actualizar indicador de tiempo cada segundo
  startTimeIndicatorUpdate: function () {
    const updateIndicator = async () => {
      try {
        const response = await fetch("php/session_check.php?action=check");
        const data = await response.json();

        if (!data.session_active) {
          return; // Sesión expirada, detener actualizaciones
        }

        const tiempoRestante = data.tiempo_restante; // en segundos
        const minutos = Math.floor(tiempoRestante / 60);
        const segundos = tiempoRestante % 60;

        const timeText = document.getElementById("sessionTimeText");
        const timeIcon = document.querySelector("#sessionTimeIndicator i");

        if (timeText) {
          timeText.textContent = `${minutos}:${segundos.toString().padStart(2, "0")}`;

          // Cambiar color según tiempo restante
          if (tiempoRestante <= 30) {
            // Menos de 30 segundos - ROJO y parpadeante
            timeText.className = "text-danger fw-bold";
            timeIcon.className = "bi bi-clock-history me-2 text-danger";
            timeText.style.animation = "blink 1s infinite";
          } else if (tiempoRestante <= 60) {
            // Menos de 1 minuto - NARANJA
            timeText.className = "text-warning fw-bold";
            timeIcon.className = "bi bi-clock-history me-2 text-warning";
            timeText.style.animation = "";
          } else {
            // Normal - GRIS
            timeText.className = "text-muted fw-semibold";
            timeIcon.className = "bi bi-clock-history me-2 text-muted";
            timeText.style.animation = "";
          }
        }
      } catch (error) {
        console.error("Error al actualizar indicador de tiempo:", error);
      }
    };

    // Actualizar inmediatamente
    updateIndicator();

    // Actualizar cada segundo
    setInterval(updateIndicator, 1000);
  },

  // Crear modal de advertencia
  createWarningModal: function () {
    const modalHTML = `
      <style>
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      </style>
      <div class="modal fade" id="sessionWarningModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-warning">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                Sesión por expirar
              </h5>
            </div>
            <div class="modal-body text-center py-4">
              <div class="mb-3">
                <i class="bi bi-clock-history" style="font-size: 3rem; color: #ffc107;"></i>
              </div>
              <h5 class="mb-3">Tu sesión está por expirar por inactividad</h5>
              <p class="text-muted mb-2">Tiempo restante:</p>
              <h2 class="text-warning mb-4" id="sessionCountdown">1:00</h2>
              <p class="small text-muted">
                Si no hay actividad, serás desconectado automáticamente
              </p>
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-warning btn-lg" onclick="SessionTimeout.extendSession()">
                <i class="bi bi-arrow-clockwise me-2"></i>
                Continuar trabajando
              </button>
              <button type="button" class="btn btn-outline-secondary" onclick="SessionTimeout.logout()">
                <i class="bi bi-box-arrow-right me-2"></i>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
    this.modalElement = new bootstrap.Modal(
      document.getElementById("sessionWarningModal"),
    );
  },

  // Configurar listeners de actividad
  setupActivityListeners: function () {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          this.resetTimer();
        },
        { passive: true },
      );
    });
  },

  // Resetear timer de actividad
  resetTimer: function () {
    this.lastActivity = Date.now();

    // Si el modal está visible, ocultarlo
    if (this.warningShown) {
      this.hideWarning();
    }

    // Notificar al servidor que hay actividad (ping silencioso)
    this.pingServer();
  },

  // Ping silencioso al servidor
  pingServer: function () {
    // Solo hacer ping cada 30 segundos para no saturar
    if (!this.lastPing || Date.now() - this.lastPing > 30000) {
      fetch("php/session_check.php?action=ping", { method: "GET" }).catch(
        () => {},
      );
      this.lastPing = Date.now();
    }
  },

  // Iniciar verificación periódica
  startPeriodicCheck: function () {
    this.timerCheck = setInterval(() => {
      this.checkSession();
    }, this.checkInterval);
  },

  // Verificar estado de la sesión
  checkSession: async function () {
    try {
      const response = await fetch("php/session_check.php?action=check");
      const data = await response.json();

      if (!data.session_active) {
        console.warn("⚠️ Sesión expirada - redirigiendo al login");
        this.sessionExpired();
        return;
      }

      const tiempoRestante = data.tiempo_restante * 1000; // Convertir a ms

      // Si quedan menos del tiempo de advertencia, mostrar modal
      if (tiempoRestante <= this.warningTime && !this.warningShown) {
        this.showWarning(tiempoRestante);
      }
    } catch (error) {
      console.error("Error al verificar sesión:", error);
    }
  },

  // Mostrar advertencia
  showWarning: function (tiempoRestante) {
    console.warn("⚠️ Mostrando advertencia de sesión");
    this.warningShown = true;
    this.modalElement.show();

    // Iniciar countdown
    this.startCountdown(tiempoRestante);
  },

  // Ocultar advertencia
  hideWarning: function () {
    this.warningShown = false;
    this.modalElement.hide();

    // Detener countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  },

  // Iniciar countdown visual
  startCountdown: function (tiempoInicial) {
    let tiempoRestante = tiempoInicial;
    const countdownElement = document.getElementById("sessionCountdown");

    // Actualizar inmediatamente
    this.updateCountdown(countdownElement, tiempoRestante);

    // Actualizar cada segundo
    this.countdownInterval = setInterval(() => {
      tiempoRestante -= 1000;

      if (tiempoRestante <= 0) {
        clearInterval(this.countdownInterval);
        this.sessionExpired();
        return;
      }

      this.updateCountdown(countdownElement, tiempoRestante);
    }, 1000);
  },

  // Actualizar display del countdown
  updateCountdown: function (element, milliseconds) {
    const segundosTotales = Math.floor(milliseconds / 1000);
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;

    element.textContent = `${minutos}:${segundos.toString().padStart(2, "0")}`;

    // Cambiar color si queda menos de 30 segundos
    if (segundosTotales <= 30) {
      element.className = "text-danger mb-4 fw-bold";
      element.style.fontSize = "2.5rem";
    }
  },

  // Extender sesión
  extendSession: async function () {
    try {
      const response = await fetch("php/session_check.php?action=extend");
      const data = await response.json();

      if (data.success) {
        this.hideWarning();
        this.resetTimer();

        // Mostrar notificación
        this.showSuccessNotification();
      }
    } catch (error) {
      console.error("Error al extender sesión:", error);
      alert("Error al extender la sesión. Por favor, intenta de nuevo.");
    }
  },

  // Mostrar notificación de éxito
  showSuccessNotification: function () {
    // Crear notificación temporal
    const notification = document.createElement("div");
    notification.className =
      "position-fixed top-0 start-50 translate-middle-x mt-3";
    notification.style.zIndex = "9999";
    notification.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show shadow-lg" role="alert">
        <i class="bi bi-check-circle-fill me-2"></i>
        <strong>Sesión extendida</strong> - Tu sesión ha sido extendida por 2 minutos más
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remover después de 5 segundos
    setTimeout(() => {
      notification.remove();
    }, 5000);
  },

  // Cerrar sesión manualmente
  logout: function () {
    window.location.href = "php/logout.php";
  },

  // Sesión expirada - Mostrar aviso y redirigir
  sessionExpired: function () {
    console.error("❌ Sesión expirada por inactividad");

    // Detener todos los timers
    if (this.timerCheck) clearInterval(this.timerCheck);
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    // Ocultar modal de advertencia si está visible
    if (this.warningShown) {
      this.modalElement.hide();
    }

    // Crear y mostrar modal de sesión expirada
    this.showExpiredModal();
  },

  // Mostrar modal de sesión expirada
  showExpiredModal: function () {
    // Crear modal de expiración
    const expiredModalHTML = `
      <div class="modal fade show" id="sessionExpiredModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" style="display: block; background: rgba(0,0,0,0.7);">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-danger">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">
                <i class="bi bi-exclamation-octagon-fill me-2"></i>
                Sesión Expirada
              </h5>
            </div>
            <div class="modal-body text-center py-5">
              <div class="mb-4">
                <i class="bi bi-hourglass-bottom text-danger" style="font-size: 4rem;"></i>
              </div>
              <h4 class="mb-3">Tu sesión ha expirado</h4>
              <p class="text-muted mb-4">
                Tu sesión se cerró automáticamente debido a inactividad.<br>
                Serás redirigido a la página de inicio de sesión.
              </p>
              <div class="spinner-border text-danger mb-3" role="status">
                <span class="visually-hidden">Redirigiendo...</span>
              </div>
              <p class="small text-muted">Redirigiendo en <span id="redirectCountdown">3</span> segundos...</p>
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-danger" onclick="window.location.href='index.html'">
                <i class="bi bi-box-arrow-in-right me-2"></i>
                Ir al Login Ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar al DOM
    document.body.insertAdjacentHTML("beforeend", expiredModalHTML);

    // Countdown de redirección (3 segundos)
    let countdown = 3;
    const countdownElement = document.getElementById("redirectCountdown");

    const redirectTimer = setInterval(() => {
      countdown--;
      if (countdownElement) {
        countdownElement.textContent = countdown;
      }

      if (countdown <= 0) {
        clearInterval(redirectTimer);
        window.location.href = "index.html";
      }
    }, 1000);
  },

  // Destruir (limpiar listeners)
  destroy: function () {
    if (this.timerCheck) clearInterval(this.timerCheck);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  },
};

// ==================== AUTO-INICIALIZAR ====================
// Iniciar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    SessionTimeout.init();
  });
} else {
  SessionTimeout.init();
}
