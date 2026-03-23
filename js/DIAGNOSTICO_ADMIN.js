/**
 * DIAGNÓSTICO - Agregar al inicio de admin.js para detectar el problema
 * Copiar este código DESPUÉS de la línea 1 de admin.js
 */

// ==================== DIAGNÓSTICO ====================
console.log("🔍 DIAGNÓSTICO INICIADO");
console.log("Ubicación:", window.location.href);
console.log("Fecha:", new Date().toISOString());

// Interceptar todos los fetch para ver qué está pasando
const originalFetch = window.fetch;
window.fetch = function (...args) {
  console.log("📡 FETCH:", args[0]);
  return originalFetch
    .apply(this, args)
    .then((response) => {
      console.log("✅ RESPUESTA:", args[0], "Status:", response.status);
      return response;
    })
    .catch((error) => {
      console.error("❌ ERROR FETCH:", args[0], error);
      throw error;
    });
};

// Verificar carga del DOM
document.addEventListener("DOMContentLoaded", function () {
  console.log("✅ DOM Cargado");
  console.log(
    "Botones encontrados:",
    document.querySelectorAll(".btn-section").length,
  );
  console.log(
    "Content div:",
    document.getElementById("content") ? "Existe" : "NO EXISTE",
  );
});

// Verificar errores globales
window.addEventListener("error", function (e) {
  console.error("❌ ERROR GLOBAL:", e.message, e.filename, e.lineno);
});

console.log("🔍 DIAGNÓSTICO CONFIGURADO");
// ==================== FIN DIAGNÓSTICO ====================
