console.log("🔧 Cargando parche de dos tiempos...");

document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ Parche de dos tiempos cargado");

  // FUNCIÓN 1: Calcular tiempo en formato legible
  window.calcularTiempoTexto = function (minutos) {
    if (minutos < 60) {
      return `${Math.floor(minutos)} min`;
    } else if (minutos < 1440) {
      return `${Math.floor(minutos / 60)}h ${Math.floor(minutos % 60)}m`;
    } else {
      return `${Math.floor(minutos / 1440)}d ${Math.floor((minutos % 1440) / 60)}h`;
    }
  };

  const originalRenderTicketRow = window.renderTicketRow;

  window.renderTicketRow = function (ticket) {
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

    // DOS TIEMPOS
    const minutosAbierto = ticket.minutos_abierto || 0;
    const minutosSinRespuesta = ticket.minutos_sin_respuesta || 0;

    const tiempoAbierto = calcularTiempoTexto(minutosAbierto);

    // Colores de urgencia
    const urgencia = Math.min(100, (minutosSinRespuesta / 60) * 100);

    let bgColor = "#ffffff";
    let textColor = "#000000";

    if (urgencia >= 100) {
      bgColor = "#ffcccc";
      textColor = "#721c24";
    } else if (urgencia >= 66) {
      bgColor = "#ffe6cc";
      textColor = "#856404";
    } else if (urgencia >= 33) {
      bgColor = "#fff9cc";
      textColor = "#856404";
    }

    const tiempoSinRespuesta = calcularTiempoTexto(minutosSinRespuesta);

    const asignadoA = ticket.nombre_asignado
      ? `<span class="badge bg-info text-dark">${ticket.nombre_asignado}</span>`
      : '<span class="text-muted small">Sin asignar</span>';

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    return `
            <tr style="border-bottom: 2px solid #dee2e6;" 
                data-ticket-id="${ticket.id}" 
                data-minutos="${minutosAbierto}"
                data-minutos-sin-respuesta="${minutosSinRespuesta}">
                <td><strong>#${ticket.id}</strong></td>
                <td>${escapeHtml(ticket.titulo || "")}</td>
                <td><small>${escapeHtml(ticket.nombre_usuario || "Desconocido")}</small></td>
                <td>${asignadoA}</td>
                <td><span class="badge ${estadoClass}">${ticket.estado}</span></td>
                <td><span class="badge ${prioridadClass}">${ticket.prioridad.toUpperCase()}</span></td>
                <td><small>${escapeHtml(ticket.categoria || "-")}</small></td>
                <td class="text-center"><small>${ticket.tiene_adjunto || "No"}</small></td>
                <td class="text-center"><span class="badge bg-secondary">${ticket.respuestas || 0}</span></td>
                <td class="text-center">⏱️ ${tiempoAbierto}</td>
                <td class="ticket-sin-respuesta text-center" 
                    style="background-color: ${bgColor}; color: ${textColor}; font-weight: 600; padding: 0.8rem;">
                    ⚠️ ${tiempoSinRespuesta}
                </td>
                <td><small>${ticket.fecha_creacion ? new Date(ticket.fecha_creacion).toLocaleDateString() : "-"}</small></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewTicketDetail(${ticket.id})">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
  };

  // FUNCIÓN 3: Actualizar headers cuando se carguen tickets
  const originalRenderTickets = window.renderTickets;

  window.renderTickets = function (tickets) {
    // Llamar función original si existe
    if (originalRenderTickets) {
      originalRenderTickets.call(this, tickets);
    }

    // Actualizar headers
    setTimeout(() => {
      const theadTr = document.querySelector(".table thead tr");
      if (theadTr && theadTr.querySelectorAll("th").length < 13) {
        theadTr.innerHTML = `
                    <th style="cursor:pointer" onclick="sortTickets('id')">ID ▼</th>
                    <th style="cursor:pointer" onclick="sortTickets('titulo')">Título</th>
                    <th>Usuario</th>
                    <th>Asignado A</th>
                    <th style="cursor:pointer" onclick="sortTickets('estado')">Estado</th>
                    <th style="cursor:pointer" onclick="sortTickets('prioridad')">Prioridad</th>
                    <th style="cursor:pointer" onclick="sortTickets('categoria')">Categoría</th>
                    <th>Adjunto</th>
                    <th style="cursor:pointer" onclick="sortTickets('respuestas')">Respuestas</th>
                    <th style="cursor:pointer" onclick="sortTickets('minutos_abierto')">Tiempo Abierto</th>
                    <th style="cursor:pointer" onclick="sortTickets('minutos_sin_respuesta')">Sin Respuesta ⚠️</th>
                    <th style="cursor:pointer" onclick="sortTickets('fecha_creacion')">Fecha</th>
                    <th>Acciones</th>
                `;

        // Regenerar las filas
        const tbody = document.querySelector("#ticketsTableBody");
        if (tbody && window.allTickets) {
          tbody.innerHTML = window.allTickets
            .map((ticket) => renderTicketRow(ticket))
            .join("");
        }
      }
    }, 100);
  };

  // FUNCIÓN 4: Actualizar en tiempo real
  setInterval(function () {
    const rows = document.querySelectorAll(
      "#ticketsTableBody tr[data-ticket-id]",
    );

    rows.forEach((row) => {
      const minutosAbierto = parseFloat(row.getAttribute("data-minutos") || 0);
      const minutosSinRespuesta = parseFloat(
        row.getAttribute("data-minutos-sin-respuesta") || 0,
      );

      const nuevosMinutosAbierto = minutosAbierto + 1 / 60;
      const nuevosMinutosSinRespuesta = minutosSinRespuesta + 1 / 60;

      row.setAttribute("data-minutos", nuevosMinutosAbierto);
      row.setAttribute("data-minutos-sin-respuesta", nuevosMinutosSinRespuesta);

      // Actualizar celdas
      const celdas = row.querySelectorAll("td");

      // Celda 10: Tiempo Abierto (índice 9)
      if (celdas[9]) {
        celdas[9].textContent =
          "⏱️ " + calcularTiempoTexto(nuevosMinutosAbierto);
      }

      // Celda 11: Sin Respuesta (índice 10)
      if (celdas[10]) {
        const urgencia = Math.min(100, (nuevosMinutosSinRespuesta / 60) * 100);

        let bgColor = "#ffffff";
        let textColor = "#000000";

        if (urgencia >= 100) {
          bgColor = "#ffcccc";
          textColor = "#721c24";
        } else if (urgencia >= 66) {
          bgColor = "#ffe6cc";
          textColor = "#856404";
        } else if (urgencia >= 33) {
          bgColor = "#fff9cc";
          textColor = "#856404";
        }

        celdas[10].style.backgroundColor = bgColor;
        celdas[10].style.color = textColor;
        celdas[10].textContent =
          "⚠️ " + calcularTiempoTexto(nuevosMinutosSinRespuesta);
      }
    });
  }, 60000); // Cada minuto

  console.log("🎉 Parche de dos tiempos aplicado y activo");
});
